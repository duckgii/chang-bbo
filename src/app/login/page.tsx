import { DevCodeLogin } from "./dev-code-login";
import { GoogleLogin } from "./google-login";

// 로그인 실패 사유를 사용자 문구로 바꾼다
function errorMessage(raw?: string): string | null {
  if (!raw) return null;
  if (/access_denied/i.test(raw)) return "구글 로그인을 취소했어요.";
  return "로그인하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const message = errorMessage(error);
  return (
    <div className="mx-auto mt-16 max-w-sm rounded-xl border bg-surface p-6">
      <h1 className="text-xl font-bold">창뽀 시작하기</h1>
      <p className="mt-1 text-sm text-muted">구글 계정으로 바로 시작할 수 있어요. 학교 메일 계정으로 로그인하면 프로필에 학교 인증이 표시돼요.</p>
      <GoogleLogin />
      {message && <p className="mt-3 text-sm text-danger">{message}</p>}
      {process.env.NODE_ENV !== "production" && <DevCodeLogin />}
    </div>
  );
}
