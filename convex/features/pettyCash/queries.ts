import { query } from "../../_generated/server";
import { v } from "convex/values";

export const listByBranch = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db.query("pettyCashRequests").withIndex("by_branch", (q) => q.eq("branchId", args.branchId)).order("desc").take(100);
  },
});

export const getById = query({
  args: { id: v.id("pettyCashRequests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByStatus = query({
  args: { status: v.union(v.literal("requested"), v.literal("approved"), v.literal("rejected"), v.literal("disbursed"), v.literal("closed")) },
  handler: async (ctx, args) => {
    return await ctx.db.query("pettyCashRequests").withIndex("by_status", (q) => q.eq("status", args.status)).order("desc").take(100);
  },
});
