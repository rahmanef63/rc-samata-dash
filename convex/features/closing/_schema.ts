import { defineTable } from "convex/server";
import { v } from "convex/values";
import { etlSourceValidator } from "../../shared/validators";
import {
  closingStatusValidator,
  transferDirectionValidator,
  transferPurposeValidator,
  transferStatusValidator,
  accountKindValidator,
  bankCategoryValidator,
  aliasSourceValidator,
  logEntryTypeValidator,
  batchStatusValidator,
  anomalyFlagValidator,
  paidByValidator,
} from "./_types";

export const accountingPeriodStatusValidator = v.union(
  v.literal("open"),
  v.literal("locked"),
  v.literal("closed"),
);

export const closingTables = {
  dailyClosings: defineTable({
    businessDate: v.string(),
    openingCash: v.number(),
    cashSales: v.number(),
    nonCashSales: v.number(),
    expensesPaidCash: v.number(),
    expectedCash: v.number(),
    actualCash: v.number(),
    difference: v.number(),
    status: closingStatusValidator,
    submittedBy: v.string(),
    submittedAt: v.string(),
    etlSource: etlSourceValidator,
    sourceFileName: v.optional(v.string()),
    sourceSheetName: v.optional(v.string()),
    sourceRowNumber: v.optional(v.number()),
    transactionId: v.optional(v.id("transactions")),
    sourceReportId: v.optional(v.id("weeklyReports")),
  })
    .index("by_date", ["businessDate"])
    .index("by_source_report", ["sourceReportId"])
    .index("by_transaction", ["transactionId"]),

  ownerTransfers: defineTable({
    closingId: v.optional(v.id("dailyClosings")),
    transferDate: v.string(),
    direction: transferDirectionValidator,
    purpose: transferPurposeValidator,
    amount: v.number(),
    referenceNo: v.string(),
    status: transferStatusValidator,
    reportId: v.optional(v.id("weeklyReports")),
    description: v.optional(v.string()),
    sourceFileName: v.optional(v.string()),
    sourceSheetName: v.optional(v.string()),
    sourceRowNumber: v.optional(v.number()),
    transactionId: v.optional(v.id("transactions")),
    toPocketId: v.optional(v.id("pockets")),
  })
    .index("by_date", ["transferDate"])
    .index("by_report", ["reportId"])
    .index("by_transaction", ["transactionId"]),

  paymentReceipts: defineTable({
    payableId: v.optional(v.id("payables")),
    amount: v.number(),
    paidDate: v.string(),
    paidBy: paidByValidator,
    channel: v.optional(v.string()),
    reference: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    notes: v.optional(v.string()),
    proofStorageId: v.optional(v.id("_storage")),
    proofFileName: v.optional(v.string()),
    proofMimeType: v.optional(v.string()),
    sourceFileName: v.optional(v.string()),
    sourceSheetName: v.optional(v.string()),
    sourceRowNumber: v.optional(v.number()),
    transactionId: v.optional(v.id("transactions")),
    anomalyFlag: v.optional(anomalyFlagValidator),
    pocketId: v.optional(v.id("pockets")),
    uploadedAt: v.number(),
    uploadedBy: v.string(),
  })
    .index("by_date", ["paidDate"])
    .index("by_payable", ["payableId"])
    .index("by_anomaly", ["anomalyFlag"])
    .index("by_transaction", ["transactionId"]),

  bankStatementEntries: defineTable({
    accountKind: accountKindValidator,
    txDate: v.string(),
    description: v.string(),
    debit: v.number(),
    credit: v.number(),
    balance: v.number(),
    counterparty: v.optional(v.string()),
    channel: v.optional(v.string()),
    category: v.optional(bankCategoryValidator),
    payableId: v.optional(v.id("payables")),
    reportId: v.optional(v.id("weeklyReports")),
    paymentReference: v.optional(v.string()),
    isValidated: v.optional(v.boolean()),
    batchId: v.id("bankStatementBatches"),
    transactionId: v.optional(v.id("transactions")),
  })
    .index("by_date", ["txDate"])
    .index("by_batch", ["batchId"])
    .index("by_account_date", ["accountKind", "txDate"])
    .index("by_payable", ["payableId"])
    .index("by_transaction", ["transactionId"]),

  validationBatches: defineTable({
    fileName: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
    rowsApplied: v.number(),
    rowsRejected: v.number(),
    summary: v.optional(v.string()),
    uploadedAt: v.number(),
    uploadedBy: v.string(),
  }).index("by_uploadedAt", ["uploadedAt"]),

  vendorBankAliases: defineTable({
    vendorId: v.id("vendors"),
    alias: v.string(),
    accountNo: v.optional(v.string()),
    source: aliasSourceValidator,
    lastSeenAt: v.number(),
    seenCount: v.number(),
  })
    .index("by_alias", ["alias"])
    .index("by_vendor", ["vendorId"]),

  validationLogs: defineTable({
    entryType: logEntryTypeValidator,
    entryId: v.string(),
    batchId: v.id("validationBatches"),
    field: v.string(),
    beforeValue: v.optional(v.string()),
    afterValue: v.optional(v.string()),
    changedAt: v.number(),
  })
    .index("by_entry", ["entryType", "entryId"])
    .index("by_batch", ["batchId"]),

  bankStatementBatches: defineTable({
    accountKind: accountKindValidator,
    periodStart: v.string(),
    periodEnd: v.string(),
    fileName: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
    openingBalance: v.optional(v.number()),
    closingBalance: v.optional(v.number()),
    rowCount: v.number(),
    status: batchStatusValidator,
    uploadedAt: v.number(),
    uploadedBy: v.string(),
  }).index("by_account", ["accountKind"]),

  /** Period close — kunci mutasi bulan yang sudah final. */
  accountingPeriods: defineTable({
    yearMonth: v.string(),                                 // "2026-05"
    status: accountingPeriodStatusValidator,
    lockedBy: v.optional(v.string()),
    lockedAt: v.optional(v.number()),
    closedBy: v.optional(v.string()),
    closedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_yearMonth", ["yearMonth"])
    .index("by_status", ["status"]),
};
