import { z } from "zod";

// 아이디어 등록 양식의 단일 정의.
// - AI 구조화 출력(IdeaDraftAI): 글자 수 제한 없음. 제한을 넣으면 AI가 조금만 넘겨도 파싱 전체가 실패한다.
// - 등록 폼/서버 검증(IdeaForm): 같은 구조 + 글자 수 제한.
export const LIMITS = {
  title: 40,
  problem: 500,
  target_users: 300,
  category: 30,
  solution: 2000,
  business_model: 1000,
  differentiation: 1000,
} as const;

export const CATEGORIES = ["교육", "헬스케어", "커머스", "생산성", "소셜", "핀테크", "환경", "기타"] as const;

export const FIELD_LABELS: Record<string, string> = {
  title: "한 줄 요약",
  problem: "문제 정의",
  target_users: "타깃 사용자",
  category: "분야",
  solution: "해결 방식",
  business_model: "수익 모델",
  differentiation: "차별점",
  needed_roles: "필요한 역할",
  provider_offers: "내가 제공할 것",
};

function build(strict: boolean) {
  const text = (max: number) => (strict ? z.string().trim().min(1, "필수 항목입니다").max(max) : z.string());
  const optText = (max: number) => (strict ? z.string().trim().max(max).nullable() : z.string().nullable());
  return z.object({
    public: z.object({
      title: text(LIMITS.title),
      problem: text(LIMITS.problem),
      target_users: text(LIMITS.target_users),
      category: text(LIMITS.category),
    }),
    detail: z.object({
      solution: text(LIMITS.solution),
      business_model: optText(LIMITS.business_model),
      differentiation: optText(LIMITS.differentiation),
    }),
    needed_roles: z.array(z.object({ role: z.string(), skills: z.array(z.string()) })),
    provider_offers: z.array(z.string()),
  });
}

export const IdeaForm = build(true);
export type IdeaFormValues = z.infer<typeof IdeaForm>;

// 구조화 출력이 이 값들만 내도록 enum으로 강제 (자유 문자열이면 엉뚱한 키가 섞임)
export const FIELD_KEYS = [
  "title", "problem", "target_users", "category", "solution",
  "business_model", "differentiation", "needed_roles", "provider_offers",
] as const;

export const IdeaDraftAI = build(false).extend({
  missing_fields: z.array(z.enum(FIELD_KEYS)).describe("상담에서 답이 나오지 않은 필드"),
  followup_questions: z.array(z.string()).describe("사용자에게 추가로 물어볼 질문 (최대 3개)"),
  risks: z.array(z.string()).describe("출시 전에 확인해 볼 약점·가정 3가지. 각각 '가정 - 확인 방법' 형식"),
  ai_suggested_fields: z
    .array(z.enum(FIELD_KEYS))
    .describe("AI 후보에서 고른 내용이나 사용자가 말하지 않은 내용이 들어간 필드"),
});
export type IdeaDraft = z.infer<typeof IdeaDraftAI>;
