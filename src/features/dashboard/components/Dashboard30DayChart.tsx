"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AreaChartCard } from "@/shared/components";
import { itemVariants } from "@/shared/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateRange, formatShortDate } from "@/shared/lib";
import { useBranchScope } from "../context/BranchScopeContext";

export function Dashboard30DayChart() {
  const { branchId: scopeBranchId, branches } = useBranchScope();
  const branchId = scopeBranchId ?? branches?.[0]?._id;
  const monthlyTrend = useQuery(
    api.features.reports.dashboardQueries.getMonthlySalesTrend,
    branchId ? { branchId } : "skip",
  );

  if (!monthlyTrend) {
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
          <h2 className="text-sm font-semibold mb-2">Omzet 30 Hari Terakhir</h2>
          <p className="text-sm text-muted-foreground py-8 text-center">
            Belum ada data kas periode.
          </p>
        </div>
      </motion.div>
    );
  }

  const chartData = monthlyTrend.map((point) => ({
    ...point,
    label: formatShortDate(point.date),
  }));
  const dateRange = formatDateRange(monthlyTrend[0].date, monthlyTrend[monthlyTrend.length - 1].date);

  return (
    <motion.div variants={itemVariants}>
      <AreaChartCard
        data={chartData}
        title="Omzet 30 Hari Terakhir"
        subtitle={dateRange}
        height={200}
        gradientId="sales30Gradient"
        tooltipLabel="Omzet"
        fitRange
      />
    </motion.div>
  );
}
