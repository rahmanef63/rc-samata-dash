"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus, AlertTriangle } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useDateScope } from "../context/DateScopeContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { formatRpFull } from "@/shared/lib";

type KpiStatus = "good" | "warning" | "danger";

const STATUS_STYLE: Record<KpiStatus, { accent: string; chip: string; barFill: string; label: string }> = {
  good: {
    accent: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
    barFill: "bg-emerald-500",
    label: "SEHAT",
  },
  warning: {
    accent: "bg-amber-500",
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
    barFill: "bg-amber-500",
    label: "PERHATIAN",
  },
  danger: {
    accent: "bg-rose-500",
    chip: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100",
    barFill: "bg-rose-500",
    label: "BAHAYA",
  },
};

const PREV_LABEL: Record<string, string> = {
  day: "vs kemarin",
  week: "vs minggu lalu",
  month: "vs bulan lalu",
  quarter: "vs kuartal lalu",
  year: "vs tahun lalu",
};

function formatValue(value: number, unit: string): string {
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit === "Rp") return formatRpFull(value);
  if (unit === "ratio") return value.toFixed(2);
  if (unit === "x") return `${value.toFixed(1)}x`;
  if (unit === "hari") return `${value} hari`;
  return String(value);
}

function deltaSentiment(
  delta: number | null,
  direction: "lower_is_better" | "higher_is_better",
): { color: string; Icon: typeof ArrowUpRight; sign: string } {
  if (delta === null || Math.abs(delta) < 0.05) {
    return { color: "text-muted-foreground", Icon: Minus, sign: "" };
  }
  const goodWhenDown = direction === "lower_is_better";
  const up = delta > 0;
  const isGood = up ? !goodWhenDown : goodWhenDown;
  return {
    color: isGood
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400",
    Icon: up ? ArrowUpRight : ArrowDownRight,
    sign: up ? "+" : "",
  };
}

type Kpi = {
  kpiCode: string;
  kpiLabel: string;
  unit: string;
  direction: "lower_is_better" | "higher_is_better";
  actual: number;
  prior: number;
  average: number;
  ideal: number;
  target: number;
  warningThreshold: number;
  dangerThreshold: number;
  deltaPct: number | null;
  status: KpiStatus;
};

function KpiRichCard({ kpi, periodLabel }: { kpi: Kpi; periodLabel: string }) {
  const style = STATUS_STYLE[kpi.status];
  const sentiment = deltaSentiment(kpi.deltaPct, kpi.direction);
  const Arrow = sentiment.Icon;

  // Progress bar: actual vs gauge max (1.2x of target or danger threshold).
  const gaugeMax = kpi.direction === "lower_is_better"
    ? kpi.dangerThreshold * 1.2
    : kpi.target * 1.2;
  const pct = gaugeMax > 0 ? Math.min(100, (kpi.actual / gaugeMax) * 100) : 0;
  // Marker positions
  const idealPct = gaugeMax > 0 ? Math.min(100, (kpi.ideal / gaugeMax) * 100) : 0;
  const targetPct = gaugeMax > 0 ? Math.min(100, (kpi.target / gaugeMax) * 100) : 0;

  return (
    <Card className="relative overflow-hidden p-4 border bg-card hover:shadow-md transition-shadow">
      {/* Status accent: vertical bar on left edge */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.accent}`} />

      <div className="flex items-start justify-between gap-2 pl-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">
          {kpi.kpiLabel}
        </p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${style.chip}`}>
          {style.label}
        </span>
      </div>

      <p className="pl-1 mt-1 text-3xl font-bold font-mono tracking-tight text-foreground">
        {formatValue(kpi.actual, kpi.unit)}
      </p>

      {/* Delta row */}
      <div className={`pl-1 flex items-center gap-1 mt-1 text-xs font-semibold ${sentiment.color}`}>
        <Arrow className="h-3.5 w-3.5" />
        <span>
          {kpi.deltaPct === null
            ? "—"
            : `${sentiment.sign}${kpi.deltaPct.toFixed(1)}%`}
        </span>
        <span className="text-[11px] text-muted-foreground font-normal ml-0.5">
          {periodLabel}
        </span>
      </div>

      {/* Gauge bar with ideal/target markers */}
      <div className="pl-1 mt-3 mb-1">
        <div className="relative h-1.5 rounded-full bg-muted overflow-visible">
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${style.barFill}`}
            style={{ width: `${pct}%` }}
          />
          {/* Ideal marker (industry std) */}
          <div
            className="absolute -top-1 h-3.5 w-0.5 bg-sky-600 dark:bg-sky-400"
            style={{ left: `${idealPct}%` }}
            title={`Ideal: ${formatValue(kpi.ideal, kpi.unit)}`}
          />
          {/* Target marker (branch) */}
          <div
            className="absolute -top-1 h-3.5 w-0.5 bg-foreground"
            style={{ left: `${targetPct}%` }}
            title={`Target: ${formatValue(kpi.target, kpi.unit)}`}
          />
        </div>
      </div>

      {/* Avg / Ideal / Target row */}
      <div className="pl-1 grid grid-cols-3 gap-1 text-xs mt-2 border-t pt-2">
        <div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase">Avg</p>
          <p className="font-bold font-mono text-foreground text-sm">{formatValue(kpi.average, kpi.unit)}</p>
        </div>
        <div>
          <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium uppercase">Ideal</p>
          <p className="font-bold font-mono text-foreground text-sm">{formatValue(kpi.ideal, kpi.unit)}</p>
        </div>
        <div>
          <p className="text-[10px] text-foreground/70 font-medium uppercase">Target</p>
          <p className="font-bold font-mono text-foreground text-sm">{formatValue(kpi.target, kpi.unit)}</p>
        </div>
      </div>
    </Card>
  );
}

export function DashboardKpiRichGrid() {
  const { granularity, startDate, endDate, rangeLabel } = useDateScope();

  const data = useQuery(
    api.features.reports.kpiAnalytics.getKpiDashboardRich,
    { startDate, endDate, granularity },
  );

  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data.hasTargets || data.kpis.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Target KPI belum di-seed untuk cabang ini.
          </div>
          <Link
            href="/operation/kpi-targets"
            className="text-primary hover:underline text-xs font-medium"
          >
            Atur target →
          </Link>
        </div>
      </Card>
    );
  }

  const periodLabel = PREV_LABEL[granularity] ?? "vs periode lalu";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">KPI · {rangeLabel}</h2>
          <p className="text-[11px] text-muted-foreground">
            Aktual · Δ {periodLabel} · rata-rata · ideal (industri) · target (cabang)
          </p>
        </div>
        <Link
          href="/operation/kpi-targets"
          className="text-xs text-muted-foreground hover:text-primary"
        >
          Atur target →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {data.kpis.map((k) => (
          <KpiRichCard key={k.kpiCode} kpi={k as Kpi} periodLabel={periodLabel} />
        ))}
      </div>
    </div>
  );
}
