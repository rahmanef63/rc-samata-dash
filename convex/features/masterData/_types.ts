/**
 * Master-data feature types — vendor / channel / category / product /
 * ingredient enums. Most of these are reference values reused by
 * many feature schemas so we export both the tuple (for runtime
 * iteration in UI option lists) and the Convex validator.
 */
import { v } from "convex/values";

export const VENDOR_TYPES = ["food_supplier", "utility", "service", "payroll", "misc"] as const;
export type VendorType = typeof VENDOR_TYPES[number];
export const vendorTypeValidator = v.union(
  v.literal("food_supplier"),
  v.literal("utility"),
  v.literal("service"),
  v.literal("payroll"),
  v.literal("misc"),
);

export const INCOME_CHANNEL_TYPES = [
  "cash", "transfer", "gofood", "grabfood", "shopeefood",
  "ovo", "dana", "qris", "dine_in", "take_away", "other",
] as const;
export type IncomeChannelType = typeof INCOME_CHANNEL_TYPES[number];
export const incomeChannelTypeValidator = v.union(
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
  v.literal("other"),
);

export const EXPENSE_CATEGORY_TYPES = [
  "cogs", "utility", "salary_support", "bpjs",
  "maintenance", "marketing", "fee", "other",
] as const;
export type ExpenseCategoryType = typeof EXPENSE_CATEGORY_TYPES[number];
export const expenseCategoryTypeValidator = v.union(
  v.literal("cogs"),
  v.literal("utility"),
  v.literal("salary_support"),
  v.literal("bpjs"),
  v.literal("maintenance"),
  v.literal("marketing"),
  v.literal("fee"),
  v.literal("other"),
);

export const PRODUCT_CATEGORIES = ["ayam", "minuman", "snack", "paket", "sambal", "lainnya"] as const;
export type ProductCategory = typeof PRODUCT_CATEGORIES[number];
export const productCategoryValidator = v.union(
  v.literal("ayam"),
  v.literal("minuman"),
  v.literal("snack"),
  v.literal("paket"),
  v.literal("sambal"),
  v.literal("lainnya"),
);

export const INGREDIENT_CATEGORIES = [
  "protein", "sayur", "bumbu", "minyak", "kemasan", "minuman_bahan", "lainnya",
] as const;
export type IngredientCategory = typeof INGREDIENT_CATEGORIES[number];
export const ingredientCategoryValidator = v.union(
  v.literal("protein"),
  v.literal("sayur"),
  v.literal("bumbu"),
  v.literal("minyak"),
  v.literal("kemasan"),
  v.literal("minuman_bahan"),
  v.literal("lainnya"),
);
