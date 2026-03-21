import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { stockStatusValidator, stockMovementTypeValidator } from "../../shared/validators";

export const createItem = mutation({
  args: {
    name: v.string(),
    currentQty: v.number(),
    unit: v.string(),
    minQty: v.number(),
    status: stockStatusValidator,
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("stockItems", args);
  },
});

export const updateItem = mutation({
  args: {
    id: v.id("stockItems"),
    name: v.optional(v.string()),
    currentQty: v.optional(v.number()),
    minQty: v.optional(v.number()),
    status: v.optional(stockStatusValidator),
  },
  handler: async (ctx, { id, ...data }) => {
    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) patch[key] = val;
    }
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const deleteItem = mutation({
  args: { id: v.id("stockItems") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

export const recordMovement = mutation({
  args: {
    itemId: v.id("stockItems"),
    itemName: v.string(),
    type: stockMovementTypeValidator,
    qty: v.number(),
    unit: v.string(),
    date: v.string(),
    notes: v.string(),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    const movementId = await ctx.db.insert("stockMovements", args);
    // Update currentQty on the stockItem
    const item = await ctx.db.get(args.itemId);
    if (item) {
      let newQty = item.currentQty;
      if (args.type === "stock_in") newQty += args.qty;
      else newQty -= args.qty;
      const newStatus = newQty <= 0 ? "Critical" as const : newQty <= item.minQty ? "Low" as const : "Stable" as const;
      await ctx.db.patch(args.itemId, { currentQty: newQty, status: newStatus });
    }
    return movementId;
  },
});
