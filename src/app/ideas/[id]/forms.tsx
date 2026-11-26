"use client";

import { useState, useTransition } from "react";
import { addComment, applyToIdea, deleteComment, requestAccess, toggleLike } from "@/app/actions";

export function AccessRequestForm({ ideaId, ndaId, ndaBody }: { ideaId: string; ndaId: number; ndaBody: string }) {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-3 space-y-3 text-sm">
      <p>해결 방식, 수익 모델, 차별점은 작성자의 승인과 비밀유지 동의 후 볼 수 있어요.</p>
      <div className="max-h-40 overflow-y-auto rounded bg-surface-2 p-3 text-xs text-muted">{ndaBody}</div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        위 비밀유지 내용에 동의합니다 (동의 시각이 기록돼요)
      </label>
      <button disabled={!agreed || pending}
        onClick={() => start(async () => { const r = await requestAccess(ideaId, ndaId); if (r.error) setError(r.error); })}
        className="rounded bg-primary px-4 py-2 text-primary-fg disabled:opacity-40">
        상세 열람 신청
      </button>
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
        <p className="text-xs text-subtle">댓글은 같은 학교 누구나 볼 수 있어요. 상세 영역 내용은 쓰지 마세요.</p>
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
