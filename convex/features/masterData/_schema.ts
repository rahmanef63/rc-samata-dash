import { defineTable } from "convex/server";
import { v } from "convex/values";

export const masterDataTables = {
  branches: defineTable({
    code: v.string(),
    name: v.string(),
    location: v.string(),
    isActive: v.boolean(),
    uploadedBy: v.optional(v.string()),
  }).index("by_code", ["code"]),

  vendors: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("food_supplier"),
      v.literal("utility"),
      v.literal("service"),
      v.literal("payroll"),
      v.literal("misc")
    ),
    phone: v.string(),
    notes: v.string(),
    isActive: v.boolean(),
    uploadedBy: v.optional(v.string()),
  }).index("by_active", ["isActive"]),

  incomeChannels: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("cash"),
      v.literal("transfer"),
      v.literal("gofood"),
      v.literal("grabfood"),
      v.literal("shopeefood"),
      v.literal("ovo"),
      v.literal("dana"),
      v.literal("qris"),
      v.literal("dine_in"),
      v.literal("take_away"),
      v.literal("other")
    ),
    isSettlementDelayed: v.boolean(),
    uploadedBy: v.optional(v.string()),
  }),

  expenseCategories: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("cogs"),
      v.literal("utility"),
      v.literal("salary_support"),
      v.literal("bpjs"),
      v.literal("maintenance"),
      v.literal("marketing"),
      v.literal("fee"),
      v.literal("other")
    ),
    uploadedBy: v.optional(v.string()),
  }),

  /**
   * Master produk jadi — dari productSales.productName, productHPP.productName.
   * Digunakan untuk match lintas tabel (sales ↔ HPP ↔ platform).
   */
  masterProducts: defineTable({
    code: v.string(),
    canonicalName: v.string(),
    normalizedName: v.string(),
    category: v.union(
      v.literal("ayam"),
      v.literal("minuman"),
      v.literal("snack"),
      v.literal("paket"),
      v.literal("sambal"),
      v.literal("lainnya"),
    ),
    aliases: v.array(v.string()),
    defaultSellingPrice: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_normalized", ["normalizedName"]),

  /**
   * Master bahan baku — dari vendorPurchases.commodityName, inventoryValuation.itemName,
   * costAnalysis.itemName, leftoverItems.itemName, creditPurchases.itemName,
   * productHPP.ingredients[].name.
   */
  masterIngredients: defineTable({
    code: v.string(),
    canonicalName: v.string(),
    normalizedName: v.string(),
    category: v.union(
      v.literal("protein"),
      v.literal("sayur"),
      v.literal("bumbu"),
      v.literal("minyak"),
      v.literal("kemasan"),
      v.literal("minuman_bahan"),
      v.literal("lainnya"),
    ),
    unit: v.string(),
    aliases: v.array(v.string()),
    isActive: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_normalized", ["normalizedName"]),
};
