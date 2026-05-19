/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * KPI Analytics — target vs actual benchmarks for QSR operations.
 *
 * Standard KPIs for Rocket Chicken franchise: food cost %, gross margin,
 * waste %, sales achievement, purchase efficiency, cash tight days, etc.
 */

import { query, mutation, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { normalizeItemName } from "../../shared/helpers";

async function fetchData(ctx: any, tableName: string, args: { reportId?: string; branchId?: string; timeFilter?: string }) {
  if (args.reportId && args.reportId !== "all") {
    return ctx.db.query(tableName as any).withIndex("by_report", (q: any) => q.eq("reportId", args.reportId)).collect();
  }
  if (!args.branchId) return [];
  // Bounded loop: last 52 reports + 5000 rows total. Convex caps per-query
  // returns at 8192; without this an old branch with many uploaded weeks
  // crashed KPI dashboard with "Array length too long".
  const reports = await ctx.db
    .query("weeklyReports")
    .withIndex("by_branch", (q: any) => q.eq("branchId", args.branchId as any))
    .order("desc")
    .take(52);
  const ROW_CAP = 5000;
  let allData: any[] = [];
  for (const r of reports) {
    const data = await ctx.db.query(tableName as any).withIndex("by_report", (q: any) => q.eq("reportId", r._id)).collect();
    if (data.length > 0) allData.push(...data);
    if (allData.length >= ROW_CAP) break;
  }
  allData = allData.slice(0, ROW_CAP);
  if (args.timeFilter && args.timeFilter !== "all" && allData.length > 0) {
    const now = new Date();
    allData = allData.filter(d => {
      const dVal = d.businessDate || d.periodStart || d.valuationDate || d.weekStart;
      if (!dVal) return true;
      const date = new Date(dVal);
      if (args.timeFilter === "daily") return date.toDateString() === now.toDateString();
      if (args.timeFilter === "weekly") {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        return date >= weekAgo;
      }
      if (args.timeFilter === "monthly") return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      if (args.timeFilter === "quarterly") return Math.floor(now.getMonth() / 3) === Math.floor(date.getMonth() / 3) && date.getFullYear() === now.getFullYear();
      return true;
    });
  }
  return allData;
}


// ─── Default KPI Targets (QSR Standard) ──────────────────────

const DEFAULT_KPIS = [
  { kpiCode: "food_cost_pct", kpiLabel: "Food Cost %", targetValue: 33, warningThreshold: 38, dangerThreshold: 42, unit: "%", direction: "lower_is_better" as const },
  { kpiCode: "gross_margin_pct", kpiLabel: "Gross Margin %", targetValue: 67, warningThreshold: 60, dangerThreshold: 55, unit: "%", direction: "higher_is_better" as const },
  { kpiCode: "waste_pct", kpiLabel: "Waste %", targetValue: 1.5, warningThreshold: 2.5, dangerThreshold: 4, unit: "%", direction: "lower_is_better" as const },
  { kpiCode: "sales_achievement_pct", kpiLabel: "Capaian Sales %", targetValue: 100, warningThreshold: 85, dangerThreshold: 70, unit: "%", direction: "higher_is_better" as const },
  { kpiCode: "purchase_efficiency", kpiLabel: "Efisiensi Beli", targetValue: 0.90, warningThreshold: 0.80, dangerThreshold: 0.70, unit: "ratio", direction: "higher_is_better" as const },
  { kpiCode: "cash_tight_days", kpiLabel: "Cash Tight Days", targetValue: 0, warningThreshold: 1, dangerThreshold: 3, unit: "hari", direction: "lower_is_better" as const },
  { kpiCode: "labor_cost_pct", kpiLabel: "Labor Cost %", targetValue: 20, warningThreshold: 25, dangerThreshold: 30, unit: "%", direction: "lower_is_better" as const },
  { kpiCode: "variance_rate_pct", kpiLabel: "Variance Rate %", targetValue: 2, warningThreshold: 4, dangerThreshold: 6, unit: "%", direction: "lower_is_better" as const },
  { kpiCode: "avg_spending_power", kpiLabel: "Avg Spending Power", targetValue: 25000, warningThreshold: 20000, dangerThreshold: 15000, unit: "Rp", direction: "higher_is_better" as const },
  { kpiCode: "inventory_turnover", kpiLabel: "Inventory Turnover", targetValue: 4, warningThreshold: 3, dangerThreshold: 2, unit: "x", direction: "higher_is_better" as const },
];

// ─── Seed Default KPI Targets ────────────────────────────────

export const seedDefaultKPITargets = mutation({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);

    // Check if targets already exist for this branch
    const existing = await ctx.db
      .query("kpiTargets")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .first();

    if (existing) return { seeded: false, message: "KPI targets already exist" };

    const today = new Date().toISOString().split("T")[0];
    for (const kpi of DEFAULT_KPIS) {
      await ctx.db.insert("kpiTargets", {
        branchId,
        effectiveFrom: today,
        ...kpi,
      });
    }

    return { seeded: true, message: `${DEFAULT_KPIS.length} KPI targets seeded` };
  },
});

// ─── Update a KPI target ─────────────────────────────────────

export const updateKPITarget = mutation({
  args: {
    id: v.id("kpiTargets"),
    targetValue: v.optional(v.number()),
    warningThreshold: v.optional(v.number()),
    dangerThreshold: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requireAuth(ctx);
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    if (Object.keys(clean).length > 0) await ctx.db.patch(id, clean);
    return id;
  },
});

// ─── List KPI targets for branch ─────────────────────────────

export const listKPITargets = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    return ctx.db
      .query("kpiTargets")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .collect();
  },
});

// ─── KPI Dashboard — compute actuals vs targets ──────────────

type KPIStatus = "good" | "warning" | "danger";

function evaluateKPI(
  actual: number,
  target: number,
  warning: number,
  danger: number,
  direction: "lower_is_better" | "higher_is_better"
): KPIStatus {
  if (direction === "lower_is_better") {
    if (actual <= target) return "good";
    if (actual <= warning) return "warning";
    return "danger";
  } else {
    if (actual >= target) return "good";
    if (actual >= warning) return "warning";
    return "danger";
  }
}

export const getKPIDashboard = query({
  args: { reportId: v.optional(v.union(v.id("weeklyReports"), v.literal("all"))), branchId: v.optional(v.id("branches")), timeFilter: v.optional(v.string()) },
  handler: async (ctx, { reportId, branchId, timeFilter }) => {
    await requireAuth(ctx);

    let targetBranchId = branchId;
    
    if (reportId && reportId !== "all") {
      const report = await ctx.db.get(reportId as any) as any;
      if (report) targetBranchId = report.branchId;
    }

    if (!targetBranchId) return { kpis: [], hasTargets: false };

    // Get targets
    const targets = await ctx.db
      .query("kpiTargets")
      .withIndex("by_branch", (q) => q.eq("branchId", targetBranchId))
      .collect();

    const targetMap = new Map(targets.map((t) => [t.kpiCode, t]));

    // ── Fetch all needed data ──
    const [
      sales,
      fcSummary,
      salesCtrl,
      leftover,
      invVal,
      costAn,
      cashFlow,
      incentives,
    ] = await Promise.all([
      fetchData(ctx, "productSales", { reportId, branchId, timeFilter }),
      fetchData(ctx, "foodCostSummary", { reportId, branchId, timeFilter }),
      fetchData(ctx, "salesControl", { reportId, branchId, timeFilter }),
      fetchData(ctx, "leftoverItems", { reportId, branchId, timeFilter }),
      fetchData(ctx, "inventoryValuation", { reportId, branchId, timeFilter }),
      fetchData(ctx, "costAnalysis", { reportId, branchId, timeFilter }),
      fetchData(ctx, "dailyCashFlow", { reportId, branchId, timeFilter }),
      fetchData(ctx, "employeeIncentives", { reportId, branchId, timeFilter }),
    ]);

    // ── Compute actuals ──

    // Revenue (all-channel sales)
    const allChannelSales = sales.filter((s: any) => !s.channel || s.channel === "all");
    const totalRevenue = allChannelSales.reduce((s: number, item: any) => s + item.amount, 0);

    // COGS
    const totalCOGS = fcSummary.reduce((s: number, item: any) => s + item.usageValue, 0);

    // Food Cost %
    const foodCostPct = totalRevenue > 0 ? (totalCOGS / totalRevenue) * 100 : 0;

    // Gross Margin %
    const grossMarginPct = totalRevenue > 0 ? ((totalRevenue - totalCOGS) / totalRevenue) * 100 : 0;

    // Waste %
    const priceMap = new Map<string, number>();
    for (const inv of invVal) {
      priceMap.set(normalizeItemName(inv.itemName), inv.unitPrice);
    }
    let totalWasteCost = 0;
    for (const lo of leftover) {
      const price = priceMap.get(normalizeItemName(lo.itemName)) ?? 0;
      totalWasteCost += lo.qty * price;
    }
    const wastePct = totalRevenue > 0 ? (totalWasteCost / totalRevenue) * 100 : 0;

    // Sales Achievement %
    const avgAchievement = salesCtrl.length > 0
      ? (salesCtrl.reduce((s: number, item: any) => s + item.achievementPct, 0) / salesCtrl.length) * 100
      : 0;

    // Purchase Efficiency (avg usage/purchase ratio)
    const itemsWithPurchase = costAn.filter((c: any) => c.purchaseQty > 0);
    const purchaseEfficiency = itemsWithPurchase.length > 0
      ? itemsWithPurchase.reduce((s: number, c: any) => s + (c.usageQty / c.purchaseQty), 0) / itemsWithPurchase.length
      : 0;

    // Cash Tight Days (closing < 500k)
    const cashTightDays = cashFlow.filter((d: any) => d.closingBalance < 500000).length;

    // Labor Cost % (incentives total / revenue)
    const totalIncentives = incentives.reduce((s: number, item: any) => s + item.amount, 0);
    const laborCostPct = totalRevenue > 0 ? (totalIncentives / totalRevenue) * 100 : 0;

    // Variance Rate %
    const totalPurchaseValue = costAn.reduce((s: number, c: any) => s + c.purchaseValue, 0);
    const totalVariance = costAn.reduce((s: number, c: any) => s + Math.abs(c.variance), 0);
    const varianceRatePct = totalPurchaseValue > 0 ? (totalVariance / totalPurchaseValue) * 100 : 0;

    // Avg Spending Power
    const avgSpendingPower = salesCtrl.length > 0
      ? salesCtrl.reduce((s: number, item: any) => s + item.spendingPower, 0) / salesCtrl.length
      : 0;

    // Inventory Turnover (COGS / avg inventory value)
    const totalInventoryValue = invVal.reduce((s: number, item: any) => s + item.totalValue, 0);
    const inventoryTurnover = totalInventoryValue > 0 ? totalCOGS / totalInventoryValue : 0;

    // ── Build KPI results ──
    const actuals: Record<string, number> = {
      food_cost_pct: Math.round(foodCostPct * 10) / 10,
      gross_margin_pct: Math.round(grossMarginPct * 10) / 10,
      waste_pct: Math.round(wastePct * 10) / 10,
      sales_achievement_pct: Math.round(avgAchievement * 10) / 10,
      purchase_efficiency: Math.round(purchaseEfficiency * 100) / 100,
      cash_tight_days: cashTightDays,
      labor_cost_pct: Math.round(laborCostPct * 10) / 10,
      variance_rate_pct: Math.round(varianceRatePct * 10) / 10,
      avg_spending_power: Math.round(avgSpendingPower),
      inventory_turnover: Math.round(inventoryTurnover * 10) / 10,
    };

    const kpis = DEFAULT_KPIS.map((def) => {
      const target = targetMap.get(def.kpiCode);
      const actual = actuals[def.kpiCode] ?? 0;
      const t = target ?? def;

      return {
        kpiCode: def.kpiCode,
        kpiLabel: def.kpiLabel,
        unit: def.unit,
        direction: def.direction,
        actual,
        target: t.targetValue,
        warningThreshold: t.warningThreshold,
        dangerThreshold: t.dangerThreshold,
        status: evaluateKPI(actual, t.targetValue, t.warningThreshold, t.dangerThreshold, def.direction),
        targetId: target?._id ?? null,
      };
    });

    return { kpis, hasTargets: targets.length > 0 };
  },
});

export const getKPIDashboardInternal = internalQuery({
  args: { reportId: v.optional(v.union(v.id("weeklyReports"), v.literal("all"))), branchId: v.optional(v.id("branches")), timeFilter: v.optional(v.string()) },
  handler: async (ctx, { reportId, branchId, timeFilter }) => {
    await requireAuth(ctx);

    let targetBranchId = branchId;
    
    if (reportId && reportId !== "all") {
      const report = await ctx.db.get(reportId as any) as any;
      if (report) targetBranchId = report.branchId;
    }

    if (!targetBranchId) return { kpis: [], hasTargets: false };

    const targets = await ctx.db
      .query("kpiTargets")
      .withIndex("by_branch", (q) => q.eq("branchId", targetBranchId))
      .collect();

    const targetMap = new Map(targets.map((t) => [t.kpiCode, t]));

    const [
      sales,
      fcSummary,
      salesCtrl,
      leftover,
      invVal,
      costAn,
      cashFlow,
      incentives,
    ] = await Promise.all([
      fetchData(ctx, "productSales", { reportId, branchId, timeFilter }),
      fetchData(ctx, "foodCostSummary", { reportId, branchId, timeFilter }),
      fetchData(ctx, "salesControl", { reportId, branchId, timeFilter }),
      fetchData(ctx, "leftoverItems", { reportId, branchId, timeFilter }),
      fetchData(ctx, "inventoryValuation", { reportId, branchId, timeFilter }),
      fetchData(ctx, "costAnalysis", { reportId, branchId, timeFilter }),
      fetchData(ctx, "dailyCashFlow", { reportId, branchId, timeFilter }),
      fetchData(ctx, "employeeIncentives", { reportId, branchId, timeFilter }),
    ]);

    const allChannelSales = sales.filter((s: any) => !s.channel || s.channel === "all");
    const totalRevenue = allChannelSales.reduce((s: number, item: any) => s + item.amount, 0);
    const totalCOGS = fcSummary.reduce((s: number, item: any) => s + item.usageValue, 0);
    const foodCostPct = totalRevenue > 0 ? (totalCOGS / totalRevenue) * 100 : 0;
    const grossMarginPct = totalRevenue > 0 ? ((totalRevenue - totalCOGS) / totalRevenue) * 100 : 0;

    const priceMap = new Map<string, number>();
    for (const inv of invVal) {
      priceMap.set(normalizeItemName(inv.itemName), inv.unitPrice);
    }
    let totalWasteCost = 0;
    for (const lo of leftover) {
      const price = priceMap.get(normalizeItemName(lo.itemName)) ?? 0;
      totalWasteCost += lo.qty * price;
    }
    const wastePct = totalRevenue > 0 ? (totalWasteCost / totalRevenue) * 100 : 0;

    const avgAchievement = salesCtrl.length > 0
      ? (salesCtrl.reduce((s: number, item: any) => s + item.achievementPct, 0) / salesCtrl.length) * 100
      : 0;

    const itemsWithPurchase = costAn.filter((c: any) => c.purchaseQty > 0);
    const purchaseEfficiency = itemsWithPurchase.length > 0
      ? itemsWithPurchase.reduce((s: number, c: any) => s + (c.usageQty / c.purchaseQty), 0) / itemsWithPurchase.length
      : 0;

    const cashTightDays = cashFlow.filter((d: any) => d.closingBalance < 500000).length;
    const totalIncentives = incentives.reduce((s: number, item: any) => s + item.amount, 0);
    const laborCostPct = totalRevenue > 0 ? (totalIncentives / totalRevenue) * 100 : 0;
    const totalPurchaseValue = costAn.reduce((s: number, c: any) => s + c.purchaseValue, 0);
    const totalVariance = costAn.reduce((s: number, c: any) => s + Math.abs(c.variance), 0);
    const varianceRatePct = totalPurchaseValue > 0 ? (totalVariance / totalPurchaseValue) * 100 : 0;
    const avgSpendingPower = salesCtrl.length > 0
      ? salesCtrl.reduce((s: number, item: any) => s + item.spendingPower, 0) / salesCtrl.length
      : 0;
    const totalInventoryValue = invVal.reduce((s: number, item: any) => s + item.totalValue, 0);
    const inventoryTurnover = totalInventoryValue > 0 ? totalCOGS / totalInventoryValue : 0;

    const actuals: Record<string, number> = {
      food_cost_pct: Math.round(foodCostPct * 10) / 10,
      gross_margin_pct: Math.round(grossMarginPct * 10) / 10,
      waste_pct: Math.round(wastePct * 10) / 10,
      sales_achievement_pct: Math.round(avgAchievement * 10) / 10,
      purchase_efficiency: Math.round(purchaseEfficiency * 100) / 100,
      cash_tight_days: cashTightDays,
      labor_cost_pct: Math.round(laborCostPct * 10) / 10,
      variance_rate_pct: Math.round(varianceRatePct * 10) / 10,
      avg_spending_power: Math.round(avgSpendingPower),
      inventory_turnover: Math.round(inventoryTurnover * 10) / 10,
    };

    const kpis = DEFAULT_KPIS.map((def) => {
      const target = targetMap.get(def.kpiCode);
      const actual = actuals[def.kpiCode] ?? 0;
      const t = target ?? def;

      return {
        kpiCode: def.kpiCode,
        kpiLabel: def.kpiLabel,
        unit: def.unit,
        direction: def.direction,
        actual,
        target: t.targetValue,
        warningThreshold: t.warningThreshold,
        dangerThreshold: t.dangerThreshold,
        status: evaluateKPI(actual, t.targetValue, t.warningThreshold, t.dangerThreshold, def.direction),
        targetId: target?._id ?? null,
      };
    });

    return { kpis, hasTargets: targets.length > 0 };
  },
});

// ─── Rich KPI Dashboard (date-range, prior, average) ─────────
//
// Returns each of 10 KPIs with actual / prior / average / ideal / target.
// ideal = DEFAULT_KPIS targetValue (industry standard).
// target = kpiTargets.targetValue (branch target).
// deltaPct = (actual - prior) / |prior| * 100.

async function fetchByDateRange(
  ctx: any,
  tableName: string,
  branchId: string,
  startMs: number,
  endMs: number,
): Promise<any[]> {
  const reports = await ctx.db
    .query("weeklyReports")
    .withIndex("by_branch", (q: any) => q.eq("branchId", branchId))
    .order("desc")
    .take(104);

  const overlapping = reports.filter((r: any) => {
    if (!r.periodStart || !r.periodEnd) return true;
    const ps = new Date(r.periodStart).getTime();
    const pe = new Date(r.periodEnd).getTime();
    return ps < endMs && pe >= startMs;
  });

  const ROW_CAP = 8000;
  const out: any[] = [];
  for (const r of overlapping) {
    const rows = await ctx.db
      .query(tableName as any)
      .withIndex("by_report", (q: any) => q.eq("reportId", r._id))
      .collect();
    for (const row of rows) {
      const dVal =
        row.businessDate || row.weekStart || row.valuationDate || row.periodStart;
      if (!dVal) { out.push(row); continue; }
      const t = new Date(dVal).getTime();
      if (t >= startMs && t < endMs) out.push(row);
    }
    if (out.length >= ROW_CAP) break;
  }
  return out.slice(0, ROW_CAP);
}

type KpiActuals = Record<string, number>;

async function computeActuals(
  ctx: any,
  branchId: string,
  startMs: number,
  endMs: number,
): Promise<KpiActuals> {
  const [sales, fcSummary, salesCtrl, leftover, invVal, costAn, cashFlow, incentives] =
    await Promise.all([
      fetchByDateRange(ctx, "productSales", branchId, startMs, endMs),
      fetchByDateRange(ctx, "foodCostSummary", branchId, startMs, endMs),
      fetchByDateRange(ctx, "salesControl", branchId, startMs, endMs),
      fetchByDateRange(ctx, "leftoverItems", branchId, startMs, endMs),
      fetchByDateRange(ctx, "inventoryValuation", branchId, startMs, endMs),
      fetchByDateRange(ctx, "costAnalysis", branchId, startMs, endMs),
      fetchByDateRange(ctx, "dailyCashFlow", branchId, startMs, endMs),
      fetchByDateRange(ctx, "employeeIncentives", branchId, startMs, endMs),
    ]);

  const allChannelSales = sales.filter((s: any) => !s.channel || s.channel === "all");
  const totalRevenue = allChannelSales.reduce((s: number, it: any) => s + it.amount, 0);
  const totalCOGS = fcSummary.reduce((s: number, it: any) => s + it.usageValue, 0);
  const foodCostPct = totalRevenue > 0 ? (totalCOGS / totalRevenue) * 100 : 0;
  const grossMarginPct = totalRevenue > 0 ? ((totalRevenue - totalCOGS) / totalRevenue) * 100 : 0;

  const priceMap = new Map<string, number>();
  for (const inv of invVal) priceMap.set(normalizeItemName(inv.itemName), inv.unitPrice);
  let totalWasteCost = 0;
  for (const lo of leftover) totalWasteCost += lo.qty * (priceMap.get(normalizeItemName(lo.itemName)) ?? 0);
  const wastePct = totalRevenue > 0 ? (totalWasteCost / totalRevenue) * 100 : 0;

  const avgAchievement = salesCtrl.length > 0
    ? (salesCtrl.reduce((s: number, it: any) => s + it.achievementPct, 0) / salesCtrl.length) * 100
    : 0;

  const itemsWithPurchase = costAn.filter((c: any) => c.purchaseQty > 0);
  const purchaseEfficiency = itemsWithPurchase.length > 0
    ? itemsWithPurchase.reduce((s: number, c: any) => s + (c.usageQty / c.purchaseQty), 0) / itemsWithPurchase.length
    : 0;

  const cashTightDays = cashFlow.filter((d: any) => d.closingBalance < 500000).length;
  const totalIncentives = incentives.reduce((s: number, it: any) => s + it.amount, 0);
  const laborCostPct = totalRevenue > 0 ? (totalIncentives / totalRevenue) * 100 : 0;

  const totalPurchaseValue = costAn.reduce((s: number, c: any) => s + c.purchaseValue, 0);
  const totalVariance = costAn.reduce((s: number, c: any) => s + Math.abs(c.variance), 0);
  const varianceRatePct = totalPurchaseValue > 0 ? (totalVariance / totalPurchaseValue) * 100 : 0;

  const avgSpendingPower = salesCtrl.length > 0
    ? salesCtrl.reduce((s: number, it: any) => s + it.spendingPower, 0) / salesCtrl.length
    : 0;

  const totalInventoryValue = invVal.reduce((s: number, it: any) => s + it.totalValue, 0);
  const inventoryTurnover = totalInventoryValue > 0 ? totalCOGS / totalInventoryValue : 0;

  return {
    food_cost_pct: foodCostPct,
    gross_margin_pct: grossMarginPct,
    waste_pct: wastePct,
    sales_achievement_pct: avgAchievement,
    purchase_efficiency: purchaseEfficiency,
    cash_tight_days: cashTightDays,
    labor_cost_pct: laborCostPct,
    variance_rate_pct: varianceRatePct,
    avg_spending_power: avgSpendingPower,
    inventory_turnover: inventoryTurnover,
  };
}

function roundActuals(a: KpiActuals): KpiActuals {
  return {
    food_cost_pct: Math.round(a.food_cost_pct * 10) / 10,
    gross_margin_pct: Math.round(a.gross_margin_pct * 10) / 10,
    waste_pct: Math.round(a.waste_pct * 10) / 10,
    sales_achievement_pct: Math.round(a.sales_achievement_pct * 10) / 10,
    purchase_efficiency: Math.round(a.purchase_efficiency * 100) / 100,
    cash_tight_days: Math.round(a.cash_tight_days),
    labor_cost_pct: Math.round(a.labor_cost_pct * 10) / 10,
    variance_rate_pct: Math.round(a.variance_rate_pct * 10) / 10,
    avg_spending_power: Math.round(a.avg_spending_power),
    inventory_turnover: Math.round(a.inventory_turnover * 10) / 10,
  };
}

function shiftRange(
  granularity: string,
  startMs: number,
  endMs: number,
  steps: number,
): { start: number; end: number } {
  if (granularity === "day") {
    const ms = 24 * 60 * 60 * 1000 * steps;
    return { start: startMs - ms, end: endMs - ms };
  }
  if (granularity === "week") {
    const ms = 7 * 24 * 60 * 60 * 1000 * steps;
    return { start: startMs - ms, end: endMs - ms };
  }
  if (granularity === "month") {
    const s = new Date(startMs);
    const e = new Date(endMs);
    return {
      start: new Date(s.getFullYear(), s.getMonth() - steps, s.getDate()).getTime(),
      end: new Date(e.getFullYear(), e.getMonth() - steps, e.getDate()).getTime(),
    };
  }
  if (granularity === "quarter") {
    const s = new Date(startMs);
    const e = new Date(endMs);
    return {
      start: new Date(s.getFullYear(), s.getMonth() - 3 * steps, s.getDate()).getTime(),
      end: new Date(e.getFullYear(), e.getMonth() - 3 * steps, e.getDate()).getTime(),
    };
  }
  const s = new Date(startMs);
  const e = new Date(endMs);
  return {
    start: new Date(s.getFullYear() - steps, s.getMonth(), s.getDate()).getTime(),
    end: new Date(e.getFullYear() - steps, e.getMonth(), e.getDate()).getTime(),
  };
}

function avgWindows(granularity: string): number {
  if (granularity === "day") return 12;
  if (granularity === "week") return 12;
  if (granularity === "month") return 12;
  if (granularity === "quarter") return 4;
  return 3;
}

export const getKpiDashboardRich = query({
  args: {
    branchId: v.id("branches"),
    startDate: v.number(),
    endDate: v.number(),
    granularity: v.union(
      v.literal("day"),
      v.literal("week"),
      v.literal("month"),
      v.literal("quarter"),
      v.literal("year"),
    ),
  },
  handler: async (ctx, { branchId, startDate, endDate, granularity }) => {
    await requireAuth(ctx);

    const targets = await ctx.db
      .query("kpiTargets")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .collect();
    const targetMap = new Map(targets.map((t) => [t.kpiCode, t]));

    const current = roundActuals(await computeActuals(ctx, branchId, startDate, endDate));
    const prior_ = shiftRange(granularity, startDate, endDate, 1);
    const prior = roundActuals(await computeActuals(ctx, branchId, prior_.start, prior_.end));

    const N = avgWindows(granularity);
    const avgRange = shiftRange(granularity, startDate, endDate, N);
    const avgRaw = await computeActuals(ctx, branchId, avgRange.start, endDate);
    const avg = roundActuals({
      food_cost_pct: avgRaw.food_cost_pct,
      gross_margin_pct: avgRaw.gross_margin_pct,
      waste_pct: avgRaw.waste_pct,
      sales_achievement_pct: avgRaw.sales_achievement_pct,
      purchase_efficiency: avgRaw.purchase_efficiency,
      cash_tight_days: avgRaw.cash_tight_days / N,
      labor_cost_pct: avgRaw.labor_cost_pct,
      variance_rate_pct: avgRaw.variance_rate_pct,
      avg_spending_power: avgRaw.avg_spending_power,
      inventory_turnover: avgRaw.inventory_turnover / N,
    });

    const kpis = DEFAULT_KPIS.map((def) => {
      const target = targetMap.get(def.kpiCode);
      const t = target ?? def;
      const actual = current[def.kpiCode] ?? 0;
      const priorVal = prior[def.kpiCode] ?? 0;
      const avgVal = avg[def.kpiCode] ?? 0;
      const deltaPct = priorVal !== 0
        ? Math.round(((actual - priorVal) / Math.abs(priorVal)) * 1000) / 10
        : null;
      return {
        kpiCode: def.kpiCode,
        kpiLabel: def.kpiLabel,
        unit: def.unit,
        direction: def.direction,
        actual,
        prior: priorVal,
        average: avgVal,
        ideal: def.targetValue,
        target: t.targetValue,
        warningThreshold: t.warningThreshold,
        dangerThreshold: t.dangerThreshold,
        deltaPct,
        status: evaluateKPI(actual, t.targetValue, t.warningThreshold, t.dangerThreshold, def.direction),
        targetId: target?._id ?? null,
      };
    });

    return { kpis, hasTargets: targets.length > 0 };
  },
});
