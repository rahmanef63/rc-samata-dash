import { defineTable } from "convex/server";
import { v } from "convex/values";

export const reportsTables = {
  /**
   * Header record untuk setiap file LAP yang diupload.
   * Satu record = satu file Excel (misal "NEW LAP 1-7 JAN 2026.xlsx").
   */
  weeklyReports: defineTable({
    branchId: v.id("branches"),
    fileName: v.string(),
    periodStart: v.string(), // "2026-01-01"
    periodEnd: v.string(),   // "2026-01-07"
    uploadedBy: v.string(),  // userId
    uploadedAt: v.number(),  // Date.now()
    status: v.union(
      v.literal("pending"),
      v.literal("processed"),
      v.literal("error")
    ),
    // Ringkasan jumlah record yang berhasil diimport
    expenseCount: v.optional(v.number()),
    salesCount: v.optional(v.number()),
    vendorCount: v.optional(v.number()),
    inventoryCount: v.optional(v.number()),
  })
    .index("by_branch", ["branchId"])
    .index("by_branch_period", ["branchId", "periodStart"]),

  /**
   * Penjualan harian per produk — dari sheet "LAP. PENJUALAN".
   * Satu record = satu produk, satu hari.
   */
  productSales: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    businessDate: v.string(),   // "2026-01-01"
    productName: v.string(),    // "DADA", "PAHA ATAS", dll
    qty: v.number(),
    amount: v.number(),         // total Rp
    unitPrice: v.number(),
    foodCostItem: v.optional(v.number()),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_date", ["branchId", "businessDate"]),

  /**
   * Pembelian & stok bahan mingguan per komoditi — dari sheet "VENDOR".
   * Satu record = satu jenis bahan (DADA MENTOK, DADA, PAHA ATAS, dll) per minggu.
   */
  vendorPurchases: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    weekStart: v.string(),       // "2026-01-01"
    commodityName: v.string(),   // "DADA MENTOK", "DADA", dll
    openingQty: v.number(),
    openingValue: v.number(),    // Rp
    purchaseQty: v.number(),
    purchaseValue: v.number(),   // Rp
    usageQty: v.number(),
    closingQty: v.number(),
    closingValue: v.number(),    // Rp
  })
    .index("by_report", ["reportId"])
    .index("by_branch_week", ["branchId", "weekStart"]),

  /**
   * Valuasi inventory / food cost mingguan — dari sheet "WEEKLY FC".
   * Satu record = satu item bahan per penilaian.
   */
  inventoryValuation: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    valuationDate: v.string(),  // "2026-01-07" (akhir minggu)
    category: v.string(),       // "BAHAN AYAM", "ES", "MINUMAN", dll
    itemName: v.string(),
    qty: v.number(),
    unit: v.string(),
    unitPrice: v.number(),
    totalValue: v.number(),     // Rp
  })
    .index("by_report", ["reportId"])
    .index("by_branch_date", ["branchId", "valuationDate"]),
};
