import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { LIMITS } from "../../shared/limits";

const kindValidator = v.union(
  v.literal("invoice"),
  v.literal("payment"),
  v.literal("receipt"),
  v.literal("transfer"),
  v.literal("expense"),
  v.literal("anomaly"),
);

export const listTransactions = query({
  args: {
    branchId: v.id("branches"),
    kind: v.optional(kindValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { branchId, kind, limit }) => {
    await requireAuth(ctx);
    const cap = limit ?? 5000;
    if (kind) {
      return await ctx.db.query("transactions")
        .withIndex("by_branch_kind", (q) => q.eq("branchId", branchId).eq("kind", kind))
        .order("desc")
        .take(cap);
    }
    return await ctx.db.query("transactions")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .order("desc")
      .take(cap);
  },
});

export const countTransactions = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    const all = await ctx.db.query("transactions")
      .withIndex("by_branch_date", (q) => q.eq("branchId", branchId))
      .take(LIMITS.TX_PAGE);
    const counts: Record<string, number> = {
      invoice: 0, payment: 0, receipt: 0, transfer: 0, expense: 0, anomaly: 0,
    };
    for (const t of all) counts[t.kind] = (counts[t.kind] ?? 0) + 1;
    return { total: all.length, ...counts };
  },
});

export const getTransaction = query({
  args: { id: v.id("transactions") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    return await ctx.db.get(id);
  },
});

// Source-trace deep link: given a (sourceKind, sourceFileName,
// sourceSheetName, sourceRowNumber), find the row. Useful for "jump
// back to original sheet row" UI affordance.
export const findBySource = query({
  args: {
    sourceKind: v.union(
      v.literal("weekly_upload"),
      v.literal("statement_bank"),
      v.literal("laporan_pic_csv"),
      v.literal("bulk_import_csv"),
      v.literal("manual"),
      v.literal("system"),
    ),
    sourceFileName: v.string(),
    sourceSheetName: v.optional(v.string()),
    sourceRowNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const candidates = await ctx.db.query("transactions")
      .withIndex("by_source_file", (q) =>
        q.eq("sourceKind", args.sourceKind).eq("sourceFileName", args.sourceFileName),
      )
      .take(1000);
    return candidates.filter((c) =>
      (args.sourceSheetName === undefined || c.sourceSheetName === args.sourceSheetName) &&
      (args.sourceRowNumber === undefined || c.sourceRowNumber === args.sourceRowNumber),
    );
  },
});
