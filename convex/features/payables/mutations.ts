import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { paymentMethodValidator } from "../../shared/validators";

export const create = mutation({
  args: {
    expenseId: v.id("expenses"),
    vendorId: v.id("vendors"),
    vendorName: v.string(),
    invoiceDate: v.string(),
    dueDate: v.string(),
    amount: v.number(),
    paidAmount: v.number(),
    status: v.union(v.literal("open"), v.literal("partial"), v.literal("paid"), v.literal("overdue")),
    description: v.string(),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("payables", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("payables"),
    paidAmount: v.optional(v.number()),
    status: v.optional(v.union(v.literal("open"), v.literal("partial"), v.literal("paid"), v.literal("overdue"))),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...data }) => {
    const patch: Record<string, unknown> = {};
    if (data.paidAmount !== undefined) patch.paidAmount = data.paidAmount;
    if (data.status !== undefined) patch.status = data.status;
    if (data.description !== undefined) patch.description = data.description;
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("payables") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

// ─── Payments ───────────────────────────────────────────────
export const addPayment = mutation({
  args: {
    payableId: v.id("payables"),
    paymentDate: v.string(),
    amount: v.number(),
    method: paymentMethodValidator,
    referenceNo: v.string(),
  },
  handler: async (ctx, args) => {
    const paymentId = await ctx.db.insert("payablePayments", args);
    // Update the payable's paidAmount
    const payable = await ctx.db.get(args.payableId);
    if (payable) {
      const newPaidAmount = payable.paidAmount + args.amount;
      const newStatus = newPaidAmount >= payable.amount ? "paid" as const : "partial" as const;
      await ctx.db.patch(args.payableId, { paidAmount: newPaidAmount, status: newStatus });
    }
    return paymentId;
  },
});
