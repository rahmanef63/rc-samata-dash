/**
 * Adapter: maps the convex transactions row shape onto the
 * notion-shell Database + Page contract.
 *
 * This file is intentionally project-agnostic — property metadata
 * and label strings live in `./config.ts`. Replace config to retarget
 * the ledger surface for a different project / locale.
 */

import type { Database, Page, PropertyValue } from "@/features/notion-shell/types";
import { LEDGER_CONFIG, LEDGER_EDITABLE } from "./config";

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

// Re-export config primitives so existing callers keep working.
export { LEDGER_PROPERTIES as PROPERTIES } from "./config";

export const buildDatabase = (rowIds: string[]): Database => {
  const now = Date.now();
  return {
    id: LEDGER_CONFIG.databaseId,
    name: LEDGER_CONFIG.databaseName,
    icon: LEDGER_CONFIG.databaseIcon,
    properties: LEDGER_CONFIG.properties,
    rowIds,
    views: LEDGER_CONFIG.views,
    activeViewId: LEDGER_CONFIG.views[0].id,
    createdAt: now,
    updatedAt: now,
  };
};

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
    icon: tx.kind === "anomaly" ? "⚠️"
      : tx.direction === "in" ? "⬇️"
      : tx.direction === "out" ? "⬆️"
      : "↔️",
    blocks: [],
    favorite: false,
    trashed: false,
    createdAt: tx.createdAt ?? tx._creationTime,
    updatedAt: tx.updatedAt ?? tx._creationTime,
    rowOfDatabaseId: LEDGER_CONFIG.databaseId,
    rowProps,
  };
}

/** Reverse map property id → convex column name. Returns null for
 *  non-editable props (read-only source-trace fields, etc). */
export function propToColumn(propId: string): string | null {
  return LEDGER_EDITABLE.has(propId) ? propId : null;
}
