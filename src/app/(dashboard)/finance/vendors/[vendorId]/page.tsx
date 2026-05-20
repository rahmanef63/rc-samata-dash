"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import {
  ArrowLeft, Users, Phone, Calendar, Receipt, Banknote, Link2,
  Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Search,
} from "lucide-react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTableState } from "@/shared/hooks/useTableState";
import { formatRpFull } from "@/shared/lib";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  partial: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function VendorDetailPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = use(params);
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;

  const detail = useQuery(
    api.features.payables.queries.getVendorDetail,
    branchId ? { vendorId: vendorId as Id<"vendors">, branchId } : "skip",
  );

  if (!branchId || !detail) {
    return <p className="p-8 text-center text-muted-foreground">Memuat detail vendor...</p>;
  }

  if (detail === null) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Link href="/finance/vendors" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">Vendor tidak ditemukan.</p>
      </div>
    );
  }

  const { vendor, payables, payments, linkedBankEntries, aliases } = detail;
  const openTotal = payables
    .filter((p) => p.status !== "paid")
    .reduce((s, p) => s + (p.amount - p.paidAmount), 0);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <Link href="/finance/vendors" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-3.5 w-3.5" /> Semua Vendor
      </Link>

      {/* Header */}
      <header className="rounded-xl border border-border bg-card shadow-sm p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              {vendor.name}
            </h1>
            <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted font-semibold uppercase tracking-wider">
                {vendor.type.replace("_", " ")}
              </span>
              {vendor.phone && (
                <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {vendor.phone}</span>
              )}
              {!vendor.isActive && (
                <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">INACTIVE</span>
              )}
            </div>
            {vendor.notes && <p className="text-xs text-muted-foreground mt-2">{vendor.notes}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2 min-w-[280px]">
            <KPI label="Piutang Open" value={formatRpFull(openTotal)} color={openTotal > 0 ? "text-destructive" : "text-muted-foreground"} />
            <KPI label="Total Inv" value={String(payables.length)} />
            <KPI label="Alias Bank" value={String(aliases.length)} />
          </div>
        </div>
      </header>

      <Tabs defaultValue="payables" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="payables" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Piutang ({payables.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5">
            <Banknote className="h-3.5 w-3.5" /> Pembayaran ({payments.length + linkedBankEntries.length})
          </TabsTrigger>
          <TabsTrigger value="aliases" className="gap-1.5">
            <Link2 className="h-3.5 w-3.5" /> Alias Bank ({aliases.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payables">
          <PayablesTab payables={payables} />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab payments={payments} linkedBankEntries={linkedBankEntries} payables={payables} />
        </TabsContent>
        <TabsContent value="aliases">
          <AliasesTab aliases={aliases} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ label, value, color = "text-foreground" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-2 text-center">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-bold mt-0.5", color)}>{value}</p>
    </div>
  );
}

// ─── Payables tab ─────────────────────────────────────────────

type Payable = {
  _id: Id<"payables">;
  invoiceDate: string;
  dueDate: string;
  description: string;
  amount: number;
  paidAmount: number;
  status: string;
  etlSource?: { tabLabel?: string; fileName?: string } | undefined;
};

function PayablesTab({ payables }: { payables: Payable[] }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const filtered = useMemo(() => {
    if (statusFilter === "all") return payables;
    return payables.filter((p) => p.status === statusFilter);
  }, [payables, statusFilter]);

  const { search, setSearch, sort, toggleSort, sortedItems } = useTableState(
    filtered,
    ["description", "status", "invoiceDate"],
  );

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari deskripsi / status / tanggal..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-lg border border-border bg-card"
        >
          <option value="all">Semua status</option>
          <option value="open">Open</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <span className="text-[10px] text-muted-foreground font-mono ml-auto">{sortedItems.length} row</span>
      </div>
      {sortedItems.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">Tidak ada piutang</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <SortTh label="Invoice" sortKey="invoiceDate" sort={sort} onSort={toggleSort} />
                <SortTh label="Jatuh Tempo" sortKey="dueDate" sort={sort} onSort={toggleSort} />
                <SortTh label="Deskripsi" sortKey="description" sort={sort} onSort={toggleSort} />
                <SortTh label="Amount" sortKey="amount" sort={sort} onSort={toggleSort} className="text-right" />
                <SortTh label="Dibayar" sortKey="paidAmount" sort={sort} onSort={toggleSort} className="text-right" />
                <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Sisa</th>
                <SortTh label="Status" sortKey="status" sort={sort} onSort={toggleSort} className="text-center" />
                <th className="px-3 py-2 font-semibold text-muted-foreground">Sumber</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((p) => {
                const remaining = p.amount - p.paidAmount;
                const sourceLabel = p.etlSource?.tabLabel ?? p.etlSource?.fileName ?? (p.etlSource ? "ETL" : "manual");
                return (
                  <tr key={p._id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-3 py-1.5 font-mono text-[11px]">{p.invoiceDate}</td>
                    <td className="px-3 py-1.5 font-mono text-[11px]">{p.dueDate}</td>
                    <td className="px-3 py-1.5 truncate max-w-[280px]" title={p.description}>{p.description}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{formatRpFull(p.amount)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">{formatRpFull(p.paidAmount)}</td>
                    <td className={cn("px-3 py-1.5 text-right font-mono font-semibold", remaining > 0 ? "text-destructive" : "text-green-600")}>
                      {formatRpFull(remaining)}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded font-semibold uppercase", STATUS_COLOR[p.status] ?? "bg-muted")}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-[10px] text-muted-foreground truncate max-w-[160px]" title={sourceLabel}>{sourceLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Payments tab ─────────────────────────────────────────────

function PaymentsTab({
  payments,
  linkedBankEntries,
  payables,
}: {
  payments: Array<{ payableId: string; paymentDate: string; amount: number; method: string; referenceNo: string; source: string }>;
  linkedBankEntries: Array<{ _id: string; payableId: string; txDate: string; debit: number; counterparty?: string; description: string; accountKind: string; paymentReference?: string }>;
  payables: Payable[];
}) {
  const rows = useMemo(() => {
    const payableLabel = new Map<string, string>(payables.map((p) => [p._id as string, `${p.invoiceDate} · ${p.description.slice(0, 40)}`]));
    const a = payments.map((p) => ({
      key: `pp:${p.payableId}:${p.referenceNo}:${p.paymentDate}`,
      date: p.paymentDate,
      amount: p.amount,
      method: p.method,
      reference: p.referenceNo,
      source: "manual",
      payableLabel: payableLabel.get(p.payableId) ?? "—",
    }));
    const b = linkedBankEntries.map((e) => ({
      key: `bk:${e._id}`,
      date: e.txDate,
      amount: e.debit,
      method: e.accountKind,
      reference: e.paymentReference ?? e.counterparty ?? "",
      source: "statement",
      payableLabel: payableLabel.get(e.payableId) ?? "—",
    }));
    return [...a, ...b];
  }, [payments, linkedBankEntries, payables]);

  const { search, setSearch, sort, toggleSort, sortedItems } = useTableState(
    rows,
    ["payableLabel", "reference", "date", "source"],
  );

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ref / tanggal / payable..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <span className="text-[10px] text-muted-foreground font-mono ml-auto">{sortedItems.length} pembayaran</span>
      </div>
      {sortedItems.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">Belum ada pembayaran tercatat</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <SortTh label="Tanggal" sortKey="date" sort={sort} onSort={toggleSort} />
                <SortTh label="Amount" sortKey="amount" sort={sort} onSort={toggleSort} className="text-right" />
                <SortTh label="Method" sortKey="method" sort={sort} onSort={toggleSort} />
                <SortTh label="Reference" sortKey="reference" sort={sort} onSort={toggleSort} />
                <SortTh label="Sumber" sortKey="source" sort={sort} onSort={toggleSort} />
                <SortTh label="Untuk Payable" sortKey="payableLabel" sort={sort} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((r) => (
                <tr key={r.key} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-mono text-[11px]"><Calendar className="inline h-3 w-3 mr-1 text-muted-foreground" />{r.date}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-destructive">{formatRpFull(r.amount)}</td>
                  <td className="px-3 py-1.5 text-[10px] uppercase font-semibold text-muted-foreground">{r.method}</td>
                  <td className="px-3 py-1.5 font-mono text-[11px] truncate max-w-[180px]" title={r.reference}>{r.reference || "—"}</td>
                  <td className="px-3 py-1.5">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded font-semibold",
                      r.source === "statement"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700",
                    )}>
                      {r.source}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-[11px] text-muted-foreground truncate max-w-[260px]" title={r.payableLabel}>{r.payableLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Aliases tab ──────────────────────────────────────────────

type Alias = {
  _id: Id<"vendorBankAliases">;
  alias: string;
  accountNo?: string;
  source: string;
  lastSeenAt: number;
  seenCount: number;
};

function AliasesTab({ aliases }: { aliases: Alias[] }) {
  const removeAlias = useMutation(api.features.payables.mutations.removeVendorAlias);
  const [pendingDelete, setPendingDelete] = useState<Id<"vendorBankAliases"> | null>(null);

  const handleDelete = async (id: Id<"vendorBankAliases">, alias: string) => {
    if (!confirm(`Hapus alias bank "${alias}"? Auto-match selanjutnya tidak akan kenali alias ini lagi.`)) return;
    setPendingDelete(id);
    try {
      await removeAlias({ aliasId: id });
      toast.success("Alias dihapus");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal hapus alias");
    } finally {
      setPendingDelete(null);
    }
  };

  const { search, setSearch, sort, toggleSort, sortedItems } = useTableState(
    aliases,
    ["alias", "accountNo", "source"],
  );

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari alias..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <span className="text-[10px] text-muted-foreground font-mono ml-auto">{sortedItems.length} alias</span>
      </div>
      {sortedItems.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">
          Belum ada alias bank — sistem otomatis pelajari saat user link bank entry ke payable vendor ini.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <SortTh label="Alias (normalized)" sortKey="alias" sort={sort} onSort={toggleSort} />
                <SortTh label="Account No" sortKey="accountNo" sort={sort} onSort={toggleSort} />
                <SortTh label="Sumber" sortKey="source" sort={sort} onSort={toggleSort} />
                <SortTh label="Pakai Terakhir" sortKey="lastSeenAt" sort={sort} onSort={toggleSort} />
                <SortTh label="Pakai" sortKey="seenCount" sort={sort} onSort={toggleSort} className="text-center" />
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((a) => (
                <tr key={a._id} className="border-t border-border/40 hover:bg-muted/20 group">
                  <td className="px-3 py-1.5 font-mono text-[11px]">{a.alias}</td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground">{a.accountNo ?? "—"}</td>
                  <td className="px-3 py-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-muted font-semibold uppercase">{a.source}</span>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
                    {new Date(a.lastSeenAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-3 py-1.5 text-center font-mono">{a.seenCount}</td>
                  <td className="px-3 py-1.5 text-right">
                    <button
                      onClick={() => handleDelete(a._id, a.alias)}
                      disabled={pendingDelete === a._id}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 disabled:opacity-100 disabled:cursor-wait"
                      title="Hapus alias"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SortTh({
  label, sortKey, sort, onSort, className,
}: {
  label: string;
  sortKey: string;
  sort: { key: string; dir: "asc" | "desc" | null };
  onSort: (key: string) => void;
  className?: string;
}) {
  const active = sort.key === sortKey && sort.dir !== null;
  const Icon = active ? (sort.dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th className={cn("px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap", className)}>
      <button onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        <Icon className={cn("h-3 w-3", active ? "text-primary" : "text-muted-foreground/50")} />
      </button>
    </th>
  );
}
