"use client";

/**
 * Date cell renderer — wraps shadcn Calendar + Popover. Mirrors the
 * notion-page-clone DatePicker pattern (button trigger + calendar
 * popover + clear), but simplified for rc-samata-dash where every
 * date field is a pure YYYY-MM-DD string in Convex.
 *
 * Lenient input — accepts:
 *   - "YYYY-MM-DD"               (raw string, used by all current PROPS)
 *   - { date: "YYYY-MM-DD" }     (notion-shell DateValue shape)
 *   - null / undefined / ""      (empty)
 *
 * Output via onChange — always emits raw string ("YYYY-MM-DD") or null.
 * Matches what Convex schemas store (v.string()). Consumers that need
 * the DateValue shape can wrap externally.
 */

import { useState, useMemo } from "react";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PropertyValue } from "../types";

function parseYmd(s?: string): Date | undefined {
  if (!s) return undefined;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return undefined;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function readDateString(v: PropertyValue): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object" && !Array.isArray(v) && "date" in v) {
    return (v as { date?: string }).date;
  }
  return undefined;
}

export function DatePickerCell({
  value,
  onChange,
  readOnly,
  placeholder = "Pilih tanggal…",
}: {
  value: PropertyValue;
  onChange?: (next: PropertyValue) => void;
  readOnly?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const dateStr = readDateString(value);
  const dt = useMemo(() => parseYmd(dateStr), [dateStr]);
  const display = dt ? format(dt, "d MMM yyyy", { locale: idLocale }) : "";

  if (readOnly) {
    return (
      <span className="text-xs">
        {display || <span className="text-muted-foreground/60">—</span>}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          type="button"
          className={cn(
            "h-7 w-full justify-start px-2 py-1 text-xs font-normal rounded-md hover:bg-accent/50",
            !dt && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="h-3 w-3 mr-1.5 shrink-0" />
          {dt ? display : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-auto" sideOffset={4}>
        <Calendar
          mode="single"
          selected={dt}
          onSelect={(d) => {
            if (d) {
              onChange?.(ymd(d));
            } else {
              onChange?.(null);
            }
            setOpen(false);
          }}
          defaultMonth={dt}
        />
        {dt && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-7"
              onClick={() => {
                onChange?.(null);
                setOpen(false);
              }}
            >
              <X className="h-3 w-3 mr-1" /> Hapus
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
