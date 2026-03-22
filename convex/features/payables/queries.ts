import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

export const listByBranch = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("payables").withIndex("by_branch", (q) => q.eq("branchId", args.branchId)).order("desc").take(100);
  },
});

export const getById = query({
  args: { id: v.id("payables") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const listByVendor = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("payables").withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId)).order("desc").take(100);
  },
});

export const listPayments = query({
  args: { payableId: v.id("payables") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("payablePayments").withIndex("by_payable", (q) => q.eq("payableId", args.payableId)).take(100);
  },
});
