# Onboarding — `rc-samata-dash`

For agents/humans picking up where the last session left off (2026-05-06).

## TL;DR

This repo is **FROZEN since 2026-04-17** (`v-pre-merge-freeze`) and **stabilization-passed** (`v-stabilization-pass`) for merge into `/home/rahman/projects/superspace`. **Do not add features here.** All remaining work is the cutover itself, which lives in superspace.

If user asks to "continue the project" → they mean execute the cutover runbook in superspace, NOT add features in this repo.

## What's done

- ✅ De-branded: `BRAND` config in `convex/config/branding.ts` + `src/config/branding.ts` (env-driven, defaults preserve "RC Samata Gowa"); 14 callsites refactored
- ✅ ETL helpers deployed to source Convex: `convex/_internal/{count,sum,exportEmbeddings,listAll}.ts`
- ✅ Live baselines captured: 48 tables counted, 12 financial aggregates; 9,159 weekly child rows ready to port
- ✅ All HIGH source-side risks closed (#1, #2, #7); MED #5/#6/#8/#9 closed
- ✅ Superspace `qsr/` feature module shipped: 15 tables + 15 internal mutations + 16 queries + KPI dashboard + getMigrationStats
- ✅ Full ETL writer wired in `superspace/scripts/merge-etl/rc-samata-dash/etl-rc-samata.ts` (Phase 4 + 5 = all 14 weekly children)
- ✅ Clerk import script: `superspace/scripts/merge-etl/rc-samata-dash/clerk-import.ts`
- ✅ Cutover runbook: `superspace/docs/merge-playbook/sources/rc-samata-dash/CUTOVER.md`

## What's NOT done (needs human)

The remaining 6 steps need creds + production access — see `superspace/docs/merge-playbook/sources/rc-samata-dash/CUTOVER.md`:

1. `pnpm deploy:convex:selfhosted` — push qsr/ to api-ss prod
2. Run `clerk-import.ts` — creates 8 Clerk users via Backend API
3. Create RC Samata Gowa workspace in superspace UI
4. Run `etl-rc-samata.ts --phase=4` then `--phase=5` (~10 min, 9159 rows)
5. Reconcile counts via `getMigrationStats` query
6. UI smoke test → DNS swap

Estimated: **45 min hands-on**. Idempotent, rollback-safe.

## Key artifacts

| Path | Purpose |
|------|---------|
| `FREEZE.md` | Canonical freeze status + risk index |
| `convex/_internal/{count,sum,exportEmbeddings,listAll}.ts` | ETL admin helpers (deployed) |
| `convex/config/branding.ts` | Server BRAND env config |
| `src/config/branding.ts` | Client BRAND env config |
| `AGENTS.md` / `CLAUDE.md` | Project conventions (read first if writing code) |

## Where the rest lives

| Doc | Path |
|-----|------|
| Cutover runbook (8 steps) | `~/projects/superspace/docs/merge-playbook/sources/rc-samata-dash/CUTOVER.md` |
| Risk register | `~/projects/superspace/docs/merge-playbook/sources/rc-samata-dash/risk-register.md` |
| ETL field mapping | `~/projects/superspace/docs/merge-playbook/sources/rc-samata-dash/etl-mapping-spec.md` |
| Branding inventory | `~/projects/superspace/docs/merge-playbook/sources/rc-samata-dash/branding-inventory.md` |
| Tenant field mapping | `~/projects/superspace/docs/merge-playbook/sources/rc-samata-dash/tenant-field-mapping.md` |
| Auth migration plan | `~/projects/superspace/docs/merge-playbook/sources/rc-samata-dash/auth-inventory.md` |
| Excel parser specs | `~/projects/superspace/docs/merge-playbook/sources/rc-samata-dash/excel-parser-spec.md` |
| Live baselines | `~/projects/superspace/docs/merge-playbook/sources/rc-samata-dash/{row-counts,financial}-baseline.json` |
| QSR feature schema | `~/projects/superspace/convex/features/qsr/{schema,mutations,queries}.ts` |
| ETL scripts | `~/projects/superspace/scripts/merge-etl/rc-samata-dash/*.ts` |

## Critical knowledge

### Convex self-hosted admin auth gotcha

`ConvexHttpClient.setAuth(adminKey)` does NOT work with raw self-hosted admin keys (expects JWT). Use raw fetch instead:

```bash
curl -X POST "$URL/api/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Convex $ADMIN_KEY" \
  -d '{"path":"_internal/count:default","args":{"table":"x"},"format":"json"}'
```

### Production endpoints

- Source: `api-rcsamata.rahmanef.com` (creds in `rc-samata-dash/.env.local`)
- Target: `api-ss.rahmanef.com` (creds in `superspace/.env.local`)

### What's intentionally lossy

- AI chat history (35 messages) — Phase 2 of ETL is TODO; will be lost on cutover unless added
- Audit log entries — ETL `internalMutation` skips `logAuditEvent` (per AGENTS.md §4 it should). Recommend single batch entry post-ETL.
- `aiEmbeddings` — empty in source (RAG never ran); no migration needed.

### What's NOT lossy

All 9,159 weekly child rows preserved 1:1 via `qsr*` tables (vs original "lossy cross-feature mapping" plan). Cross-feature denormalization views can be added later as separate read services.

## How to verify state quickly

```bash
cd /home/rahman/projects/rc-samata-dash
git log --oneline -5
git tag --sort=-creatordate | head -3
# Expect tags: v-stabilization-pass, merge-freeze-2026-04-17, v-pre-merge-freeze

# Source Convex reachable + helpers deployed:
set -a; source .env.local; set +a
curl -s -X POST "$CONVEX_SELF_HOSTED_URL/api/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Convex $CONVEX_SELF_HOSTED_ADMIN_KEY" \
  -d '{"path":"_internal/count:default","args":{"table":"weeklyReports"},"format":"json"}'
# Expect: {"status":"success","value":10}
```

## Sibling source repos (parallel cutovers, NOT this repo's job)

Other repos in the same merge wave: `azzahrah`, `laundry-plus`, `zianinn-dekstop`, `zianinn-mobile`. Each has its own subfolder under `superspace/docs/merge-playbook/sources/`.

`laundry-plus` has SECURITY-CRITICAL items (#1 plaintext admin creds, #2 leaked OpenRouter key in git history) that block its cutover. **Don't touch those without explicit approval** — they involve credential rotation + git history rewrite.

## When in doubt

1. Read `superspace/docs/merge-playbook/sources/rc-samata-dash/CUTOVER.md` (single source of truth)
2. Read `risk-register.md` (current state of every risk)
3. Re-run `--phase=all --dry-run` to verify ETL still reads correctly from source
4. ASK before deploying or running write operations
