"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DashboardKpiCards,
  containerVariants,
  itemVariants,
} from "@/features/dashboard";

// Lazy-loaded cards — each fetches its own Convex queries on mount.
// Splitting reduces initial JS, isolates errors per card (one broken
// card no longer takes the whole dashboard down), and lets the skeleton
// fallback show until each card's data is ready.
const CARD_FALLBACK = <Skeleton className="h-48 w-full rounded-xl" />;
const TALL_FALLBACK = <Skeleton className="h-64 w-full rounded-xl" />;

const DashboardKpiTargets = dynamic(
  () => import("./DashboardKpiTargets").then((m) => m.DashboardKpiTargets),
  { loading: () => CARD_FALLBACK, ssr: false },
);
const DashboardBranchCompare = dynamic(
  () => import("./DashboardBranchCompare").then((m) => m.DashboardBranchCompare),
  { loading: () => TALL_FALLBACK, ssr: false },
);
const DashboardCashRunway = dynamic(
  () => import("./DashboardCashRunway").then((m) => m.DashboardCashRunway),
  { loading: () => CARD_FALLBACK, ssr: false },
);
const DashboardSalesChart = dynamic(
  () => import("./DashboardSalesChart").then((m) => m.DashboardSalesChart),
  { loading: () => TALL_FALLBACK, ssr: false },
);
const DashboardPettyCashRequests = dynamic(
  () => import("./DashboardPettyCashRequests").then((m) => m.DashboardPettyCashRequests),
  { loading: () => TALL_FALLBACK, ssr: false },
);
const Dashboard30DayChart = dynamic(
  () => import("./Dashboard30DayChart").then((m) => m.Dashboard30DayChart),
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
          Kontrol penuh cabang Anda — omzet, kas, hutang, dan operasional.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-12">
          <DashboardKpiCards />
        </div>

        <div className="lg:col-span-12">
          <DashboardKpiTargets />
        </div>

        <div className="lg:col-span-7">
          <DashboardBranchCompare />
        </div>
        <div className="lg:col-span-5">
          <DashboardCashRunway />
        </div>

        <div className="lg:col-span-8">
          <DashboardSalesChart />
        </div>
        <div className="lg:col-span-4">
          <DashboardPettyCashRequests />
        </div>

        <div className="lg:col-span-8">
          <Dashboard30DayChart />
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
          <DashboardTransactionLog />
        </div>
      </div>
    </motion.div>
  );
}
