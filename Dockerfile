FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* pnpm-lock.yaml* bun.lock* bun.lockb* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* vars are inlined at build time — pass the real URL as a build arg.
# In Dokploy: set Build Arg NEXT_PUBLIC_CONVEX_URL=https://api-rcsamata.rahmanef.com
ARG NEXT_PUBLIC_CONVEX_URL=https://api-rcsamata.rahmanef.com
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL

# Build-id provenance — next.config.ts derives NEXT_PUBLIC_BUILD_ID from the
# commit SHA so VersionWatcher can prompt reload on a real deploy. Without this
# passthrough the build falls back to a dev timestamp (untraceable in prod).
# In Dokploy: set Build Arg DOKPLOY_COMMIT_SHA to the commit — until then the
# value stays empty and next.config keeps the dev fallback (no behavior change).
ARG DOKPLOY_COMMIT_SHA=""
ARG COMMIT_SHA=""
ENV DOKPLOY_COMMIT_SHA=$DOKPLOY_COMMIT_SHA
ENV COMMIT_SHA=$COMMIT_SHA

RUN corepack enable pnpm && pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
