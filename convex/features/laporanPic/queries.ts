import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { LIMITS } from "../../shared/limits";

// Riwayat chronological — union of payables + paymentReceipts + ownerTransfers.
// UI groups + filters client-side; we just give the raw stream so different
// tabs can reuse it.
export const listRiwayatTransaksi = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await requireAuth(ctx);
    const cap = limit ?? 2000;

    const payables = await ctx.db.query("payables").take(cap);
    const receipts = await ctx.db.query("paymentReceipts")
      .withIndex("by_date")
      .take(cap);
    const transfers = await ctx.db.query("ownerTransfers").take(cap);

    return { payables, receipts, transfers };
  },
});

// Anomaly receipts — flagged at import time. UI shows these so user
// can clean up MISLABEL / DUPLIKAT / NOT_TRANSFER rows.
export const listAnomalyReceipts = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const all = await ctx.db.query("paymentReceipts")
      .withIndex("by_date")
      .take(LIMITS.RECEIPTS_PAGE);
    return all.filter((r) => r.anomalyFlag && r.anomalyFlag !== "ok");
  },
});

// Matching report — derive pivot view (1 payable + matched receipts)
// from current data state. Mirrors the user's offline MATCH_PIUTANG
// CSV so they can export back the system-of-record version.
export const listMatchingReport = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const payables = await ctx.db.query("payables").take(LIMITS.PAYABLES_PAGE);
    const receipts = await ctx.db.query("paymentReceipts")
      .withIndex("by_date")
      .take(LIMITS.RECEIPTS_PAGE);
    const receiptsByPayable = new Map<string, typeof receipts>();
    for (const r of receipts) {
      if (!r.payableId) continue;
      const arr = receiptsByPayable.get(r.payableId) ?? [];
      arr.push(r);
      receiptsByPayable.set(r.payableId, arr);
    }
    return payables.map((p) => ({
      payable: p,
      receipts: receiptsByPayable.get(p._id) ?? [],
    }));
  },
});
