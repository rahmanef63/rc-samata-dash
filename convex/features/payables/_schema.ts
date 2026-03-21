import { defineTable } from "convex/server";
import { v } from "convex/values";

export const payablesTables = {
  payables: defineTable({
    expenseId: v.id("expenses"),
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
    branchId: v.id("branches"),
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
