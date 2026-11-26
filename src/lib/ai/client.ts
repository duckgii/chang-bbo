import Anthropic from "@anthropic-ai/sdk";

// 서버 전용. ANTHROPIC_API_KEY 환경변수에서 키를 읽는다.
export const anthropic = new Anthropic();

export const MODEL = "claude-opus-5-5";

// 남용 방지
export const LIMITS_AI = {
  sessionsPerDay: 3,
  userTurnsPerSession: 20,
  maxUserMessageChars: 2000,
};
