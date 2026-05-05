# @rc-samata/mcp-server

MCP server bridging Claude Code (and any MCP client) to the **RC Samata Dash** Convex self-hosted backend at `api-rcsamata.rahmanef.com`.

Project-scoped: ships in this repo, reads `.env.local` in the repo root for `NEXT_PUBLIC_CONVEX_URL` + `CONVEX_ADMIN_KEY`. Not for any other project.

## Tool surface

Read-only tools (no write-gate):

- `project_info`, `git_status`, `git_log`, `list_convex_functions` — repo metadata.
- `list_branches`, `list_vendors`, `list_income_channels`, `list_expense_categories`, `list_master_products`, `list_master_ingredients` — master data.
- `sales_by_branch`, `sales_by_status` — sales.
- `expenses_by_branch`, `payables_by_branch`, `petty_cash_by_branch`, `petty_cash_monthly_summary` — operational ledgers.
- `list_closings`, `closing_by_date` — daily closings.
- `list_inventory_items`, `list_inventory_movements` — stock.
- `list_weekly_reports`, `weekly_report`, `report_product_sales`, `report_food_cost`, `report_inventory_valuation`, `report_product_hpp`, `report_cost_analysis`, `report_daily_cash_flow` — weekly report detail.
- `report_sales_aggregate_by_branch`, `report_expenses_aggregate_by_branch`, `report_payables_aggregate_by_branch`, `report_cashflow_by_branch` — branch aggregates.
- `analytics_overview`, `kpi_dashboard`, `weekly_sales_trend`, `monthly_sales_trend`, `expense_breakdown`, `cashflow_waterfall`, `recent_transactions` — analytics/dashboard payloads.
- `ai_list_chat_sessions`, `ai_chat_messages`, `ai_config` — AI feature.
- `audit_run`, `audit_features` — invoke `~/.agents/skills/audit-bp/scripts/audit-{bp,features}.sh` against this repo.
- `convex_query` — generic escape hatch.

Write-gated tools (require both env flag + per-call `confirm:true`):

- `convex_mutation`, `convex_action`.

## Build

```bash
cd packages/mcp-server
pnpm install
pnpm build
```

## Run (manual, for debugging)

```bash
node dist/index.js
# explicit overrides:
node dist/index.js --url=https://api-rcsamata.rahmanef.com --admin-key='rc-samata-dash|...'
```

Env precedence: CLI flag → repo `.env.local` → shell env. Repo `.env.local` always wins over leaked shell env so the MCP only ever talks to **this** project's backend.

## Use with Claude Code

`.mcp.json` at the repo root registers this server automatically. Open this folder in Claude Code, accept the trust prompt, then `/mcp` lists `rc-samata`.

To enable mutations in a session:

```bash
RC_SAMATA_MCP_ALLOW_WRITE=1 claude
```

Then call `convex_mutation` with `confirm: true`.

## Convex function naming

Convex paths in this repo follow `features/<area>/<file>:<export>`, e.g. `features/masterData/queries:listBranches`. Use `list_convex_functions` to enumerate everything currently exported. Use `convex_query` for any function that doesn't have a dedicated tool.

## Known issues

- **Backend reachability** — `https://api-rcsamata.rahmanef.com` currently returns 404 on every path including `/version`. Dokploy reverse-proxy routing to the Convex backend container needs to be fixed before any Convex tool will return data. Local-only tools (`project_info`, `git_status`, `git_log`, `list_convex_functions`, `audit_run`, `audit_features`) work regardless.

## Files

- `src/index.ts` — entrypoint + MCP request handlers.
- `src/util/env.ts` — `.env.local` parser, masking helper, env precedence.
- `src/convex.ts` — `ConvexHttpClient` singleton with `setAdminAuth`.
- `src/tools/manifest.ts` — declarative tool registry (name → Convex fn).
- `src/tools/project.ts` — git + project-info helpers.
- `src/tools/audit.ts` — wraps audit-bp scripts.
