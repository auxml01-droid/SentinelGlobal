FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY pnpm-lock.yaml ./
COPY apps/worker ./apps/worker
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sentinel/worker build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/worker ./apps/worker
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules

CMD ["node", "apps/worker/dist/main.js"]
