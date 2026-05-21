import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";
import { computePayableStatus } from "../../shared/payableStatus";
import type { Id } from "../../_generated/dataModel";

const sourceTableValidator = v.union(
  v.literal("payables"),
  v.literal("paymentReceipts"),
  v.literal("ownerTransfers"),
  v.literal("dailyClosings"),
);

// Bulk patch — dispatched per-source. Each row carries its sourceTable
// so the UI can paint the unified Buku Besar and still write back to
// the correct source table on save.
//
// Supported fields per table:
//   payables: invoiceDate, dueDate, amount, paidAmount, description, status
//   paymentReceipts: paidDate, amount, channel, reference, notes,
//     bankAccount, anomalyFlag
//   ownerTransfers: transferDate, amount, referenceNo, status,
//     direction, purpose
//   dailyClosings: businessDate, cashSales, nonCashSales,
//     expensesPaidCash, actualCash, status
export const bulkPatch = mutation({
  args: {
    branchId: v.id("branches"),
    patches: v.array(v.object({
      id: v.string(),
      sourceTable: sourceTableValidator,
      data: v.any(),
    })),
  },
  handler: async (ctx, { branchId, patches }) => {
    const userId = await requireAuth(ctx);

    let updated = 0;
    const errors: { id: string; message: string }[] = [];

    for (const p of patches) {
      try {
        const data = p.data as Record<string, unknown>;
        if (p.sourceTable === "payables") {
          const id = p.id as Id<"payables">;
          const existing = await ctx.db.get(id);
          if (!existing) { errors.push({ id: p.id, message: "tidak ditemukan" }); continue; }
          const patch: Record<string, unknown> = {};
          for (const k of ["invoiceDate", "dueDate", "description"]) {
            if (typeof data[k] === "string") patch[k] = data[k];
          }
          for (const k of ["amount", "paidAmount"]) {
            if (typeof data[k] === "number") patch[k] = data[k];
          }
          if (typeof data.status === "string") patch.status = data.status;
          // Recompute status from amount + paidAmount if user didn't override.
          if ((patch.amount !== undefined || patch.paidAmount !== undefined) && patch.status === undefined) {
            const newAmount = (patch.amount as number) ?? existing.amount;
            const newPaid = (patch.paidAmount as number) ?? existing.paidAmount;
            patch.status = computePayableStatus(newAmount, newPaid, existing.dueDate);
          }
          await ctx.db.patch(id, patch);
          updated++;
        } else if (p.sourceTable === "paymentReceipts") {
          const id = p.id as Id<"paymentReceipts">;
          const existing = await ctx.db.get(id);
          if (!existing) { errors.push({ id: p.id, message: "tidak ditemukan" }); continue; }
          const patch: Record<string, unknown> = {};
          for (const k of ["paidDate", "channel", "reference", "notes", "bankAccount", "anomalyFlag"]) {
            if (typeof data[k] === "string") patch[k] = data[k];
          }
          if (typeof data.amount === "number") patch.amount = data.amount;
          await ctx.db.patch(id, patch);
          updated++;
        } else if (p.sourceTable === "ownerTransfers") {
          const id = p.id as Id<"ownerTransfers">;
          const existing = await ctx.db.get(id);
          if (!existing) { errors.push({ id: p.id, message: "tidak ditemukan" }); continue; }
          const patch: Record<string, unknown> = {};
          for (const k of ["transferDate", "referenceNo", "status", "direction", "purpose"]) {
            if (typeof data[k] === "string") patch[k] = data[k];
          }
          if (typeof data.amount === "number") patch.amount = data.amount;
          await ctx.db.patch(id, patch);
          updated++;
        } else if (p.sourceTable === "dailyClosings") {
          const id = p.id as Id<"dailyClosings">;
          const existing = await ctx.db.get(id);
          if (!existing) { errors.push({ id: p.id, message: "tidak ditemukan" }); continue; }
          const patch: Record<string, unknown> = {};
          for (const k of ["businessDate", "status"]) {
            if (typeof data[k] === "string") patch[k] = data[k];
          }
          for (const k of ["cashSales", "nonCashSales", "expensesPaidCash", "actualCash"]) {
            if (typeof data[k] === "number") patch[k] = data[k];
          }
          await ctx.db.patch(id, patch);
          updated++;
        }
      } catch (e) {
        errors.push({ id: p.id, message: e instanceof Error ? e.message : "patch failed" });
      }
    }

    await insertAuditLog(ctx, {
      entityType: "bukuBesar",
      entityId: "" as Id<"payables">,
      action: "update",
      description: `Bulk patch — ${updated} row updated, ${errors.length} error`,
      actedBy: userId, branchId,
    });

    return { updated, errors };
  },
});

// Bulk delete — same dispatcher pattern. Note: deleting a payable does
// NOT cascade to its receipts here (recommend the user un-link first).
export const bulkDelete = mutation({
  args: {
    branchId: v.id("branches"),
    targets: v.array(v.object({
      id: v.string(),
      sourceTable: sourceTableValidator,
    })),
  },
  handler: async (ctx, { branchId, targets }) => {
    const userId = await requireAuth(ctx);

    let deleted = 0;
    const errors: { id: string; message: string }[] = [];

    for (const t of targets) {
      try {
        if (t.sourceTable === "payables") {
          await ctx.db.delete(t.id as Id<"payables">);
        } else if (t.sourceTable === "paymentReceipts") {
          await ctx.db.delete(t.id as Id<"paymentReceipts">);
        } else if (t.sourceTable === "ownerTransfers") {
          await ctx.db.delete(t.id as Id<"ownerTransfers">);
        } else if (t.sourceTable === "dailyClosings") {
          await ctx.db.delete(t.id as Id<"dailyClosings">);
        }
        deleted++;
      } catch (e) {
        errors.push({ id: t.id, message: e instanceof Error ? e.message : "delete failed" });
      }
    }

    await insertAuditLog(ctx, {
      entityType: "bukuBesar",
      entityId: "" as Id<"payables">,
      action: "delete",
      description: `Bulk delete — ${deleted} row, ${errors.length} error`,
      actedBy: userId, branchId,
    });

    return { deleted, errors };
  },
});
