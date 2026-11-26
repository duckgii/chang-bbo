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

## 로컬 실행
필요한 것: Docker Desktop, Node.js 24, make

```bash
make init   # 처음 한 번: 설치 + 로컬 Supabase 시작 + .env.local 자동 설정
make dev    # 개발 서버 → http://localhost:3000
```

- `.env.local`의 `ANTHROPIC_API_KEY`는 직접 넣어야 합니다 (AI 상담용).
- 로그인 메일은 실제로 발송되지 않고 http://localhost:54324 에서 확인합니다. `아무개@example.ac.kr`로 가입하세요.
- Supabase 관리 화면: http://localhost:54323
- 전체 명령어: `make help` (DB 초기화 `make db-reset`, 배포 이미지 `make build` / `make up`, 검사 `make check` 등)

## 클라우드 Supabase에 배포할 때
1. Supabase 프로젝트를 만들고 `supabase/migrations/`를 적용합니다 (`npx supabase link` 후 `npx supabase db push`).
   - 마이그레이션 맨 아래 `schools`의 `example.ac.kr`을 실제 학교 이메일 도메인으로 바꾸세요.
2. Authentication → Email Templates의 Magic Link 템플릿에 `{{ .Token }}`을 넣어 6자리 코드가 가게 합니다 (`supabase/templates/magic_link.html` 참고).
3. `.env.local`에 클라우드 주소·키를 넣고 `DOCKER_SUPABASE_URL`은 비워둡니다.

## 설계 원칙
- 권한은 DB에서 강제합니다(RLS). 상세 영역은 `get_idea_detail()` 함수로만 읽고, 이 함수가 열람 기록을 남깁니다.
- 아이디어 등록·수정은 `submit_idea()`로만 하며, 버전별 해시 체인이 `idea_versions`에 쌓입니다.
- `idea_versions`, `view_logs`, `ai_messages`, `messages`는 추가만 가능합니다.
- 양식 정의는 `src/lib/idea-schema.ts` 한 곳에 있고, AI 구조화 출력·폼 검증·서버 검증이 함께 씁니다.
- AI 상담 기록은 클라이언트가 아니라 DB에서 다시 읽어 모델에 보냅니다.

## 아직 안 한 것
- 하루 1회 해시를 외부에 공개하는 작업(`daily_anchors`), 승인 대기 리마인드·자동 만료 배치
- 팀 합의서 템플릿, 신고 처리 관리자 화면, 개인정보처리방침·이용약관 페이지
