import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { AreaChartCard, TransactionRow, SectionHeader, ViewAllButton } from "@/shared/components";
import { cashflowData, recentLedger } from "../lib";

export function CashflowOverview() {
  const chartData = cashflowData.map(d => ({ label: d.day, value: d.value }));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Total Wallet Balance */}
      <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
        <p className="text-xs opacity-80 mb-1">Total Wallet Balance</p>
        <p className="text-3xl font-bold font-mono-data tracking-tight">Rp 128.450.000</p>
        <p className="text-xs mt-2 flex items-center gap-1 opacity-80">
          <TrendingUp className="h-3 w-3" /> +12.4% from last month
        </p>
      </div>

      {/* Cashflow chart */}
      <AreaChartCard
        data={chartData}
        title="Owner vs Outlet Cashflow"
        subtitle="Rp 45.000.000"
        height={160}
        gradientId="cfGrad"
        showGrid={false}
        showYAxis={false}
        showTooltip={false}
        headerRight={<span className="text-xs text-muted-foreground">Last 7 Days</span>}
      />

      {/* Recent Ledger */}
      <SectionHeader title="Recent Ledger" action={<ViewAllButton />} />
      <div className="space-y-3">
        {recentLedger.map((item, i) => (
          <div key={i} className="bg-card rounded-xl shadow-card p-3">
            <TransactionRow
              title={item.title}
              subtitle={item.time}
              amount={item.amount}
              direction={item.color === "text-success" ? "in" : "out"}
              rightLabel={item.status}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
