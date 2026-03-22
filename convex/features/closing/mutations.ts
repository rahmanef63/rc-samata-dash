import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";

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
    const userId = await requireAuth(ctx);
    const id = await ctx.db.insert("dailyClosings", args);
    await insertAuditLog(ctx, {
      entityType: "dailyClosings", entityId: id, action: "create",
      description: `Created closing ${args.businessDate} - diff Rp${args.difference}`,
      actedBy: userId, branchId: args.branchId,
    });
    return id;
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
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Closing not found");
    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) patch[key] = val;
    }
    await ctx.db.patch(id, patch);
    await insertAuditLog(ctx, {
      entityType: "dailyClosings", entityId: id, action: "update",
      description: `Updated closing ${existing.businessDate}`,
      actedBy: userId, branchId: existing.branchId,
    });
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
    const userId = await requireAuth(ctx);
    if (args.amount <= 0) throw new Error("Transfer amount must be > 0");
    const id = await ctx.db.insert("ownerTransfers", args);
    await insertAuditLog(ctx, {
      entityType: "ownerTransfers", entityId: id, action: "create",
      description: `Transfer ${args.direction} Rp${args.amount}`,
      actedBy: userId, branchId: args.branchId,
    });
    return id;
  },
});

export const removeTransfer = mutation({
  args: { id: v.id("ownerTransfers") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Transfer not found");
    await ctx.db.delete(args.id);
    await insertAuditLog(ctx, {
      entityType: "ownerTransfers", entityId: args.id, action: "delete",
      description: `Deleted transfer ${existing.transferDate} Rp${existing.amount}`,
      actedBy: userId, branchId: existing.branchId,
    });
    return null;
  },
});
