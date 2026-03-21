import { query } from "../../_generated/server";
import { v } from "convex/values";

export const getClosingByDate = query({
  args: { branchId: v.id("branches"), businessDate: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("dailyClosings")
      .withIndex("by_branch_date", (q) => q.eq("branchId", args.branchId).eq("businessDate", args.businessDate))
      .unique();
  },
});

export const listClosings = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db.query("dailyClosings")
      .withIndex("by_branch_date", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .take(30);
  },
});

export const listTransfers = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db.query("ownerTransfers")
      .withIndex("by_branch", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .take(50);
  },
});
