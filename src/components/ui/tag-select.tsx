"use client";

import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { X, Check, Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Color System ──────────────────────────────────────────

const TAG_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  { bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
  { bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-700 dark:text-yellow-300", dot: "bg-yellow-500" },
  { bg: "bg-teal-100 dark:bg-teal-900/40", text: "text-teal-700 dark:text-teal-300", dot: "bg-teal-500" },
  { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
  { bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" },
  { bg: "bg-cyan-100 dark:bg-cyan-900/40", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
  { bg: "bg-gray-100 dark:bg-gray-800/60", text: "text-gray-700 dark:text-gray-300", dot: "bg-gray-500" },
];

function hashColor(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export type TagOption = {
  value: string;
  label: string;
  color?: typeof TAG_COLORS[number];
};

// ─── Tag Badge ─────────────────────────────────────────────

function TagBadge({
  option,
  onRemove,
  size = "sm",
}: {
  option: TagOption;
  onRemove?: () => void;
  size?: "sm" | "xs";
}) {
  const color = option.color ?? hashColor(option.value);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-medium transition-colors",
        color.bg,
        color.text,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-1.5 py-px text-[11px]",
      )}
    >
      <span className={cn("rounded-full shrink-0", color.dot, size === "sm" ? "h-1.5 w-1.5" : "h-1 w-1")} />
      {option.label}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-sm hover:bg-black/10 dark:hover:bg-white/10 p-px"
        >
          <X className={size === "sm" ? "h-3 w-3" : "h-2.5 w-2.5"} />
        </button>
      )}
    </span>
  );
}

// ─── Dropdown ──────────────────────────────────────────────

function TagDropdown({
  options,
  selected,
  search,
  onSearchChange,
  onSelect,
  onCreate,
  multi,
}: {
  options: TagOption[];
  selected: Set<string>;
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (value: string) => void;
  onCreate?: (label: string) => void;
  multi: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );
  const canCreate = onCreate && search.trim() && !options.some((o) => o.label.toLowerCase() === search.trim().toLowerCase());

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="w-full min-w-[200px] rounded-lg border border-border bg-popover shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search or create..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          onKeyDown={(e) => {
            if (e.key === "Enter" && canCreate) {
              onCreate?.(search.trim());
              onSearchChange("");
            }
          }}
        />
      </div>
      <div className="max-h-[200px] overflow-y-auto overscroll-contain p-1">
        {filtered.map((opt) => {
          const isSelected = selected.has(opt.value);
          const color = opt.color ?? hashColor(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors",
                "hover:bg-accent/60",
                isSelected && "bg-accent/30",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full shrink-0", color.dot)} />
              <span className="flex-1 truncate">{opt.label}</span>
              {multi && isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </button>
          );
        })}
        {filtered.length === 0 && !canCreate && (
          <p className="px-2 py-3 text-xs text-muted-foreground text-center">No options</p>
        )}
        {canCreate && (
          <button
            type="button"
            onClick={() => {
              onCreate?.(search.trim());
              onSearchChange("");
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent/60 text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create &quot;{search.trim()}&quot;</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── TagSelect (single) ────────────────────────────────────

export function TagSelect({
  value,
  options,
  onChange,
  onCreate,
  placeholder = "Select...",
  className,
}: {
  value: string | null;
  options: TagOption[];
  onChange: (value: string | null) => void;
  onCreate?: (label: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
      setSearch("");
    }
  }, []);

  useEffect(() => {
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, handleClickOutside]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-1.5 min-h-[32px] px-2 py-1 rounded-md text-sm transition-colors",
          "border border-transparent hover:bg-accent/40",
          open && "bg-accent/40 ring-1 ring-ring/20",
        )}
      >
        {selected ? (
          <TagBadge option={selected} onRemove={() => onChange(null)} />
        ) : (
          <span className="text-muted-foreground text-xs">{placeholder}</span>
        )}
        <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full min-w-[220px]">
          <TagDropdown
            options={options}
            selected={new Set(value ? [value] : [])}
            search={search}
            onSearchChange={setSearch}
            onSelect={(v) => {
              onChange(v === value ? null : v);
              setOpen(false);
              setSearch("");
            }}
            onCreate={
              onCreate
                ? (label) => {
                    onCreate(label);
                    setSearch("");
                  }
                : undefined
            }
            multi={false}
          />
        </div>
      )}
    </div>
  );
}

// ─── MultiTagSelect ────────────────────────────────────────

export function MultiTagSelect({
  value,
  options,
  onChange,
  onCreate,
  placeholder = "Select...",
  className,
}: {
  value: string[];
  options: TagOption[];
  onChange: (value: string[]) => void;
  onCreate?: (label: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedSet = new Set(value);
  const selectedOptions = options.filter((o) => selectedSet.has(o.value));

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
      setSearch("");
    }
  }, []);

  useEffect(() => {
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, handleClickOutside]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-1 flex-wrap min-h-[32px] px-2 py-1 rounded-md text-sm transition-colors",
          "border border-transparent hover:bg-accent/40",
          open && "bg-accent/40 ring-1 ring-ring/20",
        )}
      >
        {selectedOptions.length > 0 ? (
          selectedOptions.map((opt) => (
            <TagBadge
              key={opt.value}
              option={opt}
              size="xs"
              onRemove={() => onChange(value.filter((v) => v !== opt.value))}
            />
          ))
        ) : (
          <span className="text-muted-foreground text-xs">{placeholder}</span>
        )}
        <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full min-w-[220px]">
          <TagDropdown
            options={options}
            selected={selectedSet}
            search={search}
            onSearchChange={setSearch}
            onSelect={(v) => {
              if (selectedSet.has(v)) {
                onChange(value.filter((x) => x !== v));
              } else {
                onChange([...value, v]);
              }
            }}
            onCreate={
              onCreate
                ? (label) => {
                    onCreate(label);
                    setSearch("");
                  }
                : undefined
            }
            multi={true}
          />
        </div>
      )}
    </div>
  );
}

// Re-export for convenience
export { TagBadge, hashColor, TAG_COLORS };
