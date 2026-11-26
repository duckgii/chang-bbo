# make         전부 켜기 (설치 → 로컬 Supabase → .env.local 설정 → 앱 빌드·실행)
#              패키지 설치 단계만 캐시를 쓰고(package-lock.json이 바뀌면 자동으로 새로 설치),
#              코드 복사·빌드 단계는 항상 캐시 없이 새로 만든다.
# make re      전부 지우고 캐시 전혀 없이 처음부터 (NOCACHE=1)
# make fclean  전부 끄고 컨테이너·이미지·볼륨·로컬 DB 데이터 삭제
# make help    전체 명령어
ENV_FILE ?= .env.local
COMPOSE  := docker compose --env-file $(ENV_FILE)
SUPABASE := npx supabase

# NOCACHE=1 이면 전체 캐시 없이, 아니면 지정한 스테이지만 캐시 없이 빌드
comma   := ,
nocache = $(if $(NOCACHE),--no-cache,--no-cache-filter $(1))
envval  = $$(grep -E '^$(1)=' $(ENV_FILE) | cut -d= -f2- | tr -d '"')

.DEFAULT_GOAL := all
.PHONY: all deps app prod stop clean fclean re help env logs \
	    db-start db-restart db-stop db-reset db-status db-migration lint typecheck check

## ── 기본 ──
all: deps $(ENV_FILE) db-start env app ## ★ 전부 켜기 (패키지 설치만 캐시, 코드 빌드는 항상 새로)
	@echo ""
	@echo "  앱            http://localhost:3000"
	@echo "  메일 확인     http://localhost:54324   (아무개@example.ac.kr 로 가입 후 코드 확인)"
	@echo "  Supabase 관리 http://localhost:54323"
	@echo "  로그 보기     make logs"

fclean: ## ★ 전부 끄기 + 앱 컨테이너·이미지·볼륨 + 로컬 Supabase 컨테이너·DB 데이터 삭제
	-$(COMPOSE) --profile dev --profile prod down --volumes --rmi all --remove-orphans
	-$(SUPABASE) stop --no-backup
	rm -rf .next
	@echo "→ 모두 정리했어요. (.env.local과 node_modules는 남겨둠)"

re: fclean ## 전부 지우고 캐시 전혀 없이 처음부터 다시 켜기
	$(MAKE) all NOCACHE=1

## ── 개별 단계 ──
deps: node_modules/.installed
node_modules/.installed: package.json package-lock.json
	npm install
	@touch $@

$(ENV_FILE):
	cp .env.local.example $@
	@echo "→ $@ 생성됨"

env: ## 로컬 Supabase 주소·키를 .env.local에 채우기
	@node scripts/sync-local-env.mjs $(ENV_FILE)

app: ## 개발 앱만 다시 빌드해서 실행 (코드 수정 자동 반영)
	-$(COMPOSE) --profile prod down --remove-orphans
	docker buildx build --load --target dev $(call nocache,dev) -t chang-bbo-dev:latest .
	$(COMPOSE) --profile dev up -d --force-recreate --no-build

prod: ## 배포용 이미지를 빌드해서 실행 (개발 앱 대신)
	-$(COMPOSE) --profile dev down --remove-orphans
	docker buildx build --load --target runner $(call nocache,builder$(comma)runner) \
	  --build-arg NEXT_PUBLIC_SUPABASE_URL=$(call envval,NEXT_PUBLIC_SUPABASE_URL) \
	  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$(call envval,NEXT_PUBLIC_SUPABASE_ANON_KEY) \
	  -t chang-bbo-web:latest .
	$(COMPOSE) --profile prod up -d --force-recreate --no-build

stop: ## 앱 컨테이너만 끄기 (DB는 유지)
	-$(COMPOSE) --profile dev --profile prod down --remove-orphans

clean: stop ## 앱 컨테이너 끄기 + .next 삭제 (DB·이미지는 유지)
	rm -rf .next

logs: ## 앱 로그 보기
	$(COMPOSE) --profile dev --profile prod logs -f

## ── 로컬 DB (Supabase CLI) ──
db-start: ## 로컬 Supabase 시작 (이미 켜져 있으면 그대로). 구글 로그인 키는 .env.local에서 읽음
	@set -a; [ -f $(ENV_FILE) ] && . ./$(ENV_FILE); set +a; $(SUPABASE) start

db-restart: ## 로컬 Supabase 재시작 (config.toml·구글 키 변경 반영, 데이터 유지)
	-$(SUPABASE) stop
	@set -a; [ -f $(ENV_FILE) ] && . ./$(ENV_FILE); set +a; $(SUPABASE) start

db-stop: ## 로컬 Supabase 끄기 (데이터 유지)
	$(SUPABASE) stop

db-reset: ## DB 초기화 후 마이그레이션 + seed 다시 적용
	$(SUPABASE) db reset

db-status: ## 로컬 Supabase 주소·포트 확인
	$(SUPABASE) status

db-migration: ## 새 마이그레이션 파일 생성 (예: make db-migration name=add_reports)
	@test -n "$(name)" || (echo "name=을 지정해주세요" && exit 1)
	$(SUPABASE) migration new $(name)

## ── 품질 검사 ──
lint: ## ESLint
	npx eslint src

typecheck: ## TypeScript 타입 검사
	npx tsc --noEmit

check: lint typecheck ## 린트 + 타입 검사 + 빌드
	npm run build

help: ## 명령어 목록
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-13s\033[0m %s\n", $$1, $$2}'
