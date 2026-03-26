# RC Samata Dashboard — Deployment Guide

## Prerequisites

- Dokploy server with Docker & Docker Compose
- Domain pointed to Dokploy (e.g., `rcsamata.rahmanef.com`)
- Git repository (GitHub)

## Infrastructure

| Service | Domain | Type |
|---------|--------|------|
| Next.js Frontend | `rcsamata.rahmanef.com` | Docker (standalone) |
| Convex Backend API | `api-rcsamata.rahmanef.com` | Docker Compose |
| Convex Site (HTTP) | `site-rcsamata.rahmanef.com` | Docker Compose |

## Environment Variables

### Frontend (.env.local / Dokploy env)

```bash
NEXT_PUBLIC_CONVEX_URL=https://api-rcsamata.rahmanef.com
NEXT_PUBLIC_SITE_URL=https://rcsamata.rahmanef.com
```

### Convex Backend (Dokploy → Convex service → Environment)

```bash
# Required for auth
JWT_PRIVATE_KEY=<RSA private key PEM>
JWKS=<JSON Web Key Set>

# Set in docker-compose
CONVEX_SITE_ORIGIN=https://site-rcsamata.rahmanef.com
CONVEX_CLOUD_ORIGIN=https://api-rcsamata.rahmanef.com
```

### AI Provider Config

These are **not** environment variables. Set them in the app:

- Settings → AI Provider
- Provider: `openrouter` or `openai`
- API key
- Chat model
- Base URL if custom endpoint is used
- Embedding model is configured in code and defaults automatically

### Generate JWT Keys

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

## Deploying Frontend

### Dockerfile (already in repo)

The Next.js app is built with `output: "standalone"` and deployed as a Docker container.

```bash
# Build
docker build -t rc-samata-dash .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_CONVEX_URL=https://api-rcsamata.rahmanef.com \
  rc-samata-dash
```

### Dokploy Setup

1. Create new Application in Dokploy
2. Connect GitHub repository
3. Set build type: Dockerfile
4. Add environment variable: `NEXT_PUBLIC_CONVEX_URL`
5. Set domain: `rcsamata.rahmanef.com`
6. Enable HTTPS (Let's Encrypt)
7. Deploy

## Deploying Convex Backend

Convex self-hosted runs via Docker Compose on Dokploy.

1. Create new Compose service in Dokploy
2. Use the existing docker-compose.yml
3. Set environment variables:
   - `JWT_PRIVATE_KEY`
   - `JWKS`
   - `CONVEX_SITE_ORIGIN`
   - `CONVEX_CLOUD_ORIGIN`
4. Set domains for API and Site endpoints
5. Deploy

## Post-Deploy Checks

1. **Health check**: Visit `https://rcsamata.rahmanef.com` — should show landing or login
2. **Auth check**: Sign in with test credentials
3. **API check**: `https://api-rcsamata.rahmanef.com` should respond
4. **JWKS check**: `https://site-rcsamata.rahmanef.com/.well-known/jwks.json` should return keys
5. **PWA check**: Open DevTools → Application → Service Worker should be registered
6. **PWA install**: On mobile Chrome, "Add to Home Screen" should work

## Updating

```bash
git push origin main
# Dokploy auto-deploys on push (if configured)
# Or manually trigger deploy from Dokploy dashboard
```

## Rollback

1. Go to Dokploy → Application → Deployments
2. Select previous successful deployment
3. Click "Redeploy"
