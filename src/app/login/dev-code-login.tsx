"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// 개발 환경 전용: 구글 계정이 없는 테스트 계정(@example.ac.kr)을 이메일 코드로 로그인
export function DevCodeLogin() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const address = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({ email: address });
    setBusy(false);
    if (!error) setSent(true);
    else if (error.status === 429) setError("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.");
    else setError(error.message);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError("코드가 맞지 않거나 만료됐어요.");
    else {
      // 레이아웃(상단 메뉴)은 페이지 이동만으로는 다시 그려지지 않으므로 서버 컴포넌트를 새로 받아온다.
      router.replace("/ideas");
      router.refresh();
    }
  }

  return (
    <details className="mt-6 rounded border border-dashed p-3 text-sm">
      <summary className="cursor-pointer text-muted">개발용 · 테스트 계정 이메일 코드 로그인</summary>
      <p className="mt-2 text-xs text-subtle">로컬 전용이에요. 아무 이메일로나 로그인할 수 있고(@example.ac.kr은 홍익대 인증으로 처리), 코드는 http://localhost:54324 에서 확인하세요.</p>
      {!sent ? (
        <form onSubmit={sendCode} className="mt-3 space-y-2">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="test@example.ac.kr" className="w-full rounded border px-3 py-2" />
          <button disabled={busy} className="w-full rounded border py-2 hover:bg-surface-2 disabled:opacity-50">
            인증 코드 받기
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-3 space-y-2">
          <p>{email}로 보낸 6자리 코드를 입력해주세요.</p>
          <input inputMode="numeric" required value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="123456" className="w-full rounded border px-3 py-2 tracking-widest" />
          <button disabled={busy} className="w-full rounded border py-2 hover:bg-surface-2 disabled:opacity-50">
            확인
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-danger">{error}</p>}
    </details>
  );
}
