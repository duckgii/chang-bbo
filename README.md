<div align="center">

# 창뽀 · chang-bbo

**창업 아이디어를 올리면, 공감한 사람들이 팀으로 합류해 실제로 만들기까지.**

아이디어는 있는데 만들 사람이 없는 사람과, 만들 수는 있는데 아이디어가 없는 사람을 잇는 팀 빌딩 플랫폼입니다.<br>
AI가 아이디어를 함께 다듬고, 비밀유지 동의와 기록으로 아이디어를 안심하고 공개할 수 있게 합니다.

![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Claude](https://img.shields.io/badge/Claude_API-D97757?style=flat-square&logo=anthropic&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/02-ideas-dark.png">
  <img alt="아이디어 둘러보기" src="docs/screenshots/02-ideas-light.png" width="860">
</picture>

</div>

> 스크린샷은 모두 데모 데이터로 찍었습니다. GitHub 테마(라이트/다크)에 맞는 화면이 표시돼요.

---

## 왜 만들었나요

| 이런 사람이 있어요 | 그런데 |
|---|---|
| 💡 창업 아이디어는 있는데 개발할 사람·시간이 없는 사람 | 아이디어가 아이디어로만 끝나요 |
| 🛠️ 캡스톤·포트폴리오·사이드 프로젝트 주제가 필요한 개발자·디자이너 | 무엇을 만들지 정하는 단계에서 막혀요 |
| 🤝 두 사람이 만나더라도 | "공개하면 아이디어만 가져가지 않을까?" 하는 불안 때문에 아이디어를 꺼내지 못해요 |

창뽀는 **"훔치면 손해가 크고, 같이 하는 게 더 이득인 구조"**를 목표로 합니다.

## 주요 기능

### 1. AI와 아이디어 다듬기 → 등록 양식 자동 작성
아이디어를 한두 문장만 입력하면, AI가 문제 정의·타깃·해결 방식·수익 모델·차별점·필요한 역할을 하나씩 물어봅니다.
매 질문마다 **아이디어에 맞춘 답변 후보 3~4개**를 보여줘서 클릭만으로 답할 수 있고, 맞는 게 없으면 직접 입력하면 됩니다.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/03-ai-consult-dark.png">
  <img alt="AI 상담" src="docs/screenshots/03-ai-consult-light.png" width="860">
</picture>

상담이 끝나면 **[초안 만들기]** 한 번으로 등록 양식이 채워집니다.
AI 후보에서 고른 내용은 `AI 제안` 배지로 구분되고, 출시 전에 검증할 가정 3가지와 더 채우면 좋은 부분도 알려줍니다.

<details>
<summary>초안이 채워진 등록 양식 보기</summary>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/04-draft-dark.png">
  <img alt="AI 초안" src="docs/screenshots/04-draft-light.png" width="860">
</picture>
</details>

### 2. 비슷한 아이디어 안내 (막지 않고 기록)
등록 전에 비슷한 아이디어가 있는지 확인합니다. 다른 사람의 것이라면 **그 팀에 합류 지원**하거나 **차별점을 보완**하거나 **그래도 등록**할 수 있어요.
비교에는 누구나 볼 수 있는 공개 영역만 쓰고, 안내받은 사실은 분쟁 대비 기록으로 남습니다.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/05-similar-dark.png">
  <img alt="비슷한 아이디어 안내" src="docs/screenshots/05-similar-light.png" width="860">
</picture>

### 3. 공개 영역 / 상세 영역 + 항목별 비밀유지 동의
제목·문제 정의·타깃은 누구나 볼 수 있고, **해결 방식·수익 모델·차별점은 비밀유지 항목 7개에 모두 동의해야** 바로 열람할 수 있습니다.
좋아요와 댓글로 아이디어에 의견을 남기고, 마음에 들면 원하는 역할로 팀 합류를 지원합니다.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/06-detail-dark.png">
  <img alt="아이디어 상세" src="docs/screenshots/06-detail-light.png" width="860">
</picture>

### 4. 마이페이지 — 누가 언제 동의하고 열람했는지
작성자는 **비밀유지 동의 기록**(누가, 언제, 어떤 버전의 동의서에)과 **상세 열람 기록**을 확인하고, 받은 지원을 수락해 팀을 만듭니다.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/07-mypage-dark.png">
  <img alt="마이페이지" src="docs/screenshots/07-mypage-light.png" width="860">
</picture>

### 5. 프로젝트 채팅 + 주간 체크인
팀이 만들어지면 실시간 채팅방이 열립니다. 매주 "진행 중 / 막힘 / 중단"을 기록해 **결성 후에도 개발이 이어지는지** 확인할 수 있어요.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/08-chat-dark.png">
  <img alt="프로젝트 채팅" src="docs/screenshots/08-chat-light.png" width="860">
</picture>

<details>
<summary>로그인 화면 보기</summary>

구글 계정으로 바로 시작합니다. 학교 메일 계정으로 로그인하면 프로필과 댓글에 `○○대학교 인증`이 표시됩니다.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/01-login-dark.png">
  <img alt="로그인" src="docs/screenshots/01-login-light.png" width="860">
</picture>
</details>

## 아이디어 보호 장치

아이디어를 본 사람이 내용을 잊게 만들 수는 없으므로, 기술적으로 완전히 막는 것은 불가능합니다.
대신 **도용하면 기록이 남고, 같이 하는 편이 더 이득이 되도록** 설계했습니다.

| 장치 | 동작 |
|---|---|
| 🔐 **단계적 공개** | 공개 영역만 목록에 노출. 상세 영역은 비밀유지 7개 항목에 모두 동의해야 열람 |
| 🧾 **동의·열람 기록** | 동의 시각·동의서 버전·열람 시각을 기록하고 작성자가 확인. 기록은 수정·삭제 불가 |
| ⛓️ **선행 증거 (해시 체인)** | 등록·수정할 때마다 버전별 `SHA-256(이전 해시 + 내용)`을 남겨 "누가 언제 무엇을 올렸는지" 증명 |
| 🤖 **AI 제안 구분** | 사용자가 쓴 내용과 AI 후보에서 고른 내용을 구분해 기록 (AI가 여러 사람에게 비슷한 제안을 했을 때의 분쟁 대비) |
| 🔎 **비슷한 아이디어 안내 기록** | 등록 전에 무엇을 안내받았고 무엇을 골랐는지 기록 |
| 🙋 **제공자도 팀의 일원** | 등록할 때 "내가 제공할 것"(도메인 지식, 고객 섭외 등)을 받아 아이디어만 던지는 구조를 피함 |

> ⚠️ 비밀유지 동의 문구는 **법률 검토 전 초안**입니다. 실제 서비스 전에 법률 자문을 받아야 합니다.

## 기술 스택과 구조

```mermaid
flowchart LR
  U[사용자 브라우저] -->|Google 로그인| SA[Supabase Auth]
  U --> N[Next.js 15<br/>App Router]
  N -->|RLS가 적용된 쿼리·RPC| DB[(Supabase Postgres)]
  N -->|/api/consult · /api/draft · /api/similar| C[Claude API<br/>Haiku 5.5]
  U <-->|실시간 채팅| RT[Supabase Realtime]
  RT --- DB
```

| 영역 | 사용 기술 |
|---|---|
| 프론트엔드 | Next.js 15 (App Router, Server Actions), React 19, Tailwind CSS v4, react-hook-form + Zod |
| 백엔드 / DB | Supabase (Postgres, Auth, Realtime), Row Level Security, `pg_trgm`, `pgcrypto` |
| AI | Claude API (`claude-haiku-5-5`) — 구조화 출력(Zod)으로 상담 질문·후보, 등록 초안, 유사도 판단 |
| 개발 환경 | Docker Compose, Makefile, Supabase CLI |

**설계 원칙**
- **권한은 DB에서 강제**합니다. 상세 영역은 `get_idea_detail()` 함수로만 읽을 수 있고, 이 함수가 권한 확인과 열람 기록을 함께 처리합니다.
- **양식 정의는 한 곳**(`src/lib/idea-schema.ts`)에 두고 AI 구조화 출력·폼 검증·서버 검증이 함께 씁니다.
- **AI에는 다른 사람의 상세 영역을 보내지 않습니다.** 비슷한 아이디어 비교도 공개 영역만 사용합니다.
- AI 상담 기록은 클라이언트가 보낸 것을 믿지 않고 DB에서 다시 읽어 모델에 보냅니다.

## 로컬에서 실행하기

필요한 것: **Docker Desktop**, **Node.js 24**, **make**

```bash
git clone https://github.com/duckgii/chang-bbo.git
cd chang-bbo
make        # 설치 → 로컬 Supabase 시작 → .env.local 자동 설정 → 앱 빌드·실행
```

| 주소 | 용도 |
|---|---|
| http://localhost:3000 | 앱 |
| http://localhost:54323 | Supabase 관리 화면 (Studio) |
| http://localhost:54324 | 로컬 메일함 (개발용 코드 로그인) |

### 환경 변수 (`.env.local`)
`make`가 Supabase 주소와 키는 자동으로 채웁니다. 아래 값은 직접 넣어주세요.

| 이름 | 설명 |
|---|---|
| `ANTHROPIC_API_KEY` | AI 상담용 Claude API 키 (서버 전용) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud Console의 OAuth 클라이언트 (웹 애플리케이션). 승인된 리디렉션 URI: `http://127.0.0.1:54321/auth/v1/callback` |

구글 키를 넣거나 바꾼 뒤에는 `make db-restart`로 반영합니다.
구글 키 없이 써보려면 로그인 화면 아래의 **개발용 이메일 코드 로그인**으로 `아무개@example.ac.kr`에 로그인하고, 코드는 로컬 메일함에서 확인하세요.

### 자주 쓰는 명령

| 명령 | 하는 일 |
|---|---|
| `make` | 전부 켜기 (패키지 설치 단계만 캐시, 코드 빌드는 항상 새로) |
| `make fclean` | 전부 끄고 컨테이너·이미지·볼륨·로컬 DB 데이터 삭제 |
| `make re` | `fclean` 후 캐시 없이 처음부터 |
| `make app` | 앱만 다시 빌드해서 실행 |
| `make db-reset` | DB 초기화 후 마이그레이션 + seed 다시 적용 |
| `make db-migration name=...` | 새 마이그레이션 파일 생성 |
| `make check` | 린트 + 타입 검사 + 빌드 |
| `make help` | 전체 명령 보기 |

## 폴더 구조

```text
src/
├─ app/
│  ├─ ideas/            # 둘러보기 · 상세(동의·좋아요·댓글·지원) · 등록(AI 상담) · 수정
│  ├─ me/               # 마이페이지
│  ├─ projects/         # 프로젝트 채팅 · 주간 체크인
│  ├─ login/, auth/     # 구글 로그인
│  ├─ api/              # consult(AI 상담) · draft(초안) · similar(비슷한 아이디어)
│  └─ actions.ts        # 서버 액션
├─ components/          # 공통 등록 양식, 비슷한 아이디어 안내창
└─ lib/                 # 양식 스키마, AI 프롬프트·클라이언트, Supabase 클라이언트
supabase/
├─ migrations/          # 0001~0008: 스키마, RLS, 해시 체인, 좋아요·댓글, 유사 아이디어, 비밀유지 동의
└─ config.toml          # 로컬 Supabase 설정 (구글 로그인 포함)
```

## 로드맵

- [x] 아이디어 등록(공개/상세 분리)·수정, 버전별 해시 기록
- [x] AI 상담(후보 클릭) → 등록 초안 자동 작성
- [x] 항목별 비밀유지 동의 후 즉시 열람, 동의·열람 기록
- [x] 좋아요·댓글, 팀 합류 지원, 실시간 채팅, 주간 체크인
- [x] 비슷한 아이디어 안내, 구글 로그인, 다크 모드
- [ ] 하루 1회 해시를 외부(GitHub·OpenTimestamps)에 공개해 기록 위·변조 방지 강화
- [ ] 팀 합의서 템플릿 (역할·기여 배분·이탈 시 처리)
- [ ] 신고 처리 관리자 화면, 개인정보처리방침·이용약관
- [ ] 비밀유지 동의서·약관 법률 검토
