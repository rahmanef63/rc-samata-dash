import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

export const listByBranch = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("expenses").withIndex("by_branch_date", (q) => q.eq("branchId", args.branchId)).order("desc").take(100);
  },
});

export const getById = query({
  args: { id: v.id("expenses") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const listLineItems = query({
  args: { expenseId: v.id("expenses") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("expenseLineItems").withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId)).take(100);
  },
});

export const listByStatus = query({
  args: { status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("approved"), v.literal("paid"), v.literal("rejected")) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("expenses").withIndex("by_status", (q) => q.eq("status", args.status)).order("desc").take(100);
  },
});
