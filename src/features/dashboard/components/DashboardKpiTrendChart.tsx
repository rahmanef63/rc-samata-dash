"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MultiLineChart, type LineSeries, type ReferenceMark } from "@/shared/components";
import { itemVariants } from "@/shared/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateScope } from "../context/DateScopeContext";

type Tab = "foodCost" | "margin";

const TABS: { id: Tab; label: string; subtitle: string }[] = [
  { id: "foodCost", label: "Food Cost %", subtitle: "Biaya bahan terhadap omzet (lebih rendah lebih baik)" },
  { id: "margin", label: "Margin %", subtitle: "Laba kotor terhadap omzet (lebih tinggi lebih baik)" },
];

const FOOD_COST_KPI = "food_cost_pct";
const MARGIN_KPI = "gross_margin_pct";

export function DashboardKpiTrendChart() {
  const [tab, setTab] = useState<Tab>("foodCost");
  const { startDate, endDate, rangeLabel, granularity } = useDateScope();

  const trend = useQuery(
    api.features.reports.dashboardQueries.getFinancialTrend,
    { startDate, endDate },
  );
  const kpiData = useQuery(
    api.features.reports.kpiAnalytics.getKpiDashboardRich,
    { startDate, endDate, granularity },
  );

  const isLoading = !trend || !kpiData;
  const targetKpi = kpiData?.kpis.find(
    (k) => k.kpiCode === (tab === "foodCost" ? FOOD_COST_KPI : MARGIN_KPI),
  );

  const chartData = useMemo(() => {
    if (!trend) return [];
    return trend.map((p) => ({
      label: p.label,
      foodCostPct: p.foodCostPct,
      marginPct: p.marginPct,
    }));
  }, [trend]);

  const series: LineSeries[] = tab === "foodCost"
    ? [{ dataKey: "foodCostPct", name: "Food Cost %", color: "#ef4444" }]
    : [{ dataKey: "marginPct", name: "Margin %", color: "#10b981" }];

  const references: ReferenceMark[] = useMemo(() => {
    if (!targetKpi) return [];
    return [
      { y: targetKpi.target, label: `Target ${targetKpi.target}%`, color: "#0f172a" },
      { y: targetKpi.warningThreshold, label: `Warn ${targetKpi.warningThreshold}%`, color: "#f59e0b" },
      { y: targetKpi.dangerThreshold, label: `Danger ${targetKpi.dangerThreshold}%`, color: "#dc2626" },
      { y: targetKpi.ideal, label: `Ideal ${targetKpi.ideal}%`, color: "#0284c7", strokeDasharray: "2 4" },
    ];
  }, [targetKpi]);

  const tabConfig = TABS.find((t) => t.id === tab)!;

  return (
    <motion.div variants={itemVariants}>
      <div className="bg-card rounded-xl shadow-card p-4 md:p-5">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Tren KPI vs Target</h2>
            <p className="text-xs text-muted-foreground truncate">{rangeLabel}</p>
          </div>
          {targetKpi && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{tabConfig.label}</p>
              <p className="text-sm font-mono font-bold">
                {targetKpi.actual.toFixed(1)}%
              </p>
              <p className={`text-[11px] font-semibold ${
                targetKpi.status === "good"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : targetKpi.status === "warning"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}>
                {targetKpi.status === "good" ? "SEHAT" : targetKpi.status === "warning" ? "PERHATIAN" : "BAHAYA"}
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
            yFormatter={(n) => `${n}%`}
            tooltipFormatter={(v) => `${v.toFixed(1)}%`}
            references={references}
          />
        )}
      </div>
    </motion.div>
  );
}
