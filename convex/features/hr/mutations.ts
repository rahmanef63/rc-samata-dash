import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";
import { staffRoleValidator } from "./_schema";

export const createStaff = mutation({
  args: {
    fullName: v.string(),
    nickname: v.optional(v.string()),
    role: staffRoleValidator,
    phone: v.optional(v.string()),
    hireDate: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    userId: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const id = await ctx.db.insert("staff", {
      fullName: args.fullName,
      nickname: args.nickname,
      role: args.role,
      phone: args.phone,
      hireDate: args.hireDate,
      isActive: args.isActive ?? true,
      userId: args.userId,
      notes: args.notes,
      createdAt: Date.now(),
    });
    await insertAuditLog(ctx, {
      entityType: "staff",
      entityId: id,
      action: "create",
      description: `Staff ${args.fullName} (${args.role}) dibuat`,
      actedBy: userId,
    });
    return id;
  },
});

export const updateStaff = mutation({
  args: {
    id: v.id("staff"),
    fullName: v.optional(v.string()),
    nickname: v.optional(v.string()),
    role: v.optional(staffRoleValidator),
    phone: v.optional(v.string()),
    hireDate: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    userId: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const { id, ...patch } = args;
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
    await insertAuditLog(ctx, {
      entityType: "staff",
      entityId: id,
      action: "update",
      description: `Staff diupdate`,
      actedBy: userId,
    });
    return id;
  },
});

export const deactivateStaff = mutation({
  args: { id: v.id("staff") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    await ctx.db.patch(id, { isActive: false, updatedAt: Date.now() });
    await insertAuditLog(ctx, {
      entityType: "staff",
      entityId: id,
      action: "delete",
      description: "Staff dinonaktifkan",
      actedBy: userId,
    });
    return id;
  },
});

// Seed defaults (idempotent). Adjust names + roles after seeding by user.
export const seedDefaultStaff = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db.query("staff").collect();
    const existingNames = new Set(existing.map((s) => s.fullName.toLowerCase()));
    const defaults: Array<{
      fullName: string;
      nickname?: string;
      role: "owner" | "manager" | "supervisor" | "kasir" | "cook" | "server" | "delivery" | "admin" | "other";
    }> = [
      { fullName: "Owner", role: "owner" },
      { fullName: "Manager Toko", role: "manager" },
      { fullName: "Supervisor 1", nickname: "SV1", role: "supervisor" },
      { fullName: "Kasir 1", role: "kasir" },
      { fullName: "Cook 1", role: "cook" },
    ];
    const now = Date.now();
    let inserted = 0;
    for (const s of defaults) {
      if (existingNames.has(s.fullName.toLowerCase())) continue;
      await ctx.db.insert("staff", {
        fullName: s.fullName,
        nickname: s.nickname,
        role: s.role,
        isActive: true,
        createdAt: now,
      });
      inserted++;
    }
    if (inserted > 0) {
      await insertAuditLog(ctx, {
        entityType: "staff",
        entityId: "seed",
        action: "create",
        description: `Seed ${inserted} default staff`,
        actedBy: userId,
      });
    }
    return { inserted, totalAfter: existing.length + inserted };
  },
});
