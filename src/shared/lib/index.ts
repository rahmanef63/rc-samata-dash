const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const longDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const jakartaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Jakarta",
});

function toSafeDate(dateLike: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateLike)
    ? new Date(`${dateLike}T00:00:00Z`)
    : new Date(dateLike);
}

// ─── Currency formatting ────────────────────────────────
export const formatRp = (val: number) => {
  const abs = Math.abs(val);

  if (abs >= 1_000_000_000) {
    return `Rp ${(val / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1)}B`;
  }

  if (abs >= 1_000_000) {
    return `Rp ${(val / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  }

  if (abs >= 1_000) {
    return `Rp ${(val / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  }

  return `Rp ${val.toLocaleString("id-ID")}`;
};

export const formatRpFull = (val: number) => `Rp ${val.toLocaleString("id-ID")}`;

export const formatShortDate = (dateLike: string) =>
  shortDateFormatter.format(toSafeDate(dateLike));

export const formatLongDate = (dateLike: string) =>
  longDateFormatter.format(toSafeDate(dateLike));

export const formatDateRange = (start: string, end: string) =>
  `${formatShortDate(start)} - ${formatLongDate(end)}`;

export const getJakartaDateString = (date = new Date()) => {
  const parts = jakartaDateFormatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
};

// ─── Direction helpers ──────────────────────────────────
export const directionBgClass = (direction: "in" | "out") =>
  direction === "in" ? "bg-success/10" : "bg-destructive/10";

export const directionTextClass = (direction: "in" | "out") =>
  direction === "in" ? "text-success" : "text-destructive";

// ─── Amount color based on prefix ───────────────────────
export const amountColorClass = (amount: string) =>
  amount.startsWith("+") ? "text-success" : amount.startsWith("-") ? "text-destructive" : "text-foreground";
