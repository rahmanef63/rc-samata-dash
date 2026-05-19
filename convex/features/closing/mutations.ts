import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";
import type { Id } from "../../_generated/dataModel";

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

// ─── Payment receipts (bukti bayar piutang) ─────────────────

export const generateProofUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createPaymentReceipt = mutation({
  args: {
    payableId: v.optional(v.id("payables")),
    amount: v.number(),
    paidDate: v.string(),
    paidBy: v.union(v.literal("owner"), v.literal("pic")),
    channel: v.optional(v.string()),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
    proofStorageId: v.optional(v.id("_storage")),
    proofFileName: v.optional(v.string()),
    proofMimeType: v.optional(v.string()),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const id = await ctx.db.insert("paymentReceipts", { ...args, uploadedAt: Date.now(), uploadedBy: userId });

    // If linked to a payable, auto-bump paidAmount + status.
    if (args.payableId) {
      const payable = await ctx.db.get(args.payableId);
      if (payable) {
        const newPaid = payable.paidAmount + args.amount;
        const status = newPaid >= payable.amount ? "paid" as const
          : newPaid > 0 ? "partial" as const
          : payable.status;
        await ctx.db.patch(args.payableId, { paidAmount: newPaid, status });
      }
    }
    await insertAuditLog(ctx, {
      entityType: "paymentReceipts", entityId: id, action: "create",
      description: `Bukti bayar Rp${args.amount} (${args.paidBy}) ${args.paidDate}`,
      actedBy: userId, branchId: args.branchId,
    });
    return id;
  },
});

export const removePaymentReceipt = mutation({
  args: { id: v.id("paymentReceipts") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const r = await ctx.db.get(id);
    if (!r) throw new Error("Receipt not found");
    if (r.payableId) {
      const payable = await ctx.db.get(r.payableId);
      if (payable) {
        const newPaid = Math.max(0, payable.paidAmount - r.amount);
        const status = newPaid >= payable.amount ? "paid" as const
          : newPaid > 0 ? "partial" as const
          : "open" as const;
        await ctx.db.patch(r.payableId, { paidAmount: newPaid, status });
      }
    }
    if (r.proofStorageId) await ctx.storage.delete(r.proofStorageId);
    await ctx.db.delete(id);
    await insertAuditLog(ctx, {
      entityType: "paymentReceipts", entityId: id, action: "delete",
      description: `Hapus bukti bayar Rp${r.amount}`, actedBy: userId, branchId: r.branchId,
    });
    return null;
  },
});

// ─── Bank statement batches + entries ───────────────────────

export const createBankStatementBatch = mutation({
  args: {
    accountKind: v.union(v.literal("owner"), v.literal("pic")),
    periodStart: v.string(),
    periodEnd: v.string(),
    fileName: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return await ctx.db.insert("bankStatementBatches", {
      ...args, status: "uploaded" as const, rowCount: 0,
      uploadedAt: Date.now(), uploadedBy: userId,
    });
  },
});

export const removeBankStatementBatch = mutation({
  args: { id: v.id("bankStatementBatches") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const b = await ctx.db.get(id);
    if (!b) throw new Error("Batch not found");
    // Delete all entries first
    const entries = await ctx.db.query("bankStatementEntries").withIndex("by_batch", (q) => q.eq("batchId", id)).collect();
    for (const e of entries) await ctx.db.delete(e._id);
    if (b.fileStorageId) await ctx.storage.delete(b.fileStorageId);
    await ctx.db.delete(id);
    await insertAuditLog(ctx, {
      entityType: "bankStatementBatches", entityId: id, action: "delete",
      description: `Hapus batch statement ${b.accountKind} ${b.fileName}`,
      actedBy: userId, branchId: b.branchId,
    });
    return { entriesDeleted: entries.length };
  },
});

// ─── Import bank statement entries (parsed rows) ─────────

const bankStatementCategoryUnion = v.union(
  v.literal("sales_inflow"),
  v.literal("expense_outflow"),
  v.literal("topup_pic"),
  v.literal("payable_payment"),
  v.literal("owner_capital"),
  v.literal("transfer_internal"),
  v.literal("other"),
);

const bankStatementRowValidator = v.object({
  txDate: v.string(),
  description: v.string(),
  debit: v.number(),
  credit: v.number(),
  balance: v.number(),
  channel: v.optional(v.string()),
  category: v.optional(bankStatementCategoryUnion),
});

export const importBankStatementEntries = mutation({
  args: {
    batchId: v.id("bankStatementBatches"),
    rows: v.array(bankStatementRowValidator),
  },
  handler: async (ctx, { batchId, rows }) => {
    const userId = await requireAuth(ctx);
    const batch = await ctx.db.get(batchId);
    if (!batch) throw new Error("Batch not found");

    // Idempotent: wipe prior entries for this batch first
    const existing = await ctx.db.query("bankStatementEntries")
      .withIndex("by_batch", (q) => q.eq("batchId", batchId)).collect();
    for (const e of existing) await ctx.db.delete(e._id);

    const opening = batch.openingBalance ?? 0;
    let closing = opening;
    for (const r of rows) {
      await ctx.db.insert("bankStatementEntries", {
        accountKind: batch.accountKind,
        txDate: r.txDate,
        description: r.description,
        debit: r.debit,
        credit: r.credit,
        balance: r.balance,
        channel: r.channel,
        category: r.category,
        batchId,
        branchId: batch.branchId,
      });
      closing = r.balance > 0 ? r.balance : closing + r.credit - r.debit;
    }

    await ctx.db.patch(batchId, {
      rowCount: rows.length,
      status: "parsed",
      closingBalance: closing,
    });

    await insertAuditLog(ctx, {
      entityType: "bankStatementBatches", entityId: batchId, action: "update",
      description: `Parsed ${rows.length} entries (${batch.accountKind}) from ${batch.fileName}`,
      actedBy: userId, branchId: batch.branchId,
    });

    return { inserted: rows.length, closingBalance: closing };
  },
});

// ─── Apply validation (reconciliation) ──────────────────────

const validationUpdateValidator = v.object({
  entryType: v.union(v.literal("bank_entry"), v.literal("payable")),
  entryId: v.string(),
  paymentReference: v.optional(v.string()),
  matchedPayableId: v.optional(v.string()),  // id string; we'll normalize on apply
  isValidated: v.optional(v.boolean()),
});

export const applyValidationBatch = mutation({
  args: {
    branchId: v.id("branches"),
    fileName: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
    updates: v.array(validationUpdateValidator),
  },
  handler: async (ctx, { branchId, fileName, fileStorageId, updates }) => {
    const userId = await requireAuth(ctx);

    const batchId = await ctx.db.insert("validationBatches", {
      fileName, fileStorageId,
      rowsApplied: 0, rowsRejected: 0,
      branchId, uploadedAt: Date.now(), uploadedBy: userId,
    });

    let applied = 0;
    let rejected = 0;
    const now = Date.now();

    for (const u of updates) {
      try {
        if (u.entryType === "bank_entry") {
          const id = u.entryId as Id<"bankStatementEntries">;
          const cur = await ctx.db.get(id) as {
            paymentReference?: string;
            payableId?: Id<"payables">;
            isValidated?: boolean;
          } | null;
          if (!cur) { rejected++; continue; }

          const patch: {
            paymentReference?: string;
            payableId?: Id<"payables">;
            isValidated?: boolean;
          } = {};

          if (u.paymentReference !== undefined && u.paymentReference !== cur.paymentReference) {
            await ctx.db.insert("validationLogs", {
              entryType: "bank_entry", entryId: u.entryId, batchId, field: "paymentReference",
              beforeValue: cur.paymentReference, afterValue: u.paymentReference,
              branchId, changedAt: now,
            });
            patch.paymentReference = u.paymentReference;
          }

          if (u.matchedPayableId !== undefined) {
            const newPayableId = u.matchedPayableId ? (u.matchedPayableId as Id<"payables">) : undefined;
            if (newPayableId !== cur.payableId) {
              await ctx.db.insert("validationLogs", {
                entryType: "bank_entry", entryId: u.entryId, batchId, field: "payableId",
                beforeValue: cur.payableId as string | undefined,
                afterValue: newPayableId as string | undefined,
                branchId, changedAt: now,
              });
              patch.payableId = newPayableId;
            }
          }

          if (u.isValidated !== undefined && u.isValidated !== cur.isValidated) {
            await ctx.db.insert("validationLogs", {
              entryType: "bank_entry", entryId: u.entryId, batchId, field: "isValidated",
              beforeValue: String(cur.isValidated ?? false),
              afterValue: String(u.isValidated),
              branchId, changedAt: now,
            });
            patch.isValidated = u.isValidated;
          }

          if (Object.keys(patch).length > 0) await ctx.db.patch(id, patch);
          applied++;
        } else if (u.entryType === "payable") {
          const id = u.entryId as Id<"payables">;
          const cur = await ctx.db.get(id) as { paymentReference?: string; isValidated?: boolean } | null;
          if (!cur) { rejected++; continue; }

          const patch: { paymentReference?: string; isValidated?: boolean } = {};

          if (u.paymentReference !== undefined && u.paymentReference !== cur.paymentReference) {
            await ctx.db.insert("validationLogs", {
              entryType: "payable", entryId: u.entryId, batchId, field: "paymentReference",
              beforeValue: cur.paymentReference, afterValue: u.paymentReference,
              branchId, changedAt: now,
            });
            patch.paymentReference = u.paymentReference;
          }
          if (u.isValidated !== undefined && u.isValidated !== cur.isValidated) {
            await ctx.db.insert("validationLogs", {
              entryType: "payable", entryId: u.entryId, batchId, field: "isValidated",
              beforeValue: String(cur.isValidated ?? false),
              afterValue: String(u.isValidated),
              branchId, changedAt: now,
            });
            patch.isValidated = u.isValidated;
          }
          if (Object.keys(patch).length > 0) await ctx.db.patch(id, patch);
          applied++;
        } else {
          rejected++;
        }
      } catch {
        rejected++;
      }
    }

    await ctx.db.patch(batchId, { rowsApplied: applied, rowsRejected: rejected });

    await insertAuditLog(ctx, {
      entityType: "validationBatches", entityId: batchId, action: "create",
      description: `Apply validation ${fileName} — ${applied} applied / ${rejected} rejected`,
      actedBy: userId, branchId,
    });

    return { batchId, applied, rejected };
  },
});
