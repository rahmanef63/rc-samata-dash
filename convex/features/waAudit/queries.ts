import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

export const listWaReports = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { startDate, endDate, limit }) => {
    await requireAuth(ctx);
    const rows = await ctx.db.query("waReportDaily").withIndex("by_date").order("desc").take(limit ?? 200);
    if (!startDate && !endDate) return rows;
    return rows.filter((r) => {
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      return true;
    });
  },
});

export const listWaOnline = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await requireAuth(ctx);
    return await ctx.db.query("waOnlineDaily").withIndex("by_date").order("desc").take(limit ?? 200);
  },
});

export const listWaPosition = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await requireAuth(ctx);
    return await ctx.db.query("waPositionDaily").withIndex("by_date").order("desc").take(limit ?? 200);
  },
});

export const listMismatches = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const [waReports, dailySummaries] = await Promise.all([
      ctx.db.query("waReportDaily").order("desc").take(500),
      ctx.db.query("dailyCashSummary").take(2000),
    ]);

    // Map xlsx daily summary by date for cross-check
    const xlsxByDate = new Map<string, typeof dailySummaries[number]>();
    for (const s of dailySummaries) {
      // Take first/latest per date (heuristic — single-tenant)
      if (!xlsxByDate.has(s.businessDate)) xlsxByDate.set(s.businessDate, s);
    }

    type Row = {
      _id: string;
      date: string;
      sender: string;
      matchStatus: string;
      waSalesCash?: number;
      waSalesNonCash?: number;
      xlsxGrossSales?: number;
      xlsxCashIn?: number;
      diffCash?: number;
      diffTotal?: number;
    };

    return waReports.map((wa): Row => {
      const xlsx = xlsxByDate.get(wa.date);
      const xlsxGross = xlsx?.grossSales;
      const xlsxCashIn = xlsx?.netSales; // proxy — dailyCashSummary doesn't expose cash split
      const waTotal = (wa.salesCash ?? 0) + (wa.salesNonCash ?? 0);
      const diffCash =
        wa.salesCash != null && xlsxCashIn != null ? wa.salesCash - xlsxCashIn : undefined;
      const diffTotal =
        xlsxGross != null && waTotal > 0 ? waTotal - xlsxGross : undefined;
      return {
        _id: wa._id,
        date: wa.date,
        sender: wa.sender,
        matchStatus: wa.matchStatus,
        waSalesCash: wa.salesCash,
        waSalesNonCash: wa.salesNonCash,
        xlsxGrossSales: xlsxGross,
        xlsxCashIn: xlsxCashIn,
        diffCash,
        diffTotal,
      };
    });
  },
});
