# rr-spec Compliance Audit — 2026-05-17

Audit 4 repos against rr conventions (Next 16, vertical slice, Convex hygiene).

## Headline scores (revised)

Prior audit overcounted bare `.collect()` by 10× (matched comments + index-narrowed). Real picture:

| Repo | TRUE bare (prod) | filter-only | Slice metadata | Score |
|---|---|---|---|---|
| `resources` | 0 (4 in migrations) | 0 | 95% | **90** |
| `notion-page-clone` | 0 (2 in migrations) | 0 | 30% (manifest only, non-spec) | **80** |
| `rc-samata-dash` | 21 | 0 | 0% (uses `src/features`) | **72** |
| `superspace` | 7 (8 in dev) | 12 | 0% (56 slices, none compliant) | **62** |

**Overall: ~76/100** (was 72; revised up after re-grep)

## Critical production fixes (49 spots → 19 real prod)

### superspace (19 prod fixes)

**TRUE bare (`.query("X").collect()` no index/filter) — 7 prod:**

```
convex/features/menus/menuItems.ts:1623
convex/features/menus/menuItems.ts:1791
convex/shared/automation/engine.ts:342
convex/workspace/workspaces.ts:1492
convex/platform/ai/queries.ts:467
```
(Acceptable in dev/migration: phase55Cleanup, platformAdmin, fixTableNames, _backfill)

**FILTER-ONLY (uses `.filter()` but no index — still scans table) — 12:**

```
convex/features/cmsLite/activityEvents/api/actions.ts:45
convex/features/integrations/tokenRefresh.ts:20
convex/features/integrations/tokenRefresh.ts:46
convex/features/chat/conversations.ts:447
convex/features/reports/queries.ts:20
convex/features/industryTemplates/queries.ts:21
convex/features/industryTemplates/queries.ts:149
convex/shared/favorites/favorites.ts:138
convex/shared/favorites/favorites.ts:273
convex/shared/activity/feed.ts:133
convex/shared/automation/engine.ts:481
convex/workspace/invitations.ts:850
```

### rc-samata-dash (21 prod fixes)

Top files:
- `features/masterData/queries.ts` (6)
- `features/ai/queries.ts` (5)
- `features/masterData/mutations.ts` (4)
- `features/ai/mutations.ts` (2)

### notion-page-clone (acceptable)

2 bare in admin migrations — ignore.

### resources (acceptable)

4 bare in `migrations/M-*-namespace-2026-05.ts` — ignore.

## Next 16 migration status

| Repo | Next | proxy.ts | middleware.ts | Cache Components |
|---|---|---|---|---|
| rc-samata | 16.2.1 ✓ | ✓ (src/proxy.ts) | none | not enabled |
| **superspace** | **15.1.6 ✗** | none | yes (26 lines, no-op) | N/A |
| notion | 16.0 ✓ | ✓ | none | commented out |
| resources | 16.0 ✓ | none | none | ✓ enabled |

superspace middleware is already a no-op (Phase 5.5 cutover). Migration trivial: bump deps + rename file + cacheComponents decision.

## Suspense coverage (Cache Components prerequisite)

superspace `app/`: 11 `<Suspense>` across 2/34 .tsx files. Way below threshold for `cacheComponents: true`. DEFER.

## rc-samata src/features → frontend/slices

18 features:
ai, ai-visual, analytics, audit, auth, cashflow, chat, closing, dashboard, expenses, inventory, master-data, payables, petty-cash, report, report-upload, sales, settings

Pattern: `src/features/<name>/` → `frontend/slices/<name>/` + `convex/features/<name>/` (most already exist at convex/features/).

## Deep cross-slice imports

superspace: 24 violations. Other 3 repos: 0.

## Action priority (revised)

| Priority | Repo | Action | Time |
|---|---|---|---|
| P0 | superspace | Fix 19 prod `.collect()` (7 bare + 12 filter-only) | 2h |
| P0 | rc-samata | Fix 21 bare `.collect()` | 1h |
| P0 | superspace | Next 15→16 migration (deps + middleware→proxy rename) | 2h |
| P1 | superspace | 24 deep imports → barrel | 1h |
| P1 | rc-samata | `src/features` → `frontend/slices` restructure | 4h |
| P2 | superspace + notion + rc-samata | Slice metadata trio | 4h (script-driven) |
| P3 | resources/notion | Cache Components enable | 2h |

**Total realistic exec: ~16h, 2 sessions.**
