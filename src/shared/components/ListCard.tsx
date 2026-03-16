import { ReactNode } from "react";

interface ListCardProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ListCard({ icon, title, subtitle, right, className = "", onClick }: ListCardProps) {
  return (
    <div
      className={`flex items-center gap-3 bg-card rounded-xl shadow-card p-3 ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right && <div className="text-right shrink-0">{right}</div>}
    </div>
  );
}
