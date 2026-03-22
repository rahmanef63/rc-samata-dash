@AGENTS.md

# Codex-Specific Context

## Convex Self-Hosted Auth
This project uses Convex self-hosted on Dokploy. See AGENTS.md for full auth documentation.

**Critical**: Auth errors like "Connection lost while action was in flight" are caused by missing env vars on the Convex backend server:
- `JWT_PRIVATE_KEY` (RSA PKCS8/PEM) — for signing JWT tokens
- `JWKS` (JSON Web Key Set) — for JWT verification
- `CONVEX_SITE_URL` (auto-mapped from `CONVEX_SITE_ORIGIN`) — JWT issuer

These must be set in **Dokploy → Convex backend service → Environment Variables**, NOT in `.env.local`.

## Project Stack
- Next.js 16 (standalone output, Docker deploy)
- Convex self-hosted (Dokploy, Docker compose)
- `@convex-dev/auth` v0.0.91 (Password provider)
- pnpm package manager
