import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { directionBgClass, directionTextClass, amountColorClass } from "@/shared/lib";

interface TransactionRowProps {
  title: string;
  subtitle?: string;
  amount: string;
  direction?: "in" | "out";
  rightLabel?: string;
}

export function TransactionRow({ title, subtitle, amount, direction, rightLabel }: TransactionRowProps) {
  const Icon = direction === "in" ? ArrowDownRight : ArrowUpRight;
  const bgClass = direction ? directionBgClass(direction) : "bg-muted";
  const iconColor = direction ? directionTextClass(direction) : "text-muted-foreground";

  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${bgClass}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-mono-data font-medium ${amountColorClass(amount)}`}>{amount}</p>
        {rightLabel && <p className="text-[10px] text-muted-foreground">{rightLabel}</p>}
      </div>
    </div>
  );
}
