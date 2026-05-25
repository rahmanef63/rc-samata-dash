import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import type { Id } from "../../_generated/dataModel";

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

type FileKind = "weekly_sv" | "zia_multi" | "pergantian" | "tunjangan" |
  "payables_table" | "receipts_table" | "vendors_table" | "bank_statement";
type UploadStatus = "success" | "partial" | "error";

export type HistoryEntry = {
  _id: string;                // native id OR synthetic "legacy:<table>:<id_or_key>"
  isLegacy: boolean;          // true = synthesized from domain tables, no DB record to delete
  kind: FileKind;
  fileName: string;
  fileSize: number;           // 0 if legacy (not tracked)
  periodLabel?: string;
  periodStart?: string;
  periodEnd?: string;
  recordCount: number;
  counts?: Record<string, number | undefined>;
  warningCount?: number;
  detectScore?: number;
  weeklyReportId?: Id<"weeklyReports">;
  status: UploadStatus;
  errorMessage?: string;
  uploadedAt: number;
  uploadedBy?: string;
};

function keyOf(kind: FileKind, fileName: string, periodStart?: string, periodEnd?: string, periodLabel?: string): string {
  const period = periodLabel ?? `${periodStart ?? ""}::${periodEnd ?? ""}`;
  return `${kind}::${fileName.toLowerCase()}::${period.toLowerCase()}`;
}

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
    includeLegacy: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const cap = Math.min(Math.max(args.limit ?? 200, 1), 1000);
    const includeLegacy = args.includeLegacy ?? true;

    // ── 1. Native universalUploads ─────────────────────────
    const native = args.kind
      ? await ctx.db.query("universalUploads")
          .withIndex("by_kind_uploadedAt", (q) => q.eq("kind", args.kind!))
          .order("desc")
          .take(500)
      : await ctx.db.query("universalUploads")
          .withIndex("by_uploadedAt")
          .order("desc")
          .take(500);

    const nativeEntries: HistoryEntry[] = native.map((r) => ({
      _id: r._id,
      isLegacy: false,
      kind: r.kind,
      fileName: r.fileName,
      fileSize: r.fileSize,
      periodLabel: r.periodLabel,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      recordCount: r.recordCount,
      counts: r.counts as Record<string, number | undefined> | undefined,
      warningCount: r.warningCount,
      detectScore: r.detectScore,
      weeklyReportId: r.weeklyReportId,
      status: r.status,
      errorMessage: r.errorMessage,
      uploadedAt: r.uploadedAt,
      uploadedBy: r.uploadedBy,
    }));

    const nativeKeys = new Set(nativeEntries.map((e) =>
      keyOf(e.kind, e.fileName, e.periodStart, e.periodEnd, e.periodLabel),
    ));

    // ── 2. Legacy synthesis (when allowed by filter) ───────
    const legacyEntries: HistoryEntry[] = [];

    if (includeLegacy) {
      // weeklyReports → kind="weekly_sv"
      if (!args.kind || args.kind === "weekly_sv") {
        const weeklyRows = await ctx.db.query("weeklyReports")
          .withIndex("by_uploadedAt")
          .order("desc")
          .take(500);
        for (const r of weeklyRows) {
          const key = keyOf("weekly_sv", r.fileName, r.periodStart, r.periodEnd);
          if (nativeKeys.has(key)) continue;
          const counts = {
            expense: r.expenseCount, sales: r.salesCount, vendor: r.vendorCount,
            inventory: r.inventoryCount, leftover: r.leftoverCount,
            kasPeriode: r.kasPeriodeCount, salesControl: r.salesControlCount,
            creditPurchase: r.creditPurchaseCount, fcSummary: r.foodCostSummaryCount,
            transfer: r.transferCount, hpp: r.hppCount,
            costAnalysis: r.costAnalysisCount, cashFlow: r.cashFlowCount,
            incentive: r.incentiveCount,
          };
          const recordCount = Object.values(counts).reduce<number>((s, n) => s + (n ?? 0), 0);
          legacyEntries.push({
            _id: `legacy:weekly:${r._id}`,
            isLegacy: true,
            kind: "weekly_sv",
            fileName: r.fileName,
            fileSize: 0,
            periodStart: r.periodStart,
            periodEnd: r.periodEnd,
            recordCount,
            counts,
            warningCount: (r.validationNotes ?? []).length,
            weeklyReportId: r._id,
            status: r.status === "processed" ? "success"
              : r.status === "error" ? "error" : "partial",
            uploadedAt: r.uploadedAt,
            uploadedBy: r.uploadedBy,
          });
        }
      }

      // productChanges → kind="pergantian" (group by fileName+periodLabel)
      if (!args.kind || args.kind === "pergantian") {
        const pcRows = await ctx.db.query("productChanges").take(5000);
        type PcGroup = {
          fileName: string; periodLabel: string;
          count: number; lastUploadAt: number; totalPrice: number;
        };
        const groups = new Map<string, PcGroup>();
        for (const r of pcRows) {
          const k = `${r.fileName}::${r.periodLabel}`;
          const g = groups.get(k) ?? {
            fileName: r.fileName, periodLabel: r.periodLabel,
            count: 0, lastUploadAt: 0, totalPrice: 0,
          };
          g.count++;
          g.totalPrice += r.totalPrice;
          g.lastUploadAt = Math.max(g.lastUploadAt, r.uploadedAt ?? r._creationTime);
          groups.set(k, g);
        }
        for (const g of groups.values()) {
          const key = keyOf("pergantian", g.fileName, undefined, undefined, g.periodLabel);
          if (nativeKeys.has(key)) continue;
          legacyEntries.push({
            _id: `legacy:pergantian:${g.fileName}::${g.periodLabel}`,
            isLegacy: true,
            kind: "pergantian",
            fileName: g.fileName,
            fileSize: 0,
            periodLabel: g.periodLabel,
            recordCount: g.count,
            counts: { pergantian: g.count },
            status: "success",
            uploadedAt: g.lastUploadAt,
          });
        }
      }

      // employeeAllowances → kind="tunjangan"
      if (!args.kind || args.kind === "tunjangan") {
        const eaRows = await ctx.db.query("employeeAllowances").take(5000);
        type EaGroup = {
          fileName: string; periodLabel: string;
          count: number; lastUploadAt: number;
        };
        const groups = new Map<string, EaGroup>();
        for (const r of eaRows) {
          const k = `${r.fileName}::${r.periodLabel}`;
          const g = groups.get(k) ?? {
            fileName: r.fileName, periodLabel: r.periodLabel,
            count: 0, lastUploadAt: 0,
          };
          g.count++;
          g.lastUploadAt = Math.max(g.lastUploadAt, r.uploadedAt ?? r._creationTime);
          groups.set(k, g);
        }
        for (const g of groups.values()) {
          const key = keyOf("tunjangan", g.fileName, undefined, undefined, g.periodLabel);
          if (nativeKeys.has(key)) continue;
          legacyEntries.push({
            _id: `legacy:tunjangan:${g.fileName}::${g.periodLabel}`,
            isLegacy: true,
            kind: "tunjangan",
            fileName: g.fileName,
            fileSize: 0,
            periodLabel: g.periodLabel,
            recordCount: g.count,
            counts: { tunjangan: g.count },
            status: "success",
            uploadedAt: g.lastUploadAt,
          });
        }
      }
    }

    // ── 3. Merge + filter + sort ──────────────────────────
    let merged: HistoryEntry[] = [...nativeEntries, ...legacyEntries];

    if (args.status) merged = merged.filter((r) => r.status === args.status);
    if (args.fromDate !== undefined) merged = merged.filter((r) => r.uploadedAt >= args.fromDate!);
    if (args.toDate !== undefined) merged = merged.filter((r) => r.uploadedAt <= args.toDate!);
    if (args.search) {
      const needle = args.search.toLowerCase();
      merged = merged.filter((r) =>
        r.fileName.toLowerCase().includes(needle) ||
        (r.periodLabel ?? "").toLowerCase().includes(needle) ||
        (r.periodStart ?? "").toLowerCase().includes(needle) ||
        (r.periodEnd ?? "").toLowerCase().includes(needle)
      );
    }

    const sortBy = args.sortBy ?? "uploadedAt";
    const sortOrder = args.sortOrder ?? "desc";
    merged.sort((a, b) => {
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

    return merged.slice(0, cap);
  },
});

export const getUniversalUploadStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    // Sample native + legacy heads to compute combined stats.
    const native = await ctx.db.query("universalUploads")
      .withIndex("by_uploadedAt")
      .order("desc")
      .take(500);
    const weekly = await ctx.db.query("weeklyReports")
      .withIndex("by_uploadedAt")
      .order("desc")
      .take(500);
    const pcRows = await ctx.db.query("productChanges").take(5000);
    const eaRows = await ctx.db.query("employeeAllowances").take(5000);

    const byKind: Record<string, number> = {};
    const byStatus: Record<string, number> = { success: 0, partial: 0, error: 0 };
    let totalRecords = 0;
    let totalWarnings = 0;
    let lastUploadAt = 0;

    const nativeKeys = new Set<string>();
    for (const r of native) {
      const k = keyOf(r.kind, r.fileName, r.periodStart, r.periodEnd, r.periodLabel);
      nativeKeys.add(k);
      byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      totalRecords += r.recordCount;
      totalWarnings += r.warningCount ?? 0;
      if (r.uploadedAt > lastUploadAt) lastUploadAt = r.uploadedAt;
    }

    for (const r of weekly) {
      const k = keyOf("weekly_sv", r.fileName, r.periodStart, r.periodEnd);
      if (nativeKeys.has(k)) continue;
      byKind["weekly_sv"] = (byKind["weekly_sv"] ?? 0) + 1;
      const stat = r.status === "processed" ? "success" : r.status === "error" ? "error" : "partial";
      byStatus[stat] = (byStatus[stat] ?? 0) + 1;
      totalRecords += (r.expenseCount ?? 0) + (r.salesCount ?? 0) + (r.vendorCount ?? 0) +
        (r.inventoryCount ?? 0) + (r.leftoverCount ?? 0) + (r.kasPeriodeCount ?? 0) +
        (r.salesControlCount ?? 0) + (r.creditPurchaseCount ?? 0) + (r.foodCostSummaryCount ?? 0) +
        (r.transferCount ?? 0) + (r.hppCount ?? 0) + (r.costAnalysisCount ?? 0) +
        (r.cashFlowCount ?? 0) + (r.incentiveCount ?? 0);
      totalWarnings += (r.validationNotes ?? []).length;
      if (r.uploadedAt > lastUploadAt) lastUploadAt = r.uploadedAt;
    }

    const pcGroups = new Map<string, { count: number; lastUploadAt: number; fileName: string; periodLabel: string }>();
    for (const r of pcRows) {
      const k = `${r.fileName}::${r.periodLabel}`;
      const g = pcGroups.get(k) ?? { count: 0, lastUploadAt: 0, fileName: r.fileName, periodLabel: r.periodLabel };
      g.count++;
      g.lastUploadAt = Math.max(g.lastUploadAt, r.uploadedAt ?? r._creationTime);
      pcGroups.set(k, g);
    }
    for (const g of pcGroups.values()) {
      const k = keyOf("pergantian", g.fileName, undefined, undefined, g.periodLabel);
      if (nativeKeys.has(k)) continue;
      byKind["pergantian"] = (byKind["pergantian"] ?? 0) + 1;
      byStatus["success"] = (byStatus["success"] ?? 0) + 1;
      totalRecords += g.count;
      if (g.lastUploadAt > lastUploadAt) lastUploadAt = g.lastUploadAt;
    }

    const eaGroups = new Map<string, { count: number; lastUploadAt: number; fileName: string; periodLabel: string }>();
    for (const r of eaRows) {
      const k = `${r.fileName}::${r.periodLabel}`;
      const g = eaGroups.get(k) ?? { count: 0, lastUploadAt: 0, fileName: r.fileName, periodLabel: r.periodLabel };
      g.count++;
      g.lastUploadAt = Math.max(g.lastUploadAt, r.uploadedAt ?? r._creationTime);
      eaGroups.set(k, g);
    }
    for (const g of eaGroups.values()) {
      const k = keyOf("tunjangan", g.fileName, undefined, undefined, g.periodLabel);
      if (nativeKeys.has(k)) continue;
      byKind["tunjangan"] = (byKind["tunjangan"] ?? 0) + 1;
      byStatus["success"] = (byStatus["success"] ?? 0) + 1;
      totalRecords += g.count;
      if (g.lastUploadAt > lastUploadAt) lastUploadAt = g.lastUploadAt;
    }

    const total = Object.values(byKind).reduce((s, n) => s + n, 0);
    return {
      total, byKind, byStatus, totalRecords, totalWarnings,
      lastUploadAt: lastUploadAt || null,
    };
  },
});
