"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Users, Search, ChevronRight, AlertTriangle } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { useTableState } from "@/shared/hooks/useTableState";
import { SortableTh } from "@/shared/components";
import { formatRpFull } from "@/shared/lib";
import { cn } from "@/lib/utils";
import {
  VENDOR_TYPE_LABELS, VENDOR_TYPE_BADGE_CLS, VENDOR_TYPE_FILTER_OPTIONS,
  type VendorType,
} from "@/features/vendors/constants/types";
import { ImportLinkButton } from "@/features/universal-import/components/ImportLinkButton";

export default function VendorsListPage() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  const vendors = useQuery(
    api.features.payables.queries.listVendorsWithAggregate,
    branchId ? { branchId } : "skip",
  );

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [withOpenOnly, setWithOpenOnly] = useState(false);

  const filtered = useMemo(() => {
    if (!vendors) return [];
    return vendors.filter((v) => {
      if (typeFilter !== "all" && v.type !== typeFilter) return false;
      if (withOpenOnly && v.openTotal <= 0) return false;
      return true;
    });
  }, [vendors, typeFilter, withOpenOnly]);

  const { search, setSearch, sort, toggleSort, sortedItems } = useTableState(
    filtered,
    ["name", "type", "phone"],
  );

  const totals = useMemo(() => {
    const list = vendors ?? [];
    return {
      vendorCount: list.length,
      withOpen: list.filter((v) => v.openTotal > 0).length,
      totalOpen: list.reduce((s, v) => s + v.openTotal, 0),
      totalOverdue: list.reduce((s, v) => s + v.overdueCount, 0),
    };
  }, [vendors]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Vendor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daftar vendor + sinkronisasi piutang. Klik vendor untuk lihat riwayat utang, pembayaran, dan alias bank.
          </p>
        </div>
        <ImportLinkButton hint="Import vendor master / piutang dari xlsx" />
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Vendor" value={String(totals.vendorCount)} />
        <StatCard label="Ada Piutang Open" value={String(totals.withOpen)} accent="orange" />
        <StatCard label="Total Outstanding" value={formatRpFull(totals.totalOpen)} accent="red" />
        <StatCard label="Overdue Invoices" value={String(totals.totalOverdue)} accent={totals.totalOverdue > 0 ? "red" : undefined} />
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / tipe / telp..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {VENDOR_TYPE_FILTER_OPTIONS.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={withOpenOnly}
              onChange={(e) => setWithOpenOnly(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            <span>Hanya yang ada utang open</span>
          </label>
          <span className="text-[10px] text-muted-foreground font-mono ml-auto">{sortedItems.length} / {vendors?.length ?? 0} vendor</span>
        </div>

        {!vendors ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">Memuat vendor...</p>
        ) : sortedItems.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">Tidak ada vendor sesuai filter</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <SortableTh label="Nama Vendor" sortKey="name" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Tipe" sortKey="type" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Telp" sortKey="phone" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Piutang Open" sortKey="openTotal" sort={sort} onSort={toggleSort} className="text-right" />
                  <SortableTh label="Open" sortKey="openCount" sort={sort} onSort={toggleSort} className="text-center" />
                  <SortableTh label="Overdue" sortKey="overdueCount" sort={sort} onSort={toggleSort} className="text-center" />
                  <SortableTh label="Last Invoice" sortKey="lastInvoice" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Alias" sortKey="aliasCount" sort={sort} onSort={toggleSort} className="text-center" />
                  <th className="px-3 py-2 font-semibold text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((v) => (
                  <tr key={v._id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-3 py-2 font-semibold">
                      <Link href={`/finance/vendors/${v._id}`} className="hover:text-primary hover:underline">
                        {v.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded font-semibold", VENDOR_TYPE_BADGE_CLS[v.type as VendorType] ?? VENDOR_TYPE_BADGE_CLS.misc)}>
                        {VENDOR_TYPE_LABELS[v.type as VendorType] ?? v.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{v.phone || "—"}</td>
                    <td className={cn("px-3 py-2 text-right font-mono font-semibold", v.openTotal > 0 ? "text-destructive" : "text-muted-foreground")}>
                      {v.openTotal > 0 ? formatRpFull(v.openTotal) : "—"}
                    </td>
                    <td className="px-3 py-2 text-center font-mono">{v.openCount}</td>
                    <td className="px-3 py-2 text-center">
                      {v.overdueCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-semibold">
                          <AlertTriangle className="h-2.5 w-2.5" /> {v.overdueCount}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/70">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{v.lastInvoice ?? "—"}</td>
                    <td className="px-3 py-2 text-center font-mono">{v.aliasCount}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/finance/vendors/${v._id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        Detail <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: "red" | "orange" }) {
  const color =
    accent === "red" ? "text-destructive" :
    accent === "orange" ? "text-orange-600 dark:text-orange-400" :
    "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-bold mt-0.5", color)}>{value}</p>
    </div>
  );
}

