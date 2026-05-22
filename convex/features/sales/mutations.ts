import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";
import { mirrorTx } from "../transactions/_helpers";

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
    const userId = await requireAuth(ctx);
    if (args.grossAmount < 0) throw new Error("grossAmount must be >= 0");
    if (args.platformFee < 0) throw new Error("platformFee must be >= 0");
    if (args.promoCost < 0) throw new Error("promoCost must be >= 0");
    if (args.netAmount < 0) throw new Error("netAmount must be >= 0");
    const id = await ctx.db.insert("dailySales", args);
    // Mirror ke Buku Besar SSOT — receipt kind (sales = income), direction=in.
    const txId = await mirrorTx(ctx, {
      branchId: args.branchId,
      kind: "receipt",
      direction: "in",
      date: args.businessDate,
      amount: args.netAmount,
      status: args.status,
      channelId: args.channelId,
      channelName: args.channelName,
      reference: args.referenceNo,
      description: `Penjualan ${args.channelName} ${args.businessDate}`,
      sourceKind: "manual",
      userId,
    });
    if (txId) await ctx.db.patch(id, { transactionId: txId });
    await insertAuditLog(ctx, {
      entityType: "dailySales", entityId: id, action: "create",
      description: `Created sale ${args.businessDate} - ${args.channelName}`,
      actedBy: userId, branchId: args.branchId,
    });
    return id;
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
    const userId = await requireAuth(ctx);
    if (data.grossAmount < 0) throw new Error("grossAmount must be >= 0");
    if (data.platformFee < 0) throw new Error("platformFee must be >= 0");
    if (data.promoCost < 0) throw new Error("promoCost must be >= 0");
    if (data.netAmount < 0) throw new Error("netAmount must be >= 0");
    await ctx.db.patch(id, data);
    await insertAuditLog(ctx, {
      entityType: "dailySales", entityId: id, action: "update",
      description: `Updated sale ${data.businessDate}`,
      actedBy: userId, branchId: data.branchId,
    });
    return id;
  },
});

// Partial patch — for per-cell edits from Notion view.
export const patch = mutation({
  args: {
    id: v.id("dailySales"),
    businessDate: v.optional(v.string()),
    grossAmount: v.optional(v.number()),
    platformFee: v.optional(v.number()),
    promoCost: v.optional(v.number()),
    netAmount: v.optional(v.number()),
    cashReceivedAmount: v.optional(v.number()),
    settlementDate: v.optional(v.string()),
    referenceNo: v.optional(v.string()),
    status: v.optional(v.union(v.literal("recorded"), v.literal("settled"), v.literal("pending_settlement"))),
  },
  handler: async (ctx, { id, ...data }) => {
    await requireAuth(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("dailySales not found");
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && v !== null) patch[k] = v;
    }
    if (Object.keys(patch).length > 0) await ctx.db.patch(id, patch);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("dailySales") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Record not found");
    await ctx.db.delete(args.id);
    await insertAuditLog(ctx, {
      entityType: "dailySales", entityId: args.id, action: "delete",
      description: `Deleted sale ${existing.businessDate}`,
      actedBy: userId, branchId: existing.branchId,
    });
    return null;
  },
});
