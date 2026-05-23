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
    paymentReference: v.optional(v.string()),
    isValidated: v.optional(v.boolean()),
    refPdfFile: v.optional(v.string()),
    sourceFileName: v.optional(v.string()),
    sourceSheetName: v.optional(v.string()),
    sourceRowNumber: v.optional(v.number()),
    transactionId: v.optional(v.id("transactions")),
    etlSource: etlSourceValidator,
    sourceReportId: v.optional(v.id("weeklyReports")),
  })
    .index("by_vendor", ["vendorId"])
    .index("by_status", ["status"])
    .index("by_source_report", ["sourceReportId"])
    .index("by_transaction", ["transactionId"]),

  payablePayments: defineTable({
    payableId: v.id("payables"),
    paymentDate: v.string(),
    amount: v.number(),
    method: paymentMethodValidator,
    referenceNo: v.string(),
    transactionId: v.optional(v.id("transactions")),
  })
    .index("by_payable", ["payableId"])
    .index("by_transaction", ["transactionId"]),
};
