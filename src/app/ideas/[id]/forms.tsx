"use client";

import { useState, useTransition } from "react";
import { applyToIdea, requestAccess } from "@/app/actions";

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
