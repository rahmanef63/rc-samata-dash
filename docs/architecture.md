# RC Samata Dashboard — Architecture

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 16.2.1 |
| UI | Tailwind CSS v4 + shadcn/ui + Framer Motion | - |
| Backend | Convex (self-hosted on Dokploy) | 1.34+ |
| Auth | @convex-dev/auth (Password provider) | 0.0.91 |
| Package Manager | pnpm | - |
| Deployment | Docker (standalone) on Dokploy | - |

## Directory Structure

```
rc-samata-dash/
├── convex/                      # Convex backend
│   ├── _generated/              # Auto-generated types & API
│   ├── features/                # Feature modules
│   │   ├── audit/               # Audit tables & functions
│   │   ├── closing/             # Closing & setoran
│   │   ├── expenses/            # Expense tracking
│   │   ├── inventory/           # Inventory management
│   │   ├── masterData/          # Branches, master products, ingredients
│   │   ├── payables/            # Vendor payables
│   │   ├── pettyCash/           # Petty cash requests
│   │   ├── reports/             # Weekly reports, analytics, dashboard queries
│   │   └── sales/               # Sales data
│   ├── shared/                  # Shared helpers, auth, validators
│   ├── auth.ts                  # Auth config
│   ├── http.ts                  # HTTP routes
│   └── schema.ts                # Database schema (imports from features)
├── docs/                        # Documentation
├── public/                      # Static assets, PWA files
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (dashboard)/         # Protected routes (AuthGuard)
│   │   │   ├── layout.tsx       # DashboardLayout + AuthGuard
│   │   │   ├── loading.tsx      # Loading state
│   │   │   ├── error.tsx        # Error boundary
│   │   │   ├── page.tsx         # Dashboard (/)
│   │   │   ├── finance/         # Finance routes
│   │   │   ├── laporan/         # Report upload + analytics
│   │   │   │   ├── upload/      # NEW LAP weekly report upload
│   │   │   │   ├── upload-pergantian/  # Pergantian produk upload
│   │   │   │   └── upload-tunjangan/  # Tunjangan khusus upload
│   │   │   ├── operation/       # Operations routes
│   │   │   ├── report/          # Report overview
│   │   │   └── chat/            # AI chat
│   │   ├── landing/             # Public landing page
│   │   ├── login/               # Login/signup page
│   │   ├── layout.tsx           # Root layout (metadata, PWA, ConvexProvider)
│   │   ├── not-found.tsx        # Custom 404
│   │   └── sitemap.ts           # Dynamic sitemap
│   ├── components/
│   │   ├── auth/                # AuthGuard
│   │   ├── layout/              # AppSidebar, TopHeader, BottomNav, DashboardLayout
│   │   └── ui/                  # shadcn/ui components + TagSelect
│   ├── config/
│   │   └── routes.ts            # Route definitions
│   ├── features/
│   │   ├── analytics/           # AnalyticsPage, ReportDataBrowser
│   │   ├── dashboard/           # Dashboard components (KPI, charts, etc.)
│   │   ├── report/              # Report overview
│   │   └── report-upload/       # Excel parsers, validators, ImportPreview
│   ├── hooks/                   # Custom hooks
│   ├── shared/                  # Shared utilities, constants
│   └── middleware.ts             # Security headers middleware
└── next.config.ts               # Next.js config
```

## Feature Module Pattern (Convex)

Each feature in `convex/features/` follows this structure:

```
features/<name>/
├── _schema.ts       # Table definitions (defineTable)
├── mutations.ts     # Write operations (mutation, internalMutation)
└── queries.ts       # Read operations (query, internalQuery)
```

The root `convex/schema.ts` imports and merges all `_schema.ts` files.

## Data Flow

```
Excel File (.xlsx)
    ↓ [Client: parse with xlsx library]
ParsedData (15 arrays)
    ↓ [Client: validateParsedData()]
ValidationWarnings
    ↓ [Client: user edits tags in ImportPreview]
    ↓ [Client: ImportPreview → TagSelect dropdowns]
EditedData
    ↓ [Client → Convex: batch mutations in chunks of 50]
    ↓ [createWeeklyReport → importBatch × N → finalizeReport]
Convex Database (14 tables)
    ↓ [Convex: dashboard queries aggregate across reports]
Dashboard Charts / Analytics / Data Browser
```

## Authentication Flow

```
User → /login (or AuthGuard redirect)
    ↓ useAuthActions().signIn("password", {email, password})
    ↓ Convex action: auth:signIn
    ↓ Password provider authorize()
    ↓ JWT signed with JWT_PRIVATE_KEY (RS256)
    ↓ Token returned to client
Client stores token → ConvexReactClient authenticated
    ↓ All subsequent queries/mutations include auth token
    ↓ requireAuth(ctx) validates on each request
```

## Database Tables

### Core Tables
| Table | Description | Key Indexes |
|-------|-----------|------------|
| weeklyReports | Uploaded report metadata | by_branch, by_branch_period |
| productSales | Product sales per day/channel | by_report, by_branch_date |
| expenses | Petty cash expenses (LPKK) | by_report, by_branch_date |
| vendorPurchases | Vendor stock purchases | by_report |
| inventoryValuation | Weekly food cost inventory | by_report |
| leftoverItems | Daily leftover waste | by_report |
| dailyCashSummary | Daily cash summary | by_report, by_branch_date |
| dailyCashFlow | Daily cash flow | by_report, by_branch_date |
| salesControl | Daily sales targets | by_report |
| creditPurchases | Credit purchases | by_report |
| foodCostSummary | FC summary per category | by_report, by_branch_period |
| transferItems | Transfer TO/TI | by_report |
| productHPP | HPP per product | by_report |
| costAnalysis | Cost analysis per item | by_report |
| employeeIncentives | Employee incentives | by_report, by_branch_period |
| productChanges | Pergantian produk/bahan expired | by_branch, by_branch_period |
| employeeAllowances | Tunjangan khusus karyawan | by_branch, by_employee |

### Master Data Tables
| Table | Description |
|-------|-----------|
| branches | Branch info (name, code, address) |
| masterProducts | Product registry (PRD-001) with aliases |
| masterIngredients | Ingredient registry (ING-001) with aliases |

### Auth Tables
Managed by `@convex-dev/auth` — users, sessions, accounts, etc.

## Security

- **Middleware**: Security headers (HSTS, X-Frame-Options, CSP, etc.)
- **Auth**: JWT RS256 tokens via `@convex-dev/auth`
- **Query protection**: Every Convex query/mutation calls `requireAuth(ctx)`
- **Next.js**: `poweredByHeader: false`, standalone output
- **PWA**: Service worker with network-first for navigation, cache-first for static
