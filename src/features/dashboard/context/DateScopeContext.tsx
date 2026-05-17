"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export type DatePreset =
  | "today"
  | "7d"
  | "30d"
  | "wtd"
  | "mtd"
  | "qtd"
  | "ytd"
  | "custom";

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: "Hari ini",
  "7d": "7 hari",
  "30d": "30 hari",
  wtd: "Minggu ini",
  mtd: "Bulan ini",
  qtd: "Kuartal ini",
  ytd: "Tahun ini",
  custom: "Custom",
};

type DateScopeValue = {
  preset: DatePreset;
  startDate: number; // unix ms inclusive
  endDate: number;   // unix ms exclusive (next-day boundary)
  setPreset: (p: Exclude<DatePreset, "custom">) => void;
  setCustomRange: (start: number, end: number) => void;
};

function computeRange(preset: Exclude<DatePreset, "custom">): { start: number; end: number } {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  switch (preset) {
    case "today":
      return { start: startOfToday, end: endOfToday };
    case "7d":
      return { start: endOfToday - 7 * 86_400_000, end: endOfToday };
    case "30d":
      return { start: endOfToday - 30 * 86_400_000, end: endOfToday };
    case "wtd": {
      const day = now.getDay();
      const daysSinceMonday = day === 0 ? 6 : day - 1;
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - daysSinceMonday,
      ).getTime();
      return { start, end: endOfToday };
    }
    case "mtd":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
        end: endOfToday,
      };
    case "qtd": {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), qStartMonth, 1).getTime(),
        end: endOfToday,
      };
    }
    case "ytd":
      return {
        start: new Date(now.getFullYear(), 0, 1).getTime(),
        end: endOfToday,
      };
  }
}

const DateScopeContext = createContext<DateScopeValue | null>(null);

export function DateScopeProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlPreset = (searchParams.get("p") as DatePreset | null) ?? "30d";
  const urlFromRaw = searchParams.get("from");
  const urlToRaw = searchParams.get("to");
  const urlFrom = urlFromRaw ? Number(urlFromRaw) : 0;
  const urlTo = urlToRaw ? Number(urlToRaw) : 0;

  const [preset, setPresetState] = useState<DatePreset>(urlPreset);
  const [customRange, setCustomRangeState] = useState<{ start: number; end: number } | null>(
    urlPreset === "custom" && urlFrom && urlTo ? { start: urlFrom, end: urlTo } : null,
  );

  // Sync URL → state without writing when unchanged (defeats Convex/React loops).
  useEffect(() => {
    setPresetState((prev) => (prev === urlPreset ? prev : urlPreset));
    if (urlPreset === "custom" && urlFrom && urlTo) {
      setCustomRangeState((prev) =>
        prev && prev.start === urlFrom && prev.end === urlTo
          ? prev
          : { start: urlFrom, end: urlTo },
      );
    } else {
      setCustomRangeState((prev) => (prev === null ? prev : null));
    }
  }, [urlPreset, urlFrom, urlTo]);

  // Stable refs so the memoised setters don't restart subscribers each render.
  const searchParamsRef = useRef(searchParams);
  const pathnameRef = useRef(pathname);
  searchParamsRef.current = searchParams;
  pathnameRef.current = pathname;

  const writeUrl = useCallback(
    (newPreset: DatePreset, range?: { start: number; end: number } | null) => {
      const sp = searchParamsRef.current;
      const params = new URLSearchParams(sp.toString());
      if (newPreset === "30d") {
        params.delete("p");
      } else {
        params.set("p", newPreset);
      }
      if (newPreset === "custom" && range) {
        params.set("from", String(range.start));
        params.set("to", String(range.end));
      } else {
        params.delete("from");
        params.delete("to");
      }
      const qs = params.toString();
      router.replace(
        qs ? `${pathnameRef.current}?${qs}` : pathnameRef.current,
        { scroll: false },
      );
    },
    [router],
  );

  const setPreset = useCallback(
    (p: Exclude<DatePreset, "custom">) => {
      setPresetState(p);
      setCustomRangeState(null);
      writeUrl(p);
    },
    [writeUrl],
  );

  const setCustomRange = useCallback(
    (start: number, end: number) => {
      setPresetState("custom");
      setCustomRangeState({ start, end });
      writeUrl("custom", { start, end });
    },
    [writeUrl],
  );

  const { startDate, endDate } = useMemo(() => {
    if (preset === "custom" && customRange) {
      return { startDate: customRange.start, endDate: customRange.end };
    }
    const safePreset = (preset === "custom" ? "30d" : preset) as Exclude<DatePreset, "custom">;
    const r = computeRange(safePreset);
    return { startDate: r.start, endDate: r.end };
  }, [preset, customRange]);

  const value = useMemo<DateScopeValue>(
    () => ({ preset, startDate, endDate, setPreset, setCustomRange }),
    [preset, startDate, endDate, setPreset, setCustomRange],
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
