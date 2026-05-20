"use client";

import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SortDir = "asc" | "desc" | null;

export function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  sortKey: string;
  sort: { key: string; dir: SortDir };
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  const active = sort.key === sortKey && sort.dir !== null;
  const Icon = active ? (sort.dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  const alignCls =
    align === "right" ? "text-right" :
    align === "center" ? "text-center" :
    "text-left";
  return (
    <th className={cn("px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap", alignCls, className)}>
      <button onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        <Icon className={cn("h-3 w-3", active ? "text-primary" : "text-muted-foreground/50")} />
      </button>
    </th>
  );
}
