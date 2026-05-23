import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";
import { pettyCashCategoryValidator, pettyCashStatusValidator } from "./_types";

export const create = mutation({
  args: {
    requestDate: v.string(),
    requestedBy: v.string(),
    purposeCategory: pettyCashCategoryValidator,
    requestedAmount: v.number(),
    approvedAmount: v.number(),
    actualAmount: v.number(),
    status: pettyCashStatusValidator,
    notes: v.string(),
    hasAttachment: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (args.requestedAmount <= 0) throw new Error("requestedAmount must be > 0");
    const id = await ctx.db.insert("pettyCashRequests", args);
    await insertAuditLog(ctx, {
      entityType: "pettyCashRequests", entityId: id, action: "create",
      description: `Petty cash request Rp${args.requestedAmount} - ${args.purposeCategory}`,
      actedBy: userId,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("pettyCashRequests"),
    approvedAmount: v.optional(v.number()),
    actualAmount: v.optional(v.number()),
    status: v.optional(pettyCashStatusValidator),
    requestDate: v.optional(v.string()),
    requestedAmount: v.optional(v.number()),
    purposeCategory: v.optional(pettyCashCategoryValidator),
    hasAttachment: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...data }) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Petty cash request not found");
    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && val !== null) patch[key] = val;
    }
    await ctx.db.patch(id, patch);
    await insertAuditLog(ctx, {
      entityType: "pettyCashRequests", entityId: id, action: "update",
      description: `Updated petty cash request ${existing.purposeCategory}`,
      actedBy: userId,
    });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("pettyCashRequests") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Petty cash request not found");
    await ctx.db.delete(args.id);
    await insertAuditLog(ctx, {
      entityType: "pettyCashRequests", entityId: args.id, action: "delete",
      description: `Deleted petty cash request ${existing.purposeCategory}`,
      actedBy: userId,
    });
    return null;
  },
});
