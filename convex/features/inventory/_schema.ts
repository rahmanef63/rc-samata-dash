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
    branchId: v.id("branches"),
    etlSource: etlSourceValidator,
  }).index("by_branch", ["branchId"]),

  stockMovements: defineTable({
    itemId: v.id("stockItems"),
    itemName: v.string(),
    type: stockMovementTypeValidator,
    qty: v.number(),
    unit: v.string(),
    date: v.string(),
    notes: v.string(),
    branchId: v.id("branches"),
    etlSource: etlSourceValidator,
  }).index("by_branch_item", ["branchId", "itemId"]),
};
