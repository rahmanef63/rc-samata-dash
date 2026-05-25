import { defineTable } from "convex/server";
import { v } from "convex/values";

// Riwayat upload via /upload (universal). Append-only audit untuk:
// - Verifikasi data ter-record semua (compare with audit per-report)
// - Filter / sort / search history
// - Drill-down ke laporan untuk kind = weekly_sv
//
// Tabel terpisah karena 7 kind menyebar ke 5+ tabel domain (weeklyReports,
// productChanges, employeeAllowances, payables, vendors). Tanpa tabel ini,
// rekonstruksi history harus aggregate query ke semua sumber — mahal +
// loss provenance untuk kind tanpa fileName tracking (vendors_table).

export const universalUploadsTables = {
  universalUploads: defineTable({
    kind: v.union(
      v.literal("weekly_sv"),
      v.literal("zia_multi"),
      v.literal("pergantian"),
      v.literal("tunjangan"),
      v.literal("payables_table"),
      v.literal("receipts_table"),
      v.literal("vendors_table"),
      v.literal("bank_statement"),
    ),
    fileName: v.string(),
    fileSize: v.number(),
    periodLabel: v.optional(v.string()),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    recordCount: v.number(),
    counts: v.optional(v.object({
      pergantian: v.optional(v.number()),
      tunjangan: v.optional(v.number()),
      payables: v.optional(v.number()),
      vendors: v.optional(v.number()),
      sales: v.optional(v.number()),
      expense: v.optional(v.number()),
      hpp: v.optional(v.number()),
      cashFlow: v.optional(v.number()),
      inventory: v.optional(v.number()),
      vendor: v.optional(v.number()),
      leftover: v.optional(v.number()),
      kasPeriode: v.optional(v.number()),
      salesControl: v.optional(v.number()),
      creditPurchase: v.optional(v.number()),
      fcSummary: v.optional(v.number()),
      transfer: v.optional(v.number()),
      costAnalysis: v.optional(v.number()),
      ownerTransfer: v.optional(v.number()),
      incentive: v.optional(v.number()),
    })),
    warningCount: v.optional(v.number()),
    detectScore: v.optional(v.number()),
    weeklyReportId: v.optional(v.id("weeklyReports")),
    status: v.union(
      v.literal("success"),
      v.literal("partial"),
      v.literal("error"),
    ),
    errorMessage: v.optional(v.string()),
    uploadedAt: v.number(),
    uploadedBy: v.optional(v.string()),
  })
    .index("by_uploadedAt", ["uploadedAt"])
    .index("by_kind_uploadedAt", ["kind", "uploadedAt"]),
};
