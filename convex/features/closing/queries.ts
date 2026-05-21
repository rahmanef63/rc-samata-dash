import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { normalizeAlias, looseEqual } from "../../shared/normalize";
import { LIMITS } from "../../shared/limits";
import { MATCH } from "../../projectConstants";

export const getClosingByDate = query({
  args: { branchId: v.id("branches"), businessDate: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("dailyClosings")
      .withIndex("by_branch_date", (q) => q.eq("branchId", args.branchId).eq("businessDate", args.businessDate))
      .unique();
  },
});

export const listClosings = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("dailyClosings")
      .withIndex("by_branch_date", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .take(LIMITS.CLOSINGS_PAGE);
  },
});

export const listTransfers = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("ownerTransfers")
      .withIndex("by_branch", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .take(50);
  },
});

// ─── Payment receipts ───────────────────────────────────────

export const listPaymentReceipts = query({
  args: { branchId: v.id("branches"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const rows = await ctx.db.query("paymentReceipts")
      .withIndex("by_branch_date", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .take(args.limit ?? 100);
    return rows;
  },
});

export const getReceiptProofUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await requireAuth(ctx);
    return await ctx.storage.getUrl(storageId);
  },
});

export const listOpenPayables = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    const all = await ctx.db.query("payables")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .take(500);
    return all.filter((p) => p.status === "open" || p.status === "partial" || p.status === "overdue");
  },
});

// ─── Bank statement batches ─────────────────────────────────

export const listBankStatementBatches = query({
  args: {
    branchId: v.id("branches"),
    accountKind: v.optional(v.union(v.literal("owner"), v.literal("pic"))),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (args.accountKind) {
      return await ctx.db.query("bankStatementBatches")
        .withIndex("by_branch_account", (q) => q.eq("branchId", args.branchId).eq("accountKind", args.accountKind!))
        .order("desc")
        .take(50);
    }
    return await ctx.db.query("bankStatementBatches")
      .withIndex("by_branch_account", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .take(50);
  },
});

export const listBankStatementEntries = query({
  args: { batchId: v.id("bankStatementBatches") },
  handler: async (ctx, { batchId }) => {
    await requireAuth(ctx);
    return await ctx.db.query("bankStatementEntries")
      .withIndex("by_batch", (q) => q.eq("batchId", batchId))
      .take(LIMITS.BANK_ENTRIES_PAGE);
  },
});

// ─── Validation (reconciliation) ───────────────────────────

export const listValidationCandidates = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    // Open / partial / overdue payables not yet validated
    const payablesAll = await ctx.db.query("payables")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .take(1000);
    const payables = payablesAll.filter((p) =>
      (p.status === "open" || p.status === "partial" || p.status === "overdue" || (p.paidAmount > 0 && !p.isValidated))
    );
    // Bank entries with payable_payment category not yet validated
    const bankAll = await ctx.db.query("bankStatementEntries")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .take(LIMITS.BANK_ENTRIES_PAGE);
    const bank = bankAll.filter((b) =>
      b.category === "payable_payment" && !b.isValidated
    );
    // Vendor master + aliases — gives AI knowledge of every known vendor,
    // even ones without open payables, so it can correctly skip orphans
    // instead of forcing wrong matches.
    const vendors = await ctx.db.query("vendors").take(LIMITS.VENDORS_PAGE);
    const aliases = await ctx.db.query("vendorBankAliases")
      .withIndex("by_branch_alias", (q) => q.eq("branchId", branchId))
      .take(LIMITS.ALIASES_PAGE);
    const aliasByVendor = new Map<string, string[]>();
    for (const a of aliases) {
      const arr = aliasByVendor.get(a.vendorId) ?? [];
      if (!arr.includes(a.alias)) arr.push(a.alias);
      aliasByVendor.set(a.vendorId, arr);
    }
    const vendorMaster = vendors.map((v) => ({
      name: v.name,
      aliases: aliasByVendor.get(v._id) ?? [],
    }));
    return { payables, bank, vendorMaster };
  },
});

export const listValidationBatches = query({
  args: { branchId: v.id("branches"), limit: v.optional(v.number()) },
  handler: async (ctx, { branchId, limit }) => {
    await requireAuth(ctx);
    return await ctx.db.query("validationBatches")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .order("desc")
      .take(limit ?? 30);
  },
});

export const listValidationLogs = query({
  args: {
    branchId: v.id("branches"),
    batchId: v.optional(v.id("validationBatches")),
    entryType: v.optional(v.union(v.literal("bank_entry"), v.literal("payable"), v.literal("receipt"))),
    entryId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (args.batchId) {
      return await ctx.db.query("validationLogs")
        .withIndex("by_batch", (q) => q.eq("batchId", args.batchId!))
        .take(LIMITS.AUDIT_PAGE);
    }
    if (args.entryType && args.entryId) {
      return await ctx.db.query("validationLogs")
        .withIndex("by_entry", (q) => q.eq("entryType", args.entryType!).eq("entryId", args.entryId!))
        .order("desc")
        .take(50);
    }
    return await ctx.db.query("validationLogs")
      .withIndex("by_branch", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .take(100);
  },
});

// ─── Auto-match preview (read-only) ─────────────────────────
// Returns proposed matches without writing. UI uses this to show
// approve/deny per row before user commits.

export const previewAutoMatch = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);

    const allBank = await ctx.db.query("bankStatementEntries")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .take(LIMITS.BANK_ENTRIES_PAGE);
    const banks = allBank.filter((b) =>
      b.category === "payable_payment" && !b.isValidated && b.debit > 0
    );

    const allPay = await ctx.db.query("payables")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .take(LIMITS.PAYABLES_PAGE);
    const payables = allPay.filter((p) =>
      (p.status === "open" || p.status === "partial" || p.status === "overdue") && !p.isValidated
    );

    const aliases = await ctx.db.query("vendorBankAliases")
      .withIndex("by_branch_alias", (q) => q.eq("branchId", branchId))
      .take(LIMITS.ALIASES_PAGE);
    const vendors = await ctx.db.query("vendors").take(LIMITS.VENDORS_PAGE);

    type AliasIdx = { name: string; vendorId: string };
    const aliasIndex: AliasIdx[] = [];
    for (const a of aliases) aliasIndex.push({ name: normalizeAlias(a.alias), vendorId: a.vendorId });
    for (const v of vendors) {
      // Strip common corporate suffixes for better substring match
      const cleaned = v.name.toUpperCase().replace(/\b(INDONES(IA)?|CV|PT|TBK)\b/g, "").trim();
      aliasIndex.push({ name: cleaned, vendorId: v._id });
      aliasIndex.push({ name: normalizeAlias(v.name), vendorId: v._id });
    }

    const findVendorId = (text: string): string | null => {
      const up = normalizeAlias(text);
      if (!up) return null;
      // Longest-first scan
      const sorted = aliasIndex.slice().sort((a, b) => b.name.length - a.name.length);
      for (const { name, vendorId } of sorted) {
        if (name.length < 3) continue;
        if (looseEqual(up, name)) return vendorId;
      }
      return null;
    };

    const payByVendor = new Map<string, typeof payables>();
    for (const p of payables) {
      const arr = payByVendor.get(p.vendorId) ?? [];
      arr.push(p);
      payByVendor.set(p.vendorId, arr);
    }

    type Suggestion = {
      payableId: string;
      bankEntryIds: string[];
      vendor: string;
      vendorId: string;
      payableAmount: number;
      payableRemaining: number;
      bankSum: number;
      diff: number;
      confidence: "exact" | "split2" | "split3";
      bankRows: { id: string; txDate: string; debit: number; counterparty: string; description: string }[];
      payableRow: { id: string; invoiceDate: string; amount: number; paidAmount: number; description: string };
    };
    const suggestions: Suggestion[] = [];
    const usedBankIds = new Set<string>();

    type BankEntry = typeof banks[number];
    const banksByVendor = new Map<string, BankEntry[]>();
    const orphans: BankEntry[] = [];
    for (const b of banks) {
      const vid = findVendorId(b.counterparty ?? "") ?? findVendorId(b.description);
      if (vid) {
        const arr = banksByVendor.get(vid) ?? [];
        arr.push(b);
        banksByVendor.set(vid, arr);
      } else {
        orphans.push(b);
      }
    }

    const TOL = MATCH.TOLERANCE_RP;

    for (const [vendorId, vendorBanks] of banksByVendor) {
      const vendorPayables = (payByVendor.get(vendorId) ?? []).slice();
      const usedPayables = new Set<string>();

      // 1-to-1 exact
      for (const b of vendorBanks) {
        if (usedBankIds.has(b._id)) continue;
        const candidate = vendorPayables.find((p) => {
          if (usedPayables.has(p._id)) return false;
          const remaining = p.amount - p.paidAmount;
          return Math.abs(remaining - b.debit) <= TOL;
        });
        if (candidate) {
          usedPayables.add(candidate._id);
          usedBankIds.add(b._id);
          suggestions.push({
            payableId: candidate._id,
            bankEntryIds: [b._id],
            vendor: candidate.vendorName,
            vendorId,
            payableAmount: candidate.amount,
            payableRemaining: candidate.amount - candidate.paidAmount,
            bankSum: b.debit,
            diff: candidate.amount - candidate.paidAmount - b.debit,
            confidence: "exact",
            bankRows: [{ id: b._id, txDate: b.txDate, debit: b.debit, counterparty: b.counterparty ?? "", description: b.description }],
            payableRow: { id: candidate._id, invoiceDate: candidate.invoiceDate, amount: candidate.amount, paidAmount: candidate.paidAmount, description: candidate.description },
          });
        }
      }

      // 2-row + 3-row split
      for (const p of vendorPayables) {
        if (usedPayables.has(p._id)) continue;
        const target = p.amount - p.paidAmount;
        const candidates = vendorBanks.filter((b) => !usedBankIds.has(b._id) && b.debit > 0);
        let matched: BankEntry[] | null = null;
        outer: for (let i = 0; i < candidates.length; i++) {
          for (let j = i + 1; j < candidates.length; j++) {
            if (Math.abs(candidates[i].debit + candidates[j].debit - target) <= TOL) {
              matched = [candidates[i], candidates[j]]; break outer;
            }
            for (let k = j + 1; k < candidates.length; k++) {
              if (Math.abs(candidates[i].debit + candidates[j].debit + candidates[k].debit - target) <= TOL) {
                matched = [candidates[i], candidates[j], candidates[k]]; break outer;
              }
            }
          }
        }
        if (matched) {
          usedPayables.add(p._id);
          for (const b of matched) usedBankIds.add(b._id);
          const bankSum = matched.reduce((s, b) => s + b.debit, 0);
          suggestions.push({
            payableId: p._id,
            bankEntryIds: matched.map((b) => b._id),
            vendor: p.vendorName,
            vendorId,
            payableAmount: p.amount,
            payableRemaining: target,
            bankSum,
            diff: target - bankSum,
            confidence: matched.length === 2 ? "split2" : "split3",
            bankRows: matched.map((b) => ({ id: b._id, txDate: b.txDate, debit: b.debit, counterparty: b.counterparty ?? "", description: b.description })),
            payableRow: { id: p._id, invoiceDate: p.invoiceDate, amount: p.amount, paidAmount: p.paidAmount, description: p.description },
          });
        }
      }
    }

    return {
      suggestions,
      orphans: orphans.map((b) => ({ id: b._id, txDate: b.txDate, debit: b.debit, counterparty: b.counterparty ?? "", description: b.description })),
      stats: {
        payableTotal: payables.length,
        bankTotal: banks.length,
        suggestedPayables: suggestions.length,
        suggestedBankRows: suggestions.reduce((s, x) => s + x.bankEntryIds.length, 0),
        orphanBanks: orphans.length,
      },
    };
  },
});
