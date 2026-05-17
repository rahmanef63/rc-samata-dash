"use client";

import { motion } from "framer-motion";
import {
  DashboardKpiCards,
  DashboardKpiTargets,
  DashboardPettyCashRequests,
  DashboardSalesChart,
  DashboardRecentTransactions,
  DashboardTransactionLog,
  DashboardExpenseChart,
  DashboardCashflowChart,
  Dashboard30DayChart,
  containerVariants,
  itemVariants,
} from "@/features/dashboard";

export default function DashboardPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-6 max-w-[1400px] mx-auto"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Dashboard Owner</h1>
        <p className="text-sm text-muted-foreground">
          Kontrol penuh cabang Anda — omzet, kas, hutang, dan operasional.
        </p>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* KPI Cards — full width */}
        <div className="lg:col-span-12">
          <DashboardKpiCards />
        </div>

        {/* KPI Target vs Aktual — full width */}
        <div className="lg:col-span-12">
          <DashboardKpiTargets />
        </div>

        {/* Row 2: Sales chart + Petty Cash */}
        <div className="lg:col-span-8">
          <DashboardSalesChart />
        </div>
        <div className="lg:col-span-4">
          <DashboardPettyCashRequests />
        </div>

        {/* Row 3: 30-day trend + Expense pie */}
        <div className="lg:col-span-8">
          <Dashboard30DayChart />
        </div>
        <div className="lg:col-span-4">
          <DashboardExpenseChart />
        </div>

        {/* Row 4: Cashflow waterfall + Recent Transactions */}
        <div className="lg:col-span-7">
          <DashboardCashflowChart />
        </div>
        <div className="lg:col-span-5">
          <DashboardRecentTransactions />
        </div>

        {/* Row 5: Transaction Log — full width */}
        <div className="lg:col-span-12">
          <DashboardTransactionLog />
        </div>
      </div>
    </motion.div>
  );
}
