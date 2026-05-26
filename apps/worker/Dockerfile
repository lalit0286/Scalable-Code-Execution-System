FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat docker-cli

# ── Deps stage ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/worker/package.json ./apps/worker/

RUN npm install --workspace=packages/shared --workspace=apps/worker

# ── Build stage ─────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules

COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/worker ./apps/worker

RUN cd packages/shared && npm run build
RUN cd apps/worker && npx prisma generate
RUN cd apps/worker && npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

# docker-cli needed to spawn sandbox containers
RUN apk add --no-cache docker-cli

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/worker/package.json ./apps/worker/

RUN npm install --workspace=packages/shared --workspace=apps/worker --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/node_modules/.prisma ./apps/worker/node_modules/.prisma
COPY --from=builder /app/apps/worker/node_modules/@prisma ./apps/worker/node_modules/@prisma

COPY apps/worker/prisma ./apps/worker/prisma

WORKDIR /app/apps/worker

CMD ["node", "dist/worker.js"]
