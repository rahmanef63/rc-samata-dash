import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const createClosing = mutation({
  args: {
    businessDate: v.string(),
    openingCash: v.number(),
    cashSales: v.number(),
    nonCashSales: v.number(),
    expensesPaidCash: v.number(),
    expectedCash: v.number(),
    actualCash: v.number(),
    difference: v.number(),
    status: v.union(v.literal("open"), v.literal("submitted"), v.literal("verified")),
    submittedBy: v.string(),
    submittedAt: v.string(),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("dailyClosings", args);
  },
});

export const updateClosing = mutation({
  args: {
    id: v.id("dailyClosings"),
    actualCash: v.optional(v.number()),
    difference: v.optional(v.number()),
    status: v.optional(v.union(v.literal("open"), v.literal("submitted"), v.literal("verified"))),
  },
  handler: async (ctx, { id, ...data }) => {
    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) patch[key] = val;
    }
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const createTransfer = mutation({
  args: {
    closingId: v.optional(v.id("dailyClosings")),
    transferDate: v.string(),
    direction: v.union(v.literal("branch_to_owner"), v.literal("owner_to_branch")),
    purpose: v.union(v.literal("night_transfer"), v.literal("petty_cash_topup"), v.literal("payable_payment_fund"), v.literal("adjustment")),
    amount: v.number(),
    referenceNo: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed")),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ownerTransfers", args);
  },
});

export const removeTransfer = mutation({
  args: { id: v.id("ownerTransfers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});
