import {
  type PayableStatus,
  PAYABLE_STATUS_LABELS,
  PAYABLE_STATUS_BADGE_CLS,
} from "../constants/statuses";

type PaymentRecord = {
  paymentDate: string;
  amount: number;
  method: string;
  referenceNo?: string;
  source: "manual" | "statement";
  paidBy?: "owner" | "pic";
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  transfer: "Transfer",
  owner: "Owner",  // accountKind from bankStatementEntries
  pic: "PIC",
};

const PAID_BY_LABELS: Record<string, string> = {
  owner: "OWNER",
  pic: "PIC",
};

// Produce both a short status badge label and a one-line subtext that
// fits below the badge in the WYSIWYG "two-line status" format.
// Subtext context examples:
//   "OWNER · 2026-04-15 · Transfer"
//   "PIC · 2026-04-12 · Cash"
//   "telat 3 hari"
//   "Sebagian Rp 250.000 dari Rp 1.000.000"
export function describePayable(p: {
  status: string;
  amount: number;
  paidAmount: number;
  dueDate?: string;
}, payments: PaymentRecord[] = []): {
  status: PayableStatus;
  badgeLabel: string;
  badgeCls: string;
  subText: string;
} {
  const status = (p.status as PayableStatus) ?? "open";
  const badgeLabel = PAYABLE_STATUS_LABELS[status] ?? status;
  const badgeCls = PAYABLE_STATUS_BADGE_CLS[status] ?? "bg-muted text-muted-foreground";

  // Pick the most recent payment to describe in subtext (paid/partial).
  const sorted = payments.slice().sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  const latest = sorted[0];

  let subText = "";
  if (status === "paid" || status === "partial") {
    if (latest) {
      const who = latest.paidBy ? PAID_BY_LABELS[latest.paidBy] ?? latest.paidBy.toUpperCase() : null;
      const method = METHOD_LABELS[latest.method] ?? latest.method;
      const parts = [who, latest.paymentDate, method].filter(Boolean);
      subText = parts.join(" · ");
      if (status === "partial") {
        const remaining = p.amount - p.paidAmount;
        subText += ` · sisa Rp ${remaining.toLocaleString("id-ID")}`;
      }
    } else if (status === "partial") {
      const remaining = p.amount - p.paidAmount;
      subText = `sisa Rp ${remaining.toLocaleString("id-ID")} dari Rp ${p.amount.toLocaleString("id-ID")}`;
    }
  } else if (status === "overdue") {
    if (p.dueDate) {
      const today = new Date().toISOString().slice(0, 10);
      const days = Math.max(0, Math.floor(
        (new Date(today).getTime() - new Date(p.dueDate).getTime()) / 86_400_000,
      ));
      subText = days > 0 ? `telat ${days} hari` : "jatuh tempo hari ini";
    } else {
      subText = "telat";
    }
  } else if (status === "open") {
    if (p.dueDate) {
      const today = new Date().toISOString().slice(0, 10);
      const daysLeft = Math.floor(
        (new Date(p.dueDate).getTime() - new Date(today).getTime()) / 86_400_000,
      );
      subText = daysLeft >= 0 ? `${daysLeft} hari lagi jatuh tempo` : `telat ${-daysLeft} hari`;
    }
  }

  return { status, badgeLabel, badgeCls, subText };
}
