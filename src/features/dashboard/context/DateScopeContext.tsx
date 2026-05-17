"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export type DateGranularity = "day" | "week" | "month";

const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
] as const;

const SHORT_MONTH_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
] as const;

type DayAnchor = { y: number; m: number; d: number }; // m = 1..12
type MonthAnchor = { y: number; m: number };
type WeekAnchor = { y: number; m: number; w: number }; // w = 1..5

type DateScopeValue = {
  granularity: DateGranularity;
  startDate: number; // ms inclusive
  endDate: number;   // ms exclusive
  day: DayAnchor;
  month: MonthAnchor;
  week: WeekAnchor;
  rangeLabel: string;
  setGranularity: (g: DateGranularity) => void;
  setDay: (anchor: DayAnchor) => void;
  setMonth: (anchor: MonthAnchor) => void;
  setWeek: (anchor: WeekAnchor) => void;
  goPrev: () => void;
  goNext: () => void;
  goToday: () => void;
};

const DateScopeContext = createContext<DateScopeValue | null>(null);

function todayAnchor(): DayAnchor {
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() };
}

function currentWeekOfMonth(d: number): number {
  return Math.min(5, Math.ceil(d / 7));
}

function computeRange(
  g: DateGranularity,
  day: DayAnchor,
  month: MonthAnchor,
  week: WeekAnchor,
): { start: number; end: number } {
  if (g === "day") {
    const start = new Date(day.y, day.m - 1, day.d).getTime();
    const end = new Date(day.y, day.m - 1, day.d + 1).getTime();
    return { start, end };
  }
  if (g === "month") {
    const start = new Date(month.y, month.m - 1, 1).getTime();
    const end = new Date(month.y, month.m, 1).getTime();
    return { start, end };
  }
  // week — 4 fixed week-of-month buckets, week 5 = days 29..end-of-month
  const startDay = (week.w - 1) * 7 + 1;
  const endDayExclusive = week.w * 7 + 1;
  const start = new Date(week.y, week.m - 1, startDay).getTime();
  // Clamp end to first day of next month if Week 5 overshoots
  const monthEnd = new Date(week.y, week.m, 1).getTime();
  const naiveEnd = new Date(week.y, week.m - 1, endDayExclusive).getTime();
  return { start, end: Math.min(naiveEnd, monthEnd) };
}

function formatLabel(
  g: DateGranularity,
  day: DayAnchor,
  month: MonthAnchor,
  week: WeekAnchor,
): string {
  if (g === "day") {
    return `${day.d} ${SHORT_MONTH_ID[day.m - 1]} ${day.y}`;
  }
  if (g === "month") {
    return `${MONTH_NAMES_ID[month.m - 1]} ${month.y}`;
  }
  return `Minggu ${week.w} · ${SHORT_MONTH_ID[week.m - 1]} ${week.y}`;
}

function parseIntSafe(v: string | null, fallback: number): number {
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function DateScopeProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initial values from URL or "today" defaults.
  const initial = useMemo(() => {
    const today = todayAnchor();
    const g = (searchParams.get("g") as DateGranularity | null) ?? "month";
    const y = parseIntSafe(searchParams.get("y"), today.y);
    const m = parseIntSafe(searchParams.get("m"), today.m);
    const w = parseIntSafe(searchParams.get("w"), currentWeekOfMonth(today.d));
    const dParam = searchParams.get("d"); // YYYY-MM-DD
    let day = today;
    if (dParam && /^\d{4}-\d{2}-\d{2}$/.test(dParam)) {
      const [yy, mm, dd] = dParam.split("-").map(Number);
      day = { y: yy, m: mm, d: dd };
    }
    return {
      g,
      day,
      month: { y, m },
      week: { y, m, w },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [granularity, setGranularityState] = useState<DateGranularity>(initial.g);
  const [day, setDayState] = useState<DayAnchor>(initial.day);
  const [month, setMonthState] = useState<MonthAnchor>(initial.month);
  const [week, setWeekState] = useState<WeekAnchor>(initial.week);

  // Stable refs for URL writers — re-render-safe.
  const searchParamsRef = useRef(searchParams);
  const pathnameRef = useRef(pathname);
  searchParamsRef.current = searchParams;
  pathnameRef.current = pathname;

  // Sync URL → state when URL changes (back/forward nav).
  const urlG = searchParams.get("g");
  const urlY = searchParams.get("y");
  const urlM = searchParams.get("m");
  const urlW = searchParams.get("w");
  const urlD = searchParams.get("d");
  useEffect(() => {
    const g = (urlG as DateGranularity | null) ?? "month";
    setGranularityState((prev) => (prev === g ? prev : g));
  }, [urlG]);
  useEffect(() => {
    if (urlD && /^\d{4}-\d{2}-\d{2}$/.test(urlD)) {
      const [y, m, d] = urlD.split("-").map(Number);
      setDayState((prev) =>
        prev.y === y && prev.m === m && prev.d === d ? prev : { y, m, d },
      );
    }
  }, [urlD]);
  useEffect(() => {
    if (urlY || urlM) {
      const today = todayAnchor();
      const y = parseIntSafe(urlY, today.y);
      const m = parseIntSafe(urlM, today.m);
      setMonthState((prev) => (prev.y === y && prev.m === m ? prev : { y, m }));
      if (urlW) {
        const w = parseIntSafe(urlW, currentWeekOfMonth(today.d));
        setWeekState((prev) =>
          prev.y === y && prev.m === m && prev.w === w ? prev : { y, m, w },
        );
      }
    }
  }, [urlY, urlM, urlW]);

  const writeUrl = useCallback(
    (next: {
      g: DateGranularity;
      day: DayAnchor;
      month: MonthAnchor;
      week: WeekAnchor;
    }) => {
      const sp = searchParamsRef.current;
      const params = new URLSearchParams(sp.toString());
      params.set("g", next.g);
      // Clear other-mode keys so URL stays clean per mode.
      params.delete("d");
      params.delete("y");
      params.delete("m");
      params.delete("w");
      // Legacy keys from old picker — strip them on first navigation.
      params.delete("p");
      params.delete("from");
      params.delete("to");
      if (next.g === "day") {
        const pad = (n: number) => String(n).padStart(2, "0");
        params.set("d", `${next.day.y}-${pad(next.day.m)}-${pad(next.day.d)}`);
      } else if (next.g === "month") {
        params.set("y", String(next.month.y));
        params.set("m", String(next.month.m));
      } else {
        params.set("y", String(next.week.y));
        params.set("m", String(next.week.m));
        params.set("w", String(next.week.w));
      }
      const qs = params.toString();
      router.replace(
        qs ? `${pathnameRef.current}?${qs}` : pathnameRef.current,
        { scroll: false },
      );
    },
    [router],
  );

  const setGranularity = useCallback(
    (g: DateGranularity) => {
      setGranularityState(g);
      writeUrl({ g, day, month, week });
    },
    [day, month, week, writeUrl],
  );

  const setDay = useCallback(
    (anchor: DayAnchor) => {
      setDayState(anchor);
      writeUrl({ g: "day", day: anchor, month, week });
      setGranularityState("day");
    },
    [month, week, writeUrl],
  );

  const setMonth = useCallback(
    (anchor: MonthAnchor) => {
      setMonthState(anchor);
      writeUrl({ g: "month", day, month: anchor, week });
      setGranularityState("month");
    },
    [day, week, writeUrl],
  );

  const setWeek = useCallback(
    (anchor: WeekAnchor) => {
      setWeekState(anchor);
      writeUrl({ g: "week", day, month, week: anchor });
      setGranularityState("week");
    },
    [day, month, writeUrl],
  );

  const goPrev = useCallback(() => {
    if (granularity === "day") {
      const d = new Date(day.y, day.m - 1, day.d - 1);
      setDay({ y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() });
    } else if (granularity === "month") {
      const d = new Date(month.y, month.m - 2, 1);
      setMonth({ y: d.getFullYear(), m: d.getMonth() + 1 });
    } else {
      if (week.w > 1) {
        setWeek({ ...week, w: week.w - 1 });
      } else {
        const d = new Date(week.y, week.m - 2, 1);
        setWeek({ y: d.getFullYear(), m: d.getMonth() + 1, w: 4 });
      }
    }
  }, [granularity, day, month, week, setDay, setMonth, setWeek]);

  const goNext = useCallback(() => {
    if (granularity === "day") {
      const d = new Date(day.y, day.m - 1, day.d + 1);
      setDay({ y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() });
    } else if (granularity === "month") {
      const d = new Date(month.y, month.m, 1);
      setMonth({ y: d.getFullYear(), m: d.getMonth() + 1 });
    } else {
      if (week.w < 5) {
        setWeek({ ...week, w: week.w + 1 });
      } else {
        const d = new Date(week.y, week.m, 1);
        setWeek({ y: d.getFullYear(), m: d.getMonth() + 1, w: 1 });
      }
    }
  }, [granularity, day, month, week, setDay, setMonth, setWeek]);

  const goToday = useCallback(() => {
    const t = todayAnchor();
    if (granularity === "day") setDay(t);
    else if (granularity === "month") setMonth({ y: t.y, m: t.m });
    else setWeek({ y: t.y, m: t.m, w: currentWeekOfMonth(t.d) });
  }, [granularity, setDay, setMonth, setWeek]);

  const { startDate, endDate } = useMemo(() => {
    const r = computeRange(granularity, day, month, week);
    return { startDate: r.start, endDate: r.end };
  }, [granularity, day, month, week]);

  const rangeLabel = useMemo(
    () => formatLabel(granularity, day, month, week),
    [granularity, day, month, week],
  );

  const value = useMemo<DateScopeValue>(
    () => ({
      granularity,
      startDate,
      endDate,
      day,
      month,
      week,
      rangeLabel,
      setGranularity,
      setDay,
      setMonth,
      setWeek,
      goPrev,
      goNext,
      goToday,
    }),
    [
      granularity,
      startDate,
      endDate,
      day,
      month,
      week,
      rangeLabel,
      setGranularity,
      setDay,
      setMonth,
      setWeek,
      goPrev,
      goNext,
      goToday,
    ],
  );

  return (
    <DateScopeContext.Provider value={value}>
      {children}
    </DateScopeContext.Provider>
  );
}

export function useDateScope(): DateScopeValue {
  const ctx = useContext(DateScopeContext);
  if (!ctx) {
    throw new Error("useDateScope must be used inside <DateScopeProvider>");
  }
  return ctx;
}

export { MONTH_NAMES_ID, SHORT_MONTH_ID };
