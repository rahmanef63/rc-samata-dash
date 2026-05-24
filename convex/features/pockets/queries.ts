import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import type { Id } from "../../_generated/dataModel";

export const listPockets = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, { activeOnly }) => {
    await requireAuth(ctx);
    if (activeOnly) {
      return await ctx.db
        .query("pockets")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .take(200);
    }
    return await ctx.db.query("pockets").take(200);
  },
});

export const getPocketById = query({
  args: { id: v.id("pockets") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    return await ctx.db.get(id);
  },
});

// Live balance per pocket — computed from transactions w/ pocketSourceId set.
// Plus a synthetic "untagged" bucket for legacy tx without pocketSourceId.
export const getPocketBalances = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    await requireAuth(ctx);

    const pockets = await ctx.db.query("pockets").take(200);
    const txs = await ctx.db.query("transactions").take(10000);

    const inRange = (dateStr: string): boolean => {
      if (startDate == null || endDate == null) return true;
      const t = Date.parse(dateStr);
      if (!Number.isFinite(t)) return false;
      return t >= startDate && t < endDate;
    };

    type Bucket = {
      pocketId: string | null;
      pocketName: string;
      pocketKind: string;
      bankAccount?: string;
      inflow: number;
      outflow: number;
      net: number;
      txCount: number;
      isActive: boolean;
    };

    const buckets = new Map<string, Bucket>();
    for (const p of pockets) {
      buckets.set(p._id, {
        pocketId: p._id,
        pocketName: p.name,
        pocketKind: p.kind,
        bankAccount: p.bankAccount,
        inflow: 0,
        outflow: 0,
        net: 0,
        txCount: 0,
        isActive: p.isActive,
      });
    }
    const UNTAGGED_KEY = "__untagged__";
    buckets.set(UNTAGGED_KEY, {
      pocketId: null,
      pocketName: "Belum di-tag pocket",
      pocketKind: "other",
      inflow: 0,
      outflow: 0,
      net: 0,
      txCount: 0,
      isActive: true,
    });

    for (const tx of txs) {
      if (!inRange(tx.date)) continue;
      const key = tx.pocketSourceId ?? UNTAGGED_KEY;
      const b = buckets.get(key);
      if (!b) continue; // pocket id ref to deleted pocket — skip
      const amt = tx.amount ?? 0;
      if (tx.direction === "in") b.inflow += amt;
      else if (tx.direction === "out") b.outflow += amt;
      b.txCount += 1;
    }

    for (const b of buckets.values()) {
      b.net = b.inflow - b.outflow;
    }

    const rows = Array.from(buckets.values())
      .filter((b) => b.txCount > 0 || (b.pocketId && b.isActive))
      .sort((a, b) => {
        // pockets first, then untagged
        if (a.pocketId && !b.pocketId) return -1;
        if (!a.pocketId && b.pocketId) return 1;
        return b.net - a.net;
      });

    const totals = rows.reduce(
      (acc, r) => ({
        inflow: acc.inflow + r.inflow,
        outflow: acc.outflow + r.outflow,
        net: acc.net + r.net,
        txCount: acc.txCount + r.txCount,
      }),
      { inflow: 0, outflow: 0, net: 0, txCount: 0 },
    );

    return { rows, totals };
  },
});

export const listPocketFlows = query({
  args: {
    pocketId: v.optional(v.id("pockets")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { pocketId, limit }) => {
    await requireAuth(ctx);
    const take = limit ?? 100;
    if (pocketId) {
      const fromFlows = await ctx.db
        .query("pocketFlows")
        .withIndex("by_from_date", (q) => q.eq("fromPocketId", pocketId as Id<"pockets">))
        .order("desc")
        .take(take);
      const toFlows = await ctx.db
        .query("pocketFlows")
        .withIndex("by_to_date", (q) => q.eq("toPocketId", pocketId as Id<"pockets">))
        .order("desc")
        .take(take);
      const merged = [...fromFlows, ...toFlows]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, take);
      return merged;
    }
    return await ctx.db.query("pocketFlows").order("desc").take(take);
  },
});
