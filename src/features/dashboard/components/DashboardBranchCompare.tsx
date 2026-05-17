"use client";

import { useQuery } from "convex/react";
import { Building2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatRpFull } from "@/shared/lib";

const FC_BAD = 42;
const FC_WARN = 38;

function fcColor(pct: number): string {
  if (pct === 0) return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  if (pct <= 33) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  if (pct <= FC_WARN) return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
  if (pct < FC_BAD) return "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300";
  return "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
}

export function DashboardBranchCompare() {
  const rows = useQuery(api.features.reports.dashboardQueries.getBranchComparison);

  if (!rows) {
    return (
      <Card className="p-5 space-y-3">
        <Skeleton className="h-5 w-44" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </Card>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  // Find max revenue for bar scaling
  const maxRevenue = Math.max(...rows.map((r) => r.revenue), 1);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Bandingkan Cabang</h2>
        </div>
        <span className="text-xs text-muted-foreground">4 minggu terakhir</span>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.branchId}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-medium truncate">{r.branchName}</p>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={`${fcColor(r.foodCostPct)} text-[10px] uppercase`}>
                  FC {r.foodCostPct.toFixed(1)}%
                </Badge>
                <span className="text-xs font-mono-data text-muted-foreground">
                  Profit {r.profitMarginPct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(r.revenue / maxRevenue) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
              <span>Omzet: {formatRpFull(r.revenue)}</span>
              <span>COGS: {formatRpFull(r.cogs)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
