import { defineTable } from "convex/server";
import { v } from "convex/values";

export const masterDataTables = {
  branches: defineTable({
    code: v.string(),
    name: v.string(),
    location: v.string(),
    isActive: v.boolean(),
    uploadedBy: v.optional(v.string()),
  }).index("by_code", ["code"]),

  vendors: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("food_supplier"),
      v.literal("utility"),
      v.literal("service"),
      v.literal("payroll"),
      v.literal("misc")
    ),
    phone: v.string(),
    notes: v.string(),
    isActive: v.boolean(),
    uploadedBy: v.optional(v.string()),
  }).index("by_active", ["isActive"]),

  incomeChannels: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("cash"),
      v.literal("transfer"),
      v.literal("gofood"),
      v.literal("grabfood"),
      v.literal("shopeefood"),
      v.literal("dine_in"),
      v.literal("take_away"),
      v.literal("other")
    ),
    isSettlementDelayed: v.boolean(),
    uploadedBy: v.optional(v.string()),
  }),

  expenseCategories: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("cogs"),
      v.literal("utility"),
      v.literal("salary_support"),
      v.literal("bpjs"),
      v.literal("maintenance"),
      v.literal("marketing"),
      v.literal("fee"),
      v.literal("other")
    ),
    uploadedBy: v.optional(v.string()),
  }),
};
