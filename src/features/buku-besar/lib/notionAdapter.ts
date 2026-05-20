// Adapt convex transactions rows → notion-shell Database + Page[] so
// NotionDatabase can render the Buku Besar as a Notion-style surface
// with 6 views (table/board/list/gallery/calendar/feed) for free.

import type {
  Database, DatabaseViewConfig, Page, Property, PropertyValue,
} from "@/features/notion-shell/types";

// Mirror of convex/features/transactions/_schema.ts row shape
// (the fields we expose as Notion properties).
export type TxRow = {
  _id: string;
  _creationTime: number;
  kind: string;
  direction: string;
  branchId: string;
  date: string;
  amount: number;
  paidAmount?: number;
  status?: string;
  vendorId?: string;
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
  sourceKind: string;
  sourceFileName?: string;
  sourceSheetName?: string;
  sourceRowNumber?: number;
  createdAt: number;
  updatedAt?: number;
};

// SSOT for the column set shown in Buku Besar.
export const PROPERTIES: Property[] = [
  { id: "date",          name: "Tanggal",      type: "date" },
  { id: "kind",          name: "Jenis",        type: "select", options: [
    { id: "invoice",  name: "Tagihan",  color: "orange" },
    { id: "payment",  name: "Bayar",    color: "green" },
    { id: "receipt",  name: "Pemasukan", color: "blue" },
    { id: "transfer", name: "Transfer", color: "purple" },
    { id: "expense",  name: "Pengeluaran", color: "red" },
    { id: "anomaly",  name: "Anomali",  color: "yellow" },
  ] },
  { id: "direction",     name: "Arah",         type: "select", options: [
    { id: "in",       name: "Masuk",    color: "green" },
    { id: "out",      name: "Keluar",   color: "red" },
    { id: "transfer", name: "Transfer", color: "blue" },
  ] },
  { id: "counterparty",  name: "Counterparty", type: "text" },
  { id: "amount",        name: "Nominal",      type: "number", numberFormat: "currency" },
  { id: "paidAmount",    name: "Sudah Bayar",  type: "number", numberFormat: "currency" },
  { id: "status",        name: "Status",       type: "select", options: [
    { id: "open",     name: "Open",     color: "gray" },
    { id: "partial",  name: "Partial",  color: "yellow" },
    { id: "paid",     name: "Lunas",    color: "green" },
    { id: "overdue",  name: "Telat",    color: "red" },
    { id: "linked",   name: "Linked",   color: "blue" },
    { id: "unlinked", name: "Unlinked", color: "gray" },
    { id: "pending",  name: "Pending",  color: "yellow" },
    { id: "completed", name: "Completed", color: "green" },
  ] },
  { id: "reference",     name: "Reference",    type: "text" },
  { id: "bankAccount",   name: "No. Rekening", type: "text" },
  { id: "paidBy",        name: "Dibayar Oleh", type: "select", options: [
    { id: "owner",    name: "Owner",    color: "purple" },
    { id: "pic",      name: "PIC",      color: "blue" },
  ] },
  { id: "method",        name: "Method",       type: "select", options: [
    { id: "cash",     name: "Cash",     color: "green" },
    { id: "transfer", name: "Transfer", color: "blue" },
    { id: "atm",      name: "ATM",      color: "purple" },
    { id: "ewallet",  name: "E-Wallet", color: "orange" },
  ] },
  { id: "notes",         name: "Catatan",      type: "text" },
  { id: "anomalyFlag",   name: "Anomali",      type: "select", options: [
    { id: "ok",            name: "OK",            color: "green" },
    { id: "mislabel",      name: "Mislabel",      color: "yellow" },
    { id: "duplicate",     name: "Duplikat",      color: "blue" },
    { id: "not_transfer",  name: "Bukan Transfer", color: "red" },
    { id: "partial",       name: "Partial",       color: "orange" },
  ] },
  { id: "proofFileName", name: "Bukti File",   type: "text" },
  { id: "sourceFileName", name: "Sumber File", type: "text" },
  { id: "sourceSheetName", name: "Sheet",      type: "text" },
  { id: "sourceRowNumber", name: "Row Sheet",  type: "number" },
];

// Default views — Table, Board (by kind), List, Calendar.
export const buildDatabase = (rowIds: string[]): Database => {
  const now = Date.now();
  const views: DatabaseViewConfig[] = [
    { id: "v_table",    name: "Tabel",    type: "table",    sorts: [{ propertyId: "date", direction: "desc" }], filters: [], search: "" },
    { id: "v_board",    name: "Board (per Jenis)", type: "board", groupBy: "kind", sorts: [{ propertyId: "date", direction: "desc" }], filters: [], search: "" },
    { id: "v_list",     name: "List",     type: "list",     sorts: [{ propertyId: "date", direction: "desc" }], filters: [], search: "" },
    { id: "v_calendar", name: "Kalender", type: "calendar", sorts: [{ propertyId: "date", direction: "desc" }], filters: [], search: "" },
    { id: "v_feed",     name: "Feed",     type: "feed",     sorts: [{ propertyId: "date", direction: "desc" }], filters: [], search: "" },
  ];
  return {
    id: "db_buku_besar",
    name: "Buku Besar",
    icon: "📒",
    properties: PROPERTIES,
    rowIds,
    views,
    activeViewId: views[0].id,
    createdAt: now,
    updatedAt: now,
  };
};

// Each tx → a Page object whose rowProps holds the values for our
// PROPERTIES list. NotionDatabase reads from rowProps directly.
export function txToPage(tx: TxRow): Page {
  const rowProps: Record<string, PropertyValue> = {
    date: tx.date,
    kind: tx.kind,
    direction: tx.direction,
    counterparty: tx.counterparty ?? "",
    amount: tx.amount,
    paidAmount: tx.paidAmount ?? 0,
    status: tx.status ?? "",
    reference: tx.reference ?? "",
    bankAccount: tx.bankAccount ?? "",
    paidBy: tx.paidBy ?? "",
    method: tx.method ?? "",
    notes: tx.notes ?? "",
    anomalyFlag: tx.anomalyFlag ?? "",
    proofFileName: tx.proofFileName ?? "",
    sourceFileName: tx.sourceFileName ?? "",
    sourceSheetName: tx.sourceSheetName ?? "",
    sourceRowNumber: tx.sourceRowNumber ?? null,
  };
  return {
    id: tx._id,
    parentId: null,
    title: tx.counterparty ? `${tx.counterparty} · ${tx.date}` : tx.date,
    icon: tx.kind === "anomaly" ? "⚠️" : tx.direction === "in" ? "⬇️" : tx.direction === "out" ? "⬆️" : "↔️",
    blocks: [],
    favorite: false,
    trashed: false,
    createdAt: tx.createdAt ?? tx._creationTime,
    updatedAt: tx.updatedAt ?? tx._creationTime,
    rowOfDatabaseId: "db_buku_besar",
    rowProps,
  };
}

// Reverse mapping for bulk-edit / inline-edit: take a single (propId, value)
// patch and turn it into the convex transactions field name.
export function propToColumn(propId: string): string | null {
  switch (propId) {
    case "date": return "date";
    case "kind": return "kind";
    case "direction": return "direction";
    case "counterparty": return "counterparty";
    case "amount": return "amount";
    case "paidAmount": return "paidAmount";
    case "status": return "status";
    case "reference": return "reference";
    case "bankAccount": return "bankAccount";
    case "paidBy": return "paidBy";
    case "method": return "method";
    case "notes": return "notes";
    case "anomalyFlag": return "anomalyFlag";
    case "proofFileName": return "proofFileName";
    default: return null;
  }
}
