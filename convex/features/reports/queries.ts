import { query, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

function isIsoDateString(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeReportPeriod(periodStart: string, periodEnd: string) {
  const safeStart = isIsoDateString(periodStart) ? periodStart : undefined;
  const safeEnd = isIsoDateString(periodEnd) ? periodEnd : undefined;

  const normalizedStart = safeStart ?? safeEnd ?? "";
  const normalizedEnd = safeEnd ?? safeStart ?? "";

  if (normalizedStart && normalizedEnd && normalizedStart > normalizedEnd) {
    return {
      periodStart: normalizedEnd,
      periodEnd: normalizedStart,
    };
  }

  return {
    periodStart: normalizedStart,
    periodEnd: normalizedEnd,
  };
}

/** Internal: get report by ID (for actions, no auth required) */
export const getReportById = internalQuery({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    return await ctx.db.get(reportId);
  },
});

export const listWeeklyReports = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .order("desc")
      .collect();
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .collect();

    return reports.map((report) => {
      const normalizedPeriod = normalizeReportPeriod(report.periodStart, report.periodEnd);
      const storedExpenseCount = report.expenseCount ?? 0;
      const fallbackExpenseCount =
        normalizedPeriod.periodStart && normalizedPeriod.periodEnd
          ? expenses.filter(
              (expense) =>
                expense.expenseDate >= normalizedPeriod.periodStart &&
                expense.expenseDate <= normalizedPeriod.periodEnd,
            ).length
          : storedExpenseCount;

      return {
        ...report,
        periodStart: normalizedPeriod.periodStart,
        periodEnd: normalizedPeriod.periodEnd,
        expenseCount: storedExpenseCount > 0 ? storedExpenseCount : fallbackExpenseCount,
      };
    });
  },
});

export const getWeeklyReport = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db.get(reportId);
  },
});

/**
 * Cek apakah sudah ada report dengan periode yang sama (untuk validasi duplikat).
 * Dua periode dianggap duplikat jika periodStart sama.
 */
export const checkDuplicatePeriod = query({
  args: {
    branchId: v.id("branches"),
    periodStart: v.string(),
  },
  handler: async (ctx, { branchId, periodStart }) => {
    await requireAuth(ctx);
    const existing = await ctx.db
      .query("weeklyReports")
      .withIndex("by_branch_period", (q) =>
        q.eq("branchId", branchId).eq("periodStart", periodStart)
      )
      .first();
    return existing ?? null;
  },
});

export const getProductSales = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("productSales")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const getVendorPurchases = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("vendorPurchases")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const getInventoryValuation = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("inventoryValuation")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const getFoodCostSummary = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("foodCostSummary")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const getTransferItems = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("transferItems")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const getProductHPP = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("productHPP")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const getCostAnalysis = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("costAnalysis")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const getDailyCashFlow = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("dailyCashFlow")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const getEmployeeIncentives = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("employeeIncentives")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

// ─── Standalone document queries ────────────────────────────

export const listProductChanges = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("productChanges")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .order("desc")
      .collect();
  },
});

export const listEmployeeAllowances = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("employeeAllowances")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .order("desc")
      .collect();
  },
});

// ─── Finance Bridge Queries (aggregate report data by branch) ──

export const getSalesByBranch = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    // Convex returns max 8192 rows per query. Cap raw rows here so the
    // dashboard / sales drill don't crash for branches with many weeks
    // of uploaded productSales. Newest reports first; stop early once
    // we've collected ROW_CAP entries.
    const ROW_CAP = 5000;
    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .order("desc")
      .take(52);
    const all = [];
    for (const r of reports) {
      const items = await ctx.db
        .query("productSales")
        .withIndex("by_report", (q) => q.eq("reportId", r._id))
        .collect();
      all.push(...items);
      if (all.length >= ROW_CAP) break;
    }
    return all.slice(0, ROW_CAP);
  },
});

export const getExpensesByBranch = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    // LPKK data is imported into the expenses table (not a report-linked table).
    // Cap at 5000 newest rows so Convex 8192-row return cap doesn't trip.
    const items = await ctx.db
      .query("expenses")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .order("desc")
      .take(5000);
    return items.map((e) => ({
      _id: e._id,
      _creationTime: e._creationTime,
      branchId: e.branchId,
      expenseDate: e.expenseDate,
      categoryLabel: e.categoryName,
      categoryType: e.paymentSource === "petty_cash" ? "cogs" : "other",
      amount: e.amount,
      description: e.description,
    }));
  },
});

export const getPayablesByBranch = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    const ROW_CAP = 5000;
    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .order("desc")
      .take(52);
    const all = [];
    for (const r of reports) {
      const items = await ctx.db
        .query("creditPurchases")
        .withIndex("by_report", (q) => q.eq("reportId", r._id))
        .collect();
      all.push(...items);
      if (all.length >= ROW_CAP) break;
    }
    return all.slice(0, ROW_CAP);
  },
});

export const getCashFlowByBranch = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    const ROW_CAP = 5000;
    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .order("desc")
      .take(52);
    const all = [];
    for (const r of reports) {
      const items = await ctx.db
        .query("dailyCashFlow")
        .withIndex("by_report", (q) => q.eq("reportId", r._id))
        .collect();
      all.push(...items);
      if (all.length >= ROW_CAP) break;
    }
    return all
      .slice(0, ROW_CAP)
      .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
  },
});

// ─── Per-report list queries (added 2026-05-17 for /laporan/[reportId] drill) ──

export const listLeftoverItems = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("leftoverItems")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const listDailyCashSummary = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("dailyCashSummary")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const listCreditPurchases = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("creditPurchases")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const listSalesControl = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("salesControl")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});
