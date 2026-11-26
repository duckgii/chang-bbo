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
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase() });
    setBusy(false);
    if (error) setError(error.message.includes("학교") ? "학교 이메일만 가입할 수 있어요." : error.message);
    else setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError("코드가 맞지 않거나 만료됐어요.");
    else router.replace("/ideas");
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-xl border bg-white p-6">
      <h1 className="text-xl font-bold">학교 이메일로 시작하기</h1>
      <p className="mt-1 text-sm text-zinc-500">재학생 인증을 위해 학교 이메일만 사용할 수 있어요.</p>
      {!sent ? (
        <form onSubmit={sendCode} className="mt-6 space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.ac.kr" className="w-full rounded border px-3 py-2" />
          <button disabled={busy} className="w-full rounded bg-zinc-900 py-2 text-white disabled:opacity-50">
            인증 코드 받기
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 space-y-3">
          <p className="text-sm">{email}로 보낸 6자리 코드를 입력해주세요.</p>
          <input inputMode="numeric" required value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="123456" className="w-full rounded border px-3 py-2 tracking-widest" />
          <button disabled={busy} className="w-full rounded bg-zinc-900 py-2 text-white disabled:opacity-50">
            확인
          </button>
        </form>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
