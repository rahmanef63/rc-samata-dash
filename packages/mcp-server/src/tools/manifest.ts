/**
 * MCP tool registry for RC Samata.
 * Each tool maps to a Convex query/mutation OR a project-info helper.
 */
export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    required?: string[];
    properties: Record<string, unknown>;
  };
  /** if set, this tool calls a Convex function with args passed through */
  convex?: { kind: "query" | "mutation" | "action"; fn: string };
  /** if true, requires write-gate */
  write?: boolean;
}

export const TOOLS: ToolSpec[] = [
  // ── project info ─────────────────────────────────────────
  {
    name: "project_info",
    description:
      "Show project metadata: name, Next/React/Convex versions, Convex URL, write-gate status.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "git_status",
    description: "Git branch, dirty flag, ahead/behind counts, changed files.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "git_log",
    description: "Recent commits (hash, date, subject).",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 20 },
      },
    },
  },
  {
    name: "list_convex_functions",
    description:
      "Static-scan convex/features/**/*.ts for exported queries/mutations/actions. Returns map of file ref → function names.",
    inputSchema: { type: "object", properties: {} },
  },

  // ── master data ──────────────────────────────────────────
  {
    name: "list_branches",
    description: "List all RC Samata branches (cabang).",
    inputSchema: { type: "object", properties: {} },
    convex: { kind: "query", fn: "features/masterData/queries:listBranches" },
  },
  {
    name: "list_vendors",
    description: "List all vendors. Optionally filter by activeOnly.",
    inputSchema: {
      type: "object",
      properties: {
        activeOnly: { type: "boolean" },
      },
    },
    convex: { kind: "query", fn: "features/masterData/queries:listVendors" },
  },
  {
    name: "list_income_channels",
    description: "List income channels (cash, gofood, grabfood, etc).",
    inputSchema: { type: "object", properties: {} },
    convex: {
      kind: "query",
      fn: "features/masterData/queries:listIncomeChannels",
    },
  },
  {
    name: "list_expense_categories",
    description: "List expense categories (cogs, utility, salary_support, etc).",
    inputSchema: { type: "object", properties: {} },
    convex: {
      kind: "query",
      fn: "features/masterData/queries:listExpenseCategories",
    },
  },
  {
    name: "list_master_products",
    description: "List master produk jadi (canonical product names).",
    inputSchema: { type: "object", properties: {} },
    convex: {
      kind: "query",
      fn: "features/masterData/queries:listMasterProducts",
    },
  },
  {
    name: "list_master_ingredients",
    description: "List master ingredients.",
    inputSchema: { type: "object", properties: {} },
    convex: {
      kind: "query",
      fn: "features/masterData/queries:listMasterIngredients",
    },
  },

  // ── sales ────────────────────────────────────────────────
  {
    name: "sales_by_branch",
    description: "Daily sales for a branch. Optional businessDate filter (YYYY-MM-DD).",
    inputSchema: {
      type: "object",
      required: ["branchId"],
      properties: {
        branchId: { type: "string", description: "branches Id" },
        businessDate: { type: "string", description: "YYYY-MM-DD" },
      },
    },
    convex: { kind: "query", fn: "features/sales/queries:listByBranch" },
  },
  {
    name: "sales_by_status",
    description:
      "Daily sales filtered by status (recorded | settled | pending_settlement).",
    inputSchema: {
      type: "object",
      required: ["status"],
      properties: {
        status: {
          type: "string",
          enum: ["recorded", "settled", "pending_settlement"],
        },
      },
    },
    convex: { kind: "query", fn: "features/sales/queries:listByStatus" },
  },

  // ── expenses / payables / petty cash ─────────────────────
  {
    name: "expenses_by_branch",
    description: "Expenses for a branch.",
    inputSchema: {
      type: "object",
      required: ["branchId"],
      properties: { branchId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/expenses/queries:listByBranch" },
  },
  {
    name: "payables_by_branch",
    description: "Payables (utang) for a branch.",
    inputSchema: {
      type: "object",
      required: ["branchId"],
      properties: { branchId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/payables/queries:listByBranch" },
  },
  {
    name: "petty_cash_by_branch",
    description: "Petty cash entries for a branch.",
    inputSchema: {
      type: "object",
      required: ["branchId"],
      properties: { branchId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/pettyCash/queries:listByBranch" },
  },
  {
    name: "petty_cash_monthly_summary",
    description: "Petty cash monthly summary for a branch.",
    inputSchema: {
      type: "object",
      required: ["branchId", "yearMonth"],
      properties: {
        branchId: { type: "string" },
        yearMonth: { type: "string", description: "YYYY-MM" },
      },
    },
    convex: { kind: "query", fn: "features/pettyCash/queries:getMonthlySummary" },
  },

  // ── closing / inventory ──────────────────────────────────
  {
    name: "list_closings",
    description: "List daily closings for a branch.",
    inputSchema: {
      type: "object",
      required: ["branchId"],
      properties: { branchId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/closing/queries:listClosings" },
  },
  {
    name: "closing_by_date",
    description: "Closing record for a branch + date.",
    inputSchema: {
      type: "object",
      required: ["branchId", "businessDate"],
      properties: {
        branchId: { type: "string" },
        businessDate: { type: "string", description: "YYYY-MM-DD" },
      },
    },
    convex: { kind: "query", fn: "features/closing/queries:getClosingByDate" },
  },
  {
    name: "list_inventory_items",
    description: "Stock items per branch.",
    inputSchema: {
      type: "object",
      required: ["branchId"],
      properties: { branchId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/inventory/queries:listItems" },
  },
  {
    name: "list_inventory_movements",
    description: "All stock movements for a branch.",
    inputSchema: {
      type: "object",
      required: ["branchId"],
      properties: { branchId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/inventory/queries:listAllMovements" },
  },

  // ── reports ──────────────────────────────────────────────
  {
    name: "list_weekly_reports",
    description: "Weekly reports for a branch.",
    inputSchema: {
      type: "object",
      required: ["branchId"],
      properties: { branchId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/reports/queries:listWeeklyReports" },
  },
  {
    name: "weekly_report",
    description: "Detail of a weekly report by id.",
    inputSchema: {
      type: "object",
      required: ["reportId"],
      properties: { reportId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/reports/queries:getWeeklyReport" },
  },
  {
    name: "report_product_sales",
    description: "Product sales rows for a weekly report.",
    inputSchema: {
      type: "object",
      required: ["reportId"],
      properties: { reportId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/reports/queries:getProductSales" },
  },
  {
    name: "report_food_cost",
    description: "Food cost summary for a weekly report.",
    inputSchema: {
      type: "object",
      required: ["reportId"],
      properties: { reportId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/reports/queries:getFoodCostSummary" },
  },
  {
    name: "report_inventory_valuation",
    description: "Inventory valuation rows for a weekly report.",
    inputSchema: {
      type: "object",
      required: ["reportId"],
      properties: { reportId: { type: "string" } },
    },
    convex: {
      kind: "query",
      fn: "features/reports/queries:getInventoryValuation",
    },
  },
  {
    name: "report_product_hpp",
    description: "Product HPP (cost) rows for a weekly report.",
    inputSchema: {
      type: "object",
      required: ["reportId"],
      properties: { reportId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/reports/queries:getProductHPP" },
  },
  {
    name: "report_cost_analysis",
    description: "Cost analysis rows for a weekly report.",
    inputSchema: {
      type: "object",
      required: ["reportId"],
      properties: { reportId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/reports/queries:getCostAnalysis" },
  },
  {
    name: "report_daily_cash_flow",
    description: "Daily cash flow rows for a weekly report.",
    inputSchema: {
      type: "object",
      required: ["reportId"],
      properties: { reportId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/reports/queries:getDailyCashFlow" },
  },
  {
    name: "report_sales_aggregate_by_branch",
    description:
      "Aggregate sales (across weekly reports) for a branch. Cross-week summary.",
    inputSchema: {
      type: "object",
      required: ["branchId"],
      properties: { branchId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/reports/queries:getSalesByBranch" },
  },
  {
    name: "report_expenses_aggregate_by_branch",
    description: "Aggregate expenses for a branch.",
    inputSchema: {
      type: "object",
      required: ["branchId"],
      properties: { branchId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/reports/queries:getExpensesByBranch" },
  },
  {
    name: "report_payables_aggregate_by_branch",
    description: "Aggregate payables for a branch.",
    inputSchema: {
      type: "object",
      required: ["branchId"],
      properties: { branchId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/reports/queries:getPayablesByBranch" },
  },
  {
    name: "report_cashflow_by_branch",
    description: "Cash-flow summary for a branch.",
    inputSchema: {
      type: "object",
      required: ["branchId"],
      properties: { branchId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/reports/queries:getCashFlowByBranch" },
  },

  // ── analytics / dashboard ───────────────────────────────
  {
    name: "analytics_overview",
    description: "High-level analytics overview (KPIs).",
    inputSchema: { type: "object", properties: {} },
    convex: {
      kind: "query",
      fn: "features/reports/analytics:getAnalyticsOverview",
    },
  },
  {
    name: "kpi_dashboard",
    description: "KPI dashboard payload (targets vs actuals).",
    inputSchema: { type: "object", properties: {} },
    convex: {
      kind: "query",
      fn: "features/reports/kpiAnalytics:getKPIDashboard",
    },
  },
  {
    name: "weekly_sales_trend",
    description: "Weekly sales trend chart payload.",
    inputSchema: { type: "object", properties: {} },
    convex: {
      kind: "query",
      fn: "features/reports/dashboardQueries:getWeeklySalesTrend",
    },
  },
  {
    name: "monthly_sales_trend",
    description: "Monthly sales trend chart payload.",
    inputSchema: { type: "object", properties: {} },
    convex: {
      kind: "query",
      fn: "features/reports/dashboardQueries:getMonthlySalesTrend",
    },
  },
  {
    name: "expense_breakdown",
    description: "Expense breakdown chart payload.",
    inputSchema: { type: "object", properties: {} },
    convex: {
      kind: "query",
      fn: "features/reports/dashboardQueries:getExpenseBreakdown",
    },
  },
  {
    name: "cashflow_waterfall",
    description: "Cashflow waterfall chart payload.",
    inputSchema: { type: "object", properties: {} },
    convex: {
      kind: "query",
      fn: "features/reports/dashboardQueries:getCashflowWaterfall",
    },
  },
  {
    name: "recent_transactions",
    description: "Recent transactions across all features (dashboard list).",
    inputSchema: { type: "object", properties: {} },
    convex: {
      kind: "query",
      fn: "features/reports/dashboardQueries:getRecentTransactions",
    },
  },

  // ── ai ──────────────────────────────────────────────────
  {
    name: "ai_list_chat_sessions",
    description: "List AI chat sessions.",
    inputSchema: { type: "object", properties: {} },
    convex: { kind: "query", fn: "features/ai/queries:listChatSessions" },
  },
  {
    name: "ai_chat_messages",
    description: "Messages for an AI chat session.",
    inputSchema: {
      type: "object",
      required: ["sessionId"],
      properties: { sessionId: { type: "string" } },
    },
    convex: { kind: "query", fn: "features/ai/queries:getChatMessages" },
  },
  {
    name: "ai_config",
    description: "Active AI config + provider.",
    inputSchema: { type: "object", properties: {} },
    convex: { kind: "query", fn: "features/ai/queries:getAiConfig" },
  },

  // ── audit ────────────────────────────────────────────────
  {
    name: "audit_run",
    description:
      "Run audit-bp.sh against this repo and return KPI JSON (raw_anchor, legacy_middleware, convex_public_no_validator, etc).",
    inputSchema: {
      type: "object",
      properties: {
        scope: { type: "string", enum: ["changed", "full"], default: "changed" },
      },
    },
  },
  {
    name: "audit_features",
    description:
      "Run audit-features.sh and return per-feature scores + findings.",
    inputSchema: { type: "object", properties: {} },
  },

  // ── escape hatches ───────────────────────────────────────
  {
    name: "convex_query",
    description:
      "Generic Convex query escape hatch. Pass full function path (e.g. 'features/sales/queries:listByBranch').",
    inputSchema: {
      type: "object",
      required: ["fn"],
      properties: {
        fn: { type: "string" },
        args: { type: "object" },
      },
    },
  },
  {
    name: "convex_mutation",
    description:
      "Generic Convex mutation. Write-gated: requires RC_SAMATA_MCP_ALLOW_WRITE=1 AND confirm:true.",
    inputSchema: {
      type: "object",
      required: ["fn", "confirm"],
      properties: {
        fn: { type: "string" },
        args: { type: "object" },
        confirm: { type: "boolean" },
      },
    },
    write: true,
  },
  {
    name: "convex_action",
    description:
      "Generic Convex action. Write-gated: requires RC_SAMATA_MCP_ALLOW_WRITE=1 AND confirm:true.",
    inputSchema: {
      type: "object",
      required: ["fn", "confirm"],
      properties: {
        fn: { type: "string" },
        args: { type: "object" },
        confirm: { type: "boolean" },
      },
    },
    write: true,
  },
];
