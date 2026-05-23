import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { auditActionValidator } from "../../shared/validators";
import { requireAuth } from "../../shared/auth";

export const create = mutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    action: auditActionValidator,
    description: v.string(),
    actedBy: v.string(),
    actedAt: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.insert("auditLogs", args);
  },
});

// Hapus 1 entry log.
export const remove = mutation({
  args: { id: v.id("auditLogs") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    await ctx.db.delete(id);
    return null;
  },
});

// Bulk delete by id list.
export const removeMany = mutation({
  args: { ids: v.array(v.id("auditLogs")) },
  handler: async (ctx, { ids }) => {
    await requireAuth(ctx);
    let deleted = 0;
    for (const id of ids) {
      try { await ctx.db.delete(id); deleted++; } catch { /* skip */ }
    }
    return { deleted };
  },
});

// Clear ALL audit logs (purge). Paginate via take(2000) sampai habis untuk
// avoid OOM pada riwayat besar. Frontend role gating ensures only super_admin
// pencet ini. Name preserved (`clearByBranch`) to keep frontend cascade stable.
export const clearByBranch = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    let total = 0;
    while (true) {
      const batch = await ctx.db
        .query("auditLogs")
        .withIndex("by_actedAt")
        .take(2000);
      if (batch.length === 0) break;
      for (const row of batch) await ctx.db.delete(row._id);
      total += batch.length;
      if (batch.length < 2000) break;
    }
    return { deleted: total };
  },
});
