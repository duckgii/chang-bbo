# chang-bbo

창업 아이디어 팀 꾸리는 서비스입니다. (아이디어 공유·팀 빌딩 플랫폼)

Next.js 15 (App Router) + Supabase + Claude API

## 주요 화면
| 경로 | 화면 |
|---|---|
| `/me` | 마이페이지: 프로필, 받은 열람 신청·지원 처리, 내 아이디어 열람 기록 |
| `/ideas/new` | 아이디어 등록 (왼쪽 AI 상담, 오른쪽 등록 양식) |
| `/ideas`, `/ideas/[id]` | 아이디어 둘러보기, 공개 영역 보기, 상세 열람 신청, 팀 합류 지원 |
| `/projects`, `/projects/[teamId]` | 프로젝트별 채팅방(실시간), 주간 체크인 |
| `/login` | 학교 이메일 인증 코드 로그인 |

## 설정
1. Supabase 프로젝트를 만들고 SQL Editor에서 `supabase/migrations/0001_init.sql`을 실행합니다.
   - 실행 전 맨 아래 `schools`의 `example.ac.kr`을 실제 학교 이메일 도메인으로 바꾸세요.
2. Supabase → Authentication → Email Templates → Magic Link 템플릿에 `{{ .Token }}`을 넣어 6자리 코드가 메일로 가게 합니다.
3. `.env.local.example`을 `.env.local`로 복사하고 값을 채웁니다. `ANTHROPIC_API_KEY`는 서버 전용입니다.
4. `npm run dev`

## 설계 원칙
- 권한은 DB에서 강제합니다(RLS). 상세 영역은 `get_idea_detail()` 함수로만 읽고, 이 함수가 열람 기록을 남깁니다.
- 아이디어 등록·수정은 `submit_idea()`로만 하며, 버전별 해시 체인이 `idea_versions`에 쌓입니다.
- `idea_versions`, `view_logs`, `ai_messages`, `messages`는 추가만 가능합니다.
- 양식 정의는 `src/lib/idea-schema.ts` 한 곳에 있고, AI 구조화 출력·폼 검증·서버 검증이 함께 씁니다.
- AI 상담 기록은 클라이언트가 아니라 DB에서 다시 읽어 모델에 보냅니다.

## 아직 안 한 것
- 하루 1회 해시를 외부에 공개하는 작업(`daily_anchors`), 승인 대기 리마인드·자동 만료 배치
- 팀 합의서 템플릿, 신고 처리 관리자 화면, 개인정보처리방침·이용약관 페이지
