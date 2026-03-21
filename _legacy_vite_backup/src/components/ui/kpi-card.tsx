import { ReactNode } from "react";
import { motion } from "framer-motion";

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  badge?: string;
  badgeColor?: "success" | "warning" | "destructive" | "primary";
  onClick?: () => void;
}

const badgeColors = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  primary: "bg-primary/10 text-primary",
};

export function KpiCard({ icon, label, value, badge, badgeColor = "success", onClick }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      className="group bg-card rounded-2xl p-4 shadow-card cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors">
          {icon}
        </div>
        {badge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColors[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="label-uppercase mb-1">{label}</p>
      <p className="hero-stat font-mono-data">{value}</p>
    </motion.div>
  );
}
