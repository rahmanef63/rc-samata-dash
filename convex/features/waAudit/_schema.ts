/**
 * WhatsApp chat audit ingest — parses SV/SPV daily WA reports into
 * structured rows for cross-check vs weekly xlsx (Tier-2 source).
 *
 * Match status:
 *   - "match"        — WA value sama dengan xlsx
 *   - "diskrepansi"  — beda, perlu reconcile
 *   - "missing"      — xlsx tidak ada entry, WA punya (atau sebaliknya)
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const waMatchStatusValidator = v.union(
  v.literal("match"),
  v.literal("diskrepansi"),
  v.literal("missing"),
  v.literal("unverified"),
);

export const waAuditTables = {
  waReportDaily: defineTable({
    date: v.string(),                         // YYYY-MM-DD
    sender: v.string(),                       // SV / SPV name
    rawText: v.string(),                      // original WA message
    salesCash: v.optional(v.number()),
    salesNonCash: v.optional(v.number()),
    expensesTotal: v.optional(v.number()),
    matchStatus: waMatchStatusValidator,
    matchedReportId: v.optional(v.id("weeklyReports")),
    notes: v.optional(v.string()),
    parsedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_status", ["matchStatus"]),

  waPositionDaily: defineTable({
    date: v.string(),
    sender: v.string(),                       // pelapor harian
    rawText: v.string(),
    posisi: v.optional(v.string()),           // free-form: "Toko buka, SV cuti, dst"
    parsedAt: v.number(),
  }).index("by_date", ["date"]),

  waOnlineDaily: defineTable({
    date: v.string(),
    rawText: v.string(),
    gofoodNet: v.optional(v.number()),
    grabNet: v.optional(v.number()),
    shopeeNet: v.optional(v.number()),
    matchStatus: waMatchStatusValidator,
    parsedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_status", ["matchStatus"]),
};
