import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";
import type { Id } from "../../_generated/dataModel";
import {
  txKindValidator as kindValidator,
  txDirectionValidator as directionValidator,
  sourceKindValidator,
} from "./_types";

// ─── Idempotent upsert by source signature ──────────────────
// Caller passes the source trace; if a row already exists with the
// same (sourceKind, sourceFileName, sourceSheetName, sourceRowNumber),
// patch it; else insert. Lets the bridge re-run without duplicating
// rows when xlsx imported twice.
export const upsertTransaction = mutation({
  args: {
    branchId: v.id("branches"),
    kind: kindValidator,
    direction: directionValidator,
    date: v.string(),
    amount: v.number(),
    paidAmount: v.optional(v.number()),
    status: v.optional(v.string()),
    vendorId: v.optional(v.id("vendors")),
    channelId: v.optional(v.id("incomeChannels")),
    categoryId: v.optional(v.id("expenseCategories")),
    payableId: v.optional(v.id("payables")),
    receiptId: v.optional(v.id("paymentReceipts")),
    linkedTxId: v.optional(v.id("transactions")),
    parentTxId: v.optional(v.id("transactions")),
    counterparty: v.optional(v.string()),
    description: v.optional(v.string()),
    reference: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    channelName: v.optional(v.string()),
    paidBy: v.optional(v.string()),
    method: v.optional(v.string()),
    notes: v.optional(v.string()),
    anomalyFlag: v.optional(v.string()),
    proofFileName: v.optional(v.string()),
    proofStorageId: v.optional(v.id("_storage")),
    proofMimeType: v.optional(v.string()),
    sourceKind: sourceKindValidator,
    sourceFileName: v.optional(v.string()),
    sourceFileStorageId: v.optional(v.id("_storage")),
    sourceSheetName: v.optional(v.string()),
    sourceRowNumber: v.optional(v.number()),
    sourceReportId: v.optional(v.id("weeklyReports")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();

    // Find existing by source signature
    let existing = null;
    if (args.sourceFileName) {
      const candidates = await ctx.db.query("transactions")
        .withIndex("by_source_file", (q) =>
          q.eq("sourceKind", args.sourceKind).eq("sourceFileName", args.sourceFileName!),
        )
        .take(1000);
      existing = candidates.find((c) =>
        c.sourceSheetName === args.sourceSheetName &&
        c.sourceRowNumber === args.sourceRowNumber,
      ) ?? null;
    }

    if (existing) {
      const { sourceKind: _sk, ...patch } = args;
      void _sk;
      await ctx.db.patch(existing._id, { ...patch, updatedBy: userId, updatedAt: now });
      return { id: existing._id, action: "update" as const };
    }
    const id = await ctx.db.insert("transactions", {
      ...args,
      createdBy: userId,
      createdAt: now,
    });
    return { id, action: "insert" as const };
  },
});

// ─── Bulk patch — used by Buku Besar bulk edit ──────────────
export const bulkPatchTransactions = mutation({
  args: {
    branchId: v.id("branches"),
    patches: v.array(v.object({
      id: v.id("transactions"),
      data: v.any(),
    })),
  },
  handler: async (ctx, { branchId, patches }) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    let updated = 0;
    const errors: { id: string; message: string }[] = [];
    const allowedFields = new Set([
      "date", "amount", "paidAmount", "status", "counterparty",
      "description", "reference", "bankAccount", "channelName",
      "paidBy", "method", "notes", "anomalyFlag",
      "proofFileName", "kind", "direction",
    ]);
    for (const p of patches) {
      try {
        const existing = await ctx.db.get(p.id);
        if (!existing) { errors.push({ id: p.id, message: "tidak ditemukan" }); continue; }
        const data = p.data as Record<string, unknown>;
        const patch: Record<string, unknown> = {};
        for (const k of Object.keys(data)) {
          if (allowedFields.has(k) && data[k] !== undefined) patch[k] = data[k];
        }
        patch.updatedBy = userId;
        patch.updatedAt = now;
        await ctx.db.patch(p.id, patch);
        updated++;
      } catch (e) {
        errors.push({ id: p.id, message: e instanceof Error ? e.message : "patch failed" });
      }
    }
    await insertAuditLog(ctx, {
      entityType: "transactions",
      entityId: "" as Id<"transactions">,
      action: "update",
      description: `Bulk patch transactions — ${updated} updated, ${errors.length} error`,
      actedBy: userId, branchId,
    });
    return { updated, errors };
  },
});

export const bulkDeleteTransactions = mutation({
  args: {
    branchId: v.id("branches"),
    ids: v.array(v.id("transactions")),
  },
  handler: async (ctx, { branchId, ids }) => {
    const userId = await requireAuth(ctx);
    let deleted = 0;
    for (const id of ids) {
      try { await ctx.db.delete(id); deleted++; } catch { /* skip */ }
    }
    await insertAuditLog(ctx, {
      entityType: "transactions",
      entityId: "" as Id<"transactions">,
      action: "delete",
      description: `Bulk delete transactions — ${deleted}/${ids.length}`,
      actedBy: userId, branchId,
    });
    return { deleted };
  },
});

// ─── Bridge: backfill from existing tables ──────────────────
// One-shot pour over payables + paymentReceipts + ownerTransfers +
// dailyClosings, writing each into transactions if not already
// mirrored (idempotent via bridge FK columns). Run after deploy to
// hydrate the unified table from historical data.
export const backfillTransactions = mutation({
  args: { branchId: v.id("branches"), limit: v.optional(v.number()) },
  handler: async (ctx, { branchId, limit }) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    const cap = limit ?? 5000;
    let inserted = 0;

    // 1. payables → kind=invoice, direction=in
    const payables = await ctx.db.query("payables")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .take(cap);
    for (const p of payables) {
      if (p.transactionId) continue;
      const txId = await ctx.db.insert("transactions", {
        kind: "invoice" as const,
        direction: "in" as const,
        branchId,
        date: p.invoiceDate,
        amount: p.amount,
        paidAmount: p.paidAmount,
        status: p.status,
        vendorId: p.vendorId,
        payableId: p._id,
        counterparty: p.vendorName,
        description: p.description,
        reference: p.paymentReference,
        proofFileName: p.refPdfFile,
        sourceKind: "system" as const,
        sourceFileName: p.refPdfFile,
        createdBy: userId,
        createdAt: now,
      });
      await ctx.db.patch(p._id, { transactionId: txId });
      inserted++;
    }

    // 2. paymentReceipts → kind=payment (or anomaly if flagged)
    const receipts = await ctx.db.query("paymentReceipts")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .take(cap);
    for (const r of receipts) {
      if (r.transactionId) continue;
      const isAnomaly = r.anomalyFlag && r.anomalyFlag !== "ok";
      const txId = await ctx.db.insert("transactions", {
        kind: (isAnomaly ? "anomaly" : "payment") as "anomaly" | "payment",
        direction: "out" as const,
        branchId,
        date: r.paidDate,
        amount: r.amount,
        status: r.payableId ? "linked" : "unlinked",
        payableId: r.payableId,
        receiptId: r._id,
        reference: r.reference,
        bankAccount: r.bankAccount,
        paidBy: r.paidBy,
        method: r.channel,
        notes: r.notes,
        anomalyFlag: r.anomalyFlag,
        proofFileName: r.proofFileName,
        proofStorageId: r.proofStorageId,
        proofMimeType: r.proofMimeType,
        sourceKind: "system" as const,
        sourceFileName: r.proofFileName,
        createdBy: userId,
        createdAt: now,
      });
      await ctx.db.patch(r._id, { transactionId: txId });
      inserted++;
    }

    // 3. ownerTransfers → kind=transfer
    const transfers = await ctx.db.query("ownerTransfers")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .take(cap);
    for (const t of transfers) {
      if (t.transactionId) continue;
      const txId = await ctx.db.insert("transactions", {
        kind: "transfer" as const,
        direction: "transfer" as const,
        branchId,
        date: t.transferDate,
        amount: t.amount,
        status: t.status,
        counterparty: t.direction === "branch_to_owner" ? "OWNER" : "OWNER (incoming)",
        description: t.description ?? t.purpose,
        reference: t.referenceNo,
        method: t.direction,
        sourceKind: "system" as const,
        sourceReportId: t.reportId,
        createdBy: userId,
        createdAt: now,
      });
      await ctx.db.patch(t._id, { transactionId: txId });
      inserted++;
    }

    // 4. dailyClosings → kind=transfer (setoran)
    const closings = await ctx.db.query("dailyClosings")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .take(cap);
    for (const c of closings) {
      if (c.transactionId) continue;
      const txId = await ctx.db.insert("transactions", {
        kind: "transfer" as const,
        direction: "transfer" as const,
        branchId,
        date: c.businessDate,
        amount: c.cashSales + c.nonCashSales,
        status: c.status,
        counterparty: "(setoran kasir)",
        description: `Opening ${c.openingCash} · Expected ${c.expectedCash} · Actual ${c.actualCash} · Diff ${c.difference}`,
        sourceKind: "system" as const,
        createdBy: userId,
        createdAt: now,
      });
      await ctx.db.patch(c._id, { transactionId: txId });
      inserted++;
    }

    await insertAuditLog(ctx, {
      entityType: "transactions",
      entityId: "" as Id<"transactions">,
      action: "create",
      description: `Backfill transactions — ${inserted} rows mirrored`,
      actedBy: userId, branchId,
    });

    return { inserted };
  },
});
