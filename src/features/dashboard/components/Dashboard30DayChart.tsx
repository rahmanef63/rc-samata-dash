"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AreaChartCard } from "@/shared/components";
import { itemVariants } from "@/shared/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/shared/lib";
import { useBranchScope } from "../context/BranchScopeContext";
import { useDateScope } from "../context/DateScopeContext";
import { useFilteredByDate } from "@/shared/hooks";

export function Dashboard30DayChart() {
  const { branchId: scopeBranchId, branches } = useBranchScope();
  const { rangeLabel, setGranularity } = useDateScope();
  const branchId = scopeBranchId ?? branches?.[0]?._id;
  const rawMonthlyTrend = useQuery(
    api.features.reports.dashboardQueries.getMonthlySalesTrend,
    branchId ? { branchId } : "skip",
  );
  const monthlyTrend = useFilteredByDate(rawMonthlyTrend, "date");

  if (!rawMonthlyTrend) {
    return (
      <motion.div variants={itemVariants}>
        <div className="bg-card rounded-xl shadow-card p-5 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
      </motion.div>
    );
  }

  if (monthlyTrend.length === 0) {
    return (
      <motion.div variants={itemVariants}>
        <div className="bg-card rounded-xl shadow-card p-5">
          <h2 className="text-sm font-semibold mb-2">Tren Omzet</h2>
          <p className="text-sm text-muted-foreground py-6 text-center">
            {rawMonthlyTrend.length === 0
              ? "Belum ada data kas periode."
              : `Tidak ada omzet pada ${rangeLabel}.`}
          </p>
          {rawMonthlyTrend.length > 0 && (
            <div className="text-center">
              <button
                onClick={() => setGranularity("quarter")}
                className="text-xs text-primary font-medium hover:underline"
              >
                Lihat per kuartal →
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  const chartData = monthlyTrend.map((point) => ({
    ...point,
    label: formatShortDate(point.date),
  }));

  return (
    <motion.div variants={itemVariants}>
      <AreaChartCard
        data={chartData}
        title="Tren Omzet"
        subtitle={`${rangeLabel} · ${monthlyTrend.length} titik data`}
        height={200}
        gradientId="sales30Gradient"
        tooltipLabel="Omzet"
        fitRange
      />
    </motion.div>
  );
}
