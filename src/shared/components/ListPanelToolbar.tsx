"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterChip<K extends string = string> = {
  key: K;
  label: string;
};

// Compact toolbar used by sticky right-rail panels (Riwayat Bukti,
// Riwayat Statement, Riwayat Validasi, vendor aliases, etc). Wires
// a search input + a row of filter chip buttons with active highlight.
//
// Why a shared component: prior to 2026-05-21 each panel re-implemented
// this 30-line block. Diff drift was inevitable. This is the SSOT.
export function ListPanelToolbar<K extends string>({
  search,
  onSearchChange,
  searchPlaceholder = "Cari...",
  filterValue,
  onFilterChange,
  filterChips,
  rightSlot,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filterValue?: K;
  onFilterChange?: (k: K) => void;
  filterChips?: ReadonlyArray<FilterChip<K>>;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-6 pr-2 py-1 text-[11px] rounded border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {rightSlot}
      </div>
      {filterChips && filterChips.length > 0 && onFilterChange && (
        <div className="flex gap-1 flex-wrap">
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => onFilterChange(chip.key)}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded font-semibold uppercase",
                filterValue === chip.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
