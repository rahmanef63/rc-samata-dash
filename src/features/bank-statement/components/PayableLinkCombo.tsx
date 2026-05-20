"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { Link2, Search, X, Zap } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatRpFull } from "@/shared/lib";
import { cn } from "@/lib/utils";

const AMOUNT_TOL = 1500;

type Payable = {
  _id: Id<"payables">;
  vendorId: Id<"vendors">;
  vendorName: string;
  invoiceDate: string;
  amount: number;
  paidAmount: number;
  status: string;
  description: string;
};

export function PayableLinkCombo({
  branchId,
  value,
  debit,
  counterpartyHint,
  onChange,
}: {
  branchId: Id<"branches">;
  value: Id<"payables"> | null;
  debit: number;
  counterpartyHint?: string;
  onChange: (id: Id<"payables"> | null) => void;
}) {
  const payables = useQuery(api.features.closing.queries.listOpenPayables, { branchId }) as
    | Payable[]
    | undefined;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const selected = useMemo(() => payables?.find((p) => p._id === value) ?? null, [payables, value]);

  const ranked = useMemo(() => {
    if (!payables) return [];
    const upHint = (counterpartyHint ?? "").toUpperCase().trim();
    const filtered = payables.filter((p) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        p.vendorName.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s) ||
        p.invoiceDate.includes(s)
      );
    });
    // Rank: amount-close first, then vendor-name-contains-hint
    return filtered
      .map((p) => {
        const remaining = p.amount - p.paidAmount;
        const amountClose = Math.abs(remaining - debit) <= AMOUNT_TOL ? 1 : 0;
        const hintHit = upHint && p.vendorName.toUpperCase().includes(upHint) ? 1 : 0;
        return { p, score: amountClose * 2 + hintHit };
      })
      .sort((a, b) => b.score - a.score || a.p.invoiceDate.localeCompare(b.p.invoiceDate))
      .map((r) => r.p);
  }, [payables, search, debit, counterpartyHint]);

  const autoMatch = () => {
    if (!payables) return;
    const upHint = (counterpartyHint ?? "").toUpperCase().trim();
    const target = payables.find((p) => {
      const remaining = p.amount - p.paidAmount;
      const amountClose = Math.abs(remaining - debit) <= AMOUNT_TOL;
      const hintHit = upHint && p.vendorName.toUpperCase().includes(upHint);
      return amountClose && (hintHit || !upHint);
    });
    if (target) {
      onChange(target._id);
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative inline-block w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-mono",
          selected
            ? "border-green-300 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300"
            : "border-border bg-card hover:bg-muted/50 text-muted-foreground",
        )}
      >
        <Link2 className="h-3 w-3 shrink-0" />
        <span className="flex-1 truncate text-left">
          {selected
            ? `${selected.vendorName} · ${formatRpFull(selected.amount - selected.paidAmount)}`
            : "Link payable..."}
        </span>
        {selected && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange(null); } }}
            className="rounded-sm hover:bg-black/10 dark:hover:bg-white/10 p-0.5 cursor-pointer"
          >
            <X className="h-2.5 w-2.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-[360px] rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari vendor / deskripsi / tanggal..."
              className="flex-1 bg-transparent text-xs outline-none"
            />
            <button
              type="button"
              onClick={autoMatch}
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-muted font-semibold"
              title="Auto-match by amount + vendor"
            >
              <Zap className="h-3 w-3 text-yellow-600" />
              Auto
            </button>
          </div>
          <div className="max-h-[280px] overflow-y-auto p-1">
            {!payables ? (
              <p className="px-2 py-3 text-xs text-muted-foreground text-center">Memuat...</p>
            ) : ranked.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground text-center">Tidak ada payable open</p>
            ) : (
              ranked.slice(0, 50).map((p) => {
                const remaining = p.amount - p.paidAmount;
                const closeMatch = Math.abs(remaining - debit) <= AMOUNT_TOL;
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => { onChange(p._id); setOpen(false); }}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded-md hover:bg-accent/60 text-xs flex items-start gap-2",
                      closeMatch && "bg-green-50 dark:bg-green-950/20",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{p.vendorName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{p.invoiceDate} · {p.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-semibold">{formatRpFull(remaining)}</p>
                      <p className="text-[10px] text-muted-foreground">{p.status}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
