# GitHub Actions — DEPRECATED for this repo

This repo no longer uses GitHub Actions. The active workflow `deploy.yml`
was nuked **2026-05-16** to eliminate cloud-minute burn. Original YAML
preserved as `deploy.yml.bak` for reference / restore.

## What `deploy.yml` did

Two jobs on workflow_dispatch:
1. `deploy-convex` — `npx convex deploy` to `https://api-rcsamata.rahmanef.com`
2. `deploy-nextjs` — POST Dokploy `application.deploy` for applicationId `5dtXzRVLui5qszBFfz7h7`

## Replacements

| Old job | Replacement |
|---|---|
| Convex deploy | Manual `npx convex deploy --url https://api-rcsamata.rahmanef.com --admin-key "$CONVEX_ADMIN_KEY"` (run when `convex/` changed) or `/sc-convex push` |
| Dokploy redeploy | **Automatic** — Dokploy webhook listens to `git push origin main` and rebuilds the Next.js container with no manual trigger |

## Context (2026-05-16)

This repo is FROZEN since 2026-04-17 — data migrated to `superspace` qsr
workspace, frontend now serves a soft-cutover redirect (`CUTOVER_REDIRECT_URL`).
New weekly Excel data lands directly in `superspace` via
`scripts/etl/qsr/upload-weekly.ts`. The Convex backend at
`api-rcsamata.rahmanef.com` stays up only to serve the legacy `src/proxy.ts`
redirect path until DNS is swapped.

So in practice no one runs Convex deploy on this repo anymore; the active
deploy path is Dokploy-only for the proxy redirect.

## Re-enable

```bash
cp deploy.yml.bak deploy.yml
git add .github/workflows/deploy.yml && git commit && git push
gh workflow run deploy.yml -R rahmanef63/rc-samata-dash
```

## Reference skills

- `/sc-git ci` — local CI before push
- `/sc-convex push` — manual Convex schema deploy
- `/sc-dokploy` — Dokploy CRUD, webhook inspection
- `/sc-all` — end-to-end deploy orchestrator
