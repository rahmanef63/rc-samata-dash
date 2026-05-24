import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";
import { pocketKindValidator, pocketFlowReasonValidator } from "./_schema";

export const createPocket = mutation({
  args: {
    name: v.string(),
    kind: pocketKindValidator,
    bankAccount: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    initialBalance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("pockets", {
      name: args.name,
      kind: args.kind,
      bankAccount: args.bankAccount,
      isActive: args.isActive ?? true,
      notes: args.notes,
      currentBalance: args.initialBalance ?? 0,
      createdAt: now,
    });
    await insertAuditLog(ctx, {
      entityType: "pockets",
      entityId: id,
      action: "create",
      description: `Pocket ${args.name} (${args.kind}) dibuat`,
      actedBy: userId,
    });
    return id;
  },
});

export const updatePocket = mutation({
  args: {
    id: v.id("pockets"),
    name: v.optional(v.string()),
    kind: v.optional(pocketKindValidator),
    bankAccount: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    currentBalance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const { id, ...patch } = args;
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
    await insertAuditLog(ctx, {
      entityType: "pockets",
      entityId: id,
      action: "update",
      description: `Pocket diupdate`,
      actedBy: userId,
    });
    return id;
  },
});

export const deletePocket = mutation({
  args: { id: v.id("pockets") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    // Soft delete via isActive=false to preserve historical FKs.
    await ctx.db.patch(id, { isActive: false, updatedAt: Date.now() });
    await insertAuditLog(ctx, {
      entityType: "pockets",
      entityId: id,
      action: "delete",
      description: `Pocket dinonaktifkan`,
      actedBy: userId,
    });
    return id;
  },
});

// Seed RC Samata defaults — idempotent (skips if name exists).
export const seedDefaultPockets = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.query("pockets").collect();
    const existingNames = new Set(existing.map((p) => p.name));
    const defaults: Array<{
      name: string;
      kind: "brankas" | "dompet_pic" | "rekening_owner" | "rekening_toko" | "petty_cash" | "owner_direct";
      bankAccount?: string;
      notes?: string;
    }> = [
      { name: "Brankas Toko", kind: "brankas", notes: "Kas fisik harian toko" },
      { name: "Dompet PIC", kind: "dompet_pic", notes: "Saldo pegang PIC operasional" },
      { name: "Petty Cash", kind: "petty_cash", notes: "Reimburse kecil harian" },
      { name: "Rekening Toko", kind: "rekening_toko", bankAccount: "BCA — atas nama toko", notes: "Rek operasional toko" },
      { name: "Rekening Owner BCA", kind: "rekening_owner", bankAccount: "BCA — pribadi owner", notes: "Setoran masuk owner" },
      { name: "Owner Direct", kind: "owner_direct", notes: "Pengeluaran langsung owner tanpa lewat brankas" },
    ];
    const now = Date.now();
    let inserted = 0;
    for (const p of defaults) {
      if (existingNames.has(p.name)) continue;
      await ctx.db.insert("pockets", {
        ...p,
        isActive: true,
        currentBalance: 0,
        createdAt: now,
      });
      inserted++;
    }
    if (inserted > 0) {
      await insertAuditLog(ctx, {
        entityType: "pockets",
        entityId: "seed",
        action: "create",
        description: `Seed ${inserted} default pocket(s)`,
        actedBy: userId,
      });
    }
    return { inserted, totalAfter: existing.length + inserted };
  },
});

// Manual flow record — UI transfer antar pocket atau koreksi.
export const createPocketFlow = mutation({
  args: {
    fromPocketId: v.optional(v.id("pockets")),
    toPocketId: v.optional(v.id("pockets")),
    amount: v.number(),
    date: v.string(),
    reason: pocketFlowReasonValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (!args.fromPocketId && !args.toPocketId) {
      throw new Error("pocketFlow harus punya minimal fromPocketId atau toPocketId");
    }
    if (args.amount <= 0) {
      throw new Error("amount harus > 0");
    }
    const id = await ctx.db.insert("pocketFlows", {
      ...args,
      createdAt: Date.now(),
      createdBy: userId,
    });
    // Update cached balance (best-effort — live computed value masih primary)
    if (args.fromPocketId) {
      const from = await ctx.db.get(args.fromPocketId);
      if (from) await ctx.db.patch(args.fromPocketId, { currentBalance: from.currentBalance - args.amount, updatedAt: Date.now() });
    }
    if (args.toPocketId) {
      const to = await ctx.db.get(args.toPocketId);
      if (to) await ctx.db.patch(args.toPocketId, { currentBalance: to.currentBalance + args.amount, updatedAt: Date.now() });
    }
    await insertAuditLog(ctx, {
      entityType: "pocketFlows",
      entityId: id,
      action: "create",
      description: `PocketFlow ${args.reason} Rp${args.amount.toLocaleString("id-ID")}`,
      actedBy: userId,
    });
    return id;
  },
});
