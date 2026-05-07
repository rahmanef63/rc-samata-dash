# FREEZE

This repo is FROZEN for merge into superspace.

- **Tags:** `v-pre-merge-freeze`, `merge-freeze-2026-04-17`, `v-stabilization-pass`, `cutover-data-landed-2026-05-07`
- **Commit SHA:** 344102e (freeze) → 536c5dc (latest stabilization)
- **Freeze date:** 2026-04-17
- **Freeze re-verified:** 2026-04-20 (baseline pass)
- **Cutover data landed:** 2026-05-07 (9159 rows live in superspace, smoke 6/6 pass)
- **Soft cutover ready:** 2026-05-07 (`src/proxy.ts` honors `CUTOVER_REDIRECT_URL` env var)
- **Canonical target:** `/home/rahman/projects/superspace`
- **Target workspace:** `sd80m9bw54ja4nj0jt237xmq8d86877n` (RC Samata Gowa)
- **Merge lead:** @rahman

## Rules while frozen

- No new features
- Bugfixes only with merge-lead approval
- Any hotfix must be cherry-picked into the superspace tenant after merge, not re-merged from here

## Open HIGH items (block cutover)

See `../superspace/docs/merge-playbook/sources/rc-samata-dash/risk-register.md`.

| # | Issue | Status |
|---|---|---|
| 1 | 8 uncommitted WIP files | ✅ **closed** — committed f5a789f, tagged v-pre-merge-freeze |
| 2 | AI system prompt hardcodes "RC Samata Gowa" | ✅ **closed 2026-05-06** — extracted to `convex/config/branding.ts` + `src/config/branding.ts`; 14 callsites refactored to `BRAND.*` |
| 3 | Flat `branchId` tenancy vs superspace `workspaceId` | ✅ **closed 2026-05-07** — live ETL ran, 9159 rows landed in workspace `sd80m9bw54ja4nj0jt237xmq8d86877n` w/ 1:1 reconcile |
| 4 | `@convex-dev/auth` password auth vs Clerk | ✅ **closed 2026-05-07** — 8/8 source users imported to Clerk (1 existed + 7 created) |

## Stabilization artifacts (2026-05-06)

In source repo:
- `convex/config/branding.ts` + `src/config/branding.ts` — env-driven `BRAND` const
- `convex/_internal/{count,sum,exportEmbeddings}.ts` — server-side ETL helpers

In superspace `docs/merge-playbook/sources/rc-samata-dash/`:
- `branding-inventory.md` — 14 refactored callsites + ETL env-var spec
- `tenant-field-mapping.md` — 41 tables × tenant field × superspace target
- `auth-inventory.md` — Clerk migration plan + role mapping
- `excel-parser-spec.md` — 17 parser column-mapping spec

In superspace `scripts/merge-etl/rc-samata-dash/`:
- `count-rows.ts`, `sum-financial.ts`, `export-embeddings.ts` — runnable ETL baseline scripts (require `SOURCE_CONVEX_URL` + `SOURCE_CONVEX_ADMIN_KEY` env)

Live baselines captured 2026-05-06:
- `row-counts-baseline.json` ✅ — 48 tables, 1 branch, 10 weekly reports, 5079 productSales
- `financial-baseline.json` ✅ — 12 aggregates; 2026-01 sales = Rp 104.7M, 2026-02 = Rp 109.4M
- `embeddings-export.meta.json` ✅ — table empty in prod (0 rows), no export needed

## Related docs

- Audit: `../superspace/docs/merge-playbook/sources/rc-samata-dash/audit-report.md`
- Stabilization checklist: `../superspace/docs/merge-playbook/sources/rc-samata-dash/stabilization-checklist.md`
- Row-count baseline: `../superspace/docs/merge-playbook/sources/rc-samata-dash/row-counts-baseline.json` (pending run)
- Financial baseline: `../superspace/docs/merge-playbook/sources/rc-samata-dash/financial-baseline.json` (pending run)
- Branding inventory: `../superspace/docs/merge-playbook/sources/rc-samata-dash/branding-inventory.md`
- Tenant-field mapping: `../superspace/docs/merge-playbook/sources/rc-samata-dash/tenant-field-mapping.md`
- Auth inventory: `../superspace/docs/merge-playbook/sources/rc-samata-dash/auth-inventory.md`
- Excel parser spec: `../superspace/docs/merge-playbook/sources/rc-samata-dash/excel-parser-spec.md`
