"use client";

import { motion } from "framer-motion";
import {
  DashboardKpiCards,
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
      className="p-4 md:p-6 space-y-6 max-w-[1400px]"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-lg font-semibold tracking-tight">Owner Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Kontrol penuh cabang Anda — omzet, kas, hutang, dan operasional.
        </p>
      </motion.div>

      {/* KPI Cards */}
      <DashboardKpiCards />

      {/* Petty Cash Requests */}
      <DashboardPettyCashRequests />

      {/* Chart + Transactions Grid */}
      <div className="grid lg:grid-cols-5 gap-4">
        <DashboardSalesChart />
        <DashboardRecentTransactions />
      </div>

      {/* 30 Day + Expense Charts */}
      <div className="grid lg:grid-cols-5 gap-4">
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Dashboard30DayChart />
        </motion.div>
        <DashboardExpenseChart />
      </div>

      {/* Cashflow Waterfall */}
      <DashboardCashflowChart />

      {/* Transaction Log Table */}
      <DashboardTransactionLog />
    </motion.div>
  );
}
