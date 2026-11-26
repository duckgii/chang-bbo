"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { submitIdea } from "@/app/actions";
import { CATEGORIES, FIELD_LABELS, IdeaForm, LIMITS, type IdeaDraft, type IdeaFormValues } from "@/lib/idea-schema";

type ChatMsg = { role: "user" | "assistant"; content: string };

const EMPTY: IdeaFormValues = {
  public: { title: "", problem: "", target_users: "", category: "기타" },
  detail: { solution: "", business_model: null, differentiation: null },
  needed_roles: [{ role: "", skills: [] }],
  provider_offers: [],
};

export default function NewIdeaPage() {
  // ── AI 상담 ──
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([
    { role: "assistant", content: "안녕하세요! 어떤 아이디어인지 한두 문장으로 알려주세요. 같이 양식을 채울 수 있게 하나씩 여쭤볼게요." },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiFields, setAiFields] = useState<string[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [followups, setFollowups] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── 등록 양식 ──
  const form = useForm<IdeaFormValues>({ resolver: zodResolver(IdeaForm), defaultValues: EMPTY });
  const roles = useFieldArray({ control: form.control, name: "needed_roles" });
  const [offersText, setOffersText] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setNotice(null);
    setChat((c) => [...c, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });
      if (!res.ok || !res.body) {
        setNotice(await res.text());
        setChat((c) => c.slice(0, -1));
        return;
      }
      setSessionId(res.headers.get("X-Session-Id"));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setChat((c) => {
          const next = [...c];
          next[next.length - 1] = { role: "assistant", content: next[next.length - 1].content + chunk };
          return next;
        });
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } finally {
      setStreaming(false);
    }
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
      form.reset({
        public: { ...d.public, category: cat },
        detail: d.detail,
        needed_roles: d.needed_roles.length ? d.needed_roles : EMPTY.needed_roles,
        provider_offers: d.provider_offers,
      });
      setOffersText(d.provider_offers.join(", "));
      setAiFields(d.ai_suggested_fields);
      setMissing(d.missing_fields);
      setFollowups(d.followup_questions);
      void form.trigger(); // 글자 수 초과 등을 바로 표시
    } finally {
      setDrafting(false);
    }
  }

  function onSubmit(values: IdeaFormValues) {
    setSubmitError(null);
    const payload = {
      ...values,
      provider_offers: offersText.split(",").map((s) => s.trim()).filter(Boolean),
      needed_roles: values.needed_roles.filter((r) => r.role.trim()),
    };
    startSubmit(async () => {
      const r = await submitIdea(payload, aiFields, sessionId);
      if (r?.error) setSubmitError(r.error);
    });
  }

  const badge = (key: string) =>
    aiFields.includes(key) ? (
      <span className="ml-2 rounded bg-ai-bg px-1.5 py-0.5 text-xs text-ai-fg">AI 제안 · 확인 필요</span>
    ) : missing.includes(key) ? (
      <span className="ml-2 rounded bg-warn-bg px-1.5 py-0.5 text-xs text-warn-fg">상담에서 안 다룸</span>
    ) : null;

  const field = (label: string, key: string, name: Parameters<typeof form.register>[0], max: number, rows = 3, hint?: string) => {
    const e = form.getFieldState(name, form.formState).error;
    return (
      <label className="block">
        <span className="text-sm font-medium">{label}{badge(key)}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
        <textarea {...form.register(name)} rows={rows} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
        <span className={`block text-right text-xs ${e ? "text-danger" : "text-subtle"}`}>
          {e?.message ? `${e.message} · ` : ""}{String(form.watch(name) ?? "").length}/{max}
        </span>
      </label>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 왼쪽: AI 상담 */}
      <section className="flex h-[75vh] flex-col rounded-xl border bg-surface">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">AI와 아이디어 다듬기</h2>
          <p className="text-xs text-muted">
            상담 내용은 AI 처리를 위해 Anthropic(미국)으로 전송되며, 상담 기록은 본인만 볼 수 있어요. 원하지 않으면 오른쪽 양식만 직접 작성해도 됩니다.
          </p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {chat.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-left text-sm ${
                m.role === "user" ? "bg-primary text-primary-fg" : "bg-surface-2"}`}>
                {m.content || (streaming && i === chat.length - 1 ? "…" : "")}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        {notice && <p className="px-4 pb-2 text-sm text-warn-fg">{notice}</p>}
        <form onSubmit={send} className="flex gap-2 border-t p-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={2000}
            placeholder="답변을 입력하세요" className="flex-1 rounded border px-3 py-2 text-sm" />
          <button disabled={streaming} className="rounded bg-primary px-4 text-sm text-primary-fg disabled:opacity-50">보내기</button>
        </form>
        <div className="border-t p-3">
          <button onClick={makeDraft} disabled={!sessionId || drafting || streaming}
            className="w-full rounded border border-ai-fg py-2 text-sm font-medium text-ai-fg disabled:opacity-40">
            {drafting ? "초안 작성 중…" : "초안 만들기 → 오른쪽 양식 채우기"}
          </button>
        </div>
      </section>

      {/* 오른쪽: 등록 양식 */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 rounded-xl border bg-surface p-5">
        <h2 className="font-semibold">아이디어 등록</h2>
        {followups.length > 0 && (
          <div className="rounded bg-warn-bg p-3 text-sm">
            <p className="font-medium text-warn-fg">더 채우면 좋은 부분</p>
            <ul className="mt-1 list-disc pl-5 text-warn-fg">{followups.map((q) => <li key={q}>{q}</li>)}</ul>
          </div>
        )}

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase text-muted">공개 영역 · 목록에 보여요</legend>
          {field(FIELD_LABELS.title, "title", "public.title", LIMITS.title, 1)}
          {field(FIELD_LABELS.problem, "problem", "public.problem", LIMITS.problem)}
          {field(FIELD_LABELS.target_users, "target_users", "public.target_users", LIMITS.target_users, 2)}
          <label className="block">
            <span className="text-sm font-medium">{FIELD_LABELS.category}</span>
            <select {...form.register("public.category")} className="mt-1 w-full rounded border px-3 py-2 text-sm">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase text-muted">상세 영역 · 승인 + 비밀유지 동의 후 열람</legend>
          {field(FIELD_LABELS.solution, "solution", "detail.solution", LIMITS.solution, 5)}
          {field(FIELD_LABELS.business_model, "business_model", "detail.business_model", LIMITS.business_model, 3, "아직 없으면 비워둬도 돼요")}
          {field(FIELD_LABELS.differentiation, "differentiation", "detail.differentiation", LIMITS.differentiation, 3)}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{FIELD_LABELS.needed_roles}{badge("needed_roles")}</legend>
          {roles.fields.map((f, i) => (
            <div key={f.id} className="flex gap-2">
              <input {...form.register(`needed_roles.${i}.role`)} placeholder="예: 프론트엔드" className="flex-1 rounded border px-3 py-2 text-sm" />
              <button type="button" onClick={() => roles.remove(i)} className="px-2 text-subtle">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => roles.append({ role: "", skills: [] })} className="text-sm text-muted underline">
            + 역할 추가
          </button>
        </fieldset>

        <label className="block">
          <span className="text-sm font-medium">{FIELD_LABELS.provider_offers}{badge("provider_offers")}</span>
          <span className="block text-xs text-muted">쉼표로 구분 · 예: 도메인 지식, 고객 인터뷰 섭외, 기획</span>
          <input value={offersText} onChange={(e) => setOffersText(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
        </label>

        {submitError && <p className="text-sm text-danger">{submitError}</p>}
        <button disabled={submitting} className="w-full rounded bg-primary py-2.5 text-primary-fg disabled:opacity-50">
          {submitting ? "등록 중…" : "등록하기 (등록 시점이 타임스탬프로 기록돼요)"}
        </button>
      </form>
    </div>
  );
}
