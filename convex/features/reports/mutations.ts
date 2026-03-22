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
  openingQty: v.number(),
  openingValue: v.number(),
  purchaseQty: v.number(),
  purchaseValue: v.number(),
  usageQty: v.number(),
  closingQty: v.number(),
  closingValue: v.number(),
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
    const categories = await ctx.db.query("expenseCategories").collect();
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

// ─── 10. Finalize report ─────────────────────────────────────

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
  },
  handler: async (ctx, { reportId, ...data }) => {
    await requireAuth(ctx);
    await ctx.db.patch(reportId, data);
    return reportId;
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
