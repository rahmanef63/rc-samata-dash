import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { normalizeItemName, findBestMatch } from "../../shared/helpers";
import { LIMITS } from "../../shared/limits";

// NOTE: branches table dropped (single-tenant). Branch CRUD removed.

export const listVendors = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (args.activeOnly) {
      return await ctx.db.query("vendors").withIndex("by_active", (q) => q.eq("isActive", true)).take(100);
    }
    return await ctx.db.query("vendors").take(100);
  },
});

export const getVendor = query({
  args: { id: v.id("vendors") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const listIncomeChannels = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("incomeChannels").take(50);
  },
});

export const listExpenseCategories = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("expenseCategories").take(50);
  },
});

// ─── Master Products ───────────────────────────────────────

export const listMasterProducts = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const all = await ctx.db.query("masterProducts").take(LIMITS.INVENTORY_PAGE);
    if (args.activeOnly) return all.filter((p) => p.isActive);
    return all;
  },
});

export const getMasterProduct = query({
  args: { id: v.id("masterProducts") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const findMasterProductByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    await requireAuth(ctx);
    const normalized = normalizeItemName(name);
    const exact = await ctx.db
      .query("masterProducts")
      .withIndex("by_normalized", (q) => q.eq("normalizedName", normalized))
      .first();
    if (exact) return exact;

    // Fallback: fuzzy search (bounded)
    const all = await ctx.db.query("masterProducts").take(LIMITS.INVENTORY_PAGE);
    const idx = findBestMatch(name, all);
    return idx >= 0 ? all[idx] : null;
  },
});

// ─── Master Ingredients ────────────────────────────────────

export const listMasterIngredients = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const all = await ctx.db.query("masterIngredients").take(LIMITS.INVENTORY_PAGE);
    if (args.activeOnly) return all.filter((p) => p.isActive);
    return all;
  },
});

export const getMasterIngredient = query({
  args: { id: v.id("masterIngredients") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const findMasterIngredientByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    await requireAuth(ctx);
    const normalized = normalizeItemName(name);
    const exact = await ctx.db
      .query("masterIngredients")
      .withIndex("by_normalized", (q) => q.eq("normalizedName", normalized))
      .first();
    if (exact) return exact;

    const all = await ctx.db.query("masterIngredients").take(LIMITS.INVENTORY_PAGE);
    const idx = findBestMatch(name, all);
    return idx >= 0 ? all[idx] : null;
  },
});

/**
 * Match coverage: check how many item names from a list match against master registry.
 * Returns unmatched items for UI warning display.
 */
export const checkItemCoverage = query({
  args: {
    productNames: v.array(v.string()),
    ingredientNames: v.array(v.string()),
  },
  handler: async (ctx, { productNames, ingredientNames }) => {
    await requireAuth(ctx);

    const products = await ctx.db.query("masterProducts").take(LIMITS.INVENTORY_PAGE);
    const ingredients = await ctx.db.query("masterIngredients").take(LIMITS.INVENTORY_PAGE);

    const unmatchedProducts: string[] = [];
    for (const name of productNames) {
      const idx = findBestMatch(name, products);
      if (idx < 0) unmatchedProducts.push(name);
    }

    const unmatchedIngredients: string[] = [];
    for (const name of ingredientNames) {
      const idx = findBestMatch(name, ingredients);
      if (idx < 0) unmatchedIngredients.push(name);
    }

    return {
      productsCovered: productNames.length - unmatchedProducts.length,
      productsTotal: productNames.length,
      unmatchedProducts,
      ingredientsCovered: ingredientNames.length - unmatchedIngredients.length,
      ingredientsTotal: ingredientNames.length,
      unmatchedIngredients,
    };
  },
});


// ─── Category rules + sheet registry (DB-backed inference) ──

export const listCategoryRules = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, { activeOnly }) => {
    await requireAuth(ctx);
    const rules = await ctx.db.query("categoryRules").withIndex("by_priority").take(2000);
    return activeOnly ? rules.filter((r) => r.isActive) : rules;
  },
});

export const listSheetRegistry = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, { activeOnly }) => {
    await requireAuth(ctx);
    const rows = await ctx.db.query("sheetTypeRegistry").take(500);
    return activeOnly ? rows.filter((r) => r.isActive) : rows;
  },
});
