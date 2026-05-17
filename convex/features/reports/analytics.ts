/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Analytics queries — cross-table business intelligence.
 *
 * Setiap query membaca data dari beberapa tabel report dan menghitung
 * insight: profitabilitas produk, efisiensi pembelian, waste, cash flow, dll.
 */

import { query, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { normalizeItemName, matchItemNames } from "../../shared/helpers";

async function fetchData(ctx: any, tableName: string, args: { reportId?: string; branchId?: string; timeFilter?: string }) {
  if (args.reportId && args.reportId !== "all") {
    return ctx.db.query(tableName as any).withIndex("by_report", (q: any) => q.eq("reportId", args.reportId)).collect();
  }
  if (!args.branchId) return [];
  // Bounded: last 52 reports + 5000 rows total to stay under Convex 8192.
  const reports = await ctx.db
    .query("weeklyReports")
    .withIndex("by_branch", (q: any) => q.eq("branchId", args.branchId as any))
    .order("desc")
    .take(52);
  const ROW_CAP = 5000;
  let allData: any[] = [];
  for (const r of reports) {
    const data = await ctx.db.query(tableName as any).withIndex("by_report", (q: any) => q.eq("reportId", r._id)).collect();
    allData.push(...data);
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

function hasReadableItemName(name: unknown): name is string {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();

  if (!trimmed) return false;
  if (/^[\d.,+\-/%]+$/.test(trimmed)) return false;

  return /[A-Za-z]/.test(trimmed);
}


// ─── 1. Overview KPI ──────────────────────────────────────────

export const getAnalyticsOverview = query({
  args: { reportId: v.optional(v.union(v.id("weeklyReports"), v.literal("all"))), branchId: v.optional(v.id("branches")), timeFilter: v.optional(v.string()) },
  handler: async (ctx, { reportId, branchId, timeFilter }) => {
    await requireAuth(ctx);

    const [sales, fcSummary, salesCtrl, leftover, invVal, hpp] = await Promise.all([
      fetchData(ctx, "productSales", { reportId, branchId, timeFilter }),
      fetchData(ctx, "foodCostSummary", { reportId, branchId, timeFilter }),
      fetchData(ctx, "salesControl", { reportId, branchId, timeFilter }),
      fetchData(ctx, "leftoverItems", { reportId, branchId, timeFilter }),
      fetchData(ctx, "inventoryValuation", { reportId, branchId, timeFilter }),
      fetchData(ctx, "productHPP", { reportId, branchId, timeFilter }),
    ]);

    // Revenue from sales (channel = undefined means "all"/dine-in)
    const allChannelSales = sales.filter((s: any) => !s.channel || s.channel === "all");
    const totalRevenue = allChannelSales.reduce((s: number, item: any) => s + item.amount, 0);

    // COGS from food cost summary
    const totalCOGS = fcSummary.reduce((s: number, item: any) => s + item.usageValue, 0);

    // Gross margin
    const grossMarginPct = totalRevenue > 0 ? ((totalRevenue - totalCOGS) / totalRevenue) * 100 : 0;

    // Food cost %
    const foodCostPct = totalRevenue > 0 ? (totalCOGS / totalRevenue) * 100 : 0;

    // Waste cost estimate (leftover qty * unit price from inventory valuation)
    const priceMap = new Map<string, number>();
    for (const inv of invVal) {
      priceMap.set(normalizeItemName(inv.itemName), inv.unitPrice);
    }
    let totalWasteCost = 0;
    for (const lo of leftover) {
      const norm = normalizeItemName(lo.itemName);
      const price = priceMap.get(norm) ?? 0;
      totalWasteCost += lo.qty * price;
    }

    // Sales control metrics
    const totalCustomers = salesCtrl.reduce((s: number, item: any) => s + item.customerCount, 0);
    const avgSpendingPower = salesCtrl.length > 0
      ? salesCtrl.reduce((s: number, item: any) => s + item.spendingPower, 0) / salesCtrl.length
      : 0;
    const avgAchievement = salesCtrl.length > 0
      ? salesCtrl.reduce((s: number, item: any) => s + item.achievementPct, 0) / salesCtrl.length
      : 0;

    // HPP-based margin (alternative)
    const avgHPPMargin = hpp.length > 0
      ? hpp.filter((h: any) => h.sellingPrice && h.sellingPrice > 0)
          .reduce((s: number, h: any) => {
            const margin = ((h.sellingPrice! - h.totalHPP) / h.sellingPrice!) * 100;
            return s + margin;
          }, 0) / Math.max(hpp.filter((h: any) => h.sellingPrice && h.sellingPrice > 0).length, 1)
      : 0;

    return {
      totalRevenue,
      totalCOGS,
      grossMarginPct: Math.round(grossMarginPct * 10) / 10,
      foodCostPct: Math.round(foodCostPct * 10) / 10,
      totalWasteCost: Math.round(totalWasteCost),
      totalCustomers,
      avgSpendingPower: Math.round(avgSpendingPower),
      avgAchievement: Math.round(avgAchievement * 1000) / 10, // pct display
      avgHPPMargin: Math.round(avgHPPMargin * 10) / 10,
      productCount: hpp.length,
      wasteItemCount: leftover.length,
    };
  },
});

// ─── 2. Product Profitability ─────────────────────────────────

export const getProductProfitability = query({
  args: { reportId: v.optional(v.union(v.id("weeklyReports"), v.literal("all"))), branchId: v.optional(v.id("branches")), timeFilter: v.optional(v.string()) },
  handler: async (ctx, { reportId, branchId, timeFilter }) => {
    await requireAuth(ctx);

    const [hpp, sales] = await Promise.all([
      fetchData(ctx, "productHPP", { reportId, branchId, timeFilter }),
      fetchData(ctx, "productSales", { reportId, branchId, timeFilter }),
    ]);

    // Aggregate sales by product name
    const salesByProduct = new Map<string, { totalQty: number; totalAmount: number; avgUnitPrice: number }>();
    for (const s of sales) {
      const norm = normalizeItemName(s.productName);
      const existing = salesByProduct.get(norm);
      if (existing) {
        existing.totalQty += s.qty;
        existing.totalAmount += s.amount;
      } else {
        salesByProduct.set(norm, { totalQty: s.qty, totalAmount: s.amount, avgUnitPrice: s.unitPrice });
      }
    }

    type ProfitItem = {
      productName: string;
      pricingClass: string;
      totalHPP: number;
      sellingPrice: number;
      marginRp: number;
      marginPct: number;
      totalQtySold: number;
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
      status: "good" | "warning" | "danger";
      ingredientCount: number;
    };

    const result: ProfitItem[] = [];

    for (const h of hpp) {
      const norm = normalizeItemName(h.productName);
      // Find matching sales
      let matchedSales: { totalQty: number; totalAmount: number; avgUnitPrice: number } | undefined;
      for (const [salesNorm, salesData] of salesByProduct) {
        if (matchItemNames(norm, salesNorm)) {
          matchedSales = salesData;
          break;
        }
      }

      const sellingPrice = h.sellingPrice ?? matchedSales?.avgUnitPrice ?? 0;
      const marginRp = sellingPrice - h.totalHPP;
      const marginPct = sellingPrice > 0 ? (marginRp / sellingPrice) * 100 : 0;

      const totalQtySold = matchedSales?.totalQty ?? 0;
      const totalRevenue = matchedSales?.totalAmount ?? 0;
      const totalCost = h.totalHPP * totalQtySold;
      const totalProfit = totalRevenue - totalCost;

      result.push({
        productName: h.productName,
        pricingClass: h.pricingClass,
        totalHPP: h.totalHPP,
        sellingPrice,
        marginRp: Math.round(marginRp),
        marginPct: Math.round(marginPct * 10) / 10,
        totalQtySold,
        totalRevenue: Math.round(totalRevenue),
        totalCost: Math.round(totalCost),
        totalProfit: Math.round(totalProfit),
        status: marginPct >= 35 ? "good" : marginPct >= 20 ? "warning" : "danger",
        ingredientCount: h.ingredients?.length ?? 0,
      });
    }

    // Sort by marginPct ascending (worst margins first)
    result.sort((a, b) => a.marginPct - b.marginPct);

    return result;
  },
});

// ─── 3. Purchase Efficiency ───────────────────────────────────

export const getPurchaseEfficiency = query({
  args: { reportId: v.optional(v.union(v.id("weeklyReports"), v.literal("all"))), branchId: v.optional(v.id("branches")), timeFilter: v.optional(v.string()) },
  handler: async (ctx, { reportId, branchId, timeFilter }) => {
    await requireAuth(ctx);

    const [vendor, costAn] = await Promise.all([
      fetchData(ctx, "vendorPurchases", { reportId, branchId, timeFilter }),
      fetchData(ctx, "costAnalysis", { reportId, branchId, timeFilter }),
    ]);

    type EfficiencyItem = {
      itemName: string;
      source: "vendor" | "costAnalysis" | "both";
      purchaseQty: number;
      purchaseValue: number;
      usageQty: number;
      usageValue: number;
      closingQty: number;
      ratio: number;
      status: "over" | "normal" | "under";
      overPurchaseCost: number;
    };

    const items = new Map<string, EfficiencyItem>();

    // From vendor purchases
    for (const v of vendor) {
      const norm = normalizeItemName(v.commodityName);
      items.set(norm, {
        itemName: v.commodityName,
        source: "vendor",
        purchaseQty: v.purchaseQty,
        purchaseValue: v.purchaseValue,
        usageQty: v.usageQty,
        usageValue: 0,
        closingQty: v.closingQty,
        ratio: v.usageQty > 0 ? v.purchaseQty / v.usageQty : 0,
        status: "normal",
        overPurchaseCost: 0,
      });
    }

    // Merge/add from cost analysis
    for (const ca of costAn) {
      const norm = normalizeItemName(ca.itemName);
      const existing = items.get(norm);
      if (existing) {
        existing.source = "both";
        existing.usageValue = ca.usageValue;
        // Use cost analysis data if more detailed
        if (ca.purchaseQty > 0) existing.purchaseQty = ca.purchaseQty;
        if (ca.usageQty > 0) existing.usageQty = ca.usageQty;
        existing.ratio = existing.usageQty > 0 ? existing.purchaseQty / existing.usageQty : 0;
      } else {
        items.set(norm, {
          itemName: ca.itemName,
          source: "costAnalysis",
          purchaseQty: ca.purchaseQty,
          purchaseValue: ca.purchaseValue,
          usageQty: ca.usageQty,
          usageValue: ca.usageValue,
          closingQty: ca.closingQty,
          ratio: ca.usageQty > 0 ? ca.purchaseQty / ca.usageQty : 0,
          status: "normal",
          overPurchaseCost: 0,
        });
      }
    }

    // Compute status and over-purchase cost
    const result: EfficiencyItem[] = [];
    for (const item of items.values()) {
      if (item.purchaseQty === 0 && item.usageQty === 0) continue;

      item.ratio = item.usageQty > 0 ? Math.round((item.purchaseQty / item.usageQty) * 100) / 100 : 0;
      item.status = item.ratio > 1.3 ? "over" : item.ratio < 0.7 ? "under" : "normal";

      // Estimate over-purchase cost
      if (item.ratio > 1 && item.usageQty > 0) {
        const excess = item.purchaseQty - item.usageQty;
        const unitCost = item.purchaseValue > 0 && item.purchaseQty > 0
          ? item.purchaseValue / item.purchaseQty
          : 0;
        item.overPurchaseCost = Math.round(excess * unitCost);
      }

      result.push(item);
    }

    // Sort by ratio descending (most over-purchased first)
    result.sort((a, b) => b.ratio - a.ratio);

    return result;
  },
});

// ─── 4. Waste Analysis ────────────────────────────────────────

export const getWasteAnalysis = query({
  args: { reportId: v.optional(v.union(v.id("weeklyReports"), v.literal("all"))), branchId: v.optional(v.id("branches")), timeFilter: v.optional(v.string()) },
  handler: async (ctx, { reportId, branchId, timeFilter }) => {
    await requireAuth(ctx);

    const [leftover, invVal, hpp] = await Promise.all([
      fetchData(ctx, "leftoverItems", { reportId, branchId, timeFilter }),
      fetchData(ctx, "inventoryValuation", { reportId, branchId, timeFilter }),
      fetchData(ctx, "productHPP", { reportId, branchId, timeFilter }),
    ]);

    // Build price map from inventory valuation and HPP
    const priceMap = new Map<string, number>();
    for (const inv of invVal) {
      priceMap.set(normalizeItemName(inv.itemName), inv.unitPrice);
    }
    for (const h of hpp) {
      if (!priceMap.has(normalizeItemName(h.productName))) {
        priceMap.set(normalizeItemName(h.productName), h.totalHPP);
      }
    }

    // Aggregate waste by item
    const wasteByItem = new Map<string, { itemName: string; totalQty: number; estimatedCost: number }>();
    const dailyTrend = new Map<string, { date: string; totalQty: number; totalCost: number }>();

    for (const lo of leftover) {
      const norm = normalizeItemName(lo.itemName);

      // Find unit price
      let unitPrice = priceMap.get(norm) ?? 0;
      if (unitPrice === 0) {
        // Fuzzy match
        for (const [pn, price] of priceMap) {
          if (matchItemNames(norm, pn)) {
            unitPrice = price;
            break;
          }
        }
      }

      const cost = lo.qty * unitPrice;

      // By item
      const existing = wasteByItem.get(norm);
      if (existing) {
        existing.totalQty += lo.qty;
        existing.estimatedCost += cost;
      } else {
        wasteByItem.set(norm, { itemName: lo.itemName, totalQty: lo.qty, estimatedCost: cost });
      }

      // Daily trend
      const dayEntry = dailyTrend.get(lo.businessDate);
      if (dayEntry) {
        dayEntry.totalQty += lo.qty;
        dayEntry.totalCost += cost;
      } else {
        dailyTrend.set(lo.businessDate, { date: lo.businessDate, totalQty: lo.qty, totalCost: cost });
      }
    }

    // Sort items by cost desc
    const topWastedItems = Array.from(wasteByItem.values())
      .sort((a, b) => b.estimatedCost - a.estimatedCost)
      .map((item) => ({
        ...item,
        estimatedCost: Math.round(item.estimatedCost),
      }));

    // Sort daily trend by date
    const dailyData = Array.from(dailyTrend.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ ...d, totalCost: Math.round(d.totalCost) }));

    const totalWasteCost = topWastedItems.reduce((s: number, i: any) => s + i.estimatedCost, 0);
    const totalWasteQty = topWastedItems.reduce((s: number, i: any) => s + i.totalQty, 0);

    return {
      topWastedItems,
      dailyTrend: dailyData,
      totalWasteCost,
      totalWasteQty,
    };
  },
});

export const getWasteAnalysisInternal = internalQuery({
  args: { reportId: v.optional(v.union(v.id("weeklyReports"), v.literal("all"))), branchId: v.optional(v.id("branches")), timeFilter: v.optional(v.string()) },
  handler: async (ctx, { reportId, branchId, timeFilter }) => {
    await requireAuth(ctx);

    const [leftover, invVal, hpp] = await Promise.all([
      fetchData(ctx, "leftoverItems", { reportId, branchId, timeFilter }),
      fetchData(ctx, "inventoryValuation", { reportId, branchId, timeFilter }),
      fetchData(ctx, "productHPP", { reportId, branchId, timeFilter }),
    ]);

    const priceMap = new Map<string, number>();
    for (const inv of invVal) {
      priceMap.set(normalizeItemName(inv.itemName), inv.unitPrice);
    }
    for (const h of hpp) {
      if (!priceMap.has(normalizeItemName(h.productName))) {
        priceMap.set(normalizeItemName(h.productName), h.totalHPP);
      }
    }

    const wasteByItem = new Map<string, { itemName: string; totalQty: number; estimatedCost: number }>();
    const dailyTrend = new Map<string, { date: string; totalQty: number; totalCost: number }>();

    for (const lo of leftover) {
      const norm = normalizeItemName(lo.itemName);
      let unitPrice = priceMap.get(norm) ?? 0;
      if (unitPrice === 0) {
        for (const [pn, price] of priceMap) {
          if (matchItemNames(norm, pn)) {
            unitPrice = price;
            break;
          }
        }
      }

      const cost = lo.qty * unitPrice;

      const existing = wasteByItem.get(norm);
      if (existing) {
        existing.totalQty += lo.qty;
        existing.estimatedCost += cost;
      } else {
        wasteByItem.set(norm, { itemName: lo.itemName, totalQty: lo.qty, estimatedCost: cost });
      }

      const dayEntry = dailyTrend.get(lo.businessDate);
      if (dayEntry) {
        dayEntry.totalQty += lo.qty;
        dayEntry.totalCost += cost;
      } else {
        dailyTrend.set(lo.businessDate, { date: lo.businessDate, totalQty: lo.qty, totalCost: cost });
      }
    }

    const topWastedItems = Array.from(wasteByItem.values())
      .sort((a, b) => b.estimatedCost - a.estimatedCost)
      .map((item) => ({
        ...item,
        estimatedCost: Math.round(item.estimatedCost),
      }));

    const topWastedByQty = Array.from(wasteByItem.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .map((item) => ({
        ...item,
        estimatedCost: Math.round(item.estimatedCost),
      }));

    const dailyData = Array.from(dailyTrend.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ ...d, totalCost: Math.round(d.totalCost) }));

    const totalWasteCost = topWastedItems.reduce((s: number, i: any) => s + i.estimatedCost, 0);
    const totalWasteQty = topWastedItems.reduce((s: number, i: any) => s + i.totalQty, 0);

    return {
      topWastedItems,
      topWastedByQty,
      dailyTrend: dailyData,
      totalWasteCost,
      totalWasteQty,
    };
  },
});

// ─── 5. Cash Flow Summary ─────────────────────────────────────

export const getCashFlowSummary = query({
  args: { reportId: v.optional(v.union(v.id("weeklyReports"), v.literal("all"))), branchId: v.optional(v.id("branches")), timeFilter: v.optional(v.string()) },
  handler: async (ctx, { reportId, branchId, timeFilter }) => {
    await requireAuth(ctx);

    const [cashFlow, cashSummary] = await Promise.all([
      fetchData(ctx, "dailyCashFlow", { reportId, branchId, timeFilter }),
      fetchData(ctx, "dailyCashSummary", { reportId, branchId, timeFilter }),
    ]);

    // Build commission map from kas periode
    const commissionByDate = new Map<string, number>();
    for (const cs of cashSummary) {
      const totalCommission = cs.komisiGofood + cs.komisiGrabfood + cs.komisiShopeefood;
      commissionByDate.set(cs.businessDate, totalCommission);
    }

    const CASH_TIGHT_THRESHOLD = 500_000;

    type DailyFlow = {
      date: string;
      openingBalance: number;
      salesInflow: number;
      otherInflow: number;
      totalInflow: number;
      expenseOutflow: number;
      otherOutflow: number;
      totalOutflow: number;
      closingBalance: number;
      commissions: number;
      isTight: boolean;
    };

    type CashFlowRow = {
      businessDate: string;
      openingBalance: number;
      salesInflow: number;
      otherInflow: number;
      expenseOutflow: number;
      otherOutflow: number;
      closingBalance: number;
    };

    const daily: DailyFlow[] = (cashFlow as CashFlowRow[])
      .sort((a, b) =>
        a.businessDate.localeCompare(b.businessDate)
      )
      .map((cf: CashFlowRow) => {
        const totalInflow = cf.salesInflow + cf.otherInflow;
        const totalOutflow = cf.expenseOutflow + cf.otherOutflow;
        const commissions = commissionByDate.get(cf.businessDate) ?? 0;
        return {
          date: cf.businessDate,
          openingBalance: cf.openingBalance,
          salesInflow: cf.salesInflow,
          otherInflow: cf.otherInflow,
          totalInflow,
          expenseOutflow: cf.expenseOutflow,
          otherOutflow: cf.otherOutflow,
          totalOutflow,
          closingBalance: cf.closingBalance,
          commissions,
          isTight: cf.closingBalance < CASH_TIGHT_THRESHOLD,
        };
      });

    const totalInflow = daily.reduce((s: number, d: any) => s + d.totalInflow, 0);
    const totalOutflow = daily.reduce((s: number, d: any) => s + d.totalOutflow, 0);
    const totalCommissions = daily.reduce((s: number, d: any) => s + d.commissions, 0);
    const tightDays = daily.filter((d: any) => d.isTight).length;

    return {
      daily,
      totalInflow: Math.round(totalInflow),
      totalOutflow: Math.round(totalOutflow),
      netCashFlow: Math.round(totalInflow - totalOutflow),
      totalCommissions: Math.round(totalCommissions),
      tightDays,
    };
  },
});

// ─── 6. Priority Items ────────────────────────────────────────

export const getPriorityItems = query({
  args: { reportId: v.optional(v.union(v.id("weeklyReports"), v.literal("all"))), branchId: v.optional(v.id("branches")), timeFilter: v.optional(v.string()) },
  handler: async (ctx, { reportId, branchId, timeFilter }) => {
    await requireAuth(ctx);

    const [leftover, hpp, vendor, costAn] = await Promise.all([
      fetchData(ctx, "leftoverItems", { reportId, branchId, timeFilter }),
      fetchData(ctx, "productHPP", { reportId, branchId, timeFilter }),
      fetchData(ctx, "vendorPurchases", { reportId, branchId, timeFilter }),
      fetchData(ctx, "costAnalysis", { reportId, branchId, timeFilter }),
    ]);

    // Build item universe (all unique items across tables)
    const itemScores = new Map<string, {
      itemName: string;
      wasteScore: number;
      marginScore: number;
      overPurchaseScore: number;
      varianceScore: number;
      signals: string[];
    }>();

    const getOrCreate = (name: string) => {
      if (!hasReadableItemName(name)) return null;

      const displayName = name.trim();
      const norm = normalizeItemName(name);
      if (!itemScores.has(norm)) {
        itemScores.set(norm, {
          itemName: displayName,
          wasteScore: 0,
          marginScore: 0,
          overPurchaseScore: 0,
          varianceScore: 0,
          signals: [],
        });
      } else {
        const existing = itemScores.get(norm)!;
        if (displayName.length > existing.itemName.length) {
          existing.itemName = displayName;
        }
      }
      return itemScores.get(norm)!;
    };

    // 1. Waste scores (from leftover)
    const wasteByItem = new Map<string, { qty: number; itemName: string }>();
    for (const lo of leftover) {
      if (!hasReadableItemName(lo.itemName)) continue;

      const norm = normalizeItemName(lo.itemName);
      const existing = wasteByItem.get(norm);
      if (existing) {
        existing.qty += lo.qty;
      } else {
        wasteByItem.set(norm, { qty: lo.qty, itemName: lo.itemName.trim() });
      }
    }
    const maxWaste = Math.max(...Array.from(wasteByItem.values(), (entry) => entry.qty), 1);
    for (const [, entry] of wasteByItem) {
      const item = getOrCreate(entry.itemName);
      if (!item) continue;

      item.wasteScore = (entry.qty / maxWaste) * 100;
      if (item.wasteScore > 50) item.signals.push(`Waste tinggi: ${entry.qty} unit`);
    }

    // 2. Margin scores (from HPP)
    for (const h of hpp) {
      if (!h.sellingPrice || h.sellingPrice <= 0) continue;
      const item = getOrCreate(h.productName);
      if (!item) continue;
      const marginPct = ((h.sellingPrice - h.totalHPP) / h.sellingPrice) * 100;
      // Lower margin = higher score (worse)
      item.marginScore = Math.max(0, 100 - marginPct * 2);
      if (marginPct < 20) item.signals.push(`Margin rendah: ${marginPct.toFixed(1)}%`);
    }

    // 3. Over-purchase scores (from vendor)
    for (const v of vendor) {
      if (v.usageQty <= 0) continue;
      const ratio = v.purchaseQty / v.usageQty;
      const item = getOrCreate(v.commodityName);
      if (!item) continue;
      item.overPurchaseScore = Math.min(100, Math.max(0, (ratio - 1) * 200));
      if (ratio > 1.3) item.signals.push(`Over-purchase: ${ratio.toFixed(2)}x`);
    }

    // 4. Variance scores (from cost analysis)
    type CostAnalysisRow = {
      itemName: string;
      variance: number;
    };

    const absVariances = (costAn as CostAnalysisRow[]).map((ca: CostAnalysisRow) => Math.abs(ca.variance));
    const maxVariance = Math.max(...absVariances, 1);
    for (const ca of costAn as CostAnalysisRow[]) {
      const item = getOrCreate(ca.itemName);
      if (!item) continue;
      item.varianceScore = (Math.abs(ca.variance) / maxVariance) * 100;
      if (Math.abs(ca.variance) > maxVariance * 0.3) {
        item.signals.push(`Variance: ${ca.variance > 0 ? "+" : ""}Rp ${Math.round(ca.variance).toLocaleString("id-ID")}`);
      }
    }

    // Compute composite score
    type PriorityItem = {
      itemName: string;
      wasteScore: number;
      marginScore: number;
      overPurchaseScore: number;
      varianceScore: number;
      priorityScore: number;
      priority: "critical" | "high" | "medium" | "low";
      signals: string[];
      action: string;
    };

    const result: PriorityItem[] = [];
    for (const item of itemScores.values()) {
      if (!hasReadableItemName(item.itemName)) continue;

      const priorityScore =
        item.wasteScore * 0.3 +
        item.marginScore * 0.25 +
        item.overPurchaseScore * 0.25 +
        item.varianceScore * 0.2;

      if (priorityScore < 5) continue; // Skip low-priority items

      let priority: PriorityItem["priority"];
      if (priorityScore >= 70) priority = "critical";
      else if (priorityScore >= 45) priority = "high";
      else if (priorityScore >= 25) priority = "medium";
      else priority = "low";

      // Generate action recommendation
      let action = "Monitor";
      if (item.overPurchaseScore > 50) action = "Kurangi pembelian";
      else if (item.marginScore > 50) action = "Naikkan harga / kurangi HPP";
      else if (item.wasteScore > 50) action = "Perbaiki penyimpanan / kurangi stok";
      else if (item.varianceScore > 50) action = "Investigasi selisih stok";

      result.push({
        ...item,
        signals: Array.from(new Set(item.signals)),
        priorityScore: Math.round(priorityScore),
        priority,
        action,
      });
    }

    // Sort by priority score descending
    result.sort((a, b) => b.priorityScore - a.priorityScore);

    return result.slice(0, 30);
  },
});
