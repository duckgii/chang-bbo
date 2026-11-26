
FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ── 의존성 ──
# --ignore-scripts: supabase CLI의 바이너리 다운로드(postinstall)를 건너뜀. 컨테이너 안에서는 쓰지 않는다.
# 캐시 마운트: `build --no-cache`로 레이어는 매번 새로 만들되, npm이 받은 패키지 파일은 재사용해
#             네트워크 오류(ECONNRESET)와 빌드 시간을 줄인다.
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts --prefer-offline --fetch-retries=5 --fetch-retry-mintimeout=5000

# ── 개발용: 소스는 compose에서 볼륨으로 마운트, 코드 수정 시 자동 반영 ──
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]

# ── 빌드 ──
# NEXT_PUBLIC_* 값은 빌드 시점에 브라우저 코드에 박히므로 build arg로 받는다.
FROM base AS builder
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── 실행용: standalone 출력만 담은 작은 이미지 ──
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
