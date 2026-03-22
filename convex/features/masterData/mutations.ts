import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { vendorTypeValidator, incomeChannelTypeValidator, expenseCategoryTypeValidator } from "../../shared/validators";
import { requireAuth } from "../../shared/auth";

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
