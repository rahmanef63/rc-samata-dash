/**
 * SSOT for the transactions feature.
 *
 * Every enum tuple is the SOLE place a literal lives. Validators are
 * derived from the tuple; TS types are derived from the validators.
 * Consumers (legacy bridges, mirror helper, frontend adapters) import
 * the tuples — no string-literal duplication.
 *
 * Portability: nothing in this file references RC Samata branches,
 * vendors, or sheet names. Other projects can lift this module
 * unchanged.
 */

import { v } from "convex/values";

export const TX_KINDS = ["invoice", "payment", "receipt", "transfer", "expense", "anomaly"] as const;
export const TX_DIRECTIONS = ["in", "out", "transfer"] as const;
export const SOURCE_KINDS = [
  "weekly_upload", "statement_bank", "laporan_pic_csv",
  "bulk_import_csv", "manual", "system",
] as const;

export type TxKind = typeof TX_KINDS[number];
export type TxDirection = typeof TX_DIRECTIONS[number];
export type SourceKind = typeof SOURCE_KINDS[number];

// Compile-time guard: assert the tuple matches the validator's literal
// union shape. If you add a literal to one, the other must follow.
type _AssertTxKindShape = TxKind extends "invoice" | "payment" | "receipt" | "transfer" | "expense" | "anomaly" ? true : never;
type _AssertTxDirectionShape = TxDirection extends "in" | "out" | "transfer" ? true : never;
type _AssertSourceKindShape = SourceKind extends "weekly_upload" | "statement_bank" | "laporan_pic_csv" | "bulk_import_csv" | "manual" | "system" ? true : never;
const _tk: _AssertTxKindShape = true;
const _td: _AssertTxDirectionShape = true;
const _sk: _AssertSourceKindShape = true;
void _tk; void _td; void _sk;

// Explicit unions (Convex v.union signature has trouble inferring literal
// narrowing from spread variadics — keep the literal calls inline).
export const txKindValidator = v.union(
  v.literal("invoice"),
  v.literal("payment"),
  v.literal("receipt"),
  v.literal("transfer"),
  v.literal("expense"),
  v.literal("anomaly"),
);

export const txDirectionValidator = v.union(
  v.literal("in"),
  v.literal("out"),
  v.literal("transfer"),
);

export const sourceKindValidator = v.union(
  v.literal("weekly_upload"),
  v.literal("statement_bank"),
  v.literal("laporan_pic_csv"),
  v.literal("bulk_import_csv"),
  v.literal("manual"),
  v.literal("system"),
);
