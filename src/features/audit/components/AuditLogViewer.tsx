"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { ClipboardList, Filter } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useBranchScope } from "@/features/dashboard/context/BranchScopeContext";
import { useFilteredByDate } from "@/shared/hooks";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  delete: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  approve: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  reject: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  pay: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
};

const ACTIONS = ["all", "create", "update", "delete", "approve", "reject", "pay"] as const;

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "baru saja";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} menit lalu`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} jam lalu`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} hari lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function AuditLogViewer() {
  const { branchId, branches } = useBranchScope();
  const effectiveBranchId = branchId ?? branches?.[0]?._id;
  const logs = useQuery(
    api.features.audit.queries.listByBranch,
    effectiveBranchId ? { branchId: effectiveBranchId } : "skip",
  );

  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const typed = (logs ?? []) as Array<{
    _id: unknown;
    _creationTime: number;
    entityType: string;
    entityId: string;
    action: string;
    description: string;
    actedBy: string;
    actedAt?: string;
  }>;
  // DRY date filter — drives off header DateRangePicker.
  const dateFiltered = useFilteredByDate(typed, "actedAt");
  const filtered = dateFiltered.filter((log) => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.description.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q) ||
        log.actedBy.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 text-primary p-2">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Log Audit</h1>
          <p className="text-sm text-muted-foreground">
            Riwayat mutasi data — 200 entri terakhir per cabang
          </p>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-col md:flex-row gap-2">
          <Input
            placeholder="Cari deskripsi, entitas, atau aktor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-9 w-full md:w-44 gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a === "all" ? "Semua aksi" : a.charAt(0).toUpperCase() + a.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {logs === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {logs.length === 0
            ? "Belum ada log audit untuk cabang ini."
            : "Tidak ada log yang cocok dengan filter."}
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            {filtered.map((log) => (
              <div key={String(log._id)} className="p-3 hover:bg-muted/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <Badge className={`${ACTION_COLORS[log.action] ?? ""} text-[10px] uppercase shrink-0`}>
                      {log.action}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{log.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono">{log.entityType}</span>
                        {" · "}
                        oleh {log.actedBy}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    {formatRelativeTime(log.actedAt ?? new Date(log._creationTime).toISOString())}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
