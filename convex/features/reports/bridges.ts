/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ETL → CRUD bridges + master-data seeds.
 *
 * Background: xlsx upload populates ~17 staging tables tied to weeklyReports.
 * The operational CRUD tables (dailySales, dailyClosings, payables, stockItems,
 * expenses, ...) are READ by all `/finance` and `/operation` UI pages but never
 * received data from the ETL — they were CRUD-only by design. This file adds:
 *
 *  - seedMasterData()      : fixture expenseCategories + incomeChannels.
 *  - deriveVendors()       : scan creditPurchases.supplierName distinct → vendors.
 *  - bridge*()             : per-report mutations turning staging rows into CRUD rows.
 *  - backfillAllReports()  : action that loops every weeklyReports + runs each bridge.
 *
 * Idempotent: each bridge clears prior CRUD rows tagged to the same reportId
 * (or replays upsert by natural key) before inserting, so re-running is safe.
 */

import { mutation, action, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { requireAuth } from "../../shared/auth";

// ─── Master-data seeds ──────────────────────────────────────

const DEFAULT_EXPENSE_CATEGORIES: { name: string; type: any }[] = [
  { name: "Bahan Ayam", type: "cogs" },
  { name: "Bahan Pelengkap", type: "cogs" },
  { name: "Bahan Es", type: "cogs" },
  { name: "Bahan Minuman", type: "cogs" },
  { name: "Bahan Pembungkus", type: "cogs" },
  { name: "Minyak Goreng", type: "cogs" },
  { name: "Groceries/Bumbu", type: "cogs" },
  { name: "Pengeluaran Kas Kecil", type: "other" },
  { name: "Bahan Pembersih", type: "utility" },
  { name: "Transport", type: "utility" },
  { name: "Foto Copy/ATK", type: "other" },
  { name: "Lain-lain", type: "other" },
  { name: "BPJS", type: "bpjs" },
  { name: "Insentif / Gaji", type: "salary_support" },
  { name: "Maintenance", type: "maintenance" },
  { name: "Marketing", type: "marketing" },
  { name: "Platform Fee", type: "fee" },
];

const DEFAULT_INCOME_CHANNELS: { name: string; type: any; isSettlementDelayed: boolean }[] = [
  { name: "Tunai (Cash)", type: "cash", isSettlementDelayed: false },
  { name: "Dine-in", type: "dine_in", isSettlementDelayed: false },
  { name: "Take Away", type: "take_away", isSettlementDelayed: false },
  { name: "Gofood", type: "gofood", isSettlementDelayed: true },
  { name: "Grabfood", type: "grabfood", isSettlementDelayed: true },
  { name: "Shopeefood", type: "shopeefood", isSettlementDelayed: true },
  { name: "Transfer Bank", type: "transfer", isSettlementDelayed: false },
];

export const seedMasterData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    let catSeeded = 0;
    const existingCats = await ctx.db.query("expenseCategories").collect();
    const existingCatNames = new Set(existingCats.map((c) => c.name.toLowerCase()));
    for (const c of DEFAULT_EXPENSE_CATEGORIES) {
      if (existingCatNames.has(c.name.toLowerCase())) continue;
      await ctx.db.insert("expenseCategories", { ...c, uploadedBy: userId });
      catSeeded++;
    }

    let chanSeeded = 0;
    const existingChans = await ctx.db.query("incomeChannels").collect();
    const existingChanNames = new Set(existingChans.map((c) => c.name.toLowerCase()));
    for (const c of DEFAULT_INCOME_CHANNELS) {
      if (existingChanNames.has(c.name.toLowerCase())) continue;
      await ctx.db.insert("incomeChannels", { ...c, uploadedBy: userId });
      chanSeeded++;
    }

    return { categoriesSeeded: catSeeded, channelsSeeded: chanSeeded };
  },
});

// ─── Auto-derive vendors from creditPurchases ───────────────

export const deriveVendors = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const credits = await ctx.db.query("creditPurchases").take(8000);
    const existingVendors = await ctx.db.query("vendors").collect();
    const existingNames = new Set(existingVendors.map((v) => v.name.toLowerCase()));

    const distinct = new Set<string>();
    for (const c of credits) {
      const name = (c.supplierName ?? "").trim();
      if (name) distinct.add(name);
    }

    let inserted = 0;
    for (const name of distinct) {
      if (existingNames.has(name.toLowerCase())) continue;
      await ctx.db.insert("vendors", {
        name,
        type: "food_supplier",
        phone: "",
        notes: "Auto-derived from creditPurchases",
        isActive: true,
        uploadedBy: userId,
      });
      inserted++;
    }
    return { vendorsAdded: inserted, distinctNames: distinct.size };
  },
});

// ─── Helpers ────────────────────────────────────────────────

async function vendorIdByName(ctx: any, name: string): Promise<any> {
  const v = await ctx.db
    .query("vendors")
    .filter((q: any) => q.eq(q.field("name"), name))
    .first();
  return v?._id ?? null;
}

async function channelIdByPattern(ctx: any, hint: string): Promise<{ id: any; name: string } | null> {
  const chans = await ctx.db.query("incomeChannels").collect();
  const upper = hint.toUpperCase();
  const map: Record<string, string> = {
    gofood: "gofood",
    grabfood: "grabfood",
    shopeefood: "shopeefood",
    all: "cash",
    tambahan: "other",
  };
  const targetType = map[hint] ?? "cash";
  let chan = chans.find((c: any) => c.type === targetType);
  if (!chan && upper.includes("CASH")) chan = chans.find((c: any) => c.type === "cash");
  if (!chan) chan = chans[0];
  return chan ? { id: chan._id, name: chan.name } : null;
}

// ─── Bridge 1: productSales → dailySales ────────────────────

export const bridgeProductSalesToDailySales = mutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    const report: any = await ctx.db.get(reportId);
    if (!report) return { inserted: 0, reason: "report not found" };

    const sales = await ctx.db
      .query("productSales")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();

    // Aggregate by (channel, businessDate)
    const groups = new Map<string, { channel: string; date: string; gross: number }>();
    for (const s of sales) {
      const channel = s.channel ?? "all";
      const key = `${channel}::${s.businessDate}`;
      const g = groups.get(key) ?? { channel, date: s.businessDate, gross: 0 };
      g.gross += s.amount;
      groups.set(key, g);
    }

    // Lookup platform fees per date from dailyCashSummary
    const cashSummaries = await ctx.db
      .query("dailyCashSummary")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
    const summByDate = new Map<string, any>();
    for (const cs of cashSummaries) summByDate.set(cs.businessDate, cs);

    // Wipe existing dailySales for this branch+date range to avoid dupes (idempotent)
    const dateSet = new Set(Array.from(groups.values()).map((g) => g.date));
    for (const d of dateSet) {
      const existing = await ctx.db
        .query("dailySales")
        .withIndex("by_branch_date", (q) => q.eq("branchId", report.branchId).eq("businessDate", d))
        .collect();
      for (const e of existing) await ctx.db.delete(e._id);
    }

    let inserted = 0;
    for (const g of groups.values()) {
      const chan = await channelIdByPattern(ctx, g.channel);
      if (!chan) continue;
      const summ = summByDate.get(g.date);
      const platformFee =
        g.channel === "gofood" ? (summ?.komisiGofood ?? 0)
        : g.channel === "grabfood" ? (summ?.komisiGrabfood ?? 0)
        : g.channel === "shopeefood" ? (summ?.komisiShopeefood ?? 0)
        : 0;
      const promoCost = g.channel !== "all" ? (summ?.discount ?? 0) / 4 : 0;
      const netAmount = Math.max(0, g.gross - platformFee - promoCost);
      const cashReceivedAmount = g.channel === "all" ? netAmount : 0;

      await ctx.db.insert("dailySales", {
        businessDate: g.date,
        channelId: chan.id,
        channelName: chan.name,
        grossAmount: g.gross,
        platformFee,
        promoCost,
        netAmount,
        cashReceivedAmount,
        settlementDate: undefined,
        referenceNo: `etl:${reportId}:${g.channel}:${g.date}`,
        status: "recorded" as const,
        branchId: report.branchId,
      });
      inserted++;
    }
    return { inserted };
  },
});

// ─── Bridge 2: dailyCashFlow → dailyClosings ────────────────

export const bridgeDailyCashFlowToClosings = mutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    const userId = await requireAuth(ctx);
    const report: any = await ctx.db.get(reportId);
    if (!report) return { inserted: 0, reason: "report not found" };

    const flows = await ctx.db
      .query("dailyCashFlow")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();

    let inserted = 0;
    for (const f of flows) {
      // Idempotent: delete existing closing for (branch, date)
      const existing = await ctx.db
        .query("dailyClosings")
        .withIndex("by_branch_date", (q) => q.eq("branchId", report.branchId).eq("businessDate", f.businessDate))
        .collect();
      for (const e of existing) await ctx.db.delete(e._id);

      const expensesPaidCash = f.expenseOutflow + f.otherOutflow;
      const expectedCash = f.openingBalance + f.salesInflow + f.otherInflow - expensesPaidCash;
      const difference = f.closingBalance - expectedCash;

      await ctx.db.insert("dailyClosings", {
        businessDate: f.businessDate,
        openingCash: f.openingBalance,
        cashSales: f.salesInflow,
        nonCashSales: 0,
        expensesPaidCash,
        expectedCash,
        actualCash: f.closingBalance,
        difference,
        status: "submitted" as const,
        submittedBy: userId,
        submittedAt: new Date().toISOString(),
        branchId: report.branchId,
      });
      inserted++;
    }
    return { inserted };
  },
});

// ─── Bridge 3: creditPurchases → payables ──────────────────

export const bridgeCreditPurchasesToPayables = mutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    const report: any = await ctx.db.get(reportId);
    if (!report) return { inserted: 0, reason: "report not found" };

    const credits = await ctx.db
      .query("creditPurchases")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();

    // Group by (supplier, invoiceNo or purchaseDate)
    const groups = new Map<string, { supplier: string; invoiceDate: string; dueDate: string; amount: number; paidDate?: string; items: string[] }>();
    for (const c of credits) {
      const invoice = c.invoiceNo ?? c.purchaseDate;
      const key = `${c.supplierName}::${invoice}`;
      const g = groups.get(key) ?? {
        supplier: c.supplierName,
        invoiceDate: c.purchaseDate,
        dueDate: c.dueDate ?? c.purchaseDate,
        amount: 0,
        paidDate: c.paidDate,
        items: [],
      };
      g.amount += c.totalAmount;
      g.items.push(c.itemName);
      if (c.paidDate && (!g.paidDate || c.paidDate > g.paidDate)) g.paidDate = c.paidDate;
      groups.set(key, g);
    }

    // Wipe existing payables tagged to this report (description prefix)
    const tag = `etl:${reportId}`;
    const existing = await ctx.db
      .query("payables")
      .withIndex("by_branch", (q) => q.eq("branchId", report.branchId))
      .collect();
    for (const e of existing) {
      if (e.description.startsWith(tag)) await ctx.db.delete(e._id);
    }

    let inserted = 0;
    for (const g of groups.values()) {
      const vendorId = await vendorIdByName(ctx, g.supplier);
      if (!vendorId) continue; // skip if vendor not in master
      const paidAmount = g.paidDate ? g.amount : 0;
      const status =
        paidAmount >= g.amount ? "paid" as const
        : paidAmount > 0 ? "partial" as const
        : (g.dueDate && Date.parse(g.dueDate) < Date.now() ? "overdue" as const : "open" as const);

      await ctx.db.insert("payables", {
        vendorId,
        vendorName: g.supplier,
        invoiceDate: g.invoiceDate,
        dueDate: g.dueDate,
        amount: g.amount,
        paidAmount,
        status,
        description: `${tag}: ${g.items.slice(0, 3).join(", ")}${g.items.length > 3 ? " +" + (g.items.length - 3) : ""}`,
        branchId: report.branchId,
      });
      inserted++;
    }
    return { inserted, groupCount: groups.size };
  },
});

// ─── Bridge 4: inventoryValuation → stockItems ──────────────

export const bridgeInventoryToStock = mutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    const report: any = await ctx.db.get(reportId);
    if (!report) return { upserted: 0, reason: "report not found" };

    const valuations = await ctx.db
      .query("inventoryValuation")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();

    // Pick the LATEST valuationDate per item
    const latest = new Map<string, any>();
    for (const v of valuations) {
      const prior = latest.get(v.itemName);
      if (!prior || v.valuationDate > prior.valuationDate) latest.set(v.itemName, v);
    }

    let upserted = 0;
    for (const v of latest.values()) {
      // Look up existing stockItem
      const existing = await ctx.db
        .query("stockItems")
        .withIndex("by_branch", (q) => q.eq("branchId", report.branchId))
        .filter((q: any) => q.eq(q.field("name"), v.itemName))
        .first();

      const status =
        v.qty <= 0 ? "Critical" as const
        : v.qty < 5 ? "Low" as const
        : "Stable" as const;

      if (existing) {
        await ctx.db.patch(existing._id, {
          currentQty: v.qty,
          unit: v.unit,
          status,
        });
      } else {
        await ctx.db.insert("stockItems", {
          name: v.itemName,
          currentQty: v.qty,
          unit: v.unit,
          minQty: 0,
          status,
          branchId: report.branchId,
        });
      }
      upserted++;
    }
    return { upserted };
  },
});

// ─── Bridge 5: dailyCashFlow.expenseOutflow → expenses ─────

export const bridgeCashFlowToExpenses = mutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    const report: any = await ctx.db.get(reportId);
    if (!report) return { inserted: 0, reason: "report not found" };

    // Find the "Pengeluaran Kas Kecil" category
    const categories = await ctx.db.query("expenseCategories").collect();
    const cat =
      categories.find((c) => c.name === "Pengeluaran Kas Kecil") ??
      categories.find((c) => c.type === "other") ??
      categories[0];
    if (!cat) return { inserted: 0, reason: "no expenseCategories — run seedMasterData first" };

    const flows = await ctx.db
      .query("dailyCashFlow")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();

    // Idempotent: clear ETL-tagged expenses for this report's branch dates
    const datesIn = new Set(flows.map((f) => f.businessDate));
    const tag = `etl:${reportId}`;
    for (const d of datesIn) {
      const existing = await ctx.db
        .query("expenses")
        .withIndex("by_branch_date", (q) => q.eq("branchId", report.branchId).eq("expenseDate", d))
        .collect();
      for (const e of existing) {
        if (e.description.startsWith(tag)) await ctx.db.delete(e._id);
      }
    }

    let inserted = 0;
    for (const f of flows) {
      const totalOut = f.expenseOutflow + f.otherOutflow;
      if (totalOut <= 0) continue;
      await ctx.db.insert("expenses", {
        expenseDate: f.businessDate,
        categoryId: cat._id,
        categoryName: cat.name,
        amount: totalOut,
        description: `${tag}: pengeluaran harian (kas kecil + lain-lain) dari LAP. CF`,
        paymentSource: "petty_cash" as const,
        status: "approved" as const,
        hasAttachment: false,
        branchId: report.branchId,
      });
      inserted++;
    }
    return { inserted };
  },
});

// ─── Per-report orchestrator ───────────────────────────────

export const bridgeOneReport = mutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, args): Promise<any> => {
    // Call each bridge inline (mutations can't call other mutations in Convex,
    // so we inline-await each — they all share the same ctx atomically).
    // Actually mutations DO nest via direct function call since they share db.
    // But Convex linting prefers we run them as separate operations.
    // We re-implement minimal coordination here.
    return { reportId: args.reportId, note: "run individual bridges via action" };
  },
});

// ─── Backfill action over all weeklyReports ────────────────

export const backfillAllReports = action({
  args: {},
  handler: async (ctx): Promise<{ reports: number; results: any[]; movementsByBranch: any[] }> => {
    // 1. Seed master data first
    await ctx.runMutation(internal.features.reports.bridges.seedMasterDataInternal);
    await ctx.runMutation(internal.features.reports.bridges.deriveVendorsInternal);

    // 2. List all reports
    const reports: any[] = await ctx.runQuery(internal.features.reports.bridges.listAllReportsInternal);

    const results: any[] = [];
    const branchesTouched = new Set<string>();
    for (const r of reports) {
      branchesTouched.add(r.branchId);
      const sales = await ctx.runMutation(internal.features.reports.bridges.bridgeProductSalesToDailySalesInternal, { reportId: r._id });
      const closings = await ctx.runMutation(internal.features.reports.bridges.bridgeDailyCashFlowToClosingsInternal, { reportId: r._id });
      const payables = await ctx.runMutation(internal.features.reports.bridges.bridgeCreditPurchasesToPayablesInternal, { reportId: r._id });
      const stock = await ctx.runMutation(internal.features.reports.bridges.bridgeInventoryToStockInternal, { reportId: r._id });
      const expenses = await ctx.runMutation(internal.features.reports.bridges.bridgeCashFlowToExpensesInternal, { reportId: r._id });
      const transfers = await ctx.runMutation(internal.features.reports.bridges.bridgeCashFlowToOwnerTransfersInternal, { reportId: r._id });
      const incentives = await ctx.runMutation(internal.features.reports.bridges.bridgeIncentivesToExpensesInternal, { reportId: r._id });
      results.push({
        reportId: r._id,
        fileName: r.fileName,
        sales, closings, payables, stock, expenses, transfers, incentives,
      });
    }

    // 3. After per-report inserts, compute inventory deltas across all reports per branch
    const movementsByBranch: any[] = [];
    for (const branchId of branchesTouched) {
      const m = await ctx.runMutation(internal.features.reports.bridges.bridgeInventoryDeltasToMovementsInternal, { branchId: branchId as any });
      movementsByBranch.push({ branchId, ...m });
    }

    return { reports: reports.length, results, movementsByBranch };
  },
});

// ─── Internal mirrors (action can only invoke internal mutations) ─

import { internalQuery } from "../../_generated/server";

export const listAllReportsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("weeklyReports").collect();
  },
});

export const seedMasterDataInternal = internalMutation({
  args: {},
  handler: async (ctx): Promise<any> => {
    let catSeeded = 0;
    const existingCats = await ctx.db.query("expenseCategories").collect();
    const existingCatNames = new Set(existingCats.map((c) => c.name.toLowerCase()));
    for (const c of DEFAULT_EXPENSE_CATEGORIES) {
      if (existingCatNames.has(c.name.toLowerCase())) continue;
      await ctx.db.insert("expenseCategories", { ...c, uploadedBy: "system" });
      catSeeded++;
    }
    let chanSeeded = 0;
    const existingChans = await ctx.db.query("incomeChannels").collect();
    const existingChanNames = new Set(existingChans.map((c) => c.name.toLowerCase()));
    for (const c of DEFAULT_INCOME_CHANNELS) {
      if (existingChanNames.has(c.name.toLowerCase())) continue;
      await ctx.db.insert("incomeChannels", { ...c, uploadedBy: "system" });
      chanSeeded++;
    }
    return { categoriesSeeded: catSeeded, channelsSeeded: chanSeeded };
  },
});

function inferVendorType(name: string): "food_supplier" | "utility" | "service" | "payroll" | "misc" {
  const up = name.toUpperCase();
  if (up.includes("PLN") || up.includes("PDAM") || up.includes("LISTRIK") || up.includes("AIR") || up.includes("WIFI") || up.includes("INTERNET") || up.includes("INDIHOME")) return "utility";
  if (up.includes("GAS") || up.includes("ELPIJI")) return "utility";
  if (up.includes("KARYAWAN") || up.includes("GAJI") || up.includes("INSENTIF")) return "payroll";
  if (up.includes("SERVICE") || up.includes("REPAIR") || up.includes("PERBAIKAN") || up.includes("BPJS")) return "service";
  if (up.includes("FOTO COPY") || up.includes("ATK") || up.includes("KAS KECIL")) return "misc";
  return "food_supplier";
}

export const deriveVendorsInternal = internalMutation({
  args: {},
  handler: async (ctx): Promise<any> => {
    const credits = await ctx.db.query("creditPurchases").take(8000);
    const existingVendors = await ctx.db.query("vendors").collect();
    const existingNames = new Set(existingVendors.map((v) => v.name.toLowerCase()));
    const distinct = new Set<string>();
    for (const c of credits) {
      const name = (c.supplierName ?? "").trim();
      if (name) distinct.add(name);
    }
    let inserted = 0;
    for (const name of distinct) {
      if (existingNames.has(name.toLowerCase())) continue;
      await ctx.db.insert("vendors", {
        name, type: inferVendorType(name), phone: "", notes: "Auto-derived", isActive: true, uploadedBy: "system",
      });
      inserted++;
    }
    return { vendorsAdded: inserted };
  },
});

export const bridgeProductSalesToDailySalesInternal = internalMutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }): Promise<any> => {
    const report: any = await ctx.db.get(reportId);
    if (!report) return { inserted: 0 };
    const sales = await ctx.db.query("productSales").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect();
    const groups = new Map<string, { channel: string; date: string; gross: number }>();
    for (const s of sales) {
      const channel = s.channel ?? "all";
      const key = `${channel}::${s.businessDate}`;
      const g = groups.get(key) ?? { channel, date: s.businessDate, gross: 0 };
      g.gross += s.amount;
      groups.set(key, g);
    }
    // Pre-compute total gross per date for proportional promo allocation
    const grossByDate = new Map<string, number>();
    for (const g of groups.values()) {
      grossByDate.set(g.date, (grossByDate.get(g.date) ?? 0) + g.gross);
    }

    const cashSummaries = await ctx.db.query("dailyCashSummary").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect();
    const summByDate = new Map<string, any>();
    for (const cs of cashSummaries) summByDate.set(cs.businessDate, cs);
    const dateSet = new Set(Array.from(groups.values()).map((g) => g.date));
    for (const d of dateSet) {
      const existing = await ctx.db.query("dailySales").withIndex("by_branch_date", (q) => q.eq("branchId", report.branchId).eq("businessDate", d)).collect();
      for (const e of existing) await ctx.db.delete(e._id);
    }
    let inserted = 0;
    let rowIdx = 0;
    for (const g of groups.values()) {
      const chan = await channelIdByPattern(ctx, g.channel);
      if (!chan) continue;
      const summ = summByDate.get(g.date);
      const platformFee = g.channel === "gofood" ? (summ?.komisiGofood ?? 0)
        : g.channel === "grabfood" ? (summ?.komisiGrabfood ?? 0)
        : g.channel === "shopeefood" ? (summ?.komisiShopeefood ?? 0) : 0;
      // Proportional promo: allocate total discount by channel's share of daily gross
      const dayTotalGross = grossByDate.get(g.date) ?? 0;
      const totalDiscount = summ?.discount ?? 0;
      const promoCost = dayTotalGross > 0 ? (g.gross / dayTotalGross) * totalDiscount : 0;
      const netAmount = Math.max(0, g.gross - platformFee - promoCost);
      const cashReceivedAmount = g.channel === "all" ? netAmount : 0;
      const sheetMap: Record<string, string> = {
        all: "LAP. PENJUALAN", gofood: "LAP. PENJUALAN GRAB FOOD",
        grabfood: "LAP. PENJUALAN GRAB FOOD", shopeefood: "LAP. PENJUALAN SHOPEE FOOD", tambahan: "LAP. PENJUALAN",
      };
      await ctx.db.insert("dailySales", {
        businessDate: g.date, channelId: chan.id, channelName: chan.name,
        grossAmount: g.gross, platformFee, promoCost, netAmount, cashReceivedAmount,
        settlementDate: undefined, referenceNo: `etl:${reportId}:${g.channel}:${g.date}`,
        status: "recorded", branchId: report.branchId,
        etlSource: {
          reportId,
          stagingTable: "productSales",
          tabLabel: "Penjualan",
          rowIndex: rowIdx,
          sheetName: sheetMap[g.channel] ?? "LAP. PENJUALAN",
          fileName: report.fileName,
          periodStart: report.periodStart,
          periodEnd: report.periodEnd,
        },
      });
      inserted++;
      rowIdx++;
    }
    return { inserted };
  },
});

export const bridgeDailyCashFlowToClosingsInternal = internalMutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }): Promise<any> => {
    const report: any = await ctx.db.get(reportId);
    if (!report) return { inserted: 0 };
    const flows = await ctx.db.query("dailyCashFlow").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect();
    let inserted = 0;
    let rowIdx = 0;
    for (const f of flows) {
      const existing = await ctx.db.query("dailyClosings").withIndex("by_branch_date", (q) => q.eq("branchId", report.branchId).eq("businessDate", f.businessDate)).collect();
      for (const e of existing) await ctx.db.delete(e._id);
      const expensesPaidCash = f.expenseOutflow + f.otherOutflow;
      const expectedCash = f.openingBalance + f.salesInflow + f.otherInflow - expensesPaidCash;
      const difference = f.closingBalance - expectedCash;
      await ctx.db.insert("dailyClosings", {
        businessDate: f.businessDate, openingCash: f.openingBalance, cashSales: f.salesInflow,
        nonCashSales: 0, expensesPaidCash, expectedCash, actualCash: f.closingBalance, difference,
        status: "submitted", submittedBy: "system", submittedAt: new Date().toISOString(), branchId: report.branchId,
        etlSource: {
          reportId, stagingTable: "dailyCashFlow", tabLabel: "Arus Kas",
          rowIndex: rowIdx, sheetName: "LAP. CF",
          fileName: report.fileName, periodStart: report.periodStart, periodEnd: report.periodEnd,
        },
      });
      inserted++;
      rowIdx++;
    }
    return { inserted };
  },
});

export const bridgeCreditPurchasesToPayablesInternal = internalMutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }): Promise<any> => {
    const report: any = await ctx.db.get(reportId);
    if (!report) return { inserted: 0 };
    const credits = await ctx.db.query("creditPurchases").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect();
    const groups = new Map<string, any>();
    for (const c of credits) {
      const invoice = c.invoiceNo ?? c.purchaseDate;
      const key = `${c.supplierName}::${invoice}`;
      const g = groups.get(key) ?? { supplier: c.supplierName, invoiceDate: c.purchaseDate, dueDate: c.dueDate ?? c.purchaseDate, amount: 0, paidDate: c.paidDate, items: [] as string[] };
      g.amount += c.totalAmount;
      g.items.push(c.itemName);
      if (c.paidDate && (!g.paidDate || c.paidDate > g.paidDate)) g.paidDate = c.paidDate;
      groups.set(key, g);
    }
    const tag = `etl:${reportId}`;
    const existing = await ctx.db.query("payables").withIndex("by_branch", (q) => q.eq("branchId", report.branchId)).collect();
    for (const e of existing) {
      if (e.description.startsWith(tag)) await ctx.db.delete(e._id);
    }
    let inserted = 0;
    let rowIdx = 0;
    for (const g of groups.values()) {
      const vendorId = await vendorIdByName(ctx, g.supplier);
      if (!vendorId) continue;
      const paidAmount = g.paidDate ? g.amount : 0;
      const status =
        paidAmount >= g.amount ? "paid"
        : paidAmount > 0 ? "partial"
        : (g.dueDate && Date.parse(g.dueDate) < Date.now() ? "overdue" : "open");
      await ctx.db.insert("payables", {
        vendorId, vendorName: g.supplier, invoiceDate: g.invoiceDate, dueDate: g.dueDate,
        amount: g.amount, paidAmount, status,
        description: `${tag}: ${g.items.slice(0, 3).join(", ")}${g.items.length > 3 ? " +" + (g.items.length - 3) : ""}`,
        branchId: report.branchId,
        etlSource: {
          reportId, stagingTable: "creditPurchases", tabLabel: "Pembelian Kredit",
          rowIndex: rowIdx, sheetName: "PEMBELIAN KREDIT",
          fileName: report.fileName, periodStart: report.periodStart, periodEnd: report.periodEnd,
        },
      });
      inserted++;
      rowIdx++;
    }
    return { inserted };
  },
});

export const bridgeInventoryToStockInternal = internalMutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }): Promise<any> => {
    const report: any = await ctx.db.get(reportId);
    if (!report) return { upserted: 0 };
    const valuations = await ctx.db.query("inventoryValuation").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect();
    const latest = new Map<string, any>();
    for (const v of valuations) {
      const prior = latest.get(v.itemName);
      if (!prior || v.valuationDate > prior.valuationDate) latest.set(v.itemName, v);
    }
    let upserted = 0;
    let rowIdx = 0;
    for (const v of latest.values()) {
      const existing = await ctx.db.query("stockItems").withIndex("by_branch", (q) => q.eq("branchId", report.branchId)).filter((q: any) => q.eq(q.field("name"), v.itemName)).first();
      const status = v.qty <= 0 ? "Critical" : v.qty < 5 ? "Low" : "Stable";
      const etlSource = {
        reportId, stagingTable: "inventoryValuation", tabLabel: "Inventory",
        rowIndex: rowIdx, sheetName: "WEEKLY FC",
        fileName: report.fileName, periodStart: report.periodStart, periodEnd: report.periodEnd,
      };
      if (existing) {
        await ctx.db.patch(existing._id, { currentQty: v.qty, unit: v.unit, status, etlSource });
      } else {
        await ctx.db.insert("stockItems", { name: v.itemName, currentQty: v.qty, unit: v.unit, minQty: 0, status, branchId: report.branchId, etlSource });
      }
      upserted++;
      rowIdx++;
    }
    return { upserted };
  },
});

export const bridgeCashFlowToExpensesInternal = internalMutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }): Promise<any> => {
    const report: any = await ctx.db.get(reportId);
    if (!report) return { inserted: 0 };
    const categories = await ctx.db.query("expenseCategories").collect();
    const cat = categories.find((c) => c.name === "Pengeluaran Kas Kecil") ?? categories.find((c) => c.type === "other") ?? categories[0];
    if (!cat) return { inserted: 0, reason: "no categories" };
    const flows = await ctx.db.query("dailyCashFlow").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect();
    const tag = `etl:${reportId}`;
    for (const f of flows) {
      const existing = await ctx.db.query("expenses").withIndex("by_branch_date", (q) => q.eq("branchId", report.branchId).eq("expenseDate", f.businessDate)).collect();
      for (const e of existing) {
        if (e.description.startsWith(tag)) await ctx.db.delete(e._id);
      }
    }
    let inserted = 0;
    let rowIdx = 0;
    for (const f of flows) {
      const totalOut = f.expenseOutflow + f.otherOutflow;
      if (totalOut <= 0) continue;
      const breakdown = f.otherOutflow > 0
        ? `Kas Kecil Rp ${f.expenseOutflow.toLocaleString("id-ID")} + Lain-lain Rp ${f.otherOutflow.toLocaleString("id-ID")}`
        : `Kas Kecil Rp ${f.expenseOutflow.toLocaleString("id-ID")}`;
      await ctx.db.insert("expenses", {
        expenseDate: f.businessDate, categoryId: cat._id, categoryName: cat.name,
        amount: totalOut,
        description: `${tag}: pengeluaran harian ${f.businessDate} · ${breakdown}`,
        paymentSource: "petty_cash", status: "approved", hasAttachment: false, branchId: report.branchId,
        etlSource: {
          reportId, stagingTable: "dailyCashFlow", tabLabel: "Arus Kas",
          rowIndex: rowIdx, sheetName: "LAP. CF",
          fileName: report.fileName, periodStart: report.periodStart, periodEnd: report.periodEnd,
        },
      });
      inserted++;
      rowIdx++;
    }
    return { inserted };
  },
});

// ─── Bridge 6: inventoryValuation across reports → stockMovements ─

export const bridgeInventoryDeltasToMovementsInternal = internalMutation({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }): Promise<any> => {
    // Cross-report: take ALL valuations for branch ordered by valuationDate,
    // group by itemName, compute delta between consecutive snapshots.
    const valuations = await ctx.db
      .query("inventoryValuation")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .collect();

    // group by item
    const byItem = new Map<string, any[]>();
    for (const v of valuations) {
      const arr = byItem.get(v.itemName) ?? [];
      arr.push(v);
      byItem.set(v.itemName, arr);
    }

    // Wipe ETL-tagged movements (note: prefix in notes field)
    const tag = "etl:delta";
    const existing = await ctx.db
      .query("stockMovements")
      .filter((q: any) => q.eq(q.field("branchId"), branchId))
      .collect();
    for (const e of existing) {
      if (e.notes.startsWith(tag)) await ctx.db.delete(e._id);
    }

    let inserted = 0;
    for (const [itemName, arr] of byItem) {
      arr.sort((a, b) => a.valuationDate.localeCompare(b.valuationDate));
      // Look up stockItems id for the FK
      const stockItem = await ctx.db
        .query("stockItems")
        .withIndex("by_branch", (q) => q.eq("branchId", branchId))
        .filter((q: any) => q.eq(q.field("name"), itemName))
        .first();
      if (!stockItem) continue;

      for (let i = 1; i < arr.length; i++) {
        const prev = arr[i - 1];
        const cur = arr[i];
        const delta = cur.qty - prev.qty;
        if (Math.abs(delta) < 0.01) continue;
        // Heuristic: + = stock_in (could be purchase OR adjustment), - = usage
        const type = delta > 0 ? "stock_in" as const : "usage" as const;
        await ctx.db.insert("stockMovements", {
          itemId: stockItem._id,
          itemName,
          type,
          qty: Math.abs(delta),
          unit: cur.unit,
          date: cur.valuationDate,
          notes: `${tag}: dari ${prev.valuationDate} (${prev.qty} ${prev.unit}) → ${cur.valuationDate} (${cur.qty} ${cur.unit})`,
          branchId,
        });
        inserted++;
      }
    }
    return { movementsInserted: inserted };
  },
});

// ─── Bridge 7: dailyCashFlow.otherInflow/otherOutflow → ownerTransfers ─

export const bridgeCashFlowToOwnerTransfersInternal = internalMutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }): Promise<any> => {
    const report: any = await ctx.db.get(reportId);
    if (!report) return { inserted: 0 };

    const flows = await ctx.db
      .query("dailyCashFlow")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();

    // Idempotent: clear ETL-tagged owner transfers for this report
    const existing = await ctx.db
      .query("ownerTransfers")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
    for (const e of existing) await ctx.db.delete(e._id);

    let inserted = 0;
    let rowIdx = 0;
    for (const f of flows) {
      // Penerimaan lain-lain (otherInflow) → owner_to_branch
      if (f.otherInflow > 0) {
        await ctx.db.insert("ownerTransfers", {
          transferDate: f.businessDate,
          direction: "owner_to_branch" as const,
          purpose: "adjustment" as const,
          amount: f.otherInflow,
          referenceNo: `etl:${reportId}:in:${f.businessDate}`,
          status: "completed" as const,
          branchId: report.branchId,
          reportId,
          description: `Penerimaan lain-lain ${f.businessDate} dari LAP. CF`,
        });
        inserted++;
        rowIdx++;
      }
      // Pengeluaran lain-lain (selain expenseOutflow) — only if material
      // expenseOutflow already covered by bridgeCashFlowToExpenses. Skip duplication.
    }
    return { inserted };
  },
});

// ─── Bridge 8: employeeIncentives → expenses (salary_support) ────

export const bridgeIncentivesToExpensesInternal = internalMutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }): Promise<any> => {
    const report: any = await ctx.db.get(reportId);
    if (!report) return { inserted: 0 };
    const categories = await ctx.db.query("expenseCategories").collect();
    const cat = categories.find((c) => c.type === "salary_support") ?? categories.find((c) => c.name === "Insentif / Gaji");
    if (!cat) return { inserted: 0, reason: "no salary_support category" };

    const incentives = await ctx.db
      .query("employeeIncentives")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
    if (incentives.length === 0) return { inserted: 0 };

    const tag = `etl:${reportId}:incentive`;

    // Idempotent: clear ETL-tagged incentive expenses
    const existing = await ctx.db
      .query("expenses")
      .withIndex("by_branch_date", (q) => q.eq("branchId", report.branchId).eq("expenseDate", report.periodStart))
      .collect();
    for (const e of existing) {
      if (e.description.startsWith(tag)) await ctx.db.delete(e._id);
    }

    // Aggregate ALL incentives for this report into one expense per period
    const total = incentives.reduce((sum, i) => sum + i.amount, 0);
    if (total <= 0) return { inserted: 0 };

    await ctx.db.insert("expenses", {
      expenseDate: report.periodStart,
      categoryId: cat._id,
      categoryName: cat.name,
      amount: total,
      description: `${tag}: Insentif/Gaji ${incentives.length} karyawan periode ${report.periodStart} → ${report.periodEnd}`,
      paymentSource: "owner_direct" as const,
      status: "approved" as const,
      hasAttachment: false,
      branchId: report.branchId,
      etlSource: {
        reportId, stagingTable: "employeeIncentives", tabLabel: "Insentif",
        rowIndex: 0, sheetName: "INSENTIF",
        fileName: report.fileName, periodStart: report.periodStart, periodEnd: report.periodEnd,
      },
    });
    return { inserted: 1, employees: incentives.length, total };
  },
});

// ─── Per-report bridge orchestrator (internal helper) ──────────

export const bridgeOneReportInternal = internalMutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }): Promise<any> => {
    // No-op — orchestration done by backfillAllReports action.
    return { reportId };
  },
});

// ─── One-time migration: fix parseWeeklyFC bug retroactively ───
//
// Pre-fix, parseWeeklyFC stored itemName = row number (col 0) when col 0
// was a numeric "NO" column. The real item name leaked into the `unit`
// field instead. This migration:
//   1. Scans inventoryValuation rows where itemName matches /^\d+$/.
//   2. If `unit` carries a non-numeric, non-trivial string → that's the
//      real item name. Swap: itemName ← unit, unit ← "unit".
//   3. Patches the row in place.
//
// After running, re-run backfillAllReports so stockItems + stockMovements
// rebuild with correct names. Idempotent (already-clean rows skipped).

export const migrateInventoryNamesInternal = internalMutation({
  args: {},
  handler: async (ctx): Promise<any> => {
    const rows = await ctx.db.query("inventoryValuation").take(8000);
    let fixed = 0;
    let skipped = 0;
    for (const r of rows) {
      if (!/^\d+(\.\d+)?$/.test(r.itemName)) { skipped++; continue; }
      const u = (r.unit ?? "").trim();
      // Only swap if unit has a real-looking name
      if (!u || /^\d+(\.\d+)?$/.test(u) || u.toLowerCase() === "unit") { skipped++; continue; }
      await ctx.db.patch(r._id, {
        itemName: u,
        unit: "unit",
      });
      fixed++;
    }
    return { fixed, skipped, total: rows.length };
  },
});

export const migrateInventoryNames = mutation({
  args: {},
  handler: async (ctx): Promise<any> => {
    await requireAuth(ctx);
    const rows = await ctx.db.query("inventoryValuation").take(8000);
    let fixed = 0;
    let skipped = 0;
    for (const r of rows) {
      if (!/^\d+(\.\d+)?$/.test(r.itemName)) { skipped++; continue; }
      const u = (r.unit ?? "").trim();
      if (!u || /^\d+(\.\d+)?$/.test(u) || u.toLowerCase() === "unit") { skipped++; continue; }
      await ctx.db.patch(r._id, { itemName: u, unit: "unit" });
      fixed++;
    }
    return { fixed, skipped, total: rows.length };
  },
});

// Internal wipe (no auth) — for action invocation.
export const wipeStockTablesInternal = internalMutation({
  args: {},
  handler: async (ctx): Promise<any> => {
    const items = await ctx.db.query("stockItems").collect();
    let itemsDeleted = 0;
    for (const it of items) {
      if (it.etlSource || /^\d+$/.test(it.name)) {
        await ctx.db.delete(it._id);
        itemsDeleted++;
      }
    }
    const moves = await ctx.db.query("stockMovements").collect();
    let movesDeleted = 0;
    for (const m of moves) {
      if (m.notes.startsWith("etl:")) {
        await ctx.db.delete(m._id);
        movesDeleted++;
      }
    }
    return { itemsDeleted, movementsDeleted: movesDeleted };
  },
});

// One-call action: migrate → wipe → re-run backfill. CLI-friendly.
export const runFullRebuild = action({
  args: {},
  handler: async (ctx): Promise<any> => {
    const migration = await ctx.runMutation(internal.features.reports.bridges.migrateInventoryNamesInternal);
    const wipe = await ctx.runMutation(internal.features.reports.bridges.wipeStockTablesInternal);

    // Inline backfill body so we don't double-call action-from-action.
    await ctx.runMutation(internal.features.reports.bridges.seedMasterDataInternal);
    await ctx.runMutation(internal.features.reports.bridges.deriveVendorsInternal);
    const reports: any[] = await ctx.runQuery(internal.features.reports.bridges.listAllReportsInternal);
    const branchesTouched = new Set<string>();
    for (const r of reports) {
      branchesTouched.add(r.branchId);
      await ctx.runMutation(internal.features.reports.bridges.bridgeProductSalesToDailySalesInternal, { reportId: r._id });
      await ctx.runMutation(internal.features.reports.bridges.bridgeDailyCashFlowToClosingsInternal, { reportId: r._id });
      await ctx.runMutation(internal.features.reports.bridges.bridgeCreditPurchasesToPayablesInternal, { reportId: r._id });
      await ctx.runMutation(internal.features.reports.bridges.bridgeInventoryToStockInternal, { reportId: r._id });
      await ctx.runMutation(internal.features.reports.bridges.bridgeCashFlowToExpensesInternal, { reportId: r._id });
      await ctx.runMutation(internal.features.reports.bridges.bridgeCashFlowToOwnerTransfersInternal, { reportId: r._id });
      await ctx.runMutation(internal.features.reports.bridges.bridgeIncentivesToExpensesInternal, { reportId: r._id });
    }
    const movementsByBranch: any[] = [];
    for (const branchId of branchesTouched) {
      const m = await ctx.runMutation(internal.features.reports.bridges.bridgeInventoryDeltasToMovementsInternal, { branchId: branchId as any });
      movementsByBranch.push({ branchId, ...m });
    }

    return { migration, wipe, reports: reports.length, movementsByBranch };
  },
});

// Wipe stockItems + stockMovements before rebuild (avoid stale "1".."55" entries).
// Run BETWEEN migrateInventoryNames and backfillAllReports for clean rebuild.
export const wipeStockTables = mutation({
  args: {},
  handler: async (ctx): Promise<any> => {
    await requireAuth(ctx);
    const items = await ctx.db.query("stockItems").collect();
    let itemsDeleted = 0;
    for (const it of items) {
      if (it.etlSource || /^\d+$/.test(it.name)) {
        await ctx.db.delete(it._id);
        itemsDeleted++;
      }
    }
    const moves = await ctx.db.query("stockMovements").collect();
    let movesDeleted = 0;
    for (const m of moves) {
      if (m.notes.startsWith("etl:")) {
        await ctx.db.delete(m._id);
        movesDeleted++;
      }
    }
    return { itemsDeleted, movementsDeleted: movesDeleted };
  },
});
