/**
 * Sales feature types — daily-sales settlement status.
 */
import { v } from "convex/values";

export const SALES_STATUSES = ["recorded", "settled", "pending_settlement"] as const;
export type SalesStatus = typeof SALES_STATUSES[number];
export const salesStatusValidator = v.union(
  v.literal("recorded"),
  v.literal("settled"),
  v.literal("pending_settlement"),
);
