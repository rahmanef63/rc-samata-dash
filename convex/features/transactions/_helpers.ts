import type { MutationCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";

// Internal mirror helper — call from any legacy mutation that inserts
// into payables / paymentReceipts / ownerTransfers / dailyClosings /
// bankStatementEntries so the unified `transactions` table also sees
// the row. Idempotent by (sourceKind, sourceFileName, sourceSheetName,
// sourceRowNumber): re-imports patch instead of duplicating. Returns
// the txId so caller can stamp transactionId on the source row.

export type MirrorArgs = {
  branchId: Id<"branches">;
  kind: "invoice" | "payment" | "receipt" | "transfer" | "expense" | "anomaly";
  direction: "in" | "out" | "transfer";
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
  sourceKind: "weekly_upload" | "statement_bank" | "laporan_pic_csv" | "bulk_import_csv" | "manual" | "system";
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
