<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:convex-selfhosted-auth-rules -->
# Convex Self-Hosted Authentication (CRITICAL)

This project uses **Convex self-hosted** (deployed on Dokploy) with `@convex-dev/auth` for authentication. The auth system has specific requirements that differ from Convex Cloud.

## Architecture Overview

- **Frontend**: Next.js 16 (deployed as Docker container on Dokploy)
- **Backend**: Convex self-hosted (deployed as Docker compose on Dokploy)
- **Auth**: `@convex-dev/auth` v0.0.91 with Password provider
- **Domain**: `api-rcsamata.rahmanef.com` (Convex API), `site-rcsamata.rahmanef.com` (HTTP Actions)

## Required Environment Variables (Convex Backend)

The `@convex-dev/auth` library requires these environment variables **on the Convex backend server** (NOT in `.env.local`):

| Variable | Description | Where to Set |
|---|---|---|
| `JWT_PRIVATE_KEY` | RSA private key (PKCS8/PEM format) for signing JWT tokens | Dokploy → Convex backend service → Environment |
| `JWKS` | JSON Web Key Set (public key) for JWT verification | Dokploy → Convex backend service → Environment |
| `CONVEX_SITE_URL` | Auto-mapped from `CONVEX_SITE_ORIGIN` in docker-compose | Docker compose env (already set) |
| `CONVEX_CLOUD_URL` | Auto-mapped from `CONVEX_CLOUD_ORIGIN` in docker-compose | Docker compose env (already set) |

### Important Variable Mappings (Self-Hosted)

Docker-compose env → `process.env` in Convex functions:
- `CONVEX_SITE_ORIGIN` → `process.env.CONVEX_SITE_URL`
- `CONVEX_CLOUD_ORIGIN` → `process.env.CONVEX_CLOUD_URL`

### How JWT_PRIVATE_KEY and JWKS are Used

The `@convex-dev/auth` library uses these in:
- `tokens.js`: `requireEnv("JWT_PRIVATE_KEY")` — Signs JWT tokens with RS256
- `tokens.js`: `requireEnv("CONVEX_SITE_URL")` — Sets JWT issuer
- `index.js` (HTTP routes): `requireEnv("JWKS")` — Serves `/.well-known/jwks.json`
- `index.js` (HTTP routes): `requireEnv("CONVEX_SITE_URL")` — Serves `/.well-known/openid-configuration`

### Generating Keys

```bash
node -e "
const { generateKeyPairSync, createPublicKey } = require('crypto');
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const jwk = createPublicKey(publicKey).export({ format: 'jwk' });
jwk.alg = 'RS256'; jwk.use = 'sig'; jwk.kid = 'convex-self-hosted-1';
console.log('JWT_PRIVATE_KEY:', privateKey);
console.log('JWKS:', JSON.stringify({ keys: [jwk] }));
"
```

## Auth File Structure

- `convex/auth.ts` — Main auth config, exports `{ auth, signIn, signOut, store, isAuthenticated }`
- `convex/auth.config.ts` — OpenID provider config (domain = `process.env.CONVEX_SITE_URL`)
- `convex/http.ts` — HTTP router with `auth.addHttpRoutes(http)`
- `convex/schema.ts` — Includes `...authTables` from `@convex-dev/auth/server`
- `src/app/ConvexClientProvider.tsx` — Uses `ConvexAuthProvider` from `@convex-dev/auth/react`
- `src/app/login/page.tsx` — Login/SignUp page using `useAuthActions().signIn`

## Common Errors

### "Connection lost while action was in flight"
This error means a Convex **action crashed** on the server. For auth, this is almost always caused by:
1. Missing `JWT_PRIVATE_KEY` env var → `tokens.js` crashes at `requireEnv("JWT_PRIVATE_KEY")`
2. Missing `JWKS` env var → HTTP routes crash at `requireEnv("JWKS")`
3. Missing/invalid `CONVEX_SITE_URL` → JWT issuer or OpenID config fails

### Fix: Set JWT_PRIVATE_KEY and JWKS in Dokploy
Go to Dokploy Dashboard → Convex backend service → Environment Variables → Add `JWT_PRIVATE_KEY` and `JWKS`.

## Password Provider Notes

The Password provider in `convex/auth.ts` currently uses **plaintext password storage** (prefix `pt_`). For production, remove the `crypto` block to use bcrypt (default). Note: existing users will need password resets after this change.

## Sign-In Flow (for debugging)

1. Client calls `signIn("password", {email, password, flow, name})` via `useAuthActions()`
2. Convex runs action `auth:signIn` → `signInImpl()` → `handleCredentials()`
3. Password provider's `authorize()` creates/retrieves account via `ctx.runMutation(internal.auth.store, ...)`
4. `callSignIn()` → `maybeGenerateTokensForSession()` → `generateToken()`
5. `generateToken()` calls `requireEnv("JWT_PRIVATE_KEY")` to sign JWT with RS256
6. Returns `{token, refreshToken}` to client
7. Client stores tokens and authenticates subsequent requests
<!-- END:convex-selfhosted-auth-rules -->

# Menu Routes & Role Gating (synced 2026-05-17)

Single source of truth: `src/config/routes.ts`. Sidebar renders from
`filterRouteGroups(role)` so changes to routes propagate automatically.

## MENU UTAMA (all roles)
- `/` Dashboard
- `/report` Ringkasan Laporan
- `/laporan` Semua Laporan
- `/laporan/analisis` Analisis
- `/laporan/upload` Upload Laporan (admin/staff)
  - `/laporan/upload-pergantian` Pergantian Produk
  - `/laporan/upload-tunjangan` Tunjangan Karyawan
- `/laporan/[reportId]` Drill per weekly report (16 tabs, dynamic)
- `/chat` Chat AI
- `/profile` Profil

## KEUANGAN (admin/staff)
- `/finance` Penjualan
- `/finance/expenses` Pengeluaran
- `/finance/payables` Piutang Vendor
- `/finance/petty-cash` Petty Cash
- `/finance/cashflow` Cashflow
- `/finance/closing` Closing & Setoran (includes Owner Transfers tab)

## OPERASIONAL
Staff + super_admin:
- `/operation` Inventaris
- `/operation/stock-movements` Mutasi Stok
- `/operation/audit` Audit (checklist)
- `/operation/kpi-targets` Target KPI
- `/operation/master-data` Master Data
- `/operation/settings` Pengaturan (includes persisted notification toggles)

Super-admin only:
- `/operation/audit/logs` Log Audit
- `/operation/ai-config` Konfigurasi AI (Provider/Tools/Agents/Instructions)
- `/operation/users` Manajemen User

## Cross-cutting infrastructure

**Single-tenant (RC Samata Gowa)** — `branches` table dropped
2026-05-23. All queries are tenant-implicit. No branch picker, no
`?b=` URL param. Adding multi-outlet support back later = restore
`branches` table + branchId FKs across schemas.

**Date scope** — `DateScopeProvider` mounted in
`src/app/(dashboard)/layout.tsx`. URL keys:
`?p=today|7d|wtd|30d|mtd|qtd|ytd`, `?from=ms&to=ms`. Owner-facing
queries opt in via `useDateScope()`.

**Version watcher** — `VersionWatcher` polls `/api/version` every 5
min + on focus/visibility and shows a sonner toast "Versi baru
tersedia · Muat ulang" when `NEXT_PUBLIC_BUILD_ID` changes. The
`hardReload()` helper clears CacheStorage before navigating. Build
id is derived in `next.config.ts` from
`DOKPLOY_COMMIT_SHA / GITHUB_SHA / VERCEL_GIT_COMMIT_SHA / COMMIT_SHA`
(fallback dev timestamp).

**Chunk-error self-heal** — `ChunkErrorBoundary` wraps the tree;
`GlobalErrorListeners` catches async chunk failures. Both auto-reload
once (60s cooldown via sessionStorage `rcsamata:chunk-reloaded-at`).

**Service worker** — `public/sw.js` deliberately caches ONLY
PWA icons + manifest (network-only for `/_next/static/*`) so deploys
don't strand cached stale chunks. `ServiceWorkerRefresher` re-registers
+ calls `reg.update()` each boot so SW body changes propagate.

## Convex backend conventions used by these surfaces

- All queries returning rows use `.withIndex(...)` and `.take(N)` —
  no bare `.collect()` on large tables. Default caps: 5000 rows /
  52 weekly reports.
- KPI thresholds + targets live in `convex/features/reports/kpiAnalytics.ts`
  (`DEFAULT_KPIS`). 10 standard QSR KPIs seeded via
  `seedDefaultKPITargets()` from `/operation/kpi-targets`.
- Audit log helper: `convex/shared/helpers.ts#insertAuditLog` —
  call from any mutation that mutates business data, viewable at
  `/operation/audit/logs`.
- User preferences: `convex/features/auth/_schema.ts#userPreferences`
  (lazy-create on first write). Add new toggles by appending optional
  fields — no migration needed.

## New (2026-05-23) — single-tenant migration

Tables added per JSON spec adoption:
- **`pockets` + `pocketFlows`** (cash ledger): brankas/dompet PIC/rekening
  owner/etc. Every tx now should cite `pocketSourceId`. `pocketFlows`
  records transfer between pockets.
- **`staff` + HR**: separate dari `users` (login). New tables: `staff`,
  `staffSchedules`, `staffPiket`, `staffPerformance`, `tunjanganKaryawan`,
  `splLembur`.
- **`waReportDaily`/`waPositionDaily`/`waOnlineDaily`**: parse SV WA
  daily report → struktur, cross-check vs weekly xlsx (Tier 2 source).
- **`accountingPeriods`**: period close (yearMonth + status open/locked/closed).
- **`fixedAssets`** + **`glossaryTerms`** + **`inventoryTransformations`**
  + **`baReimburse`**: CapEx, term dictionary, bahan→produk, petty cash
  reimburse.

Transactions table extended:
- `pocketSourceId` (pockets), `paidByStaffId` + `receivedByStaffId` (staff)
- `sourceTier`: enum `csv_verified/wa_chat/weekly_xlsx/photo_pdf/manual`
  — data provenance hierarchy.
