# Onboarding — `rc-samata-dash`

For agents/humans picking up where the last session left off (2026-05-07).

## TL;DR

This repo is **FROZEN** (`v-pre-merge-freeze`, `v-stabilization-pass`) and **DATA MIGRATED** (`cutover-data-landed-2026-05-07`). All 9,159 production rows now live in superspace workspace `sd80m9bw54ja4nj0jt237xmq8d86877n`. Only UI smoke + DNS swap remain. **Do not add features here.**

If user asks to "continue the project" → they mean Steps 7-8 of the cutover (UI smoke test + DNS swap), NOT add features in this repo.

## What's done

- ✅ De-branded: `BRAND` config + 14 callsite refactors
- ✅ ETL helpers deployed to source: `convex/_internal/{count,sum,exportEmbeddings,listAll}.ts`
- ✅ Live baselines captured + reconciled exactly post-migration
- ✅ All HIGH risks closed (source #1/#2/#7, ETL #3/#4, build #11/#12/#13)
- ✅ Superspace `qsr/` deployed: schema + mutations + queries + bootstrap + rollback + admin reconcile
- ✅ Clerk import: 8/8 source users in Clerk (1 existed, 7 created)
- ✅ Live ETL ran 2026-05-07: 9159 rows, 0 errors, financial sum exact (Rp 312M across 4 months)
- ✅ Workspace bootstrapped via admin-key path (no UI needed)

## What's NOT done (needs human)

The remaining 2 steps need browser + DNS admin — see `superspace/docs/merge-playbook/sources/rc-samata-dash/CUTOVER.md` Steps 7-8:

1. **Step 7 — UI smoke** (~10 min, browser): open superspace, log in as `rahmanef63@gmail.com`, switch to RC Samata Gowa workspace, verify dashboard / weekly reports list / drill-down / financial KPIs
2. **Step 8 — DNS swap** (~5 min, DNS admin): redirect `rc-samata.app` → `app.superspace.com/workspaces/rc-samata-gowa` OR add Clerk magic-link handoff; mark source decommission timer

Estimated: **15 min hands-on**. Idempotent, rollback-safe (`qsr/rollback.ts:deleteAllQsrByPrefix` admin-key helper available).

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
