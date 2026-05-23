import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  vendorTypeValidator,
  incomeChannelTypeValidator,
  expenseCategoryTypeValidator,
  productCategoryValidator,
  ingredientCategoryValidator,
} from "./_types";

export const fixedAssetCategoryValidator = v.union(
  v.literal("kitchen_equipment"),
  v.literal("furniture"),
  v.literal("vehicle"),
  v.literal("electronic"),
  v.literal("building"),
  v.literal("other"),
);

export const masterDataTables = {
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

  categoryRules: defineTable({
    keyword: v.string(),
    label: v.string(),
    type: v.string(),
    priority: v.number(),
    isActive: v.boolean(),
    source: v.optional(v.string()),
  })
    .index("by_priority", ["priority"])
    .index("by_keyword", ["keyword"]),

  sheetTypeRegistry: defineTable({
    sheetNamePattern: v.string(),
    description: v.string(),
    isParsed: v.boolean(),
    parserName: v.optional(v.string()),
    isActive: v.boolean(),
  }).index("by_pattern", ["sheetNamePattern"]),

  /** Fixed assets / CapEx tracking — kitchen equipment, furniture, etc. */
  fixedAssets: defineTable({
    name: v.string(),
    category: fixedAssetCategoryValidator,
    acquisitionDate: v.string(),         // YYYY-MM-DD
    acquisitionCost: v.number(),
    currentValue: v.optional(v.number()),
    usefulLifeMonths: v.optional(v.number()),
    location: v.optional(v.string()),
    vendorId: v.optional(v.id("vendors")),
    transactionId: v.optional(v.id("transactions")),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  /** Business glossary — istilah/terminologi operasional. */
  glossaryTerms: defineTable({
    term: v.string(),
    definition: v.string(),
    category: v.optional(v.string()),    // "finance" | "operasional" | "hr"
    aliases: v.optional(v.array(v.string())),
    updatedAt: v.optional(v.number()),
  }).index("by_term", ["term"]),
};
