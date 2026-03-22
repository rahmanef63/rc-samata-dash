import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

// ─── Tipe data untuk batch import ───────────────────────────

const lpkkItemValidator = v.object({
  expenseDate: v.string(),
  categoryType: v.union(
    v.literal("cogs"),
    v.literal("utility"),
    v.literal("other")
  ),
  categoryLabel: v.string(), // "Bahan Ayam", "Transport", dll
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

    // Ambil semua kategori expense sekali
    const categories = await ctx.db.query("expenseCategories").collect();

    // Cari kategori berdasarkan type, fallback ke type "other"
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

// ─── 3. Import LAP. PENJUALAN → productSales ────────────────

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
      if (item.qty <= 0 && item.amount <= 0) continue;
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
      await ctx.db.insert("vendorPurchases", {
        ...item,
        weekStart,
        reportId,
        branchId,
      });
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
      await ctx.db.insert("inventoryValuation", {
        ...item,
        valuationDate,
        reportId,
        branchId,
      });
      count++;
    }
    return count;
  },
});

// ─── 6. Finalize report (update status & counts) ────────────

export const finalizeWeeklyReport = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    status: v.union(v.literal("processed"), v.literal("error")),
    expenseCount: v.optional(v.number()),
    salesCount: v.optional(v.number()),
    vendorCount: v.optional(v.number()),
    inventoryCount: v.optional(v.number()),
  },
  handler: async (ctx, { reportId, ...data }) => {
    await requireAuth(ctx);
    await ctx.db.patch(reportId, data);
    return reportId;
  },
});

// ─── 7. Hapus report beserta semua data terkait ──────────────

export const deleteWeeklyReport = mutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);

    // Hapus semua data anak
    const tables = ["productSales", "vendorPurchases", "inventoryValuation"] as const;
    for (const table of tables) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_report", (q) => q.eq("reportId", reportId))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }

    // Hapus expenses yang terkait (by matching uploadedAt window? Tidak bisa.)
    // Expenses dari LPKK tidak punya reportId, jadi kita skip cascade-delete expenses.
    // User bisa hapus manual dari halaman expenses jika perlu.

    await ctx.db.delete(reportId);
    return null;
  },
});
