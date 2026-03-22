import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { stockStatusValidator, stockMovementTypeValidator } from "../../shared/validators";
import { requireAuth } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";

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
    const userId = await requireAuth(ctx);
    if (args.currentQty < 0) throw new Error("currentQty must be >= 0");
    if (args.minQty < 0) throw new Error("minQty must be >= 0");
    const id = await ctx.db.insert("stockItems", args);
    await insertAuditLog(ctx, {
      entityType: "stockItems", entityId: id, action: "create",
      description: `Created stock item ${args.name} (${args.currentQty} ${args.unit})`,
      actedBy: userId, branchId: args.branchId,
    });
    return id;
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
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Stock item not found");
    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) patch[key] = val;
    }
    await ctx.db.patch(id, patch);
    await insertAuditLog(ctx, {
      entityType: "stockItems", entityId: id, action: "update",
      description: `Updated stock item ${existing.name}`,
      actedBy: userId, branchId: existing.branchId,
    });
    return id;
  },
});

export const deleteItem = mutation({
  args: { id: v.id("stockItems") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Stock item not found");
    // Cascade delete movements
    const movements = await ctx.db
      .query("stockMovements")
      .withIndex("by_branch_item", (q) => q.eq("branchId", item.branchId).eq("itemId", args.id))
      .collect();
    for (const m of movements) {
      await ctx.db.delete(m._id);
    }
    await ctx.db.delete(args.id);
    await insertAuditLog(ctx, {
      entityType: "stockItems", entityId: args.id, action: "delete",
      description: `Deleted stock item ${item.name} (${movements.length} movements)`,
      actedBy: userId, branchId: item.branchId,
    });
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
    const userId = await requireAuth(ctx);
    if (args.qty <= 0) throw new Error("qty must be > 0");
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Stock item not found");
    let newQty = item.currentQty;
    if (args.type === "stock_in") newQty += args.qty;
    else newQty -= args.qty;
    if (newQty < 0) throw new Error("Insufficient stock for this movement");
    const newStatus = newQty <= 0 ? "Critical" as const : newQty <= item.minQty ? "Low" as const : "Stable" as const;
    const movementId = await ctx.db.insert("stockMovements", args);
    await ctx.db.patch(args.itemId, { currentQty: newQty, status: newStatus });
    await insertAuditLog(ctx, {
      entityType: "stockMovements", entityId: movementId, action: "create",
      description: `${args.type} ${args.qty} ${args.unit} of ${args.itemName}`,
      actedBy: userId, branchId: args.branchId,
    });
    return movementId;
  },
});
