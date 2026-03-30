"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AreaChartCard } from "@/shared/components";
import { itemVariants } from "@/shared/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateRange, formatShortDate } from "@/shared/lib";

export function DashboardSalesChart() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  const salesTrend = useQuery(
    api.features.reports.dashboardQueries.getWeeklySalesTrend,
    branchId ? { branchId } : "skip",
  );

  if (!salesTrend) {
    return (
      <motion.div variants={itemVariants}>
        <div className="bg-card rounded-xl shadow-card p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-[220px] w-full rounded-lg" />
        </div>
      </motion.div>
    );
  }

  if (salesTrend.length === 0) {
    return (
      <motion.div variants={itemVariants}>
        <div className="bg-card rounded-xl shadow-card p-5">
          <h2 className="text-sm font-semibold mb-2">Sales Last 7 Days</h2>
          <p className="text-sm text-muted-foreground py-8 text-center">
            Belum ada data penjualan. Upload laporan mingguan terlebih dahulu.
          </p>
        </div>
      </motion.div>
    );
  }

  const chartData = salesTrend.map((point) => ({
    ...point,
    label: formatShortDate(point.date),
  }));
  const dateRange = formatDateRange(salesTrend[0].date, salesTrend[salesTrend.length - 1].date);

  return (
    <motion.div variants={itemVariants}>
      <AreaChartCard
        data={chartData}
        title="Penjualan 7 Hari Terakhir"
        subtitle={dateRange}
        height={220}
        gradientId="salesGradient"
        tooltipLabel="Penjualan"
        fitRange
      />
    </motion.div>
  );
}
