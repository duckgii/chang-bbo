"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { recordSimilarDecision } from "@/app/actions";

export type SimilarMatch = {
  idea_id: string;
  title: string;
  problem: string;
  is_mine: boolean;
  score: number;
  reason: string;
};

type Props = {
  checkId: string | null;
  matches: SimilarMatch[];
  onRegisterAnyway: () => Promise<unknown>;
  onRevise: () => void;
  onClose: () => void;
};

// 등록 전 "비슷한 아이디어가 있어요" 안내. 막지 않고 선택지를 준다.
export function SimilarIdeasDialog({ checkId, matches, onRegisterAnyway, onRevise, onClose }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const mine = matches.filter((m) => m.is_mine);
  const others = matches.filter((m) => !m.is_mine);

  async function decide(decision: "joined" | "revised", then: () => void) {
    setBusy(true);
    if (checkId) await recordSimilarDecision(checkId, decision);
    then();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="similar-title">
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl border bg-surface p-5 shadow-xl">
        <h2 id="similar-title" className="text-lg font-semibold">비슷한 아이디어가 있어요</h2>
        <p className="mt-1 text-sm text-muted">
          등록을 막지는 않아요. 아래 아이디어와 무엇이 다른지 확인해 보세요. 이 안내를 받았다는 사실은 기록돼요.
        </p>

        {mine.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">내가 이미 올린 아이디어</p>
            {mine.map((m) => (
              <div key={m.idea_id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{m.title}</p>
                <p className="mt-1 text-xs text-muted">{m.reason}</p>
                <button type="button" disabled={busy}
                  onClick={() => decide("revised", () => router.push(`/ideas/${m.idea_id}/edit`))}
                  className="mt-2 rounded bg-primary px-3 py-1.5 text-xs text-primary-fg disabled:opacity-50">
                  새로 올리지 않고 기존 아이디어 수정하기
                </button>
              </div>
            ))}
          </div>
        )}

        {others.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">다른 사람의 아이디어</p>
            {others.map((m) => (
              <div key={m.idea_id} className="rounded-lg border p-3 text-sm">
                <Link href={`/ideas/${m.idea_id}`} target="_blank" className="font-medium underline">{m.title}</Link>
                <p className="mt-1 line-clamp-2 text-muted">{m.problem}</p>
                <p className="mt-1 rounded bg-surface-2 px-2 py-1 text-xs">{m.reason}</p>
                <button type="button" disabled={busy}
                  onClick={() => decide("joined", () => router.push(`/ideas/${m.idea_id}#apply`))}
                  className="mt-2 rounded border border-ai-fg px-3 py-1.5 text-xs text-ai-fg disabled:opacity-50">
                  이 팀에 합류 지원하기
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={busy} onClick={() => decide("revised", onRevise)}
            className="flex-1 rounded border py-2 text-sm hover:bg-surface-2 disabled:opacity-50">
            차별점 보완하기
          </button>
          <button type="button" disabled={busy}
            onClick={async () => { setBusy(true); await onRegisterAnyway(); setBusy(false); }}
            className="flex-1 rounded bg-primary py-2 text-sm text-primary-fg disabled:opacity-50">
            {busy ? "처리 중…" : "그래도 등록하기"}
          </button>
        </div>
        <button type="button" onClick={onClose} disabled={busy} className="mt-3 w-full text-center text-xs text-subtle underline">
          닫기
        </button>
      </div>
    </div>
  );
}
