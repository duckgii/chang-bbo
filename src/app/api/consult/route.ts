import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { aiErrorMessage, getAnthropic, MODEL, LIMITS_AI } from "@/lib/ai/client";
import { ConsultTurn, PICKED_PREFIX, TYPED_PREFIX, turnToText } from "@/lib/ai/consult-schema";
import { CONSULT_PROMPT } from "@/lib/ai/prompts";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

type Body = { sessionId?: string; message?: string; picked?: string[] };
type Supabase = Awaited<ReturnType<typeof createClient>>;

const DAY_MS = 24 * 60 * 60 * 1000;

// 오늘(최근 24시간) 사용한 상담 수 = AI가 한 번이라도 답한 상담 수.
// 질문 수와 무관하고, AI 오류로 실패한 시도도 세지 않는다.
async function usedToday(supabase: Supabase, userId: string): Promise<number> {
  const { count } = await supabase
    .from("ai_sessions")
    .select("id, ai_messages!inner(id)", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - DAY_MS).toISOString())
    .eq("ai_messages.role", "assistant");
  return count ?? 0;
}

// 화면에 보여줄 사용자 답변 (저장용 표시 제거)
function displayUserText(content: string): string {
  return content
    .split("\n")
    .map((l) => l.replace(PICKED_PREFIX, "").replace(TYPED_PREFIX, "").trim())
    .join("\n");
}

// 새로고침해도 이어갈 수 있도록: 남은 횟수 + 진행 중인 상담(아직 등록 안 한 최근 상담)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const used = await usedToday(supabase, user.id);
  const { data: active } = await supabase
    .from("ai_sessions")
    .select("id")
    .eq("user_id", user.id)
    .is("idea_id", null)
    .neq("status", "closed")
    .gte("created_at", new Date(Date.now() - DAY_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let session: { sessionId: string; messages: { role: "user" | "assistant"; content: string; turn?: ConsultTurn }[] } | null = null;
  if (active) {
    const { data: rows } = await supabase
      .from("ai_messages")
      .select("role, content, meta")
      .eq("session_id", active.id)
      .order("id");
    if (rows?.length) {
      session = {
        sessionId: active.id as string,
        messages: rows.map((m) =>
          m.role === "assistant" && m.meta
            ? { role: "assistant", content: (m.meta as ConsultTurn).reply, turn: m.meta as ConsultTurn }
            : { role: m.role as "user" | "assistant", content: m.role === "user" ? displayUserText(m.content) : m.content },
        ),
      };
    }
  }
  return Response.json({ quota: { used, limit: LIMITS_AI.sessionsPerDay }, session });
}

// 대화 기록은 클라이언트가 보낸 것을 믿지 않고 DB에서 다시 읽는다.
// (가짜 assistant 턴 주입 방지 + 상담 기록을 증거로 남기기 위함)
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const { sessionId: rawSessionId, message, picked } = (await req.json()) as Body;
  const typed = (message ?? "").trim();
  const picks = (Array.isArray(picked) ? picked : [])
    .map((p) => String(p).trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, 4);
  if ((!typed && !picks.length) || typed.length > LIMITS_AI.maxUserMessageChars) {
    return new Response("답변을 선택하거나 1~2000자로 입력해주세요.", { status: 400 });
  }

  // 저장 형식: AI 후보에서 고른 답과 직접 입력한 답을 구분해 남긴다 (초안의 AI 제안 표시·분쟁 대비)
  const content = picks.length
    ? [`${PICKED_PREFIX} ${picks.join(" / ")}`, typed && `${TYPED_PREFIX} ${typed}`].filter(Boolean).join("\n")
    : typed;

  let sessionId = rawSessionId;
  if (!sessionId) {
    // 새 상담(= 새 아이디어)을 시작할 때만 한도를 확인한다. 이어서 묻는 질문은 횟수에 영향 없음.
    if ((await usedToday(supabase, user.id)) >= LIMITS_AI.sessionsPerDay) {
      return new Response(`오늘 상담 ${LIMITS_AI.sessionsPerDay}회를 모두 사용했어요. 내일 다시 시도해주세요.`, { status: 429 });
    }
    const { data, error } = await supabase.from("ai_sessions").insert({ user_id: user.id }).select("id").single();
    if (error) return new Response(error.message, { status: 500 });
    sessionId = data.id as string;
  }

  const { count: userTurns } = await supabase
    .from("ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("role", "user");
  if ((userTurns ?? 0) >= LIMITS_AI.userTurnsPerSession) {
    return new Response("이 상담은 질문 수 한도에 도달했어요. [초안 만들기]를 눌러주세요.", { status: 429 });
  }

  // RLS 때문에 본인 세션이 아니면 insert가 실패한다.
  const { error: insertErr } = await supabase.from("ai_messages").insert({ session_id: sessionId, role: "user", content });
  if (insertErr) return new Response("forbidden", { status: 403 });

  const { data: history } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("id");

  // 이전 요청이 실패하면 사용자 메시지만 남고 답변이 없다(기록은 삭제 불가).
  // 연달아 있는 같은 쪽 메시지는 하나로 합쳐서 보낸다.
  const messages: Anthropic.MessageParam[] = [];
  for (const m of history ?? []) {
    const role = m.role as "user" | "assistant";
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content = `${last.content as string}\n\n${m.content as string}`;
    else messages.push({ role, content: m.content as string });
  }

  try {
    // 한 턴의 답이 짧아(3초 안팎) 스트리밍 대신 구조화 출력으로 질문·후보를 한 번에 받는다.
    const response = await getAnthropic().messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "low", format: zodOutputFormat(ConsultTurn) },
      cache_control: { type: "ephemeral" }, // 대화가 길어질수록 앞부분이 캐시됨
      system: CONSULT_PROMPT,
      messages,
    });
    console.log("[consult] usage", JSON.stringify(response.usage));

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return new Response("이 내용에는 답할 수 없어요. 다른 방식으로 말씀해 주세요.", {
        status: 422,
        headers: { "X-Session-Id": sessionId },
      });
    }
    const turn: ConsultTurn = {
      ...response.parsed_output,
      options: response.parsed_output.done ? [] : response.parsed_output.options.slice(0, 4),
    };
    await supabase
      .from("ai_messages")
      .insert({ session_id: sessionId, role: "assistant", content: turnToText(turn), meta: turn });
    const used = await usedToday(supabase, user.id);
    return Response.json({ sessionId, turn, quota: { used, limit: LIMITS_AI.sessionsPerDay } });
  } catch (err) {
    console.error("[consult] error", err);
    return new Response(aiErrorMessage(err), { status: 502, headers: { "X-Session-Id": sessionId } });
  }
}
