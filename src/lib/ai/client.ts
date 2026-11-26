import Anthropic from "@anthropic-ai/sdk";

// 서버 전용. ANTHROPIC_API_KEY 환경변수에서 키를 읽는다.
// 빌드 시점(Docker 이미지 빌드)에는 키가 없으므로 첫 요청 때 만든다.
let client: Anthropic | null = null;
export function getAnthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}

export const MODEL = "claude-opus-5-5";

// 사용자에게 보여줄 오류 문구. 상세 원인(잔액, 키 등)은 서버 로그에만 남긴다.
export function aiErrorMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return "AI 서비스 설정에 문제가 있어요. 운영자에게 알려주세요.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "지금 AI 요청이 많아요. 잠시 후 다시 시도해 주세요.";
  }
  if (err instanceof Anthropic.BadRequestError && /credit balance/i.test(err.message)) {
    return "AI 서비스 사용 한도에 도달했어요. 운영자에게 알려주세요.";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "AI 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
  return "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
}

// 남용 방지
export const LIMITS_AI = {
  sessionsPerDay: 3,
  userTurnsPerSession: 20,
  maxUserMessageChars: 2000,
};
