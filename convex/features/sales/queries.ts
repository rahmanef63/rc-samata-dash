import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

export const listByBranch = query({
  args: { businessDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (args.businessDate) {
      return await ctx.db
        .query("dailySales")
        .withIndex("by_date", (q) => q.eq("businessDate", args.businessDate!))
        .order("desc")
        .take(100);
    }
    return await ctx.db.query("dailySales").withIndex("by_date").order("desc").take(100);
  },
});

export const getById = query({
  args: { id: v.id("dailySales") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const listByStatus = query({
  args: { status: v.union(v.literal("recorded"), v.literal("settled"), v.literal("pending_settlement")) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("dailySales").withIndex("by_status", (q) => q.eq("status", args.status)).order("desc").take(100);
  },
});
