import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

const kindValidator = v.union(
  v.literal("weekly_sv"),
  v.literal("zia_multi"),
  v.literal("pergantian"),
  v.literal("tunjangan"),
  v.literal("payables_table"),
  v.literal("receipts_table"),
  v.literal("vendors_table"),
  v.literal("bank_statement"),
);

const statusValidator = v.union(
  v.literal("success"),
  v.literal("partial"),
  v.literal("error"),
);

const countsValidator = v.optional(v.object({
  pergantian: v.optional(v.number()),
  tunjangan: v.optional(v.number()),
  payables: v.optional(v.number()),
  receipts: v.optional(v.number()),
  vendors: v.optional(v.number()),
  sales: v.optional(v.number()),
  expense: v.optional(v.number()),
  hpp: v.optional(v.number()),
  cashFlow: v.optional(v.number()),
  inventory: v.optional(v.number()),
  vendor: v.optional(v.number()),
  leftover: v.optional(v.number()),
  kasPeriode: v.optional(v.number()),
  salesControl: v.optional(v.number()),
  creditPurchase: v.optional(v.number()),
  fcSummary: v.optional(v.number()),
  transfer: v.optional(v.number()),
  costAnalysis: v.optional(v.number()),
  ownerTransfer: v.optional(v.number()),
  incentive: v.optional(v.number()),
}));

export const recordUniversalUpload = mutation({
  args: {
    kind: kindValidator,
    fileName: v.string(),
    fileSize: v.number(),
    periodLabel: v.optional(v.string()),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    recordCount: v.number(),
    counts: countsValidator,
    warningCount: v.optional(v.number()),
    detectScore: v.optional(v.number()),
    weeklyReportId: v.optional(v.id("weeklyReports")),
    status: statusValidator,
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return await ctx.db.insert("universalUploads", {
      ...args,
      uploadedAt: Date.now(),
      uploadedBy: userId,
    });
  },
});

export const deleteUniversalUpload = mutation({
  args: { id: v.id("universalUploads") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    await ctx.db.delete(id);
  },
});
