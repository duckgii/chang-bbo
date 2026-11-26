"use client";

import { useEffect, useRef, useState } from "react";
import { submitIdea } from "@/app/actions";
import type { ConsultTurn } from "@/lib/ai/consult-schema";
import { createClient } from "@/lib/supabase/client";
import { EMPTY_IDEA, IdeaFormPanel, type DraftInfo } from "@/components/idea-form";
import { CATEGORIES, type IdeaDraft } from "@/lib/idea-schema";

type ChatMsg =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; turn?: ConsultTurn };

const FIELD_STEP: Record<string, string> = {
  problem: "문제 정의", target_users: "타깃 사용자", solution: "해결 방식", business_model: "수익 모델",
  differentiation: "차별점", needed_roles: "필요한 역할", provider_offers: "내가 제공할 것", wrapup: "마무리",
};

const GREETING: ChatMsg = {
  role: "assistant",
  content: "안녕하세요! 어떤 아이디어인지 한두 문장으로 알려주세요. 그다음부터는 제가 드리는 후보 중에서 고르기만 하면 돼요.",
};

export default function NewIdeaPage() {
  // ── AI 상담 ──
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([GREETING]);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftInfo | null>(null);
  const [formKey, setFormKey] = useState(0); // 새 아이디어 시작 시 양식을 비우기 위해 다시 마운트
  const bottomRef = useRef<HTMLDivElement>(null);

  const last = chat[chat.length - 1];
  const currentTurn = last.role === "assistant" ? last.turn : undefined;
  const finished = currentTurn?.done ?? false;

  // 새로고침해도 진행 중인 상담을 이어간다 (같은 아이디어로 횟수가 다시 차감되지 않도록)
  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/consult");
      if (!res.ok) return;
      const data = (await res.json()) as {
        quota: { used: number; limit: number };
        session: { sessionId: string; messages: ChatMsg[] } | null;
      };
      setQuota(data.quota);
      if (data.session) {
        setSessionId(data.session.sessionId);
        setChat([GREETING, ...data.session.messages]);
        setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
      }
    })();
  }, []);

  // 지금 상담을 닫고 새 아이디어 상담을 시작 (다음 첫 메시지에서 1회 차감)
  async function startNewIdea() {
    if (sessionId) {
      await createClient().from("ai_sessions").update({ status: "closed" }).eq("id", sessionId);
    }
    setSessionId(null);
    setChat([GREETING]);
    setSelected([]);
    setInput("");
    setNotice(null);
    setDraft(null);
    setFormKey((k) => k + 1);
  }

  // picks: AI 후보에서 고른 답, typed: 직접 입력한 답 (서버가 둘을 구분해 기록)
  async function send(picks: string[], typed: string) {
    const text = typed.trim();
    if ((!picks.length && !text) || loading) return;
    setInput("");
    setSelected([]);
    setNotice(null);
    setChat((c) => [...c, { role: "user", content: [picks.join(", "), text].filter(Boolean).join("\n") }]);
    setLoading(true);
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text, picked: picks }),
      });
      const sid = res.headers.get("X-Session-Id");
      if (sid) setSessionId(sid);
      if (!res.ok) {
        setNotice(await res.text());
        return;
      }
      const data = (await res.json()) as { sessionId: string; turn: ConsultTurn; quota: { used: number; limit: number } };
      setSessionId(data.sessionId);
      setQuota(data.quota);
      setChat((c) => [...c, { role: "assistant", content: data.turn.reply, turn: data.turn }]);
    } catch {
      setNotice("네트워크 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  function onPick(option: string) {
    if (!currentTurn) return;
    if (currentTurn.multi_select) {
      setSelected((sel) => (sel.includes(option) ? sel.filter((o) => o !== option) : [...sel, option]));
    } else {
      void send([option], "");
    }
  }

  function onSubmitTyped(e: React.FormEvent) {
    e.preventDefault();
    void send(currentTurn?.multi_select ? selected : [], input);
  }

  async function makeDraft() {
    if (!sessionId) return;
    setDrafting(true);
    setNotice(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) {
        setNotice(await res.text());
        return;
      }
      const d = (await res.json()) as IdeaDraft;
      const cat = (CATEGORIES as readonly string[]).includes(d.public.category) ? d.public.category : "기타";
      setDraft({
        values: {
          public: { ...d.public, category: cat },
          detail: d.detail,
          needed_roles: d.needed_roles.length ? d.needed_roles : EMPTY_IDEA.needed_roles,
          provider_offers: d.provider_offers,
        },
        aiFields: d.ai_suggested_fields,
        missing: d.missing_fields,
        followups: d.followup_questions,
        risks: d.risks,
      });
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 왼쪽: AI 상담 */}
      <section className="flex h-[75vh] flex-col rounded-xl border bg-surface">
        <div className="border-b px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">AI와 아이디어 다듬기</h2>
            <div className="flex items-center gap-2 text-xs">
              {quota && (
                <span className="text-muted">오늘 남은 상담 {Math.max(quota.limit - quota.used, 0)}/{quota.limit}</span>
              )}
              {sessionId && (
                <button type="button" onClick={() => void startNewIdea()} disabled={loading}
                  className="rounded border px-2 py-1 hover:bg-surface-2 disabled:opacity-50">
                  새 아이디어로 시작
                </button>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted">상담 횟수는 질문 수와 상관없이 아이디어 하나당 1회 차감돼요.</p>
          <p className="text-xs text-muted">
            상담 내용은 AI 처리를 위해 Anthropic(미국)으로 전송되며, 상담 기록은 본인만 볼 수 있어요. 원하지 않으면 오른쪽 양식만 직접 작성해도 됩니다.
          </p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {chat.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              {m.role === "assistant" && m.turn && (
                <p className="mb-1 text-xs text-subtle">{FIELD_STEP[m.turn.field]}</p>
              )}
              <div className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-left text-sm ${
                m.role === "user" ? "bg-primary text-primary-fg" : "bg-surface-2"}`}>
                {m.content}
                {m.role === "assistant" && m.turn && <p className="mt-2 font-semibold">{m.turn.question}</p>}
              </div>
            </div>
          ))}

          {/* 최신 질문의 답변 후보 */}
          {currentTurn && !finished && currentTurn.options.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted">
                {currentTurn.multi_select ? "해당하는 것을 모두 고른 뒤 [선택 완료]를 누르세요" : "하나를 고르세요"} · 맞는 게 없으면 아래에 직접 입력
              </p>
              {currentTurn.options.map((o) => {
                const on = selected.includes(o);
                return (
                  <button key={o} type="button" disabled={loading} onClick={() => onPick(o)}
                    className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition disabled:opacity-50 ${
                      on ? "border-ai-fg bg-ai-bg text-ai-fg" : "bg-surface hover:bg-surface-2"}`}>
                    {currentTurn.multi_select && <span className="mr-2">{on ? "☑" : "☐"}</span>}
                    {o}
                  </button>
                );
              })}
              {currentTurn.multi_select && (
                <button type="button" disabled={loading || (!selected.length && !input.trim())}
                  onClick={() => void send(selected, input)}
                  className="w-full rounded-lg bg-primary py-2 text-sm text-primary-fg disabled:opacity-40">
                  선택 완료{selected.length ? ` (${selected.length})` : ""}
                </button>
              )}
            </div>
          )}
          {loading && <p className="text-sm text-muted">AI가 다음 질문을 준비하고 있어요…</p>}
          <div ref={bottomRef} />
        </div>
        {notice && <p className="px-4 pb-2 text-sm text-warn-fg">{notice}</p>}
        {!finished && (
          <form onSubmit={onSubmitTyped} className="flex gap-2 border-t p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={2000}
              placeholder={currentTurn ? "기타 · 직접 입력 (선택한 후보에 덧붙여 보낼 수도 있어요)" : "아이디어를 한두 문장으로 적어주세요"}
              className="flex-1 rounded border px-3 py-2 text-sm" />
            <button disabled={loading || !input.trim()} className="rounded bg-primary px-4 text-sm text-primary-fg disabled:opacity-50">보내기</button>
          </form>
        )}
        <div className="border-t p-3">
          <button onClick={makeDraft} disabled={!sessionId || drafting || loading}
            className={`w-full rounded py-2 text-sm font-medium disabled:opacity-40 ${
              finished ? "bg-ai-fg text-surface" : "border border-ai-fg text-ai-fg"}`}>
            {drafting ? "초안 작성 중…" : "초안 만들기 → 오른쪽 양식 채우기"}
          </button>
        </div>
      </section>

      {/* 오른쪽: 등록 양식 */}
      <IdeaFormPanel
        key={formKey}
        heading="아이디어 등록"
        draft={draft}
        submitLabel="등록하기 (등록 시점이 타임스탬프로 기록돼요)"
        onSubmit={(values) => submitIdea(values, draft?.aiFields ?? [], sessionId)}
      />
    </div>
  );
}
