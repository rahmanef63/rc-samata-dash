"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Package, ArrowDownLeft, ArrowUpRight, Wrench, Trash2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useBranchScope } from "@/features/dashboard/context/BranchScopeContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_META: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  stock_in: {
    label: "Masuk",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    icon: ArrowDownLeft,
  },
  usage: {
    label: "Pemakaian",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    icon: ArrowUpRight,
  },
  adjustment: {
    label: "Penyesuaian",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    icon: Wrench,
  },
  waste: {
    label: "Limbah",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    icon: Trash2,
  },
};

const TYPE_OPTIONS = ["all", "stock_in", "usage", "adjustment", "waste"] as const;

export function StockMovementsLog() {
  const { branchId, branches } = useBranchScope();
  const effectiveBranchId = branchId ?? branches?.[0]?._id;
  const movements = useQuery(
    api.features.inventory.queries.listAllMovements,
    effectiveBranchId ? { branchId: effectiveBranchId } : "skip",
  );

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = (movements ?? []).filter((m) => {
    if (typeFilter !== "all" && m.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.itemName.toLowerCase().includes(q) ||
        (m.notes ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 text-primary p-2">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Mutasi Stok</h1>
          <p className="text-sm text-muted-foreground">
            Riwayat masuk, pemakaian, penyesuaian, dan limbah — 200 entri terakhir
          </p>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-col md:flex-row gap-2">
          <Input
            placeholder="Cari nama item atau catatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-full md:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "all" ? "Semua jenis" : TYPE_META[t]?.label ?? t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {movements === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {movements.length === 0
            ? "Belum ada mutasi stok untuk cabang ini."
            : "Tidak ada mutasi yang cocok dengan filter."}
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            {filtered.map((m) => {
              const meta = TYPE_META[m.type] ?? TYPE_META.stock_in;
              const Icon = meta.icon;
              const sign = m.type === "stock_in" ? "+" : "-";
              return (
                <div key={String(m._id)} className="p-3 hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <Badge className={`${meta.color} text-[10px] uppercase shrink-0 gap-1`}>
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{m.itemName}</p>
                        {m.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {m.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-semibold">
                        {sign}
                        {m.qty}{" "}
                        <span className="text-xs text-muted-foreground">{m.unit}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{m.date}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
