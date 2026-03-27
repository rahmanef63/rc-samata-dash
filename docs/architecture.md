# RC Samata Dashboard — Architecture

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 16.2.1 |
| UI | Tailwind CSS v4 + shadcn/ui + Framer Motion | - |
| Backend | Convex (self-hosted on Dokploy) | 1.34+ |
| Auth | `@convex-dev/auth` (Password provider) | 0.0.91 |
| Package Manager | pnpm | - |
| Deployment | Docker on Dokploy | - |

## High-Level Shape

This app is centered on report ingestion. Weekly Excel files are parsed in the browser, validated, and imported into Convex tables. Dashboard, finance, analytics, and AI features all read from that imported data plus a smaller set of manual operational records.

The codebase is split vertically:

- `src/features/*` for frontend feature slices
- `convex/features/*` for backend feature slices

That keeps data shape, UI, and business logic grouped by domain instead of by framework layer alone.

## Directory Structure

```text
rc-samata-dash/
├── convex/
│   ├── _generated/              # Generated Convex types and API bindings
│   ├── features/
│   │   ├── ai/                  # AI config, chat, indexing, actions
│   │   ├── audit/
│   │   ├── closing/
│   │   ├── expenses/
│   │   ├── inventory/
│   │   ├── masterData/
│   │   ├── payables/
│   │   ├── pettyCash/
│   │   ├── reports/
│   │   └── sales/
│   ├── shared/                  # Shared auth and helper utilities
│   ├── auth.ts                  # Convex auth configuration
│   ├── auth.config.ts           # OpenID/auth config
│   ├── http.ts                  # HTTP router
│   └── schema.ts                # Merged schema
├── docs/
├── src/
│   ├── app/
│   │   ├── (dashboard)/         # Dashboard routes guarded client-side
│   │   ├── landing/             # Public landing page
│   │   ├── login/               # Login/signup page
│   │   ├── ConvexClientProvider.tsx
│   │   └── sitemap.ts           # Public sitemap entries only
│   ├── components/
│   │   ├── auth/                # AuthGuard
│   │   ├── layout/              # Layout shell and navigation
│   │   └── ui/                  # Reusable UI components
│   ├── features/
│   │   ├── analytics/
│   │   ├── chat/
│   │   ├── dashboard/
│   │   ├── expenses/
│   │   ├── payables/
│   │   ├── petty-cash/
│   │   ├── report/
│   │   ├── report-upload/
│   │   └── sales/
│   ├── shared/
│   └── proxy.ts                 # Next.js 16 proxy for security headers
├── .dockerignore                # Excludes env files, data dumps, build artifacts
└── Dockerfile
```

## Convex Feature Pattern

Most feature folders in `convex/features/` follow:

```text
features/<name>/
├── _schema.ts
├── mutations.ts
└── queries.ts
```

Some features add extra modules when needed:

- `actions.ts` for provider-backed or long-running work
- `indexing.ts` for report embedding/index pipelines
- `analytics.ts` or other helpers for aggregate/report-specific logic

## Data Flow

```text
Excel File (.xlsx)
    ↓ client-side parsing
Parsed arrays
    ↓ validation and user review
Edited import payload
    ↓ Convex mutations in batches
Weekly report + normalized row tables
    ↓ aggregate queries
Dashboard / Finance / Analytics UI
    ↓ optional indexing
AI retrieval + chat
```

## Authentication Flow

```text
User → /login
    ↓ signIn("password", ...)
    ↓ Convex auth action
    ↓ JWT signed on self-hosted Convex
    ↓ token held in browser session
Client-side AuthGuard checks auth state
    ↓ protected dashboard routes render
Sensitive Convex functions call requireAuth(ctx)
```

Important implementation detail:

- Route gating is client-side because auth tokens are managed in the browser.
- Because of that, protected pages should avoid unauthenticated server preloads of sensitive data.
- `ConvexClientProvider` routes `auth:` actions over HTTP to avoid Dokploy/WebSocket disconnect issues during auth flows.

## AI Architecture

The AI feature has four main parts:

- Provider/config storage
- Chat sessions and messages
- Report indexing and embeddings
- Chat completion action

Current security model:

- AI queries, mutations, actions, and indexing require authentication
- Chat sessions are stored with `userId`
- Session listing and message reads are filtered by current user ownership

## Security Model

- `src/proxy.ts` adds security headers and marks internal API routes `noindex`
- `AuthGuard` redirects unauthenticated users to `/landing`
- Sensitive Convex surfaces use `requireAuth(ctx)` instead of relying on UI-only checks
- `/chat` loads AI state client-side to avoid server-side preload exposure
- `src/app/sitemap.ts` only publishes public routes
- `.dockerignore` excludes `.env*`, `_data`, `node_modules`, `.next`, and other non-runtime files from Docker build context

## Database Notes

The main business data comes from report ingestion tables such as:

- `weeklyReports`
- `productSales`
- `expenses`
- `vendorPurchases`
- `creditPurchases`
- `dailyCashSummary`
- `dailyCashFlow`
- `foodCostSummary`
- `employeeIncentives`

Manual operational workflows write to tables such as:

- `dailySales`
- `payables`
- `pettyCashRequests`
- `branches`
- `vendors`
- `incomeChannels`
- `expenseCategories`

AI stores its own configuration and chat tables under `convex/features/ai`.
