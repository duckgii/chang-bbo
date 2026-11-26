import type Anthropic from "@anthropic-ai/sdk";
import { aiErrorMessage, getAnthropic, MODEL, LIMITS_AI } from "@/lib/ai/client";
import { CONSULT_PROMPT } from "@/lib/ai/prompts";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

// 대화 기록은 클라이언트가 보낸 것을 믿지 않고 DB에서 다시 읽는다.
// (가짜 assistant 턴 주입 방지 + 상담 기록을 증거로 남기기 위함)
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const { sessionId: rawSessionId, message } = (await req.json()) as { sessionId?: string; message?: string };
  const text = (message ?? "").trim();
  if (!text || text.length > LIMITS_AI.maxUserMessageChars) {
    return new Response("메시지는 1~2000자여야 합니다.", { status: 400 });
  }

  let sessionId = rawSessionId;
  if (!sessionId) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("ai_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);
    if ((count ?? 0) >= LIMITS_AI.sessionsPerDay) {
      return new Response("오늘 상담 횟수를 모두 사용했어요. 내일 다시 시도해주세요.", { status: 429 });
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
  const { error: insertErr } = await supabase
    .from("ai_messages")
    .insert({ session_id: sessionId, role: "user", content: text });
  if (insertErr) return new Response("forbidden", { status: 403 });

  const { data: history } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("id");

  // 이전 요청이 실패하면 사용자 메시지만 남고 답변이 없다(기록은 삭제 불가).
  // 연달아 있는 같은 쪽 메시지는 하나로 합쳐서 보낸다.
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of history ?? []) {
    const role = m.role as "user" | "assistant";
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content = `${last.content as string}\n\n${m.content as string}`;
    else messages.push({ role, content: m.content as string });
  }

  const stream = getAnthropic().beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    // 안전 분류기가 거절하면 서버 측에서 다른 모델로 이어서 답하게 한다.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    cache_control: { type: "ephemeral" }, // 대화가 길어질수록 앞부분이 캐시됨
    system: CONSULT_PROMPT,
    messages,
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\n(이 질문에는 답할 수 없어요. 다른 방식으로 말씀해 주세요.)"));
        }
        const reply = final.content
          .flatMap((b) => (b.type === "text" ? [b.text] : []))
          .join("")
          .trim();
        if (reply) {
          await supabase.from("ai_messages").insert({ session_id: sessionId, role: "assistant", content: reply });
        }
        console.log("[consult] usage", JSON.stringify(final.usage));
      } catch (err) {
        console.error("[consult] error", err);
        controller.enqueue(encoder.encode(`\n\n(${aiErrorMessage(err)})`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Session-Id": sessionId },
  });
}
