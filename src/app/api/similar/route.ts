import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getAnthropic, MODEL } from "@/lib/ai/client";
import { SIMILAR_PROMPT } from "@/lib/ai/prompts";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MIN_SCORE = 0.08; // 글자 유사도 1차 필터 (낮게 잡고, 실제 판단은 AI가)

const Judgement = z.object({
  results: z.array(z.object({ index: z.number(), similar: z.boolean(), reason: z.string() })),
});

type Candidate = { id: string; title: string; problem: string; is_mine: boolean; score: number };

// 등록 전 비슷한 아이디어 확인. 볼 수 있는 아이디어의 공개 영역(제목·문제 정의)만 비교한다.
// 다른 사람의 상세 영역은 조회하지도, AI에 보내지도 않는다.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const body = (await req.json()) as { title?: string; problem?: string; target_users?: string };
  const title = (body.title ?? "").trim().slice(0, 100);
  const problem = (body.problem ?? "").trim().slice(0, 1000);
  const targetUsers = (body.target_users ?? "").trim().slice(0, 500);
  if (!title || !problem) return new Response("title, problem required", { status: 400 });

  const { data, error } = await supabase.rpc("find_similar_ideas", { p_title: title, p_problem: problem, p_limit: 5 });
  if (error) return new Response(error.message, { status: 500 });
  const candidates = ((data ?? []) as Candidate[]).filter((c) => c.score >= MIN_SCORE);
  if (!candidates.length) return Response.json({ checkId: null, matches: [] });

  // AI 판단: 실패해도 등록을 막지 않도록, 실패 시 글자 유사도가 높은 것만 안내
  let judged: { c: Candidate; reason: string }[];
  try {
    const list = candidates
      .map((c, i) => `[${i}] 제목: ${c.title}\n문제 정의: ${c.problem}`)
      .join("\n\n");
    const res = await getAnthropic().messages.parse({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(Judgement) },
      system: SIMILAR_PROMPT,
      messages: [{
        role: "user",
        content: `<새 아이디어>\n제목: ${title}\n문제 정의: ${problem}\n타깃 사용자: ${targetUsers}\n</새 아이디어>\n\n<후보>\n${list}\n</후보>`,
      }],
    });
    console.log("[similar] usage", JSON.stringify(res.usage));
    const results = res.parsed_output?.results ?? [];
    judged = results
      .filter((r) => r.similar && candidates[r.index])
      .map((r) => ({ c: candidates[r.index], reason: r.reason }));
  } catch (err) {
    console.error("[similar] ai error", err);
    judged = candidates.filter((c) => c.score >= 0.3).map((c) => ({ c, reason: "제목·문제 정의의 표현이 비슷해요" }));
  }
  if (!judged.length) return Response.json({ checkId: null, matches: [] });

  const matches = judged.map(({ c, reason }) => ({
    idea_id: c.id, title: c.title, problem: c.problem, is_mine: c.is_mine, score: Math.round(c.score * 100) / 100, reason,
  }));

  // 안내 기록 (분쟁 시 "등록 전에 무엇을 안내받았는지"의 근거)
  const { data: check } = await supabase
    .from("similar_idea_checks")
    .insert({ user_id: user.id, submitted: { title, problem, target_users: targetUsers }, candidates: matches })
    .select("id")
    .single();

  return Response.json({ checkId: check?.id ?? null, matches });
}
