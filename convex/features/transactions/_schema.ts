import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  txKindValidator,
  txDirectionValidator,
  sourceKindValidator,
} from "./_types";

// ─── Unified transactions table (SSOT) ──────────────────────
//
// One table — every cash-flow event (tagihan, bayar, setoran,
// transfer, expense, anomali) lives here. Existing fragmented tables
// (payables, paymentReceipts, ownerTransfers, dailyClosings,
// bankStatementEntries, expenses, productSales, vendorPurchases) keep
// receiving writes during the bridge period; new imports write to
// transactions in addition, and reads for the unified Buku Besar UI
// pull from here.
//
// Every row carries:
//   1. Strong FK to entity tables (branchId, vendorId, channelId,
//      categoryId, linkedTxId, parentTxId, sourceReportId).
//   2. Source trace (sourceKind + sourceFileName + sourceSheetName +
//      sourceRowNumber + sourceFileStorageId) so a row from a weekly
//      xlsx import can deep-link back to the exact row of the exact
//      sheet of the exact uploaded file.
//   3. Notion-style property bag (typed columns) so notion-shell
//      database UI can render cells without per-row schema lookups.

export const transactionsTables = {
  transactions: defineTable({
    // ─── Discriminator (literals SSOT in ./_types) ───────────
    kind: txKindValidator,
    direction: txDirectionValidator,

    // ─── Core fields ─────────────────────────────────────────
    branchId: v.id("branches"),
    date: v.string(),               // YYYY-MM-DD — business date
    amount: v.number(),             // always positive; direction tells sign
    paidAmount: v.optional(v.number()), // for invoices — accumulator
    status: v.optional(v.string()), // open/partial/paid/overdue/done/pending

    // ─── Relations (typed FK) ────────────────────────────────
    vendorId: v.optional(v.id("vendors")),
    channelId: v.optional(v.id("incomeChannels")),
    categoryId: v.optional(v.id("expenseCategories")),
    payableId: v.optional(v.id("payables")),         // legacy bridge — if mirrored
    receiptId: v.optional(v.id("paymentReceipts")),  // legacy bridge
    linkedTxId: v.optional(v.id("transactions")),    // payment → invoice
    parentTxId: v.optional(v.id("transactions")),    // split row → parent

    // ─── Counterparty (denormalized for search) ──────────────
    counterparty: v.optional(v.string()),  // vendor name OR owner OR employee

    // ─── Properties (notion-style) ───────────────────────────
    description: v.optional(v.string()),
    reference: v.optional(v.string()),     // no transaksi / faktur / VA
    bankAccount: v.optional(v.string()),
    channelName: v.optional(v.string()),   // human-readable channel
    paidBy: v.optional(v.string()),        // owner/pic/employee
    method: v.optional(v.string()),        // cash/transfer/atm/ewallet
    notes: v.optional(v.string()),
    anomalyFlag: v.optional(v.string()),

    // ─── Proof file ─────────────────────────────────────────
    proofFileName: v.optional(v.string()),
    proofStorageId: v.optional(v.id("_storage")),
    proofMimeType: v.optional(v.string()),

    // ─── Source trace ───────────────────────────────────────
    sourceKind: sourceKindValidator,
    sourceFileName: v.optional(v.string()),
    sourceFileStorageId: v.optional(v.id("_storage")),
    sourceSheetName: v.optional(v.string()),
    sourceRowNumber: v.optional(v.number()),       // 0-based in sheet
    sourceReportId: v.optional(v.id("weeklyReports")),

    // ─── Audit ──────────────────────────────────────────────
    createdBy: v.string(),
    createdAt: v.number(),
    updatedBy: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_branch_date", ["branchId", "date"])
    .index("by_branch_kind", ["branchId", "kind"])
    .index("by_vendor", ["vendorId"])
    .index("by_linked", ["linkedTxId"])
    .index("by_parent", ["parentTxId"])
    .index("by_source_report", ["sourceReportId"])
    .index("by_source_file", ["sourceKind", "sourceFileName"])
    .index("by_anomaly", ["branchId", "anomalyFlag"])
    .index("by_payable_bridge", ["payableId"])
    .index("by_receipt_bridge", ["receiptId"]),
};
