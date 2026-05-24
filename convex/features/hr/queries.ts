import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

export const listStaff = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, { activeOnly }) => {
    await requireAuth(ctx);
    if (activeOnly) {
      return await ctx.db
        .query("staff")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .take(500);
    }
    return await ctx.db.query("staff").take(500);
  },
});

export const getStaffById = query({
  args: { id: v.id("staff") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    return await ctx.db.get(id);
  },
});

// Aggregated stats: count tx received/paid by staff, splLembur count, etc.
export const listStaffWithStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const [staff, txs] = await Promise.all([
      ctx.db.query("staff").take(500),
      ctx.db.query("transactions").take(10000),
    ]);

    type Stat = {
      _id: string;
      fullName: string;
      nickname?: string;
      role: string;
      phone?: string;
      isActive: boolean;
      hireDate?: string;
      txPaidCount: number;
      txReceivedCount: number;
      lastActivityDate?: string;
    };

    const statMap = new Map<string, Stat>();
    for (const s of staff) {
      statMap.set(s._id, {
        _id: s._id,
        fullName: s.fullName,
        nickname: s.nickname,
        role: s.role,
        phone: s.phone,
        isActive: s.isActive,
        hireDate: s.hireDate,
        txPaidCount: 0,
        txReceivedCount: 0,
      });
    }

    for (const tx of txs) {
      if (tx.paidByStaffId) {
        const st = statMap.get(tx.paidByStaffId);
        if (st) {
          st.txPaidCount += 1;
          if (!st.lastActivityDate || tx.date > st.lastActivityDate) st.lastActivityDate = tx.date;
        }
      }
      if (tx.receivedByStaffId) {
        const st = statMap.get(tx.receivedByStaffId);
        if (st) {
          st.txReceivedCount += 1;
          if (!st.lastActivityDate || tx.date > st.lastActivityDate) st.lastActivityDate = tx.date;
        }
      }
    }

    return Array.from(statMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
  },
});
