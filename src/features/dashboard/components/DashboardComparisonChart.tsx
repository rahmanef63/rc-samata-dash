"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MultiLineChart, type LineSeries } from "@/shared/components";
import { itemVariants } from "@/shared/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateScope, type DateGranularity } from "../context/DateScopeContext";
import { formatRp, formatRpFull } from "@/shared/lib";

type Tab = "omzet" | "biaya" | "profit" | "pelanggan";

const TABS: { id: Tab; label: string; subtitle: string }[] = [
  { id: "omzet", label: "Omzet", subtitle: "Total pendapatan kotor per hari" },
  { id: "biaya", label: "Biaya Bahan", subtitle: "COGS dari food cost summary" },
  { id: "profit", label: "Profit", subtitle: "Omzet dikurangi biaya bahan" },
  { id: "pelanggan", label: "Pelanggan", subtitle: "Jumlah transaksi/pelanggan" },
];

const CURRENT_COLOR = "#10b981"; // emerald
const PRIOR_COLOR = "#94a3b8"; // slate-400, dashed

function shiftRange(
  granularity: DateGranularity,
  startMs: number,
  endMs: number,
): { start: number; end: number } {
  if (granularity === "day" || granularity === "week") {
    const span = endMs - startMs;
    return { start: startMs - span, end: startMs };
  }
  if (granularity === "month") {
    const s = new Date(startMs);
    const e = new Date(endMs);
    return {
      start: new Date(s.getFullYear(), s.getMonth() - 1, s.getDate()).getTime(),
      end: new Date(e.getFullYear(), e.getMonth() - 1, e.getDate()).getTime(),
    };
  }
  if (granularity === "quarter") {
    const s = new Date(startMs);
    const e = new Date(endMs);
    return {
      start: new Date(s.getFullYear(), s.getMonth() - 3, s.getDate()).getTime(),
      end: new Date(e.getFullYear(), e.getMonth() - 3, e.getDate()).getTime(),
    };
  }
  const s = new Date(startMs);
  const e = new Date(endMs);
  return {
    start: new Date(s.getFullYear() - 1, s.getMonth(), s.getDate()).getTime(),
    end: new Date(e.getFullYear() - 1, e.getMonth(), e.getDate()).getTime(),
  };
}

export function DashboardComparisonChart() {
  const [tab, setTab] = useState<Tab>("omzet");
  const { startDate, endDate, granularity, rangeLabel } = useDateScope();

  const prior = useMemo(
    () => shiftRange(granularity, startDate, endDate),
    [granularity, startDate, endDate],
  );

  const current = useQuery(
    api.features.reports.dashboardQueries.getFinancialTrend,
    { startDate, endDate },
  );
  const priorData = useQuery(
    api.features.reports.dashboardQueries.getFinancialTrend,
    { startDate: prior.start, endDate: prior.end },
  );

  const isLoading = !current || !priorData;

  // Align by index — overlay 2 lines on same x-axis (current's date labels).
  const chartData = useMemo(() => {
    if (!current) return [];
    const N = Math.max(current.length, priorData?.length ?? 0);
    return Array.from({ length: N }, (_, i) => {
      const c = current[i];
      const p = priorData?.[i];
      return {
        label: c?.label ?? p?.label ?? `${i + 1}`,
        currentRevenue: c?.revenue ?? 0,
        priorRevenue: p?.revenue ?? 0,
        currentCogs: c?.cogs ?? 0,
        priorCogs: p?.cogs ?? 0,
        currentProfit: c?.profit ?? 0,
        priorProfit: p?.profit ?? 0,
        currentCustomers: c?.customers ?? 0,
        priorCustomers: p?.customers ?? 0,
      };
    });
  }, [current, priorData]);

  const tabConfig = TABS.find((t) => t.id === tab)!;

  const series: LineSeries[] = useMemo(() => {
    const priorDash = "5 5";
    if (tab === "omzet")
      return [
        { dataKey: "currentRevenue", name: "Sekarang", color: CURRENT_COLOR },
        { dataKey: "priorRevenue", name: "Periode lalu", color: PRIOR_COLOR, strokeDasharray: priorDash },
      ];
    if (tab === "biaya")
      return [
        { dataKey: "currentCogs", name: "Sekarang", color: "#ef4444" },
        { dataKey: "priorCogs", name: "Periode lalu", color: PRIOR_COLOR, strokeDasharray: priorDash },
      ];
    if (tab === "profit")
      return [
        { dataKey: "currentProfit", name: "Sekarang", color: "#3b82f6" },
        { dataKey: "priorProfit", name: "Periode lalu", color: PRIOR_COLOR, strokeDasharray: priorDash },
      ];
    return [
      { dataKey: "currentCustomers", name: "Sekarang", color: "#a855f7" },
      { dataKey: "priorCustomers", name: "Periode lalu", color: PRIOR_COLOR, strokeDasharray: priorDash },
    ];
  }, [tab]);

  // Delta summary current vs prior totals
  const totals = useMemo(() => {
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    if (!current || !priorData) return null;
    const map = (key: "revenue" | "cogs" | "profit" | "customers") => ({
      curr: sum(current.map((c) => c[key])),
      prior: sum(priorData.map((p) => p[key])),
    });
    const k = tab === "omzet" ? "revenue" : tab === "biaya" ? "cogs" : tab === "profit" ? "profit" : "customers";
    const { curr, prior: pr } = map(k);
    const delta = pr !== 0 ? ((curr - pr) / Math.abs(pr)) * 100 : null;
    return { curr, prior: pr, delta };
  }, [current, priorData, tab]);

  return (
    <motion.div variants={itemVariants}>
      <div className="bg-card rounded-xl shadow-card p-4 md:p-5">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Perbandingan Periode</h2>
            <p className="text-xs text-muted-foreground truncate">
              {rangeLabel} · vs periode sebelumnya
            </p>
          </div>
          {totals && totals.delta !== null && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total {tabConfig.label}</p>
              <p className="text-sm font-mono font-bold">
                {tab === "pelanggan" ? totals.curr.toLocaleString("id-ID") : formatRpFull(totals.curr)}
              </p>
              <p
                className={`text-[11px] font-semibold ${
                  totals.delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {totals.delta >= 0 ? "+" : ""}{totals.delta.toFixed(1)}% vs periode lalu
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-1 mb-3 overflow-x-auto border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mb-2">{tabConfig.subtitle}</p>

        {isLoading ? (
          <Skeleton className="h-[260px] w-full rounded-lg" />
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            Belum ada data pada periode ini.
          </p>
        ) : (
          <MultiLineChart
            data={chartData}
            series={series}
            height={260}
            yFormatter={tab === "pelanggan" ? (n) => n.toLocaleString("id-ID") : formatRp}
            tooltipFormatter={(v) => (tab === "pelanggan" ? v.toLocaleString("id-ID") : formatRpFull(v))}
          />
        )}
      </div>
    </motion.div>
  );
}
