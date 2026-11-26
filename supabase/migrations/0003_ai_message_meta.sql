-- AI 답변의 구조화 데이터(질문·후보·다중 선택 여부)를 함께 저장해,
-- 새로고침 후에도 진행 중인 상담을 후보 버튼까지 그대로 이어갈 수 있게 한다.
-- (해시 체인은 기존처럼 content 기준. meta는 화면 복원용)
alter table public.ai_messages add column meta jsonb;
