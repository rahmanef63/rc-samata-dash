"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AreaChartCard, TransactionRow, SectionHeader } from "@/shared/components";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRp } from "@/shared/lib";

export function CashflowOverview() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;

  const waterfall = useQuery(
    api.features.reports.dashboardQueries.getCashflowWaterfall,
    branchId ? { branchId } : "skip"
  );
  const recentTx = useQuery(
    api.features.reports.dashboardQueries.getRecentTransactions,
    branchId ? { branchId } : "skip"
  );
  const weeklySales = useQuery(
    api.features.reports.dashboardQueries.getWeeklySalesTrend,
    branchId ? { branchId } : "skip"
  );

  if (!branches || !waterfall || !recentTx) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const revenue = waterfall.find((w) => w.name === "Revenue")?.value ?? 0;
  const net = waterfall.find((w) => w.name === "Net")?.value ?? 0;
  const totalExpense = waterfall
    .filter((w) => w.value < 0)
    .reduce((s, w) => s + Math.abs(w.value), 0);

  const chartData = (weeklySales || []).map((d) => ({ label: d.label, value: d.value }));
  const chartTotal = chartData.reduce((s, d) => s + d.value, 0);
  const isPositive = net >= 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Balance Card */}
      <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
        <p className="text-xs opacity-80 mb-1">Total Revenue (Periode Aktif)</p>
        <p className="text-3xl font-bold font-mono-data tracking-tight">{formatRp(revenue)}</p>
        <div className="flex items-center gap-4 mt-2">
          <p className="text-xs flex items-center gap-1 opacity-80">
            <Wallet className="h-3 w-3" /> Net: {formatRp(net)}
          </p>
          <p className="text-xs flex items-center gap-1 opacity-80">
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? "Positif" : "Negatif"}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl shadow-card p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-medium">Revenue</p>
          <p className="text-sm font-bold font-mono-data text-success mt-1">{formatRp(revenue)}</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-medium">Expense</p>
          <p className="text-sm font-bold font-mono-data text-destructive mt-1">{formatRp(totalExpense)}</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-medium">Net</p>
          <p className={`text-sm font-bold font-mono-data mt-1 ${isPositive ? "text-success" : "text-destructive"}`}>
            {formatRp(net)}
          </p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <AreaChartCard
          data={chartData}
          title="Trend Penjualan"
          subtitle={formatRp(chartTotal)}
          height={160}
          gradientId="cfGrad"
          showGrid={false}
          showYAxis={false}
          showTooltip={false}
          headerRight={<span className="text-xs text-muted-foreground">7 Hari Terakhir</span>}
        />
      )}

      {/* Recent Transactions */}
      {recentTx.length > 0 && (
        <>
          <SectionHeader title="Transaksi Terkini" />
          <div className="space-y-3">
            {recentTx.map((item) => (
              <div key={item.id} className="bg-card rounded-xl shadow-card p-3">
                <TransactionRow
                  title={item.name}
                  subtitle={item.time}
                  amount={item.amount}
                  direction={item.direction}
                  rightLabel={item.status}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {recentTx.length === 0 && chartData.length === 0 && (
        <div className="bg-muted rounded-xl p-6 text-center">
          <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Belum ada data cashflow. Upload laporan di menu Laporan → Upload.
          </p>
        </div>
      )}
    </motion.div>
  );
}
