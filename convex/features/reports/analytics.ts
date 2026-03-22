/**
 * Analytics queries — cross-table business intelligence.
 *
 * Setiap query membaca data dari beberapa tabel report dan menghitung
 * insight: profitabilitas produk, efisiensi pembelian, waste, cash flow, dll.
 */

import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { normalizeItemName, matchItemNames } from "../../shared/helpers";

// ─── 1. Overview KPI ──────────────────────────────────────────

export const getAnalyticsOverview = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);

    const [sales, fcSummary, salesCtrl, leftover, invVal, hpp] = await Promise.all([
      ctx.db.query("productSales").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
      ctx.db.query("foodCostSummary").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
      ctx.db.query("salesControl").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
      ctx.db.query("leftoverItems").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
      ctx.db.query("inventoryValuation").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
      ctx.db.query("productHPP").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
    ]);

    // Revenue from sales (channel = undefined means "all"/dine-in)
    const allChannelSales = sales.filter((s) => !s.channel || s.channel === "all");
    const totalRevenue = allChannelSales.reduce((s, item) => s + item.amount, 0);

    // COGS from food cost summary
    const totalCOGS = fcSummary.reduce((s, item) => s + item.usageValue, 0);

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
    const totalCustomers = salesCtrl.reduce((s, item) => s + item.customerCount, 0);
    const avgSpendingPower = salesCtrl.length > 0
      ? salesCtrl.reduce((s, item) => s + item.spendingPower, 0) / salesCtrl.length
      : 0;
    const avgAchievement = salesCtrl.length > 0
      ? salesCtrl.reduce((s, item) => s + item.achievementPct, 0) / salesCtrl.length
      : 0;

    // HPP-based margin (alternative)
    const avgHPPMargin = hpp.length > 0
      ? hpp.filter((h) => h.sellingPrice && h.sellingPrice > 0)
          .reduce((s, h) => {
            const margin = ((h.sellingPrice! - h.totalHPP) / h.sellingPrice!) * 100;
            return s + margin;
          }, 0) / Math.max(hpp.filter((h) => h.sellingPrice && h.sellingPrice > 0).length, 1)
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
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);

    const [hpp, sales] = await Promise.all([
      ctx.db.query("productHPP").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
      ctx.db.query("productSales").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
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
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);

    const [vendor, costAn] = await Promise.all([
      ctx.db.query("vendorPurchases").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
      ctx.db.query("costAnalysis").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
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
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);

    const [leftover, invVal, hpp] = await Promise.all([
      ctx.db.query("leftoverItems").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
      ctx.db.query("inventoryValuation").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
      ctx.db.query("productHPP").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
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

    const totalWasteCost = topWastedItems.reduce((s, i) => s + i.estimatedCost, 0);
    const totalWasteQty = topWastedItems.reduce((s, i) => s + i.totalQty, 0);

    return {
      topWastedItems,
      dailyTrend: dailyData,
      totalWasteCost,
      totalWasteQty,
    };
  },
});

// ─── 5. Cash Flow Summary ─────────────────────────────────────

export const getCashFlowSummary = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);

    const [cashFlow, cashSummary] = await Promise.all([
      ctx.db.query("dailyCashFlow").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
      ctx.db.query("dailyCashSummary").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
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

    const daily: DailyFlow[] = cashFlow
      .sort((a, b) => a.businessDate.localeCompare(b.businessDate))
      .map((cf) => {
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

    const totalInflow = daily.reduce((s, d) => s + d.totalInflow, 0);
    const totalOutflow = daily.reduce((s, d) => s + d.totalOutflow, 0);
    const totalCommissions = daily.reduce((s, d) => s + d.commissions, 0);
    const tightDays = daily.filter((d) => d.isTight).length;

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
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);

    const [leftover, hpp, sales, vendor, costAn, invVal] = await Promise.all([
      ctx.db.query("leftoverItems").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
      ctx.db.query("productHPP").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
      ctx.db.query("productSales").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
      ctx.db.query("vendorPurchases").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
      ctx.db.query("costAnalysis").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
      ctx.db.query("inventoryValuation").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect(),
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
      const norm = normalizeItemName(name);
      if (!itemScores.has(norm)) {
        itemScores.set(norm, {
          itemName: name,
          wasteScore: 0,
          marginScore: 0,
          overPurchaseScore: 0,
          varianceScore: 0,
          signals: [],
        });
      }
      return itemScores.get(norm)!;
    };

    // 1. Waste scores (from leftover)
    const wasteByItem = new Map<string, number>();
    for (const lo of leftover) {
      const norm = normalizeItemName(lo.itemName);
      wasteByItem.set(norm, (wasteByItem.get(norm) ?? 0) + lo.qty);
    }
    const maxWaste = Math.max(...Array.from(wasteByItem.values()), 1);
    for (const [norm, qty] of wasteByItem) {
      const item = getOrCreate(norm);
      item.wasteScore = (qty / maxWaste) * 100;
      if (item.wasteScore > 50) item.signals.push(`Waste tinggi: ${qty} unit`);
    }

    // 2. Margin scores (from HPP)
    for (const h of hpp) {
      if (!h.sellingPrice || h.sellingPrice <= 0) continue;
      const item = getOrCreate(h.productName);
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
      item.overPurchaseScore = Math.min(100, Math.max(0, (ratio - 1) * 200));
      if (ratio > 1.3) item.signals.push(`Over-purchase: ${ratio.toFixed(2)}x`);
    }

    // 4. Variance scores (from cost analysis)
    const absVariances = costAn.map((ca) => Math.abs(ca.variance));
    const maxVariance = Math.max(...absVariances, 1);
    for (const ca of costAn) {
      const item = getOrCreate(ca.itemName);
      item.varianceScore = (Math.abs(ca.variance) / maxVariance) * 100;
      if (Math.abs(ca.variance) > maxVariance * 0.3) {
        item.signals.push(`Variance: ${ca.variance > 0 ? "+" : ""}Rp ${Math.round(ca.variance).toLocaleString()}`);
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
