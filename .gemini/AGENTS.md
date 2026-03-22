# Gemini Agent Instructions

Read and follow all rules in `/AGENTS.md` at repository root.

## Convex Self-Hosted Auth
This project uses Convex self-hosted on Dokploy with `@convex-dev/auth` v0.0.91.
See `AGENTS.md` for complete auth documentation including:
- Required environment variables (JWT_PRIVATE_KEY, JWKS)
- Variable mapping (CONVEX_SITE_ORIGIN → process.env.CONVEX_SITE_URL)
- Sign-in flow and debugging guide
- Password provider configuration

## Key Files
- `convex/auth.ts` — Auth config with Password provider
- `convex/auth.config.ts` — OpenID provider config
- `convex/http.ts` — HTTP routes for auth
- `convex/schema.ts` — Schema with authTables
- `src/app/ConvexClientProvider.tsx` — Client-side auth provider
- `src/app/login/page.tsx` — Login/SignUp page
