"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";
import {
  Landmark, Upload, Receipt as ReceiptIcon, FileSpreadsheet,
  Trash2, ExternalLink, Loader2, Info, FileText, CheckCircle, AlertTriangle,
  Download, GitCompare, Copy, History, Search,
} from "lucide-react";
import { useTableState } from "@/shared/hooks/useTableState";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatRpFull } from "@/shared/lib";
import { parseExcelFile } from "@/features/report-upload/lib/xlsxHelpers";
import { parseBankStatement, type BankStatementRow } from "@/features/report-upload/parsers/parseBankStatement";
import { PanduanAiDialog } from "@/features/report-upload/components/PanduanAiDialog";
import { StatementImportPreview, type EditableBankRow } from "@/features/bank-statement/components/StatementImportPreview";
import { BANK_CATEGORY_LABELS } from "@/features/bank-statement/constants/categories";
import type { Id } from "../../../../../convex/_generated/dataModel";

type AccountKind = "owner" | "pic";
type PaidBy = "owner" | "pic";

export default function OwnerTransferPage() {
  const receipts = useQuery(api.features.closing.queries.listPaymentReceipts, { limit: 1000 });
  const ownerBatches = useQuery(api.features.closing.queries.listBankStatementBatches, { accountKind: "owner" as const });
  const picBatches = useQuery(api.features.closing.queries.listBankStatementBatches, { accountKind: "pic" as const });

  const recAmount = useMemo(() => (receipts ?? []).reduce((s, r) => s + r.amount, 0), [receipts]);
  const ownerTx = useMemo(() => (ownerBatches ?? []).reduce((s, b) => s + b.rowCount, 0), [ownerBatches]);
  const picTx   = useMemo(() => (picBatches   ?? []).reduce((s, b) => s + b.rowCount, 0), [picBatches]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Landmark className="h-6 w-6 text-primary" />
          Bukti Bayar & Statement Rekening
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload bukti pembayaran piutang + statement rekening owner/PIC. Sistem akan cocokkan ke laporan mingguan + payables.
        </p>
      </header>

      {/* Ringkasan agregat — what's currently stored */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <RingkasanCard
          icon={<ReceiptIcon className="h-4 w-4" />}
          label="Bukti Bayar Piutang"
          primary={`${receipts?.length ?? 0} bukti`}
          secondary={recAmount > 0 ? `Total Rp ${recAmount.toLocaleString("id-ID")}` : "Belum ada"}
        />
        <RingkasanCard
          icon={<Landmark className="h-4 w-4" />}
          label="Statement Owner"
          primary={`${ownerBatches?.length ?? 0} batch · ${ownerTx} tx`}
          secondary={ownerBatches?.[0] ? `Terakhir: ${ownerBatches[0].fileName}` : "Belum ada"}
        />
        <RingkasanCard
          icon={<FileSpreadsheet className="h-4 w-4" />}
          label="Statement PIC"
          primary={`${picBatches?.length ?? 0} batch · ${picTx} tx`}
          secondary={picBatches?.[0] ? `Terakhir: ${picBatches[0].fileName}` : "Belum ada"}
        />
      </div>

      <Tabs defaultValue="receipts" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-3xl">
          <TabsTrigger value="receipts" className="gap-1.5">
            <ReceiptIcon className="h-3.5 w-3.5" /> Bukti Bayar
          </TabsTrigger>
          <TabsTrigger value="owner" className="gap-1.5">
            <Landmark className="h-3.5 w-3.5" /> St. Owner
          </TabsTrigger>
          <TabsTrigger value="pic" className="gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" /> St. PIC
          </TabsTrigger>
          <TabsTrigger value="validator" className="gap-1.5">
            <GitCompare className="h-3.5 w-3.5" /> Validator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receipts">
          <ReceiptsSection />
        </TabsContent>
        <TabsContent value="owner">
          <StatementSection accountKind="owner" />
        </TabsContent>
        <TabsContent value="pic">
          <StatementSection accountKind="pic" />
        </TabsContent>
        <TabsContent value="validator">
          <ValidatorSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Bukti Bayar Piutang section ───────────────────────────

function ReceiptsSection() {
  const receipts = useQuery(api.features.closing.queries.listPaymentReceipts, { limit: 50 });
  const openPayables = useQuery(api.features.closing.queries.listOpenPayables, {});
  const generateUrl = useMutation(api.features.closing.mutations.generateProofUploadUrl);
  const createReceipt = useMutation(api.features.closing.mutations.createPaymentReceipt);
  const removeReceipt = useMutation(api.features.closing.mutations.removePaymentReceipt);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    payableId: "" as Id<"payables"> | "",
    amount: "",
    paidDate: new Date().toISOString().slice(0, 10),
    paidBy: "owner" as PaidBy,
    channel: "transfer",
    reference: "",
    notes: "",
    file: null as File | null,
  });
  const [uploading, setUploading] = useState(false);

  const reset = () => setForm({
    payableId: "", amount: "", paidDate: new Date().toISOString().slice(0, 10),
    paidBy: "owner", channel: "transfer", reference: "", notes: "", file: null,
  });

  const submit = async () => {
    if (!form.amount || !form.paidDate) {
      toast.error("Jumlah dan tanggal wajib diisi");
      return;
    }
    setUploading(true);
    try {
      let proofStorageId: Id<"_storage"> | undefined;
      let proofFileName: string | undefined;
      let proofMimeType: string | undefined;
      if (form.file) {
        const uploadUrl = await generateUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": form.file.type },
          body: form.file,
        });
        if (!result.ok) throw new Error("Upload bukti gagal");
        const json = await result.json() as { storageId: Id<"_storage"> };
        proofStorageId = json.storageId;
        proofFileName = form.file.name;
        proofMimeType = form.file.type;
      }
      await createReceipt({
        payableId: form.payableId || undefined,
        amount: parseFloat(form.amount),
        paidDate: form.paidDate,
        paidBy: form.paidBy,
        channel: form.channel || undefined,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
        proofStorageId, proofFileName, proofMimeType,
      });
      toast.success("Bukti bayar tersimpan");
      reset();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal simpan bukti");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Form */}
      <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ReceiptIcon className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">Catat Bukti Bayar</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Tanggal bayar">
            <input type="date" value={form.paidDate} onChange={(e) => setForm({ ...form, paidDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Jumlah (Rp)">
            <input type="number" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} placeholder="1500000" />
          </Field>
          <Field label="Dibayar oleh">
            <select value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value as PaidBy })} className={inputCls}>
              <option value="owner">Owner (langsung)</option>
              <option value="pic">PIC (kasir / gofood)</option>
            </select>
          </Field>
          <Field label="Channel">
            <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className={inputCls}>
              <option value="transfer">Transfer Bank</option>
              <option value="cash">Cash</option>
              <option value="ewallet">E-Wallet</option>
              <option value="other">Lainnya</option>
            </select>
          </Field>
          <Field label="Piutang (opsional)" className="sm:col-span-2">
            <select value={form.payableId || ""} onChange={(e) => setForm({ ...form, payableId: e.target.value as Id<"payables"> | "" })} className={inputCls}>
              <option value="">— Belum di-link ke piutang —</option>
              {openPayables?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.vendorName} · {p.invoiceDate} · Rp {p.amount.toLocaleString("id-ID")} ({p.status})
                </option>
              ))}
            </select>
          </Field>
          <Field label="No referensi (opsional)" className="sm:col-span-1">
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className={inputCls} placeholder="TRF-2026-..." />
          </Field>
          <Field label="Catatan (opsional)" className="sm:col-span-2">
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} placeholder="Bayar setengah dulu..." />
          </Field>
          <Field label="Bukti (foto/PDF, opsional)" className="sm:col-span-2">
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} className="text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:font-semibold hover:file:bg-primary/90" />
          </Field>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={reset} className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted/50 text-xs font-semibold">Reset</button>
          <button
            onClick={submit}
            disabled={uploading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "Menyimpan..." : "Simpan Bukti Bayar"}
          </button>
        </div>
      </div>

      {/* Daftar bukti */}
      <ReceiptsListPanel
        receipts={receipts}
        onDelete={(id) => removeReceipt({ id }).then(() => toast.success("Bukti dihapus"))}
      />
    </div>
  );
}

function ReceiptsListPanel({
  receipts, onDelete,
}: {
  receipts: any[] | undefined;
  onDelete: (id: Id<"paymentReceipts">) => void;
}) {
  const [paidByFilter, setPaidByFilter] = useState<"all" | "owner" | "pic">("all");
  const filtered = useMemo(() => {
    const list = receipts ?? [];
    if (paidByFilter === "all") return list;
    return list.filter((r) => r.paidBy === paidByFilter);
  }, [receipts, paidByFilter]);
  const { search, setSearch, sortedItems } = useTableState(
    filtered,
    ["paidDate", "notes", "reference", "channel", "proofFileName"],
  );

  return (
    <div className="lg:col-span-1 rounded-xl border border-border bg-card shadow-sm flex flex-col overflow-hidden sticky top-6 max-h-[calc(100vh-3rem)]">
      <div className="p-4 border-b border-border/50 bg-muted/20 shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ReceiptIcon className="h-4 w-4 text-primary" />
            Riwayat Bukti
          </h2>
          <span className="text-[10px] text-muted-foreground font-mono">{sortedItems.length} / {receipts?.length ?? 0}</span>
        </div>
        <Link
          href="/finance/bukti-bayar"
          className="block w-full text-center text-[11px] font-medium text-primary hover:underline bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded px-2 py-1"
        >
          Lihat tabel lengkap (sort · filter · export) →
        </Link>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tanggal / catatan / ref..."
            className="w-full pl-6 pr-2 py-1 text-[11px] rounded border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "owner", "pic"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setPaidByFilter(k)}
              className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${paidByFilter === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
            >
              {k === "all" ? "Semua" : k}
            </button>
          ))}
        </div>
      </div>
      <div className="p-2 flex-1 overflow-y-auto">
        {!receipts ? (
          <p className="p-6 text-xs text-center text-muted-foreground">Memuat...</p>
        ) : sortedItems.length === 0 ? (
          <p className="p-6 text-xs text-center text-muted-foreground">{receipts.length === 0 ? "Belum ada bukti bayar" : "Tidak ada bukti sesuai filter"}</p>
        ) : (
          <div className="space-y-1">
            {sortedItems.map((r) => (
              <ReceiptRow key={r._id} receipt={r} onDelete={() => onDelete(r._id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReceiptRow({ receipt, onDelete }: { receipt: any; onDelete: () => void }) {
  const url = useQuery(
    api.features.closing.queries.getReceiptProofUrl,
    receipt.proofStorageId ? { storageId: receipt.proofStorageId } : "skip",
  );
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${receipt.paidBy === "owner" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}>
            {receipt.paidBy === "owner" ? "OWNER" : "PIC"}
          </span>
          <span className="text-xs font-mono">{receipt.paidDate}</span>
        </div>
        <p className="text-sm font-bold text-primary mt-0.5">{formatRpFull(receipt.amount)}</p>
        {receipt.proofFileName && (
          <p className="text-[10px] text-muted-foreground truncate" title={receipt.proofFileName}>{receipt.proofFileName}</p>
        )}
        {receipt.notes && <p className="text-[10px] text-muted-foreground truncate">{receipt.notes}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary" title="Buka bukti">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <button onClick={onDelete} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" title="Hapus">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Bank Statement section ─────────────────────────────────

function StatementSection({ accountKind }: { accountKind: AccountKind }) {
  const batches = useQuery(api.features.closing.queries.listBankStatementBatches, { accountKind });
  const generateUrl = useMutation(api.features.closing.mutations.generateProofUploadUrl);
  const createBatch = useMutation(api.features.closing.mutations.createBankStatementBatch);
  const removeBatch = useMutation(api.features.closing.mutations.removeBankStatementBatch);
  const importEntries = useMutation(api.features.closing.mutations.importBankStatementEntries);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [periodStart, setPeriodStart] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState<{ rows: EditableBankRow[]; file: File } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [detailBatchId, setDetailBatchId] = useState<Id<"bankStatementBatches"> | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const wb = await parseExcelFile(file);
      const yearHint = parseInt(periodStart.slice(0, 4), 10) || new Date().getFullYear();
      const rows = parseBankStatement(wb, yearHint);
      if (rows.length === 0) {
        toast.error("Tidak ada baris transaksi terdeteksi. Pastikan file pakai format 'Detail Transaksi Gabungan' — buka Panduan AI.");
        return;
      }
      setParsed({ rows, file });
      toast.success(`Berhasil parse ${rows.length} transaksi — review dulu sebelum import`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal baca file");
    } finally {
      setUploading(false);
    }
  };

  const confirmImport = async () => {
    if (!parsed) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUrl();
      const r = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": parsed.file.type }, body: parsed.file });
      if (!r.ok) throw new Error("Upload file ke storage gagal");
      const { storageId } = await r.json() as { storageId: Id<"_storage"> };
      const batchId = await createBatch({
        accountKind, periodStart, periodEnd,
        fileName: parsed.file.name, fileStorageId: storageId,
      });
      const res = await importEntries({
        batchId,
        rows: parsed.rows.map((row) => ({
          txDate: row.txDate,
          description: row.description,
          debit: row.debit,
          credit: row.kredit,
          balance: row.balance,
          channel: row.channel,
          category: row.category,
          counterparty: row.pihak,
          payableId: row.payableId,
          learnAlias: row.learnAlias,
        })),
      });
      toast.success(
        `${res.inserted} transaksi tersimpan${res.linkApplied > 0 ? ` · ${res.linkApplied} link manual` : ""}${res.autoLinkApplied > 0 ? ` · ${res.autoLinkApplied} auto-link payable` : ""} · saldo akhir Rp ${res.closingBalance.toLocaleString("id-ID")}`,
      );
      setParsed(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal import");
    } finally {
      setUploading(false);
    }
  };

  const label = accountKind === "owner" ? "Owner" : "PIC";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
            <p className="font-semibold">Parser aktif — format &quot;Detail Transaksi Gabungan&quot;.</p>
            <p className="mt-1">Upload xlsx hasil clean-up AI (kolom No, Bulan, Tanggal, Jenis Transaksi, Kategori, Pihak, Debit, Kredit, Saldo). Tahun ambil dari periode mulai. Klik Panduan AI di kanan kalau file kamu masih raw export bank.</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {accountKind === "owner" ? <Landmark className="h-4 w-4 text-primary" /> : <FileSpreadsheet className="h-4 w-4 text-primary" />}
              <h2 className="font-semibold text-sm">Upload Statement {label}</h2>
            </div>
            <button
              onClick={() => setShowGuide(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold"
            >
              <FileText className="h-3.5 w-3.5 text-primary" />
              Panduan AI
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Periode mulai">
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Periode akhir">
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="File statement (.xlsx / .xls / .csv)">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:font-semibold hover:file:bg-primary/90 disabled:opacity-50"
            />
          </Field>

          {uploading && !parsed && (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Memproses...
            </p>
          )}

          {parsed && (
            <StatementImportPreview
              rows={parsed.rows}
              fileName={parsed.file.name}
              uploading={uploading}
              onRowsChange={(rows) => setParsed({ ...parsed, rows })}
              onConfirm={confirmImport}
              onCancel={() => {
                setParsed(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
          )}
        </div>
      </div>

      {/* Riwayat batch */}
      <StatementBatchesPanel
        batches={batches}
        label={label}
        onOpenDetail={setDetailBatchId}
        onDelete={(b) => {
          if (!confirm(`Hapus statement "${b.fileName}"?\n\nSemua transaksi + link ke payable akan dihapus + payable.paidAmount direkomputasi.`)) return;
          removeBatch({ id: b._id }).then(() => toast.success("Statement dihapus"));
        }}
      />

      <PanduanAiDialog open={showGuide} onOpenChange={setShowGuide} kind="bankStatement" />
      {detailBatchId && (
        <BatchDetailSheet batchId={detailBatchId} onClose={() => setDetailBatchId(null)} accountLabel={label} />
      )}
    </div>
  );
}

type StatementBatch = {
  _id: Id<"bankStatementBatches">;
  fileName: string;
  periodStart: string;
  periodEnd: string;
  status: "uploaded" | "parsed" | "reconciled";
  rowCount: number;
  closingBalance?: number;
};

function StatementBatchesPanel({
  batches, label, onOpenDetail, onDelete,
}: {
  batches: StatementBatch[] | undefined;
  label: string;
  onOpenDetail: (id: Id<"bankStatementBatches">) => void;
  onDelete: (b: StatementBatch) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<"all" | "uploaded" | "parsed" | "reconciled">("all");
  const filtered = useMemo(() => {
    const list = batches ?? [];
    if (statusFilter === "all") return list;
    return list.filter((b) => b.status === statusFilter);
  }, [batches, statusFilter]);
  const { search, setSearch, sortedItems } = useTableState(
    filtered,
    ["fileName", "periodStart", "periodEnd", "status"],
  );

  return (
    <div className="lg:col-span-1 rounded-xl border border-border bg-card shadow-sm flex flex-col overflow-hidden sticky top-6 max-h-[calc(100vh-3rem)]">
      <div className="p-4 border-b border-border/50 bg-muted/20 shrink-0 space-y-2">
        <Link
          href="/finance/bank-batches"
          className="block w-full text-center text-[11px] font-medium text-primary hover:underline bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded px-2 py-1"
        >
          Lihat tabel lengkap (sort · filter · export) →
        </Link>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />
            Riwayat Statement {label}
          </h2>
          <span className="text-[10px] text-muted-foreground font-mono">{sortedItems.length} / {batches?.length ?? 0}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari file / periode..."
            className="w-full pl-6 pr-2 py-1 text-[11px] rounded border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(["all", "uploaded", "parsed", "reconciled"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${statusFilter === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
            >
              {k === "all" ? "Semua" : k}
            </button>
          ))}
        </div>
      </div>
      <div className="p-2 flex-1 overflow-y-auto">
        {!batches ? (
          <p className="p-6 text-xs text-center text-muted-foreground">Memuat...</p>
        ) : sortedItems.length === 0 ? (
          <p className="p-6 text-xs text-center text-muted-foreground">{batches.length === 0 ? "Belum ada statement" : "Tidak ada statement sesuai filter"}</p>
        ) : (
          <div className="space-y-1">
            {sortedItems.map((b) => (
              <div
                key={b._id}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30 group cursor-pointer"
                onClick={() => onOpenDetail(b._id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-foreground group-hover:text-primary transition-colors" title={b.fileName}>{b.fileName}</p>
                  <p className="text-[10px] text-muted-foreground">{b.periodStart} → {b.periodEnd}</p>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      b.status === "parsed" || b.status === "reconciled"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {b.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{b.rowCount} tx</span>
                    {b.closingBalance != null && (
                      <span className="text-[10px] font-mono text-primary">Rp {b.closingBalance.toLocaleString("id-ID")}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(b); }}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                  title="Hapus"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Batch detail sheet ────────────────────────────────────

function BatchDetailSheet({ batchId, onClose, accountLabel }: { batchId: Id<"bankStatementBatches">; onClose: () => void; accountLabel: string }) {
  const entries = useQuery(api.features.closing.queries.listBankStatementEntries, { batchId });
  const [catFilter, setCatFilter] = useState<string>("all");
  const [valFilter, setValFilter] = useState<"all" | "validated" | "unvalidated">("all");

  const filtered = useMemo(() => {
    if (!entries) return [];
    let arr = entries;
    if (catFilter !== "all") arr = arr.filter((e) => (e.category ?? "other") === catFilter);
    if (valFilter === "validated") arr = arr.filter((e) => !!e.isValidated);
    if (valFilter === "unvalidated") arr = arr.filter((e) => !e.isValidated);
    return arr;
  }, [entries, catFilter, valFilter]);

  const validatedStats = useMemo(() => {
    if (!entries) return { validated: 0, unvalidated: 0 };
    let v = 0, u = 0;
    for (const e of entries) (e.isValidated ? v++ : u++);
    return { validated: v, unvalidated: u };
  }, [entries]);

  const summary = useMemo(() => {
    if (!entries) return null;
    const by: Record<string, { count: number; debit: number; credit: number }> = {};
    let totalDebit = 0, totalCredit = 0;
    for (const e of entries) {
      const k = e.category ?? "other";
      by[k] = by[k] ?? { count: 0, debit: 0, credit: 0 };
      by[k].count++;
      by[k].debit += e.debit;
      by[k].credit += e.credit;
      totalDebit += e.debit;
      totalCredit += e.credit;
    }
    return { by, totalDebit, totalCredit, net: totalCredit - totalDebit };
  }, [entries]);

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4 text-primary" />
            Detail Statement {accountLabel}
          </SheetTitle>
          {entries && (
            <p className="text-xs text-muted-foreground">{entries.length} transaksi · klik chip kategori untuk filter</p>
          )}
        </SheetHeader>

        {!entries ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Memuat...
          </div>
        ) : entries.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground gap-2">
            <AlertTriangle className="h-4 w-4" /> Batch ini belum ada entries
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Summary */}
            {summary && (
              <div className="px-6 py-3 grid grid-cols-3 gap-2 border-b border-border shrink-0 bg-muted/10">
                <div className="rounded-lg bg-card border border-border p-2 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Kredit Masuk</p>
                  <p className="text-xs font-bold text-green-600 mt-0.5">{formatRpFull(summary.totalCredit)}</p>
                </div>
                <div className="rounded-lg bg-card border border-border p-2 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Debit Keluar</p>
                  <p className="text-xs font-bold text-destructive mt-0.5">{formatRpFull(summary.totalDebit)}</p>
                </div>
                <div className="rounded-lg bg-card border border-border p-2 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Net</p>
                  <p className={`text-xs font-bold mt-0.5 ${summary.net >= 0 ? "text-primary" : "text-destructive"}`}>{formatRpFull(summary.net)}</p>
                </div>
              </div>
            )}

            {/* Category filter chips */}
            {summary && (
              <div className="px-6 py-2 border-b border-border shrink-0 flex gap-1.5 flex-wrap">
                <FilterChip active={catFilter === "all"} onClick={() => setCatFilter("all")}>
                  Semua ({entries.length})
                </FilterChip>
                {Object.entries(summary.by).map(([cat, v]) => (
                  <FilterChip key={cat} active={catFilter === cat} onClick={() => setCatFilter(cat)}>
                    {BANK_CATEGORY_LABELS[cat as keyof typeof BANK_CATEGORY_LABELS] ?? cat} ({v.count})
                  </FilterChip>
                ))}
              </div>
            )}

            {/* Validation filter chips */}
            <div className="px-6 py-2 border-b border-border shrink-0 flex gap-1.5 flex-wrap items-center">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Validasi:</span>
              <FilterChip active={valFilter === "all"} onClick={() => setValFilter("all")}>
                Semua
              </FilterChip>
              <FilterChip active={valFilter === "validated"} onClick={() => setValFilter("validated")}>
                Tervalidasi ({validatedStats.validated})
              </FilterChip>
              <FilterChip active={valFilter === "unvalidated"} onClick={() => setValFilter("unvalidated")}>
                Belum ({validatedStats.unvalidated})
              </FilterChip>
            </div>

            {/* Entry table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/40 sticky top-0 z-10">
                  <tr className="text-left">
                    <th className="px-3 py-1.5 font-semibold w-6"></th>
                    <th className="px-3 py-1.5 font-semibold">Tgl</th>
                    <th className="px-3 py-1.5 font-semibold">Kategori</th>
                    <th className="px-3 py-1.5 font-semibold">Pihak</th>
                    <th className="px-3 py-1.5 font-semibold">Payment Ref</th>
                    <th className="px-3 py-1.5 font-semibold text-right">Debit</th>
                    <th className="px-3 py-1.5 font-semibold text-right">Kredit</th>
                    <th className="px-3 py-1.5 font-semibold text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e._id} className="border-t border-border/40 hover:bg-muted/20">
                      <td className="px-3 py-1 text-center">
                        {e.isValidated
                          ? <CheckCircle className="h-3 w-3 text-green-600 inline" />
                          : <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/30" />}
                      </td>
                      <td className="px-3 py-1 font-mono">{e.txDate}</td>
                      <td className="px-3 py-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                          {BANK_CATEGORY_LABELS[(e.category ?? "other") as keyof typeof BANK_CATEGORY_LABELS]}
                        </span>
                      </td>
                      <td className="px-3 py-1 truncate max-w-[140px]" title={e.counterparty ?? e.description}>{e.counterparty ?? "-"}</td>
                      <td className="px-3 py-1 font-mono text-[10px] text-muted-foreground">{e.paymentReference ?? "—"}</td>
                      <td className="px-3 py-1 text-right font-mono text-destructive">{e.debit > 0 ? formatRpFull(e.debit) : "—"}</td>
                      <td className="px-3 py-1 text-right font-mono text-green-600">{e.credit > 0 ? formatRpFull(e.credit) : "—"}</td>
                      <td className="px-3 py-1 text-right font-mono text-muted-foreground">{e.balance > 0 ? formatRpFull(e.balance) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted-foreground/10"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Tiny field helper ─────────────────────────────────────

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40";

function RingkasanCard({ icon, label, primary, secondary }: { icon: React.ReactNode; label: string; primary: string; secondary: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground mt-1.5">{primary}</p>
      <p className="text-[11px] text-muted-foreground truncate" title={secondary}>{secondary}</p>
    </div>
  );
}

// ─── Validator (reconciliation) section ─────────────────────

const VALIDATOR_PROMPT = `Kamu asisten reconciliation RC Samata. File CSV ini berisi 2 jenis baris:
  - PAYABLE = piutang vendor (perlu dibayar)
  - BANK    = transaksi bank statement (debit aktual = bayar keluar)

Tugasmu: cocokkan BANK ke PAYABLE seagresif mungkin.

KOLOM PENTING:
- vendor_or_party : nama vendor (PAYABLE) atau nama counterparty bank (BANK).
                    Counterparty bank = nama orang/PT yang nerima transfer.
- amount          : nominal transaksi (BANK.debit atau PAYABLE.amount).
- remaining       : sisa piutang PAYABLE (= amount - paidAmount).
                    UNTUK PAYABLE INI YANG HARUS DI-MATCH, BUKAN amount!
                    BANK kosong di kolom ini.
- description     : note bebas dari bank. KADANG vendor real ada di sini
                    (kalau counterparty cuma "TRANSFER" / kosong), scan juga.

ATURAN INTI (cuma 2):
1. VENDOR cocok — substring match case-insensitive antara
   BANK.vendor_or_party (atau BANK.description) dengan PAYABLE.vendor_or_party.
   Abaikan suffix korporat: "INDONES"/"CV"/"PT"/"TBK"/"TBK." Contoh:
   "JAPFA FOOD INDONES" cocok dengan "JAPFA".
   Kalau BANK.vendor_or_party kosong/garbage (cuma nomor / "TRANSFER"),
   coba match dari BANK.description.
2. NOMINAL cocok — toleransi Rp 1.500, salah satu:
   a) Single match: BANK.amount ≈ PAYABLE.remaining
   b) Split match (2-3 BANK rows ke 1 PAYABLE): sum BANK.amount ≈ PAYABLE.remaining

TANGGAL TIDAK DIPAKAI sebagai filter. Bayar bisa sebelum/sesudah invoice.

Multiple BANK row yang bayar SATU payable WAJIB pakai payment_reference
SAMA. Format "PMT-YYYYMM-NNNN" (YYYYMM dari tanggal BANK pertama, NNNN
counter mulai 0001 per file).

Yang harus diisi (BANK rows ke-match):
- matched_payable_id : id PAYABLE yang di-bayar
- payment_reference  : PMT-YYYYMM-NNNN (group identifier)
- is_validated       : "true"

Yang harus diisi (PAYABLE rows ke-match):
- payment_reference  : sama dengan grup BANK
- is_validated       : "true"

Default: kalau ragu, MATCH dulu — owner bisa review/deny di UI.
Lebih baik over-match daripada miss. Hanya kosongkan kalau BENAR-BENAR
gak ada vendor candidate atau amount jauh berbeda.

KALAU SEMUA SISA BANK GAK ADA VENDOR CANDIDATE di PAYABLE:
- Cek bagian VENDOR MASTER di footer CSV (comments "# VENDOR:").
- Kalau counterparty BANK mirip nama vendor di master tapi vendor itu
  gak punya open payable, kosongkan saja — itu bukan piutang.
- Jangan paksa match ke vendor random.

Output: CSV persis sama (header sama, semua baris, urut sama),
3 kolom terakhir (matched_payable_id / payment_reference / is_validated)
keisi untuk row yang match. Jangan ubah kolom lain. Jangan tambahin kolom lain.`;

function buildValidationCsv(
  payables: any[],
  bank: any[],
  vendorMaster?: { name: string; aliases: string[] }[],
): string {
  const header = "type,id,date,vendor_or_party,amount,remaining,description,current_ref,matched_payable_id,payment_reference,is_validated";
  const lines: string[] = [];
  lines.push(`# RC SAMATA RECONCILIATION VALIDATOR — ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`#`);
  lines.push(`# AI PROMPT (copy block di bawah, paste ke ChatGPT/Claude + attach file ini):`);
  lines.push(`#`);
  for (const line of VALIDATOR_PROMPT.split("\n")) lines.push(`# ${line}`);
  lines.push(`#`);
  lines.push(`# Total payables: ${payables.length}, total bank entries: ${bank.length}`);
  lines.push(`#`);
  lines.push(header);
  for (const p of payables) {
    const remaining = Math.max(0, (p.amount ?? 0) - (p.paidAmount ?? 0));
    lines.push([
      "PAYABLE", p._id, p.invoiceDate, csv(p.vendorName), p.amount,
      remaining,
      csv(p.description ?? ""),
      csv(p.paymentReference ?? ""),
      "", "", String(!!p.isValidated),
    ].join(","));
  }
  for (const b of bank) {
    const counterparty = (b.counterparty ?? "").trim();
    lines.push([
      "BANK", b._id, b.txDate, csv(counterparty),
      b.debit > 0 ? b.debit : b.credit,
      "",
      csv(b.description ?? ""),
      csv(b.paymentReference ?? ""),
      csv(b.payableId ?? ""),
      "", String(!!b.isValidated),
    ].join(","));
  }
  if (vendorMaster && vendorMaster.length > 0) {
    lines.push(``);
    lines.push(`# ─── VENDOR MASTER (untuk reference matching, JANGAN diubah/diisi) ───`);
    for (const v of vendorMaster) {
      const aliasStr = v.aliases.length > 0 ? ` | aliases: ${v.aliases.join(" / ")}` : "";
      lines.push(`# VENDOR: ${v.name}${aliasStr}`);
    }
  }
  return lines.join("\n");
}

function csv(s: string | undefined): string {
  const v = String(s ?? "");
  if (/[,"\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

type CsvUpdate = {
  entryType: "bank_entry" | "payable";
  entryId: string;
  paymentReference?: string;
  matchedPayableId?: string;
  isValidated?: boolean;
};

function parseValidationCsv(text: string): CsvUpdate[] {
  const lines = text.split(/\r?\n/);
  const rows: CsvUpdate[] = [];
  let headerCols: string[] | null = null;
  for (const raw of lines) {
    if (!raw.trim()) continue;
    if (raw.startsWith("#")) continue;
    const cells = parseCsvLine(raw);
    if (!headerCols) {
      headerCols = cells.map((c) => c.trim().toLowerCase());
      continue;
    }
    const obj: Record<string, string> = {};
    headerCols.forEach((h, i) => { obj[h] = (cells[i] ?? "").trim(); });
    if (!obj.id || !obj.type) continue;
    rows.push({
      entryType: obj.type.toUpperCase() === "BANK" ? "bank_entry" : "payable",
      entryId: obj.id,
      paymentReference: obj.payment_reference || undefined,
      matchedPayableId: obj.matched_payable_id || undefined,
      isValidated: obj.is_validated ? obj.is_validated.toLowerCase() === "true" : undefined,
    });
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else {
      if (ch === ",") { out.push(cur); cur = ""; }
      else if (ch === '"') inQ = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function ValidatorSection() {
  const candidates = useQuery(api.features.closing.queries.listValidationCandidates, {});
  const batches = useQuery(api.features.closing.queries.listValidationBatches, { limit: 20 });
  const applyBatch = useMutation(api.features.closing.mutations.applyValidationBatch);
  const commitMatches = useMutation(api.features.closing.mutations.commitAutoMatchSuggestions);
  const deleteBatch = useMutation(api.features.closing.mutations.deleteValidationBatch);
  const generateUrl = useMutation(api.features.closing.mutations.generateProofUploadUrl);

  const [previewMode, setPreviewMode] = useState<"idle" | "auto" | "csv">("idle");
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [pendingCsv, setPendingCsv] = useState<{ updates: CsvUpdate[]; fileName: string; file: File } | null>(null);
  const [committing, setCommitting] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [openBatchLogId, setOpenBatchLogId] = useState<Id<"validationBatches"> | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<Id<"validationBatches"> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteBatch = async (batchId: Id<"validationBatches">, fileName: string, rowsApplied: number) => {
    if (!confirm(
      `Hapus batch validasi "${fileName}"?\n\n` +
      `${rowsApplied} perubahan akan di-UNDO — payment reference, link payable, status validasi, ` +
      `paidAmount + status payable akan dikembalikan ke kondisi sebelum batch ini di-apply.\n\n` +
      `Aksi ini tidak bisa di-ulang. Lanjutkan?`
    )) return;
    setDeletingBatchId(batchId);
    try {
      const res = await deleteBatch({ batchId });
      toast.success(`Batch dihapus — ${res.reverted} entry direvert, ${res.payablesRecomputed} payable direkomputasi`);
      if (openBatchLogId === batchId) setOpenBatchLogId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal hapus batch");
    } finally {
      setDeletingBatchId(null);
    }
  };

  // Only fetch preview when user opens it
  const preview = useQuery(
    api.features.closing.queries.previewAutoMatch,
    previewMode === "auto" ? {} : "skip",
  );

  // Init approved set when preview loads
  useEffect(() => {
    if (previewMode === "auto" && preview) {
      setApproved(new Set(preview.suggestions.map((s) => s.payableId)));
    }
    if (previewMode === "csv" && pendingCsv) {
      setApproved(new Set(pendingCsv.updates.map((u) => `${u.entryType}:${u.entryId}`)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode, preview, pendingCsv]);

  const toggle = (id: string) => {
    setApproved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = (ids: string[], on: boolean) => {
    setApproved((prev) => {
      const next = new Set(prev);
      if (on) ids.forEach((i) => next.add(i));
      else ids.forEach((i) => next.delete(i));
      return next;
    });
  };

  const commitAuto = async () => {
    if (!preview) return;
    const filtered = preview.suggestions.filter((s) => approved.has(s.payableId));
    if (filtered.length === 0) {
      toast.error("Tidak ada match yang di-accept");
      return;
    }
    setCommitting(true);
    try {
      const res = await commitMatches({
        matches: filtered.map((s) => ({
          payableId: s.payableId as Id<"payables">,
          bankEntryIds: s.bankEntryIds as Id<"bankStatementEntries">[],
        })),
      });
      toast.success(`Tersimpan: ${res.applied} cell di ${filtered.length} payable`);
      setPreviewMode("idle");
      setApproved(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Commit gagal");
    } finally {
      setCommitting(false);
    }
  };

  const commitCsv = async () => {
    if (!pendingCsv) return;
    const filtered = pendingCsv.updates.filter((u) => approved.has(`${u.entryType}:${u.entryId}`));
    if (filtered.length === 0) {
      toast.error("Tidak ada perubahan yang di-accept");
      return;
    }
    setCommitting(true);
    try {
      const uploadUrl = await generateUrl();
      const r = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": pendingCsv.file.type || "text/csv" }, body: pendingCsv.file });
      const { storageId } = await r.json() as { storageId: Id<"_storage"> };
      const res = await applyBatch({
        fileName: pendingCsv.fileName,
        fileStorageId: storageId,
        updates: filtered,
      });
      toast.success(`Validasi: ${res.applied} applied · ${res.rejected} rejected · dari ${filtered.length} row yg di-accept`);
      setPendingCsv(null);
      setPreviewMode("idle");
      setApproved(new Set());
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Apply gagal");
    } finally {
      setCommitting(false);
    }
  };

  const stats = useMemo(() => {
    if (!candidates) return null;
    const payValidated = candidates.payables.filter((p) => p.isValidated).length;
    const bankValidated = candidates.bank.filter((b) => b.isValidated).length;
    return {
      payables: candidates.payables.length,
      bank: candidates.bank.length,
      validated: payValidated + bankValidated,
    };
  }, [candidates]);

  const downloadCsv = () => {
    if (!candidates) return;
    const csvText = buildValidationCsv(candidates.payables, candidates.bank, candidates.vendorMaster);
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rc-samata-validator-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(VALIDATOR_PROMPT);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const handleCsvPick = async (file: File) => {
    try {
      const text = await file.text();
      const updates = parseValidationCsv(text);
      // Only show "interesting" updates — kalau row gak ada perubahan yg
      // mau dipush (semua kosong), skip dari preview.
      const interesting = updates.filter((u) =>
        u.paymentReference !== undefined ||
        u.matchedPayableId !== undefined ||
        u.isValidated === true
      );
      if (interesting.length === 0) {
        toast.error("CSV gak ada perubahan untuk di-apply");
        return;
      }
      setPendingCsv({ updates: interesting, fileName: file.name, file });
      setPreviewMode("csv");
      toast.success(`Parse ${interesting.length} perubahan — review dulu sebelum apply`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal parse CSV");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed space-y-1">
            <p className="font-semibold">Reconciliation flow (cocokkan BANK ↔ PAYABLE):</p>
            <ol className="list-decimal list-inside space-y-0.5 ml-1">
              <li>Klik <b>Download CSV Validasi</b> — file berisi list payables + bank entries belum ke-match.</li>
              <li>Copy <b>AI Prompt</b>, paste ke ChatGPT/Claude + attach CSV.</li>
              <li>AI isi kolom <code className="bg-card px-1 rounded">matched_payable_id</code> + <code className="bg-card px-1 rounded">payment_reference</code>.</li>
              <li>Upload CSV hasil AI — sistem update reference + log setiap perubahan.</li>
            </ol>
            <p className="mt-1 italic">Catatan: 1 payable bisa di-bayar 2-3 BANK rows (split / wrong transfer). AI handle ini via payment_reference sama.</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Payables Open/Partial" value={stats.payables} />
            <StatCard label="Bank Entries Belum Validasi" value={stats.bank} />
            <StatCard label="Sudah Tervalidasi" value={stats.validated} color="text-green-600" />
          </div>
        )}

        {/* Auto-match (rule-based, no AI needed) */}
        {previewMode === "idle" && (
          <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-900 dark:text-purple-200">
              <GitCompare className="h-4 w-4" />
              Auto-match (sebelum kirim ke AI)
            </div>
            <p className="text-xs text-purple-800/80 dark:text-purple-300/80 leading-relaxed">
              Rule-based: <b>vendor alias</b> + <b>nominal cocok</b> (exact atau split 2-3 row).
              Tanggal di-skip. Preview dulu, terus accept/deny per row sebelum commit.
            </p>
            <button
              onClick={() => setPreviewMode("auto")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
            >
              <GitCompare className="h-3.5 w-3.5" />
              Preview Auto-match
            </button>
          </div>
        )}

        {/* Preview: auto-match suggestions */}
        {previewMode === "auto" && (
          <AutoMatchPreview
            preview={preview}
            approved={approved}
            onToggle={toggle}
            onToggleAll={(ids, on) => toggleAll(ids, on)}
            onCancel={() => { setPreviewMode("idle"); setApproved(new Set()); }}
            onCommit={commitAuto}
            committing={committing}
          />
        )}

        {/* Preview: CSV uploaded */}
        {previewMode === "csv" && pendingCsv && (
          <CsvPreview
            pending={pendingCsv}
            approved={approved}
            onToggle={toggle}
            onToggleAll={(ids, on) => toggleAll(ids, on)}
            onCancel={() => { setPreviewMode("idle"); setApproved(new Set()); setPendingCsv(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
            onCommit={commitCsv}
            committing={committing}
          />
        )}

        {/* Download + Upload (hidden during preview) */}
        {previewMode === "idle" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Download className="h-4 w-4 text-primary" />
                Download File Validasi
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                CSV berisi {candidates?.payables.length ?? 0} payables + {candidates?.bank.length ?? 0} bank entries + AI prompt di header.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={copyPrompt}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  {promptCopied ? <CheckCircle className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  {promptCopied ? "Disalin" : "Salin Prompt"}
                </button>
                <button
                  onClick={downloadCsv}
                  disabled={!candidates}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="h-3 w-3" />
                  Download CSV
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Upload className="h-4 w-4 text-primary" />
                Upload File Tervalidasi
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload CSV hasil AI. Sistem parse → tampilkan preview → kamu accept/deny per row → commit.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCsvPick(f);
                }}
                className="w-full text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:font-semibold hover:file:bg-primary/90"
              />
            </div>
          </div>
        )}
      </div>

      {/* Riwayat batch validator */}
      <ValidatorBatchesPanel
        batches={batches}
        deletingBatchId={deletingBatchId}
        onOpenLog={setOpenBatchLogId}
        onDelete={(b) => void handleDeleteBatch(b._id, b.fileName, b.rowsApplied)}
      />

      {openBatchLogId && (() => {
        const batch = batches?.find((b) => b._id === openBatchLogId);
        return (
          <ValidationLogSheet
            batchId={openBatchLogId}
            fileName={batch?.fileName}
            rowsApplied={batch?.rowsApplied ?? 0}
            isDeleting={deletingBatchId === openBatchLogId}
            onDelete={batch ? () => handleDeleteBatch(batch._id, batch.fileName, batch.rowsApplied) : undefined}
            onClose={() => setOpenBatchLogId(null)}
          />
        );
      })()}
    </div>
  );
}

type ValidatorBatch = {
  _id: Id<"validationBatches">;
  fileName: string;
  uploadedAt: number;
  rowsApplied: number;
  rowsRejected: number;
};

function ValidatorBatchesPanel({
  batches, deletingBatchId, onOpenLog, onDelete,
}: {
  batches: ValidatorBatch[] | undefined;
  deletingBatchId: Id<"validationBatches"> | null;
  onOpenLog: (id: Id<"validationBatches">) => void;
  onDelete: (b: ValidatorBatch) => void;
}) {
  const [appliedFilter, setAppliedFilter] = useState<"all" | "applied" | "empty">("all");
  const filtered = useMemo(() => {
    const list = batches ?? [];
    if (appliedFilter === "applied") return list.filter((b) => b.rowsApplied > 0);
    if (appliedFilter === "empty") return list.filter((b) => b.rowsApplied === 0);
    return list;
  }, [batches, appliedFilter]);
  const { search, setSearch, sortedItems } = useTableState(
    filtered,
    ["fileName"],
  );

  return (
    <div className="lg:col-span-1 rounded-xl border border-border bg-card shadow-sm flex flex-col overflow-hidden sticky top-6 max-h-[calc(100vh-3rem)]">
      <div className="p-4 border-b border-border/50 bg-muted/20 shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Riwayat Validasi
          </h2>
          <span className="text-[10px] text-muted-foreground font-mono">{sortedItems.length} / {batches?.length ?? 0}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama file..."
            className="w-full pl-6 pr-2 py-1 text-[11px] rounded border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(["all", "applied", "empty"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setAppliedFilter(k)}
              className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${appliedFilter === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
            >
              {k === "all" ? "Semua" : k === "applied" ? "Applied >0" : "Kosong"}
            </button>
          ))}
        </div>
      </div>
      <div className="p-2 flex-1 overflow-y-auto">
        {!batches ? (
          <p className="p-6 text-xs text-center text-muted-foreground">Memuat...</p>
        ) : sortedItems.length === 0 ? (
          <p className="p-6 text-xs text-center text-muted-foreground">{batches.length === 0 ? "Belum ada batch validasi" : "Tidak ada batch sesuai filter"}</p>
        ) : (
          <div className="space-y-1">
            {sortedItems.map((b) => (
              <div
                key={b._id}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30 group cursor-pointer"
                onClick={() => onOpenLog(b._id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate group-hover:text-primary transition-colors" title={b.fileName}>{b.fileName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(b.uploadedAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-green-100 text-green-700">
                      {b.rowsApplied} applied
                    </span>
                    {b.rowsRejected > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-yellow-100 text-yellow-700">
                        {b.rowsRejected} rejected
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(b); }}
                  disabled={deletingBatchId === b._id}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 disabled:opacity-100 disabled:cursor-wait shrink-0"
                  title="Hapus batch & undo semua perubahan"
                >
                  {deletingBatchId === b._id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "" }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}

function ValidationLogSheet({
  batchId, fileName, rowsApplied, isDeleting, onDelete, onClose,
}: {
  batchId: Id<"validationBatches">;
  fileName?: string;
  rowsApplied?: number;
  isDeleting?: boolean;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const logs = useQuery(api.features.closing.queries.listValidationLogs, { batchId });
  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-primary" />
                Log Perubahan Validasi
              </SheetTitle>
              {fileName && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate" title={fileName}>{fileName}</p>
              )}
              {logs && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {logs.length} perubahan ke {new Set(logs.map(l => l.entryId)).size} row
                  {rowsApplied !== undefined ? ` · ${rowsApplied} entry applied` : ""}
                </p>
              )}
            </div>
            {onDelete && (
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 text-xs font-semibold disabled:opacity-60 disabled:cursor-wait shrink-0"
                title="Hapus batch & undo semua perubahan dari file ini"
              >
                {isDeleting
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Trash2 className="h-3.5 w-3.5" />}
                {isDeleting ? "Membatalkan..." : "Hapus & Undo"}
              </button>
            )}
          </div>
        </SheetHeader>
        {!logs ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Memuat...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Tidak ada log
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-muted/40 sticky top-0 z-10">
                <tr className="text-left">
                  <th className="px-3 py-1.5 font-semibold">Type</th>
                  <th className="px-3 py-1.5 font-semibold">Entry ID</th>
                  <th className="px-3 py-1.5 font-semibold">Field</th>
                  <th className="px-3 py-1.5 font-semibold">Sebelum</th>
                  <th className="px-3 py-1.5 font-semibold">Sesudah</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l._id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-3 py-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                        l.entryType === "bank_entry" ? "bg-blue-100 text-blue-700" :
                        l.entryType === "payable" ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>{l.entryType}</span>
                    </td>
                    <td className="px-3 py-1 font-mono text-[10px] truncate max-w-[100px]" title={l.entryId}>{l.entryId.slice(-8)}</td>
                    <td className="px-3 py-1 font-semibold">{l.field}</td>
                    <td className="px-3 py-1 text-muted-foreground font-mono">{l.beforeValue ?? "—"}</td>
                    <td className="px-3 py-1 text-primary font-mono">{l.afterValue ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Preview components ────────────────────────────────────

type AutoMatchPreviewData = {
  suggestions: Array<{
    payableId: string;
    bankEntryIds: string[];
    vendor: string;
    payableAmount: number;
    payableRemaining: number;
    bankSum: number;
    diff: number;
    confidence: "exact" | "split2" | "split3";
    bankRows: { id: string; txDate: string; debit: number; counterparty: string; description: string }[];
    payableRow: { id: string; invoiceDate: string; amount: number; paidAmount: number; description: string };
  }>;
  orphans: { id: string; txDate: string; debit: number; counterparty: string; description: string }[];
  stats: { payableTotal: number; bankTotal: number; suggestedPayables: number; suggestedBankRows: number; orphanBanks: number };
};

function AutoMatchPreview({
  preview, approved, onToggle, onToggleAll, onCancel, onCommit, committing,
}: {
  preview: AutoMatchPreviewData | undefined;
  approved: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], on: boolean) => void;
  onCancel: () => void;
  onCommit: () => void;
  committing: boolean;
}) {
  if (!preview) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Menghitung kandidat match...
      </div>
    );
  }
  const allIds = preview.suggestions.map((s) => s.payableId);
  const allOn = allIds.every((i) => approved.has(i));
  const approvedCount = preview.suggestions.filter((s) => approved.has(s.payableId)).length;
  const confLabel: Record<string, string> = { exact: "1:1 exact", split2: "split 2-row", split3: "split 3-row" };
  const confColor: Record<string, string> = {
    exact: "bg-green-100 text-green-700",
    split2: "bg-blue-100 text-blue-700",
    split3: "bg-purple-100 text-purple-700",
  };
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 flex-wrap bg-muted/20">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm font-semibold">Preview Auto-match</span>
          <span className="text-xs text-muted-foreground">
            {preview.stats.suggestedPayables} payable ke-match · {preview.stats.suggestedBankRows} bank rows · {preview.stats.orphanBanks} orphan
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleAll(allIds, !allOn)}
            className="text-xs px-2 py-1 rounded border border-border hover:bg-muted font-semibold"
          >
            {allOn ? "Deny Semua" : "Accept Semua"}
          </button>
          <span className="text-xs font-mono text-muted-foreground">{approvedCount}/{preview.suggestions.length}</span>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-auto">
        {preview.suggestions.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Tidak ada match yang ke-detect. Coba kirim ke AI atau upload manual.
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="bg-muted/40 sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-3 py-1.5 w-8"></th>
                <th className="px-3 py-1.5 font-semibold">Vendor</th>
                <th className="px-3 py-1.5 font-semibold">Payable (Invoice)</th>
                <th className="px-3 py-1.5 font-semibold text-right">Sisa Bayar</th>
                <th className="px-3 py-1.5 font-semibold text-right">Sum Bank</th>
                <th className="px-3 py-1.5 font-semibold text-right">Diff</th>
                <th className="px-3 py-1.5 font-semibold">Bank Rows</th>
                <th className="px-3 py-1.5 font-semibold">Kategori</th>
              </tr>
            </thead>
            <tbody>
              {preview.suggestions.map((s) => {
                const isApproved = approved.has(s.payableId);
                return (
                  <tr key={s.payableId} className={`border-t border-border/40 ${isApproved ? "" : "opacity-50"}`}>
                    <td className="px-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={isApproved}
                        onChange={() => onToggle(s.payableId)}
                        className="h-3.5 w-3.5 accent-primary"
                      />
                    </td>
                    <td className="px-3 py-1.5 font-medium truncate max-w-[140px]" title={s.vendor}>{s.vendor}</td>
                    <td className="px-3 py-1.5 font-mono text-muted-foreground">{s.payableRow.invoiceDate}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{formatRpFull(s.payableRemaining)}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{formatRpFull(s.bankSum)}</td>
                    <td className={`px-3 py-1.5 text-right font-mono ${Math.abs(s.diff) > 100 ? "text-yellow-600" : "text-green-600"}`}>
                      {s.diff === 0 ? "0" : (s.diff > 0 ? `+${formatRpFull(s.diff)}` : `-${formatRpFull(-s.diff)}`)}
                    </td>
                    <td className="px-3 py-1.5">
                      {s.bankRows.map((b) => (
                        <div key={b.id} className="text-[10px] text-muted-foreground">
                          <span className="font-mono">{b.txDate.slice(5)}</span> · {formatRpFull(b.debit)} · {b.counterparty}
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${confColor[s.confidence]}`}>
                        {confLabel[s.confidence]}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {preview.orphans.length > 0 && (
                <>
                  <tr><td colSpan={8} className="px-3 py-2 bg-amber-50 dark:bg-amber-950/20 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                    {preview.orphans.length} bank rows TIDAK ke-detect vendor — kirim ke AI atau cek manual
                  </td></tr>
                  {preview.orphans.slice(0, 20).map((o) => (
                    <tr key={o.id} className="border-t border-border/40 opacity-60">
                      <td className="px-3 py-1.5">—</td>
                      <td className="px-3 py-1.5 text-muted-foreground italic" colSpan={2}>(orphan)</td>
                      <td className="px-3 py-1.5 text-right font-mono">—</td>
                      <td className="px-3 py-1.5 text-right font-mono">{formatRpFull(o.debit)}</td>
                      <td className="px-3 py-1.5">—</td>
                      <td className="px-3 py-1.5">
                        <div className="text-[10px]"><span className="font-mono">{o.txDate.slice(5)}</span> · {o.counterparty}</div>
                      </td>
                      <td className="px-3 py-1.5"><span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-700">orphan</span></td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border flex items-center gap-2 bg-muted/10">
        <button
          onClick={onCancel}
          disabled={committing}
          className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold disabled:opacity-50"
        >
          Batal
        </button>
        <button
          onClick={onCommit}
          disabled={committing || approvedCount === 0}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold disabled:opacity-50"
        >
          {committing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
          {committing ? "Memproses..." : `Apply ${approvedCount} Match`}
        </button>
      </div>
    </div>
  );
}

function CsvPreview({
  pending, approved, onToggle, onToggleAll, onCancel, onCommit, committing,
}: {
  pending: { updates: CsvUpdate[]; fileName: string };
  approved: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], on: boolean) => void;
  onCancel: () => void;
  onCommit: () => void;
  committing: boolean;
}) {
  const allIds = pending.updates.map((u) => `${u.entryType}:${u.entryId}`);
  const allOn = allIds.every((i) => approved.has(i));
  const approvedCount = pending.updates.filter((u) => approved.has(`${u.entryType}:${u.entryId}`)).length;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 flex-wrap bg-muted/20">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Preview CSV Tervalidasi</span>
          <span className="text-xs text-muted-foreground truncate max-w-xs" title={pending.fileName}>{pending.fileName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleAll(allIds, !allOn)}
            className="text-xs px-2 py-1 rounded border border-border hover:bg-muted font-semibold"
          >
            {allOn ? "Deny Semua" : "Accept Semua"}
          </button>
          <span className="text-xs font-mono text-muted-foreground">{approvedCount}/{pending.updates.length}</span>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/40 sticky top-0 z-10">
            <tr className="text-left">
              <th className="px-3 py-1.5 w-8"></th>
              <th className="px-3 py-1.5 font-semibold">Type</th>
              <th className="px-3 py-1.5 font-semibold">Entry</th>
              <th className="px-3 py-1.5 font-semibold">Payment Ref</th>
              <th className="px-3 py-1.5 font-semibold">Matched Payable</th>
              <th className="px-3 py-1.5 font-semibold">Validated</th>
            </tr>
          </thead>
          <tbody>
            {pending.updates.map((u) => {
              const key = `${u.entryType}:${u.entryId}`;
              const isApproved = approved.has(key);
              return (
                <tr key={key} className={`border-t border-border/40 ${isApproved ? "" : "opacity-50"}`}>
                  <td className="px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={isApproved}
                      onChange={() => onToggle(key)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${u.entryType === "bank_entry" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                      {u.entryType}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-muted-foreground" title={u.entryId}>{u.entryId.slice(-8)}</td>
                  <td className="px-3 py-1.5 font-mono">{u.paymentReference ?? "—"}</td>
                  <td className="px-3 py-1.5 font-mono text-muted-foreground" title={u.matchedPayableId ?? ""}>{u.matchedPayableId ? u.matchedPayableId.slice(-8) : "—"}</td>
                  <td className="px-3 py-1.5">{u.isValidated === true ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-border flex items-center gap-2 bg-muted/10">
        <button
          onClick={onCancel}
          disabled={committing}
          className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold disabled:opacity-50"
        >
          Batal
        </button>
        <button
          onClick={onCommit}
          disabled={committing || approvedCount === 0}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold disabled:opacity-50"
        >
          {committing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
          {committing ? "Memproses..." : `Apply ${approvedCount} Perubahan`}
        </button>
      </div>
    </div>
  );
}
