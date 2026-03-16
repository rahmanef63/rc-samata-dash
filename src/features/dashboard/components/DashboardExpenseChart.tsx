import { motion } from "framer-motion";
import { PieChartCard } from "@/shared/components";
import { expenseByCategory, itemVariants } from "../lib";

export function DashboardExpenseChart() {
  return (
    <motion.div variants={itemVariants} className="lg:col-span-2">
      <PieChartCard
        data={expenseByCategory}
        title="Expense by Category"
        subtitle="Bulan ini"
        height={200}
      />
    </motion.div>
  );
}
