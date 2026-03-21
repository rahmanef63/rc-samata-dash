import { query } from "../../_generated/server";
import { v } from "convex/values";

export const listItems = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db.query("stockItems").withIndex("by_branch", (q) => q.eq("branchId", args.branchId)).take(200);
  },
});

export const getItem = query({
  args: { id: v.id("stockItems") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listMovements = query({
  args: { branchId: v.id("branches"), itemId: v.id("stockItems") },
  handler: async (ctx, args) => {
    return await ctx.db.query("stockMovements")
      .withIndex("by_branch_item", (q) => q.eq("branchId", args.branchId).eq("itemId", args.itemId))
      .order("desc")
      .take(100);
  },
});
