import { defineTable } from "convex/server";
import { v } from "convex/values";

export const reportsTables = {
  /** Header record per file LAP yang diupload. */
  weeklyReports: defineTable({
    branchId: v.id("branches"),
    fileName: v.string(),
    periodStart: v.string(),
    periodEnd: v.string(),
    uploadedBy: v.string(),
    uploadedAt: v.number(),
    status: v.union(v.literal("pending"), v.literal("processed"), v.literal("error")),
    expenseCount: v.optional(v.number()),
    salesCount: v.optional(v.number()),
    vendorCount: v.optional(v.number()),
    inventoryCount: v.optional(v.number()),
    // Tambahan sheet baru
    leftoverCount: v.optional(v.number()),
    kasPeriodeCount: v.optional(v.number()),
    salesControlCount: v.optional(v.number()),
    creditPurchaseCount: v.optional(v.number()),
  })
    .index("by_branch", ["branchId"])
    .index("by_branch_period", ["branchId", "periodStart"]),

  /**
   * Penjualan harian per produk — dari sheet LAP. PENJUALAN,
   * LAP. PENJUALAN GRAB FOOD, GO FOOD, SHOPEE FOOD.
   * channel: "all" | "grabfood" | "gofood" | "shopeefood" | "tambahan"
   */
  productSales: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    businessDate: v.string(),
    productName: v.string(),
    qty: v.number(),
    amount: v.number(),
    unitPrice: v.number(),
    foodCostItem: v.optional(v.number()),
    channel: v.optional(v.string()),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_date", ["branchId", "businessDate"])
    .index("by_report_channel", ["reportId", "channel"]),

  /** Pembelian & stok bahan mingguan per komoditi — dari sheet VENDOR. */
  vendorPurchases: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    weekStart: v.string(),
    commodityName: v.string(),
    openingQty: v.number(),
    openingValue: v.number(),
    purchaseQty: v.number(),
    purchaseValue: v.number(),
    usageQty: v.number(),
    closingQty: v.number(),
    closingValue: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_week", ["branchId", "weekStart"]),

  /** Valuasi inventory / food cost — dari sheet WEEKLY FC. */
  inventoryValuation: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    valuationDate: v.string(),
    category: v.string(),
    itemName: v.string(),
    qty: v.number(),
    unit: v.string(),
    unitPrice: v.number(),
    totalValue: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_date", ["branchId", "valuationDate"]),

  /**
   * Left over / spoilage harian per item — dari sheet LEFT OVER.
   * Satu record = satu item, satu hari.
   */
  leftoverItems: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    businessDate: v.string(),
    itemName: v.string(),
    qty: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_date", ["branchId", "businessDate"]),

  /**
   * Ringkasan kas & penjualan harian — dari sheet LAPORAN KAS PERIODE.
   * Satu record = satu hari.
   */
  dailyCashSummary: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    businessDate: v.string(),
    grossSales: v.number(),
    komisiGofood: v.number(),
    komisiGrabfood: v.number(),
    komisiShopeefood: v.number(),
    koreksi: v.number(),
    discount: v.number(),
    netSales: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_date", ["branchId", "businessDate"]),

  /**
   * Kontrol penjualan harian — dari sheet SALES CONTROL.
   * Berisi net sales, customer count, target, dll.
   */
  salesControl: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    businessDate: v.string(),
    netSales: v.number(),
    customerCount: v.number(),
    spendingPower: v.number(),
    targetSales: v.number(),
    achievementPct: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_date", ["branchId", "businessDate"]),

  /**
   * Pembelian kredit dari supplier — dari sheet PEMBELIAN KREDIT.
   */
  creditPurchases: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    purchaseDate: v.string(),
    supplierName: v.string(),
    itemName: v.string(),
    invoiceNo: v.optional(v.string()),
    qty: v.number(),
    unitPrice: v.number(),
    totalAmount: v.number(),
    dueDate: v.optional(v.string()),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_date", ["branchId", "purchaseDate"]),
};
