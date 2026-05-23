"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import {
  ArrowLeft, Users, Phone, Calendar, Receipt, Banknote, Link2,
  Trash2, Search, Pencil, Save, X as XIcon,
} from "lucide-react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTableState } from "@/shared/hooks/useTableState";
import { SortableTh } from "@/shared/components";
import { formatRpFull } from "@/shared/lib";
import { cn } from "@/lib/utils";
import { describePayable } from "@/features/payables/lib/describePayable";
import { VENDOR_TYPE_LABELS, type VendorType } from "@/features/vendors/constants/types";

export default function VendorDetailPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = use(params);

  const detail = useQuery(
    api.features.payables.queries.getVendorDetail,
    { vendorId: vendorId as Id<"vendors"> },
  );

  if (!detail) {
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
                {VENDOR_TYPE_LABELS[vendor.type as VendorType] ?? vendor.type}
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
          <PayablesTab payables={payables} payments={payments} linkedBankEntries={linkedBankEntries} />
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
  vendorName?: string;
  invoiceDate: string;
  dueDate: string;
  description: string;
  amount: number;
  paidAmount: number;
  status: string;
  etlSource?: { tabLabel?: string; fileName?: string } | undefined;
};

function PayablesTab({
  payables,
  payments,
  linkedBankEntries,
}: {
  payables: Payable[];
  payments: Array<{ payableId: string; paymentDate: string; amount: number; method: string; referenceNo?: string; source: string }>;
  linkedBankEntries: Array<{ payableId: string; txDate: string; debit: number; counterparty?: string; description: string; accountKind: string; paymentReference?: string }>;
}) {
  const updatePayable = useMutation(api.features.payables.mutations.update);
  const [editingId, setEditingId] = useState<Id<"payables"> | null>(null);
  const editingRow = useMemo(() => payables.find((p) => p._id === editingId) ?? null, [payables, editingId]);
  const [editDraft, setEditDraft] = useState<{
    invoiceDate: string; dueDate: string; amount: string; paidAmount: string; description: string;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const filtered = useMemo(() => {
    if (statusFilter === "all") return payables;
    return payables.filter((p) => p.status === statusFilter);
  }, [payables, statusFilter]);

  // Group payments (manual + statement) per payable for inline subtext.
  const paymentsByPayable = useMemo(() => {
    const map = new Map<string, Array<{ paymentDate: string; amount: number; method: string; referenceNo?: string; source: "manual" | "statement"; paidBy?: "owner" | "pic" }>>();
    for (const m of payments) {
      const arr = map.get(m.payableId) ?? [];
      arr.push({ paymentDate: m.paymentDate, amount: m.amount, method: m.method, referenceNo: m.referenceNo, source: "manual" as const });
      map.set(m.payableId, arr);
    }
    for (const b of linkedBankEntries) {
      const arr = map.get(b.payableId) ?? [];
      arr.push({
        paymentDate: b.txDate,
        amount: b.debit,
        method: b.accountKind, // "owner" | "pic"
        referenceNo: b.paymentReference,
        source: "statement" as const,
        paidBy: b.accountKind as "owner" | "pic",
      });
      map.set(b.payableId, arr);
    }
    return map;
  }, [payments, linkedBankEntries]);

  const { search, setSearch, sort, toggleSort, sortedItems } = useTableState(
    filtered,
    ["description", "status", "invoiceDate"],
  );

  const openEdit = (p: Payable) => {
    setEditingId(p._id);
    setEditDraft({
      invoiceDate: p.invoiceDate,
      dueDate: p.dueDate,
      amount: String(p.amount),
      paidAmount: String(p.paidAmount),
      description: p.description,
    });
  };
  const closeEdit = () => { setEditingId(null); setEditDraft(null); };
  const saveEdit = async () => {
    if (!editingId || !editDraft) return;
    try {
      const amount = Number(editDraft.amount.replace(/[^\d.-]/g, "")) || 0;
      const paidAmount = Number(editDraft.paidAmount.replace(/[^\d.-]/g, "")) || 0;
      await updatePayable({
        id: editingId,
        invoiceDate: editDraft.invoiceDate,
        dueDate: editDraft.dueDate,
        amount,
        paidAmount,
        description: editDraft.description,
      });
      toast.success("Piutang ter-update");
      closeEdit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal update");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <Dialog open={!!editingId} onOpenChange={(o) => { if (!o) closeEdit(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Piutang</DialogTitle>
          </DialogHeader>
          {editDraft && editingRow && (
            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground"><b>{editingRow.vendorName ?? ""}</b></p>
              <label className="flex flex-col gap-1">
                <span className="font-semibold uppercase text-[10px] text-muted-foreground">Tanggal Invoice</span>
                <input type="date" value={editDraft.invoiceDate} onChange={(e) => setEditDraft({ ...editDraft, invoiceDate: e.target.value })} className="px-2 py-1.5 rounded border border-border bg-background" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-semibold uppercase text-[10px] text-muted-foreground">Jatuh Tempo</span>
                <input type="date" value={editDraft.dueDate} onChange={(e) => setEditDraft({ ...editDraft, dueDate: e.target.value })} className="px-2 py-1.5 rounded border border-border bg-background" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-semibold uppercase text-[10px] text-muted-foreground">Amount (Rp)</span>
                <input type="text" inputMode="decimal" value={editDraft.amount} onChange={(e) => setEditDraft({ ...editDraft, amount: e.target.value })} className="px-2 py-1.5 rounded border border-border bg-background font-mono" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-semibold uppercase text-[10px] text-muted-foreground">Sudah Dibayar (Rp)</span>
                <input type="text" inputMode="decimal" value={editDraft.paidAmount} onChange={(e) => setEditDraft({ ...editDraft, paidAmount: e.target.value })} className="px-2 py-1.5 rounded border border-border bg-background font-mono" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-semibold uppercase text-[10px] text-muted-foreground">Deskripsi</span>
                <textarea value={editDraft.description} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} rows={2} className="px-2 py-1.5 rounded border border-border bg-background resize-y" />
              </label>
              <p className="text-[10px] text-muted-foreground italic">Status otomatis dihitung ulang dari amount + sudah dibayar.</p>
            </div>
          )}
          <DialogFooter>
            <button onClick={closeEdit} className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold inline-flex items-center gap-1.5">
              <XIcon className="h-3 w-3" /> Batal
            </button>
            <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold inline-flex items-center gap-1.5">
              <Save className="h-3.5 w-3.5" /> Simpan
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <option value="open">Belum dibayar</option>
          <option value="partial">Sebagian</option>
          <option value="paid">Lunas</option>
          <option value="overdue">Telat</option>
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
                <SortableTh label="Invoice" sortKey="invoiceDate" sort={sort} onSort={toggleSort} />
                <SortableTh label="Jatuh Tempo" sortKey="dueDate" sort={sort} onSort={toggleSort} />
                <SortableTh label="Deskripsi" sortKey="description" sort={sort} onSort={toggleSort} />
                <SortableTh label="Amount" sortKey="amount" sort={sort} onSort={toggleSort} align="right" />
                <SortableTh label="Dibayar" sortKey="paidAmount" sort={sort} onSort={toggleSort} align="right" />
                <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Sisa</th>
                <SortableTh label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
                <th className="px-3 py-2 font-semibold text-muted-foreground">Sumber</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((p) => {
                const remaining = p.amount - p.paidAmount;
                const sourceLabel = p.etlSource?.tabLabel ?? p.etlSource?.fileName ?? (p.etlSource ? "ETL" : "manual");
                const desc = describePayable(p, paymentsByPayable.get(p._id) ?? []);
                return (
                  <tr key={p._id} className="border-t border-border/40 hover:bg-muted/20 align-top">
                    <td className="px-3 py-1.5 font-mono text-[11px]">{p.invoiceDate}</td>
                    <td className="px-3 py-1.5 font-mono text-[11px]">{p.dueDate}</td>
                    <td className="px-3 py-1.5 truncate max-w-[280px]" title={p.description}>{p.description}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{formatRpFull(p.amount)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">{formatRpFull(p.paidAmount)}</td>
                    <td className={cn("px-3 py-1.5 text-right font-mono font-semibold", remaining > 0 ? "text-destructive" : "text-green-600")}>
                      {formatRpFull(remaining)}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="space-y-0.5">
                        <span className={cn("inline-block text-[10px] px-2 py-0.5 rounded font-semibold uppercase", desc.badgeCls)}>
                          {desc.badgeLabel}
                        </span>
                        {desc.subText && (
                          <p className="text-[10px] text-muted-foreground leading-tight">{desc.subText}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-[10px] text-muted-foreground truncate max-w-[160px]" title={sourceLabel}>{sourceLabel}</td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                        title="Edit piutang"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
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
                <SortableTh label="Tanggal" sortKey="date" sort={sort} onSort={toggleSort} />
                <SortableTh label="Amount" sortKey="amount" sort={sort} onSort={toggleSort} className="text-right" />
                <SortableTh label="Method" sortKey="method" sort={sort} onSort={toggleSort} />
                <SortableTh label="Reference" sortKey="reference" sort={sort} onSort={toggleSort} />
                <SortableTh label="Sumber" sortKey="source" sort={sort} onSort={toggleSort} />
                <SortableTh label="Untuk Payable" sortKey="payableLabel" sort={sort} onSort={toggleSort} />
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
                <SortableTh label="Alias (normalized)" sortKey="alias" sort={sort} onSort={toggleSort} />
                <SortableTh label="Account No" sortKey="accountNo" sort={sort} onSort={toggleSort} />
                <SortableTh label="Sumber" sortKey="source" sort={sort} onSort={toggleSort} />
                <SortableTh label="Pakai Terakhir" sortKey="lastSeenAt" sort={sort} onSort={toggleSort} />
                <SortableTh label="Pakai" sortKey="seenCount" sort={sort} onSort={toggleSort} className="text-center" />
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

