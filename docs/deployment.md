# RC Samata Dashboard — Deployment Guide

## Prerequisites

- Dokploy server with Docker and Docker Compose
- Domain pointed to Dokploy
- Git repository connected to Dokploy

## Infrastructure

| Service | Domain | Type |
|---------|--------|------|
| Next.js Frontend | `rcsamata.rahmanef.com` | Docker |
| Convex Backend API | `api-rcsamata.rahmanef.com` | Docker Compose |
| Convex Site (HTTP) | `site-rcsamata.rahmanef.com` | Docker Compose |

## Environment Variables

### Frontend

```bash
NEXT_PUBLIC_CONVEX_URL=https://api-rcsamata.rahmanef.com
NEXT_PUBLIC_SITE_URL=https://rcsamata.rahmanef.com
```

### Convex Backend

```bash
JWT_PRIVATE_KEY=<RSA private key PEM>
JWKS=<JSON Web Key Set>
CONVEX_SITE_ORIGIN=https://site-rcsamata.rahmanef.com
CONVEX_CLOUD_ORIGIN=https://api-rcsamata.rahmanef.com
```

On self-hosted Convex, `CONVEX_SITE_ORIGIN` and `CONVEX_CLOUD_ORIGIN` are exposed to the auth library as `CONVEX_SITE_URL` and `CONVEX_CLOUD_URL`.

### AI Provider Config

These are configured in-app, not as frontend env vars:

- Settings → AI Provider
- Active provider (`openai` or `openrouter`)
- API key
- Base URL if needed
- Chat model

## Generate JWT Keys

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

## Frontend Build Notes

The frontend is built from the repo `Dockerfile`.

The repository now includes `.dockerignore` to keep the Docker build context clean. That excludes:

- `.env*`
- `_data/`
- `node_modules/`
- `.next/`
- other local build/debug artifacts

This matters because the repo can contain local business files and development-only env values that should never be sent into the image build context.

## Deploying Frontend

```bash
docker build -t rc-samata-dash .

docker run -p 3000:3000 \
  -e NEXT_PUBLIC_CONVEX_URL=https://api-rcsamata.rahmanef.com \
  rc-samata-dash
```

### Dokploy Setup

1. Create a new application.
2. Connect the Git repository.
3. Use `Dockerfile` as the build type.
4. Add frontend env vars.
5. Set the app domain.
6. Enable HTTPS.
7. Deploy.

## Deploying Convex Backend

1. Create a new compose service in Dokploy.
2. Use the existing `docker-compose.yml`.
3. Set:
   - `JWT_PRIVATE_KEY`
   - `JWKS`
   - `CONVEX_SITE_ORIGIN`
   - `CONVEX_CLOUD_ORIGIN`
4. Attach API and Site domains.
5. Deploy.

## Post-Deploy Checks

1. Visit the site root and confirm the landing page loads.
2. Sign in and confirm dashboard routes render.
3. Confirm `https://api-rcsamata.rahmanef.com` responds.
4. Confirm `https://site-rcsamata.rahmanef.com/.well-known/jwks.json` returns keys.
5. Upload a report and verify import succeeds.
6. Open `/chat` after signing in and confirm sessions load only for the current user.
7. Check `sitemap.xml` only exposes public pages.

## Updating

```bash
git push origin main
```

If Dokploy auto-deploy is enabled, that push should trigger a deployment automatically.

## Rollback

1. Open Dokploy.
2. Go to the application deployment history.
3. Select the last known-good deployment.
4. Redeploy it.
