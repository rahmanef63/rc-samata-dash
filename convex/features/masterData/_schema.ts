import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  vendorTypeValidator,
  incomeChannelTypeValidator,
  expenseCategoryTypeValidator,
  productCategoryValidator,
  ingredientCategoryValidator,
} from "./_types";

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
    type: vendorTypeValidator,
    phone: v.string(),
    notes: v.string(),
    isActive: v.boolean(),
    uploadedBy: v.optional(v.string()),
  }).index("by_active", ["isActive"]),

  incomeChannels: defineTable({
    name: v.string(),
    type: incomeChannelTypeValidator,
    isSettlementDelayed: v.boolean(),
    uploadedBy: v.optional(v.string()),
  }),

  expenseCategories: defineTable({
    name: v.string(),
    type: expenseCategoryTypeValidator,
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
    category: productCategoryValidator,
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
    category: ingredientCategoryValidator,
    unit: v.string(),
    aliases: v.array(v.string()),
    isActive: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_normalized", ["normalizedName"]),

  /**
   * DB-backed keyword inference rules. Replaces the static INFERENCE_RULES array
   * in shared/categoryInference.ts. Read by parsers via useQuery + by server
   * mutations directly. Order by priority asc — first match wins.
   */
  categoryRules: defineTable({
    keyword: v.string(),       // UPPER-cased, can be a multi-word phrase
    label: v.string(),         // expense category label (matches expenseCategories.name)
    type: v.string(),          // expense category type ("cogs" | "utility" | "other" | ...)
    priority: v.number(),      // lower = checked first; default 100
    isActive: v.boolean(),
    source: v.optional(v.string()), // "seed" | "user" | "ai"
  })
    .index("by_priority", ["priority"])
    .index("by_keyword", ["keyword"]),

  /**
   * Known sheet types from the various RC Samata weekly xlsx variants.
   * `isParsed: true` → parser exists. `isParsed: false` → known but intentionally
   * skipped (so validateParsedData doesn't show as "Sheet Baru" warning).
   */
  sheetTypeRegistry: defineTable({
    sheetNamePattern: v.string(), // case-insensitive substring match
    description: v.string(),
    isParsed: v.boolean(),
    parserName: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_pattern", ["sheetNamePattern"]),
};
