import { query } from "../../_generated/server";
import { v } from "convex/values";

export const listByBranch = query({
  args: { branchId: v.id("branches"), businessDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let q = ctx.db.query("dailySales").withIndex("by_branch_date", (q) => q.eq("branchId", args.branchId));
    if (args.businessDate) {
      q = ctx.db.query("dailySales").withIndex("by_branch_date", (q) =>
        q.eq("branchId", args.branchId).eq("businessDate", args.businessDate!)
      );
    }
    return await q.order("desc").take(100);
  },
});

export const getById = query({
  args: { id: v.id("dailySales") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByStatus = query({
  args: { status: v.union(v.literal("recorded"), v.literal("settled"), v.literal("pending_settlement")) },
  handler: async (ctx, args) => {
    return await ctx.db.query("dailySales").withIndex("by_status", (q) => q.eq("status", args.status)).order("desc").take(100);
  },
});
