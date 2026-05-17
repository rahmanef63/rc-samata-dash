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
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);

    // Get all product sales for this branch (last report or across reports)
    const sales = await ctx.db
      .query("productSales")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .collect();

    // Group by date
    const byDate: Record<string, number> = {};
    for (const s of sales) {
      byDate[s.businessDate] = (byDate[s.businessDate] ?? 0) + s.amount;
    }

    // Sort by date desc, take last 7
    const sorted = Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7)
      .reverse();

    return sorted.map(([date, value]) => ({
      label: date.slice(5), // "01-15" format
      date,
      value,
    }));
  },
});

export const getWeeklySalesTrendInternal = internalQuery({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);

    const sales = await ctx.db
      .query("productSales")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .collect();

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
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);

    const sales = await ctx.db
      .query("productSales")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .collect();

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

export const getMonthlySalesTrendInternal = internalQuery({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);

    const sales = await ctx.db
      .query("productSales")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .collect();

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
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);

    // Get the latest report for aggregation
    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .order("desc")
      .take(4); // Last 4 weekly reports ~ 1 month

    if (reports.length === 0) return [];

    const reportIds = new Set(reports.map((r) => r._id));

    // Food cost summaries — sum usageValue per category
    const fcSummaries = await ctx.db
      .query("foodCostSummary")
      .withIndex("by_branch_period", (q) => q.eq("branchId", branchId))
      .collect();

    const fcFiltered = fcSummaries.filter((f) => reportIds.has(f.reportId));
    const byCat: Record<string, number> = {};
    for (const f of fcFiltered) {
      byCat[f.category] = (byCat[f.category] ?? 0) + f.usageValue;
    }

    // Also add incentives (payroll)
    const incentives = await ctx.db
      .query("employeeIncentives")
      .withIndex("by_branch_period", (q) => q.eq("branchId", branchId))
      .collect();
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
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);

    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .order("desc")
      .take(4);

    if (reports.length === 0) return [];

    const reportIds = new Set(reports.map((r) => r._id));

    const fcSummaries = await ctx.db
      .query("foodCostSummary")
      .withIndex("by_branch_period", (q) => q.eq("branchId", branchId))
      .collect();

    const fcFiltered = fcSummaries.filter((f) => reportIds.has(f.reportId));
    const byCat: Record<string, number> = {};
    for (const f of fcFiltered) {
      byCat[f.category] = (byCat[f.category] ?? 0) + f.usageValue;
    }

    const incentives = await ctx.db
      .query("employeeIncentives")
      .withIndex("by_branch_period", (q) => q.eq("branchId", branchId))
      .collect();
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
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);

    // Sum all cash flow entries
    const cashFlows = await ctx.db
      .query("dailyCashFlow")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .collect();

    // Get last 4 reports
    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .order("desc")
      .take(4);
    const reportIds = new Set(reports.map((r) => r._id));

    const cfFiltered = cashFlows.filter((cf) => reportIds.has(cf.reportId));
    const totalSales = cfFiltered.reduce((s, cf) => s + cf.salesInflow, 0);
    const totalExpense = cfFiltered.reduce((s, cf) => s + cf.expenseOutflow, 0);
    const totalOtherIn = cfFiltered.reduce((s, cf) => s + cf.otherInflow, 0);
    const totalOtherOut = cfFiltered.reduce((s, cf) => s + cf.otherOutflow, 0);

    // COGS from food cost summary
    const fcSummaries = await ctx.db
      .query("foodCostSummary")
      .withIndex("by_branch_period", (q) => q.eq("branchId", branchId))
      .collect();
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
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);

    const cashFlows = await ctx.db
      .query("dailyCashFlow")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .collect();

    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .order("desc")
      .take(4);
    const reportIds = new Set(reports.map((r) => r._id));

    const cfFiltered = cashFlows.filter((cf) => reportIds.has(cf.reportId));
    const totalSales = cfFiltered.reduce((s, cf) => s + cf.salesInflow, 0);
    const totalExpense = cfFiltered.reduce((s, cf) => s + cf.expenseOutflow, 0);
    const totalOtherIn = cfFiltered.reduce((s, cf) => s + cf.otherInflow, 0);
    const totalOtherOut = cfFiltered.reduce((s, cf) => s + cf.otherOutflow, 0);

    const fcSummaries = await ctx.db
      .query("foodCostSummary")
      .withIndex("by_branch_period", (q) => q.eq("branchId", branchId))
      .collect();
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
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
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
    const summaries = await ctx.db
      .query("dailyCashSummary")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .collect();
    const latestSummaries = summaries
      .sort((a, b) => b.businessDate.localeCompare(a.businessDate))
      .slice(0, 30);

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

    const cashFlows = await ctx.db
      .query("dailyCashFlow")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .collect();
    const latestCF = cashFlows
      .sort((a, b) => b.businessDate.localeCompare(a.businessDate))
      .slice(0, 30);

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
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
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

    const summaries = await ctx.db
      .query("dailyCashSummary")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .collect();
    const latestSummaries = summaries
      .sort((a, b) => b.businessDate.localeCompare(a.businessDate))
      .slice(0, 3);

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

    const cashFlows = await ctx.db
      .query("dailyCashFlow")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .collect();
    const latestCF = cashFlows
      .sort((a, b) => b.businessDate.localeCompare(a.businessDate))
      .slice(0, 3);

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

// ─── Multi-branch comparison (added 2026-05-17) ──────────────
//
// Returns per-branch aggregate of last 4 weekly reports:
// omzet (revenue), COGS, food cost %, profit margin %.
// Used by DashboardBranchCompare for owner cross-branch view.

export const getBranchComparison = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const branches = await ctx.db.query("branches").take(50);
    const out: Array<{
      branchId: string;
      branchName: string;
      revenue: number;
      cogs: number;
      foodCostPct: number;
      profit: number;
      profitMarginPct: number;
    }> = [];

    for (const b of branches) {
      const reports = await ctx.db
        .query("weeklyReports")
        .withIndex("by_branch", (q) => q.eq("branchId", b._id))
        .order("desc")
        .take(4);
      if (reports.length === 0) {
        out.push({
          branchId: String(b._id),
          branchName: b.name,
          revenue: 0,
          cogs: 0,
          foodCostPct: 0,
          profit: 0,
          profitMarginPct: 0,
        });
        continue;
      }
      const reportIds = new Set(reports.map((r) => r._id));

      // Sum revenue from productSales (all-channel only)
      let revenue = 0;
      for (const r of reports) {
        const sales = await ctx.db
          .query("productSales")
          .withIndex("by_report", (q) => q.eq("reportId", r._id))
          .collect();
        for (const s of sales) {
          if (!s.channel || s.channel === "all") revenue += s.amount;
        }
      }

      // Sum COGS from foodCostSummary
      const fcAll = await ctx.db
        .query("foodCostSummary")
        .withIndex("by_branch_period", (q) => q.eq("branchId", b._id))
        .collect();
      const cogs = fcAll
        .filter((f) => reportIds.has(f.reportId))
        .reduce((s, f) => s + f.usageValue, 0);

      const profit = revenue - cogs;
      out.push({
        branchId: String(b._id),
        branchName: b.name,
        revenue,
        cogs,
        foodCostPct: revenue > 0 ? (cogs / revenue) * 100 : 0,
        profit,
        profitMarginPct: revenue > 0 ? (profit / revenue) * 100 : 0,
      });
    }

    return out.sort((a, b) => b.revenue - a.revenue);
  },
});

// ─── Cash Runway (added 2026-05-17) ──────────────────────────
//
// Estimates how many days of cash on hand a branch has based on the
// latest closingBalance vs avg daily expense outflow over last 30 days.

export const getCashRunway = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);

    const cashFlows = await ctx.db
      .query("dailyCashFlow")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
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
