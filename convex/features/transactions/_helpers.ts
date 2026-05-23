import type { MutationCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import type { TxKind, TxDirection, SourceKind } from "./_types";

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
  const { userId, ...rest } = args;
  const now = Date.now();

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

  if (existing) {
    await ctx.db.patch(existing._id, { ...rest, updatedBy: userId, updatedAt: now });
    return existing._id;
  }
  return await ctx.db.insert("transactions", {
    ...rest,
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
