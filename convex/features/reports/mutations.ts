import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

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

export const createWeeklyReport = mutation({
  args: {
    branchId: v.id("branches"),
    fileName: v.string(),
    periodStart: v.string(),
    periodEnd: v.string(),
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
    const findCategory = (type: "cogs" | "utility" | "other") =>
      categories.find((c) => c.type === type) ??
      categories.find((c) => c.type === "other") ??
      categories[0];
    let count = 0;
    for (const item of items) {
      if (item.amount <= 0) continue;
      const cat = findCategory(item.categoryType);
      if (!cat) continue;
      await ctx.db.insert("expenses", {
        expenseDate: item.expenseDate,
        categoryId: cat._id,
        categoryName: item.categoryLabel,
        amount: item.amount,
        description: item.description,
        paymentSource: "petty_cash",
        status: "draft",
        hasAttachment: false,
        branchId,
      });
      count++;
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
    let count = 0;
    for (const item of items) {
      if (item.totalValue <= 0) continue;
      await ctx.db.insert("inventoryValuation", { ...item, valuationDate, reportId, branchId });
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
    let count = 0;
    for (const item of items) {
      await ctx.db.insert("foodCostSummary", { ...item, periodStart, reportId, branchId });
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
    let count = 0;
    for (const item of items) {
      if (item.qty <= 0 && item.totalValue <= 0) continue;
      await ctx.db.insert("transferItems", { ...item, periodStart, reportId, branchId });
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

export const deleteWeeklyReport = mutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    const tables = [
      "productSales", "vendorPurchases", "inventoryValuation",
      "leftoverItems", "dailyCashSummary", "salesControl", "creditPurchases",
      "foodCostSummary", "transferItems", "productHPP",
      "costAnalysis", "dailyCashFlow", "employeeIncentives",
      "ownerTransfers",
    ] as const;
    for (const table of tables) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_report", (q) => q.eq("reportId", reportId))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }
    await ctx.db.delete(reportId);
    return null;
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

