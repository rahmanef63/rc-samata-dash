"use client";

import { useQuery } from "convex/react";
import { Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useBranchScope } from "../context/BranchScopeContext";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRpFull } from "@/shared/lib";

export function DashboardCashRunway() {
  const { branchId, branches } = useBranchScope();
  const effectiveBranchId = branchId ?? branches?.[0]?._id;
  const data = useQuery(
    api.features.reports.dashboardQueries.getCashRunway,
    effectiveBranchId ? { branchId: effectiveBranchId } : "skip",
  );

  if (!data) {
    return (
      <Card className="p-5 space-y-3">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-12 w-full" />
      </Card>
    );
  }

  const runway = data.runwayDays;
  const isCritical = runway !== null && runway <= 7;
  const isWarning = runway !== null && runway <= 14 && !isCritical;

  const color = isCritical
    ? "text-rose-700 dark:text-rose-400"
    : isWarning
    ? "text-amber-700 dark:text-amber-400"
    : "text-emerald-700 dark:text-emerald-400";
  const bg = isCritical
    ? "bg-rose-50 dark:bg-rose-950/40"
    : isWarning
    ? "bg-amber-50 dark:bg-amber-950/40"
    : "bg-emerald-50 dark:bg-emerald-950/40";
  const Icon = isCritical || isWarning ? AlertTriangle : CheckCircle2;

  return (
    <Card className={`p-5 ${bg} border-0`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Cash Runway</h2>
        </div>
        {data.lastDate && (
          <span className="text-[10px] text-muted-foreground">
            per {data.lastDate}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={`flex items-center gap-1.5 text-2xl font-bold ${color}`}>
            <Icon className="h-5 w-5" />
            {runway === null ? "∞" : `${runway} hari`}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            sisa hari kas dengan rata-rata 30 hari terakhir
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Kas saat ini</p>
          <p className="text-sm font-mono-data font-semibold">
            {formatRpFull(data.currentCash)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Avg outflow: {formatRpFull(data.avgDailyOutflow)}/hari
          </p>
        </div>
      </div>
    </Card>
  );
}
