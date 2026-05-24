import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";
import { parseWaReport } from "./parser";

const TOLERANCE_RP = 5000;

// Determine match status by cross-checking vs xlsx daily summary.
function computeMatchStatus(
  waCash: number | undefined,
  waNonCash: number | undefined,
  xlsxGross: number | undefined,
): "match" | "diskrepansi" | "missing" | "unverified" {
  if (xlsxGross == null) return "unverified";
  if (waCash == null && waNonCash == null) return "missing";
  const waTotal = (waCash ?? 0) + (waNonCash ?? 0);
  if (Math.abs(waTotal - xlsxGross) <= TOLERANCE_RP) return "match";
  return "diskrepansi";
}

export const upsertWaReport = mutation({
  args: {
    rawText: v.string(),
    date: v.optional(v.string()),
    sender: v.optional(v.string()),
    salesCash: v.optional(v.number()),
    salesNonCash: v.optional(v.number()),
    expensesTotal: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (!args.rawText.trim()) throw new Error("rawText kosong");

    // Run parser if user didn't manually override
    const parsed = parseWaReport(args.rawText);
    const date = args.date ?? parsed.date;
    if (!date) throw new Error("Tanggal tidak terdeteksi — set manual");

    const sender = args.sender ?? parsed.sender ?? "Unknown SV";
    const salesCash = args.salesCash ?? parsed.salesCash;
    const salesNonCash = args.salesNonCash ?? parsed.salesNonCash;
    const expensesTotal = args.expensesTotal ?? parsed.expensesTotal;

    // Cross-check vs xlsx
    const matchedSummary = await ctx.db
      .query("dailyCashSummary")
      .withIndex("by_date", (q) => q.eq("businessDate", date))
      .first();
    const matchStatus = computeMatchStatus(salesCash, salesNonCash, matchedSummary?.grossSales);

    // Upsert by date+sender
    const existing = await ctx.db
      .query("waReportDaily")
      .withIndex("by_date", (q) => q.eq("date", date))
      .filter((q) => q.eq(q.field("sender"), sender))
      .first();

    const payload = {
      date,
      sender,
      rawText: args.rawText,
      salesCash,
      salesNonCash,
      expensesTotal,
      matchStatus,
      matchedReportId: matchedSummary?.reportId,
      notes: args.notes,
      parsedAt: Date.now(),
    };

    let id;
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      id = existing._id;
    } else {
      id = await ctx.db.insert("waReportDaily", payload);
    }

    // Insert online status if parser found channel data
    if (parsed.gofoodNet != null || parsed.grabNet != null || parsed.shopeeNet != null) {
      const existingOnline = await ctx.db
        .query("waOnlineDaily")
        .withIndex("by_date", (q) => q.eq("date", date))
        .first();
      const onlineMatch = (() => {
        if (!matchedSummary) return "unverified" as const;
        return "unverified" as const; // detailed channel cross-check is heavier; defer
      })();
      const onlinePayload = {
        date,
        rawText: args.rawText,
        gofoodNet: parsed.gofoodNet,
        grabNet: parsed.grabNet,
        shopeeNet: parsed.shopeeNet,
        matchStatus: onlineMatch,
        parsedAt: Date.now(),
      };
      if (existingOnline) await ctx.db.patch(existingOnline._id, onlinePayload);
      else await ctx.db.insert("waOnlineDaily", onlinePayload);
    }

    // Insert position info if parser found it
    if (parsed.posisi) {
      const existingPos = await ctx.db
        .query("waPositionDaily")
        .withIndex("by_date", (q) => q.eq("date", date))
        .filter((q) => q.eq(q.field("sender"), sender))
        .first();
      const posPayload = {
        date,
        sender,
        rawText: args.rawText,
        posisi: parsed.posisi,
        parsedAt: Date.now(),
      };
      if (existingPos) await ctx.db.patch(existingPos._id, posPayload);
      else await ctx.db.insert("waPositionDaily", posPayload);
    }

    await insertAuditLog(ctx, {
      entityType: "waReportDaily",
      entityId: id,
      action: existing ? "update" : "create",
      description: `WA report ${date} from ${sender} — ${matchStatus}`,
      actedBy: userId,
    });

    return { id, matchStatus, parseWarnings: parsed.parseWarnings };
  },
});

export const deleteWaReport = mutation({
  args: { id: v.id("waReportDaily") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const row = await ctx.db.get(id);
    if (!row) return;
    // Cascade delete waOnline + waPosition for same date+sender
    const online = await ctx.db
      .query("waOnlineDaily")
      .withIndex("by_date", (q) => q.eq("date", row.date))
      .collect();
    for (const o of online) await ctx.db.delete(o._id);
    const pos = await ctx.db
      .query("waPositionDaily")
      .withIndex("by_date", (q) => q.eq("date", row.date))
      .filter((q) => q.eq(q.field("sender"), row.sender))
      .collect();
    for (const p of pos) await ctx.db.delete(p._id);
    await ctx.db.delete(id);
    await insertAuditLog(ctx, {
      entityType: "waReportDaily",
      entityId: id,
      action: "delete",
      description: `WA report ${row.date} ${row.sender} dihapus`,
      actedBy: userId,
    });
  },
});

// Re-run cross-check for all WA reports — useful after backfill weeklyReports
export const recomputeAllMatchStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const reports = await ctx.db.query("waReportDaily").take(2000);
    const summaries = await ctx.db.query("dailyCashSummary").take(5000);
    const xlsxByDate = new Map<string, number>();
    for (const s of summaries) {
      if (!xlsxByDate.has(s.businessDate)) xlsxByDate.set(s.businessDate, s.grossSales);
    }
    let updated = 0;
    for (const r of reports) {
      const xlsxGross = xlsxByDate.get(r.date);
      const newStatus = computeMatchStatus(r.salesCash, r.salesNonCash, xlsxGross);
      if (newStatus !== r.matchStatus) {
        await ctx.db.patch(r._id, { matchStatus: newStatus });
        updated++;
      }
    }
    await insertAuditLog(ctx, {
      entityType: "waReportDaily",
      entityId: "recompute",
      action: "update",
      description: `Recompute matchStatus for ${reports.length} WA reports — ${updated} changed`,
      actedBy: userId,
    });
    return { total: reports.length, updated };
  },
});
