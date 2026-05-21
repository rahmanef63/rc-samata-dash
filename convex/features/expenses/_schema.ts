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
  })
    .index("by_branch_date", ["branchId", "expenseDate"])
    .index("by_status", ["status"]),

  expenseLineItems: defineTable({
    expenseId: v.id("expenses"),
    itemName: v.string(),
    qty: v.number(),
    unit: v.string(),
    unitPrice: v.number(),
    subtotal: v.number(),
  }).index("by_expense", ["expenseId"]),
};
