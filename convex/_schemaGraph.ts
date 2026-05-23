/**
 * SSOT for the entire DB relation graph — every table, its primary
 * key, and every foreign-key field.
 *
 * RC Samata is single-tenant — `branches` was dropped 2026-05-23.
 * Added: pockets/pocketFlows (cash ledger), staff + HR (separate from
 * users), waAudit (WhatsApp daily report parse), fixedAssets,
 * glossaryTerms, accountingPeriods, inventoryTransformations, baReimburse.
 */

export type FkField = {
  field: string;
  target: string;
  typed: boolean;
  note?: string;
};

export type IncomingRef = {
  from: string;
  field: string;
};

export type TableSpec = {
  name: string;
  feature: string;
  fk: FkField[];
  incoming: IncomingRef[];
  denormalized?: string[];
  loose?: { field: string; reason: string }[];
};

// ─── Master / config tables ───────────────────────────────
const vendors: TableSpec = {
  name: "vendors", feature: "masterData", fk: [],
  incoming: [
    { from: "payables", field: "vendorId" },
    { from: "transactions", field: "vendorId" },
    { from: "expenses", field: "vendorId" },
    { from: "vendorBankAliases", field: "vendorId" },
    { from: "fixedAssets", field: "vendorId" },
  ],
};

const incomeChannels: TableSpec = {
  name: "incomeChannels", feature: "masterData", fk: [],
  incoming: [
    { from: "dailySales", field: "channelId" },
    { from: "transactions", field: "channelId" },
  ],
};

const expenseCategories: TableSpec = {
  name: "expenseCategories", feature: "masterData", fk: [],
  incoming: [
    { from: "expenses", field: "categoryId" },
    { from: "transactions", field: "categoryId" },
    { from: "inventoryValuation", field: "categoryId" },
    { from: "foodCostSummary", field: "categoryId" },
    { from: "transferItems", field: "categoryId" },
  ],
};

const masterProducts: TableSpec = {
  name: "masterProducts", feature: "masterData", fk: [], incoming: [],
};

const masterIngredients: TableSpec = {
  name: "masterIngredients", feature: "masterData", fk: [], incoming: [],
};

const fixedAssets: TableSpec = {
  name: "fixedAssets", feature: "masterData",
  fk: [
    { field: "vendorId", target: "vendors", typed: true, note: "optional" },
    { field: "transactionId", target: "transactions", typed: true, note: "bridge FK ke SSOT" },
  ],
  incoming: [],
};

const glossaryTerms: TableSpec = {
  name: "glossaryTerms", feature: "masterData", fk: [], incoming: [],
};

// ─── Pockets (cash ledger) ────────────────────────────────
const pockets: TableSpec = {
  name: "pockets", feature: "pockets", fk: [],
  incoming: [
    { from: "transactions", field: "pocketSourceId" },
    { from: "pocketFlows", field: "fromPocketId" },
    { from: "pocketFlows", field: "toPocketId" },
    { from: "ownerTransfers", field: "toPocketId" },
    { from: "paymentReceipts", field: "pocketId" },
  ],
  denormalized: ["pocketName"],
};

const pocketFlows: TableSpec = {
  name: "pocketFlows", feature: "pockets",
  fk: [
    { field: "fromPocketId", target: "pockets", typed: true, note: "optional — null = external in" },
    { field: "toPocketId", target: "pockets", typed: true, note: "optional — null = external out" },
    { field: "transactionId", target: "transactions", typed: true, note: "bridge FK opsional" },
  ],
  incoming: [],
};

// ─── HR ─────────────────────────────────────────────────
const staff: TableSpec = {
  name: "staff", feature: "hr",
  fk: [{ field: "userId", target: "users", typed: true, note: "optional — link to login" }],
  incoming: [
    { from: "staffSchedules", field: "staffId" },
    { from: "staffPerformance", field: "staffId" },
    { from: "tunjanganKaryawan", field: "staffId" },
    { from: "splLembur", field: "karyawanStaffId" },
    { from: "splLembur", field: "supervisorStaffId" },
    { from: "inventoryTransformations", field: "supervisorStaffId" },
    { from: "inventoryTransformations", field: "areaManagerStaffId" },
    { from: "baReimburse", field: "submittedByStaffId" },
    { from: "transactions", field: "paidByStaffId" },
    { from: "transactions", field: "receivedByStaffId" },
  ],
  denormalized: ["staffName"],
};

const staffSchedules: TableSpec = {
  name: "staffSchedules", feature: "hr",
  fk: [{ field: "staffId", target: "staff", typed: true }],
  incoming: [],
  loose: [{ field: "periodMonth", reason: "string '2026-05'" }],
};

const staffPiket: TableSpec = {
  name: "staffPiket", feature: "hr", fk: [], incoming: [],
  loose: [
    { field: "staffIds", reason: "array<string> of staff.id — loose by design (rotating piket per minggu)" },
    { field: "areaPiket", reason: "string area kerja" },
  ],
};

const staffPerformance: TableSpec = {
  name: "staffPerformance", feature: "hr",
  fk: [{ field: "staffId", target: "staff", typed: true }],
  incoming: [],
  loose: [{ field: "kategoriPerforma", reason: "enum: excellent/good/average/poor" }],
};

const tunjanganKaryawan: TableSpec = {
  name: "tunjanganKaryawan", feature: "hr",
  fk: [
    { field: "staffId", target: "staff", typed: true },
    { field: "transactionId", target: "transactions", typed: true, note: "optional bridge FK" },
  ],
  incoming: [],
  loose: [{ field: "tipeTunjangan", reason: "enum: luar_kota/kost/subsidi_transport/makan" }],
};

const splLembur: TableSpec = {
  name: "splLembur", feature: "hr",
  fk: [
    { field: "karyawanStaffId", target: "staff", typed: true },
    { field: "supervisorStaffId", target: "staff", typed: true, note: "pemberi perintah" },
  ],
  incoming: [],
};

// ─── Transactions SSOT ───────────────────────────────────
const transactions: TableSpec = {
  name: "transactions", feature: "transactions",
  fk: [
    { field: "vendorId", target: "vendors", typed: true, note: "optional" },
    { field: "channelId", target: "incomeChannels", typed: true, note: "optional" },
    { field: "categoryId", target: "expenseCategories", typed: true, note: "optional" },
    { field: "pocketSourceId", target: "pockets", typed: true, note: "pocket asal — should be WAJIB once migrated" },
    { field: "paidByStaffId", target: "staff", typed: true, note: "optional — siapa staff bayar" },
    { field: "receivedByStaffId", target: "staff", typed: true, note: "optional — siapa staff terima" },
    { field: "payableId", target: "payables", typed: true, note: "bridge to legacy" },
    { field: "receiptId", target: "paymentReceipts", typed: true, note: "bridge to legacy" },
    { field: "linkedTxId", target: "transactions", typed: true, note: "self-FK: payment → invoice" },
    { field: "parentTxId", target: "transactions", typed: true, note: "self-FK: split → parent" },
    { field: "sourceReportId", target: "weeklyReports", typed: true, note: "optional ETL source" },
    { field: "sourceFileStorageId", target: "_storage", typed: true, note: "optional" },
    { field: "proofStorageId", target: "_storage", typed: true, note: "optional" },
  ],
  incoming: [
    { from: "transactions", field: "linkedTxId" },
    { from: "transactions", field: "parentTxId" },
    { from: "payables", field: "transactionId" },
    { from: "paymentReceipts", field: "transactionId" },
    { from: "ownerTransfers", field: "transactionId" },
    { from: "dailyClosings", field: "transactionId" },
    { from: "bankStatementEntries", field: "transactionId" },
    { from: "pocketFlows", field: "transactionId" },
    { from: "fixedAssets", field: "transactionId" },
    { from: "baReimburse", field: "transactionId" },
    { from: "tunjanganKaryawan", field: "transactionId" },
  ],
  denormalized: ["counterparty", "channelName", "pocketName"],
  loose: [
    { field: "sourceTier", reason: "enum: csv_verified/wa_chat/weekly_xlsx/photo_pdf/manual — data quality" },
    { field: "createdBy", reason: "user id or 'system' literal" },
    { field: "updatedBy", reason: "same as createdBy" },
  ],
};

// ─── Payables + payments ─────────────────────────────────
const payables: TableSpec = {
  name: "payables", feature: "payables",
  fk: [
    { field: "vendorId", target: "vendors", typed: true },
    { field: "expenseId", target: "expenses", typed: true, note: "optional" },
    { field: "transactionId", target: "transactions", typed: true, note: "bridge FK ke SSOT" },
    { field: "sourceReportId", target: "weeklyReports", typed: true, note: "optional ETL source" },
  ],
  incoming: [
    { from: "paymentReceipts", field: "payableId" },
    { from: "payablePayments", field: "payableId" },
    { from: "bankStatementEntries", field: "payableId" },
    { from: "transactions", field: "payableId" },
  ],
  denormalized: ["vendorName"],
};

const payablePayments: TableSpec = {
  name: "payablePayments", feature: "payables",
  fk: [
    { field: "payableId", target: "payables", typed: true },
    { field: "transactionId", target: "transactions", typed: true, note: "optional bridge FK" },
  ],
  incoming: [],
};

const paymentReceipts: TableSpec = {
  name: "paymentReceipts", feature: "closing",
  fk: [
    { field: "payableId", target: "payables", typed: true, note: "optional — null until linked" },
    { field: "pocketId", target: "pockets", typed: true, note: "optional — pocket yang terima" },
    { field: "transactionId", target: "transactions", typed: true, note: "bridge FK" },
    { field: "proofStorageId", target: "_storage", typed: true, note: "optional" },
  ],
  incoming: [{ from: "transactions", field: "receiptId" }],
  loose: [{ field: "uploadedBy", reason: "user id string" }],
};

// ─── Closing + transfers ─────────────────────────────────
const dailyClosings: TableSpec = {
  name: "dailyClosings", feature: "closing",
  fk: [
    { field: "transactionId", target: "transactions", typed: true, note: "bridge FK" },
    { field: "sourceReportId", target: "weeklyReports", typed: true, note: "optional" },
  ],
  incoming: [{ from: "ownerTransfers", field: "closingId" }],
  loose: [{ field: "submittedBy", reason: "user id string or 'system'" }],
};

const ownerTransfers: TableSpec = {
  name: "ownerTransfers", feature: "closing",
  fk: [
    { field: "closingId", target: "dailyClosings", typed: true, note: "optional" },
    { field: "toPocketId", target: "pockets", typed: true, note: "optional — pocket owner_direct biasanya" },
    { field: "reportId", target: "weeklyReports", typed: true, note: "optional ETL source" },
    { field: "transactionId", target: "transactions", typed: true, note: "bridge FK" },
  ],
  incoming: [],
};

// ─── Bank statement reconciliation ───────────────────────
const bankStatementBatches: TableSpec = {
  name: "bankStatementBatches", feature: "closing",
  fk: [{ field: "fileStorageId", target: "_storage", typed: true, note: "optional" }],
  incoming: [{ from: "bankStatementEntries", field: "batchId" }],
  loose: [{ field: "uploadedBy", reason: "user id string" }],
};

const bankStatementEntries: TableSpec = {
  name: "bankStatementEntries", feature: "closing",
  fk: [
    { field: "batchId", target: "bankStatementBatches", typed: true },
    { field: "payableId", target: "payables", typed: true, note: "optional — set on link" },
    { field: "reportId", target: "weeklyReports", typed: true, note: "optional" },
    { field: "transactionId", target: "transactions", typed: true, note: "bridge FK" },
  ],
  incoming: [],
  denormalized: ["counterparty"],
};

const validationBatches: TableSpec = {
  name: "validationBatches", feature: "closing",
  fk: [{ field: "fileStorageId", target: "_storage", typed: true, note: "optional" }],
  incoming: [{ from: "validationLogs", field: "batchId" }],
  loose: [{ field: "uploadedBy", reason: "user id string" }],
};

const validationLogs: TableSpec = {
  name: "validationLogs", feature: "closing",
  fk: [{ field: "batchId", target: "validationBatches", typed: true }],
  incoming: [],
  loose: [{ field: "entryId", reason: "polymorphic — points at bank_entry / payable / receipt" }],
};

const vendorBankAliases: TableSpec = {
  name: "vendorBankAliases", feature: "closing",
  fk: [{ field: "vendorId", target: "vendors", typed: true }],
  incoming: [],
};

const accountingPeriods: TableSpec = {
  name: "accountingPeriods", feature: "closing", fk: [], incoming: [],
  loose: [
    { field: "yearMonth", reason: "string '2026-05' — primary key candidate" },
    { field: "status", reason: "enum: open/locked/closed" },
    { field: "lockedBy", reason: "user id string" },
  ],
};

// ─── Sales + expenses ─────────────────────────────────────
const dailySales: TableSpec = {
  name: "dailySales", feature: "sales",
  fk: [
    { field: "channelId", target: "incomeChannels", typed: true },
    { field: "sourceReportId", target: "weeklyReports", typed: true, note: "optional" },
    { field: "transactionId", target: "transactions", typed: true, note: "bridge FK" },
  ],
  incoming: [],
  denormalized: ["channelName"],
};

const expenses: TableSpec = {
  name: "expenses", feature: "expenses",
  fk: [
    { field: "categoryId", target: "expenseCategories", typed: true },
    { field: "vendorId", target: "vendors", typed: true, note: "optional" },
    { field: "sourceReportId", target: "weeklyReports", typed: true, note: "optional" },
    { field: "transactionId", target: "transactions", typed: true, note: "bridge FK" },
  ],
  incoming: [
    { from: "expenseLineItems", field: "expenseId" },
    { from: "payables", field: "expenseId" },
  ],
  denormalized: ["categoryName", "vendorName"],
};

const expenseLineItems: TableSpec = {
  name: "expenseLineItems", feature: "expenses",
  fk: [{ field: "expenseId", target: "expenses", typed: true }],
  incoming: [],
};

// ─── Inventory ─────────────────────────────────────────
const stockItems: TableSpec = {
  name: "stockItems", feature: "inventory", fk: [],
  incoming: [{ from: "stockMovements", field: "itemId" }],
};

const stockMovements: TableSpec = {
  name: "stockMovements", feature: "inventory",
  fk: [{ field: "itemId", target: "stockItems", typed: true }],
  incoming: [],
  denormalized: ["itemName"],
};

const inventoryTransformations: TableSpec = {
  name: "inventoryTransformations", feature: "inventory",
  fk: [
    { field: "supervisorStaffId", target: "staff", typed: true, note: "optional" },
    { field: "areaManagerStaffId", target: "staff", typed: true, note: "optional" },
  ],
  incoming: [],
  loose: [
    { field: "bahanInput", reason: "string — TODO link masterIngredients/stockItems" },
    { field: "produkOutput", reason: "string — TODO link masterProducts/stockItems" },
  ],
};

// ─── Reports + staging ─────────────────────────────────
const weeklyReports: TableSpec = {
  name: "weeklyReports", feature: "reports", fk: [],
  incoming: [
    { from: "productSales", field: "reportId" },
    { from: "productHPP", field: "reportId" },
    { from: "dailyCashFlow", field: "reportId" },
    { from: "dailyCashSummary", field: "reportId" },
    { from: "creditPurchases", field: "reportId" },
    { from: "inventoryValuation", field: "reportId" },
    { from: "vendorPurchases", field: "reportId" },
    { from: "leftoverItems", field: "reportId" },
    { from: "costAnalysis", field: "reportId" },
    { from: "productChanges", field: "reportId" },
    { from: "employeeAllowances", field: "reportId" },
    { from: "transactions", field: "sourceReportId" },
    { from: "ownerTransfers", field: "reportId" },
    { from: "bankStatementEntries", field: "reportId" },
    { from: "aiEmbeddings", field: "reportId" },
    { from: "expenses", field: "sourceReportId" },
    { from: "payables", field: "sourceReportId" },
    { from: "dailyClosings", field: "sourceReportId" },
    { from: "dailySales", field: "sourceReportId" },
  ],
  loose: [{ field: "uploadedBy", reason: "user id string" }],
};

const stagingTables: TableSpec[] = [
  "productSales", "productHPP", "dailyCashFlow", "dailyCashSummary",
  "creditPurchases", "inventoryValuation", "vendorPurchases",
  "leftoverItems", "costAnalysis", "productChanges",
  "salesControl", "foodCostSummary", "transferItems", "employeeIncentives",
  "kpiTargets", "employeeAllowances",
].map((name): TableSpec => ({
  name, feature: "reports",
  fk: [{ field: "reportId", target: "weeklyReports", typed: true }],
  incoming: [],
}));

// ─── Petty cash ──────────────────────────────────────
const pettyCashRequests: TableSpec = {
  name: "pettyCashRequests", feature: "pettyCash", fk: [], incoming: [],
};

const baReimburse: TableSpec = {
  name: "baReimburse", feature: "pettyCash",
  fk: [
    { field: "submittedByStaffId", target: "staff", typed: true, note: "optional" },
    { field: "transactionId", target: "transactions", typed: true, note: "bridge FK opsional" },
    { field: "proofStorageId", target: "_storage", typed: true, note: "optional" },
  ],
  incoming: [],
};

// ─── Audit + validation ─────────────────────────────
const auditLogs: TableSpec = {
  name: "auditLogs", feature: "audit", fk: [], incoming: [],
  loose: [
    { field: "entityId", reason: "polymorphic — points at any table" },
    { field: "actedBy", reason: "user id string" },
  ],
};

const dailyReportValidations: TableSpec = {
  name: "dailyReportValidations", feature: "dailyReportValidation",
  fk: [], incoming: [],
  loose: [{ field: "validatedBy", reason: "user id string" }],
};

// ─── WA Audit ingest ───────────────────────────────
const waReportDaily: TableSpec = {
  name: "waReportDaily", feature: "waAudit",
  fk: [{ field: "matchedReportId", target: "weeklyReports", typed: true, note: "optional" }],
  incoming: [],
  loose: [{ field: "matchStatus", reason: "enum: match/diskrepansi/missing/unverified" }],
};

const waPositionDaily: TableSpec = {
  name: "waPositionDaily", feature: "waAudit", fk: [], incoming: [],
  loose: [{ field: "sender", reason: "SV name string — pelapor harian" }],
};

const waOnlineDaily: TableSpec = {
  name: "waOnlineDaily", feature: "waAudit", fk: [], incoming: [],
  loose: [{ field: "matchStatus", reason: "enum: match/diskrepansi/missing/unverified" }],
};

// ─── Auth + AI ─────────────────────────────────
const users: TableSpec = {
  name: "users", feature: "auth", fk: [],
  incoming: [
    { from: "userRoles", field: "userId" },
    { from: "userPreferences", field: "userId" },
    { from: "aiChatSessions", field: "userId" },
    { from: "staff", field: "userId" },
  ],
};

const userRoles: TableSpec = {
  name: "userRoles", feature: "auth",
  fk: [{ field: "userId", target: "users", typed: true }],
  incoming: [],
};

const userPreferences: TableSpec = {
  name: "userPreferences", feature: "auth",
  fk: [{ field: "userId", target: "users", typed: true }],
  incoming: [],
};

const aiProviders: TableSpec = {
  name: "aiProviders", feature: "ai", fk: [],
  incoming: [{ from: "aiChatSessions", field: "providerId" }],
};

const aiTools: TableSpec = {
  name: "aiTools", feature: "ai", fk: [], incoming: [],
  loose: [{ field: "toolId", reason: "semantic id like 'laporan_query' — referenced by aiAgents.allowedToolIds + aiChatSessions.enabledToolIds (array<string>)" }],
};

const aiAgents: TableSpec = {
  name: "aiAgents", feature: "ai", fk: [], incoming: [],
  loose: [
    { field: "agentId", reason: "semantic id like 'business_analyst'" },
    { field: "allowedToolIds", reason: "array<string> of aiTools.toolId — loose by design" },
  ],
};

const aiCustomInstructions: TableSpec = {
  name: "aiCustomInstructions", feature: "ai", fk: [],
  incoming: [{ from: "aiChatSessions", field: "customInstructionId" }],
};

const aiChatSessions: TableSpec = {
  name: "aiChatSessions", feature: "ai",
  fk: [
    { field: "userId", target: "users", typed: true, note: "optional" },
    { field: "providerId", target: "aiProviders", typed: true, note: "optional" },
    { field: "customInstructionId", target: "aiCustomInstructions", typed: true, note: "optional" },
  ],
  incoming: [{ from: "aiChatMessages", field: "sessionId" }],
  loose: [{ field: "enabledToolIds", reason: "array<string> of aiTools.toolId — loose by design" }],
};

const aiChatMessages: TableSpec = {
  name: "aiChatMessages", feature: "ai",
  fk: [{ field: "sessionId", target: "aiChatSessions", typed: true }],
  incoming: [],
};

const aiEmbeddings: TableSpec = {
  name: "aiEmbeddings", feature: "ai",
  fk: [{ field: "reportId", target: "weeklyReports", typed: true, note: "optional" }],
  incoming: [],
  loose: [
    { field: "sourceTable", reason: "polymorphic — names target table (productSales/costAnalysis/etc.)" },
    { field: "sourceId", reason: "polymorphic id paired with sourceTable" },
  ],
};

// ─── Aggregate ─────────────────────────────────────────
export const SCHEMA_GRAPH: TableSpec[] = [
  // master
  vendors, incomeChannels, expenseCategories,
  masterProducts, masterIngredients,
  fixedAssets, glossaryTerms,
  // pockets
  pockets, pocketFlows,
  // hr
  staff, staffSchedules, staffPiket, staffPerformance,
  tunjanganKaryawan, splLembur,
  // transactions SSOT
  transactions,
  // payables
  payables, payablePayments,
  // closing
  paymentReceipts, dailyClosings, ownerTransfers,
  bankStatementBatches, bankStatementEntries,
  validationBatches, validationLogs, vendorBankAliases,
  accountingPeriods,
  // sales / expenses / inventory
  dailySales, expenses, expenseLineItems,
  stockItems, stockMovements, inventoryTransformations,
  // reports
  weeklyReports, ...stagingTables,
  // petty cash
  pettyCashRequests, baReimburse,
  // audit / validation
  auditLogs, dailyReportValidations,
  // waAudit
  waReportDaily, waPositionDaily, waOnlineDaily,
  // auth / ai
  users, userRoles, userPreferences,
  aiProviders, aiTools, aiAgents, aiCustomInstructions,
  aiChatSessions, aiChatMessages, aiEmbeddings,
];

/** Quick lookup. */
export function getTableSpec(name: string): TableSpec | undefined {
  return SCHEMA_GRAPH.find((t) => t.name === name);
}

/** Tables grouped by feature. */
export function tablesByFeature(): Record<string, TableSpec[]> {
  const out: Record<string, TableSpec[]> = {};
  for (const t of SCHEMA_GRAPH) {
    (out[t.feature] ??= []).push(t);
  }
  return out;
}
