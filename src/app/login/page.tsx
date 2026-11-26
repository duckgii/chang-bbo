"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
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
    const notSchool = `${address.split("@")[1] ?? ""}은(는) 아직 등록된 학교 이메일이 아니에요. 학교 이메일로 다시 시도해 주세요.`;

    // 코드 발송 전에 학교 도메인인지 먼저 확인 (가입 차단 시 Supabase는 원인 대신 일반 오류만 돌려주기 때문)
    const { data: ok, error: checkError } = await supabase.rpc("is_school_email", { p_email: address });
    if (checkError) {
      setBusy(false);
      setError("잠시 후 다시 시도해 주세요.");
      return;
    }
    if (!ok) {
      setBusy(false);
      setError(notSchool);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({ email: address });
    setBusy(false);
    if (!error) setSent(true);
    else if (error.message.includes("Database error saving new user")) setError(notSchool);
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
    <div className="mx-auto mt-16 max-w-sm rounded-xl border bg-surface p-6">
      <h1 className="text-xl font-bold">학교 이메일로 시작하기</h1>
      <p className="mt-1 text-sm text-muted">재학생 인증을 위해 학교 이메일만 사용할 수 있어요.</p>
      {!sent ? (
        <form onSubmit={sendCode} className="mt-6 space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.ac.kr" className="w-full rounded border px-3 py-2" />
          <button disabled={busy} className="w-full rounded bg-primary py-2 text-primary-fg disabled:opacity-50">
            인증 코드 받기
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 space-y-3">
          <p className="text-sm">{email}로 보낸 6자리 코드를 입력해주세요.</p>
          <input inputMode="numeric" required value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="123456" className="w-full rounded border px-3 py-2 tracking-widest" />
          <button disabled={busy} className="w-full rounded bg-primary py-2 text-primary-fg disabled:opacity-50">
            확인
          </button>
        </form>
      )}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
