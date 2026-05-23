"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { containerVariants, itemVariants } from "@/features/dashboard";

const CARD_FALLBACK = <Skeleton className="h-48 w-full rounded-xl" />;
const TALL_FALLBACK = <Skeleton className="h-64 w-full rounded-xl" />;

const DashboardKpiRichGrid = dynamic(
  () => import("./DashboardKpiRichGrid").then((m) => m.DashboardKpiRichGrid),
  { loading: () => <Skeleton className="h-80 w-full rounded-xl" />, ssr: false },
);
const DashboardCashRunway = dynamic(
  () => import("./DashboardCashRunway").then((m) => m.DashboardCashRunway),
  { loading: () => CARD_FALLBACK, ssr: false },
);
const DashboardComparisonChart = dynamic(
  () => import("./DashboardComparisonChart").then((m) => m.DashboardComparisonChart),
  { loading: () => TALL_FALLBACK, ssr: false },
);
const DashboardKpiTrendChart = dynamic(
  () => import("./DashboardKpiTrendChart").then((m) => m.DashboardKpiTrendChart),
  { loading: () => TALL_FALLBACK, ssr: false },
);
const DashboardPettyCashRequests = dynamic(
  () => import("./DashboardPettyCashRequests").then((m) => m.DashboardPettyCashRequests),
  { loading: () => TALL_FALLBACK, ssr: false },
);
const DashboardExpenseChart = dynamic(
  () => import("./DashboardExpenseChart").then((m) => m.DashboardExpenseChart),
  { loading: () => TALL_FALLBACK, ssr: false },
);
const DashboardCashflowChart = dynamic(
  () => import("./DashboardCashflowChart").then((m) => m.DashboardCashflowChart),
  { loading: () => TALL_FALLBACK, ssr: false },
);
const DashboardRecentTransactions = dynamic(
  () => import("./DashboardRecentTransactions").then((m) => m.DashboardRecentTransactions),
  { loading: () => TALL_FALLBACK, ssr: false },
);
const DashboardTopProducts = dynamic(
  () => import("./DashboardTopProducts").then((m) => m.DashboardTopProducts),
  { loading: () => TALL_FALLBACK, ssr: false },
);
const DashboardTransactionLog = dynamic(
  () => import("./DashboardTransactionLog").then((m) => m.DashboardTransactionLog),
  { loading: () => TALL_FALLBACK, ssr: false },
);
const DashboardAnalysisDrill = dynamic(
  () => import("./DashboardAnalysisDrill").then((m) => m.DashboardAnalysisDrill),
  { loading: () => TALL_FALLBACK, ssr: false },
);

export default function DashboardPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-6 max-w-[1400px] mx-auto"
    >
      <motion.div variants={itemVariants} className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Dashboard Owner</h1>
        <p className="text-sm text-muted-foreground">
          Kontrol penuh cabang Anda — KPI, grafik, dan detail analisis dalam satu halaman.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Rich KPI grid — 10 cards w/ value, delta vs prev period, avg, ideal, target */}
        <div className="lg:col-span-12">
          <DashboardKpiRichGrid />
        </div>

        <div className="lg:col-span-12">
          <DashboardCashRunway />
        </div>

        <div className="lg:col-span-8">
          <DashboardComparisonChart />
        </div>
        <div className="lg:col-span-4">
          <DashboardPettyCashRequests />
        </div>

        <div className="lg:col-span-8">
          <DashboardKpiTrendChart />
        </div>
        <div className="lg:col-span-4">
          <DashboardExpenseChart />
        </div>

        <div className="lg:col-span-7">
          <DashboardCashflowChart />
        </div>
        <div className="lg:col-span-5">
          <DashboardRecentTransactions />
        </div>

        <div className="lg:col-span-12">
          <DashboardTopProducts />
        </div>

        <div className="lg:col-span-12">
          <DashboardAnalysisDrill />
        </div>

        <div className="lg:col-span-12">
          <DashboardTransactionLog />
        </div>
      </div>
    </motion.div>
  );
}
