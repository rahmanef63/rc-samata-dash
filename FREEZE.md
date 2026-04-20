# FREEZE

This repo is FROZEN for merge into superspace.

- **Tags:** `v-pre-merge-freeze`, `merge-freeze-2026-04-17`
- **Commit SHA:** 344102e
- **Freeze date:** 2026-04-17
- **Freeze re-verified:** 2026-04-20 (baseline pass)
- **Canonical target:** `/home/rahman/projects/superspace`
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
| 2 | AI system prompt hardcodes "RC Samata Gowa" | OPEN — parameterize during ETL |
| 3 | Flat `branchId` tenancy vs superspace `workspaceId` | OPEN — ETL mapping (see `tenant-field-mapping.md`) |
| 4 | `@convex-dev/auth` password auth vs Clerk | OPEN — Phase 4 auth unification |

## Related docs

- Audit: `../superspace/docs/merge-playbook/sources/rc-samata-dash/audit-report.md`
- Stabilization checklist: `../superspace/docs/merge-playbook/sources/rc-samata-dash/stabilization-checklist.md`
- Row-count baseline: `../superspace/docs/merge-playbook/sources/rc-samata-dash/row-counts-baseline.json`
- Financial baseline: `../superspace/docs/merge-playbook/sources/rc-samata-dash/financial-baseline.json`
- Branding inventory: `../superspace/docs/merge-playbook/sources/rc-samata-dash/branding-inventory.md`
- Tenant-field mapping: `../superspace/docs/merge-playbook/sources/rc-samata-dash/tenant-field-mapping.md`
- Auth inventory: `../superspace/docs/merge-playbook/sources/rc-samata-dash/auth-inventory.md`
