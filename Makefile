# 사용법: make help
ENV_FILE ?= .env.local
COMPOSE  := docker compose --env-file $(ENV_FILE)
SUPABASE := npx supabase

.DEFAULT_GOAL := help
.PHONY: help init setup env db-start db-stop db-reset db-status db-env db-migration \
	    dev dev-bg dev-down build up down logs restart lint typecheck check clean

help: ## 명령어 목록
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

## ── 처음 한 번 ──
init: setup db-start env ## ★ 처음 한 번: 설치 + 로컬 DB 시작 + .env.local 자동 설정
	@echo ""
	@echo "준비 완료! 'make dev' 로 개발 서버를 켜세요 → http://localhost:3000"
	@echo "로그인 메일 확인: http://localhost:54324  (아무개@example.ac.kr 로 가입)"

setup: ## 패키지 설치 + .env.local 생성
	npm install
	@test -f $(ENV_FILE) || (cp .env.local.example $(ENV_FILE) && echo "→ $(ENV_FILE) 생성됨. 값을 채워주세요.")

env: ## 로컬 Supabase 주소·키를 .env.local에 채우기 (db-start 후)
	@node scripts/sync-local-env.mjs $(ENV_FILE)

## ── 로컬 DB (Supabase CLI) ──
db-start: ## 로컬 Supabase 시작 (DB, Auth, Realtime, 메일 확인 화면 :54324)
	$(SUPABASE) start

db-stop: ## 로컬 Supabase 중지
	$(SUPABASE) stop

db-reset: ## DB 초기화 후 마이그레이션 + seed 다시 적용
	$(SUPABASE) db reset

db-status: ## 로컬 Supabase 주소·포트 확인
	$(SUPABASE) status

db-migration: ## 새 마이그레이션 파일 생성 (예: make db-migration name=add_reports)
	@test -n "$(name)" || (echo "name=을 지정해주세요" && exit 1)
	$(SUPABASE) migration new $(name)

## ── 앱 (Docker Compose) ──
dev: ## 개발 서버 (http://localhost:3000, 코드 수정 자동 반영)
	$(COMPOSE) --profile dev up --build

dev-bg: ## 개발 서버를 백그라운드로 실행
	$(COMPOSE) --profile dev up --build -d

dev-down: ## 개발 서버 중지
	$(COMPOSE) --profile dev down

build: ## 배포용 이미지 빌드
	$(COMPOSE) --profile prod build

up: build ## 배포용 이미지로 실행 (백그라운드)
	$(COMPOSE) --profile prod up -d

down: ## 모든 앱 컨테이너 중지
	$(COMPOSE) --profile dev --profile prod down

restart: down up ## 배포용 컨테이너 재시작

logs: ## 앱 로그 보기
	$(COMPOSE) --profile dev --profile prod logs -f

## ── 품질 검사 ──
lint: ## ESLint
	npx eslint src

typecheck: ## TypeScript 타입 검사
	npx tsc --noEmit

check: lint typecheck ## 린트 + 타입 검사 + 빌드
	npm run build

clean: ## 빌드 결과물·컨테이너·볼륨 정리
	$(COMPOSE) --profile dev --profile prod down -v --remove-orphans
	rm -rf .next
