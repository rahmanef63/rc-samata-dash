"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { PieChartCard } from "@/shared/components";
import { itemVariants } from "@/shared/constants";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardExpenseChart() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  const expenseData = useQuery(
    api.features.reports.dashboardQueries.getExpenseBreakdown,
    branchId ? { branchId } : "skip",
  );

  if (!expenseData) {
    return (
      <motion.div variants={itemVariants} className="lg:col-span-2">
        <div className="bg-card rounded-xl shadow-card p-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
      </motion.div>
    );
  }

  if (expenseData.length === 0) {
    return (
      <motion.div variants={itemVariants} className="lg:col-span-2">
        <div className="bg-card rounded-xl shadow-card p-5">
          <h2 className="text-sm font-semibold mb-2">Expense by Category</h2>
          <p className="text-sm text-muted-foreground py-8 text-center">
            Belum ada data expense.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants} className="lg:col-span-2">
      <PieChartCard
        data={expenseData}
        title="Expense by Category"
        subtitle="Berdasarkan laporan yang di-upload"
        height={200}
      />
    </motion.div>
  );
}
