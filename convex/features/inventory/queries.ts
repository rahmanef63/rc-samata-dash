import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

export const listItems = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("stockItems").take(200);
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
  args: { itemId: v.id("stockItems") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("stockMovements")
      .withIndex("by_item_date", (q) => q.eq("itemId", args.itemId))
      .order("desc")
      .take(100);
  },
});

export const listAllMovements = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("stockMovements")
      .order("desc")
      .take(200);
  },
});
