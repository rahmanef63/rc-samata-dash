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
  counterparty: v.optional(v.string()),
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
        counterparty: r.counterparty,
        batchId,
        branchId: batch.branchId,
      });
      closing = r.balance > 0 ? r.balance : closing + r.credit - r.debit;

      // Seed vendor alias if counterparty contains an existing vendor name.
      if (r.counterparty && r.category === "payable_payment") {
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
