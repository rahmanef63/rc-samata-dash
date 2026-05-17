"use client";

import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDateScope,
  DATE_PRESET_LABELS,
  type DatePreset,
} from "@/features/dashboard/context/DateScopeContext";
import { type DateRange } from "react-day-picker";

const PRESET_OPTIONS: Exclude<DatePreset, "custom">[] = [
  "today",
  "7d",
  "30d",
  "mtd",
  "ytd",
];

export function DateRangePicker({ className }: { className?: string }) {
  const { preset, startDate, endDate, setPreset, setCustomRange } = useDateScope();
  const [open, setOpen] = useState(false);

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const start = range.from.getTime();
      const endNext = new Date(
        range.to.getFullYear(),
        range.to.getMonth(),
        range.to.getDate() + 1,
      ).getTime();
      setCustomRange(start, endNext);
      setOpen(false);
    }
  };

  const formatRange = () => {
    if (preset !== "custom") return DATE_PRESET_LABELS[preset];
    const from = new Date(startDate);
    const to = new Date(endDate - 1);
    const fmt = (d: Date) =>
      d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    return `${fmt(from)} – ${fmt(to)}`;
  };

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <Select
        value={preset === "custom" ? undefined : preset}
        onValueChange={(v) => setPreset(v as Exclude<DatePreset, "custom">)}
      >
        <SelectTrigger className="h-8 w-auto min-w-24 gap-1.5 text-xs">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <SelectValue>{formatRange()}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {PRESET_OPTIONS.map((p) => (
            <SelectItem key={p} value={p}>
              {DATE_PRESET_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Pilih rentang custom">
            <CalendarIcon className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="range"
            selected={{ from: new Date(startDate), to: new Date(endDate - 1) }}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
