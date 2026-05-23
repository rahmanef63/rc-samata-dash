import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { LIMITS } from "../../shared/limits";

export const listByBranch = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("payables").order("desc").take(100);
  },
});

export const getById = query({
  args: { id: v.id("payables") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const listByVendor = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("payables").withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId)).order("desc").take(100);
  },
});

export const listPayments = query({
  args: { payableId: v.id("payables") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("payablePayments").withIndex("by_payable", (q) => q.eq("payableId", args.payableId)).take(100);
  },
});

// ─── Vendor Hub: list vendors with payables + payments aggregate ──
// Returns vendor master rows augmented with derived counters so the
// /finance/vendors list can show "Total Piutang", "Overdue", "Last
// Invoice" without N+1 client queries.
export const listVendorsWithAggregate = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    const vendors = await ctx.db.query("vendors").take(LIMITS.VENDORS_PAGE);
    const payables = await ctx.db.query("payables").take(LIMITS.PAYABLES_PAGE);
    const aliases = await ctx.db.query("vendorBankAliases").take(LIMITS.ALIASES_PAGE);

    const payablesByVendor = new Map<string, typeof payables>();
    for (const p of payables) {
      const arr = payablesByVendor.get(p.vendorId) ?? [];
      arr.push(p);
      payablesByVendor.set(p.vendorId, arr);
    }
    const aliasCountByVendor = new Map<string, number>();
    for (const a of aliases) {
      aliasCountByVendor.set(a.vendorId, (aliasCountByVendor.get(a.vendorId) ?? 0) + 1);
    }

    const todayIso = new Date().toISOString().slice(0, 10);

    return vendors.map((v) => {
      const ps = payablesByVendor.get(v._id) ?? [];
      const open = ps.filter((p) => p.status === "open" || p.status === "partial" || p.status === "overdue");
      const overdue = ps.filter((p) => p.dueDate && p.dueDate < todayIso && p.status !== "paid").length;
      const openTotal = open.reduce((s, p) => s + (p.amount - p.paidAmount), 0);
      const lastInvoice = ps.length > 0 ? ps.map((p) => p.invoiceDate).sort().slice(-1)[0] : null;
      return {
        ...v,
        payableCount: ps.length,
        openCount: open.length,
        overdueCount: overdue,
        openTotal,
        lastInvoice,
        aliasCount: aliasCountByVendor.get(v._id) ?? 0,
      };
    });
  },
});

// ─── Vendor detail: piutang + payments + aliases + linked statement entries
export const getVendorDetail = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, { vendorId }) => {
    await requireAuth(ctx);

    const vendor = await ctx.db.get(vendorId);
    if (!vendor) return null;

    const payables = await ctx.db.query("payables")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendorId))
      .take(LIMITS.PAYABLES_PAGE);

    const payments: Array<{
      payableId: string;
      paymentDate: string;
      amount: number;
      method: string;
      referenceNo: string;
      source: "manual";
    }> = [];
    const linkedBankEntries: Array<{
      _id: string;
      payableId: string;
      txDate: string;
      debit: number;
      credit: number;
      counterparty?: string;
      description: string;
      accountKind: string;
      paymentReference?: string;
    }> = [];

    for (const p of payables) {
      const pays = await ctx.db.query("payablePayments")
        .withIndex("by_payable", (q) => q.eq("payableId", p._id))
        .take(200);
      for (const pay of pays) {
        payments.push({
          payableId: p._id,
          paymentDate: pay.paymentDate,
          amount: pay.amount,
          method: pay.method,
          referenceNo: pay.referenceNo,
          source: "manual" as const,
        });
      }
      const banks = await ctx.db.query("bankStatementEntries")
        .withIndex("by_payable", (q) => q.eq("payableId", p._id))
        .take(200);
      for (const b of banks) {
        linkedBankEntries.push({
          _id: b._id,
          payableId: p._id,
          txDate: b.txDate,
          debit: b.debit,
          credit: b.credit,
          counterparty: b.counterparty,
          description: b.description,
          accountKind: b.accountKind,
          paymentReference: b.paymentReference,
        });
      }
    }

    const aliases = await ctx.db.query("vendorBankAliases")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendorId))
      .take(500);

    return {
      vendor,
      payables,
      payments,
      linkedBankEntries,
      aliases,
    };
  },
});
