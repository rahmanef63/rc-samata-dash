import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { paymentSourceValidator, approvalStatusValidator } from "../../shared/validators";
import { requireAuth } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";
import { mirrorTx } from "../transactions/_helpers";

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
    const userId = await requireAuth(ctx);
    if (args.amount <= 0) throw new Error("amount must be > 0");
    const id = await ctx.db.insert("expenses", args);
    // Mirror ke Buku Besar SSOT — expense kind, direction=out.
    const txId = await mirrorTx(ctx, {
      branchId: args.branchId,
      kind: "expense",
      direction: "out",
      date: args.expenseDate,
      amount: args.amount,
      status: args.status,
      categoryId: args.categoryId,
      vendorId: args.vendorId,
      counterparty: args.vendorName,
      description: args.description,
      sourceKind: "manual",
      userId,
    });
    if (txId) await ctx.db.patch(id, { transactionId: txId });
    await insertAuditLog(ctx, {
      entityType: "expenses", entityId: id, action: "create",
      description: `Created expense ${args.categoryName} - Rp${args.amount}`,
      actedBy: userId, branchId: args.branchId,
    });
    return id;
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
    const userId = await requireAuth(ctx);
    if (data.amount <= 0) throw new Error("amount must be > 0");
    await ctx.db.patch(id, data);
    await insertAuditLog(ctx, {
      entityType: "expenses", entityId: id, action: "update",
      description: `Updated expense ${data.categoryName}`,
      actedBy: userId, branchId: data.branchId,
    });
    return id;
  },
});

// Partial expense patch — per-cell edit from Notion view.
export const patch = mutation({
  args: {
    id: v.id("expenses"),
    expenseDate: v.optional(v.string()),
    amount: v.optional(v.number()),
    description: v.optional(v.string()),
    paymentSource: v.optional(paymentSourceValidator),
    status: v.optional(approvalStatusValidator),
    hasAttachment: v.optional(v.boolean()),
    // Inline category change from NotionView select cell. When set, also
    // resolves categoryId from expenseCategories by name (creates a new
    // row implicitly never — caller should pre-create via
    // masterData.mutations.createExpenseCategory before patch).
    categoryName: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...data }) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Expense not found");
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(data)) {
      if (val !== undefined && val !== null) patch[k] = val;
    }
    if (typeof patch.amount === "number" && (patch.amount as number) <= 0) {
      throw new Error("amount must be > 0");
    }
    // Resolve categoryName → categoryId so FK stays in lockstep with the
    // denormalized name field. Skip if the name doesn't exist (NotionView's
    // create-new path will have inserted it via createExpenseCategory first).
    if (typeof patch.categoryName === "string") {
      const wanted = patch.categoryName;
      const cat = await ctx.db.query("expenseCategories")
        .filter((q) => q.eq(q.field("name"), wanted))
        .first();
      if (cat) patch.categoryId = cat._id;
    }
    if (Object.keys(patch).length > 0) await ctx.db.patch(id, patch);
    await insertAuditLog(ctx, {
      entityType: "expenses", entityId: id, action: "update",
      description: `Patched expense ${existing.categoryName}`,
      actedBy: userId, branchId: existing.branchId,
    });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("expenses") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Record not found");
    // Cascade delete line items
    const lineItems = await ctx.db
      .query("expenseLineItems")
      .withIndex("by_expense", (q) => q.eq("expenseId", args.id))
      .collect();
    for (const li of lineItems) {
      await ctx.db.delete(li._id);
    }
    // Cascade ke Buku Besar (transactions) — SSOT 2-way relation
    let txDeleted = 0;
    if (existing.transactionId) {
      try { await ctx.db.delete(existing.transactionId); txDeleted = 1; } catch { /* tx mungkin sudah hilang */ }
    }
    await ctx.db.delete(args.id);
    await insertAuditLog(ctx, {
      entityType: "expenses", entityId: args.id, action: "delete",
      description: `Deleted expense ${existing.categoryName} (${lineItems.length} line items, ${txDeleted} tx)`,
      actedBy: userId, branchId: existing.branchId,
    });
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
    const userId = await requireAuth(ctx);
    if (args.qty <= 0) throw new Error("qty must be > 0");
    if (args.unitPrice < 0) throw new Error("unitPrice must be >= 0");
    return await ctx.db.insert("expenseLineItems", args);
  },
});

export const removeLineItem = mutation({
  args: { id: v.id("expenseLineItems") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});
