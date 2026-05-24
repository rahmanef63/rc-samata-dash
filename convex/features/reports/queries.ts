import { query, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import type { Doc } from "../../_generated/dataModel";
import { LIMITS } from "../../shared/limits";

export const getReportFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await requireAuth(ctx);
    return await ctx.storage.getUrl(storageId);
  },
});

/**
 * Bundle setiap row yang ter-link ke 1 laporan untuk client-side xlsx export.
 * Owner pakai hasil ini buat compare side-by-side dengan xlsx asli — cari
 * baris yang gagal masuk database.
 *
 * Expenses TIDAK punya reportId field, jadi diquery by_date pakai
 * periodStart..periodEnd. Bisa overlap dengan input non-laporan (manual
 * petty cash dll) — caveat ditulis di nama sheet.
 */
export const getReportExport = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    const report = await ctx.db.get(reportId);
    if (!report) return null;

    const fromReports = [
      "productSales", "vendorPurchases", "inventoryValuation",
      "leftoverItems", "dailyCashSummary", "salesControl", "creditPurchases",
      "foodCostSummary", "transferItems", "productHPP",
      "costAnalysis", "dailyCashFlow", "employeeIncentives",
    ] as const;

    const result: Record<string, unknown[]> = {};
    for (const t of fromReports) {
      const rows = await ctx.db.query(t)
        .withIndex("by_report", (q) => q.eq("reportId", reportId))
        .take(LIMITS.EXPENSES_PAGE);
      result[t] = rows;
    }

    // ownerTransfers di closing schema — by_report index ada
    result["ownerTransfers"] = await ctx.db.query("ownerTransfers")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .take(2000);

    // expenses by date range (no reportId link — caveat)
    if (report.periodStart && report.periodEnd) {
      result["expenses_byPeriod"] = await ctx.db.query("expenses")
        .withIndex("by_date", (q) =>
          q.gte("expenseDate", report.periodStart)
            .lte("expenseDate", report.periodEnd))
        .take(5000);
    }

    return { report, tables: result };
  },
});

function isIsoDateString(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeReportPeriod(periodStart: string, periodEnd: string) {
  const safeStart = isIsoDateString(periodStart) ? periodStart : undefined;
  const safeEnd = isIsoDateString(periodEnd) ? periodEnd : undefined;

  const normalizedStart = safeStart ?? safeEnd ?? "";
  const normalizedEnd = safeEnd ?? safeStart ?? "";

  if (normalizedStart && normalizedEnd && normalizedStart > normalizedEnd) {
    return {
      periodStart: normalizedEnd,
      periodEnd: normalizedStart,
    };
  }

  return {
    periodStart: normalizedStart,
    periodEnd: normalizedEnd,
  };
}

/** Internal: get report by ID (for actions, no auth required) */
export const getReportById = internalQuery({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    return await ctx.db.get(reportId);
  },
});

export const listWeeklyReports = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_uploadedAt")
      .order("desc")
      .collect();
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_date")
      .collect();

    return reports.map((report) => {
      const normalizedPeriod = normalizeReportPeriod(report.periodStart, report.periodEnd);
      const storedExpenseCount = report.expenseCount ?? 0;
      const fallbackExpenseCount =
        normalizedPeriod.periodStart && normalizedPeriod.periodEnd
          ? expenses.filter(
              (expense) =>
                expense.expenseDate >= normalizedPeriod.periodStart &&
                expense.expenseDate <= normalizedPeriod.periodEnd,
            ).length
          : storedExpenseCount;

      return {
        ...report,
        periodStart: normalizedPeriod.periodStart,
        periodEnd: normalizedPeriod.periodEnd,
        expenseCount: storedExpenseCount > 0 ? storedExpenseCount : fallbackExpenseCount,
      };
    });
  },
});

export const getWeeklyReport = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db.get(reportId);
  },
});

/**
 * Cek apakah sudah ada report dengan periode yang sama (untuk validasi duplikat).
 * Dua periode dianggap duplikat jika periodStart sama.
 */
export const checkDuplicatePeriod = query({
  args: {
    periodStart: v.string(),
  },
  handler: async (ctx, { periodStart }) => {
    await requireAuth(ctx);
    const existing = await ctx.db
      .query("weeklyReports")
      .withIndex("by_period", (q) => q.eq("periodStart", periodStart))
      .first();
    return existing ?? null;
  },
});

export const getProductSales = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("productSales")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const getVendorPurchases = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("vendorPurchases")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const getInventoryValuation = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("inventoryValuation")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const getFoodCostSummary = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("foodCostSummary")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const getTransferItems = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("transferItems")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const getProductHPP = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("productHPP")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

/** Per-report audit: compare claimed counts (stored saat import) vs actual
 *  count di staging tables. Owner pakai ini buat verify "data ter-record semua".
 *
 *  Output per kategori:
 *    parsed = report.{x}Count (Excel-side count saat upload)
 *    actual = live count dari staging table (cek apakah masih utuh)
 *    diff   = parsed - actual (0 = OK, >0 = ada yang hilang, <0 = ada duplikat)
 */
export const getReportAuditCounts = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    const report = await ctx.db.get(reportId);
    if (!report) return null;

    type Row = { key: string; label: string; parsed: number; actual: number; diff: number };

    const countByReport = async (
      table:
        | "productSales" | "vendorPurchases" | "inventoryValuation" | "leftoverItems"
        | "dailyCashSummary" | "salesControl" | "creditPurchases" | "foodCostSummary"
        | "transferItems" | "productHPP" | "costAnalysis" | "dailyCashFlow"
        | "employeeIncentives",
    ) => {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_report", (q) => q.eq("reportId", reportId))
        .collect();
      return rows.length;
    };
    const countExpenses = async () => {
      const rows = await ctx.db
        .query("expenses")
        .withIndex("by_source_report", (q) => q.eq("sourceReportId", reportId))
        .collect();
      return rows.length;
    };

    const out: Row[] = [
      { key: "sales",         label: "Penjualan",            parsed: Number(report.salesCount ?? 0),          actual: await countByReport("productSales"),       diff: 0 },
      { key: "expense",       label: "Kas Kecil (LPKK)",     parsed: Number(report.expenseCount ?? 0),        actual: await countExpenses(),                     diff: 0 },
      { key: "vendor",        label: "Vendor Purchases",     parsed: Number(report.vendorCount ?? 0),         actual: await countByReport("vendorPurchases"),    diff: 0 },
      { key: "inventory",     label: "Weekly FC",            parsed: Number(report.inventoryCount ?? 0),      actual: await countByReport("inventoryValuation"), diff: 0 },
      { key: "leftover",      label: "Left Over",            parsed: Number(report.leftoverCount ?? 0),       actual: await countByReport("leftoverItems"),      diff: 0 },
      { key: "kasPeriode",    label: "Kas Periode (daily)",  parsed: Number(report.kasPeriodeCount ?? 0),     actual: await countByReport("dailyCashSummary"),   diff: 0 },
      { key: "salesControl",  label: "Sales Control",        parsed: Number(report.salesControlCount ?? 0),   actual: await countByReport("salesControl"),       diff: 0 },
      { key: "creditPurchase",label: "Pembelian Kredit",     parsed: Number(report.creditPurchaseCount ?? 0), actual: await countByReport("creditPurchases"),    diff: 0 },
      { key: "fcSummary",     label: "Food Cost Summary",    parsed: Number(report.foodCostSummaryCount ?? 0),actual: await countByReport("foodCostSummary"),    diff: 0 },
      { key: "transfer",      label: "TO-TI Transfer",       parsed: Number(report.transferCount ?? 0),       actual: await countByReport("transferItems"),      diff: 0 },
      { key: "hpp",           label: "HPP Produk",           parsed: Number(report.hppCount ?? 0),            actual: await countByReport("productHPP"),         diff: 0 },
      { key: "costAnalysis",  label: "Cost Analysis",        parsed: Number(report.costAnalysisCount ?? 0),   actual: await countByReport("costAnalysis"),       diff: 0 },
      { key: "cashFlow",      label: "Daily Cash Flow",      parsed: Number(report.cashFlowCount ?? 0),       actual: await countByReport("dailyCashFlow"),      diff: 0 },
      { key: "incentive",     label: "Insentif Karyawan",    parsed: Number(report.incentiveCount ?? 0),      actual: await countByReport("employeeIncentives"), diff: 0 },
    ];
    let allClean = true;
    for (const r of out) {
      r.diff = r.parsed - r.actual;
      if (r.diff !== 0) allClean = false;
    }

    const totalParsed = out.reduce((s, r) => s + r.parsed, 0);
    const totalActual = out.reduce((s, r) => s + r.actual, 0);

    return {
      reportId,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      fileName: report.fileName,
      totalParsed,
      totalActual,
      totalDiff: totalParsed - totalActual,
      allClean,
      rows: out,
    };
  },
});

/** Unique product names across ALL reports' productHPP — used by upload
 *  validator so a product yang sudah punya HPP di file lama gak di-warn
 *  saat upload file baru tanpa HPP. */
export const listAllHppProductNames = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const rows = await ctx.db.query("productHPP").take(5000);
    return [...new Set(rows.map((r) => r.productName))];
  },
});

/** Unique cost analysis item names across ALL reports — same cross-file
 *  enrichment as listAllHppProductNames but for vendor cost analysis. */
export const listAllCostAnalysisItemNames = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const rows = await ctx.db.query("costAnalysis").take(5000);
    return [...new Set(rows.map((r) => r.itemName))];
  },
});

export const getCostAnalysis = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("costAnalysis")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const getDailyCashFlow = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("dailyCashFlow")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const getEmployeeIncentives = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("employeeIncentives")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

// ─── Standalone document queries ────────────────────────────

export const listProductChanges = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("productChanges")
      .order("desc")
      .collect();
  },
});

export const listEmployeeAllowances = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("employeeAllowances")
      .order("desc")
      .collect();
  },
});

// ─── Finance Bridge Queries (aggregate report data by branch) ──

export const getSalesByBranch = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    // Convex returns max 8192 rows per query. Cap raw rows here so the
    // dashboard / sales drill don't crash for many weeks of uploaded
    // productSales. Newest reports first; stop early once we've
    // collected ROW_CAP entries.
    const ROW_CAP = 5000;
    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_uploadedAt")
      .order("desc")
      .take(LIMITS.REPORTS_PAGE);
    const all = [];
    for (const r of reports) {
      const items = await ctx.db
        .query("productSales")
        .withIndex("by_report", (q) => q.eq("reportId", r._id))
        .collect();
      all.push(...items);
      if (all.length >= ROW_CAP) break;
    }
    return all.slice(0, ROW_CAP);
  },
});

export const getExpensesByBranch = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    // LPKK data is imported into the expenses table (not a report-linked table).
    // Cap at 5000 newest rows so Convex 8192-row return cap doesn't trip.
    const items = await ctx.db
      .query("expenses")
      .withIndex("by_date")
      .order("desc")
      .take(LIMITS.SALES_PAGE);
    return items.map((e) => ({
      _id: e._id,
      _creationTime: e._creationTime,
      expenseDate: e.expenseDate,
      categoryLabel: e.categoryName,
      categoryType: e.paymentSource === "petty_cash" ? "cogs" : "other",
      amount: e.amount,
      description: e.description,
    }));
  },
});

export const getPayablesByBranch = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const ROW_CAP = 5000;
    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_uploadedAt")
      .order("desc")
      .take(LIMITS.REPORTS_PAGE);
    const all: Array<
      Doc<"creditPurchases"> & {
        sourceFile?: string;
        reportPeriod?: string;
      }
    > = [];
    for (const r of reports) {
      const items = await ctx.db
        .query("creditPurchases")
        .withIndex("by_report", (q) => q.eq("reportId", r._id))
        .collect();
      for (const item of items) {
        all.push({
          ...item,
          sourceFile: r.fileName,
          reportPeriod: `${r.periodStart} — ${r.periodEnd}`,
        });
        if (all.length >= ROW_CAP) break;
      }
      if (all.length >= ROW_CAP) break;
    }
    return all.slice(0, ROW_CAP);
  },
});

export const getCashFlowByBranch = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const ROW_CAP = 5000;
    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_uploadedAt")
      .order("desc")
      .take(LIMITS.STAGING_PAGE);
    const all = [];
    for (const r of reports) {
      const items = await ctx.db
        .query("dailyCashFlow")
        .withIndex("by_report", (q) => q.eq("reportId", r._id))
        .collect();
      all.push(...items);
      if (all.length >= ROW_CAP) break;
    }
    return all
      .slice(0, ROW_CAP)
      .sort((a, b) => b.businessDate.localeCompare(a.businessDate));
  },
});

// ─── Per-report list queries (added 2026-05-17 for /laporan/[reportId] drill) ──

export const listLeftoverItems = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("leftoverItems")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const listDailyCashSummary = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("dailyCashSummary")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const listCreditPurchases = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("creditPurchases")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});

export const listSalesControl = query({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("salesControl")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
  },
});
