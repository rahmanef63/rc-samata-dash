import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

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
