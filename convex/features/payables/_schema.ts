import { defineTable } from "convex/server";
import { v } from "convex/values";
import { etlSourceValidator } from "../../shared/validators";

export const payablesTables = {
  payables: defineTable({
    expenseId: v.optional(v.id("expenses")),
    vendorId: v.id("vendors"),
    vendorName: v.string(),
    invoiceDate: v.string(),
    dueDate: v.string(),
    amount: v.number(),
    paidAmount: v.number(),
    status: v.union(
      v.literal("open"),
      v.literal("partial"),
      v.literal("paid"),
      v.literal("overdue")
    ),
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
    branchId: v.id("branches"),
    etlSource: etlSourceValidator,
  })
    .index("by_branch", ["branchId"])
    .index("by_vendor", ["vendorId"]),

  payablePayments: defineTable({
    payableId: v.id("payables"),
    paymentDate: v.string(),
    amount: v.number(),
    method: v.union(v.literal("cash"), v.literal("transfer")),
    referenceNo: v.string(),
  }).index("by_payable", ["payableId"]),
};
