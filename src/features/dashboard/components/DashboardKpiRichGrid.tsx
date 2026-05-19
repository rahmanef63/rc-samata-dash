"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus, Target, AlertTriangle } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useBranchScope } from "../context/BranchScopeContext";
import { useDateScope } from "../context/DateScopeContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { formatRpFull } from "@/shared/lib";

type KpiStatus = "good" | "warning" | "danger";

const STATUS_STYLE: Record<KpiStatus, { ring: string; bg: string; text: string; chip: string; barFill: string }> = {
  good: {
    ring: "ring-emerald-200 dark:ring-emerald-900",
    bg: "bg-emerald-50/60 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    barFill: "bg-emerald-500",
  },
  warning: {
    ring: "ring-amber-200 dark:ring-amber-900",
    bg: "bg-amber-50/60 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    barFill: "bg-amber-500",
  },
  danger: {
    ring: "ring-rose-200 dark:ring-rose-900",
    bg: "bg-rose-50/60 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
    barFill: "bg-rose-500",
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
    <Card className={`p-3.5 ring-1 ${style.ring} ${style.bg} border-0`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
            {kpi.kpiLabel}
          </p>
          <p className={`text-2xl font-bold font-mono mt-0.5 ${style.text}`}>
            {formatValue(kpi.actual, kpi.unit)}
          </p>
        </div>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${style.chip}`}>
          {kpi.status === "good" ? "SEHAT" : kpi.status === "warning" ? "PERHATIAN" : "BAHAYA"}
        </span>
      </div>

      {/* Delta row */}
      <div className={`flex items-center gap-1 mt-1.5 text-[11px] font-medium ${sentiment.color}`}>
        <Arrow className="h-3 w-3" />
        <span>
          {kpi.deltaPct === null
            ? "—"
            : `${sentiment.sign}${kpi.deltaPct.toFixed(1)}%`}
        </span>
        <span className="text-[10px] text-muted-foreground font-normal ml-0.5">
          {periodLabel}
        </span>
      </div>

      {/* Gauge bar with ideal/target markers */}
      <div className="relative mt-2 mb-1.5 h-1.5 rounded-full bg-muted overflow-visible">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${style.barFill}`}
          style={{ width: `${pct}%` }}
        />
        {/* Ideal marker */}
        <div
          className="absolute -top-0.5 h-2.5 w-0.5 bg-blue-500"
          style={{ left: `${idealPct}%` }}
          title={`Ideal: ${formatValue(kpi.ideal, kpi.unit)}`}
        />
        {/* Target marker */}
        <div
          className="absolute -top-0.5 h-2.5 w-0.5 bg-foreground"
          style={{ left: `${targetPct}%` }}
          title={`Target: ${formatValue(kpi.target, kpi.unit)}`}
        />
      </div>

      {/* Numbers row */}
      <div className="grid grid-cols-3 gap-1 text-[10px] mt-1.5">
        <div>
          <p className="text-muted-foreground">Avg</p>
          <p className="font-semibold font-mono">{formatValue(kpi.average, kpi.unit)}</p>
        </div>
        <div>
          <p className="text-blue-600 dark:text-blue-400">Ideal</p>
          <p className="font-semibold font-mono">{formatValue(kpi.ideal, kpi.unit)}</p>
        </div>
        <div>
          <p className="text-foreground/80">Target</p>
          <p className="font-semibold font-mono">{formatValue(kpi.target, kpi.unit)}</p>
        </div>
      </div>
    </Card>
  );
}

export function DashboardKpiRichGrid() {
  const { branchId } = useBranchScope();
  const { granularity, startDate, endDate, rangeLabel } = useDateScope();

  const data = useQuery(
    api.features.reports.kpiAnalytics.getKpiDashboardRich,
    branchId ? { branchId, startDate, endDate, granularity } : "skip",
  );

  if (!branchId) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Target className="h-4 w-4" />
          KPI target tidak tersedia untuk mode &quot;Semua cabang&quot; — pilih satu cabang.
        </div>
      </Card>
    );
  }

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
