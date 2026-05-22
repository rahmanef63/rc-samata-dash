import { mutation } from "../../_generated/server";
import type { MutationCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { inferFromRules, isUncategorized } from "../../shared/categoryInference";

/**
 * Build a {name-lower → categoryId} Map from expenseCategories master.
 * Pakai sekali per mutation call — load 1x, lookup O(1) per row.
 * Staging tables (inventoryValuation/foodCostSummary/transferItems)
 * pakai ini supaya SSOT: FK ke master, bukan free-text.
 */
async function buildCategoryLookup(
  ctx: MutationCtx,
): Promise<Map<string, Id<"expenseCategories">>> {
  const cats = await ctx.db.query("expenseCategories").collect();
  const m = new Map<string, Id<"expenseCategories">>();
  for (const c of cats) {
    m.set(c.name.toLowerCase().trim(), c._id);
  }
  return m;
}

function resolveCategoryId(
  m: Map<string, Id<"expenseCategories">>,
  name: string,
): Id<"expenseCategories"> | undefined {
  return m.get(name.toLowerCase().trim());
}

// ─── Validators ──────────────────────────────────────────────

const lpkkItemValidator = v.object({
  expenseDate: v.string(),
  categoryType: v.union(v.literal("cogs"), v.literal("utility"), v.literal("other")),
  categoryLabel: v.string(),
  description: v.string(),
  amount: v.number(),
  referenceNo: v.optional(v.string()),
});

const productSaleItemValidator = v.object({
  businessDate: v.string(),
  productName: v.string(),
  qty: v.number(),
  amount: v.number(),
  unitPrice: v.number(),
  foodCostItem: v.optional(v.number()),
  channel: v.optional(v.string()),
});

const vendorPurchaseItemValidator = v.object({
  commodityName: v.string(),
  section: v.optional(v.string()),
  openingQty: v.number(),
  openingValue: v.number(),
  purchaseQty: v.number(),
  purchaseValue: v.number(),
  usageQty: v.number(),
  usageValue: v.optional(v.number()),
  closingQty: v.number(),
  closingValue: v.number(),
  prevWeekValue: v.optional(v.number()),
});

const inventoryValuationItemValidator = v.object({
  category: v.string(),
  itemName: v.string(),
  qty: v.number(),
  unit: v.string(),
  unitPrice: v.number(),
  totalValue: v.number(),
});

const leftoverItemValidator = v.object({
  businessDate: v.string(),
  itemName: v.string(),
  qty: v.number(),
});

const dailyCashSummaryItemValidator = v.object({
  businessDate: v.string(),
  grossSales: v.number(),
  komisiGofood: v.number(),
  komisiGrabfood: v.number(),
  komisiShopeefood: v.number(),
  koreksi: v.number(),
  discount: v.number(),
  netSales: v.number(),
});

const salesControlItemValidator = v.object({
  businessDate: v.string(),
  netSales: v.number(),
  customerCount: v.number(),
  spendingPower: v.number(),
  targetSales: v.number(),
  achievementPct: v.number(),
});

const creditPurchaseItemValidator = v.object({
  purchaseDate: v.string(),
  supplierName: v.string(),
  itemName: v.string(),
  invoiceNo: v.optional(v.string()),
  qty: v.number(),
  unitPrice: v.number(),
  totalAmount: v.number(),
  dueDate: v.optional(v.string()),
  creditDays: v.optional(v.number()),
  paidDate: v.optional(v.string()),
});

// ─── 1. Buat header report ───────────────────────────────────

export const generateReportUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createWeeklyReport = mutation({
  args: {
    branchId: v.id("branches"),
    fileName: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
    periodStart: v.string(),
    periodEnd: v.string(),
    unknownSheets: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return await ctx.db.insert("weeklyReports", {
      ...args,
      uploadedBy: userId,
      uploadedAt: Date.now(),
      status: "pending",
    });
  },
});

// ─── 2. Import LPKK → expenses ──────────────────────────────

export const importLPKKBatch = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    items: v.array(lpkkItemValidator),
  },
  handler: async (ctx, { reportId, branchId, items }) => {
    await requireAuth(ctx);
    const categories = await ctx.db.query("expenseCategories").take(500);
    const byLabel = new Map(categories.map((c) => [c.name.toLowerCase().trim(), c]));
    const findCategory = (label: string, type: "cogs" | "utility" | "other") =>
      byLabel.get(label.toLowerCase().trim()) ??
      categories.find((c) => c.type === type) ??
      categories.find((c) => c.type === "other") ??
      categories[0];

    // Server-side fallback: kalau parser klien gagal infer (rules belum loaded
    // saat parse) atau xlsx col "Lain-lain" punya amount, kita coba sekali
    // lagi di sini berdasarkan description via categoryRules DB. Pakai shared
    // inferFromRules() supaya match logic identik dengan client (termasuk
    // whitespace-norm fallback: TFOWNER ↔ TF OWNER, KIRIMLAPORAN ↔ KIRIM LAPORAN).
    const activeRules = await ctx.db.query("categoryRules").withIndex("by_priority").take(2000);
    const upgradeLabel = (label: string, desc: string): { label: string; type: "cogs" | "utility" | "other" } => {
      if (!isUncategorized(label)) return { label, type: "other" };
      const inferred = inferFromRules(desc, activeRules);
      if (!inferred || isUncategorized(inferred.label)) return { label, type: "other" };
      const newType = inferred.type === "cogs" || inferred.type === "utility" ? inferred.type : "other";
      return { label: inferred.label, type: newType };
    };

    let count = 0;
    let rowIdx = 0;
    const report: any = await ctx.db.get(reportId);
    for (const item of items) {
      if (item.amount <= 0) { rowIdx++; continue; }
      const upgraded = upgradeLabel(item.categoryLabel, item.description);
      const useLabel = upgraded.label;
      const useType = isUncategorized(item.categoryLabel) ? upgraded.type : item.categoryType;
      const cat = findCategory(useLabel, useType);
      if (!cat) { rowIdx++; continue; }
      await ctx.db.insert("expenses", {
        expenseDate: item.expenseDate,
        categoryId: cat._id,
        categoryName: cat.name,
        amount: item.amount,
        description: item.description,
        paymentSource: "petty_cash",
        status: "draft",
        hasAttachment: false,
        branchId,
        sourceReportId: reportId,
        etlSource: {
          reportId, stagingTable: "lpkk", tabLabel: "Kas Kecil",
          rowIndex: rowIdx, sheetName: "LPKK",
          fileName: report?.fileName, periodStart: report?.periodStart, periodEnd: report?.periodEnd,
        },
      });
      count++;
      rowIdx++;
    }
    return count;
  },
});

// ─── 3. Import LAP. PENJUALAN (semua channel) → productSales ─

export const importProductSalesBatch = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    items: v.array(productSaleItemValidator),
  },
  handler: async (ctx, { reportId, branchId, items }) => {
    await requireAuth(ctx);
    let count = 0;
    for (const item of items) {
      if (item.qty <= 0) continue;
      await ctx.db.insert("productSales", { ...item, reportId, branchId });
      count++;
    }
    return count;
  },
});

// ─── 4. Import VENDOR → vendorPurchases ─────────────────────

export const importVendorPurchasesBatch = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    weekStart: v.string(),
    items: v.array(vendorPurchaseItemValidator),
  },
  handler: async (ctx, { reportId, branchId, weekStart, items }) => {
    await requireAuth(ctx);
    let count = 0;
    for (const item of items) {
      await ctx.db.insert("vendorPurchases", { ...item, weekStart, reportId, branchId });
      count++;
    }
    return count;
  },
});

// ─── 5. Import WEEKLY FC → inventoryValuation ───────────────

export const importInventoryValuationBatch = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    valuationDate: v.string(),
    items: v.array(inventoryValuationItemValidator),
  },
  handler: async (ctx, { reportId, branchId, valuationDate, items }) => {
    await requireAuth(ctx);
    const catLookup = await buildCategoryLookup(ctx);
    let count = 0;
    for (const item of items) {
      if (item.totalValue <= 0) continue;
      const categoryId = resolveCategoryId(catLookup, item.category);
      await ctx.db.insert("inventoryValuation", {
        ...item,
        categoryId,
        valuationDate,
        reportId,
        branchId,
      });
      count++;
    }
    return count;
  },
});

// ─── 6. Import LEFT OVER → leftoverItems ────────────────────

export const importLeftOverBatch = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    items: v.array(leftoverItemValidator),
  },
  handler: async (ctx, { reportId, branchId, items }) => {
    await requireAuth(ctx);
    let count = 0;
    for (const item of items) {
      if (item.qty <= 0) continue;
      await ctx.db.insert("leftoverItems", { ...item, reportId, branchId });
      count++;
    }
    return count;
  },
});

// ─── 7. Import LAPORAN KAS PERIODE → dailyCashSummary ───────

export const importDailyCashSummaryBatch = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    items: v.array(dailyCashSummaryItemValidator),
  },
  handler: async (ctx, { reportId, branchId, items }) => {
    await requireAuth(ctx);
    let count = 0;
    for (const item of items) {
      if (item.grossSales <= 0) continue;
      await ctx.db.insert("dailyCashSummary", { ...item, reportId, branchId });
      count++;
    }
    return count;
  },
});

// ─── 8. Import SALES CONTROL → salesControl ─────────────────

export const importSalesControlBatch = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    items: v.array(salesControlItemValidator),
  },
  handler: async (ctx, { reportId, branchId, items }) => {
    await requireAuth(ctx);
    let count = 0;
    for (const item of items) {
      if (item.netSales <= 0) continue;
      await ctx.db.insert("salesControl", { ...item, reportId, branchId });
      count++;
    }
    return count;
  },
});

// ─── 9. Import PEMBELIAN KREDIT → creditPurchases ───────────

export const importCreditPurchasesBatch = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    items: v.array(creditPurchaseItemValidator),
  },
  handler: async (ctx, { reportId, branchId, items }) => {
    await requireAuth(ctx);
    let count = 0;
    for (const item of items) {
      if (item.totalAmount <= 0) continue;
      await ctx.db.insert("creditPurchases", { ...item, reportId, branchId });
      count++;
    }
    return count;
  },
});

// ─── 9b. Import LAP. CF other-income/expense → ownerTransfers ─

const ownerTransferItemValidator = v.object({
  transferDate: v.string(),
  direction: v.union(
    v.literal("branch_to_owner"),
    v.literal("owner_to_branch"),
  ),
  purpose: v.union(
    v.literal("night_transfer"),
    v.literal("petty_cash_topup"),
    v.literal("payable_payment_fund"),
    v.literal("adjustment"),
  ),
  amount: v.number(),
  referenceNo: v.string(),
  description: v.string(),
});

export const importOwnerTransfersBatch = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    items: v.array(ownerTransferItemValidator),
  },
  handler: async (ctx, { reportId, branchId, items }) => {
    await requireAuth(ctx);
    // Idempotent re-import: wipe any prior owner transfers tied to this report.
    const existing = await ctx.db
      .query("ownerTransfers")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
    for (const row of existing) await ctx.db.delete(row._id);

    let count = 0;
    for (const item of items) {
      if (item.amount <= 0) continue;
      await ctx.db.insert("ownerTransfers", {
        ...item,
        reportId,
        branchId,
        status: "completed",
      });
      count++;
    }
    return count;
  },
});

// ─── 10. Import IKHTISAR FOOD COST → foodCostSummary ─────────

const foodCostSummaryItemValidator = v.object({
  category: v.string(),
  openingValue: v.number(),
  purchaseValue: v.number(),
  transferOutValue: v.number(),
  transferInValue: v.number(),
  closingValue: v.number(),
  usageValue: v.number(),
  salesRevenue: v.optional(v.number()),
  foodCostPct: v.optional(v.number()),
});

export const importFoodCostSummaryBatch = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    periodStart: v.string(),
    items: v.array(foodCostSummaryItemValidator),
  },
  handler: async (ctx, { reportId, branchId, periodStart, items }) => {
    await requireAuth(ctx);
    const catLookup = await buildCategoryLookup(ctx);
    let count = 0;
    for (const item of items) {
      const categoryId = resolveCategoryId(catLookup, item.category);
      await ctx.db.insert("foodCostSummary", {
        ...item,
        categoryId,
        periodStart,
        reportId,
        branchId,
      });
      count++;
    }
    return count;
  },
});

// ─── 11. Import TO - TI → transferItems ──────────────────────

const transferItemValidator = v.object({
  direction: v.union(v.literal("out"), v.literal("in")),
  category: v.string(),
  itemName: v.string(),
  qty: v.number(),
  unit: v.optional(v.string()),
  totalValue: v.number(),
});

export const importTransferItemsBatch = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    periodStart: v.string(),
    items: v.array(transferItemValidator),
  },
  handler: async (ctx, { reportId, branchId, periodStart, items }) => {
    await requireAuth(ctx);
    const catLookup = await buildCategoryLookup(ctx);
    let count = 0;
    for (const item of items) {
      if (item.qty <= 0 && item.totalValue <= 0) continue;
      const categoryId = resolveCategoryId(catLookup, item.category);
      await ctx.db.insert("transferItems", {
        ...item,
        categoryId,
        periodStart,
        reportId,
        branchId,
      });
      count++;
    }
    return count;
  },
});

// ─── 12. Import HPP PRODUK → productHPP ─────────────────────

const hppIngredientValidator = v.object({
  name: v.string(),
  qty: v.number(),
  unit: v.string(),
  unitCost: v.number(),
  subtotal: v.number(),
});

const productHPPItemValidator = v.object({
  productName: v.string(),
  pricingClass: v.union(
    v.literal("standard"),
    v.literal("kelas2"),
    v.literal("kelas3a"),
    v.literal("kelas3b"),
    v.literal("kelas4"),
  ),
  totalHPP: v.number(),
  sellingPrice: v.optional(v.number()),
  ingredients: v.optional(v.array(hppIngredientValidator)),
});

export const importProductHPPBatch = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    periodStart: v.string(),
    items: v.array(productHPPItemValidator),
  },
  handler: async (ctx, { reportId, branchId, periodStart, items }) => {
    await requireAuth(ctx);
    let count = 0;
    for (const item of items) {
      if (item.totalHPP <= 0) continue;
      await ctx.db.insert("productHPP", { ...item, periodStart, reportId, branchId });
      count++;
    }
    return count;
  },
});

// ─── 13. Import COST ANALYSIS → costAnalysis ─────────────────

const costAnalysisItemValidator = v.object({
  itemName: v.string(),
  unit: v.optional(v.string()),
  openingQty: v.number(),
  openingValue: v.number(),
  purchaseQty: v.number(),
  purchaseValue: v.number(),
  usageQty: v.number(),
  usageValue: v.number(),
  closingQty: v.number(),
  closingValue: v.number(),
  variance: v.number(),
});

export const importCostAnalysisBatch = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    periodStart: v.string(),
    items: v.array(costAnalysisItemValidator),
  },
  handler: async (ctx, { reportId, branchId, periodStart, items }) => {
    await requireAuth(ctx);
    let count = 0;
    for (const item of items) {
      await ctx.db.insert("costAnalysis", { ...item, periodStart, reportId, branchId });
      count++;
    }
    return count;
  },
});

// ─── 14. Import LAP. CF → dailyCashFlow ──────────────────────

const dailyCashFlowItemValidator = v.object({
  businessDate: v.string(),
  openingBalance: v.number(),
  salesInflow: v.number(),
  otherInflow: v.number(),
  expenseOutflow: v.number(),
  otherOutflow: v.number(),
  closingBalance: v.number(),
});

export const importDailyCashFlowBatch = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    items: v.array(dailyCashFlowItemValidator),
  },
  handler: async (ctx, { reportId, branchId, items }) => {
    await requireAuth(ctx);
    let count = 0;
    for (const item of items) {
      if (item.openingBalance === 0 && item.salesInflow === 0 && item.closingBalance === 0) continue;
      await ctx.db.insert("dailyCashFlow", { ...item, reportId, branchId });
      count++;
    }
    return count;
  },
});

// ─── 15. Import INSENTIF → employeeIncentives ────────────────

const incentiveItemValidator = v.object({
  employeeName: v.string(),
  incentiveType: v.string(),
  amount: v.number(),
  notes: v.optional(v.string()),
});

export const importEmployeeIncentivesBatch = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    periodStart: v.string(),
    items: v.array(incentiveItemValidator),
  },
  handler: async (ctx, { reportId, branchId, periodStart, items }) => {
    await requireAuth(ctx);
    let count = 0;
    for (const item of items) {
      if (item.amount <= 0) continue;
      await ctx.db.insert("employeeIncentives", { ...item, periodStart, reportId, branchId });
      count++;
    }
    return count;
  },
});

// ─── 16. Finalize report ─────────────────────────────────────

export const finalizeWeeklyReport = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    status: v.union(v.literal("processed"), v.literal("error")),
    expenseCount: v.optional(v.number()),
    salesCount: v.optional(v.number()),
    vendorCount: v.optional(v.number()),
    inventoryCount: v.optional(v.number()),
    leftoverCount: v.optional(v.number()),
    kasPeriodeCount: v.optional(v.number()),
    salesControlCount: v.optional(v.number()),
    creditPurchaseCount: v.optional(v.number()),
    foodCostSummaryCount: v.optional(v.number()),
    transferCount: v.optional(v.number()),
    hppCount: v.optional(v.number()),
    costAnalysisCount: v.optional(v.number()),
    cashFlowCount: v.optional(v.number()),
    incentiveCount: v.optional(v.number()),
    validationNotes: v.optional(v.array(v.object({
      severity: v.string(),
      category: v.string(),
      message: v.string(),
      tip: v.string(),
    }))),
  },
  handler: async (ctx, { reportId, validationNotes, ...data }) => {
    await requireAuth(ctx);
    const validationStatus = validationNotes && validationNotes.length > 0 ? "needs_review" as const : "clean" as const;
    await ctx.db.patch(reportId, { ...data, validationStatus, validationNotes });
    return reportId;
  },
});

/** Mark a report's validation as reviewed/validated by user */
export const updateValidationStatus = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    validationStatus: v.union(v.literal("clean"), v.literal("needs_review"), v.literal("validated")),
  },
  handler: async (ctx, { reportId, validationStatus }) => {
    await requireAuth(ctx);
    await ctx.db.patch(reportId, { validationStatus });
    return reportId;
  },
});

// ─── 17. Import PERGANTIAN PRODUK → productChanges ───────────

const productChangeItemValidator = v.object({
  itemName: v.string(),
  expiredDate: v.optional(v.string()),
  unit: v.optional(v.string()),
  unitPrice: v.number(),
  qty: v.number(),
  ppn: v.number(),
  totalPrice: v.number(),
});

export const importProductChangesBatch = mutation({
  args: {
    branchId: v.id("branches"),
    fileName: v.string(),
    periodLabel: v.string(),
    items: v.array(productChangeItemValidator),
  },
  handler: async (ctx, { branchId, fileName, periodLabel, items }) => {
    await requireAuth(ctx);
    let count = 0;
    const uploadedAt = Date.now();
    for (const item of items) {
      if (item.totalPrice <= 0) continue;
      await ctx.db.insert("productChanges", {
        ...item,
        branchId,
        fileName,
        periodLabel,
        uploadedAt,
      });
      count++;
    }
    return count;
  },
});

export const deleteProductChanges = mutation({
  args: { branchId: v.id("branches"), periodLabel: v.string() },
  handler: async (ctx, { branchId, periodLabel }) => {
    await requireAuth(ctx);
    const rows = await ctx.db
      .query("productChanges")
      .withIndex("by_branch_period", (q) =>
        q.eq("branchId", branchId).eq("periodLabel", periodLabel)
      )
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
    return rows.length;
  },
});

// ─── 18. Import TUNJANGAN KHUSUS → employeeAllowances ────────

const allowanceItemValidator = v.object({
  employeeName: v.string(),
  joinDate: v.optional(v.string()),
  position: v.optional(v.string()),
  storeOrigin: v.optional(v.string()),
  storePlacement: v.optional(v.string()),
  rotationType: v.optional(v.string()),
  distance: v.optional(v.string()),
  travelTime: v.optional(v.string()),
  luarKotaAmount: v.number(),
  subsidiTransportAmount: v.number(),
  budgetKosAmount: v.number(),
  reimburseNote: v.optional(v.string()),
  kosNote: v.optional(v.string()),
});

export const importAllowancesBatch = mutation({
  args: {
    branchId: v.id("branches"),
    fileName: v.string(),
    periodLabel: v.string(),
    items: v.array(allowanceItemValidator),
  },
  handler: async (ctx, { branchId, fileName, periodLabel, items }) => {
    await requireAuth(ctx);
    let count = 0;
    const uploadedAt = Date.now();
    for (const item of items) {
      await ctx.db.insert("employeeAllowances", {
        ...item,
        branchId,
        fileName,
        periodLabel,
        uploadedAt,
      });
      count++;
    }
    return count;
  },
});

export const deleteAllowances = mutation({
  args: { branchId: v.id("branches"), periodLabel: v.string() },
  handler: async (ctx, { branchId, periodLabel }) => {
    await requireAuth(ctx);
    const rows = await ctx.db
      .query("employeeAllowances")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .filter((q) => q.eq(q.field("periodLabel"), periodLabel))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
    return rows.length;
  },
});

// ─── 11. Hapus report + semua data terkait ───────────────────

/**
 * Cascade delete a weekly report. Hapus staging tables (by_report index),
 * lalu hapus semua CRUD/SSOT yang di-bridge dari report ini (by_source_report
 * index untuk yang sudah punya FK; etlSource.reportId fallback untuk legacy).
 *
 * Yang DI-CASCADE:
 *  - staging:   productSales, vendorPurchases, inventoryValuation,
 *               leftoverItems, dailyCashSummary, salesControl, creditPurchases,
 *               foodCostSummary, transferItems, productHPP, costAnalysis,
 *               dailyCashFlow, employeeIncentives, ownerTransfers
 *  - SSOT:      transactions (by_source_report)
 *  - derived:   dailySales, dailyClosings, payables, expenses
 *               (new rows via by_source_report; legacy fallback scan etlSource)
 *  - storage:   the original xlsx file
 *
 * Yang TIDAK DI-CASCADE (intentionally):
 *  - stockItems   — running totals (upserted), tidak terikat 1-1 ke report.
 *                   User mau bersihin → run backfillAllReports atau manual reset.
 *  - stockMovements — derived from cross-report deltas; bisa stale tapi
 *                   tidak orphan dangerous. Re-bridge meng-refresh.
 *  - bankStatementEntries / paymentReceipts / validationBatches — bukan
 *                   dari weeklyReports source.
 */
export const deleteWeeklyReport = mutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    let stagingDeleted = 0;
    const stagingTables = [
      "productSales", "vendorPurchases", "inventoryValuation",
      "leftoverItems", "dailyCashSummary", "salesControl", "creditPurchases",
      "foodCostSummary", "transferItems", "productHPP",
      "costAnalysis", "dailyCashFlow", "employeeIncentives",
      "ownerTransfers",
    ] as const;
    for (const table of stagingTables) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_report", (q) => q.eq("reportId", reportId))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
      stagingDeleted += rows.length;
    }

    // Derived/SSOT cascade via by_source_report index (cheap, no scan).
    let derivedDeleted = 0;
    const derivedTables = [
      "transactions", "dailySales", "dailyClosings", "payables", "expenses",
    ] as const;
    for (const table of derivedTables) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_source_report", (q) => q.eq("sourceReportId", reportId))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
      derivedDeleted += rows.length;
    }

    // Legacy fallback: rows bridged BEFORE sourceReportId field existed only
    // carry the link inside nested etlSource object (or — in case of dailySales
    // public bridge — only via the `referenceNo: etl:${reportId}:*` prefix).
    // Scan branch-scoped index + filter. Bounded by single branch + report's
    // typical period (≤ 31 dates × dozens of rows), tetap cheap.
    const report = await ctx.db.get(reportId);
    if (report?.branchId) {
      let legacyDeleted = 0;
      const expectedRefPrefix = `etl:${reportId}:`;

      // expenses (by_branch_date — iterate all dates on branch, filter etlSource)
      const legacyExpenses = await ctx.db
        .query("expenses")
        .withIndex("by_branch_date", (q) => q.eq("branchId", report.branchId))
        .collect();
      for (const e of legacyExpenses) {
        if (e.sourceReportId) continue;
        if (e.etlSource?.reportId === reportId) {
          await ctx.db.delete(e._id);
          legacyDeleted++;
        }
      }

      // payables (by_branch)
      const legacyPayables = await ctx.db
        .query("payables")
        .withIndex("by_branch", (q) => q.eq("branchId", report.branchId))
        .collect();
      for (const p of legacyPayables) {
        if (p.sourceReportId) continue;
        if (p.etlSource?.reportId === reportId) {
          await ctx.db.delete(p._id);
          legacyDeleted++;
        }
      }

      // dailySales (by_branch_date). Two legacy markers possible — etlSource
      // (internal bridge) atau referenceNo `etl:${reportId}:*` (public bridge).
      const legacySales = await ctx.db
        .query("dailySales")
        .withIndex("by_branch_date", (q) => q.eq("branchId", report.branchId))
        .collect();
      for (const s of legacySales) {
        if (s.sourceReportId) continue;
        const matchEtl = s.etlSource?.reportId === reportId;
        const matchRef = s.referenceNo?.startsWith(expectedRefPrefix);
        if (matchEtl || matchRef) {
          await ctx.db.delete(s._id);
          legacyDeleted++;
        }
      }

      // dailyClosings (by_branch_date). User complaint: "Setoran Harian tidak
      // ter-hapus" — gap utama. Legacy rows hanya punya etlSource.reportId.
      const legacyClosings = await ctx.db
        .query("dailyClosings")
        .withIndex("by_branch_date", (q) => q.eq("branchId", report.branchId))
        .collect();
      for (const c of legacyClosings) {
        if (c.sourceReportId) continue;
        if (c.etlSource?.reportId === reportId) {
          // Cascade ke linked transaction kalau ada (SSOT 2-way).
          if (c.transactionId) {
            try { await ctx.db.delete(c.transactionId); } catch { /* tx mungkin sudah ter-delete via by_source_report */ }
          }
          await ctx.db.delete(c._id);
          legacyDeleted++;
        }
      }

      derivedDeleted += legacyDeleted;
    }

    if (report?.fileStorageId) {
      try { await ctx.storage.delete(report.fileStorageId); } catch { /* file may be gone */ }
    }
    await ctx.db.delete(reportId);
    return { stagingDeleted, derivedDeleted };
  },
});

// ─── Inline Update Mutations (for ReportDataBrowser editing) ──

export const updateProductSale = mutation({
  args: { id: v.id("productSales"), channel: v.optional(v.string()) },
  handler: async (ctx, { id, ...updates }) => {
    await requireAuth(ctx);
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length > 0) await ctx.db.patch(id, clean);
    return id;
  },
});

export const updateVendorPurchase = mutation({
  args: { id: v.id("vendorPurchases"), section: v.optional(v.string()) },
  handler: async (ctx, { id, ...updates }) => {
    await requireAuth(ctx);
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length > 0) await ctx.db.patch(id, clean);
    return id;
  },
});

export const updateInventoryValuation = mutation({
  args: { id: v.id("inventoryValuation"), category: v.optional(v.string()) },
  handler: async (ctx, { id, ...updates }) => {
    await requireAuth(ctx);
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length > 0) await ctx.db.patch(id, clean);
    return id;
  },
});

export const updateProductHPP = mutation({
  args: { id: v.id("productHPP"), pricingClass: v.optional(v.string()) },
  handler: async (ctx, { id, ...updates }) => {
    await requireAuth(ctx);
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length > 0) await ctx.db.patch(id, clean);
    return id;
  },
});

export const updateTransferItem = mutation({
  args: { id: v.id("transferItems"), direction: v.optional(v.string()), category: v.optional(v.string()) },
  handler: async (ctx, { id, ...updates }) => {
    await requireAuth(ctx);
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length > 0) await ctx.db.patch(id, clean);
    return id;
  },
});

export const updateEmployeeIncentive = mutation({
  args: { id: v.id("employeeIncentives"), incentiveType: v.optional(v.string()) },
  handler: async (ctx, { id, ...updates }) => {
    await requireAuth(ctx);
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length > 0) await ctx.db.patch(id, clean);
    return id;
  },
});

export const updateFoodCostSummary = mutation({
  args: { id: v.id("foodCostSummary"), category: v.optional(v.string()) },
  handler: async (ctx, { id, ...updates }) => {
    await requireAuth(ctx);
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length > 0) await ctx.db.patch(id, clean);
    return id;
  },
});

