import { defineTable } from "convex/server";
import { v } from "convex/values";
import { etlSourceValidator } from "../../shared/validators";
import { expensePaymentSourceValidator, expenseStatusValidator } from "./_types";

export const expensesTables = {
  expenses: defineTable({
    expenseDate: v.string(),
    categoryId: v.id("expenseCategories"),
    categoryName: v.string(),
    vendorId: v.optional(v.id("vendors")),
    vendorName: v.optional(v.string()),
    amount: v.number(),
    description: v.string(),
    paymentSource: expensePaymentSourceValidator,
    status: expenseStatusValidator,
    hasAttachment: v.boolean(),
    branchId: v.id("branches"),
    etlSource: etlSourceValidator,
    // Direct FK to the weekly report that produced this row.
    // Lets `deleteWeeklyReport` cascade-purge derived expenses cheaply
    // via an index instead of scanning every row's nested etlSource.
    sourceReportId: v.optional(v.id("weeklyReports")),
    // Bridge FK ke Buku Besar (transactions) — mirror row di SSOT.
    // Cascade delete pakai field ini supaya tx ikut terhapus saat expense dihapus.
    transactionId: v.optional(v.id("transactions")),
  })
    .index("by_branch_date", ["branchId", "expenseDate"])
    .index("by_status", ["status"])
    .index("by_source_report", ["sourceReportId"]),

  expenseLineItems: defineTable({
    expenseId: v.id("expenses"),
    itemName: v.string(),
    qty: v.number(),
    unit: v.string(),
    unitPrice: v.number(),
    subtotal: v.number(),
  }).index("by_expense", ["expenseId"]),
};
