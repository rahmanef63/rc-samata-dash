"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useDateScope,
  MONTH_NAMES_ID,
  type DateGranularity,
} from "@/features/dashboard/context/DateScopeContext";

const GRANULARITY_OPTIONS: { value: DateGranularity; label: string }[] = [
  { value: "day", label: "Hari" },
  { value: "week", label: "Minggu" },
  { value: "month", label: "Bulan" },
  { value: "quarter", label: "Kuartal" },
  { value: "year", label: "Tahun" },
];

function yearRange(): number[] {
  const now = new Date().getFullYear();
  return [now - 2, now - 1, now, now + 1];
}

export function DateRangePicker({ className }: { className?: string }) {
  const {
    granularity,
    day,
    month,
    week,
    quarter,
    year,
    rangeLabel,
    setGranularity,
    setDay,
    setMonth,
    setWeek,
    setQuarter,
    setYear,
    goPrev,
    goNext,
    goToday,
  } = useDateScope();
  const [calOpen, setCalOpen] = useState(false);

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className ?? ""}`}>
      <ToggleGroup
        type="single"
        size="sm"
        value={granularity}
        onValueChange={(v) => {
          if (!v) return;
          setGranularity(v as DateGranularity);
        }}
        className="h-8"
      >
        {GRANULARITY_OPTIONS.map((g) => (
          <ToggleGroupItem
            key={g.value}
            value={g.value}
            className="h-7 px-2 text-[11px]"
            title={`Filter per ${g.label.toLowerCase()}`}
          >
            {g.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={goPrev}
        title="Sebelumnya"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>

      {/* Mode-specific picker */}
      {granularity === "day" && (
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1.5"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {rangeLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={new Date(day.y, day.m - 1, day.d)}
              onSelect={(d) => {
                if (!d) return;
                setDay({ y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() });
                setCalOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      )}

      {granularity === "month" && (
        <>
          <Select
            value={String(month.m)}
            onValueChange={(v) => setMonth({ y: month.y, m: Number(v) })}
          >
            <SelectTrigger className="h-7 w-auto min-w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {MONTH_NAMES_ID.map((name, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(month.y)}
            onValueChange={(v) => setMonth({ y: Number(v), m: month.m })}
          >
            <SelectTrigger className="h-7 w-auto min-w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {yearRange().map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {granularity === "quarter" && (
        <>
          <Select
            value={String(quarter.q)}
            onValueChange={(v) => setQuarter({ y: quarter.y, q: Number(v) })}
          >
            <SelectTrigger className="h-7 w-auto min-w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {[1, 2, 3, 4].map((q) => (
                <SelectItem key={q} value={String(q)}>
                  Q{q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(quarter.y)}
            onValueChange={(v) => setQuarter({ y: Number(v), q: quarter.q })}
          >
            <SelectTrigger className="h-7 w-auto min-w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {yearRange().map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {granularity === "year" && (
        <Select
          value={String(year.y)}
          onValueChange={(v) => setYear({ y: Number(v) })}
        >
          <SelectTrigger className="h-7 w-auto min-w-20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {yearRange().map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {granularity === "week" && (
        <>
          <Select
            value={String(week.w)}
            onValueChange={(v) =>
              setWeek({ y: week.y, m: week.m, w: Number(v) })
            }
          >
            <SelectTrigger className="h-7 w-auto min-w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {[1, 2, 3, 4, 5].map((w) => (
                <SelectItem key={w} value={String(w)}>
                  Minggu {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(week.m)}
            onValueChange={(v) =>
              setWeek({ y: week.y, m: Number(v), w: week.w })
            }
          >
            <SelectTrigger className="h-7 w-auto min-w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {MONTH_NAMES_ID.map((name, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(week.y)}
            onValueChange={(v) =>
              setWeek({ y: Number(v), m: week.m, w: week.w })
            }
          >
            <SelectTrigger className="h-7 w-auto min-w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {yearRange().map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={goNext}
        title="Berikutnya"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-[11px]"
        onClick={goToday}
        title="Reset ke hari ini"
      >
        Kini
      </Button>
    </div>
  );
}
