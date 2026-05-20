import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

// Unified ledger view — UNION + normalize rows from every cash-flow
// table into a single shape so the Buku Besar UI can paint one table
// regardless of source. The kind discriminator lets the UI filter +
// the bulk-edit dispatcher route patches back to the correct source.

export const listBukuBesar = query({
  args: { branchId: v.id("branches"), limit: v.optional(v.number()) },
  handler: async (ctx, { branchId, limit }) => {
    await requireAuth(ctx);
    const cap = limit ?? 5000;

    const payables = await ctx.db.query("payables")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .take(cap);
    const receipts = await ctx.db.query("paymentReceipts")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .take(cap);
    const transfers = await ctx.db.query("ownerTransfers")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .take(cap);
    const closings = await ctx.db.query("dailyClosings")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .take(cap);

    type Row = {
      id: string;
      sourceTable: "payables" | "paymentReceipts" | "ownerTransfers" | "dailyClosings";
      kind: "tagihan" | "bayar" | "setoran" | "transfer" | "anomali";
      date: string;
      direction: "in" | "out" | "transfer";
      kategori: string;
      counterparty: string;
      amount: number;
      sisa: number;
      status: string;
      reference: string;
      fileRef: string;
      notes: string;
      anomalyFlag: string;
    };

    const rows: Row[] = [];

    for (const p of payables) {
      rows.push({
        id: p._id,
        sourceTable: "payables",
        kind: "tagihan",
        date: p.invoiceDate,
        direction: "in",
        kategori: "Tagihan Vendor",
        counterparty: p.vendorName,
        amount: p.amount,
        sisa: Math.max(0, p.amount - p.paidAmount),
        status: p.status,
        reference: p.paymentReference ?? "",
        fileRef: p.refPdfFile ?? "",
        notes: p.description ?? "",
        anomalyFlag: "",
      });
    }

    for (const r of receipts) {
      const isAnomaly = !!r.anomalyFlag && r.anomalyFlag !== "ok";
      rows.push({
        id: r._id,
        sourceTable: "paymentReceipts",
        kind: isAnomaly ? "anomali" : "bayar",
        date: r.paidDate,
        direction: "out",
        kategori: isAnomaly ? `Anomali · ${r.anomalyFlag}` : "Bayar Piutang",
        counterparty: r.payableId ? `(linked: ${r.payableId.slice(-6)})` : "(unlinked)",
        amount: r.amount,
        sisa: 0,
        status: r.payableId ? "linked" : "unlinked",
        reference: r.reference ?? r.bankAccount ?? "",
        fileRef: r.proofFileName ?? "",
        notes: r.notes ?? "",
        anomalyFlag: r.anomalyFlag ?? "",
      });
    }

    for (const t of transfers) {
      rows.push({
        id: t._id,
        sourceTable: "ownerTransfers",
        kind: "transfer",
        date: t.transferDate,
        direction: "transfer",
        kategori: t.direction === "branch_to_owner" ? "Setoran → Owner" : "Dana ← Owner",
        counterparty: t.direction === "branch_to_owner" ? "OWNER" : "OWNER (incoming)",
        amount: t.amount,
        sisa: 0,
        status: t.status,
        reference: t.referenceNo ?? "",
        fileRef: "",
        notes: t.description ?? "",
        anomalyFlag: "",
      });
    }

    for (const c of closings) {
      rows.push({
        id: c._id,
        sourceTable: "dailyClosings",
        kind: "setoran",
        date: c.businessDate,
        direction: "transfer",
        kategori: "Setoran Harian",
        counterparty: "(closing kasir)",
        amount: c.cashSales + c.nonCashSales,
        sisa: c.difference,
        status: c.status,
        reference: "",
        fileRef: "",
        notes: `Opening ${c.openingCash} · Expected ${c.expectedCash} · Actual ${c.actualCash}`,
        anomalyFlag: c.difference !== 0 ? "variance" : "",
      });
    }

    rows.sort((a, b) => b.date.localeCompare(a.date));

    return rows;
  },
});

// Counts per kind for filter-chip badges
export const countBukuBesar = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    const payables = await ctx.db.query("payables")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId)).take(5000);
    const receipts = await ctx.db.query("paymentReceipts")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId)).take(5000);
    const transfers = await ctx.db.query("ownerTransfers")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId)).take(5000);
    const closings = await ctx.db.query("dailyClosings")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId)).take(5000);
    const anomalyCount = receipts.filter((r) => r.anomalyFlag && r.anomalyFlag !== "ok").length;
    return {
      tagihan: payables.length,
      bayar: receipts.length - anomalyCount,
      transfer: transfers.length,
      setoran: closings.length,
      anomali: anomalyCount,
      total: payables.length + receipts.length + transfers.length + closings.length,
    };
  },
});
