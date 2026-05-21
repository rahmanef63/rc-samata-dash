/**
 * Project-specific configuration for Buku Besar Notion view.
 *
 * Portability seam: this file holds the only RC Samata-specific
 * data — Indonesian property labels, option sets, the editable-fields
 * whitelist, and view layout. Other projects can replace this file
 * (or fork the buku-besar feature) without touching the adapter
 * logic in `notionAdapter.ts`.
 */

import type { DatabaseViewConfig, Property } from "@/features/notion-shell/types";

export type LedgerConfig = {
  databaseId: string;
  databaseName: string;
  databaseIcon: string;
  properties: Property[];
  views: DatabaseViewConfig[];
  /** Property ids that may be patched via inline edit / CSV replace. */
  editableProperties: ReadonlySet<string>;
};

export const LEDGER_PROPERTIES: Property[] = [
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
    { id: "open",      name: "Open",     color: "gray" },
    { id: "partial",   name: "Partial",  color: "yellow" },
    { id: "paid",      name: "Lunas",    color: "green" },
    { id: "overdue",   name: "Telat",    color: "red" },
    { id: "linked",    name: "Linked",   color: "blue" },
    { id: "unlinked",  name: "Unlinked", color: "gray" },
    { id: "pending",   name: "Pending",  color: "yellow" },
    { id: "completed", name: "Completed", color: "green" },
  ] },
  { id: "reference",     name: "Reference",    type: "url" },
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

export const LEDGER_VIEWS: DatabaseViewConfig[] = [
  { id: "v_table",    name: "Tabel",            type: "table",
    sorts: [{ propertyId: "date", direction: "desc" }], filters: [], search: "" },
  { id: "v_board",    name: "Board (per Jenis)", type: "board", groupBy: "kind",
    sorts: [{ propertyId: "date", direction: "desc" }], filters: [], search: "" },
  { id: "v_list",     name: "List",             type: "list",
    sorts: [{ propertyId: "date", direction: "desc" }], filters: [], search: "" },
  { id: "v_calendar", name: "Kalender",         type: "calendar",
    sorts: [{ propertyId: "date", direction: "desc" }], filters: [], search: "" },
  { id: "v_feed",     name: "Feed",             type: "feed",
    sorts: [{ propertyId: "date", direction: "desc" }], filters: [], search: "" },
];

/** Property ids that can be patched. Anything not here = read-only. */
export const LEDGER_EDITABLE = new Set<string>([
  "date", "kind", "direction", "counterparty", "amount", "paidAmount",
  "status", "reference", "bankAccount", "paidBy", "method", "notes",
  "anomalyFlag", "proofFileName",
]);

export const LEDGER_CONFIG: LedgerConfig = {
  databaseId: "db_buku_besar",
  databaseName: "Buku Besar",
  databaseIcon: "📒",
  properties: LEDGER_PROPERTIES,
  views: LEDGER_VIEWS,
  editableProperties: LEDGER_EDITABLE,
};
