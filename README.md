# RC Samata Dashboard

Operational dashboard for RC Samata built with Next.js 16 and self-hosted Convex on Dokploy.

## What It Does

- Upload and parse weekly Excel reports from the business
- Aggregate sales, expenses, payables, petty cash, inventory, and reporting views
- Manage master data and operational workflows in one dashboard
- Provide AI chat over indexed report data with authenticated, user-scoped chat sessions

## Stack

- Frontend: Next.js 16.2.1, React 19, Tailwind CSS v4, shadcn/ui, Framer Motion
- Backend: Convex 1.34+ self-hosted on Dokploy
- Auth: `@convex-dev/auth` with password provider
- Package manager: `pnpm`

## Local Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Required frontend env:

```bash
NEXT_PUBLIC_CONVEX_URL=https://api-rcsamata.rahmanef.com
NEXT_PUBLIC_SITE_URL=https://rcsamata.rahmanef.com
```

Backend auth env for the Convex service is documented in [docs/deployment.md](docs/deployment.md).

## Common Commands

```bash
# Dev
pnpm dev

# Type check
npx tsc --noEmit

# Production build
pnpm build

# Lint
pnpm run lint
```

## Architecture Notes

- Route protection is handled client-side by `AuthGuard` because Convex auth tokens live in browser memory.
- Security headers are applied through `src/proxy.ts` (Next.js 16 proxy, formerly middleware).
- AI config, chat, and indexing endpoints are authenticated in Convex, and chat sessions are scoped to the current user.
- The Docker build context is constrained by `.dockerignore` so local `.env*`, `_data`, and build artifacts are not copied into the image context.

## Documentation

- [docs/architecture.md](docs/architecture.md)
- [docs/deployment.md](docs/deployment.md)
- [docs/developer.md](docs/developer.md)
- [docs/onboarding.md](docs/onboarding.md)
- [docs/SSOT-STATUS.md](docs/SSOT-STATUS.md) — Buku Besar SSOT done/pending matrix
