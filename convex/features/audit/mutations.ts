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
    branchId: v.id("branches"),
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

// Clear ALL audit logs scoped ke cabang (purge). Pakai by_branch index —
// paginate via take(2000) sampai habis untuk avoid OOM pada riwayat besar.
// Frontend role gating ensures only super_admin pencet ini.
export const clearByBranch = mutation({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    await requireAuth(ctx);
    let total = 0;
    while (true) {
      const batch = await ctx.db
        .query("auditLogs")
        .withIndex("by_branch", (q) => q.eq("branchId", branchId))
        .take(2000);
      if (batch.length === 0) break;
      for (const row of batch) await ctx.db.delete(row._id);
      total += batch.length;
      if (batch.length < 2000) break;
    }
    return { deleted: total };
  },
});
