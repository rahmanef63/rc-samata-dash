import { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, action, className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {action}
    </div>
  );
}
