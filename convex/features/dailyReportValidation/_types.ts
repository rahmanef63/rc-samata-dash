/**
 * Daily-report-validation feature types — kind of WhatsApp report
 * paste being validated.
 */
import { v } from "convex/values";

export const DAILY_REPORT_KINDS = ["transferOnline", "dailySummary", "monthlyTally"] as const;
export type DailyReportKind = typeof DAILY_REPORT_KINDS[number];
export const dailyReportKindValidator = v.union(
  v.literal("transferOnline"),
  v.literal("dailySummary"),
  v.literal("monthlyTally"),
);
