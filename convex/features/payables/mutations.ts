import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { paymentMethodValidator } from "../../shared/validators";
import { requireAuth } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";
import { buildVendorIndex } from "../../shared/vendorResolver";
import type { Id } from "../../_generated/dataModel";

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
    vendorId: v.optional(v.id("vendors")),
    vendorName: v.optional(v.string()),
    invoiceDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    amount: v.optional(v.number()),
    paidAmount: v.optional(v.number()),
    status: v.optional(v.union(v.literal("open"), v.literal("partial"), v.literal("paid"), v.literal("overdue"))),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...data }) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Record not found");

    const patch: Record<string, unknown> = {};
    if (data.vendorId !== undefined) patch.vendorId = data.vendorId;
    if (data.vendorName !== undefined) patch.vendorName = data.vendorName;
    if (data.invoiceDate !== undefined) patch.invoiceDate = data.invoiceDate;
    if (data.dueDate !== undefined) patch.dueDate = data.dueDate;
    if (data.amount !== undefined) patch.amount = data.amount;
    if (data.paidAmount !== undefined) patch.paidAmount = data.paidAmount;
    if (data.description !== undefined) patch.description = data.description;

    // Recompute status if amount or paidAmount changed (unless caller
    // explicitly overrode status).
    if (data.status !== undefined) {
      patch.status = data.status;
    } else if (data.amount !== undefined || data.paidAmount !== undefined) {
      const newAmount = data.amount ?? existing.amount;
      const newPaid = data.paidAmount ?? existing.paidAmount;
      patch.status = newPaid >= newAmount && newAmount > 0 ? "paid"
        : newPaid > 0 ? "partial"
        : "open";
    }

    await ctx.db.patch(id, patch);
    await insertAuditLog(ctx, {
      entityType: "payables", entityId: id, action: "update",
      description: `Updated payable ${data.vendorName ?? existing.vendorName}`,
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

// ─── Bulk import payables (CSV) ─────────────────────────────
// Resolves vendorName to vendorId via vendor master (fuzzy match).
// Rows that fail to resolve are returned in `errors` so the UI can
// prompt the user to either create the vendor master first or fix
// the spelling.
export const importPayablesBulk = mutation({
  args: {
    branchId: v.id("branches"),
    rows: v.array(v.object({
      vendorName: v.string(),
      invoiceDate: v.string(),
      dueDate: v.string(),
      amount: v.number(),
      paidAmount: v.number(),
      description: v.string(),
      reference: v.optional(v.string()),
      fileName: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { branchId, rows }) => {
    const userId = await requireAuth(ctx);

    const vendors = await ctx.db.query("vendors").take(2000);
    const vendorIdx = buildVendorIndex(vendors);

    let inserted = 0;
    const errors: { line: number; message: string }[] = [];
    const unresolvedVendors = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const vendor = vendorIdx.resolve(r.vendorName);
        if (!vendor) {
          unresolvedVendors.add(r.vendorName);
          errors.push({ line: i + 2, message: `Vendor "${r.vendorName}" tidak ada di master` });
          continue;
        }

        const status: "open" | "partial" | "paid" | "overdue" =
          r.paidAmount >= r.amount && r.amount > 0 ? "paid"
          : r.paidAmount > 0 ? "partial"
          : "open";

        const descriptionWithRef = [
          r.description,
          r.reference ? `ref: ${r.reference}` : null,
          r.fileName ? `file: ${r.fileName}` : null,
        ].filter(Boolean).join(" · ");

        const id = await ctx.db.insert("payables", {
          vendorId: vendor._id,
          vendorName: vendor.name,
          invoiceDate: r.invoiceDate,
          dueDate: r.dueDate,
          amount: r.amount,
          paidAmount: r.paidAmount,
          status,
          description: descriptionWithRef,
          branchId,
        });
        void id;
        inserted++;
      } catch (e) {
        errors.push({ line: i + 2, message: e instanceof Error ? e.message : "row failed" });
      }
    }

    await insertAuditLog(ctx, {
      entityType: "payables",
      entityId: "" as Id<"payables">,
      action: "create",
      description: `Bulk import payables — ${inserted} insert, ${errors.length} error, ${unresolvedVendors.size} vendor unresolved`,
      actedBy: userId, branchId,
    });

    return { inserted, errors, unresolvedVendors: [...unresolvedVendors] };
  },
});

// ─── Vendor alias maintenance ───────────────────────────────
// Manual purge when an auto-learned alias is wrong (e.g. parser
// matched a counterparty to the wrong vendor master row).
export const removeVendorAlias = mutation({
  args: { aliasId: v.id("vendorBankAliases") },
  handler: async (ctx, { aliasId }) => {
    const userId = await requireAuth(ctx);
    const alias = await ctx.db.get(aliasId);
    if (!alias) throw new Error("Alias not found");
    await ctx.db.delete(aliasId);
    await insertAuditLog(ctx, {
      entityType: "vendorBankAliases", entityId: aliasId, action: "delete",
      description: `Hapus alias bank "${alias.alias}"`,
      actedBy: userId, branchId: alias.branchId,
    });
    return null;
  },
});

