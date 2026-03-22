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
