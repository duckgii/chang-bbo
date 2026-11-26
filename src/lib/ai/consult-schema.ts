import { z } from "zod";

// AI 상담 한 턴의 응답 형식 (구조화 출력). 서버와 화면이 함께 쓴다.
export const CONSULT_FIELDS = [
  "problem",
  "target_users",
  "solution",
  "business_model",
  "differentiation",
  "needed_roles",
  "provider_offers",
  "wrapup",
] as const;

export const ConsultTurn = z.object({
  reply: z.string().describe("직전 답변에 대한 1~2문장 반응·정리. wrapup이면 약점·검증할 가정 3가지"),
  field: z.enum(CONSULT_FIELDS).describe("이번 질문이 채우는 양식 항목"),
  question: z.string().describe("한 문장 질문"),
  options: z.array(z.string()).describe("이 아이디어에 맞춘 구체적인 답변 후보 3~4개. wrapup이면 빈 배열"),
  multi_select: z.boolean().describe("후보를 여러 개 골라도 되는 질문이면 true"),
  done: z.boolean().describe("7개 항목을 모두 다뤘으면 true"),
});
export type ConsultTurn = z.infer<typeof ConsultTurn>;

// 사용자가 AI 후보에서 고른 답은 이 표시와 함께 저장된다 → 초안에서 'AI 제안'으로 분류
export const PICKED_PREFIX = "[AI 후보에서 선택]";
export const TYPED_PREFIX = "[직접 입력]";

// 저장·재전송용 텍스트 표현 (모델이 자기 이전 질문과 후보를 볼 수 있게)
export function turnToText(t: ConsultTurn): string {
  const opts = t.options.length ? `\n후보: ${t.options.map((o, i) => `${i + 1}) ${o}`).join(" / ")}` : "";
  return `${t.reply}\n\n질문(${t.field}): ${t.question}${opts}`;
}
