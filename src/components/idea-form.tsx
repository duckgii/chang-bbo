"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { CATEGORIES, FIELD_LABELS, IdeaForm, LIMITS, type IdeaFormValues } from "@/lib/idea-schema";

export const EMPTY_IDEA: IdeaFormValues = {
  public: { title: "", problem: "", target_users: "", category: "기타" },
  detail: { solution: "", business_model: null, differentiation: null },
  needed_roles: [{ role: "", skills: [] }],
  provider_offers: [],
};

// AI 초안이 채워질 때 함께 넘어오는 안내 정보
export type DraftInfo = {
  values: IdeaFormValues;
  aiFields: string[];
  missing: string[];
  followups: string[];
  risks: string[];
};

type Props = {
  heading: string;
  initial?: IdeaFormValues;
  aiFields?: string[]; // 수정 화면: 이전 버전에서 AI 제안이 들어간 필드
  draft?: DraftInfo | null; // 등록 화면: AI 초안이 오면 양식을 다시 채운다
  submitLabel: string;
  onSubmit: (values: IdeaFormValues) => Promise<{ error?: string } | void>;
};

// 아이디어 등록·수정 화면이 함께 쓰는 양식
export function IdeaFormPanel({ heading, initial = EMPTY_IDEA, aiFields = [], draft, submitLabel, onSubmit }: Props) {
  const form = useForm<IdeaFormValues>({ resolver: zodResolver(IdeaForm), defaultValues: initial });
  const roles = useFieldArray({ control: form.control, name: "needed_roles" });
  const [offersText, setOffersText] = useState(initial.provider_offers.join(", "));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  useEffect(() => {
    if (!draft) return;
    form.reset(draft.values);
    setOffersText(draft.values.provider_offers.join(", "));
    void form.trigger(); // 글자 수 초과 등을 바로 표시
  }, [draft, form]);

  const ai = draft?.aiFields ?? aiFields;
  const missing = draft?.missing ?? [];

  function submit(values: IdeaFormValues) {
    setSubmitError(null);
    const payload: IdeaFormValues = {
      ...values,
      provider_offers: offersText.split(",").map((s) => s.trim()).filter(Boolean),
      needed_roles: values.needed_roles.filter((r) => r.role.trim()),
    };
    startSubmit(async () => {
      const r = await onSubmit(payload);
      if (r?.error) setSubmitError(r.error);
    });
  }

  const badge = (key: string) =>
    ai.includes(key) ? (
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
    <form onSubmit={form.handleSubmit(submit)} className="space-y-5 rounded-xl border bg-surface p-5">
      <h2 className="font-semibold">{heading}</h2>
      {!!draft?.risks.length && (
        <div className="rounded bg-surface-2 p-3 text-sm">
          <p className="font-medium">출시 전에 확인해 볼 점</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted">{draft.risks.map((r) => <li key={r}>{r}</li>)}</ol>
        </div>
      )}
      {!!draft?.followups.length && (
        <div className="rounded bg-warn-bg p-3 text-sm">
          <p className="font-medium text-warn-fg">더 채우면 좋은 부분</p>
          <ul className="mt-1 list-disc pl-5 text-warn-fg">{draft.followups.map((q) => <li key={q}>{q}</li>)}</ul>
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
            <button type="button" onClick={() => roles.remove(i)} className="px-2 text-subtle" aria-label="역할 삭제">✕</button>
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
        {submitting ? "저장 중…" : submitLabel}
      </button>
    </form>
  );
}
