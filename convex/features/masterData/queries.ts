import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

export const listBranches = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("branches").take(50);
  },
});

export const getBranch = query({
  args: { id: v.id("branches") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const listVendors = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (args.activeOnly) {
      return await ctx.db.query("vendors").withIndex("by_active", (q) => q.eq("isActive", true)).take(100);
    }
    return await ctx.db.query("vendors").take(100);
  },
});

export const getVendor = query({
  args: { id: v.id("vendors") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const listIncomeChannels = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("incomeChannels").take(50);
  },
});

export const listExpenseCategories = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("expenseCategories").take(50);
  },
});
