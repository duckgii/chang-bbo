"use client";

import { useState, useTransition } from "react";
import { addComment, agreeNda, applyToIdea, deleteComment, toggleLike } from "@/app/actions";

export type NdaItem = { title: string; body: string };

// 비밀유지 항목별 동의 → 모두 체크하면 바로 상세 열람
export function NdaAgreeForm({ ideaId, ndaId, title, items }: { ideaId: string; ndaId: number; title: string; items: NdaItem[] }) {
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const all = checked.every(Boolean);

  return (
    <div className="mt-3 space-y-3 text-sm">
      <p>
        해결 방식, 수익 모델, 차별점은 <b>아래 비밀유지 항목에 모두 동의하면 바로</b> 볼 수 있어요.
        동의와 열람 기록은 작성자에게 공개돼요.
      </p>
      <div className="rounded-lg border">
        <p className="border-b px-3 py-2 font-medium">{title}</p>
        <ol className="divide-y">
          {items.map((it, i) => (
            <li key={it.title}>
              <label className="flex cursor-pointer gap-3 px-3 py-2.5 hover:bg-surface-2">
                <input type="checkbox" className="mt-1 shrink-0" checked={checked[i]}
                  onChange={(e) => setChecked((c) => c.map((v, j) => (j === i ? e.target.checked : v)))} />
                <span>
                  <span className="font-medium">{i + 1}. {it.title}</span>
                  <span className="mt-0.5 block text-muted">{it.body}</span>
                </span>
              </label>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setChecked(items.map(() => !all))} className="text-muted underline">
          {all ? "전체 해제" : "전체 동의"}
        </button>
        <button disabled={!all || pending}
          onClick={() => start(async () => { const r = await agreeNda(ideaId, ndaId, items.length); setError(r.error ?? null); })}
          className="rounded bg-primary px-4 py-2 text-primary-fg disabled:opacity-40">
          {pending ? "기록 중…" : `${checked.filter(Boolean).length}/${items.length} 동의하고 상세 내용 보기`}
        </button>
      </div>
      {error && <p className="text-danger">{error}</p>}
    </div>
  );
}

export function ApplyForm({ ideaId, roles }: { ideaId: string; roles: string[] }) {
  const [role, setRole] = useState(roles[0] ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-3 space-y-3 text-sm">
      <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded border px-3 py-2">
        {roles.map((r) => <option key={r}>{r}</option>)}
        <option value="기타">기타</option>
      </select>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={1000}
        placeholder="왜 이 아이디어에 관심이 있는지, 어떤 걸 할 수 있는지 적어주세요"
        className="w-full rounded border px-3 py-2" />
      <button disabled={pending}
        onClick={() => start(async () => { const r = await applyToIdea(ideaId, role, message); if (r.error) setError(r.error); })}
        className="rounded bg-primary px-4 py-2 text-primary-fg disabled:opacity-40">
        지원하기
      </button>
      {error && <p className="text-danger">{error}</p>}
    </div>
  );
}

export function LikeButton({ ideaId, liked, count, disabled }: { ideaId: string; liked: boolean; count: number; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || pending}
        aria-pressed={liked}
        title={disabled ? "내 아이디어에는 좋아요를 누를 수 없어요" : undefined}
        onClick={() => start(async () => { const r = await toggleLike(ideaId, liked); setError(r.error ?? null); })}
        className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm disabled:cursor-default ${
          liked ? "border-ai-fg bg-ai-bg text-ai-fg" : "hover:bg-surface-2"}`}>
        <span aria-hidden>{liked ? "♥" : "♡"}</span> 좋아요 {count}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}

export function CommentForm({ ideaId }: { ideaId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-4 space-y-2 text-sm">
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={1000}
        placeholder="의견이나 질문을 남겨주세요" className="w-full rounded border px-3 py-2" />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-subtle">댓글은 로그인한 누구나 볼 수 있어요. 상세 영역 내용은 쓰지 마세요.</p>
        <button disabled={pending || !body.trim()}
          onClick={() => start(async () => {
            const r = await addComment(ideaId, body);
            if (r.error) setError(r.error); else { setBody(""); setError(null); }
          })}
          className="shrink-0 rounded bg-primary px-4 py-2 text-primary-fg disabled:opacity-40">
          댓글 달기
        </button>
      </div>
      {error && <p className="text-danger">{error}</p>}
    </div>
  );
}

export function DeleteCommentButton({ ideaId, commentId }: { ideaId: string; commentId: number }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="ml-auto text-subtle underline hover:text-danger">
        삭제
      </button>
    );
  }
  return (
    <span className="ml-auto flex gap-2">
      <button type="button" disabled={pending}
        onClick={() => start(async () => { await deleteComment(ideaId, commentId); })}
        className="text-danger underline disabled:opacity-50">
        정말 삭제
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-subtle underline">취소</button>
    </span>
  );
}
