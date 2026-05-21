/**
 * Petty-cash feature types. Category labels are Indonesian and
 * project-specific (RC Samata workflow); other deployments swap
 * this module to localise.
 */
import { v } from "convex/values";

export const PETTY_CASH_CATEGORIES = [
  "Utilitas", "Bahan Baku", "Maintenance", "Transfer Owner", "Lain-lain",
] as const;
export type PettyCashCategory = typeof PETTY_CASH_CATEGORIES[number];
export const pettyCashCategoryValidator = v.union(
  v.literal("Utilitas"),
  v.literal("Bahan Baku"),
  v.literal("Maintenance"),
  v.literal("Transfer Owner"),
  v.literal("Lain-lain"),
);

export const PETTY_CASH_STATUSES = ["requested", "approved", "rejected", "disbursed", "closed"] as const;
export type PettyCashStatus = typeof PETTY_CASH_STATUSES[number];
export const pettyCashStatusValidator = v.union(
  v.literal("requested"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("disbursed"),
  v.literal("closed"),
);
