import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 구글 로그인 후 돌아오는 곳: 받은 code를 세션으로 바꾸고 로그인 쿠키를 심는다.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  // Docker 안에서는 request.url의 호스트가 컨테이너 기준일 수 있어, 브라우저가 보낸 Host로 되돌아갈 주소를 만든다.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const origin = `${proto}://${host}`;

  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/ideas`);
    console.error("[auth/callback] exchange error", error.message);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // 구글·Supabase가 오류로 돌려보낸 경우 (예: 사용자가 구글 로그인을 취소)
  const reason = url.searchParams.get("error_description") ?? url.searchParams.get("error") ?? "unknown";
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);
}
