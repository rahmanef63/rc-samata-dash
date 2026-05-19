import { defineTable } from "convex/server";
import { v } from "convex/values";
import { etlSourceValidator } from "../../shared/validators";

export const closingTables = {
  dailyClosings: defineTable({
    businessDate: v.string(),
    openingCash: v.number(),
    cashSales: v.number(),
    nonCashSales: v.number(),
    expensesPaidCash: v.number(),
    expectedCash: v.number(),
    actualCash: v.number(),
    difference: v.number(),
    status: v.union(
      v.literal("open"),
      v.literal("submitted"),
      v.literal("verified")
    ),
    submittedBy: v.string(),
    submittedAt: v.string(),
    branchId: v.id("branches"),
    etlSource: etlSourceValidator,
  }).index("by_branch_date", ["branchId", "businessDate"]),

  ownerTransfers: defineTable({
    closingId: v.optional(v.id("dailyClosings")),
    transferDate: v.string(),
    direction: v.union(
      v.literal("branch_to_owner"),
      v.literal("owner_to_branch")
    ),
    purpose: v.union(
      v.literal("night_transfer"),
      v.literal("petty_cash_topup"),
      v.literal("payable_payment_fund"),
      v.literal("adjustment")
    ),
    amount: v.number(),
    referenceNo: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed")),
    branchId: v.id("branches"),
    // ETL provenance — when row imported from a weekly report's
    // LAP. CF "Penerimaan lain-lain" section.
    reportId: v.optional(v.id("weeklyReports")),
    description: v.optional(v.string()),
  })
    .index("by_branch", ["branchId"])
    .index("by_report", ["reportId"]),

  // ─── Bukti bayar piutang (proof of payable payment) ─────
  // Owner / PIC upload struk / transfer screenshot. Linked to a payable
  // when known, else stays unmatched until reconciliation.
  paymentReceipts: defineTable({
    payableId: v.optional(v.id("payables")),
    amount: v.number(),
    paidDate: v.string(),
    paidBy: v.union(v.literal("owner"), v.literal("pic")),
    channel: v.optional(v.string()),    // bank, cash, ewallet, transfer
    reference: v.optional(v.string()),  // no transaksi / nota
    notes: v.optional(v.string()),
    proofStorageId: v.optional(v.id("_storage")),
    proofFileName: v.optional(v.string()),
    proofMimeType: v.optional(v.string()),
    branchId: v.id("branches"),
    uploadedAt: v.number(),
    uploadedBy: v.string(),
  })
    .index("by_branch_date", ["branchId", "paidDate"])
    .index("by_payable", ["payableId"]),

  // ─── Bank/account statement entries (kredit / debit / saldo) ──
  // Per-row line from owner or PIC bank/account statement xlsx.
  // Used to reconcile sales channels (gofood/grab/ovo/shopee/cash) +
  // payable payments + topup transfers between owner ↔ PIC.
  bankStatementEntries: defineTable({
    accountKind: v.union(v.literal("owner"), v.literal("pic")),
    txDate: v.string(),
    description: v.string(),
    debit: v.number(),          // out / pengeluaran
    credit: v.number(),         // in / penerimaan
    balance: v.number(),        // saldo setelah tx
    counterparty: v.optional(v.string()), // "Pihak" column — vendor / person name
    channel: v.optional(v.string()), // cash | transfer | gofood | grabfood | shopeefood | ovo | dana | qris | other
    category: v.optional(v.union(
      v.literal("sales_inflow"),
      v.literal("expense_outflow"),
      v.literal("topup_pic"),
      v.literal("payable_payment"),
      v.literal("owner_capital"),
      v.literal("transfer_internal"),
      v.literal("other")
    )),
    payableId: v.optional(v.id("payables")),
    reportId: v.optional(v.id("weeklyReports")),
    // Unified payment reference — same value across multiple entries
    // means they pay ONE payable (split-payment retry scenario).
    paymentReference: v.optional(v.string()),
    isValidated: v.optional(v.boolean()),
    batchId: v.id("bankStatementBatches"),
    branchId: v.id("branches"),
  })
    .index("by_branch_date", ["branchId", "txDate"])
    .index("by_batch", ["batchId"])
    .index("by_account_date", ["accountKind", "txDate"])
    .index("by_payable", ["payableId"]),

  // ─── Reconciliation: validation batches + log ─────────────
  // Owner downloads CSV of unvalidated rows, sends to AI, uploads
  // back fixed CSV. Each upload = a validationBatch. Every cell that
  // changes generates a validationLog row so we never lose history.
  validationBatches: defineTable({
    fileName: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
    rowsApplied: v.number(),
    rowsRejected: v.number(),
    summary: v.optional(v.string()),
    branchId: v.id("branches"),
    uploadedAt: v.number(),
    uploadedBy: v.string(),
  }).index("by_branch", ["branchId"]),

  // ─── Vendor bank aliases ──────────────────────────────────
  // Pihak/account name as written in bank statement → vendor master.
  // Learned on every successful AI-validated match, plus seeded from
  // statement parser (when counterparty exactly equals an existing vendor).
  vendorBankAliases: defineTable({
    vendorId: v.id("vendors"),
    alias: v.string(),         // normalized UPPERCASE
    accountNo: v.optional(v.string()),
    source: v.union(
      v.literal("validation"),
      v.literal("manual"),
      v.literal("statement"),
    ),
    branchId: v.id("branches"),
    lastSeenAt: v.number(),
    seenCount: v.number(),
  })
    .index("by_alias", ["alias"])
    .index("by_vendor", ["vendorId"])
    .index("by_branch_alias", ["branchId", "alias"]),

  validationLogs: defineTable({
    entryType: v.union(
      v.literal("bank_entry"),
      v.literal("payable"),
      v.literal("receipt"),
    ),
    entryId: v.string(),   // doc id as string (avoid cross-table id types)
    batchId: v.id("validationBatches"),
    field: v.string(),     // paymentReference | matchedPayableId | isValidated
    beforeValue: v.optional(v.string()),
    afterValue: v.optional(v.string()),
    branchId: v.id("branches"),
    changedAt: v.number(),
  })
    .index("by_entry", ["entryType", "entryId"])
    .index("by_batch", ["batchId"])
    .index("by_branch", ["branchId"]),

  // Each statement file upload = one batch (so we can re-import).
  bankStatementBatches: defineTable({
    accountKind: v.union(v.literal("owner"), v.literal("pic")),
    periodStart: v.string(),
    periodEnd: v.string(),
    fileName: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
    openingBalance: v.optional(v.number()),
    closingBalance: v.optional(v.number()),
    rowCount: v.number(),
    status: v.union(
      v.literal("uploaded"),  // file saved, not parsed yet
      v.literal("parsed"),    // entries inserted
      v.literal("reconciled") // matched against payables / reports
    ),
    branchId: v.id("branches"),
    uploadedAt: v.number(),
    uploadedBy: v.string(),
  }).index("by_branch_account", ["branchId", "accountKind"]),
};
