/**
 * Audit feature types — action enum for auditLogs.
 */
import { v } from "convex/values";

export const AUDIT_ACTIONS = [
  "create", "update", "delete", "approve", "reject", "pay",
] as const;
export type AuditAction = typeof AUDIT_ACTIONS[number];
export const auditActionValidator = v.union(
  v.literal("create"),
  v.literal("update"),
  v.literal("delete"),
  v.literal("approve"),
  v.literal("reject"),
  v.literal("pay"),
);
