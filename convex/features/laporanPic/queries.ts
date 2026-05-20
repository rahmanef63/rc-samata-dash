import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

// Riwayat chronological — union of payables + paymentReceipts + ownerTransfers
// across a given branch. UI groups + filters client-side; we just give the
// raw stream so different tabs can reuse it.
export const listRiwayatTransaksi = query({
  args: { branchId: v.id("branches"), limit: v.optional(v.number()) },
  handler: async (ctx, { branchId, limit }) => {
    await requireAuth(ctx);
    const cap = limit ?? 2000;

    const payables = await ctx.db.query("payables")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .take(cap);
    const receipts = await ctx.db.query("paymentReceipts")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .take(cap);
    const transfers = await ctx.db.query("ownerTransfers")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .take(cap);

    return { payables, receipts, transfers };
  },
});

// Anomaly receipts — flagged at import time. UI shows these so user
// can clean up MISLABEL / DUPLIKAT / NOT_TRANSFER rows.
export const listAnomalyReceipts = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    const all = await ctx.db.query("paymentReceipts")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .take(5000);
    return all.filter((r) => r.anomalyFlag && r.anomalyFlag !== "ok");
  },
});

// Matching report — derive pivot view (1 payable + matched receipts)
// from current data state. Mirrors the user's offline MATCH_PIUTANG
// CSV so they can export back the system-of-record version.
export const listMatchingReport = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    const payables = await ctx.db.query("payables")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .take(5000);
    const receipts = await ctx.db.query("paymentReceipts")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .take(5000);
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
