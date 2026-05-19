"use client";

import { useState, useRef, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";
import {
  Landmark, Upload, Receipt as ReceiptIcon, FileSpreadsheet,
  Trash2, ExternalLink, Loader2, Info, FileText, CheckCircle, AlertTriangle,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatRpFull } from "@/shared/lib";
import { parseExcelFile } from "@/features/report-upload/lib/xlsxHelpers";
import { parseBankStatement, type BankStatementRow } from "@/features/report-upload/parsers/parseBankStatement";
import { PanduanAiDialog } from "@/features/report-upload/components/PanduanAiDialog";
import type { Id } from "../../../../../convex/_generated/dataModel";

type AccountKind = "owner" | "pic";
type PaidBy = "owner" | "pic";

export default function OwnerTransferPage() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;

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

      <Tabs defaultValue="receipts" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-2xl">
          <TabsTrigger value="receipts" className="gap-1.5">
            <ReceiptIcon className="h-3.5 w-3.5" /> Bukti Bayar Piutang
          </TabsTrigger>
          <TabsTrigger value="owner" className="gap-1.5">
            <Landmark className="h-3.5 w-3.5" /> Statement Owner
          </TabsTrigger>
          <TabsTrigger value="pic" className="gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Statement PIC
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receipts">
          {branchId ? <ReceiptsSection branchId={branchId} /> : <SkeletonText />}
        </TabsContent>
        <TabsContent value="owner">
          {branchId ? <StatementSection branchId={branchId} accountKind="owner" /> : <SkeletonText />}
        </TabsContent>
        <TabsContent value="pic">
          {branchId ? <StatementSection branchId={branchId} accountKind="pic" /> : <SkeletonText />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SkeletonText() {
  return <p className="text-sm text-muted-foreground">Memuat cabang...</p>;
}

// ─── Bukti Bayar Piutang section ───────────────────────────

function ReceiptsSection({ branchId }: { branchId: Id<"branches"> }) {
  const receipts = useQuery(api.features.closing.queries.listPaymentReceipts, { branchId, limit: 50 });
  const openPayables = useQuery(api.features.closing.queries.listOpenPayables, { branchId });
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
        branchId,
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
      <div className="lg:col-span-1 rounded-xl border border-border bg-card shadow-sm flex flex-col overflow-hidden sticky top-6 max-h-[calc(100vh-3rem)]">
        <div className="p-4 border-b border-border/50 bg-muted/20 shrink-0">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ReceiptIcon className="h-4 w-4 text-primary" />
            Riwayat Bukti
          </h2>
          {receipts && (
            <p className="text-xs text-muted-foreground mt-0.5">{receipts.length} bukti tersimpan</p>
          )}
        </div>
        <div className="p-2 flex-1 overflow-y-auto">
          {!receipts || receipts.length === 0 ? (
            <p className="p-6 text-xs text-center text-muted-foreground">Belum ada bukti bayar</p>
          ) : (
            <div className="space-y-1">
              {receipts.map((r) => (
                <ReceiptRow key={r._id} receipt={r} onDelete={() => removeReceipt({ id: r._id }).then(() => toast.success("Bukti dihapus"))} />
              ))}
            </div>
          )}
        </div>
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

function StatementSection({ branchId, accountKind }: { branchId: Id<"branches">; accountKind: AccountKind }) {
  const batches = useQuery(api.features.closing.queries.listBankStatementBatches, { branchId, accountKind });
  const generateUrl = useMutation(api.features.closing.mutations.generateProofUploadUrl);
  const createBatch = useMutation(api.features.closing.mutations.createBankStatementBatch);
  const removeBatch = useMutation(api.features.closing.mutations.removeBankStatementBatch);
  const importEntries = useMutation(api.features.closing.mutations.importBankStatementEntries);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [periodStart, setPeriodStart] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState<{ rows: BankStatementRow[]; file: File } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

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
        fileName: parsed.file.name, fileStorageId: storageId, branchId,
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
        })),
      });
      toast.success(`${res.inserted} transaksi tersimpan · saldo akhir Rp ${res.closingBalance.toLocaleString("id-ID")}`);
      setParsed(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal import");
    } finally {
      setUploading(false);
    }
  };

  const label = accountKind === "owner" ? "Owner" : "PIC";
  const summary = useStatementSummary(parsed?.rows);

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

          {parsed && summary && (
            <StatementPreview
              rows={parsed.rows}
              summary={summary}
              fileName={parsed.file.name}
              uploading={uploading}
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
      <div className="lg:col-span-1 rounded-xl border border-border bg-card shadow-sm flex flex-col overflow-hidden sticky top-6 max-h-[calc(100vh-3rem)]">
        <div className="p-4 border-b border-border/50 bg-muted/20 shrink-0">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />
            Riwayat Statement {label}
          </h2>
          {batches && (
            <p className="text-xs text-muted-foreground mt-0.5">{batches.length} file diarsipkan</p>
          )}
        </div>
        <div className="p-2 flex-1 overflow-y-auto">
          {!batches || batches.length === 0 ? (
            <p className="p-6 text-xs text-center text-muted-foreground">Belum ada statement</p>
          ) : (
            <div className="space-y-1">
              {batches.map((b) => (
                <div key={b._id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" title={b.fileName}>{b.fileName}</p>
                    <p className="text-[10px] text-muted-foreground">{b.periodStart} → {b.periodEnd}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        b.status === "parsed" || b.status === "reconciled"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {b.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{b.rowCount} rows</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!confirm(`Hapus statement "${b.fileName}"?`)) return;
                      removeBatch({ id: b._id }).then(() => toast.success("Statement dihapus"));
                    }}
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

      <PanduanAiDialog open={showGuide} onOpenChange={setShowGuide} kind="bankStatement" />
    </div>
  );
}

// ─── Statement preview + summary ───────────────────────────

function useStatementSummary(rows?: BankStatementRow[]) {
  return useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const by: Record<string, { count: number; debit: number; credit: number }> = {};
    let totalDebit = 0;
    let totalCredit = 0;
    let openingSeen = false;
    let openingBalance = 0;
    let closingBalance = 0;
    for (const r of rows) {
      const k = r.category;
      by[k] = by[k] ?? { count: 0, debit: 0, credit: 0 };
      by[k].count++;
      by[k].debit += r.debit;
      by[k].credit += r.kredit;
      totalDebit += r.debit;
      totalCredit += r.kredit;
      if (r.balance > 0) {
        if (!openingSeen) { openingBalance = r.balance + r.debit - r.kredit; openingSeen = true; }
        closingBalance = r.balance;
      }
    }
    return { by, totalDebit, totalCredit, openingBalance, closingBalance, net: totalCredit - totalDebit };
  }, [rows]);
}

function StatementPreview({
  rows, summary, fileName, uploading, onConfirm, onCancel,
}: {
  rows: BankStatementRow[];
  summary: NonNullable<ReturnType<typeof useStatementSummary>>;
  fileName: string;
  uploading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle className="h-4 w-4 text-green-600" />
          {rows.length} transaksi siap import
        </div>
        <span className="text-[10px] text-muted-foreground truncate max-w-xs" title={fileName}>{fileName}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <SummaryCard label="Saldo Awal"  value={summary.openingBalance} />
        <SummaryCard label="Total Kredit (Masuk)"  value={summary.totalCredit} positive />
        <SummaryCard label="Total Debit (Keluar)"  value={summary.totalDebit} negative />
        <SummaryCard label="Saldo Akhir" value={summary.closingBalance} />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
          Breakdown per Kategori
        </div>
        <div className="max-h-48 overflow-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/30 sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-3 py-1 font-semibold">Kategori</th>
                <th className="px-3 py-1 text-right font-semibold">Jml</th>
                <th className="px-3 py-1 text-right font-semibold text-green-600">Kredit</th>
                <th className="px-3 py-1 text-right font-semibold text-destructive">Debit</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary.by).map(([cat, v]) => (
                <tr key={cat} className="border-t border-border/50">
                  <td className="px-3 py-1 font-medium">{CATEGORY_LABELS[cat] ?? cat}</td>
                  <td className="px-3 py-1 text-right">{v.count}</td>
                  <td className="px-3 py-1 text-right font-mono text-green-600">{v.credit > 0 ? formatRpFull(v.credit) : "—"}</td>
                  <td className="px-3 py-1 text-right font-mono text-destructive">{v.debit > 0 ? formatRpFull(v.debit) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30 flex items-center justify-between">
          <span>Preview Transaksi (15 pertama)</span>
          <span className="text-muted-foreground/70">{rows.length} total</span>
        </div>
        <div className="overflow-auto max-h-64">
          <table className="w-full text-[10px]">
            <thead className="bg-muted/30 sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-2 py-1">Tgl</th>
                <th className="px-2 py-1">Kategori</th>
                <th className="px-2 py-1">Pihak</th>
                <th className="px-2 py-1 text-right">Debit</th>
                <th className="px-2 py-1 text-right">Kredit</th>
                <th className="px-2 py-1 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 15).map((r, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="px-2 py-1 font-mono">{r.txDate.slice(5)}</td>
                  <td className="px-2 py-1"><span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-semibold">{CATEGORY_LABELS[r.category] ?? r.category}</span></td>
                  <td className="px-2 py-1 truncate max-w-[140px]" title={r.pihak}>{r.pihak}</td>
                  <td className="px-2 py-1 text-right font-mono text-destructive">{r.debit > 0 ? formatRpFull(r.debit) : "—"}</td>
                  <td className="px-2 py-1 text-right font-mono text-green-600">{r.kredit > 0 ? formatRpFull(r.kredit) : "—"}</td>
                  <td className="px-2 py-1 text-right font-mono text-muted-foreground">{r.balance > 0 ? formatRpFull(r.balance) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} disabled={uploading} className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted/50 text-xs font-semibold disabled:opacity-50">
          Batal
        </button>
        <button
          onClick={onConfirm}
          disabled={uploading}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Mengimport..." : `Import ${rows.length} Transaksi`}
        </button>
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  sales_inflow: "Penjualan",
  expense_outflow: "Pengeluaran",
  payable_payment: "Bayar Vendor",
  topup_pic: "Topup PIC",
  owner_capital: "Modal Owner",
  transfer_internal: "Transfer",
  other: "Lainnya",
};

function SummaryCard({ label, value, positive, negative }: { label: string; value: number; positive?: boolean; negative?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xs font-bold mt-0.5 ${positive ? "text-green-600" : negative ? "text-destructive" : "text-foreground"}`}>
        {formatRpFull(value)}
      </p>
    </div>
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
