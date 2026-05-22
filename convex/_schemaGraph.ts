/**
 * SSOT for the entire DB relation graph — every table, its primary
 * key, and every foreign-key field.
 *
 * Why this exists:
 *   1. Documentation surface — UI at /operation/schema-graph reads
 *      from here. Lifting features to another project? Read this
 *      to know exactly which FKs must be re-wired.
 *   2. Integrity audit — the `loose` array calls out fields that
 *      are intentionally `v.string()` rather than `v.id("X")` (cross-
 *      table polymorphic refs). Anything NOT in `loose` and stored
 *      as a string is a leak that should be tightened.
 *   3. Cascade-delete planning — `incoming` (who points AT me) lets
 *      mutations know which dependents to clear when deleting.
 *
 * Pattern: each entry says "I am table X. My FKs are listed in `fk`.
 * Other tables that point at me are listed in `incoming`." Both
 * directions are typed so the graph is queryable forward and
 * backward.
 */

export type FkField = {
  /** Field name on this table. */
  field: string;
  /** Target table this FK points at. */
  target: string;
  /** Optional flag — true if this is `v.id()` typed (strict), false
   *  if it's a string-typed reference (loose, polymorphic). */
  typed: boolean;
  /** Free-form note explaining the relation. */
  note?: string;
};

export type IncomingRef = {
  /** Source table holding the FK. */
  from: string;
  /** Field name on that table. */
  field: string;
};

export type TableSpec = {
  /** Convex table name. */
  name: string;
  /** Feature module this table lives in. */
  feature: string;
  /** Foreign keys this table exposes. */
  fk: FkField[];
  /** Inverse — tables that hold an FK pointing AT this table. */
  incoming: IncomingRef[];
  /** Denormalized name fields kept alongside an FK for search/UX.
   *  Convention: `{vendor,channel,category,item}Name` mirror the
   *  master row's `name` so list views skip a join. */
  denormalized?: string[];
  /** Loose IDs stored as `v.string()` by design — usually cross-
   *  table polymorphic refs (e.g. validationLogs.entryId can point
   *  at any of bank_entry / payable / receipt). */
  loose?: { field: string; reason: string }[];
};

// ─── Master / config tables ───────────────────────────────
const branches: TableSpec = {
  name: "branches", feature: "masterData", fk: [],
  incoming: [
    // every transactional table FKs branchId → branches
    { from: "transactions", field: "branchId" },
    { from: "payables", field: "branchId" },
    { from: "paymentReceipts", field: "branchId" },
    { from: "ownerTransfers", field: "branchId" },
    { from: "dailyClosings", field: "branchId" },
    { from: "bankStatementBatches", field: "branchId" },
    { from: "bankStatementEntries", field: "branchId" },
    { from: "validationBatches", field: "branchId" },
    { from: "validationLogs", field: "branchId" },
    { from: "vendorBankAliases", field: "branchId" },
    { from: "dailySales", field: "branchId" },
    { from: "expenses", field: "branchId" },
    { from: "stockItems", field: "branchId" },
    { from: "stockMovements", field: "branchId" },
    { from: "weeklyReports", field: "branchId" },
    { from: "pettyCashRequests", field: "branchId" },
    { from: "auditLogs", field: "branchId" },
    { from: "userPreferences", field: "defaultBranchId" },
    { from: "dailyReportValidations", field: "branchId" },
    { from: "aiEmbeddings", field: "branchId" },
  ],
};

const vendors: TableSpec = {
  name: "vendors", feature: "masterData", fk: [],
  incoming: [
    { from: "payables", field: "vendorId" },
    { from: "transactions", field: "vendorId" },
    { from: "expenses", field: "vendorId" },
    { from: "vendorBankAliases", field: "vendorId" },
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
  ],
};

const masterProducts: TableSpec = {
  name: "masterProducts", feature: "masterData", fk: [], incoming: [],
};

const masterIngredients: TableSpec = {
  name: "masterIngredients", feature: "masterData", fk: [], incoming: [],
};

// ─── Transactions SSOT ───────────────────────────────────
const transactions: TableSpec = {
  name: "transactions", feature: "transactions",
  fk: [
    { field: "branchId", target: "branches", typed: true },
    { field: "vendorId", target: "vendors", typed: true, note: "optional" },
    { field: "channelId", target: "incomeChannels", typed: true, note: "optional" },
    { field: "categoryId", target: "expenseCategories", typed: true, note: "optional" },
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
  ],
  denormalized: ["counterparty", "channelName"],
  loose: [
    { field: "createdBy", reason: "user id or 'system' literal — see PARTY model" },
    { field: "updatedBy", reason: "same as createdBy" },
  ],
};

// ─── Payables + payments ─────────────────────────────────
const payables: TableSpec = {
  name: "payables", feature: "payables",
  fk: [
    { field: "vendorId", target: "vendors", typed: true },
    { field: "branchId", target: "branches", typed: true },
    { field: "expenseId", target: "expenses", typed: true, note: "optional" },
    { field: "transactionId", target: "transactions", typed: true, note: "bridge FK to SSOT" },
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
  fk: [{ field: "payableId", target: "payables", typed: true }],
  incoming: [],
};

const paymentReceipts: TableSpec = {
  name: "paymentReceipts", feature: "closing",
  fk: [
    { field: "payableId", target: "payables", typed: true, note: "optional — null until linked" },
    { field: "branchId", target: "branches", typed: true },
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
    { field: "branchId", target: "branches", typed: true },
    { field: "transactionId", target: "transactions", typed: true, note: "bridge FK" },
  ],
  incoming: [{ from: "ownerTransfers", field: "closingId" }],
  loose: [{ field: "submittedBy", reason: "user id string or 'system'" }],
};

const ownerTransfers: TableSpec = {
  name: "ownerTransfers", feature: "closing",
  fk: [
    { field: "closingId", target: "dailyClosings", typed: true, note: "optional" },
    { field: "branchId", target: "branches", typed: true },
    { field: "reportId", target: "weeklyReports", typed: true, note: "optional ETL source" },
    { field: "transactionId", target: "transactions", typed: true, note: "bridge FK" },
  ],
  incoming: [],
};

// ─── Bank statement reconciliation ───────────────────────
const bankStatementBatches: TableSpec = {
  name: "bankStatementBatches", feature: "closing",
  fk: [
    { field: "branchId", target: "branches", typed: true },
    { field: "fileStorageId", target: "_storage", typed: true, note: "optional" },
  ],
  incoming: [{ from: "bankStatementEntries", field: "batchId" }],
  loose: [{ field: "uploadedBy", reason: "user id string" }],
};

const bankStatementEntries: TableSpec = {
  name: "bankStatementEntries", feature: "closing",
  fk: [
    { field: "batchId", target: "bankStatementBatches", typed: true },
    { field: "branchId", target: "branches", typed: true },
    { field: "payableId", target: "payables", typed: true, note: "optional — set on link" },
    { field: "reportId", target: "weeklyReports", typed: true, note: "optional" },
    { field: "transactionId", target: "transactions", typed: true, note: "bridge FK" },
  ],
  incoming: [],
  denormalized: ["counterparty"],
};

const validationBatches: TableSpec = {
  name: "validationBatches", feature: "closing",
  fk: [
    { field: "branchId", target: "branches", typed: true },
    { field: "fileStorageId", target: "_storage", typed: true, note: "optional" },
  ],
  incoming: [{ from: "validationLogs", field: "batchId" }],
  loose: [{ field: "uploadedBy", reason: "user id string" }],
};

const validationLogs: TableSpec = {
  name: "validationLogs", feature: "closing",
  fk: [
    { field: "batchId", target: "validationBatches", typed: true },
    { field: "branchId", target: "branches", typed: true },
  ],
  incoming: [],
  loose: [
    { field: "entryId", reason: "polymorphic — points at bank_entry / payable / receipt" },
  ],
};

const vendorBankAliases: TableSpec = {
  name: "vendorBankAliases", feature: "closing",
  fk: [
    { field: "vendorId", target: "vendors", typed: true },
    { field: "branchId", target: "branches", typed: true },
  ],
  incoming: [],
};

// ─── Sales + expenses ─────────────────────────────────────
const dailySales: TableSpec = {
  name: "dailySales", feature: "sales",
  fk: [
    { field: "channelId", target: "incomeChannels", typed: true },
    { field: "branchId", target: "branches", typed: true },
  ],
  incoming: [],
  denormalized: ["channelName"],
};

const expenses: TableSpec = {
  name: "expenses", feature: "expenses",
  fk: [
    { field: "categoryId", target: "expenseCategories", typed: true },
    { field: "vendorId", target: "vendors", typed: true, note: "optional" },
    { field: "branchId", target: "branches", typed: true },
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
  name: "stockItems", feature: "inventory",
  fk: [{ field: "branchId", target: "branches", typed: true }],
  incoming: [{ from: "stockMovements", field: "itemId" }],
};

const stockMovements: TableSpec = {
  name: "stockMovements", feature: "inventory",
  fk: [
    { field: "itemId", target: "stockItems", typed: true },
    { field: "branchId", target: "branches", typed: true },
  ],
  incoming: [],
  denormalized: ["itemName"],
};

// ─── Reports + staging ─────────────────────────────────
const weeklyReports: TableSpec = {
  name: "weeklyReports", feature: "reports",
  fk: [{ field: "branchId", target: "branches", typed: true }],
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
    { from: "salaryTunjangan", field: "reportId" },
    { from: "transactions", field: "sourceReportId" },
    { from: "ownerTransfers", field: "reportId" },
    { from: "bankStatementEntries", field: "reportId" },
    { from: "aiEmbeddings", field: "reportId" },
  ],
  loose: [{ field: "uploadedBy", reason: "user id string" }],
};

const stagingTables: TableSpec[] = [
  "productSales", "productHPP", "dailyCashFlow", "dailyCashSummary",
  "creditPurchases", "inventoryValuation", "vendorPurchases",
  "leftoverItems", "costAnalysis", "productChanges", "salaryTunjangan",
].map((name): TableSpec => ({
  name, feature: "reports",
  fk: [
    { field: "reportId", target: "weeklyReports", typed: true },
    { field: "branchId", target: "branches", typed: true, note: "denormalized for direct query" },
  ],
  incoming: [],
}));

// ─── Petty cash ──────────────────────────────────────
const pettyCashRequests: TableSpec = {
  name: "pettyCashRequests", feature: "pettyCash",
  fk: [{ field: "branchId", target: "branches", typed: true }],
  incoming: [],
};

// ─── Audit + validation ─────────────────────────────
const auditLogs: TableSpec = {
  name: "auditLogs", feature: "audit",
  fk: [{ field: "branchId", target: "branches", typed: true, note: "optional" }],
  incoming: [],
  loose: [
    { field: "entityId", reason: "polymorphic — points at any table" },
    { field: "actedBy", reason: "user id string" },
  ],
};

const dailyReportValidations: TableSpec = {
  name: "dailyReportValidations", feature: "dailyReportValidation",
  fk: [{ field: "branchId", target: "branches", typed: true }],
  incoming: [],
  loose: [{ field: "validatedBy", reason: "user id string" }],
};

// ─── Auth + AI ─────────────────────────────────
// `users` table comes from @convex-dev/auth — not defined in our schema
// but every userId FK from app tables points here. Stub it so the graph
// has a sink node + collects all the incoming refs.
const users: TableSpec = {
  name: "users", feature: "auth", fk: [],
  incoming: [
    { from: "userRoles", field: "userId" },
    { from: "userPreferences", field: "userId" },
    { from: "aiChatSessions", field: "userId" },
  ],
};

const userRoles: TableSpec = {
  name: "userRoles", feature: "auth",
  fk: [{ field: "userId", target: "users", typed: true }],
  incoming: [],
};

const userPreferences: TableSpec = {
  name: "userPreferences", feature: "auth",
  fk: [
    { field: "userId", target: "users", typed: true },
    { field: "defaultBranchId", target: "branches", typed: true, note: "optional" },
  ],
  incoming: [],
};

const aiProviders: TableSpec = {
  name: "aiProviders", feature: "ai", fk: [],
  incoming: [{ from: "aiChatSessions", field: "providerId" }],
};

const aiTools: TableSpec = {
  name: "aiTools", feature: "ai", fk: [], incoming: [],
  // Loose semantic-id ref. `toolId` is the semantic key (e.g. "laporan_query")
  // referenced by aiAgents.allowedToolIds + aiChatSessions.enabledToolIds —
  // those arrays are v.array(v.string()), not v.id(), so the graph can't
  // typed-edge them. Listed under loose so the audit still surfaces them.
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
  name: "aiCustomInstructions", feature: "ai",
  fk: [],
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
  fk: [
    { field: "branchId", target: "branches", typed: true },
    { field: "reportId", target: "weeklyReports", typed: true, note: "optional" },
  ],
  incoming: [],
  loose: [
    { field: "sourceTable", reason: "polymorphic — names target table (productSales/costAnalysis/etc.)" },
    { field: "sourceId", reason: "polymorphic id paired with sourceTable" },
  ],
};

// ─── Aggregate ─────────────────────────────────────────
export const SCHEMA_GRAPH: TableSpec[] = [
  // master
  branches, vendors, incomeChannels, expenseCategories,
  masterProducts, masterIngredients,
  // transactions SSOT
  transactions,
  // payables
  payables, payablePayments,
  // closing
  paymentReceipts, dailyClosings, ownerTransfers,
  bankStatementBatches, bankStatementEntries,
  validationBatches, validationLogs, vendorBankAliases,
  // sales / expenses / inventory
  dailySales, expenses, expenseLineItems,
  stockItems, stockMovements,
  // reports
  weeklyReports, ...stagingTables,
  // petty cash
  pettyCashRequests,
  // audit / validation
  auditLogs, dailyReportValidations,
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
