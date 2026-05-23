import { defineTable } from "convex/server";
import { v } from "convex/values";
import { etlSourceValidator } from "../../shared/validators";
import { stockStatusValidator, stockMovementTypeValidator } from "./_types";

export const inventoryTables = {
  stockItems: defineTable({
    name: v.string(),
    currentQty: v.number(),
    unit: v.string(),
    minQty: v.number(),
    status: stockStatusValidator,
    etlSource: etlSourceValidator,
  }),

  stockMovements: defineTable({
    itemId: v.id("stockItems"),
    itemName: v.string(),
    type: stockMovementTypeValidator,
    qty: v.number(),
    unit: v.string(),
    date: v.string(),
    notes: v.string(),
    etlSource: etlSourceValidator,
  }).index("by_item_date", ["itemId", "date"]),

  /** Bahan baku transform → produk jadi (e.g. ayam mentah → ayam goreng). */
  inventoryTransformations: defineTable({
    date: v.string(),                          // YYYY-MM-DD
    bahanInput: v.string(),                    // loose: TODO link masterIngredients
    qtyInput: v.number(),
    unitInput: v.string(),
    produkOutput: v.string(),                  // loose: TODO link masterProducts/stockItems
    qtyOutput: v.number(),
    unitOutput: v.string(),
    yieldRatio: v.optional(v.number()),        // qtyOutput / qtyInput
    supervisorStaffId: v.optional(v.id("staff")),
    areaManagerStaffId: v.optional(v.id("staff")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_supervisor_date", ["supervisorStaffId", "date"]),
};
