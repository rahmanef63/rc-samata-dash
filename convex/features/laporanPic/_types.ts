/**
 * Types for the laporan-pic feature (CSV ingestion of PIC payment
 * activity). `Classification` discriminates what each CSV row is
 * (a payable, a payment, an owner transfer, an anomaly). Shared
 * AnomalyFlag is re-exported for caller ergonomics.
 */
import { v } from "convex/values";

export { ANOMALY_FLAGS, anomalyFlagValidator, type AnomalyFlag } from "../../shared/financeEnums";

// ─── Row classification ───────────────────────────────────
export const CLASSIFICATIONS = [
  "payable", "receipt", "owner_transfer_to", "owner_transfer_from", "anomaly",
] as const;
export type Classification = typeof CLASSIFICATIONS[number];
export const classificationValidator = v.union(
  v.literal("payable"),
  v.literal("receipt"),
  v.literal("owner_transfer_to"),
  v.literal("owner_transfer_from"),
  v.literal("anomaly"),
);

// ─── Who paid (free-form on the PIC CSV side) ──────────────
export const PIC_PAID_BY = ["pic", "pic2", "vendor", "other"] as const;
export type PicPaidBy = typeof PIC_PAID_BY[number];
export const picPaidByValidator = v.union(
  v.literal("pic"),
  v.literal("pic2"),
  v.literal("vendor"),
  v.literal("other"),
);
