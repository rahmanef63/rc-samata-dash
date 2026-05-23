import { query, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

export const listByBranch = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("pettyCashRequests").order("desc").take(100);
  },
});

export const getById = query({
  args: { id: v.id("pettyCashRequests") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const listByStatus = query({
  args: { status: v.union(v.literal("requested"), v.literal("approved"), v.literal("rejected"), v.literal("disbursed"), v.literal("closed")) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("pettyCashRequests").withIndex("by_status", (q) => q.eq("status", args.status)).order("desc").take(100);
  },
});

export const getMonthlySummary = query({
  args: {
    yearMonth: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const records = await ctx.db
      .query("pettyCashRequests")
      .collect();

    const filtered = records.filter((r) => r.requestDate.startsWith(args.yearMonth));
    const totalRequested = filtered.reduce((sum, r) => sum + r.requestedAmount, 0);
    const totalApproved = filtered.reduce((sum, r) => sum + r.approvedAmount, 0);
    const totalActual = filtered.reduce((sum, r) => sum + r.actualAmount, 0);
    const byStatus = filtered.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + r.requestedAmount;
      return acc;
    }, {});

    return {
      yearMonth: args.yearMonth,
      count: filtered.length,
      totalRequested,
      totalApproved,
      totalActual,
      byStatus,
      records: filtered.slice(0, 10),
    };
  },
});

export const getMonthlySummaryInternal = internalQuery({
  args: {
    yearMonth: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const records = await ctx.db
      .query("pettyCashRequests")
      .collect();

    const filtered = records.filter((r) => r.requestDate.startsWith(args.yearMonth));
    const totalRequested = filtered.reduce((sum, r) => sum + r.requestedAmount, 0);
    const totalApproved = filtered.reduce((sum, r) => sum + r.approvedAmount, 0);
    const totalActual = filtered.reduce((sum, r) => sum + r.actualAmount, 0);
    const byStatus = filtered.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + r.requestedAmount;
      return acc;
    }, {});

    return {
      yearMonth: args.yearMonth,
      count: filtered.length,
      totalRequested,
      totalApproved,
      totalActual,
      byStatus,
      records: filtered.slice(0, 10),
    };
  },
});
