import { defineTable } from "convex/server";
import { v } from "convex/values";

export const expensesTables = {
  expenses: defineTable({
    expenseDate: v.string(),
    categoryId: v.id("expenseCategories"),
    categoryName: v.string(),
    vendorId: v.optional(v.id("vendors")),
    vendorName: v.optional(v.string()),
    amount: v.number(),
    description: v.string(),
    paymentSource: v.union(
      v.literal("owner_direct"),
      v.literal("petty_cash"),
      v.literal("payable")
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("approved"),
      v.literal("paid"),
      v.literal("rejected")
    ),
    hasAttachment: v.boolean(),
    branchId: v.id("branches"),
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
