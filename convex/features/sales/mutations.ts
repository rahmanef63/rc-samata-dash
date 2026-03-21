import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    businessDate: v.string(),
    channelId: v.id("incomeChannels"),
    channelName: v.string(),
    grossAmount: v.number(),
    platformFee: v.number(),
    promoCost: v.number(),
    netAmount: v.number(),
    cashReceivedAmount: v.number(),
    settlementDate: v.optional(v.string()),
    referenceNo: v.string(),
    status: v.union(v.literal("recorded"), v.literal("settled"), v.literal("pending_settlement")),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("dailySales", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("dailySales"),
    businessDate: v.string(),
    channelId: v.id("incomeChannels"),
    channelName: v.string(),
    grossAmount: v.number(),
    platformFee: v.number(),
    promoCost: v.number(),
    netAmount: v.number(),
    cashReceivedAmount: v.number(),
    settlementDate: v.optional(v.string()),
    referenceNo: v.string(),
    status: v.union(v.literal("recorded"), v.literal("settled"), v.literal("pending_settlement")),
    branchId: v.id("branches"),
  },
  handler: async (ctx, { id, ...data }) => {
    await ctx.db.patch(id, data);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("dailySales") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});
