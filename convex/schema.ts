import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Master Data ─────────────────────────────────────────
  branches: defineTable({
    code: v.string(),
    name: v.string(),
    location: v.string(),
    isActive: v.boolean(),
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
  }),

  // ─── Sales / Income ──────────────────────────────────────
  dailySales: defineTable({
    businessDate: v.string(),
    channelId: v.id("incomeChannels"),
    channelName: v.string(),
    grossAmount: v.number(),
    platformFee: v.number(),
    promoCost: v.number(),
    netAmount: v.number(),
    cashReceivedAmount: v.number(),
    settlementDate: v.optional(v.string()),
    referenceNo: v.string(),
    status: v.union(
      v.literal("recorded"),
      v.literal("settled"),
      v.literal("pending_settlement")
    ),
    branchId: v.id("branches"),
  })
    .index("by_branch_date", ["branchId", "businessDate"])
    .index("by_status", ["status"]),

  // ─── Expenses ────────────────────────────────────────────
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

  // ─── Payables (Piutang Vendor) ────────────────────────────
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

  // ─── Petty Cash ──────────────────────────────────────────
  pettyCashRequests: defineTable({
    requestDate: v.string(),
    requestedBy: v.string(),
    purposeCategory: v.string(),
    requestedAmount: v.number(),
    approvedAmount: v.number(),
    actualAmount: v.number(),
    status: v.union(
      v.literal("requested"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("disbursed"),
      v.literal("closed")
    ),
    notes: v.string(),
    hasAttachment: v.boolean(),
    branchId: v.id("branches"),
  })
    .index("by_branch", ["branchId"])
    .index("by_status", ["status"]),

  // ─── Daily Closing & Transfers ───────────────────────────
  dailyClosings: defineTable({
    businessDate: v.string(),
    openingCash: v.number(),
    cashSales: v.number(),
    nonCashSales: v.number(),
    expensesPaidCash: v.number(),
    expectedCash: v.number(),
    actualCash: v.number(),
    difference: v.number(),
    status: v.union(
      v.literal("open"),
      v.literal("submitted"),
      v.literal("verified")
    ),
    submittedBy: v.string(),
    submittedAt: v.string(),
    branchId: v.id("branches"),
  }).index("by_branch_date", ["branchId", "businessDate"]),

  ownerTransfers: defineTable({
    closingId: v.optional(v.id("dailyClosings")),
    transferDate: v.string(),
    direction: v.union(
      v.literal("branch_to_owner"),
      v.literal("owner_to_branch")
    ),
    purpose: v.union(
      v.literal("night_transfer"),
      v.literal("petty_cash_topup"),
      v.literal("payable_payment_fund"),
      v.literal("adjustment")
    ),
    amount: v.number(),
    referenceNo: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed")),
    branchId: v.id("branches"),
  }).index("by_branch", ["branchId"]),

  // ─── Inventory / Stock ───────────────────────────────────
  stockItems: defineTable({
    name: v.string(),
    currentQty: v.number(),
    unit: v.string(),
    minQty: v.number(),
    status: v.union(
      v.literal("Stable"),
      v.literal("Low"),
      v.literal("Critical")
    ),
    branchId: v.id("branches"),
  }).index("by_branch", ["branchId"]),

  stockMovements: defineTable({
    itemId: v.id("stockItems"),
    itemName: v.string(),
    type: v.union(
      v.literal("stock_in"),
      v.literal("usage"),
      v.literal("adjustment"),
      v.literal("waste")
    ),
    qty: v.number(),
    unit: v.string(),
    date: v.string(),
    notes: v.string(),
    branchId: v.id("branches"),
  }).index("by_branch_item", ["branchId", "itemId"]),

  // ─── Audit Trail ─────────────────────────────────────────
  auditLogs: defineTable({
    entityType: v.string(),
    entityId: v.string(),
    action: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete"),
      v.literal("approve"),
      v.literal("reject"),
      v.literal("pay")
    ),
    description: v.string(),
    actedBy: v.string(),
    actedAt: v.string(),
    branchId: v.id("branches"),
  }).index("by_branch", ["branchId"]),
});
