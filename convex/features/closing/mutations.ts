import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";
import { mirrorTx } from "../transactions/_helpers";
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

// ─── Bulk closing import from CSV ────────────────────────────
// Upsert by (branchId, businessDate). If existing row for the date is
// already "verified" it is skipped (errors reported back to caller).
export const importDailyClosings = mutation({
  args: {
    branchId: v.id("branches"),
    submittedBy: v.string(),
    rows: v.array(v.object({
      businessDate: v.string(),
      openingCash: v.number(),
      cashSales: v.number(),
      nonCashSales: v.number(),
      expensesPaidCash: v.number(),
      actualCash: v.number(),
      expectedCash: v.number(),
      difference: v.number(),
      note: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { branchId, submittedBy, rows }) => {
    const userId = await requireAuth(ctx);
    const now = new Date().toISOString();

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const skipDetails: { businessDate: string; reason: string }[] = [];

    for (const r of rows) {
      const existing = await ctx.db.query("dailyClosings")
        .withIndex("by_branch_date", (q) => q.eq("branchId", branchId).eq("businessDate", r.businessDate))
        .first();

      if (existing) {
        if (existing.status === "verified") {
          skipped++;
          skipDetails.push({ businessDate: r.businessDate, reason: "sudah verified, tidak ditimpa" });
          continue;
        }
        await ctx.db.patch(existing._id, {
          openingCash: r.openingCash,
          cashSales: r.cashSales,
          nonCashSales: r.nonCashSales,
          expensesPaidCash: r.expensesPaidCash,
          actualCash: r.actualCash,
          expectedCash: r.expectedCash,
          difference: r.difference,
        });
        updated++;
      } else {
        await ctx.db.insert("dailyClosings", {
          businessDate: r.businessDate,
          openingCash: r.openingCash,
          cashSales: r.cashSales,
          nonCashSales: r.nonCashSales,
          expensesPaidCash: r.expensesPaidCash,
          actualCash: r.actualCash,
          expectedCash: r.expectedCash,
          difference: r.difference,
          status: "submitted" as const,
          submittedBy,
          submittedAt: now,
          branchId,
        });
        inserted++;
      }
    }

    await insertAuditLog(ctx, {
      entityType: "dailyClosings",
      entityId: "" as Id<"dailyClosings">,
      action: "create",
      description: `Import CSV setoran — ${inserted} insert, ${updated} update, ${skipped} skip`,
      actedBy: userId, branchId,
    });

    return { inserted, updated, skipped, skipDetails };
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

export const updateTransfer = mutation({
  args: {
    id: v.id("ownerTransfers"),
    transferDate: v.optional(v.string()),
    direction: v.optional(v.union(v.literal("branch_to_owner"), v.literal("owner_to_branch"))),
    purpose: v.optional(v.union(v.literal("night_transfer"), v.literal("petty_cash_topup"), v.literal("payable_payment_fund"), v.literal("adjustment"))),
    amount: v.optional(v.number()),
    referenceNo: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("completed"))),
  },
  handler: async (ctx, { id, ...data }) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Transfer not found");
    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error("Transfer amount must be > 0");
    }
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) patch[k] = v;
    }
    await ctx.db.patch(id, patch);
    await insertAuditLog(ctx, {
      entityType: "ownerTransfers", entityId: id, action: "update",
      description: `Updated transfer ${existing.transferDate} Rp${existing.amount}`,
      actedBy: userId, branchId: existing.branchId,
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

// ─── Bulk import receipts (CSV) ─────────────────────────────
// Mirror of bulk-closing import. Each row may carry a vendorName which
// we resolve to the latest open payable for that vendor (if any), so
// the system auto-credits payable.paidAmount + status. If no match
// found, receipt is recorded standalone (payableId unset).
export const importPaymentReceiptsBulk = mutation({
  args: {
    branchId: v.id("branches"),
    rows: v.array(v.object({
      paidDate: v.string(),
      amount: v.number(),
      paidBy: v.union(v.literal("owner"), v.literal("pic")),
      vendorName: v.optional(v.string()),
      channel: v.optional(v.string()),
      reference: v.optional(v.string()),
      notes: v.optional(v.string()),
      fileName: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { branchId, rows }) => {
    const userId = await requireAuth(ctx);

    // Cache: vendor name → vendorId, latest open payable per vendor.
    const vendors = await ctx.db.query("vendors").take(2000);
    const vendorByName = new Map(
      vendors.map((vnd) => [vnd.name.toUpperCase().trim(), vnd]),
    );
    const allPayables = await ctx.db.query("payables")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .take(5000);
    const openPayables = allPayables.filter((p) =>
      p.status === "open" || p.status === "partial" || p.status === "overdue",
    );

    let inserted = 0;
    let linked = 0;
    const errors: { line: number; message: string }[] = [];
    const now = Date.now();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        let payableId: Id<"payables"> | undefined;
        if (r.vendorName) {
          const up = r.vendorName.toUpperCase().trim();
          let vendor = vendorByName.get(up);
          if (!vendor) {
            for (const [nm, vnd] of vendorByName) {
              if (up.includes(nm) || nm.includes(up)) { vendor = vnd; break; }
            }
          }
          if (vendor) {
            // Pick the OLDEST open payable for this vendor (FIFO style)
            // whose remaining ≥ amount, so partial payments still attach.
            const candidates = openPayables
              .filter((p) => p.vendorId === vendor._id && (p.amount - p.paidAmount) > 0)
              .sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate));
            if (candidates.length > 0) payableId = candidates[0]._id;
          }
        }

        const id = await ctx.db.insert("paymentReceipts", {
          payableId,
          amount: r.amount,
          paidDate: r.paidDate,
          paidBy: r.paidBy,
          channel: r.channel,
          reference: r.reference,
          notes: r.notes,
          proofFileName: r.fileName,
          branchId,
          uploadedAt: now,
          uploadedBy: userId,
        });

        if (payableId) {
          const p = await ctx.db.get(payableId);
          if (p) {
            const newPaid = Math.min(p.amount, p.paidAmount + r.amount);
            const newStatus: "open" | "partial" | "paid" | "overdue" =
              newPaid >= p.amount && p.amount > 0 ? "paid"
              : newPaid > 0 ? "partial"
              : p.status;
            await ctx.db.patch(payableId, { paidAmount: newPaid, status: newStatus });
            // Refresh cache for subsequent rows
            const refIdx = openPayables.findIndex((x) => x._id === payableId);
            if (refIdx >= 0) openPayables[refIdx] = { ...openPayables[refIdx], paidAmount: newPaid, status: newStatus };
          }
          linked++;
        }

        void id;
        inserted++;
      } catch (e) {
        errors.push({ line: i + 2, message: e instanceof Error ? e.message : "row failed" });
      }
    }

    await insertAuditLog(ctx, {
      entityType: "paymentReceipts",
      entityId: "" as Id<"paymentReceipts">,
      action: "create",
      description: `Bulk import bukti bayar — ${inserted} insert (${linked} dilink ke payable), ${errors.length} error`,
      actedBy: userId, branchId,
    });

    return { inserted, linked, errors };
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

    const entries = await ctx.db.query("bankStatementEntries")
      .withIndex("by_batch", (q) => q.eq("batchId", id)).collect();

    // Collect linked payables BEFORE deleting entries — so we can
    // recompute paidAmount + status after the cascade. Also nuke any
    // validationLogs that point to these bank entries (otherwise the
    // log table holds orphan rows pointing to deleted ids).
    const linkedPayableIds = new Set<string>();
    for (const e of entries) {
      if (e.payableId) linkedPayableIds.add(e.payableId);
      const orphanLogs = await ctx.db.query("validationLogs")
        .withIndex("by_entry", (q) => q.eq("entryType", "bank_entry").eq("entryId", e._id))
        .collect();
      for (const l of orphanLogs) await ctx.db.delete(l._id);
      await ctx.db.delete(e._id);
    }

    for (const pidStr of linkedPayableIds) {
      const pid = pidStr as Id<"payables">;
      const p = await ctx.db.get(pid) as {
        amount?: number; paidAmount?: number;
        status?: "open" | "partial" | "paid" | "overdue";
      } | null;
      if (!p) continue;
      const remaining = await ctx.db.query("bankStatementEntries")
        .withIndex("by_payable", (q) => q.eq("payableId", pid))
        .collect();
      const bankSum = remaining.reduce((s, x) => s + (x.debit ?? 0), 0);
      const newPaid = Math.min(p.amount ?? 0, bankSum);
      const newStatus: "open" | "partial" | "paid" | "overdue" =
        newPaid >= (p.amount ?? 0) && (p.amount ?? 0) > 0 ? "paid"
        : newPaid > 0 ? "partial"
        : "open";
      if (newPaid !== (p.paidAmount ?? 0) || newStatus !== p.status) {
        await ctx.db.patch(pid, { paidAmount: newPaid, status: newStatus });
      }
    }

    if (b.fileStorageId) {
      try { await ctx.storage.delete(b.fileStorageId); } catch { /* file may already be gone */ }
    }
    await ctx.db.delete(id);
    await insertAuditLog(ctx, {
      entityType: "bankStatementBatches", entityId: id, action: "delete",
      description: `Hapus batch statement ${b.accountKind} ${b.fileName} — ${entries.length} tx, ${linkedPayableIds.size} payable direkomputasi`,
      actedBy: userId, branchId: b.branchId,
    });
    return { entriesDeleted: entries.length, payablesRecomputed: linkedPayableIds.size };
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
  counterparty: v.optional(v.string()),
  // Inline-edit additions: UI can preset link + alias-learning per row.
  payableId: v.optional(v.id("payables")),
  learnAlias: v.optional(v.boolean()),
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

    // Pre-load vendor list once for opportunistic alias seeding.
    const vendors = await ctx.db.query("vendors").take(2000);
    const vendorByName = new Map(
      vendors.map((vnd) => [vnd.name.toUpperCase().trim(), vnd]),
    );
    const aliasesSeeded: Record<string, number> = {};

    // Synthetic validationBatch lazily created on first link so any
    // link op (manual OR auto) is auditable + undoable via
    // deleteValidationBatch. Pre-2026-05-21 this only fired for
    // manual links; now we also run an auto-match pass after insert.
    let linkBatchId: Id<"validationBatches"> | null = null;
    const ensureLinkBatch = async (): Promise<Id<"validationBatches">> => {
      if (linkBatchId) return linkBatchId;
      linkBatchId = await ctx.db.insert("validationBatches", {
        fileName: `statement-import-${batch.accountKind}-${batch.fileName}`,
        rowsApplied: 0, rowsRejected: 0,
        summary: `links applied during statement import (${batch.accountKind})`,
        branchId: batch.branchId,
        uploadedAt: Date.now(), uploadedBy: userId,
      });
      return linkBatchId;
    };
    let linkApplied = 0;
    let autoLinkApplied = 0;
    const touchedPayableIds = new Set<string>();
    const now = Date.now();

    // Track inserted entry ids per index so the auto-match pass can
    // patch them in-place without re-querying.
    type InsertedRow = {
      entryId: Id<"bankStatementEntries">;
      r: typeof rows[number];
    };
    const inserted: InsertedRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 2; // header on line 1, data starts row 2
      const entryId = await ctx.db.insert("bankStatementEntries", {
        accountKind: batch.accountKind,
        txDate: r.txDate,
        description: r.description,
        debit: r.debit,
        credit: r.credit,
        balance: r.balance,
        channel: r.channel,
        category: r.category,
        counterparty: r.counterparty,
        payableId: r.payableId,
        isValidated: r.payableId ? true : undefined,
        batchId,
        branchId: batch.branchId,
      });
      inserted.push({ entryId, r });
      closing = r.balance > 0 ? r.balance : closing + r.credit - r.debit;

      // ── Mirror to transactions SSOT ──────────────────────
      const txKind: "invoice" | "payment" | "receipt" | "transfer" | "expense" | "anomaly" =
        r.category === "sales_inflow" ? "receipt"
        : r.category === "expense_outflow" ? "expense"
        : r.category === "payable_payment" ? "payment"
        : r.category === "topup_pic" ? "transfer"
        : r.category === "owner_capital" ? "transfer"
        : r.category === "transfer_internal" ? "transfer"
        : r.category === "other" ? "anomaly"
        : r.debit > 0 ? "expense" : "receipt";
      const txDirection: "in" | "out" | "transfer" =
        r.category === "topup_pic" || r.category === "transfer_internal" ? "transfer"
        : r.credit > 0 ? "in" : "out";
      const amount = r.debit > 0 ? r.debit : r.credit;
      const txId = await mirrorTx(ctx, {
        branchId: batch.branchId,
        kind: txKind, direction: txDirection,
        date: r.txDate, amount,
        status: r.payableId ? "linked" : "unlinked",
        payableId: r.payableId,
        counterparty: r.counterparty,
        description: r.description,
        channelName: r.channel,
        method: r.channel,
        bankAccount: batch.accountKind,
        paidBy: batch.accountKind === "owner" ? "owner" : "pic",
        sourceKind: "statement_bank",
        sourceFileName: batch.fileName,
        sourceFileStorageId: batch.fileStorageId,
        sourceSheetName: batch.accountKind,
        sourceRowNumber: rowNum,
        userId,
      });
      await ctx.db.patch(entryId, { transactionId: txId });

      // Inline link: write validationLogs so the undo path can reverse it.
      if (r.payableId) {
        const lb = await ensureLinkBatch();
        await ctx.db.insert("validationLogs", {
          entryType: "bank_entry", entryId, batchId: lb,
          field: "payableId",
          beforeValue: undefined, afterValue: r.payableId,
          branchId: batch.branchId, changedAt: now,
        });
        await ctx.db.insert("validationLogs", {
          entryType: "bank_entry", entryId, batchId: lb,
          field: "isValidated",
          beforeValue: "false", afterValue: "true",
          branchId: batch.branchId, changedAt: now,
        });
        touchedPayableIds.add(r.payableId);
        linkApplied++;
      }

      // Manual alias learn (UI set learnAlias=true). Distinct from the
      // opportunistic vendor-name seeding below — this one trusts the user.
      if (r.learnAlias && r.counterparty && r.payableId) {
        const cp = r.counterparty.toUpperCase().trim();
        const payable = await ctx.db.get(r.payableId);
        if (payable && cp) {
          const existingAlias = await ctx.db.query("vendorBankAliases")
            .withIndex("by_branch_alias", (q) => q.eq("branchId", batch.branchId).eq("alias", cp))
            .first();
          if (existingAlias) {
            await ctx.db.patch(existingAlias._id, {
              vendorId: payable.vendorId,
              lastSeenAt: now,
              seenCount: existingAlias.seenCount + 1,
            });
          } else {
            await ctx.db.insert("vendorBankAliases", {
              vendorId: payable.vendorId,
              alias: cp,
              source: "statement" as const,
              branchId: batch.branchId,
              lastSeenAt: now,
              seenCount: 1,
            });
            aliasesSeeded[cp] = (aliasesSeeded[cp] ?? 0) + 1;
          }
        }
      }

      // Seed vendor alias if counterparty contains an existing vendor name
      // (opportunistic — kept for un-linked payable_payment rows).
      if (!r.learnAlias && r.counterparty && r.category === "payable_payment") {
        const cp = r.counterparty.toUpperCase().trim();
        let matchedVendor = vendorByName.get(cp);
        if (!matchedVendor) {
          for (const [name, vnd] of vendorByName) {
            if (cp.includes(name) || name.includes(cp)) {
              matchedVendor = vnd;
              break;
            }
          }
        }
        if (matchedVendor) {
          const existing = await ctx.db.query("vendorBankAliases")
            .withIndex("by_branch_alias", (q) => q.eq("branchId", batch.branchId).eq("alias", cp))
            .first();
          if (existing) {
            await ctx.db.patch(existing._id, {
              lastSeenAt: Date.now(),
              seenCount: existing.seenCount + 1,
            });
          } else {
            await ctx.db.insert("vendorBankAliases", {
              vendorId: matchedVendor._id,
              alias: cp,
              source: "statement" as const,
              branchId: batch.branchId,
              lastSeenAt: Date.now(),
              seenCount: 1,
            });
            aliasesSeeded[cp] = (aliasesSeeded[cp] ?? 0) + 1;
          }
        }
      }
    }

    // ─── Auto-link pass: for any payable_payment row that did NOT
    // come with an explicit payableId, try to match against an open
    // payable by amount + vendor alias. This is the fix for the bug
    // where PIC users imported statements but their payables never
    // moved from "open" → "paid" because nothing in the UX forced
    // them through the per-row PayableLinkCombo or the Validator tab.
    //
    // Match rules (mirror previewAutoMatch / autoMatchPayables):
    //   1. Resolve vendor from counterparty via vendorBankAliases or
    //      vendor name substring.
    //   2. Find open/partial/overdue payable with remaining ≈ debit
    //      (tolerance Rp 1500).
    //   3. Don't double-link: skip payables already linked by another
    //      entry in this same import pass.
    const TOL = 1500;
    const openPayablesAll = await ctx.db.query("payables")
      .withIndex("by_branch", (q) => q.eq("branchId", batch.branchId))
      .take(5000);
    const openPayables = openPayablesAll.filter((p) =>
      (p.status === "open" || p.status === "partial" || p.status === "overdue") && !p.isValidated,
    );
    const aliases = await ctx.db.query("vendorBankAliases")
      .withIndex("by_branch_alias", (q) => q.eq("branchId", batch.branchId))
      .take(2000);
    type AliasIdx = { name: string; vendorId: string };
    const aliasIndex: AliasIdx[] = [];
    for (const a of aliases) aliasIndex.push({ name: a.alias.toUpperCase().trim(), vendorId: a.vendorId });
    for (const vnd of vendors) {
      const cleaned = vnd.name.toUpperCase().replace(/\b(INDONES(IA)?|CV|PT|TBK)\b/g, "").trim();
      aliasIndex.push({ name: cleaned, vendorId: vnd._id });
      aliasIndex.push({ name: vnd.name.toUpperCase().trim(), vendorId: vnd._id });
    }
    aliasIndex.sort((a, b) => b.name.length - a.name.length);
    const findVendorId = (text: string): string | null => {
      const up = (text ?? "").toUpperCase().trim();
      if (!up) return null;
      for (const { name, vendorId } of aliasIndex) {
        if (name.length < 3) continue;
        if (up.includes(name) || name.includes(up)) return vendorId;
      }
      return null;
    };

    const usedPayableIds = new Set<string>(touchedPayableIds);
    for (const { entryId, r } of inserted) {
      if (r.payableId) continue;
      if (r.category !== "payable_payment") continue;
      if (!(r.debit > 0)) continue;
      const vendorId = findVendorId(r.counterparty ?? "") ?? findVendorId(r.description);
      if (!vendorId) continue;
      const candidate = openPayables.find((p) => {
        if (usedPayableIds.has(p._id)) return false;
        if (p.vendorId !== vendorId) return false;
        const remaining = p.amount - p.paidAmount;
        return Math.abs(remaining - r.debit) <= TOL;
      });
      if (!candidate) continue;

      const lb = await ensureLinkBatch();
      await ctx.db.insert("validationLogs", {
        entryType: "bank_entry", entryId, batchId: lb,
        field: "payableId",
        beforeValue: undefined, afterValue: candidate._id,
        branchId: batch.branchId, changedAt: now,
      });
      await ctx.db.insert("validationLogs", {
        entryType: "bank_entry", entryId, batchId: lb,
        field: "isValidated",
        beforeValue: "false", afterValue: "true",
        branchId: batch.branchId, changedAt: now,
      });
      await ctx.db.patch(entryId, {
        payableId: candidate._id,
        isValidated: true,
      });
      touchedPayableIds.add(candidate._id);
      usedPayableIds.add(candidate._id);
      autoLinkApplied++;
    }

    // Recompute paidAmount + status for every payable touched by inline links.
    for (const pidStr of touchedPayableIds) {
      const pid = pidStr as Id<"payables">;
      const p = await ctx.db.get(pid) as {
        amount?: number; paidAmount?: number;
        status?: "open" | "partial" | "paid" | "overdue";
      } | null;
      if (!p) continue;
      const linkedBanks = await ctx.db.query("bankStatementEntries")
        .withIndex("by_payable", (q) => q.eq("payableId", pid))
        .collect();
      const bankSum = linkedBanks.reduce((s, b) => s + (b.debit ?? 0), 0);
      const oldPaid = p.paidAmount ?? 0;
      const newPaid = Math.min(p.amount ?? 0, bankSum);
      const newStatus: "open" | "partial" | "paid" | "overdue" =
        newPaid >= (p.amount ?? 0) && (p.amount ?? 0) > 0 ? "paid"
        : newPaid > 0 ? "partial"
        : (p.status ?? "open");
      if (newPaid !== oldPaid && linkBatchId) {
        await ctx.db.insert("validationLogs", {
          entryType: "payable", entryId: pidStr, batchId: linkBatchId,
          field: "paidAmount",
          beforeValue: String(oldPaid), afterValue: String(newPaid),
          branchId: batch.branchId, changedAt: now,
        });
      }
      if (newStatus !== p.status && linkBatchId) {
        await ctx.db.insert("validationLogs", {
          entryType: "payable", entryId: pidStr, batchId: linkBatchId,
          field: "status",
          beforeValue: p.status, afterValue: newStatus,
          branchId: batch.branchId, changedAt: now,
        });
      }
      if (newPaid !== oldPaid || newStatus !== p.status) {
        await ctx.db.patch(pid, { paidAmount: newPaid, status: newStatus });
      }
    }

    if (linkBatchId) {
      await ctx.db.patch(linkBatchId, {
        rowsApplied: linkApplied + autoLinkApplied,
        rowsRejected: 0,
      });
    }

    await ctx.db.patch(batchId, {
      rowCount: rows.length,
      status: "parsed",
      closingBalance: closing,
    });

    const linkSummary = [
      linkApplied > 0 ? `${linkApplied} link manual` : null,
      autoLinkApplied > 0 ? `${autoLinkApplied} link auto` : null,
    ].filter(Boolean).join(" + ");

    await insertAuditLog(ctx, {
      entityType: "bankStatementBatches", entityId: batchId, action: "update",
      description: `Parsed ${rows.length} entries (${batch.accountKind}) from ${batch.fileName}${linkSummary ? ` · ${linkSummary}` : ""}`,
      actedBy: userId, branchId: batch.branchId,
    });

    return {
      inserted: rows.length,
      closingBalance: closing,
      linkApplied,
      autoLinkApplied,
      linkBatchId,
    };
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

    // ─── Close the loop: recompute payable.paidAmount + status from
    // all linked bank entries. Targets each payable that got a new
    // matchedPayableId or paymentReference in this batch.
    const touchedPayableIds = new Set<string>();
    for (const u of updates) {
      if (u.entryType === "bank_entry" && u.matchedPayableId) {
        touchedPayableIds.add(u.matchedPayableId);
      } else if (u.entryType === "payable" && (u.paymentReference !== undefined || u.isValidated)) {
        touchedPayableIds.add(u.entryId);
      }
    }
    for (const pidStr of touchedPayableIds) {
      const pid = pidStr as Id<"payables">;
      const p = await ctx.db.get(pid) as { amount?: number; paidAmount?: number; status?: "open" | "partial" | "paid" | "overdue" } | null;
      if (!p) continue;
      const linkedBanks = await ctx.db.query("bankStatementEntries")
        .withIndex("by_payable", (q) => q.eq("payableId", pid))
        .collect();
      const bankSum = linkedBanks.reduce((s, b) => s + (b.debit ?? 0), 0);
      const oldPaid = p.paidAmount ?? 0;
      const newPaid = Math.min(p.amount ?? 0, bankSum);  // authoritative: bank-entry sum
      const newStatus: "open" | "partial" | "paid" | "overdue" =
        newPaid >= (p.amount ?? 0) ? "paid"
        : newPaid > 0 ? "partial"
        : (p.status ?? "open");
      if (newPaid !== oldPaid) {
        await ctx.db.insert("validationLogs", {
          entryType: "payable", entryId: pidStr, batchId,
          field: "paidAmount",
          beforeValue: String(oldPaid), afterValue: String(newPaid),
          branchId, changedAt: now,
        });
      }
      if (newStatus !== p.status) {
        await ctx.db.insert("validationLogs", {
          entryType: "payable", entryId: pidStr, batchId,
          field: "status",
          beforeValue: p.status, afterValue: newStatus,
          branchId, changedAt: now,
        });
      }
      if (newPaid !== oldPaid || newStatus !== p.status) {
        await ctx.db.patch(pid, { paidAmount: newPaid, status: newStatus });
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

// ─── Auto-match bank entries to payables (rule-based) ───────
//
// Strategy:
//   1. Normalize bank entry counterparty → look up vendorBankAliases or
//      fuzzy match against vendor name list.
//   2. For each candidate vendor, collect open/partial/overdue payables.
//   3. Try EXACT amount match (toleransi Rp 1.000).
//   4. If no exact match, try SUM of payables ≈ bank amount (split paid).
//   5. Tanggal TIDAK strict — bank tx can be before or after invoice.
//   6. Each successful match: assign new paymentReference, write log,
//      set isValidated=true on both sides.

export const autoMatchPayables = mutation({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }): Promise<any> => {
    const userId = await requireAuth(ctx);

    // 1. Load unvalidated bank entries (payable_payment category)
    const allBank = await ctx.db.query("bankStatementEntries")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .take(5000);
    const banks = allBank.filter((b) => b.category === "payable_payment" && !b.isValidated && b.debit > 0);

    // 2. Load open/partial/overdue payables
    const allPay = await ctx.db.query("payables")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .take(2000);
    const payables = allPay.filter((p) =>
      (p.status === "open" || p.status === "partial" || p.status === "overdue") && !p.isValidated
    );

    // 3. Build vendor lookup: alias → vendorId, vendor name → vendorId
    const aliases = await ctx.db.query("vendorBankAliases")
      .withIndex("by_branch_alias", (q) => q.eq("branchId", branchId))
      .take(2000);
    const vendors = await ctx.db.query("vendors").take(2000);
    const aliasMap = new Map<string, string>();
    for (const a of aliases) aliasMap.set(a.alias.toUpperCase().trim(), a.vendorId);
    for (const v of vendors) aliasMap.set(v.name.toUpperCase().trim(), v._id);

    // helper: find vendorId from text via alias or substring
    const findVendorId = (text: string): string | null => {
      const up = text.toUpperCase().trim();
      if (!up) return null;
      const direct = aliasMap.get(up);
      if (direct) return direct;
      for (const [name, id] of aliasMap) {
        if (up.includes(name) || name.includes(up)) return id;
      }
      return null;
    };

    // 4. Group payables by vendor
    const payByVendor = new Map<string, typeof payables>();
    for (const p of payables) {
      const arr = payByVendor.get(p.vendorId) ?? [];
      arr.push(p);
      payByVendor.set(p.vendorId, arr);
    }

    // 5. Create a validation batch for this auto-match run
    const batchId = await ctx.db.insert("validationBatches", {
      fileName: `auto-match-${new Date().toISOString().slice(0, 16)}.json`,
      rowsApplied: 0, rowsRejected: 0,
      branchId, uploadedAt: Date.now(), uploadedBy: userId,
      summary: "auto rule-based match",
    });

    const now = Date.now();
    let applied = 0;
    let rejected = 0;
    let refSeq = 1;
    const refByPayableId = new Map<string, string>();

    const nextRef = (txDate: string, payableId: string) => {
      const existing = refByPayableId.get(payableId);
      if (existing) return existing;
      const ym = txDate.slice(0, 7).replace("-", "");
      const ref = `PMT-${ym}-${String(refSeq++).padStart(4, "0")}`;
      refByPayableId.set(payableId, ref);
      return ref;
    };

    // 6. Group bank entries by inferred vendor + try exact amount first
    type BankEntry = typeof banks[number];
    const banksByVendor = new Map<string, BankEntry[]>();
    const orphanBanks: BankEntry[] = [];
    for (const b of banks) {
      const vendorId = findVendorId(b.counterparty ?? "") ?? findVendorId(b.description);
      if (vendorId) {
        const arr = banksByVendor.get(vendorId) ?? [];
        arr.push(b);
        banksByVendor.set(vendorId, arr);
      } else {
        orphanBanks.push(b);
      }
    }
    rejected += orphanBanks.length;

    const TOL = 1500;
    const matchBank = async (b: BankEntry, payableId: string) => {
      const ref = nextRef(b.txDate, payableId);
      await ctx.db.insert("validationLogs", {
        entryType: "bank_entry", entryId: b._id, batchId,
        field: "paymentReference",
        beforeValue: b.paymentReference, afterValue: ref,
        branchId, changedAt: now,
      });
      await ctx.db.insert("validationLogs", {
        entryType: "bank_entry", entryId: b._id, batchId,
        field: "payableId",
        beforeValue: b.payableId as string | undefined, afterValue: payableId,
        branchId, changedAt: now,
      });
      await ctx.db.insert("validationLogs", {
        entryType: "bank_entry", entryId: b._id, batchId,
        field: "isValidated",
        beforeValue: String(!!b.isValidated), afterValue: "true",
        branchId, changedAt: now,
      });
      await ctx.db.patch(b._id, {
        payableId: payableId as Id<"payables">,
        paymentReference: ref,
        isValidated: true,
      });
    };

    const matchPayable = async (p: typeof payables[number], ref: string) => {
      const cur = await ctx.db.get(p._id) as { paymentReference?: string; isValidated?: boolean } | null;
      if (!cur) return;
      if (cur.paymentReference !== ref) {
        await ctx.db.insert("validationLogs", {
          entryType: "payable", entryId: p._id, batchId,
          field: "paymentReference",
          beforeValue: cur.paymentReference, afterValue: ref,
          branchId, changedAt: now,
        });
      }
      if (!cur.isValidated) {
        await ctx.db.insert("validationLogs", {
          entryType: "payable", entryId: p._id, batchId,
          field: "isValidated",
          beforeValue: "false", afterValue: "true",
          branchId, changedAt: now,
        });
      }
      await ctx.db.patch(p._id, { paymentReference: ref, isValidated: true });
    };

    // 7. Per vendor: match by amount
    for (const [vendorId, vendorBanks] of banksByVendor) {
      const vendorPayables = payByVendor.get(vendorId) ?? [];
      const usedPayables = new Set<string>();

      // 7a. 1-to-1 exact match first
      for (const b of vendorBanks) {
        const candidate = vendorPayables.find((p) =>
          !usedPayables.has(p._id) &&
          Math.abs(p.amount - p.paidAmount - b.debit) <= TOL
        );
        if (candidate) {
          usedPayables.add(candidate._id);
          await matchBank(b, candidate._id);
          await matchPayable(candidate, refByPayableId.get(candidate._id)!);
          applied += 2;
        }
      }

      // 7b. N-to-1 (multiple banks → 1 payable): group remaining banks
      //     by NEAR-equal target amount.
      const remainingBanks = vendorBanks.filter((b) => !b.isValidated && !refByPayableId.has(b._id));
      for (const p of vendorPayables) {
        if (usedPayables.has(p._id)) continue;
        const target = p.amount - p.paidAmount;
        // Greedy: pick smallest subset of remainingBanks that sums close to target.
        // For small N, try all 2-row combinations.
        const candidates = remainingBanks.filter((b) => !b.isValidated && b.debit > 0 && !refByPayableId.has(b._id));
        let matched: BankEntry[] | null = null;
        for (let i = 0; i < candidates.length && !matched; i++) {
          for (let j = i + 1; j < candidates.length; j++) {
            if (Math.abs(candidates[i].debit + candidates[j].debit - target) <= TOL) {
              matched = [candidates[i], candidates[j]];
              break;
            }
            for (let k = j + 1; k < candidates.length; k++) {
              if (Math.abs(candidates[i].debit + candidates[j].debit + candidates[k].debit - target) <= TOL) {
                matched = [candidates[i], candidates[j], candidates[k]];
                break;
              }
            }
          }
        }
        if (matched) {
          usedPayables.add(p._id);
          for (const b of matched) await matchBank(b, p._id);
          await matchPayable(p, refByPayableId.get(p._id)!);
          applied += matched.length + 1;
        }
      }

      // 7c. unmatched banks for this vendor count as rejected
      rejected += vendorBanks.filter((b) => !refByPayableId.has(b._id) === false && false).length;
    }

    await ctx.db.patch(batchId, { rowsApplied: applied, rowsRejected: rejected });

    await insertAuditLog(ctx, {
      entityType: "validationBatches", entityId: batchId, action: "create",
      description: `Auto-match: ${applied} cells applied across ${banksByVendor.size} vendors`,
      actedBy: userId, branchId,
    });

    return { batchId, applied, rejected, vendorsTouched: banksByVendor.size, orphanBanks: orphanBanks.length };
  },
});

// Learn vendor alias from a manual binding (PIC fixes match in UI).
export const learnVendorAlias = mutation({
  args: {
    vendorId: v.id("vendors"),
    alias: v.string(),
    branchId: v.id("branches"),
  },
  handler: async (ctx, { vendorId, alias, branchId }) => {
    await requireAuth(ctx);
    const norm = alias.toUpperCase().trim();
    if (!norm) return { ok: false };
    const existing = await ctx.db.query("vendorBankAliases")
      .withIndex("by_branch_alias", (q) => q.eq("branchId", branchId).eq("alias", norm))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { vendorId, lastSeenAt: Date.now(), seenCount: existing.seenCount + 1 });
    } else {
      await ctx.db.insert("vendorBankAliases", {
        vendorId, alias: norm, source: "manual" as const,
        branchId, lastSeenAt: Date.now(), seenCount: 1,
      });
    }
    return { ok: true };
  },
});

// ─── Commit selected auto-match suggestions ─────────────────
// User approves subset of preview from previewAutoMatch query.

export const commitAutoMatchSuggestions = mutation({
  args: {
    branchId: v.id("branches"),
    matches: v.array(v.object({
      payableId: v.id("payables"),
      bankEntryIds: v.array(v.id("bankStatementEntries")),
    })),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, { branchId, matches, fileName }) => {
    const userId = await requireAuth(ctx);

    const batchId = await ctx.db.insert("validationBatches", {
      fileName: fileName ?? `auto-match-${new Date().toISOString().slice(0, 16)}`,
      rowsApplied: 0, rowsRejected: 0,
      summary: `${matches.length} payables · accepted via preview`,
      branchId, uploadedAt: Date.now(), uploadedBy: userId,
    });

    const now = Date.now();
    let applied = 0;
    let rejected = 0;
    let refSeq = 1;

    for (const m of matches) {
      try {
        const payable = await ctx.db.get(m.payableId) as {
          paymentReference?: string; isValidated?: boolean; vendorId?: Id<"vendors">;
          amount?: number; paidAmount?: number; status?: "open" | "partial" | "paid" | "overdue";
        } | null;
        if (!payable) { rejected++; continue; }

        // Get first bank to derive YYYYMM + collect bank sum
        const firstBank = await ctx.db.get(m.bankEntryIds[0]) as { txDate?: string; counterparty?: string; debit?: number } | null;
        const ym = (firstBank?.txDate ?? new Date().toISOString().slice(0, 10)).slice(0, 7).replace("-", "");
        const ref = `PMT-${ym}-${String(refSeq++).padStart(4, "0")}`;

        // Pre-collect total this match adds to payable.paidAmount
        let matchSum = 0;
        for (const bid of m.bankEntryIds) {
          const bk = await ctx.db.get(bid) as { debit?: number } | null;
          if (bk?.debit) matchSum += bk.debit;
        }

        // Patch each bank entry
        for (const bid of m.bankEntryIds) {
          const cur = await ctx.db.get(bid) as { paymentReference?: string; payableId?: Id<"payables">; isValidated?: boolean; counterparty?: string } | null;
          if (!cur) { rejected++; continue; }

          await ctx.db.insert("validationLogs", {
            entryType: "bank_entry", entryId: bid, batchId,
            field: "paymentReference",
            beforeValue: cur.paymentReference, afterValue: ref,
            branchId, changedAt: now,
          });
          await ctx.db.insert("validationLogs", {
            entryType: "bank_entry", entryId: bid, batchId,
            field: "payableId",
            beforeValue: cur.payableId as string | undefined, afterValue: m.payableId,
            branchId, changedAt: now,
          });
          await ctx.db.insert("validationLogs", {
            entryType: "bank_entry", entryId: bid, batchId,
            field: "isValidated",
            beforeValue: String(!!cur.isValidated), afterValue: "true",
            branchId, changedAt: now,
          });
          await ctx.db.patch(bid, {
            payableId: m.payableId,
            paymentReference: ref,
            isValidated: true,
          });

          // Learn vendor alias for future auto-match
          if (cur.counterparty && payable.vendorId) {
            const aliasNorm = cur.counterparty.toUpperCase().trim();
            if (aliasNorm) {
              const existingAlias = await ctx.db.query("vendorBankAliases")
                .withIndex("by_branch_alias", (q) => q.eq("branchId", branchId).eq("alias", aliasNorm))
                .first();
              if (existingAlias) {
                await ctx.db.patch(existingAlias._id, {
                  vendorId: payable.vendorId,
                  lastSeenAt: now,
                  seenCount: existingAlias.seenCount + 1,
                });
              } else {
                await ctx.db.insert("vendorBankAliases", {
                  vendorId: payable.vendorId,
                  alias: aliasNorm,
                  source: "validation" as const,
                  branchId, lastSeenAt: now, seenCount: 1,
                });
              }
            }
          }
          applied++;
        }

        // Patch payable — close the loop: update paidAmount + status
        if (payable.paymentReference !== ref) {
          await ctx.db.insert("validationLogs", {
            entryType: "payable", entryId: m.payableId, batchId,
            field: "paymentReference",
            beforeValue: payable.paymentReference, afterValue: ref,
            branchId, changedAt: now,
          });
        }
        if (!payable.isValidated) {
          await ctx.db.insert("validationLogs", {
            entryType: "payable", entryId: m.payableId, batchId,
            field: "isValidated",
            beforeValue: "false", afterValue: "true",
            branchId, changedAt: now,
          });
        }

        const oldPaid = payable.paidAmount ?? 0;
        const newPaid = Math.min(payable.amount ?? 0, oldPaid + matchSum);
        const newStatus: "open" | "partial" | "paid" | "overdue" =
          newPaid >= (payable.amount ?? 0) ? "paid"
          : newPaid > 0 ? "partial"
          : (payable.status ?? "open");

        if (newPaid !== oldPaid) {
          await ctx.db.insert("validationLogs", {
            entryType: "payable", entryId: m.payableId, batchId,
            field: "paidAmount",
            beforeValue: String(oldPaid), afterValue: String(newPaid),
            branchId, changedAt: now,
          });
        }
        if (newStatus !== payable.status) {
          await ctx.db.insert("validationLogs", {
            entryType: "payable", entryId: m.payableId, batchId,
            field: "status",
            beforeValue: payable.status, afterValue: newStatus,
            branchId, changedAt: now,
          });
        }

        await ctx.db.patch(m.payableId, {
          paymentReference: ref,
          isValidated: true,
          paidAmount: newPaid,
          status: newStatus,
        });
        applied++;
      } catch {
        rejected++;
      }
    }

    await ctx.db.patch(batchId, { rowsApplied: applied, rowsRejected: rejected });
    await insertAuditLog(ctx, {
      entityType: "validationBatches", entityId: batchId, action: "create",
      description: `Approve auto-match: ${matches.length} payables, ${applied} cells applied`,
      actedBy: userId, branchId,
    });
    return { batchId, applied, rejected };
  },
});

// ─── Delete validation batch + undo all changes ─────────────
// Reverts each cell mutated by this batch to its pre-batch value
// using validationLogs.beforeValue. paidAmount + status are NOT
// reverted directly; instead recomputed from the (post-revert)
// set of linked bank entries — so multi-batch overlaps stay
// consistent. Vendor aliases learned by this batch are kept
// (learned knowledge, not user-data).
export const deleteValidationBatch = mutation({
  args: { batchId: v.id("validationBatches") },
  handler: async (ctx, { batchId }) => {
    const userId = await requireAuth(ctx);
    const batch = await ctx.db.get(batchId);
    if (!batch) throw new Error("Batch validasi tidak ditemukan");

    const logs = await ctx.db.query("validationLogs")
      .withIndex("by_batch", (q) => q.eq("batchId", batchId))
      .collect();

    // For each (entryType, entryId, field) keep the EARLIEST log —
    // its beforeValue is the pre-batch state. Later logs are
    // intermediate steps within the same batch.
    type FieldState = { beforeValue?: string; entryType: "bank_entry" | "payable" | "receipt"; entryId: string };
    const earliestByEntry = new Map<string, Map<string, FieldState>>();
    const sortedLogs = logs.slice().sort((a, b) => a._creationTime - b._creationTime);
    for (const l of sortedLogs) {
      const key = `${l.entryType}:${l.entryId}`;
      let fields = earliestByEntry.get(key);
      if (!fields) {
        fields = new Map();
        earliestByEntry.set(key, fields);
      }
      if (!fields.has(l.field)) {
        fields.set(l.field, { beforeValue: l.beforeValue, entryType: l.entryType, entryId: l.entryId });
      }
    }

    const touchedPayableIds = new Set<string>();
    let reverted = 0;

    for (const [, fields] of earliestByEntry) {
      const firstField = fields.values().next().value as FieldState | undefined;
      if (!firstField) continue;
      const { entryType, entryId } = firstField;

      try {
        if (entryType === "bank_entry") {
          const id = entryId as Id<"bankStatementEntries">;
          const cur = await ctx.db.get(id);
          if (!cur) continue;
          const patch: {
            paymentReference?: string;
            payableId?: Id<"payables">;
            isValidated?: boolean;
          } = {};
          if (fields.has("paymentReference")) {
            patch.paymentReference = fields.get("paymentReference")!.beforeValue;
          }
          if (fields.has("payableId")) {
            const before = fields.get("payableId")!.beforeValue;
            patch.payableId = before ? (before as Id<"payables">) : undefined;
            if (cur.payableId) touchedPayableIds.add(cur.payableId);
            if (before) touchedPayableIds.add(before);
          }
          if (fields.has("isValidated")) {
            patch.isValidated = fields.get("isValidated")!.beforeValue === "true";
          }
          await ctx.db.patch(id, patch);
          reverted++;
        } else if (entryType === "payable") {
          const id = entryId as Id<"payables">;
          const cur = await ctx.db.get(id);
          if (!cur) continue;
          const patch: { paymentReference?: string; isValidated?: boolean } = {};
          if (fields.has("paymentReference")) {
            patch.paymentReference = fields.get("paymentReference")!.beforeValue;
          }
          if (fields.has("isValidated")) {
            patch.isValidated = fields.get("isValidated")!.beforeValue === "true";
          }
          if (Object.keys(patch).length > 0) await ctx.db.patch(id, patch);
          touchedPayableIds.add(entryId);
          reverted++;
        }
      } catch {
        // best-effort revert; continue on individual failures
      }
    }

    // Recompute paidAmount + status from current bank entries for
    // every payable that was unlinked OR mutated in this batch.
    for (const pidStr of touchedPayableIds) {
      const pid = pidStr as Id<"payables">;
      const p = await ctx.db.get(pid) as {
        amount?: number; paidAmount?: number;
        status?: "open" | "partial" | "paid" | "overdue";
      } | null;
      if (!p) continue;
      const linkedBanks = await ctx.db.query("bankStatementEntries")
        .withIndex("by_payable", (q) => q.eq("payableId", pid))
        .collect();
      const bankSum = linkedBanks.reduce((s, b) => s + (b.debit ?? 0), 0);
      const newPaid = Math.min(p.amount ?? 0, bankSum);
      const newStatus: "open" | "partial" | "paid" | "overdue" =
        newPaid >= (p.amount ?? 0) && (p.amount ?? 0) > 0 ? "paid"
        : newPaid > 0 ? "partial"
        : "open";
      if (newPaid !== (p.paidAmount ?? 0) || newStatus !== p.status) {
        await ctx.db.patch(pid, { paidAmount: newPaid, status: newStatus });
      }
    }

    for (const l of logs) await ctx.db.delete(l._id);

    if (batch.fileStorageId) {
      try { await ctx.storage.delete(batch.fileStorageId); } catch { /* file may already be gone */ }
    }

    await ctx.db.delete(batchId);

    await insertAuditLog(ctx, {
      entityType: "validationBatches", entityId: batchId, action: "delete",
      description: `Undo & hapus batch validasi ${batch.fileName} — ${reverted} entry direvert (${logs.length} log)`,
      actedBy: userId, branchId: batch.branchId,
    });

    return { reverted, logsDeleted: logs.length, payablesRecomputed: touchedPayableIds.size };
  },
});
