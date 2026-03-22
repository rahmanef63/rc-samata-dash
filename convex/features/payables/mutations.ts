import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { paymentMethodValidator } from "../../shared/validators";
import { requireAuth } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";

export const create = mutation({
  args: {
    expenseId: v.optional(v.id("expenses")),
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
    const userId = await requireAuth(ctx);
    if (args.amount <= 0) throw new Error("amount must be > 0");
    if (args.paidAmount < 0) throw new Error("paidAmount must be >= 0");
    const id = await ctx.db.insert("payables", args);
    await insertAuditLog(ctx, {
      entityType: "payables", entityId: id, action: "create",
      description: `Created payable ${args.vendorName} - Rp${args.amount}`,
      actedBy: userId, branchId: args.branchId,
    });
    return id;
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
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Record not found");
    const patch: Record<string, unknown> = {};
    if (data.paidAmount !== undefined) patch.paidAmount = data.paidAmount;
    if (data.status !== undefined) patch.status = data.status;
    if (data.description !== undefined) patch.description = data.description;
    await ctx.db.patch(id, patch);
    await insertAuditLog(ctx, {
      entityType: "payables", entityId: id, action: "update",
      description: `Updated payable ${existing.vendorName}`,
      actedBy: userId, branchId: existing.branchId,
    });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("payables") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Record not found");
    // Cascade delete payments
    const payments = await ctx.db
      .query("payablePayments")
      .withIndex("by_payable", (q) => q.eq("payableId", args.id))
      .collect();
    for (const p of payments) {
      await ctx.db.delete(p._id);
    }
    await ctx.db.delete(args.id);
    await insertAuditLog(ctx, {
      entityType: "payables", entityId: args.id, action: "delete",
      description: `Deleted payable ${existing.vendorName} (${payments.length} payments)`,
      actedBy: userId, branchId: existing.branchId,
    });
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
    const userId = await requireAuth(ctx);
    if (args.amount <= 0) throw new Error("Payment amount must be > 0");
    const payable = await ctx.db.get(args.payableId);
    if (!payable) throw new Error("Payable not found");
    if (payable.paidAmount + args.amount > payable.amount) {
      throw new Error("Payment would exceed total payable amount");
    }
    const paymentId = await ctx.db.insert("payablePayments", args);
    const newPaidAmount = payable.paidAmount + args.amount;
    const newStatus = newPaidAmount >= payable.amount ? "paid" as const : "partial" as const;
    await ctx.db.patch(args.payableId, { paidAmount: newPaidAmount, status: newStatus });
    await insertAuditLog(ctx, {
      entityType: "payablePayments", entityId: paymentId, action: "pay",
      description: `Payment Rp${args.amount} for ${payable.vendorName}`,
      actedBy: userId, branchId: payable.branchId,
    });
    return paymentId;
  },
});
