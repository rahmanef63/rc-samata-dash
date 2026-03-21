import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    requestDate: v.string(),
    requestedBy: v.string(),
    purposeCategory: v.string(),
    requestedAmount: v.number(),
    approvedAmount: v.number(),
    actualAmount: v.number(),
    status: v.union(v.literal("requested"), v.literal("approved"), v.literal("rejected"), v.literal("disbursed"), v.literal("closed")),
    notes: v.string(),
    hasAttachment: v.boolean(),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pettyCashRequests", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("pettyCashRequests"),
    approvedAmount: v.optional(v.number()),
    actualAmount: v.optional(v.number()),
    status: v.optional(v.union(v.literal("requested"), v.literal("approved"), v.literal("rejected"), v.literal("disbursed"), v.literal("closed"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...data }) => {
    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) patch[key] = val;
    }
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("pettyCashRequests") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});
