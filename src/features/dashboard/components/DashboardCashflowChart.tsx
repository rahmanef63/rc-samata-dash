"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { WaterfallChart } from "@/shared/components";
import { itemVariants } from "@/shared/constants";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardCashflowChart() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  const waterfallData = useQuery(
    api.features.reports.dashboardQueries.getCashflowWaterfall,
    branchId ? { branchId } : "skip",
  );

  if (!waterfallData) {
    return (
      <motion.div variants={itemVariants}>
        <div className="bg-card rounded-xl shadow-card p-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-[240px] w-full rounded-lg" />
        </div>
      </motion.div>
    );
  }

  if (waterfallData.length === 0 || waterfallData.every((d) => d.value === 0)) {
    return (
      <motion.div variants={itemVariants}>
        <div className="bg-card rounded-xl shadow-card p-5">
          <h2 className="text-sm font-semibold mb-2">Ringkasan Arus Kas</h2>
          <p className="text-sm text-muted-foreground py-8 text-center">
            Belum ada data cash flow.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants}>
      <WaterfallChart
        data={waterfallData}
        title="Ringkasan Arus Kas"
        subtitle="Pendapatan → Laba Bersih"
        height={240}
      />
    </motion.div>
  );
}
