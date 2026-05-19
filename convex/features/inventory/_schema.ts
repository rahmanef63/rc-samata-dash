import { defineTable } from "convex/server";
import { v } from "convex/values";
import { etlSourceValidator } from "../../shared/validators";

export const inventoryTables = {
  stockItems: defineTable({
    name: v.string(),
    currentQty: v.number(),
    unit: v.string(),
    minQty: v.number(),
    status: v.union(
      v.literal("Stable"),
      v.literal("Low"),
      v.literal("Critical")
    ),
    branchId: v.id("branches"),
    etlSource: etlSourceValidator,
  }).index("by_branch", ["branchId"]),

  stockMovements: defineTable({
    itemId: v.id("stockItems"),
    itemName: v.string(),
    type: v.union(
      v.literal("stock_in"),
      v.literal("usage"),
      v.literal("adjustment"),
      v.literal("waste")
    ),
    qty: v.number(),
    unit: v.string(),
    date: v.string(),
    notes: v.string(),
    branchId: v.id("branches"),
  }).index("by_branch_item", ["branchId", "itemId"]),
};
