import { query, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

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
    return await ctx.db
      .query("weeklyReports")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .order("desc")
      .collect();
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
    const reports = await ctx.db.query("weeklyReports").withIndex("by_branch", (q) => q.eq("branchId", branchId)).collect();
    const all = [];
    for (const r of reports) {
      const items = await ctx.db.query("productSales").withIndex("by_report", (q) => q.eq("reportId", r._id)).collect();
      all.push(...items);
    }
    return all;
  },
});

export const getExpensesByBranch = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    const reports = await ctx.db.query("weeklyReports").withIndex("by_branch", (q) => q.eq("branchId", branchId)).collect();
    const all = [];
    for (const r of reports) {
      const items = await ctx.db.query("lpkkExpenses").withIndex("by_report", (q) => q.eq("reportId", r._id)).collect();
      all.push(...items);
    }
    return all;
  },
});

export const getPayablesByBranch = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    const reports = await ctx.db.query("weeklyReports").withIndex("by_branch", (q) => q.eq("branchId", branchId)).collect();
    const all = [];
    for (const r of reports) {
      const items = await ctx.db.query("creditPurchases").withIndex("by_report", (q) => q.eq("reportId", r._id)).collect();
      all.push(...items);
    }
    return all;
  },
});

export const getCashFlowByBranch = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    const reports = await ctx.db.query("weeklyReports").withIndex("by_branch", (q) => q.eq("branchId", branchId)).collect();
    const all = [];
    for (const r of reports) {
      const items = await ctx.db.query("dailyCashFlow").withIndex("by_report", (q) => q.eq("reportId", r._id)).collect();
      all.push(...items);
    }
    return all.sort((a, b) => b.businessDate.localeCompare(a.businessDate));
  },
});

