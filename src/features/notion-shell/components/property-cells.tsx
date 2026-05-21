"use client";

/** Per-type property cell renderers. Split out of NotionProperty so
 *  each type's UI fits in one section and new types can be added
 *  without ballooning the parent. Pure controlled inputs — every
 *  cell takes `value` + `onChange` + `prop` (for options) +
 *  `readOnly`. Returns a ReactNode the host slots inline. */

import type { ReactNode } from "react";
import { useState } from "react";
import { ExternalLink, Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TagSelect, MultiTagSelect, TAG_COLORS, type TagOption } from "@/components/ui/tag-select";
import { DatePickerCell } from "./DatePickerCell";
import { cn } from "@/lib/utils";
import type { Property, PropertyValue, SelectOption } from "../types";

function formatNumber(n: number, format?: string, currencyCode?: string, decimals?: number): string {
  if (format === "currency") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currencyCode ?? "IDR",
      maximumFractionDigits: 0,
    }).format(n);
  }
  if (format === "percent") {
    return new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: decimals ?? 1 }).format(n);
  }
  if (format === "decimal") {
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: decimals ?? 2, minimumFractionDigits: decimals ?? 2 }).format(n);
  }
  return new Intl.NumberFormat("id-ID").format(n);
}

function NumberEditableCell({ value, prop, onChange }: {
  value: number | null;
  prop: Property;
  onChange?: (next: PropertyValue) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value == null ? "" : String(value));
  if (editing) {
    return (
      <Input
        autoFocus
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const trimmed = draft.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
          const n = trimmed === "" ? null : Number(trimmed);
          if (n !== value) onChange?.(n == null || Number.isNaN(n) ? null : n);
        }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditing(false); }}
        className="h-7 text-sm text-right tabular-nums"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => { setDraft(value == null ? "" : String(value)); setEditing(true); }}
      className="h-7 w-full text-right text-xs tabular-nums px-2 rounded hover:bg-accent/50"
    >
      {value == null ? (
        <span className="text-muted-foreground/60">—</span>
      ) : (
        <span className={prop.numberFormat === "currency" ? "font-mono" : ""}>
          {formatNumber(value, prop.numberFormat, prop.numberCurrencyCode, prop.numberDecimals)}
        </span>
      )}
    </button>
  );
}

function LinkCell({ value, readOnly, onChange }: {
  value: string;
  readOnly: boolean;
  onChange?: (next: PropertyValue) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const isHttp = /^https?:\/\//i.test(value);

  if (readOnly || !editing) {
    if (!value) {
      if (readOnly) return <span className="text-muted-foreground/60">—</span>;
      return (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="h-7 w-full text-left px-2 text-xs text-muted-foreground/60 rounded hover:bg-accent/50"
        >
          (kosong)
        </button>
      );
    }
    const truncated = value.length > 40 ? value.slice(0, 37) + "…" : value;
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          if (isHttp) {
            window.open(value, "_blank", "noopener");
          } else {
            navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }
        }}
        onDoubleClick={() => !readOnly && setEditing(true)}
        className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline cursor-pointer max-w-full"
        title={isHttp ? `Buka ${value}` : `Klik salin: ${value} (dobel-klik untuk edit)`}
      >
        <span className="truncate">{truncated}</span>
        {isHttp ? <ExternalLink className="h-3 w-3 shrink-0" /> : copied ? <span className="text-green-600 text-[10px] shrink-0">✓</span> : <Copy className="h-3 w-3 shrink-0 opacity-50" />}
      </span>
    );
  }
  return (
    <Input
      autoFocus
      type="text"
      defaultValue={value}
      onBlur={(e) => { setEditing(false); onChange?.(e.currentTarget.value); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditing(false); }}
      className="h-7 text-sm font-mono"
      placeholder="https://… atau referensi"
    />
  );
}

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

    case "number": {
      const n = typeof value === "number" ? value : value == null || value === "" ? null : Number(value);
      const safeN = n != null && !Number.isNaN(n) ? n : null;
      if (readOnly) {
        if (safeN == null) return <span className="text-muted-foreground/60">—</span>;
        return (
          <span className={cn("text-xs tabular-nums", prop.numberFormat === "currency" && "font-mono")}>
            {formatNumber(safeN, prop.numberFormat, prop.numberCurrencyCode, prop.numberDecimals)}
          </span>
        );
      }
      return <NumberEditableCell value={safeN} prop={prop} onChange={onChange} />;
    }

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

    case "date":
      return <DatePickerCell value={value} onChange={onChange} readOnly={readOnly} />;

    case "url":
      return <LinkCell value={String(value ?? "")} readOnly={readOnly} onChange={onChange} />;

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
