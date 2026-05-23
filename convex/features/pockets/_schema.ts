/**
 * Cash pocket ledger — physical wallets / accounts holding cash + flows
 * between them. Every transaction must cite a `pocketSourceId` so saldo
 * pocket bisa direkonsiliasi vs fisik.
 *
 * Examples of pockets:
 *   - "Brankas Toko"
 *   - "Dompet PIC"
 *   - "Rekening BCA Owner"
 *   - "Tabungan Owner"
 *   - "Petty Cash SV"
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const pocketKindValidator = v.union(
  v.literal("brankas"),
  v.literal("dompet_pic"),
  v.literal("rekening_owner"),
  v.literal("rekening_toko"),
  v.literal("tabungan_owner"),
  v.literal("petty_cash"),
  v.literal("owner_direct"),
  v.literal("other"),
);

export const pocketFlowReasonValidator = v.union(
  v.literal("setoran"),
  v.literal("topup"),
  v.literal("ambil_owner"),
  v.literal("bayar_vendor"),
  v.literal("transfer_internal"),
  v.literal("koreksi"),
  v.literal("other"),
);

export const pocketsTables = {
  pockets: defineTable({
    name: v.string(),
    kind: pocketKindValidator,
    bankAccount: v.optional(v.string()),
    isActive: v.boolean(),
    currentBalance: v.number(),         // cached saldo — refreshed by pocketFlows triggers
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_kind", ["kind"])
    .index("by_active", ["isActive"]),

  pocketFlows: defineTable({
    fromPocketId: v.optional(v.id("pockets")),  // null = external in (e.g. sales cash)
    toPocketId: v.optional(v.id("pockets")),    // null = external out (e.g. vendor bayar)
    amount: v.number(),                          // always positive
    date: v.string(),                            // YYYY-MM-DD
    reason: pocketFlowReasonValidator,
    notes: v.optional(v.string()),
    transactionId: v.optional(v.id("transactions")),  // bridge FK
    createdAt: v.number(),
    createdBy: v.string(),
  })
    .index("by_from_date", ["fromPocketId", "date"])
    .index("by_to_date", ["toPocketId", "date"])
    .index("by_transaction", ["transactionId"]),
};
