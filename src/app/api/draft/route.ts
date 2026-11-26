import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropic, MODEL } from "@/lib/ai/client";
import { DRAFT_PROMPT } from "@/lib/ai/prompts";
import { IdeaDraftAI } from "@/lib/idea-schema";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const { sessionId } = (await req.json()) as { sessionId?: string };
  if (!sessionId) return new Response("sessionId required", { status: 400 });

  // RLS: 본인 세션의 메시지만 조회된다.
  const { data: history } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("id");
  if (!history?.length) return new Response("상담 기록이 없습니다.", { status: 404 });

  const transcript = history
    .map((m) => `${m.role === "user" ? "사용자" : "AI 인터뷰어"}: ${m.content}`)
    .join("\n\n");

  try {
    const response = await getAnthropic().messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: zodOutputFormat(IdeaDraftAI) },
      system: DRAFT_PROMPT,
      messages: [{ role: "user", content: `<상담기록>\n${transcript}\n</상담기록>` }],
    });
    console.log("[draft] usage", JSON.stringify(response.usage));

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return new Response("초안을 만들지 못했어요. 상담을 조금 더 진행한 뒤 다시 시도해주세요.", { status: 422 });
    }
    await supabase.from("ai_sessions").update({ status: "drafted" }).eq("id", sessionId);
    return Response.json(response.parsed_output);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return new Response("요청이 많아요. 잠시 후 다시 시도해주세요.", { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("[draft] api error", err.status, err.message);
      return new Response("AI 서버 오류", { status: 502 });
    }
    console.error("[draft] error", err); // 구조화 출력 파싱 실패 포함
    return new Response("초안 생성 실패", { status: 500 });
  }
}
