# Seed canonical accounts

Two accounts are managed by `_internal/seedUsers:seedAdminAndOwner`:

| Email | Password | Role |
|---|---|---|
| `rahmanef63@gmail.com` | `namam787898` | `super_admin` |
| `owner@mail.com` | `owner567` | `owner` |

The action is **idempotent** — re-running rotates the password and re-asserts the role. Run any time the credentials drift.

## Run

Requires `.env.local` with `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_ADMIN_KEY`.

### Option A — npm script (uses `npx tsx`)

```bash
pnpm seed:users
```

### Option B — direct via Convex CLI

```bash
npx convex run _internal/seedUsers:seedAdminAndOwner \
  --url="$NEXT_PUBLIC_CONVEX_URL" \
  --admin-key="$CONVEX_ADMIN_KEY"
```

### Option C — via the MCP server

```
convex_action fn="_internal/seedUsers:seedAdminAndOwner" args={} confirm=true
```

(requires `RC_SAMATA_MCP_ALLOW_WRITE=1` in the MCP env.)

## Expected output

```json
[
  { "email": "rahmanef63@gmail.com", "status": "created|password_rotated", "userId": "...", "role": "super_admin" },
  { "email": "owner@mail.com",       "status": "created|password_rotated", "userId": "...", "role": "owner" }
]
```

## Role enforcement

- `super_admin`, `staff` — full dashboard access (status quo).
- `owner` — frontend `RoleGuard` (`src/components/auth/RoleGuard.tsx`) restricts navigation to:
  - `/` (dashboard charts)
  - `/chat` (AI interactive)
  - `/laporan` (report viewer)
  - `/finance` (chart-heavy finance views)
  - `/profile`

  Anything else redirects to `/`. Adjust the allowlist in `RoleGuard.tsx` if the owner needs additional read-only views.

## Notes

- The action uses `createAccount` / `modifyAccountCredentials` from `@convex-dev/auth/server`, so passwords are hashed by the Password provider configured in `convex/auth.ts` (PBKDF2-SHA256, 10k iterations).
- Roles live in the `userRoles` table (separate from `authTables.users`) — re-running the seed never touches authTables shape, only `userRoles` rows.
- If you need to revoke, delete the `userRoles` row for that user — they fall back to `staff` (full access). For full revocation, also delete the `users` + `authAccounts` row.
