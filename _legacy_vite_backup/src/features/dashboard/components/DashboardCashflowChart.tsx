import { motion } from "framer-motion";
import { WaterfallChart } from "@/shared/components";
import { cashflowWaterfall, itemVariants } from "../lib";

export function DashboardCashflowChart() {
  return (
    <motion.div variants={itemVariants}>
      <WaterfallChart
        data={cashflowWaterfall}
        title="Cashflow Waterfall"
        subtitle="Revenue → Net Profit bulan ini"
        height={240}
      />
    </motion.div>
  );
}
