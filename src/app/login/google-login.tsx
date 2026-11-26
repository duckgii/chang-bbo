"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" }, // 여러 구글 계정 중 고를 수 있게
      },
    });
    // 성공하면 구글 화면으로 이동하므로 여기까지 오지 않는다
    if (error) {
      setBusy(false);
      setError(error.message.includes("provider is not enabled") || error.message.includes("missing OAuth secret")
        ? "구글 로그인이 아직 설정되지 않았어요. 운영자에게 알려주세요."
        : error.message);
    }
  }

  return (
    <div className="mt-6 space-y-2">
      <button type="button" onClick={signIn} disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded border bg-surface py-2.5 font-medium hover:bg-surface-2 disabled:opacity-50">
        <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
          <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
        </svg>
        {busy ? "구글로 이동 중…" : "Google 계정으로 로그인"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
