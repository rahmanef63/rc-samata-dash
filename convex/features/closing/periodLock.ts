/**
 * Period lock — enforce no edits to past closed/locked periods.
 *
 * Status meanings:
 *   - open    : free to edit
 *   - locked  : block writes for non-superadmin (review phase)
 *   - closed  : block ALL writes (audited & sealed)
 *
 * Enforcement helper `assertPeriodOpen(ctx, date)` is called from
 * `upsertTransaction` + `mirrorTx`. Other mutations can opt-in.
 */
import { mutation, query, type MutationCtx } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth, requireRole } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";
import { accountingPeriodStatusValidator } from "./_schema";

/** Derive YYYY-MM key from any date string (YYYY-MM-DD or full ISO). */
export function yearMonthFromDate(date: string): string {
  if (date.length >= 7) return date.slice(0, 7);
  return new Date().toISOString().slice(0, 7); // fallback today
}

/** Throw if the period containing `date` is locked or closed. */
export async function assertPeriodOpen(
  ctx: MutationCtx,
  date: string,
): Promise<void> {
  const ym = yearMonthFromDate(date);
  const period = await ctx.db
    .query("accountingPeriods")
    .withIndex("by_yearMonth", (q) => q.eq("yearMonth", ym))
    .first();
  if (!period) return; // unset = open by default
  if (period.status === "locked") {
    throw new Error(`Periode ${ym} terkunci (locked) — buka dulu di /finance/periode sebelum edit.`);
  }
  if (period.status === "closed") {
    throw new Error(`Periode ${ym} sudah ditutup (closed) — tidak bisa diedit.`);
  }
}

// ─── Queries ───────────────────────────────────────────────────

export const listPeriods = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const rows = await ctx.db.query("accountingPeriods").take(200);
    return rows.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
  },
});

export const getPeriodForDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    await requireAuth(ctx);
    const ym = yearMonthFromDate(date);
    return await ctx.db
      .query("accountingPeriods")
      .withIndex("by_yearMonth", (q) => q.eq("yearMonth", ym))
      .first();
  },
});

// ─── Mutations ─────────────────────────────────────────────────

export const upsertPeriod = mutation({
  args: {
    yearMonth: v.string(),
    status: accountingPeriodStatusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireRole(ctx, ["owner", "super_admin"]);
    const existing = await ctx.db
      .query("accountingPeriods")
      .withIndex("by_yearMonth", (q) => q.eq("yearMonth", args.yearMonth))
      .first();
    const now = Date.now();
    const patch: Record<string, unknown> = {
      status: args.status,
      notes: args.notes,
    };
    if (args.status === "locked") {
      patch.lockedBy = userId;
      patch.lockedAt = now;
    }
    if (args.status === "closed") {
      patch.closedBy = userId;
      patch.closedAt = now;
    }
    if (args.status === "open") {
      patch.lockedBy = undefined;
      patch.lockedAt = undefined;
      patch.closedBy = undefined;
      patch.closedAt = undefined;
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      await insertAuditLog(ctx, {
        entityType: "accountingPeriods",
        entityId: existing._id,
        action: "update",
        description: `Periode ${args.yearMonth} → ${args.status}`,
        actedBy: userId,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("accountingPeriods", {
      yearMonth: args.yearMonth,
      status: args.status,
      lockedBy: args.status === "locked" ? userId : undefined,
      lockedAt: args.status === "locked" ? now : undefined,
      closedBy: args.status === "closed" ? userId : undefined,
      closedAt: args.status === "closed" ? now : undefined,
      notes: args.notes,
    });
    await insertAuditLog(ctx, {
      entityType: "accountingPeriods",
      entityId: id,
      action: "create",
      description: `Periode ${args.yearMonth} dibuat status=${args.status}`,
      actedBy: userId,
    });
    return id;
  },
});

export const deletePeriod = mutation({
  args: { id: v.id("accountingPeriods") },
  handler: async (ctx, { id }) => {
    const userId = await requireRole(ctx, ["owner", "super_admin"]);
    const row = await ctx.db.get(id);
    if (!row) return;
    if (row.status === "closed") {
      throw new Error("Periode closed tidak bisa dihapus");
    }
    await ctx.db.delete(id);
    await insertAuditLog(ctx, {
      entityType: "accountingPeriods",
      entityId: id,
      action: "delete",
      description: `Periode ${row.yearMonth} dihapus`,
      actedBy: userId,
    });
  },
});
