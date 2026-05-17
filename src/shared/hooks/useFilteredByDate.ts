"use client";

import { useMemo } from "react";
import { useDateScope } from "@/features/dashboard/context/DateScopeContext";

/**
 * Filter any array by the global DateScope (start/end timestamps).
 *
 * Accepts items that carry a date in any common shape:
 *  - YYYY-MM-DD ISO string (most Convex business dates)
 *  - Full ISO with time (e.g. createdAt)
 *  - Unix ms number
 *
 * `dateKey` picks which field to filter by. Items missing the field
 * pass through unfiltered (so legacy rows without a date column don't
 * disappear silently).
 *
 * Example:
 *   const filtered = useFilteredByDate(rawExpenses, "expenseDate");
 *
 * DRY: import this in every CRUD page that shows a date column instead
 * of reimplementing the filter math.
 */
export function useFilteredByDate<T>(
  items: T[] | undefined,
  dateKey: string,
): T[] {
  const { startDate, endDate } = useDateScope();
  return useMemo(() => {
    if (!items) return [];
    return items.filter((item) => {
      const raw = (item as Record<string, unknown>)[dateKey];
      if (raw == null || raw === "") return true;
      const ts = parseTimestamp(raw);
      if (ts == null) return true;
      return ts >= startDate && ts < endDate;
    });
  }, [items, dateKey, startDate, endDate]);
}

function parseTimestamp(raw: unknown): number | null {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") return null;
  // Convex business dates are typically "YYYY-MM-DD" — parse as Jakarta-local
  // midnight to avoid off-by-one when the user is browsing in UTC tooling.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
  }
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}
