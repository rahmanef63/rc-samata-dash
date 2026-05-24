import type { MutationCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import type { TxKind, TxDirection, SourceKind } from "./_types";
import { assertPeriodOpen } from "../closing/periodLock";
import { derivePocketSourceId } from "../pockets/_helpers";

type SourceTier = "csv_verified" | "wa_chat" | "weekly_xlsx" | "photo_pdf" | "manual";

// Infer data-quality tier from sourceKind. Callers may override by passing
// `sourceTier` explicitly (e.g. statement that's actually photo OCR).
export function inferSourceTier(sourceKind: SourceKind): SourceTier {
  switch (sourceKind) {
    case "weekly_upload": return "weekly_xlsx";
    case "statement_bank": return "csv_verified";
    case "laporan_pic_csv": return "csv_verified";
    case "bulk_import_csv": return "csv_verified";
    case "manual": return "manual";
    case "system": return "manual";
  }
}

// Internal mirror helper — call from any legacy mutation that inserts
// into payables / paymentReceipts / ownerTransfers / dailyClosings /
// bankStatementEntries so the unified `transactions` table also sees
// the row. Idempotent by (sourceKind, sourceFileName, sourceSheetName,
// sourceRowNumber): re-imports patch instead of duplicating. Returns
// the txId so caller can stamp transactionId on the source row.

export type MirrorArgs = {
  kind: TxKind;
  direction: TxDirection;
  date: string;
  amount: number;
  paidAmount?: number;
  status?: string;
  vendorId?: Id<"vendors">;
  channelId?: Id<"incomeChannels">;
  categoryId?: Id<"expenseCategories">;
  payableId?: Id<"payables">;
  receiptId?: Id<"paymentReceipts">;
  linkedTxId?: Id<"transactions">;
  parentTxId?: Id<"transactions">;
  pocketSourceId?: Id<"pockets">;
  paidByStaffId?: Id<"staff">;
  receivedByStaffId?: Id<"staff">;
  sourceTier?: SourceTier;
  paymentSource?: string;  // hint for pocket derivation; not persisted
  counterparty?: string;
  description?: string;
  reference?: string;
  bankAccount?: string;
  channelName?: string;
  pocketName?: string;
  paidBy?: string;
  method?: string;
  notes?: string;
  anomalyFlag?: string;
  proofFileName?: string;
  proofStorageId?: Id<"_storage">;
  proofMimeType?: string;
  sourceKind: SourceKind;
  sourceFileName?: string;
  sourceFileStorageId?: Id<"_storage">;
  sourceSheetName?: string;
  sourceRowNumber?: number;
  sourceReportId?: Id<"weeklyReports">;
  userId: string;
};

export async function mirrorTx(
  ctx: MutationCtx,
  args: MirrorArgs,
): Promise<Id<"transactions">> {
  const { userId, paymentSource, ...rest } = args;
  const now = Date.now();

  // Period-lock enforcement — throws if date in locked/closed period.
  await assertPeriodOpen(ctx, rest.date);

  // Auto-derive pocketSourceId if caller didn't pass one. Ensures zero
  // untagged tx going forward (user constraint: cashflow always synced).
  if (!rest.pocketSourceId) {
    const derived = await derivePocketSourceId(ctx, {
      kind: rest.kind,
      direction: rest.direction,
      paymentSource,
      sourceKind: rest.sourceKind,
    });
    if (derived.pocketSourceId) {
      rest.pocketSourceId = derived.pocketSourceId;
      rest.pocketName = derived.pocketName;
    }
  } else if (!rest.pocketName) {
    const p = await ctx.db.get(rest.pocketSourceId);
    if (p) rest.pocketName = p.name;
  }

  let existing = null;
  if (rest.sourceFileName) {
    const candidates = await ctx.db.query("transactions")
      .withIndex("by_source_file", (q) =>
        q.eq("sourceKind", rest.sourceKind).eq("sourceFileName", rest.sourceFileName!),
      )
      .take(1000);
    existing = candidates.find((c) =>
      c.sourceSheetName === rest.sourceSheetName &&
      c.sourceRowNumber === rest.sourceRowNumber,
    ) ?? null;
  }

  // Auto-stamp sourceTier from sourceKind unless caller already set it.
  const tieredRest = {
    ...rest,
    sourceTier: rest.sourceTier ?? inferSourceTier(rest.sourceKind),
  };

  if (existing) {
    await ctx.db.patch(existing._id, { ...tieredRest, updatedBy: userId, updatedAt: now });
    return existing._id;
  }
  return await ctx.db.insert("transactions", {
    ...tieredRest,
    createdBy: userId,
    createdAt: now,
  });
}

// ─── Two-way sync helpers ──────────────────────────────────
// Legacy-table mutations call these after patching their own row so
// the SSOT row stays in lockstep. Pass only the fields that
// changed — anything `undefined` is left alone.

type PartialTxPatch = {
  date?: string;
  amount?: number;
  paidAmount?: number;
  status?: string;
  counterparty?: string;
  description?: string;
  reference?: string;
  bankAccount?: string;
  channelName?: string;
  paidBy?: string;
  method?: string;
  notes?: string;
  anomalyFlag?: string;
  proofFileName?: string;
};

function pickDefined<T extends object>(patch: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, val] of Object.entries(patch) as [keyof T, T[keyof T]][]) {
    if (val !== undefined) out[k] = val;
  }
  return out;
}

async function syncTxRow(
  ctx: MutationCtx,
  txId: Id<"transactions">,
  patch: PartialTxPatch,
) {
  const fields = pickDefined(patch);
  if (Object.keys(fields).length === 0) return;
  const tx = await ctx.db.get(txId);
  if (!tx) return;
  await ctx.db.patch(txId, { ...fields, updatedAt: Date.now() });
}

export const syncTxFromPayable = syncTxRow;
export const syncTxFromReceipt = syncTxRow;
export const syncTxFromTransfer = syncTxRow;
export const syncTxFromClosing = syncTxRow;
export const syncTxFromBankEntry = syncTxRow;
export const syncTxFromSales = syncTxRow;
export const syncTxFromExpense = syncTxRow;
