import { defineTable } from "convex/server";
import { v } from "convex/values";
import { pettyCashCategoryValidator, pettyCashStatusValidator } from "./_types";

export const pettyCashTables = {
  pettyCashRequests: defineTable({
    requestDate: v.string(),
    requestedBy: v.string(),
    purposeCategory: pettyCashCategoryValidator,
    requestedAmount: v.number(),
    approvedAmount: v.number(),
    actualAmount: v.number(),
    status: pettyCashStatusValidator,
    notes: v.string(),
    hasAttachment: v.boolean(),
  }).index("by_status", ["status"]),

  /** BA Reimburse — bukti acara reimburse petty cash dari karyawan. */
  baReimburse: defineTable({
    date: v.string(),                              // YYYY-MM-DD
    submittedByStaffId: v.optional(v.id("staff")),
    purposeCategory: pettyCashCategoryValidator,
    amount: v.number(),
    description: v.string(),
    proofStorageId: v.optional(v.id("_storage")),
    proofFileName: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("paid"),
    ),
    transactionId: v.optional(v.id("transactions")),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_status_date", ["status", "date"])
    .index("by_staff_date", ["submittedByStaffId", "date"])
    .index("by_transaction", ["transactionId"]),
};
