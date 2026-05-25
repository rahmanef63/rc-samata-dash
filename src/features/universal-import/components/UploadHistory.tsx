"use client";

// Upload history table for /upload (Universal). Filters: search by filename
// or period, kind, status, date range. Sort by uploadedAt / fileName /
// recordCount / warningCount. Server query keeps cap at 1000 — sufficient
// untuk single-tenant historikal.

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import Link from "next/link";
import {
  History, Search, ChevronDown, Trash2, ExternalLink,
  CheckCircle, AlertCircle, AlertTriangle, FileSpreadsheet,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type FileKind = "weekly_sv" | "zia_multi" | "pergantian" | "tunjangan" |
  "payables_table" | "receipts_table" | "vendors_table" | "bank_statement";
type SortBy = "uploadedAt" | "fileName" | "recordCount" | "warningCount";
type SortOrder = "asc" | "desc";

const KIND_LABEL: Record<FileKind, string> = {
  weekly_sv: "Mingguan SV",
  zia_multi: "ZIA Multi",
  pergantian: "Pergantian",
  tunjangan: "Tunjangan",
  payables_table: "Piutang",
  receipts_table: "Bukti Bayar",
  vendors_table: "Vendor",
  bank_statement: "Statement Bank",
};

const KIND_TONE: Record<FileKind, string> = {
  weekly_sv: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  zia_multi: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  pergantian: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  tunjangan: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200",
  payables_table: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  receipts_table: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
  vendors_table: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  bank_statement: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
};

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export function UploadHistory() {
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<FileKind | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "partial" | "error">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("uploadedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showFilters, setShowFilters] = useState(false);

  const queryArgs = useMemo(() => {
    const a: {
      kind?: FileKind; status?: "success" | "partial" | "error";
      fromDate?: number; toDate?: number; search?: string;
      sortBy: SortBy; sortOrder: SortOrder; limit: number;
    } = { sortBy, sortOrder, limit: 200 };
    if (kindFilter !== "all") a.kind = kindFilter;
    if (statusFilter !== "all") a.status = statusFilter;
    if (fromDate) a.fromDate = new Date(fromDate).getTime();
    if (toDate) a.toDate = new Date(toDate + "T23:59:59").getTime();
    if (search.trim()) a.search = search.trim();
    return a;
  }, [search, kindFilter, statusFilter, fromDate, toDate, sortBy, sortOrder]);

  const rows = useQuery(api.features.universalUploads.queries.listUniversalUploads, queryArgs);
  const stats = useQuery(api.features.universalUploads.queries.getUniversalUploadStats, {});
  const deleteUpload = useMutation(api.features.universalUploads.mutations.deleteUniversalUpload);

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`Hapus record upload "${fileName}" dari history? (Data domain TIDAK ikut terhapus)`)) return;
    try {
      await deleteUpload({ id: id as Id<"universalUploads"> });
      toast.success("Record history dihapus");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal hapus");
    }
  };

  const resetFilters = () => {
    setSearch(""); setKindFilter("all"); setStatusFilter("all");
    setFromDate(""); setToDate(""); setSortBy("uploadedAt"); setSortOrder("desc");
  };

  const activeFilterCount = [
    kindFilter !== "all", statusFilter !== "all", !!fromDate, !!toDate, !!search.trim(),
  ].filter(Boolean).length;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary/80" />
          <h2 className="font-semibold">Riwayat Upload</h2>
          {stats && (
            <span className="text-xs text-muted-foreground">
              ({stats.total} upload · {stats.totalRecords.toLocaleString("id-ID")} record total)
            </span>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted"
        >
          Filter
          {activeFilterCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`h-3 w-3 transition ${showFilters ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* ─── Stats chips ─── */}
      {stats && (
        <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-border/60 bg-muted/30">
          <span className="text-xs px-2 py-1 rounded-md bg-background border border-border/60">
            <CheckCircle className="inline h-3 w-3 text-emerald-600 mr-1" />
            Success: <b>{stats.byStatus.success ?? 0}</b>
          </span>
          {(stats.byStatus.partial ?? 0) > 0 && (
            <span className="text-xs px-2 py-1 rounded-md bg-background border border-border/60">
              <AlertTriangle className="inline h-3 w-3 text-amber-600 mr-1" />
              Partial: <b>{stats.byStatus.partial}</b>
            </span>
          )}
          {(stats.byStatus.error ?? 0) > 0 && (
            <span className="text-xs px-2 py-1 rounded-md bg-background border border-border/60">
              <AlertCircle className="inline h-3 w-3 text-rose-600 mr-1" />
              Error: <b>{stats.byStatus.error}</b>
            </span>
          )}
          {Object.entries(stats.byKind).map(([k, n]) => (
            <span key={k} className={`text-xs px-2 py-1 rounded-md ${KIND_TONE[k as FileKind] ?? "bg-muted"}`}>
              {KIND_LABEL[k as FileKind] ?? k}: <b>{n}</b>
            </span>
          ))}
        </div>
      )}

      {/* ─── Search + filter row ─── */}
      <div className="p-4 border-b border-border/60 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama file atau periode (mis. JAN, 2026-01, NEW LAP)…"
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <FilterField label="Jenis">
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value as FileKind | "all")}
                className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background"
              >
                <option value="all">Semua</option>
                {(Object.keys(KIND_LABEL) as FileKind[]).map((k) => (
                  <option key={k} value={k}>{KIND_LABEL[k]}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Status">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "success" | "partial" | "error")}
                className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background"
              >
                <option value="all">Semua</option>
                <option value="success">Success</option>
                <option value="partial">Partial</option>
                <option value="error">Error</option>
              </select>
            </FilterField>
            <FilterField label="Dari tanggal">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background"
              />
            </FilterField>
            <FilterField label="Sampai tanggal">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background"
              />
            </FilterField>
            <FilterField label="Urutkan">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background"
              >
                <option value="uploadedAt">Tanggal Upload</option>
                <option value="fileName">Nama File</option>
                <option value="recordCount">Jumlah Record</option>
                <option value="warningCount">Jumlah Warning</option>
              </select>
            </FilterField>
            <FilterField label="Arah">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background"
              >
                <option value="desc">Terbaru / Terbesar</option>
                <option value="asc">Terlama / Terkecil</option>
              </select>
            </FilterField>
            {activeFilterCount > 0 && (
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <button
                  onClick={resetFilters}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted"
                >
                  Reset semua filter
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Table ─── */}
      <div className="overflow-x-auto">
        {rows === undefined ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Memuat…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Tidak ada upload yang cocok.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Jenis</th>
                <th className="text-left px-4 py-2 font-semibold">File</th>
                <th className="text-left px-4 py-2 font-semibold">Periode</th>
                <th className="text-right px-4 py-2 font-semibold">Record</th>
                <th className="text-right px-4 py-2 font-semibold">Warning</th>
                <th className="text-left px-4 py-2 font-semibold">Tanggal</th>
                <th className="text-center px-4 py-2 font-semibold">Status</th>
                <th className="text-right px-4 py-2 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded inline-flex w-fit ${KIND_TONE[r.kind]}`}>
                        {KIND_LABEL[r.kind]}
                      </span>
                      {r.isLegacy && (
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-mono" title="Diimpor lewat halaman lama; metadata terbatas">
                          legacy
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 max-w-[280px]">
                    <p className="truncate font-medium" title={r.fileName}>{r.fileName}</p>
                    {r.fileSize > 0 && (
                      <p className="text-[10px] text-muted-foreground">{formatBytes(r.fileSize)}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {r.periodStart && r.periodEnd
                      ? `${r.periodStart} → ${r.periodEnd}`
                      : r.periodLabel ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {r.recordCount.toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {(r.warningCount ?? 0) > 0 ? (
                      <span className="font-mono tabular-nums text-amber-700 dark:text-amber-300">
                        {r.warningCount}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(r.uploadedAt)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      {r.weeklyReportId && (
                        <Link
                          href={`/laporan/${r.weeklyReportId}`}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Buka detail laporan"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
                      {!r.isLegacy && (
                        <button
                          onClick={() => void handleDelete(r._id, r.fileName)}
                          className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 text-muted-foreground hover:text-rose-600"
                          title="Hapus record history (tidak hapus data domain)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {rows && rows.length === 200 && (
        <div className="px-4 py-2 text-[11px] text-center text-muted-foreground border-t border-border/40">
          Menampilkan 200 hasil terbaru. Persempit filter untuk lihat record lain.
        </div>
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function StatusPill({ status }: { status: "success" | "partial" | "error" }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
        <CheckCircle className="h-2.5 w-2.5" /> Success
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <AlertTriangle className="h-2.5 w-2.5" /> Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200">
      <AlertCircle className="h-2.5 w-2.5" /> Error
    </span>
  );
}
