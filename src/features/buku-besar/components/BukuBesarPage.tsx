"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BookOpen, Pencil, Trash2, Upload, Download, Loader2,
  FileSpreadsheet, MessageSquareText, Landmark, FilePlus2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useBukuBesar, useBukuBesarCounts, useBulkDelete } from "../api";
import { BukuBesarTable, type BukuBesarRow } from "./BukuBesarTable";
import { BulkEditDialog } from "./BulkEditDialog";
import { KIND_LABEL } from "../constants/kind";

export function BukuBesarPage() {
  const rows = useBukuBesar();
  const counts = useBukuBesarCounts();
  const bulkDelete = useBulkDelete();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<BukuBesarRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedRows = useMemo(
    () => (rows ?? []).filter((r) => selected.has(r.id)),
    [rows, selected],
  );

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    if (!confirm(`Hapus ${selectedRows.length} row? Tidak bisa di-undo.`)) return;
    setDeleting(true);
    try {
      const res = await bulkDelete({
        targets: selectedRows.map((r) => ({ id: r.id, sourceTable: r.sourceTable })),
      });
      toast.success(`${res.deleted} row dihapus`);
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk delete gagal");
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    if (!rows || rows.length === 0) {
      toast.error("Tidak ada row untuk di-export");
      return;
    }
    const target = selectedRows.length > 0 ? selectedRows : rows;
    const header = ["Tanggal", "Jenis", "Kategori", "Counterparty", "Nominal", "Sisa", "Status", "Reference", "File", "Catatan"];
    const lines = target.map((r) => [
      r.date, KIND_LABEL[r.kind], r.kategori, r.counterparty,
      String(r.amount), String(r.sisa), r.status, r.reference, r.fileRef, r.notes,
    ].map((c) => /[,"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buku-besar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${target.length} row di-export`);
  };

  if (!rows) {
    return (
      <p className="px-8 py-12 text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat Buku Besar...
      </p>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Buku Besar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Semua transaksi cabang dalam satu tabel: tagihan, bayar, setoran, transfer owner, anomali. Pilih row → bulk edit/hapus. Filter chip + search + sort + export CSV. Import dari berbagai format lewat tombol kanan atas.
        </p>
      </header>

      {/* Action bar */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground">
          {selected.size > 0 ? `${selected.size} dipilih` : "Aksi:"}
        </span>
        <button
          onClick={() => setBulkEditOpen(true)}
          disabled={selected.size === 0}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold disabled:opacity-50"
        >
          <Pencil className="h-3.5 w-3.5" /> Bulk Edit
        </button>
        <button
          onClick={handleBulkDelete}
          disabled={selected.size === 0 || deleting}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 text-xs font-semibold disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Bulk Hapus
        </button>

        <span className="mx-2 text-muted-foreground/30">|</span>

        <ImportDropdown />

        <Link
          href="/finance/owner-transfer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold"
          title="Upload xlsx bank statement (Owner/PIC)"
        >
          <Landmark className="h-3.5 w-3.5" /> Statement Bank
        </Link>

        <Link
          href="/laporan/validasi-harian"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold"
          title="Cross-check teks WA harian"
        >
          <MessageSquareText className="h-3.5 w-3.5" /> Validasi WA
        </Link>

        <span className="mx-2 text-muted-foreground/30">|</span>

        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV {selectedRows.length > 0 ? `(${selectedRows.length})` : ""}
        </button>
      </div>

      <BukuBesarTable
        rows={rows}
        counts={counts}
        selected={selected}
        setSelected={setSelected}
        onEditRow={setEditRow}
      />

      <BulkEditDialog
        open={bulkEditOpen}
        onClose={() => setBulkEditOpen(false)}
        rows={selectedRows}
      />

      {/* Single-row edit (uses same BulkEditDialog with 1 item) */}
      <BulkEditDialog
        open={!!editRow}
        onClose={() => setEditRow(null)}
        rows={editRow ? [editRow] : []}
      />
    </div>
  );
}

function ImportDropdown() {
  const [open, setOpen] = useState(false);
  const options = [
    { label: "CSV Laporan PIC (LONG)", href: "/finance/laporan-pic?tab=import", desc: "paidDate / amount / paidBy / vendorName / ..." },
    { label: "CSV Match Piutang (PIVOT)", href: "/finance/laporan-pic?tab=import", desc: "Tanggal Piutang / Vendor / Match Status / ..." },
    { label: "CSV Setoran Harian", href: "/finance/closing", desc: "businessDate / openingCash / cashSales / ..." },
    { label: "CSV Bukti Bayar (lama)", href: "/laporan/bulk-import", desc: "Format lama — paidDate / amount / paidBy / ..." },
    { label: "CSV Penagihan (lama)", href: "/laporan/bulk-import", desc: "Format lama — vendorName / invoiceDate / amount / ..." },
  ];
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold"
      >
        <Upload className="h-3.5 w-3.5" /> Import CSV ▾
      </button>
      {open && (
        <>
          <button onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" aria-hidden />
          <div className="absolute z-50 mt-1 w-[300px] rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
            {options.map((o) => (
              <Link
                key={o.label}
                href={o.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 hover:bg-accent/40 border-b border-border/40 last:border-b-0"
              >
                <p className="text-xs font-semibold flex items-center gap-1.5"><FilePlus2 className="h-3 w-3" /> {o.label}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{o.desc}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
