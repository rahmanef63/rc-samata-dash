"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AreaChartCard } from "@/shared/components";
import { itemVariants } from "@/shared/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/shared/lib";
import { useUserRole } from "@/features/auth/useUserRole";
import { useBranchScope } from "../context/BranchScopeContext";
import { useDateScope } from "../context/DateScopeContext";
import { useFilteredByDate } from "@/shared/hooks";

export function DashboardSalesChart() {
  const isOwner = useUserRole() === "owner";
  const { branchId: scopeBranchId, branches } = useBranchScope();
  const { rangeLabel, setGranularity, startDate, endDate } = useDateScope();
  const branchId = scopeBranchId ?? branches?.[0]?._id;
  const rawSalesTrend = useQuery(
    api.features.reports.dashboardQueries.getWeeklySalesTrend,
    branchId ? { branchId, startDate, endDate } : "skip",
  );
  const salesTrend = useFilteredByDate(rawSalesTrend, "date");

  if (!rawSalesTrend) {
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
          <h2 className="text-sm font-semibold mb-2">Tren Penjualan</h2>
          <p className="text-sm text-muted-foreground py-6 text-center">
            {rawSalesTrend.length === 0
              ? isOwner
                ? "Belum ada data penjualan."
                : "Belum ada data penjualan. Upload laporan mingguan terlebih dahulu."
              : `Tidak ada penjualan pada ${rangeLabel}.`}
          </p>
          {rawSalesTrend.length > 0 && (
            <div className="text-center">
              <button
                onClick={() => setGranularity("month")}
                className="text-xs text-primary font-medium hover:underline"
              >
                Lihat per bulan →
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  const chartData = salesTrend.map((point) => ({
    ...point,
    label: formatShortDate(point.date),
  }));

  return (
    <motion.div variants={itemVariants}>
      <AreaChartCard
        data={chartData}
        title="Tren Penjualan"
        subtitle={`${rangeLabel} · ${salesTrend.length} titik data`}
        height={220}
        gradientId="salesGradient"
        tooltipLabel="Penjualan"
        fitRange
      />
    </motion.div>
  );
}
