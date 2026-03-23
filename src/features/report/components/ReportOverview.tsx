"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { TrendingUp, FileText, Download, Upload, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AreaChartCard, PieChartCard, WaterfallChart, SectionHeader } from "@/shared/components";
import { formatRp } from "../lib";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function ReportOverview() {
  const router = useRouter();
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;

  const monthlySales = useQuery(
    api.features.reports.dashboardQueries.getMonthlySalesTrend,
    branchId ? { branchId } : "skip",
  );
  const expenseData = useQuery(
    api.features.reports.dashboardQueries.getExpenseBreakdown,
    branchId ? { branchId } : "skip",
  );
  const waterfallData = useQuery(
    api.features.reports.dashboardQueries.getCashflowWaterfall,
    branchId ? { branchId } : "skip",
  );
  const reports = useQuery(
    api.features.reports.queries.listWeeklyReports,
    branchId ? { branchId } : "skip",
  );

  const isLoading = !monthlySales || !expenseData || !waterfallData || !reports;

  // Total revenue from monthly sales data
  const totalRevenue = monthlySales?.reduce((s, d) => s + d.value, 0) ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-[220px] rounded-xl" />
          <Skeleton className="h-[220px] rounded-xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const hasData = monthlySales.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Revenue summary */}
      <div
        className="bg-card rounded-xl shadow-card p-5 cursor-pointer hover:shadow-card-hover transition-shadow"
        onClick={() => router.push("/finance")}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-muted-foreground">Total Penjualan (periode terakhir)</p>
          <span className="text-xs text-primary font-medium">Detail →</span>
        </div>
        {hasData ? (
          <>
            <p className="text-2xl font-bold font-mono-data tracking-tight">{formatRp(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              {monthlySales[0].date} — {monthlySales[monthlySales.length - 1].date}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            Belum ada data. <button onClick={(e) => { e.stopPropagation(); router.push("/laporan/upload"); }} className="text-primary underline">Upload laporan</button> untuk melihat ringkasan.
          </p>
        )}
      </div>

      {/* Revenue trend chart */}
      {hasData && (
        <AreaChartCard
          data={monthlySales}
          title="Revenue Trend"
          height={192}
          gradientId="repGrad"
          tooltipLabel="Revenue"
        />
      )}

      {/* Expense + Cashflow */}
      {(expenseData.length > 0 || waterfallData.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-4">
          {expenseData.length > 0 && (
            <div className="cursor-pointer" onClick={() => router.push("/expenses")}>
              <PieChartCard data={expenseData} title="Expense Breakdown" subtitle="Berdasarkan laporan upload" height={200} />
            </div>
          )}
          {waterfallData.length > 0 && (
            <div className="cursor-pointer" onClick={() => router.push("/closing")}>
              <WaterfallChart data={waterfallData} title="Cashflow Waterfall" subtitle="Revenue → Net" height={200} />
            </div>
          )}
        </div>
      )}

      {/* Uploaded Reports */}
      <SectionHeader title="Uploaded Reports" />
      {reports.length === 0 ? (
        <div className="bg-card rounded-xl shadow-card p-8 text-center space-y-3">
          <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Belum ada laporan yang di-upload.</p>
          <Button onClick={() => router.push("/laporan/upload")} size="sm">
            <Upload className="h-4 w-4 mr-2" /> Upload Laporan
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.slice(0, 5).map((r) => (
            <div
              key={r._id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => router.push(`/laporan/analytics?report=${r._id}`)}
            >
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {r.periodStart} → {r.periodEnd}
                  {" · "}{r.salesCount ?? 0} sales
                  {" · "}{r.expenseCount ?? 0} expense
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                r.status === "processed" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" :
                r.status === "error" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" :
                "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
              }`}>
                {r.status}
              </span>
            </div>
          ))}
          {reports.length > 5 && (
            <button
              onClick={() => router.push("/laporan/upload")}
              className="w-full text-center text-xs text-primary font-medium py-2 hover:underline"
            >
              Lihat semua {reports.length} laporan →
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
