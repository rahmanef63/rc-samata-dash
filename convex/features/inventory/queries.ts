import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

export const listItems = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("stockItems").withIndex("by_branch", (q) => q.eq("branchId", args.branchId)).take(200);
  },
});

export const getItem = query({
  args: { id: v.id("stockItems") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const listMovements = query({
  args: { branchId: v.id("branches"), itemId: v.id("stockItems") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("stockMovements")
      .withIndex("by_branch_item", (q) => q.eq("branchId", args.branchId).eq("itemId", args.itemId))
      .order("desc")
      .take(100);
  },
});

export const listAllMovements = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("stockMovements")
      .withIndex("by_branch_item", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .take(200);
  },
});
