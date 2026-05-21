/**
 * Classify a bank-statement-style row into the unified transactions
 * shape `{ kind, direction, amount }`. The same fallback logic
 * (debit > 0 → expense out, credit > 0 → receipt in) is needed by
 * statement bank import, manual ledger entries, and any future feed.
 * Keep it here so the mapping never drifts between callsites.
 */

import type { TxKind, TxDirection } from "../features/transactions/_types";

export type StatementCategory =
  | "sales_inflow"
  | "expense_outflow"
  | "topup_pic"
  | "payable_payment"
  | "owner_capital"
  | "transfer_internal"
  | "other";

export type Classified = {
  kind: TxKind;
  direction: TxDirection;
  amount: number;
};

export function inferTxKind(
  category: StatementCategory | undefined,
  debit: number,
  credit: number,
): Classified {
  const amount = debit > 0 ? debit : credit;

  let kind: TxKind;
  switch (category) {
    case "sales_inflow":      kind = "receipt"; break;
    case "expense_outflow":   kind = "expense"; break;
    case "payable_payment":   kind = "payment"; break;
    case "topup_pic":         kind = "transfer"; break;
    case "owner_capital":     kind = "transfer"; break;
    case "transfer_internal": kind = "transfer"; break;
    case "other":             kind = "anomaly"; break;
    default:                  kind = debit > 0 ? "expense" : "receipt";
  }

  const direction: TxDirection =
    category === "topup_pic" || category === "transfer_internal" ? "transfer"
    : credit > 0 ? "in"
    : "out";

  return { kind, direction, amount };
}
