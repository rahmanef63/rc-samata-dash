import { motion } from "framer-motion";
import { AreaChartCard } from "@/shared/components";
import { salesData, itemVariants } from "../lib";

export function DashboardSalesChart() {
  const chartData = salesData.map(d => ({ label: d.day, value: d.value }));

  return (
    <motion.div variants={itemVariants} className="lg:col-span-3">
      <AreaChartCard
        data={chartData}
        title="Sales Last 7 Days"
        subtitle="Aug 14 - Aug 20"
        height={220}
        gradientId="salesGradient"
        tooltipLabel="Sales"
        headerRight={
          <select className="text-xs border border-border rounded-md px-2 py-1 bg-card">
            <option>Week to date</option>
            <option>Last 30 days</option>
          </select>
        }
      />
    </motion.div>
  );
}
