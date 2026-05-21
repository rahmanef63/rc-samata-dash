"use client";

/** Per-type property cell renderers. Split out of NotionProperty so
 *  each type's UI fits in one section and new types can be added
 *  without ballooning the parent. Pure controlled inputs — every
 *  cell takes `value` + `onChange` + `prop` (for options) +
 *  `readOnly`. Returns a ReactNode the host slots inline. */

import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TagSelect, MultiTagSelect, TAG_COLORS, type TagOption } from "@/components/ui/tag-select";
import { cn } from "@/lib/utils";
import type { Property, PropertyValue, SelectOption } from "../types";

// Map notion-shell color strings → TAG_COLORS entries so colors declared
// in PROPS (e.g. `color: "purple"`) survive the TagSelect render path.
const COLOR_INDEX: Record<string, number> = {
  blue: 0, green: 1, purple: 2, orange: 3, pink: 4,
  yellow: 5, teal: 6, red: 7, indigo: 8, cyan: 9, gray: 10,
};

function toTagOption(o: SelectOption): TagOption {
  const idx = COLOR_INDEX[o.color];
  return {
    value: o.id,
    label: o.name,
    color: idx !== undefined ? TAG_COLORS[idx] : undefined,
  };
}

interface CellArgs {
  prop: Property;
  value: PropertyValue;
  readOnly: boolean;
  onChange?: (next: PropertyValue) => void;
}

function optChip(opt: SelectOption | undefined, className?: string) {
  if (!opt) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        "bg-muted text-foreground",
        className,
      )}
    >
      {opt.name}
    </span>
  );
}

export function renderPropertyCell({ prop, value, readOnly, onChange }: CellArgs): ReactNode {
  switch (prop.type) {
    case "checkbox":
      return (
        <Checkbox
          checked={!!value}
          disabled={readOnly}
          onCheckedChange={(v) => onChange?.(!!v)}
        />
      );

    case "number":
      return (
        <Input
          type="number"
          value={(value as number | null) ?? ""}
          disabled={readOnly}
          onChange={(e) => onChange?.(e.target.value === "" ? null : Number(e.target.value))}
          className="h-7 text-sm"
        />
      );

    case "select":
    case "status": {
      const id = value as string | null;
      const opt = prop.options?.find((o) => o.id === id);
      if (readOnly) return optChip(opt) ?? <span className="text-muted-foreground/60">—</span>;
      // TagSelect = colored badge UI + search + opt-in inline "Create [value]"
      // button when prop.allowCreate AND prop.onCreateOption provided. Replaces
      // native <select> for consistent Notion-style selects across all tables.
      return (
        <TagSelect
          value={id}
          options={(prop.options ?? []).map(toTagOption)}
          onChange={(v) => onChange?.(v)}
          placeholder="Pilih…"
          onCreate={prop.allowCreate && prop.onCreateOption ? async (label) => {
            try {
              const newOpt = await prop.onCreateOption!(label);
              if (newOpt?.id) onChange?.(newOpt.id);
            } catch (e) {
              console.error("create option failed", e);
            }
          } : undefined}
        />
      );
    }

    case "multi_select": {
      const ids = (Array.isArray(value) ? value : []) as string[];
      const selected = (prop.options ?? []).filter((o) => ids.includes(o.id));
      if (readOnly) {
        return (
          <div className="flex flex-wrap gap-1">
            {selected.map((o) => optChip(o, "bg-primary/15 text-primary"))}
          </div>
        );
      }
      return (
        <MultiTagSelect
          value={ids}
          options={(prop.options ?? []).map(toTagOption)}
          onChange={(v) => onChange?.(v)}
          placeholder="Pilih…"
          onCreate={prop.allowCreate && prop.onCreateOption ? async (label) => {
            try {
              const newOpt = await prop.onCreateOption!(label);
              if (newOpt?.id) onChange?.([...ids, newOpt.id]);
            } catch (e) {
              console.error("create option failed", e);
            }
          } : undefined}
        />
      );
    }

    case "date": {
      const v = (value && typeof value === "object" && "date" in value ? value.date : null) ?? "";
      return (
        <Input
          type="date"
          value={String(v)}
          disabled={readOnly}
          onChange={(e) => onChange?.(e.target.value ? { date: e.target.value } : null)}
          className="h-7 text-sm"
        />
      );
    }

    case "url":
      return (
        <Input
          type="url"
          inputMode="url"
          value={String(value ?? "")}
          disabled={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="https://…"
          className="h-7 text-sm"
        />
      );

    case "email":
      return (
        <Input
          type="email"
          inputMode="email"
          value={String(value ?? "")}
          disabled={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="name@example.com"
          className="h-7 text-sm"
        />
      );

    case "phone":
      return (
        <Input
          type="tel"
          inputMode="tel"
          value={String(value ?? "")}
          disabled={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="+62…"
          className="h-7 text-sm"
        />
      );

    case "relation": {
      // Read-only render. Value can be a single id, array of ids, or
      // a pre-resolved display string (preferred — host pre-computes
      // names in `toPage` for cheaper render).
      if (Array.isArray(value)) {
        return (
          <div className="flex flex-wrap gap-1">
            {(value as string[]).slice(0, 5).map((s, i) => (
              <span key={i} className="rounded-full border border-border bg-muted/30 px-1.5 py-0.5 text-[10px]">{s}</span>
            ))}
            {(value as string[]).length > 5 && (
              <span className="text-[10px] text-muted-foreground">+{(value as string[]).length - 5}</span>
            )}
          </div>
        );
      }
      return <span className="text-xs">{String(value ?? "—")}</span>;
    }

    case "rollup":
    case "formula":
    case "created_time":
    case "last_edited_time": {
      // Read-only computed columns. Host pre-computes the value in `toPage`
      // and stores it in rowProps. We just display.
      if (value == null) return <span className="text-muted-foreground/60">—</span>;
      if (typeof value === "number") {
        const fmt = prop.numberFormat === "currency"
          ? new Intl.NumberFormat("id-ID", { style: "currency", currency: prop.numberCurrencyCode ?? "IDR", maximumFractionDigits: 0 })
          : new Intl.NumberFormat("id-ID");
        return <span className="text-xs font-mono">{fmt.format(value)}</span>;
      }
      return <span className="text-xs">{String(value)}</span>;
    }

    default:
      return (
        <Input
          value={String(value ?? "")}
          disabled={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          className="h-7 text-sm"
        />
      );
  }
}
