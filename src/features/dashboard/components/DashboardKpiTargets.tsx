"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { Target, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useBranchScope } from "../context/BranchScopeContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { formatRpFull } from "@/shared/lib";

type KpiStatus = "good" | "warning" | "danger";

const STATUS_STYLE: Record<KpiStatus, { dot: string; bg: string; text: string }> = {
  good: { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400" },
  warning: { dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400" },
  danger: { dot: "bg-rose-500", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-400" },
};

function formatActual(value: number, unit: string): string {
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit === "Rp") return formatRpFull(value);
  if (unit === "ratio") return value.toFixed(2);
  if (unit === "x") return `${value.toFixed(1)}x`;
  if (unit === "hari") return `${value} hari`;
  return String(value);
}

export function DashboardKpiTargets() {
  const { branchId } = useBranchScope();
  const data = useQuery(
    api.features.reports.kpiAnalytics.getKPIDashboard,
    branchId ? { branchId, timeFilter: "monthly" } : "skip",
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
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

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold tracking-tight">KPI Target vs Aktual (Bulan ini)</h2>
        <Link
          href="/laporan/analisis"
          className="text-xs text-muted-foreground hover:text-primary"
        >
          Detail →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {data.kpis.map((k) => {
          const style = STATUS_STYLE[k.status as KpiStatus];
          const TrendIcon =
            k.direction === "lower_is_better" ? TrendingDown : TrendingUp;
          return (
            <Card key={k.kpiCode} className={`p-3 ${style.bg} border-0`}>
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground line-clamp-1">
                  {k.kpiLabel}
                </span>
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot} shrink-0 mt-1`} />
              </div>
              <div className={`text-lg font-bold ${style.text}`}>
                {formatActual(k.actual, k.unit)}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                <TrendIcon className="h-2.5 w-2.5" />
                <span>Target: {formatActual(k.target, k.unit)}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
