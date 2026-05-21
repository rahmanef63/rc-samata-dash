import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { vendorTypeValidator, incomeChannelTypeValidator, expenseCategoryTypeValidator, productCategoryValidator, ingredientCategoryValidator } from "./_types";
import { requireAuth } from "../../shared/auth";
import { LIMITS } from "../../shared/limits";
import {
  normalizeItemName,
  generateItemCode,
  categorizeProduct,
  categorizeIngredient,
} from "../../shared/helpers";

// ─── Branches ───────────────────────────────────────────────
export const createBranch = mutation({
  args: { code: v.string(), name: v.string(), location: v.string(), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return await ctx.db.insert("branches", { ...args, uploadedBy: userId });
  },
});

export const updateBranch = mutation({
  args: { id: v.id("branches"), code: v.string(), name: v.string(), location: v.string(), isActive: v.boolean() },
  handler: async (ctx, { id, ...data }) => {
    await requireAuth(ctx);
    await ctx.db.patch(id, data);
    return id;
  },
});

export const deleteBranch = mutation({
  args: { id: v.id("branches") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});

// ─── Vendors ────────────────────────────────────────────────
export const createVendor = mutation({
  args: { name: v.string(), type: vendorTypeValidator, phone: v.string(), notes: v.string(), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return await ctx.db.insert("vendors", { ...args, uploadedBy: userId });
  },
});

export const updateVendor = mutation({
  args: { id: v.id("vendors"), name: v.string(), type: vendorTypeValidator, phone: v.string(), notes: v.string(), isActive: v.boolean() },
  handler: async (ctx, { id, ...data }) => {
    await requireAuth(ctx);
    await ctx.db.patch(id, data);
    return id;
  },
});

export const deleteVendor = mutation({
  args: { id: v.id("vendors") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});

// Partial vendor patch — for per-cell edits from Notion view where
// only one field changes at a time.
export const patchVendor = mutation({
  args: {
    id: v.id("vendors"),
    name: v.optional(v.string()),
    type: v.optional(vendorTypeValidator),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...data }) => {
    await requireAuth(ctx);
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(data)) {
      if (val !== undefined && val !== null) patch[k] = val;
    }
    if (Object.keys(patch).length > 0) await ctx.db.patch(id, patch);
    return id;
  },
});

// ─── Income Channels ────────────────────────────────────────
export const createIncomeChannel = mutation({
  args: { name: v.string(), type: incomeChannelTypeValidator, isSettlementDelayed: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return await ctx.db.insert("incomeChannels", { ...args, uploadedBy: userId });
  },
});

export const updateIncomeChannel = mutation({
  args: { id: v.id("incomeChannels"), name: v.string(), type: incomeChannelTypeValidator, isSettlementDelayed: v.boolean() },
  handler: async (ctx, { id, ...data }) => {
    await requireAuth(ctx);
    await ctx.db.patch(id, data);
    return id;
  },
});

export const deleteIncomeChannel = mutation({
  args: { id: v.id("incomeChannels") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});

// ─── Expense Categories ─────────────────────────────────────
export const createExpenseCategory = mutation({
  args: { name: v.string(), type: expenseCategoryTypeValidator },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return await ctx.db.insert("expenseCategories", { ...args, uploadedBy: userId });
  },
});

export const updateExpenseCategory = mutation({
  args: { id: v.id("expenseCategories"), name: v.string(), type: expenseCategoryTypeValidator },
  handler: async (ctx, { id, ...data }) => {
    await requireAuth(ctx);
    await ctx.db.patch(id, data);
    return id;
  },
});

export const deleteExpenseCategory = mutation({
  args: { id: v.id("expenseCategories") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});

// ─── Master Products ───────────────────────────────────────

/**
 * Bootstrap masterProducts from existing productSales + productHPP data.
 * Scans all unique product names, deduplicates by normalizedName, and inserts.
 */
export const bootstrapMasterProducts = mutation({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);

    // Collect unique product names from sales + HPP
    const nameSet = new Set<string>();

    const sales = await ctx.db
      .query("productSales")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .collect();
    for (const s of sales) nameSet.add(s.productName.trim());

    const hpp = await ctx.db
      .query("productHPP")
      .withIndex("by_branch_product", (q) => q.eq("branchId", branchId))
      .collect();
    for (const h of hpp) nameSet.add(h.productName.trim());

    // Get existing master products to avoid duplicates
    const existing = await ctx.db.query("masterProducts").take(LIMITS.SALES_PAGE);
    const existingNorms = new Set(existing.map((e) => e.normalizedName));

    // Get next sequence number
    let seq = existing.length;
    let inserted = 0;

    for (const name of nameSet) {
      const normalized = normalizeItemName(name);
      if (!normalized || existingNorms.has(normalized)) continue;

      seq++;
      await ctx.db.insert("masterProducts", {
        code: generateItemCode("PRD", seq),
        canonicalName: name,
        normalizedName: normalized,
        category: categorizeProduct(name),
        aliases: [],
        isActive: true,
      });
      existingNorms.add(normalized);
      inserted++;
    }

    return { inserted, total: seq };
  },
});

/**
 * Bootstrap masterIngredients from vendor, inventory, costAnalysis, HPP ingredients.
 */
export const bootstrapMasterIngredients = mutation({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);

    const nameSet = new Set<string>();

    // Vendor purchases
    const vendor = await ctx.db
      .query("vendorPurchases")
      .withIndex("by_branch_week", (q) => q.eq("branchId", branchId))
      .collect();
    for (const v of vendor) nameSet.add(v.commodityName.trim());

    // Inventory valuation
    const inv = await ctx.db
      .query("inventoryValuation")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .collect();
    for (const i of inv) nameSet.add(i.itemName.trim());

    // Cost analysis
    const ca = await ctx.db
      .query("costAnalysis")
      .withIndex("by_branch_period", (q) => q.eq("branchId", branchId))
      .collect();
    for (const c of ca) nameSet.add(c.itemName.trim());

    // Leftover items
    const lo = await ctx.db
      .query("leftoverItems")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .collect();
    for (const l of lo) nameSet.add(l.itemName.trim());

    // Credit purchases
    const cp = await ctx.db
      .query("creditPurchases")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .collect();
    for (const c of cp) nameSet.add(c.itemName.trim());

    // HPP ingredients
    const hpp = await ctx.db
      .query("productHPP")
      .withIndex("by_branch_product", (q) => q.eq("branchId", branchId))
      .collect();
    for (const h of hpp) {
      if (h.ingredients) {
        for (const ing of h.ingredients) nameSet.add(ing.name.trim());
      }
    }

    // Get existing to avoid duplicates
    const existing = await ctx.db.query("masterIngredients").take(LIMITS.STAGING_PAGE);
    const existingNorms = new Set(existing.map((e) => e.normalizedName));

    let seq = existing.length;
    let inserted = 0;

    for (const name of nameSet) {
      const normalized = normalizeItemName(name);
      if (!normalized || existingNorms.has(normalized)) continue;

      seq++;
      await ctx.db.insert("masterIngredients", {
        code: generateItemCode("ING", seq),
        canonicalName: name,
        normalizedName: normalized,
        category: categorizeIngredient(name),
        unit: "pcs",
        aliases: [],
        isActive: true,
      });
      existingNorms.add(normalized);
      inserted++;
    }

    return { inserted, total: seq };
  },
});

export const upsertMasterProduct = mutation({
  args: {
    id: v.optional(v.id("masterProducts")),
    canonicalName: v.string(),
    category: productCategoryValidator,
    defaultSellingPrice: v.optional(v.number()),
  },
  handler: async (ctx, { id, canonicalName, category, defaultSellingPrice }) => {
    await requireAuth(ctx);
    const normalized = normalizeItemName(canonicalName);

    if (id) {
      await ctx.db.patch(id, { canonicalName, normalizedName: normalized, category, defaultSellingPrice });
      return id;
    }

    const existing = await ctx.db.query("masterProducts").take(LIMITS.INVENTORY_PAGE);
    const seq = existing.length + 1;
    return await ctx.db.insert("masterProducts", {
      code: generateItemCode("PRD", seq),
      canonicalName,
      normalizedName: normalized,
      category,
      aliases: [],
      defaultSellingPrice,
      isActive: true,
    });
  },
});

export const upsertMasterIngredient = mutation({
  args: {
    id: v.optional(v.id("masterIngredients")),
    canonicalName: v.string(),
    category: ingredientCategoryValidator,
    unit: v.string(),
  },
  handler: async (ctx, { id, canonicalName, category, unit }) => {
    await requireAuth(ctx);
    const normalized = normalizeItemName(canonicalName);

    if (id) {
      await ctx.db.patch(id, { canonicalName, normalizedName: normalized, category, unit });
      return id;
    }

    const existing = await ctx.db.query("masterIngredients").take(LIMITS.INVENTORY_PAGE);
    const seq = existing.length + 1;
    return await ctx.db.insert("masterIngredients", {
      code: generateItemCode("ING", seq),
      canonicalName,
      normalizedName: normalized,
      category,
      unit,
      aliases: [],
      isActive: true,
    });
  },
});

export const addProductAlias = mutation({
  args: { id: v.id("masterProducts"), alias: v.string() },
  handler: async (ctx, { id, alias }) => {
    await requireAuth(ctx);
    const item = await ctx.db.get(id);
    if (!item) throw new Error("Product not found");
    const normalized = normalizeItemName(alias);
    if (item.aliases.includes(normalized)) return id;
    await ctx.db.patch(id, { aliases: [...item.aliases, normalized] });
    return id;
  },
});

export const addIngredientAlias = mutation({
  args: { id: v.id("masterIngredients"), alias: v.string() },
  handler: async (ctx, { id, alias }) => {
    await requireAuth(ctx);
    const item = await ctx.db.get(id);
    if (!item) throw new Error("Ingredient not found");
    const normalized = normalizeItemName(alias);
    if (item.aliases.includes(normalized)) return id;
    await ctx.db.patch(id, { aliases: [...item.aliases, normalized] });
    return id;
  },
});

export const patchMasterProduct = mutation({
  args: {
    id: v.id("masterProducts"),
    canonicalName: v.optional(v.string()),
    code: v.optional(v.string()),
    category: v.optional(productCategoryValidator),
    defaultSellingPrice: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...data }) => {
    await requireAuth(ctx);
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(data)) if (val !== undefined && val !== null) patch[k] = val;
    if (Object.keys(patch).length > 0) await ctx.db.patch(id, patch);
    return id;
  },
});

export const patchMasterIngredient = mutation({
  args: {
    id: v.id("masterIngredients"),
    canonicalName: v.optional(v.string()),
    code: v.optional(v.string()),
    category: v.optional(ingredientCategoryValidator),
    unit: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...data }) => {
    await requireAuth(ctx);
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(data)) if (val !== undefined && val !== null) patch[k] = val;
    if (Object.keys(patch).length > 0) await ctx.db.patch(id, patch);
    return id;
  },
});

export const deleteMasterProduct = mutation({
  args: { id: v.id("masterProducts") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    await ctx.db.delete(id);
    return null;
  },
});

// ─── Partial patches for Notion view per-cell edits ────────
export const patchIncomeChannel = mutation({
  args: {
    id: v.id("incomeChannels"),
    name: v.optional(v.string()),
    type: v.optional(incomeChannelTypeValidator),
    isSettlementDelayed: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...data }) => {
    await requireAuth(ctx);
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(data)) if (val !== undefined && val !== null) patch[k] = val;
    if (Object.keys(patch).length > 0) await ctx.db.patch(id, patch);
    return id;
  },
});

export const patchExpenseCategory = mutation({
  args: {
    id: v.id("expenseCategories"),
    name: v.optional(v.string()),
    type: v.optional(expenseCategoryTypeValidator),
  },
  handler: async (ctx, { id, ...data }) => {
    await requireAuth(ctx);
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(data)) if (val !== undefined && val !== null) patch[k] = val;
    if (Object.keys(patch).length > 0) await ctx.db.patch(id, patch);
    return id;
  },
});

export const patchBranch = mutation({
  args: {
    id: v.id("branches"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...data }) => {
    await requireAuth(ctx);
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(data)) if (val !== undefined && val !== null) patch[k] = val;
    if (Object.keys(patch).length > 0) await ctx.db.patch(id, patch);
    return id;
  },
});

export const deleteMasterIngredient = mutation({
  args: { id: v.id("masterIngredients") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    await ctx.db.delete(id);
    return null;
  },
});
