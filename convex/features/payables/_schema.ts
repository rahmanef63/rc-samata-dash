import { defineTable } from "convex/server";
import { v } from "convex/values";
import { etlSourceValidator } from "../../shared/validators";
import { payableStatusValidator, paymentMethodValidator } from "./_types";

export const payablesTables = {
  payables: defineTable({
    expenseId: v.optional(v.id("expenses")),
    vendorId: v.id("vendors"),
    vendorName: v.string(),
    invoiceDate: v.string(),
    dueDate: v.string(),
    amount: v.number(),
    paidAmount: v.number(),
    status: payableStatusValidator,
    description: v.string(),
    // Unified payment reference filled after AI reconciliation —
    // multiple bank statement entries sharing the same paymentReference
    // collectively pay this payable (split-payment / wrong-transfer retry).
    paymentReference: v.optional(v.string()),
    isValidated: v.optional(v.boolean()),
    // Source PDF/file that this invoice came from (e.g.
    // "00000945-Update piutang 8-14 April 2026 18.05.pdf"). Lets the
    // Riwayat table deep-link back to the original chat artifact.
    refPdfFile: v.optional(v.string()),
    // Source trace — mirror of transactions.sourceXxx so legacy rows
    // can be back-filled into transactions table without losing
    // provenance. New imports populate both.
    sourceFileName: v.optional(v.string()),
    sourceSheetName: v.optional(v.string()),
    sourceRowNumber: v.optional(v.number()),
    transactionId: v.optional(v.id("transactions")),  // bridge FK
    branchId: v.id("branches"),
    etlSource: etlSourceValidator,
    // Direct FK to the weekly report that produced this row, for cheap
    // cascade-delete via index.
    sourceReportId: v.optional(v.id("weeklyReports")),
  })
    .index("by_branch", ["branchId"])
    .index("by_vendor", ["vendorId"])
    .index("by_source_report", ["sourceReportId"]),

  payablePayments: defineTable({
    payableId: v.id("payables"),
    paymentDate: v.string(),
    amount: v.number(),
    method: paymentMethodValidator,
    referenceNo: v.string(),
  }).index("by_payable", ["payableId"]),
};
