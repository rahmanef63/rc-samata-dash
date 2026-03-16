import { motion } from "framer-motion";
import { AreaChartCard } from "@/shared/components";
import { sales30Days, itemVariants } from "../lib";

export function Dashboard30DayChart() {
  const chartData = sales30Days.map(d => ({ label: d.day, value: d.value }));

  return (
    <motion.div variants={itemVariants}>
      <AreaChartCard
        data={chartData}
        title="Omzet 30 Hari Terakhir"
        subtitle="Trend penjualan harian"
        height={200}
        gradientId="sales30Gradient"
        tooltipLabel="Omzet"
      />
    </motion.div>
  );
}
