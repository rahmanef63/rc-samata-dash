import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";

export const saveDailyReportValidation = mutation({
  args: {
    businessDate: v.string(),
    kind: v.union(
      v.literal("transferOnline"),
      v.literal("dailySummary"),
      v.literal("monthlyTally"),
    ),
    rawText: v.string(),
    parsedJson: v.string(),
    expectedJson: v.string(),
    diffJson: v.string(),
    matchedAll: v.boolean(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const id = await ctx.db.insert("dailyReportValidations", {
      ...args,
      validatedBy: userId,
      validatedAt: Date.now(),
    });
    await insertAuditLog(ctx, {
      entityType: "dailyReportValidations", entityId: id, action: "create",
      description: `Validasi WA ${args.kind} ${args.businessDate} — ${args.matchedAll ? "MATCH" : "MISMATCH"}`,
      actedBy: userId,
    });
    return id;
  },
});

export const removeDailyReportValidation = mutation({
  args: { id: v.id("dailyReportValidations") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Validation not found");
    await ctx.db.delete(id);
    await insertAuditLog(ctx, {
      entityType: "dailyReportValidations", entityId: id, action: "delete",
      description: `Hapus validasi WA ${existing.kind} ${existing.businessDate}`,
      actedBy: userId,
    });
    return null;
  },
});
