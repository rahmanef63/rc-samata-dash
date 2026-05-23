"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Filter, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
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
  const logs = useQuery(api.features.audit.queries.listByBranch, {});
  const removeOne = useMutation(api.features.audit.mutations.remove);
  const clearAll = useMutation(api.features.audit.mutations.clearByBranch);

  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [purging, setPurging] = useState(false);

  async function handleClear() {
    const n = logs?.length ?? 0;
    if (n === 0) {
      toast.info("Tidak ada log untuk dihapus");
      return;
    }
    if (!confirm(`Hapus SEMUA ${n} log audit? Tidak bisa di-undo.`)) return;
    setPurging(true);
    try {
      const res = await clearAll({});
      toast.success(`${res.deleted} log audit dihapus`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal hapus log");
    } finally {
      setPurging(false);
    }
  }

  async function handleRowDelete(id: Id<"auditLogs">) {
    try {
      await removeOne({ id });
      toast.success("Log dihapus");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal hapus");
    }
  }

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
    <div className="space-y-4">
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
          <button
            type="button"
            onClick={handleClear}
            disabled={purging || (logs?.length ?? 0) === 0}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Hapus semua log audit untuk cabang ini"
          >
            {purging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {purging ? "Menghapus..." : "Clean All"}
          </button>
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
              <div key={String(log._id)} className="p-3 hover:bg-muted/40 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
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
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-right text-xs text-muted-foreground">
                      {formatRelativeTime(log.actedAt ?? new Date(log._creationTime).toISOString())}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRowDelete(log._id as Id<"auditLogs">)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400"
                      title="Hapus log ini"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
