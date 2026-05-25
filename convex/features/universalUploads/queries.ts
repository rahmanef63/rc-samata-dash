import { query } from "../../_generated/server";
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

export const listUniversalUploads = query({
  args: {
    kind: v.optional(kindValidator),
    status: v.optional(statusValidator),
    fromDate: v.optional(v.number()),
    toDate: v.optional(v.number()),
    search: v.optional(v.string()),
    sortBy: v.optional(v.union(
      v.literal("uploadedAt"),
      v.literal("fileName"),
      v.literal("recordCount"),
      v.literal("warningCount"),
    )),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const cap = Math.min(Math.max(args.limit ?? 200, 1), 1000);

    // Use kind index when kind filter present, otherwise by_uploadedAt.
    // Pull up to 2x cap before filter to leave headroom after JS filter.
    const fetchBatch = cap * 2;
    let rows = args.kind
      ? await ctx.db.query("universalUploads")
          .withIndex("by_kind_uploadedAt", (q) => q.eq("kind", args.kind!))
          .order("desc")
          .take(fetchBatch)
      : await ctx.db.query("universalUploads")
          .withIndex("by_uploadedAt")
          .order("desc")
          .take(fetchBatch);

    // Apply remaining filters in JS
    if (args.status) {
      rows = rows.filter((r) => r.status === args.status);
    }
    if (args.fromDate !== undefined) {
      rows = rows.filter((r) => r.uploadedAt >= args.fromDate!);
    }
    if (args.toDate !== undefined) {
      rows = rows.filter((r) => r.uploadedAt <= args.toDate!);
    }
    if (args.search) {
      const needle = args.search.toLowerCase();
      rows = rows.filter((r) =>
        r.fileName.toLowerCase().includes(needle) ||
        (r.periodLabel ?? "").toLowerCase().includes(needle) ||
        (r.periodStart ?? "").toLowerCase().includes(needle) ||
        (r.periodEnd ?? "").toLowerCase().includes(needle)
      );
    }

    // Sort
    const sortBy = args.sortBy ?? "uploadedAt";
    const sortOrder = args.sortOrder ?? "desc";
    rows.sort((a, b) => {
      const av = (a[sortBy] ?? 0) as number | string;
      const bv = (b[sortBy] ?? 0) as number | string;
      let cmp = 0;
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv);
      } else {
        cmp = (av as number) - (bv as number);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return rows.slice(0, cap);
  },
});

export const getUniversalUploadStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const recent = await ctx.db.query("universalUploads")
      .withIndex("by_uploadedAt")
      .order("desc")
      .take(500);
    const byKind: Record<string, number> = {};
    const byStatus: Record<string, number> = { success: 0, partial: 0, error: 0 };
    let totalRecords = 0;
    let totalWarnings = 0;
    for (const r of recent) {
      byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      totalRecords += r.recordCount;
      totalWarnings += r.warningCount ?? 0;
    }
    return {
      total: recent.length,
      byKind, byStatus,
      totalRecords, totalWarnings,
      lastUploadAt: recent[0]?.uploadedAt ?? null,
    };
  },
});
