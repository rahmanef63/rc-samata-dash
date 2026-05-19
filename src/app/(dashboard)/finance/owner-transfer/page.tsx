"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";
import {
  Landmark, Upload, Receipt as ReceiptIcon, FileSpreadsheet,
  Trash2, ExternalLink, Loader2, CheckCircle, Info, FileText,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatRpFull } from "@/shared/lib";
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [periodStart, setPeriodStart] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const uploadUrl = await generateUrl();
      const r = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!r.ok) throw new Error("Upload gagal");
      const { storageId } = await r.json() as { storageId: Id<"_storage"> };
      await createBatch({
        accountKind, periodStart, periodEnd,
        fileName: file.name, fileStorageId: storageId, branchId,
      });
      toast.success(`Statement ${accountKind.toUpperCase()} tersimpan — parser belum aktif, file di-arsipkan`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal upload");
    } finally {
      setUploading(false);
    }
  };

  const label = accountKind === "owner" ? "Owner" : "PIC";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <p className="font-semibold">Parser belum aktif untuk Statement {label}.</p>
            <p className="mt-1">File akan di-upload + di-arsipkan dulu. Setelah kamu kirim contoh file estatemen ke developer, parser akan dibuat sesuai struktur asli rekening + Panduan AI akan auto-generate di tombol di bawah.</p>
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

          <Field label="File statement (.xlsx / .csv / .pdf)">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
              }}
              className="text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:font-semibold hover:file:bg-primary/90 disabled:opacity-50"
            />
          </Field>
          {uploading && (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Mengunggah...
            </p>
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

      <StatementGuidePlaceholderDialog open={showGuide} onOpenChange={setShowGuide} accountKind={accountKind} />
    </div>
  );
}

function StatementGuidePlaceholderDialog({ open, onOpenChange, accountKind }: { open: boolean; onOpenChange: (o: boolean) => void; accountKind: AccountKind }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Panduan AI — Statement {accountKind === "owner" ? "Owner" : "PIC"}
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-3 text-sm">
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Panduan otomatis belum tersedia. Kirim contoh file estatemen kamu ke developer dulu — sistem akan generate panduan CSV / JSON / Markdown sesuai struktur asli rekeningmu.
            </p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Untuk sementara, pastikan file punya kolom: <code className="bg-muted px-1 rounded">tanggal · keterangan · debit · kredit · saldo</code>. Tanggal format <code className="bg-muted px-1 rounded">YYYY-MM-DD</code>, angka tanpa simbol Rp / titik / koma.
          </p>
        </div>
      </DialogContent>
    </Dialog>
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
