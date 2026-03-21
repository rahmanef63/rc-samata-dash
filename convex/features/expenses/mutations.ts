import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { paymentSourceValidator, approvalStatusValidator } from "../../shared/validators";

export const create = mutation({
  args: {
    expenseDate: v.string(),
    categoryId: v.id("expenseCategories"),
    categoryName: v.string(),
    vendorId: v.optional(v.id("vendors")),
    vendorName: v.optional(v.string()),
    amount: v.number(),
    description: v.string(),
    paymentSource: paymentSourceValidator,
    status: approvalStatusValidator,
    hasAttachment: v.boolean(),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("expenses", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("expenses"),
    expenseDate: v.string(),
    categoryId: v.id("expenseCategories"),
    categoryName: v.string(),
    vendorId: v.optional(v.id("vendors")),
    vendorName: v.optional(v.string()),
    amount: v.number(),
    description: v.string(),
    paymentSource: paymentSourceValidator,
    status: approvalStatusValidator,
    hasAttachment: v.boolean(),
    branchId: v.id("branches"),
  },
  handler: async (ctx, { id, ...data }) => {
    await ctx.db.patch(id, data);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("expenses") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

// ─── Line Items ─────────────────────────────────────────────
export const addLineItem = mutation({
  args: {
    expenseId: v.id("expenses"),
    itemName: v.string(),
    qty: v.number(),
    unit: v.string(),
    unitPrice: v.number(),
    subtotal: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("expenseLineItems", args);
  },
});

export const removeLineItem = mutation({
  args: { id: v.id("expenseLineItems") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});
