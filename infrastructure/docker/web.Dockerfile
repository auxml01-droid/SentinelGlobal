FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY pnpm-lock.yaml ./
COPY apps/web ./apps/web
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sentinel/web build

FROM node:20-alpine AS runner

WORKDIR /app

RUN corepack enable

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/next.config.js ./apps/web/next.config.js
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["pnpm", "--filter", "@sentinel/web", "start"]
