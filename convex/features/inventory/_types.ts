/**
 * Inventory feature types — stock status + movement kind.
 */
import { v } from "convex/values";

export const STOCK_STATUSES = ["Stable", "Low", "Critical"] as const;
export type StockStatus = typeof STOCK_STATUSES[number];
export const stockStatusValidator = v.union(
  v.literal("Stable"),
  v.literal("Low"),
  v.literal("Critical"),
);

export const STOCK_MOVEMENT_TYPES = ["stock_in", "usage", "adjustment", "waste"] as const;
export type StockMovementType = typeof STOCK_MOVEMENT_TYPES[number];
export const stockMovementTypeValidator = v.union(
  v.literal("stock_in"),
  v.literal("usage"),
  v.literal("adjustment"),
  v.literal("waste"),
);
