import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { LIMITS } from "../../shared/limits";

// Returns the system-side numbers for a given (branch, date) so the
// UI can compare against the WhatsApp paste. Joins dailyCashSummary
// + salesControl + productSales + bankStatementEntries + dailyClosings.
export const getDailyCheckData = query({
  args: { branchId: v.id("branches"), businessDate: v.string() },
  handler: async (ctx, { branchId, businessDate }) => {
    await requireAuth(ctx);

    const dailyCash = await ctx.db.query("dailyCashSummary")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId).eq("businessDate", businessDate))
      .first();

    const salesControl = await ctx.db.query("salesControl")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId).eq("businessDate", businessDate))
      .first();

    const productSalesRows = await ctx.db.query("productSales")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId).eq("businessDate", businessDate))
      .take(LIMITS.STAGING_PAGE);

    const dailyClosing = await ctx.db.query("dailyClosings")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId).eq("businessDate", businessDate))
      .first();

    const bankEntries = await ctx.db.query("bankStatementEntries")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId).eq("txDate", businessDate))
      .take(LIMITS.CLOSINGS_PAGE);

    // Per-channel sales rollup from productSales
    const channelTotals: Record<string, number> = {};
    for (const r of productSalesRows) {
      const ch = (r.channel ?? "all").toLowerCase();
      channelTotals[ch] = (channelTotals[ch] ?? 0) + (r.amount ?? 0);
    }

    // Sum bank inflow per channel for cross-check vs Transfer Online Owner format
    const bankInflowByChannel: Record<string, number> = {};
    for (const b of bankEntries) {
      if (b.category !== "sales_inflow") continue;
      const ch = (b.channel ?? "other").toLowerCase();
      bankInflowByChannel[ch] = (bankInflowByChannel[ch] ?? 0) + (b.credit ?? 0);
    }

    const sales = salesControl?.netSales ?? dailyCash?.netSales ?? 0;
    const customerCount = salesControl?.customerCount ?? 0;
    const cashSales = dailyClosing?.cashSales ?? 0;
    const nonCashSales = dailyClosing?.nonCashSales ?? 0;
    // MTD: sum salesControl.netSales for same month up to date
    const ym = businessDate.slice(0, 7); // YYYY-MM
    const monthSalesControl = await ctx.db.query("salesControl")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .take(2000);
    const mtdCumulative = monthSalesControl
      .filter((s) => s.businessDate.startsWith(ym) && s.businessDate <= businessDate)
      .reduce((acc, s) => acc + (s.netSales ?? 0), 0);

    return {
      businessDate,
      sales,
      cashSales,
      nonCashSales,
      onlineFromProductSales:
        (channelTotals.gofood ?? 0) +
        (channelTotals.grabfood ?? 0) +
        (channelTotals.shopeefood ?? 0) +
        (channelTotals.ovo ?? 0) +
        (channelTotals.dana ?? 0) +
        (channelTotals.qris ?? 0),
      channelTotals,
      bankInflowByChannel,
      customerCount,
      mtdCumulative,
      hasDailyCash: !!dailyCash,
      hasSalesControl: !!salesControl,
      hasDailyClosing: !!dailyClosing,
    };
  },
});

export const listDailyReportValidations = query({
  args: {
    branchId: v.id("branches"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { branchId, limit }) => {
    await requireAuth(ctx);
    return await ctx.db.query("dailyReportValidations")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .order("desc")
      .take(limit ?? 50);
  },
});
