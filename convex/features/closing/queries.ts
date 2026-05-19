import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

export const getClosingByDate = query({
  args: { branchId: v.id("branches"), businessDate: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("dailyClosings")
      .withIndex("by_branch_date", (q) => q.eq("branchId", args.branchId).eq("businessDate", args.businessDate))
      .unique();
  },
});

export const listClosings = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("dailyClosings")
      .withIndex("by_branch_date", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .take(30);
  },
});

export const listTransfers = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.query("ownerTransfers")
      .withIndex("by_branch", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .take(50);
  },
});

// ─── Payment receipts ───────────────────────────────────────

export const listPaymentReceipts = query({
  args: { branchId: v.id("branches"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const rows = await ctx.db.query("paymentReceipts")
      .withIndex("by_branch_date", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .take(args.limit ?? 100);
    return rows;
  },
});

export const getReceiptProofUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await requireAuth(ctx);
    return await ctx.storage.getUrl(storageId);
  },
});

export const listOpenPayables = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    const all = await ctx.db.query("payables")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .take(500);
    return all.filter((p) => p.status === "open" || p.status === "partial" || p.status === "overdue");
  },
});

// ─── Bank statement batches ─────────────────────────────────

export const listBankStatementBatches = query({
  args: {
    branchId: v.id("branches"),
    accountKind: v.optional(v.union(v.literal("owner"), v.literal("pic"))),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (args.accountKind) {
      return await ctx.db.query("bankStatementBatches")
        .withIndex("by_branch_account", (q) => q.eq("branchId", args.branchId).eq("accountKind", args.accountKind!))
        .order("desc")
        .take(50);
    }
    return await ctx.db.query("bankStatementBatches")
      .withIndex("by_branch_account", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .take(50);
  },
});

export const listBankStatementEntries = query({
  args: { batchId: v.id("bankStatementBatches") },
  handler: async (ctx, { batchId }) => {
    await requireAuth(ctx);
    return await ctx.db.query("bankStatementEntries")
      .withIndex("by_batch", (q) => q.eq("batchId", batchId))
      .take(2000);
  },
});
