// ─── Currency formatting ────────────────────────────────
export const formatRp = (val: number) => `Rp ${(val / 1000000).toFixed(0)}M`;

export const formatRpFull = (val: number) =>
  `Rp ${val.toLocaleString("id-ID")}`;

// ─── Direction helpers ──────────────────────────────────
export const directionBgClass = (direction: "in" | "out") =>
  direction === "in" ? "bg-success/10" : "bg-destructive/10";

export const directionTextClass = (direction: "in" | "out") =>
  direction === "in" ? "text-success" : "text-destructive";

// ─── Amount color based on prefix ───────────────────────
export const amountColorClass = (amount: string) =>
  amount.startsWith("+") ? "text-success" : amount.startsWith("-") ? "text-destructive" : "text-foreground";
