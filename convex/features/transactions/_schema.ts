import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  txKindValidator,
  txDirectionValidator,
  sourceKindValidator,
} from "./_types";

export const sourceTierValidator = v.union(
  v.literal("csv_verified"),    // Tier 1
  v.literal("wa_chat"),         // Tier 2
  v.literal("weekly_xlsx"),     // Tier 3
  v.literal("photo_pdf"),       // Tier 4
  v.literal("manual"),
);

// ─── Unified transactions table (SSOT) ──────────────────────
//
// Every cash-flow event lives here. Single-tenant — no branchId.
// New FK additions (2026-05):
//   - pocketSourceId  → pockets       (mandatory once pockets migrated)
//   - paidByStaffId   → staff         (who paid out)
//   - receivedByStaffId → staff       (who received)
//   - sourceTier      → enum          (data quality hierarchy)
//
// Self-FK:
//   - linkedTxId  → payment → invoice
//   - parentTxId  → split row → parent

export const transactionsTables = {
  transactions: defineTable({
    kind: txKindValidator,
    direction: txDirectionValidator,

    date: v.string(),
    amount: v.number(),
    paidAmount: v.optional(v.number()),
    status: v.optional(v.string()),

    // Relations
    vendorId: v.optional(v.id("vendors")),
    channelId: v.optional(v.id("incomeChannels")),
    categoryId: v.optional(v.id("expenseCategories")),
    payableId: v.optional(v.id("payables")),
    receiptId: v.optional(v.id("paymentReceipts")),
    linkedTxId: v.optional(v.id("transactions")),
    parentTxId: v.optional(v.id("transactions")),

    // New FKs from JSON spec
    pocketSourceId: v.optional(v.id("pockets")),
    paidByStaffId: v.optional(v.id("staff")),
    receivedByStaffId: v.optional(v.id("staff")),
    sourceTier: v.optional(sourceTierValidator),

    counterparty: v.optional(v.string()),

    description: v.optional(v.string()),
    reference: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    channelName: v.optional(v.string()),
    pocketName: v.optional(v.string()),
    paidBy: v.optional(v.string()),
    method: v.optional(v.string()),
    notes: v.optional(v.string()),
    anomalyFlag: v.optional(v.string()),

    proofFileName: v.optional(v.string()),
    proofStorageId: v.optional(v.id("_storage")),
    proofMimeType: v.optional(v.string()),

    sourceKind: sourceKindValidator,
    sourceFileName: v.optional(v.string()),
    sourceFileStorageId: v.optional(v.id("_storage")),
    sourceSheetName: v.optional(v.string()),
    sourceRowNumber: v.optional(v.number()),
    sourceReportId: v.optional(v.id("weeklyReports")),

    createdBy: v.string(),
    createdAt: v.number(),
    updatedBy: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_date", ["date"])
    .index("by_kind", ["kind"])
    .index("by_kind_date", ["kind", "date"])
    .index("by_vendor", ["vendorId"])
    .index("by_pocket_date", ["pocketSourceId", "date"])
    .index("by_paid_by_staff", ["paidByStaffId"])
    .index("by_received_by_staff", ["receivedByStaffId"])
    .index("by_linked", ["linkedTxId"])
    .index("by_parent", ["parentTxId"])
    .index("by_source_report", ["sourceReportId"])
    .index("by_source_file", ["sourceKind", "sourceFileName"])
    .index("by_anomaly", ["anomalyFlag"])
    .index("by_payable_bridge", ["payableId"])
    .index("by_receipt_bridge", ["receiptId"]),
};
