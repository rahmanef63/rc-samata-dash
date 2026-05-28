/**
 * Dashboard queries — aggregates from uploaded report data.
 * Replaces mock data in dashboard components.
 */
import { query, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import type { Id } from "../../_generated/dataModel";

/**
 * Sales trend for the last 7 days of uploaded data.
 * Groups productSales by businessDate, sums amounts.
 */
export const getWeeklySalesTrend = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    await requireAuth(ctx);

    const sales = await ctx.db.query("productSales").collect();

    const byDate: Record<string, number> = {};
    for (const s of sales) {
      if (startDate != null && endDate != null) {
        const t = Date.parse(s.businessDate);
        if (!Number.isFinite(t) || t < startDate || t >= endDate) continue;
      }
      byDate[s.businessDate] = (byDate[s.businessDate] ?? 0) + s.amount;
    }

    const entries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
    // If no explicit range, keep legacy "last 7 days" behavior.
    const sliced = startDate != null ? entries : entries.slice(-7);

    return sliced.map(([date, value]) => ({
      label: date.slice(5),
      date,
      value,
    }));
  },
});

export const getWeeklySalesTrendInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    const sales = await ctx.db.query("productSales").collect();

    const byDate: Record<string, number> = {};
    for (const s of sales) {
      byDate[s.businessDate] = (byDate[s.businessDate] ?? 0) + s.amount;
    }

    const sorted = Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7)
      .reverse();

    return sorted.map(([date, value]) => ({
      label: date.slice(5),
      date,
      value,
    }));
  },
});

/**
 * Sales trend for last 30 days (from dailyCashSummary).
 */
export const getMonthlySalesTrend = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    await requireAuth(ctx);

    const sales = await ctx.db.query("productSales").collect();

    const byDate: Record<string, number> = {};
    for (const sale of sales) {
      if (startDate != null && endDate != null) {
        const t = Date.parse(sale.businessDate);
        if (!Number.isFinite(t) || t < startDate || t >= endDate) continue;
      }
      byDate[sale.businessDate] = (byDate[sale.businessDate] ?? 0) + sale.amount;
    }

    const entries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
    const sliced = startDate != null ? entries : entries.slice(-30);

    return sliced.map(([date, value]) => ({
      label: date.slice(8),
      date,
      value,
    }));
  },
});

export const getMonthlySalesTrendInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    const sales = await ctx.db.query("productSales").collect();

    const byDate: Record<string, number> = {};
    for (const sale of sales) {
      byDate[sale.businessDate] = (byDate[sale.businessDate] ?? 0) + sale.amount;
    }

    const sorted = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30);

    return sorted.map(([date, value]) => ({
      label: date.slice(8),
      date,
      value,
    }));
  },
});

/**
 * Expense breakdown from foodCostSummary + LPKK expenses.
 */
export const getExpenseBreakdown = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    // Get the latest report for aggregation
    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_uploadedAt")
      .order("desc")
      .take(4); // Last 4 weekly reports ~ 1 month

    if (reports.length === 0) return [];

    const reportIds = new Set(reports.map((r) => r._id));

    // Food cost summaries — sum usageValue per category
    const fcSummaries = await ctx.db.query("foodCostSummary").collect();

    const fcFiltered = fcSummaries.filter((f) => reportIds.has(f.reportId));
    const byCat: Record<string, number> = {};
    for (const f of fcFiltered) {
      byCat[f.category] = (byCat[f.category] ?? 0) + f.usageValue;
    }

    // Also add incentives (payroll)
    const incentives = await ctx.db.query("employeeIncentives").collect();
    const incFiltered = incentives.filter((i) => reportIds.has(i.reportId));
    const totalIncentive = incFiltered.reduce((s, i) => s + i.amount, 0);
    if (totalIncentive > 0) byCat["Insentif / Gaji"] = totalIncentive;

    const colors = [
      "hsl(346, 77%, 50%)", "hsl(217, 91%, 60%)", "hsl(38, 92%, 50%)",
      "hsl(142, 71%, 45%)", "hsl(262, 83%, 58%)", "hsl(220, 9%, 46%)",
    ];

    return Object.entries(byCat)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], i) => ({
        name,
        value,
        color: colors[i % colors.length],
      }));
  },
});

export const getExpenseBreakdownInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_uploadedAt")
      .order("desc")
      .take(4);

    if (reports.length === 0) return [];

    const reportIds = new Set(reports.map((r) => r._id));

    const fcSummaries = await ctx.db.query("foodCostSummary").collect();

    const fcFiltered = fcSummaries.filter((f) => reportIds.has(f.reportId));
    const byCat: Record<string, number> = {};
    for (const f of fcFiltered) {
      byCat[f.category] = (byCat[f.category] ?? 0) + f.usageValue;
    }

    const incentives = await ctx.db.query("employeeIncentives").collect();
    const incFiltered = incentives.filter((i) => reportIds.has(i.reportId));
    const totalIncentive = incFiltered.reduce((s, i) => s + i.amount, 0);
    if (totalIncentive > 0) byCat["Insentif / Gaji"] = totalIncentive;

    const colors = [
      "hsl(346, 77%, 50%)", "hsl(217, 91%, 60%)", "hsl(38, 92%, 50%)",
      "hsl(142, 71%, 45%)", "hsl(262, 83%, 58%)", "hsl(220, 9%, 46%)",
    ];

    return Object.entries(byCat)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], i) => ({
        name,
        value,
        color: colors[i % colors.length],
      }));
  },
});

/**
 * Cashflow waterfall — Revenue → COGS → Expense → Net.
 * Uses dailyCashFlow + foodCostSummary.
 */
export const getCashflowWaterfall = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    // Sum all cash flow entries
    const cashFlows = await ctx.db.query("dailyCashFlow").collect();

    // Get last 4 reports
    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_uploadedAt")
      .order("desc")
      .take(4);
    const reportIds = new Set(reports.map((r) => r._id));

    const cfFiltered = cashFlows.filter((cf) => reportIds.has(cf.reportId));
    const totalSales = cfFiltered.reduce((s, cf) => s + cf.salesInflow, 0);
    const totalExpense = cfFiltered.reduce((s, cf) => s + cf.expenseOutflow, 0);
    const totalOtherIn = cfFiltered.reduce((s, cf) => s + cf.otherInflow, 0);
    const totalOtherOut = cfFiltered.reduce((s, cf) => s + cf.otherOutflow, 0);

    // COGS from food cost summary
    const fcSummaries = await ctx.db.query("foodCostSummary").collect();
    const fcFiltered = fcSummaries.filter((f) => reportIds.has(f.reportId));
    const totalCOGS = fcFiltered.reduce((s, f) => s + f.usageValue, 0);

    const opex = totalExpense - totalCOGS;
    const revenue = totalSales + totalOtherIn;
    const net = revenue - totalCOGS - Math.max(opex, 0) - totalOtherOut;

    return [
      { name: "Pendapatan", value: revenue },
      { name: "COGS", value: -totalCOGS },
      { name: "Opex", value: -Math.max(opex, 0) },
      { name: "Arus Keluar Lain", value: -totalOtherOut },
      { name: "Bersih", value: net },
    ].filter((item) => item.value !== 0 || item.name === "Bersih");
  },
});

export const getCashflowWaterfallInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    const cashFlows = await ctx.db.query("dailyCashFlow").collect();

    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_uploadedAt")
      .order("desc")
      .take(4);
    const reportIds = new Set(reports.map((r) => r._id));

    const cfFiltered = cashFlows.filter((cf) => reportIds.has(cf.reportId));
    const totalSales = cfFiltered.reduce((s, cf) => s + cf.salesInflow, 0);
    const totalExpense = cfFiltered.reduce((s, cf) => s + cf.expenseOutflow, 0);
    const totalOtherIn = cfFiltered.reduce((s, cf) => s + cf.otherInflow, 0);
    const totalOtherOut = cfFiltered.reduce((s, cf) => s + cf.otherOutflow, 0);

    const fcSummaries = await ctx.db.query("foodCostSummary").collect();
    const fcFiltered = fcSummaries.filter((f) => reportIds.has(f.reportId));
    const totalCOGS = fcFiltered.reduce((s, f) => s + f.usageValue, 0);

    const opex = totalExpense - totalCOGS;
    const revenue = totalSales + totalOtherIn;
    const net = revenue - totalCOGS - Math.max(opex, 0) - totalOtherOut;

    return [
      { name: "Pendapatan", value: revenue },
      { name: "COGS", value: -totalCOGS },
      { name: "Opex", value: -Math.max(opex, 0) },
      { name: "Arus Keluar Lain", value: -totalOtherOut },
      { name: "Bersih", value: net },
    ].filter((item) => item.value !== 0 || item.name === "Bersih");
  },
});

/**
 * Recent transactions — combines latest productSales + expenses.
 */
export const getRecentTransactions = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    type Row = {
      id: string;
      name: string;
      type: string;
      amount: string;
      rawAmount: number;
      time: string;
      status: string;
      direction: "in" | "out";
      reportId?: string;
      sourceFile?: string;
      sourceSheet?: string;
    };
    const results: Row[] = [];

    // Cache report file names so 50 rows don't fan-out 50 lookups.
    const reportCache = new Map<string, string | undefined>();
    const fileFor = async (reportId: string): Promise<string | undefined> => {
      if (reportCache.has(reportId)) return reportCache.get(reportId);
      const r = await ctx.db.get(reportId as Id<"weeklyReports">);
      const name = r?.fileName;
      reportCache.set(reportId, name);
      return name;
    };

    // Take a wider window so the client-side date filter has rows to keep.
    // by_date index + order desc bounds the read to the 30 latest (was a full
    // unbounded collect + JS sort/slice — identical result set).
    const latestSummaries = await ctx.db
      .query("dailyCashSummary")
      .withIndex("by_date")
      .order("desc")
      .take(30);

    for (const s of latestSummaries) {
      const file = await fileFor(s.reportId);
      results.push({
        id: `SALES-${s.businessDate}`,
        name: `Penjualan ${s.businessDate}`,
        type: "Setoran Penjualan",
        amount: `+Rp ${s.grossSales.toLocaleString("id-ID")}`,
        rawAmount: s.grossSales,
        time: s.businessDate,
        status: "completed",
        direction: "in",
        reportId: s.reportId,
        sourceFile: file,
        sourceSheet: "dailyCashSummary",
      });
    }

    const latestCF = await ctx.db
      .query("dailyCashFlow")
      .withIndex("by_date")
      .order("desc")
      .take(30);

    for (const cf of latestCF) {
      if (cf.expenseOutflow > 0) {
        const file = await fileFor(cf.reportId);
        results.push({
          id: `EXP-${cf.businessDate}`,
          name: `Belanja ${cf.businessDate}`,
          type: "Pengeluaran",
          amount: `-Rp ${cf.expenseOutflow.toLocaleString("id-ID")}`,
          rawAmount: cf.expenseOutflow,
          time: cf.businessDate,
          status: "completed",
          direction: "out",
          reportId: cf.reportId,
          sourceFile: file,
          sourceSheet: "dailyCashFlow",
        });
      }
    }

    return results
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 50);
  },
});

export const getRecentTransactionsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    const results: {
      id: string;
      name: string;
      type: string;
      amount: string;
      time: string;
      status: string;
      direction: "in" | "out";
    }[] = [];

    const latestSummaries = await ctx.db
      .query("dailyCashSummary")
      .withIndex("by_date")
      .order("desc")
      .take(3);

    for (const s of latestSummaries) {
      results.push({
        id: `SALES-${s.businessDate}`,
        name: `Penjualan ${s.businessDate}`,
        type: "Setoran Penjualan",
        amount: `+Rp ${s.grossSales.toLocaleString("id-ID")}`,
        time: s.businessDate,
        status: "completed",
        direction: "in",
      });
    }

    const latestCF = await ctx.db
      .query("dailyCashFlow")
      .withIndex("by_date")
      .order("desc")
      .take(3);

    for (const cf of latestCF) {
      if (cf.expenseOutflow > 0) {
          results.push({
            id: `EXP-${cf.businessDate}`,
            name: `Belanja ${cf.businessDate}`,
            type: "Pengeluaran",
            amount: `-Rp ${cf.expenseOutflow.toLocaleString("id-ID")}`,
            time: cf.businessDate,
            status: "completed",
          direction: "out",
        });
      }
    }

    return results
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 6);
  },
});

// ─── Cash Runway ─────────────────────────────────────────────
//
// Estimates how many days of cash on hand based on the
// latest closingBalance vs avg daily expense outflow over last 30 days.

export const getCashRunway = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    const cashFlows = await ctx.db
      .query("dailyCashFlow")
      .withIndex("by_date")
      .order("desc")
      .take(60); /* ~2 months for stable avg */

    if (cashFlows.length === 0) {
      return { currentCash: 0, avgDailyOutflow: 0, runwayDays: null, lastDate: null };
    }

    const sorted = [...cashFlows].sort((a, b) =>
      b.businessDate.localeCompare(a.businessDate),
    );
    const last = sorted[0];
    const last30 = sorted.slice(0, 30);
    const totalOutflow = last30.reduce(
      (s, cf) => s + cf.expenseOutflow + cf.otherOutflow,
      0,
    );
    const avgDailyOutflow = last30.length > 0 ? totalOutflow / last30.length : 0;
    const runwayDays =
      avgDailyOutflow > 0 ? Math.floor(last.closingBalance / avgDailyOutflow) : null;

    return {
      currentCash: last.closingBalance,
      avgDailyOutflow,
      runwayDays,
      lastDate: last.businessDate,
    };
  },
});

// ─── Financial Trend (multi-metric daily) ───────────────────
//
// Returns per-day aggregates so a single chart can compare:
// revenue / cogs / netProfit / customers / foodCostPct / marginPct.
// Accepts optional startDate / endDate (ms) to follow DateScope.

export const getFinancialTrend = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    await requireAuth(ctx);

    const inRange = (dateStr: string): boolean => {
      if (startDate == null || endDate == null) return true;
      const t = Date.parse(dateStr);
      if (!Number.isFinite(t)) return false;
      return t >= startDate && t < endDate;
    };

    const [sales, fcSummary, salesCtrl] = await Promise.all([
      ctx.db.query("productSales").collect(),
      ctx.db.query("foodCostSummary").collect(),
      ctx.db.query("salesControl").collect(),
    ]);

    // Aggregate revenue per day
    const revenueByDate: Record<string, number> = {};
    for (const s of sales) {
      if (!inRange(s.businessDate)) continue;
      if (s.channel && s.channel !== "all") continue;
      revenueByDate[s.businessDate] = (revenueByDate[s.businessDate] ?? 0) + s.amount;
    }

    // Aggregate COGS per day — foodCostSummary uses periodStart so split evenly
    // across the days within each period. For accuracy without per-day cost
    // data this is an approximation; week-level still useful for trend shape.
    const cogsByDate: Record<string, number> = {};
    for (const f of fcSummary) {
      if (!f.periodStart || !inRange(f.periodStart)) continue;
      // Attribute to periodStart day (week starts) — chart will show step pattern.
      cogsByDate[f.periodStart] = (cogsByDate[f.periodStart] ?? 0) + f.usageValue;
    }

    // Customers per day
    const custByDate: Record<string, number> = {};
    for (const c of salesCtrl) {
      if (!inRange(c.businessDate)) continue;
      custByDate[c.businessDate] = (custByDate[c.businessDate] ?? 0) + c.customerCount;
    }

    // Union of dates
    const dates = new Set<string>([
      ...Object.keys(revenueByDate),
      ...Object.keys(cogsByDate),
      ...Object.keys(custByDate),
    ]);
    const sorted = Array.from(dates).sort();

    return sorted.map((date) => {
      const revenue = revenueByDate[date] ?? 0;
      const cogs = cogsByDate[date] ?? 0;
      const profit = revenue - cogs;
      const customers = custByDate[date] ?? 0;
      const foodCostPct = revenue > 0 ? Math.round((cogs / revenue) * 1000) / 10 : 0;
      const marginPct = revenue > 0 ? Math.round(((revenue - cogs) / revenue) * 1000) / 10 : 0;
      return {
        date,
        label: date.slice(5), // MM-DD
        revenue,
        cogs,
        profit,
        customers,
        foodCostPct,
        marginPct,
      };
    });
  },
});

// ─── Cashflow detail — income per channel + expense per category + piutang ────
//
// Three sibling queries powering /finance/cashflow. All accept optional
// startDate/endDate (ms) for DateScope. Default = all data.

const inRangeFn = (startDate?: number, endDate?: number) => (dateStr: string): boolean => {
  if (startDate == null || endDate == null) return true;
  const t = Date.parse(dateStr);
  if (!Number.isFinite(t)) return false;
  return t >= startDate && t < endDate;
};

export const getIncomeByChannel = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    await requireAuth(ctx);
    const inRange = inRangeFn(startDate, endDate);

    const sales = await ctx.db.query("dailySales").take(5000);

    type Row = {
      channelId: string;
      channelName: string;
      gross: number;
      net: number;
      cashReceived: number;
      platformFee: number;
      promoCost: number;
      txCount: number;
    };
    const byChannel = new Map<string, Row>();

    for (const s of sales) {
      if (!inRange(s.businessDate)) continue;
      const key = s.channelId;
      let row = byChannel.get(key);
      if (!row) {
        row = {
          channelId: key,
          channelName: s.channelName,
          gross: 0,
          net: 0,
          cashReceived: 0,
          platformFee: 0,
          promoCost: 0,
          txCount: 0,
        };
        byChannel.set(key, row);
      }
      row.gross += s.grossAmount;
      row.net += s.netAmount;
      row.cashReceived += s.cashReceivedAmount;
      row.platformFee += s.platformFee;
      row.promoCost += s.promoCost;
      row.txCount += 1;
    }

    const rows = Array.from(byChannel.values()).sort((a, b) => b.gross - a.gross);
    const totals = rows.reduce(
      (acc, r) => ({
        gross: acc.gross + r.gross,
        net: acc.net + r.net,
        cashReceived: acc.cashReceived + r.cashReceived,
        platformFee: acc.platformFee + r.platformFee,
        promoCost: acc.promoCost + r.promoCost,
        txCount: acc.txCount + r.txCount,
      }),
      { gross: 0, net: 0, cashReceived: 0, platformFee: 0, promoCost: 0, txCount: 0 },
    );
    return { rows, totals };
  },
});

export const getExpenseByCategory = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    await requireAuth(ctx);
    const inRange = inRangeFn(startDate, endDate);

    const expenses = await ctx.db.query("expenses").take(5000);

    type Row = {
      categoryId: string;
      categoryName: string;
      total: number;
      ownerDirect: number;
      pettyCash: number;
      payable: number;
      txCount: number;
    };
    const byCat = new Map<string, Row>();

    for (const e of expenses) {
      if (!inRange(e.expenseDate)) continue;
      const key = e.categoryId;
      let row = byCat.get(key);
      if (!row) {
        row = {
          categoryId: key,
          categoryName: e.categoryName,
          total: 0,
          ownerDirect: 0,
          pettyCash: 0,
          payable: 0,
          txCount: 0,
        };
        byCat.set(key, row);
      }
      row.total += e.amount;
      if (e.paymentSource === "owner_direct") row.ownerDirect += e.amount;
      else if (e.paymentSource === "petty_cash") row.pettyCash += e.amount;
      else if (e.paymentSource === "payable") row.payable += e.amount;
      row.txCount += 1;
    }

    const rows = Array.from(byCat.values()).sort((a, b) => b.total - a.total);
    const totals = rows.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        ownerDirect: acc.ownerDirect + r.ownerDirect,
        pettyCash: acc.pettyCash + r.pettyCash,
        payable: acc.payable + r.payable,
        txCount: acc.txCount + r.txCount,
      }),
      { total: 0, ownerDirect: 0, pettyCash: 0, payable: 0, txCount: 0 },
    );
    return { rows, totals };
  },
});

export const getPiutangPaymentsByVendor = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    await requireAuth(ctx);
    const inRange = inRangeFn(startDate, endDate);

    // Load all payables + payments. Single-tenant repo — payables small (<5k).
    const [payables, payments] = await Promise.all([
      ctx.db.query("payables").take(5000),
      ctx.db.query("payablePayments").take(5000),
    ]);

    const payableMap = new Map<string, typeof payables[number]>();
    for (const p of payables) payableMap.set(p._id, p);

    type Row = {
      vendorId: string;
      vendorName: string;
      paidThisPeriod: number;
      outstandingNow: number;     // ALL open payables, not just touched
      paymentCount: number;       // pmts in this period
      openPayableCount: number;   // all open payables for vendor (any age)
      paidPayableCount: number;   // payables paid in this period (sub-set)
    };
    const byVendor = new Map<string, Row>();
    const upsertRow = (vendorId: string, vendorName: string): Row => {
      let row = byVendor.get(vendorId);
      if (!row) {
        row = {
          vendorId,
          vendorName,
          paidThisPeriod: 0,
          outstandingNow: 0,
          paymentCount: 0,
          openPayableCount: 0,
          paidPayableCount: 0,
        };
        byVendor.set(vendorId, row);
      }
      return row;
    };

    // Step 1: aggregate ALL open payables per vendor → outstandingNow + openPayableCount.
    for (const p of payables) {
      if (p.status === "paid") continue;
      const outstanding = Math.max(0, p.amount - p.paidAmount);
      if (outstanding <= 0) continue;
      const row = upsertRow(p.vendorId, p.vendorName);
      row.outstandingNow += outstanding;
      row.openPayableCount += 1;
    }

    // Step 2: aggregate payments in scope period → paidThisPeriod + paymentCount.
    const paidPayableTouched = new Map<string, Set<string>>();
    for (const pm of payments) {
      if (!inRange(pm.paymentDate)) continue;
      const p = payableMap.get(pm.payableId);
      if (!p) continue;
      const row = upsertRow(p.vendorId, p.vendorName);
      row.paidThisPeriod += pm.amount;
      row.paymentCount += 1;
      let touched = paidPayableTouched.get(p.vendorId);
      if (!touched) {
        touched = new Set();
        paidPayableTouched.set(p.vendorId, touched);
      }
      touched.add(pm.payableId);
    }
    for (const [vendorId, touched] of paidPayableTouched.entries()) {
      const row = byVendor.get(vendorId);
      if (row) row.paidPayableCount = touched.size;
    }

    // Sort: vendors w/ paymentsThisPeriod first (desc), then by outstandingNow desc.
    const rows = Array.from(byVendor.values()).sort((a, b) => {
      if (a.paidThisPeriod !== b.paidThisPeriod) return b.paidThisPeriod - a.paidThisPeriod;
      return b.outstandingNow - a.outstandingNow;
    });

    const totals = rows.reduce(
      (acc, r) => ({
        paidThisPeriod: acc.paidThisPeriod + r.paidThisPeriod,
        outstandingNow: acc.outstandingNow + r.outstandingNow,
        paymentCount: acc.paymentCount + r.paymentCount,
        openPayableCount: acc.openPayableCount + r.openPayableCount,
        paidPayableCount: acc.paidPayableCount + r.paidPayableCount,
      }),
      { paidThisPeriod: 0, outstandingNow: 0, paymentCount: 0, openPayableCount: 0, paidPayableCount: 0 },
    );
    return { rows, totals };
  },
});
