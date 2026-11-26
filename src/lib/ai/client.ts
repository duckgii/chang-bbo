import Anthropic from "@anthropic-ai/sdk";

// 서버 전용. ANTHROPIC_API_KEY 환경변수에서 키를 읽는다.
// 빌드 시점(Docker 이미지 빌드)에는 키가 없으므로 첫 요청 때 만든다.
let client: Anthropic | null = null;
export function getAnthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}

export const MODEL = "claude-opus-5-5";

// 남용 방지
export const LIMITS_AI = {
  sessionsPerDay: 3,
  userTurnsPerSession: 20,
  maxUserMessageChars: 2000,
};
