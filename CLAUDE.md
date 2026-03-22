@AGENTS.md

# Additional Claude-Specific Context

## Convex Self-Hosted Auth
This project uses Convex self-hosted on Dokploy. See AGENTS.md for full auth documentation.

**Critical**: When debugging auth errors like "Connection lost while action was in flight", check:
1. `JWT_PRIVATE_KEY` env var on Convex backend (not .env.local)
2. `JWKS` env var on Convex backend
3. `CONVEX_SITE_ORIGIN` in docker-compose (maps to `process.env.CONVEX_SITE_URL`)

## Project Stack
- Next.js 16 (standalone output, Docker deploy)
- Convex self-hosted (Dokploy, Docker compose)
- `@convex-dev/auth` v0.0.91 (Password provider)
- pnpm package manager

## Key Directories
- `convex/` — Convex backend functions
- `convex/features/` — Feature-specific tables and functions
- `src/app/` — Next.js App Router pages
- `src/features/` — Feature-specific frontend code
