FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY pnpm-lock.yaml ./
COPY apps/api ./apps/api
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sentinel/api build

FROM node:20-alpine AS runner

WORKDIR /app

RUN corepack enable

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
