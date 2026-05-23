"use client";

import { useQuery } from "convex/react";
import { TrendingUp } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatRpFull } from "@/shared/lib";

const STATUS_COLORS: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export function DashboardTopProducts() {
  const items = useQuery(
    api.features.reports.analytics.getProductProfitability,
    { timeFilter: "monthly" },
  );

  if (!items) {
    return (
      <Card className="p-5 space-y-3">
        <Skeleton className="h-5 w-44" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </Card>
    );
  }

  const top10 = [...items]
    .filter((i) => i.totalQtySold > 0)
    .sort((a, b) => b.totalProfit - a.totalProfit)
    .slice(0, 10);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Top 10 Produk (Profit)</h2>
        </div>
        <span className="text-xs text-muted-foreground">Bulan ini</span>
      </div>

      {top10.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Belum ada data penjualan untuk periode ini.
        </p>
      ) : (
        <div className="space-y-1.5">
          {top10.map((p, i) => (
            <div
              key={p.productName + i}
              className="flex items-center gap-3 py-2 border-b last:border-b-0"
            >
              <span className="text-xs font-mono text-muted-foreground w-5 text-right">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.productName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {p.totalQtySold.toLocaleString("id-ID")} qty · margin {p.marginPct.toFixed(1)}%
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono-data font-semibold">
                  {formatRpFull(p.totalProfit)}
                </p>
                <Badge className={`${STATUS_COLORS[p.status] ?? ""} text-[9px] uppercase mt-0.5`}>
                  {p.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
