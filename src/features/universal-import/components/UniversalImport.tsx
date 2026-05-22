"use client";

// Single drop zone — accepts xlsx/csv, runs detector, dispatches to
// the right existing import flow. ZIA Group multi-pocket workbooks get
// auto-split into pergantian + tunjangan + payables + vendors (each
// commits to its own mutation independently).
//
// User feedback prior to build: "aku tidak bisa upload yang csv" →
// hence CSV is converted to xlsx-shape in-memory before detector runs.

import { useState, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Upload, Loader2, CheckCircle, AlertCircle, FileText, Sparkles,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useBranchScope } from "@/features/dashboard/context/BranchScopeContext";
import { formatRpFull } from "@/shared/lib";
import { UploadDropzone } from "@/features/report-upload/components/UploadDropzone";
import { parseProductChanges, extractPeriodLabel, type ProductChangeItem } from "@/features/report-upload/parsers/parseProductChanges";
import { parseAllowances, extractAllowanceMetadata, type AllowanceItem } from "@/features/report-upload/parsers/parseAllowances";
import { detectFileKind, bindXlsx, type FileKind, type DetectionResult } from "../lib/detector";
import { splitZiaWorkbook, type ZiaSplit } from "../lib/ziaSplit";

type Step = "idle" | "parsing" | "preview" | "committing" | "done" | "error";

const KIND_LABEL: Record<FileKind, string> = {
  zia_multi: "ZIA Group multi-pocket master",
  weekly_sv: "Laporan Mingguan SV (weekly)",
  pergantian: "Pergantian Produk",
  tunjangan: "Tunjangan Karyawan",
  bank_statement: "Statement Bank",
  payables_table: "Bulk Piutang (tabel)",
  receipts_table: "Bulk Bukti Bayar (tabel)",
  vendors_table: "Master Vendor (tabel)",
  unknown: "Belum dikenali",
};

const KIND_EXTERNAL_ROUTE: Partial<Record<FileKind, { url: string; label: string }>> = {
  weekly_sv: { url: "/laporan/upload", label: "Buka halaman Upload Laporan Mingguan →" },
  bank_statement: { url: "/finance/owner-transfer", label: "Buka halaman Statement Bank →" },
};

// ── CSV → AOA workbook converter ─────────────────────
function csvToWorkbook(text: string, fileName: string): XLSX.WorkBook {
  const lines = text.split(/\r?\n/);
  // Naive CSV parse — quoted-aware
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = ""; let inQ = false;
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
  };
  const aoa = lines.filter((l) => l.length > 0).map(parseLine);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  void fileName;
  return wb;
}

async function fileToWorkbook(file: File): Promise<XLSX.WorkBook> {
  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
  if (isCsv) {
    const text = await file.text();
    return csvToWorkbook(text, file.name);
  }
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: "array" });
}

// ── Tabular row extractor (header-aware) ─────────────
function extractTableRows(wb: XLSX.WorkBook): Array<Record<string, string>> {
  const first = wb.SheetNames[0];
  if (!first) return [];
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[first], { header: 1, defval: "" }) as unknown[][];
  if (aoa.length < 2) return [];
  const header = (aoa[0] ?? []).map((c) => String(c ?? "").trim());
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i];
    const obj: Record<string, string> = {};
    let nonEmpty = false;
    for (let j = 0; j < header.length; j++) {
      const k = header[j];
      if (!k) continue;
      const v = String(row[j] ?? "").trim();
      obj[k] = v;
      if (v) nonEmpty = true;
    }
    if (nonEmpty) rows.push(obj);
  }
  return rows;
}

function num(s: unknown): number {
  if (typeof s === "number") return s;
  const cleaned = String(s ?? "").replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return isFinite(n) ? n : 0;
}

export function UniversalImport() {
  const { branchId, branches } = useBranchScope();
  const effectiveBranchId = branchId ?? branches?.[0]?._id;

  const [step, setStep] = useState<Step>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [wb, setWb] = useState<XLSX.WorkBook | null>(null);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [pergantian, setPergantian] = useState<ProductChangeItem[]>([]);
  const [pergantianPeriod, setPergantianPeriod] = useState("");
  const [tunjangan, setTunjangan] = useState<AllowanceItem[]>([]);
  const [tunjanganPeriod, setTunjanganPeriod] = useState("");
  const [payables, setPayables] = useState<ZiaSplit["payables"]>([]);
  const [vendors, setVendors] = useState<ZiaSplit["vendors"]>([]);
  const [result, setResult] = useState<string>("");

  const importPergantian = useMutation(api.features.reports.mutations.importProductChangesBatch);
  const importTunjangan = useMutation(api.features.reports.mutations.importAllowancesBatch);
  const importPayables = useMutation(api.features.payables.mutations.importPayablesBulk);
  const importVendors = useMutation(api.features.masterData.mutations.importVendorsBulk);

  const totalPergantian = useMemo(() => pergantian.reduce((s, p) => s + p.totalPrice, 0), [pergantian]);
  const totalPayables = useMemo(() => payables.reduce((s, p) => s + p.amount, 0), [payables]);
  const totalTunjangan = useMemo(() => tunjangan.reduce((s, t) => s + t.luarKotaAmount + t.subsidiTransportAmount + t.budgetKosAmount, 0), [tunjangan]);

  const reset = () => {
    setStep("idle");
    setFile(null);
    setWb(null);
    setDetection(null);
    setPergantian([]); setPergantianPeriod("");
    setTunjangan([]); setTunjanganPeriod("");
    setPayables([]); setVendors([]);
    setResult("");
  };

  const handleFile = useCallback(async (selected: File) => {
    setStep("parsing");
    setFile(selected);
    try {
      const parsed = await fileToWorkbook(selected);
      bindXlsx(XLSX);
      const det = detectFileKind(parsed);
      setWb(parsed);
      setDetection(det);

      // Pre-extract per-kind parsed rows so preview shows real data.
      switch (det.kind) {
        case "zia_multi": {
          const split = splitZiaWorkbook(parsed, XLSX, selected.name);
          setPergantian(split.pergantian);
          setPergantianPeriod(split.pergantianPeriod);
          setTunjangan(split.tunjangan);
          setTunjanganPeriod("ZIA " + new Date().toISOString().slice(0, 7));
          setPayables(split.payables);
          setVendors(split.vendors);
          break;
        }
        case "pergantian": {
          setPergantian(parseProductChanges(parsed));
          setPergantianPeriod(extractPeriodLabel(parsed));
          break;
        }
        case "tunjangan": {
          setTunjangan(parseAllowances(parsed));
          const meta = extractAllowanceMetadata(parsed);
          setTunjanganPeriod(`${meta.year} ${meta.submissionDate}`.trim());
          break;
        }
        case "payables_table": {
          const tableRows = extractTableRows(parsed);
          setPayables(tableRows.map((r) => ({
            vendorName: r.vendorName ?? r.vendor_name ?? r.name ?? "",
            invoiceDate: r.invoiceDate ?? r.invoice_date ?? "",
            dueDate: r.dueDate ?? r.due_date ?? r.invoiceDate ?? "",
            amount: num(r.amount ?? r.total),
            paidAmount: num(r.paidAmount ?? r.paid_amount),
            description: r.description ?? r.desc ?? "",
            reference: r.reference,
            fileName: selected.name,
          })).filter((r) => r.vendorName && r.amount > 0));
          break;
        }
        case "vendors_table": {
          const tableRows = extractTableRows(parsed);
          setVendors(tableRows.map((r) => ({
            name: r.name ?? r.vendor_name ?? r.vendorName ?? "",
            type: r.type,
            phone: r.phone ?? r.contact,
            notes: r.notes,
          })).filter((r) => r.name));
          break;
        }
        default:
          break;
      }
      setStep("preview");
      toast.success(`Terdeteksi: ${KIND_LABEL[det.kind]} (${det.confidence})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal baca file");
      setStep("error");
    }
  }, []);

  const commit = async () => {
    if (!detection || !effectiveBranchId || !file) return;
    setStep("committing");
    try {
      const parts: string[] = [];
      const fName = file.name;

      if (pergantian.length > 0) {
        const count = await importPergantian({
          branchId: effectiveBranchId,
          fileName: fName,
          periodLabel: pergantianPeriod || "Tanpa periode",
          items: pergantian,
        });
        parts.push(`${count} pergantian`);
      }
      if (tunjangan.length > 0) {
        const count = await importTunjangan({
          branchId: effectiveBranchId,
          fileName: fName,
          periodLabel: tunjanganPeriod || "Tanpa periode",
          items: tunjangan,
        });
        parts.push(`${count} tunjangan`);
      }
      if (vendors.length > 0) {
        const res = await importVendors({ rows: vendors });
        parts.push(`${res.inserted} vendor (${res.skipped} skip)`);
      }
      if (payables.length > 0) {
        const res = await importPayables({ branchId: effectiveBranchId, rows: payables });
        const tail = res.unresolvedVendors.length > 0 ? `, ${res.unresolvedVendors.length} vendor unresolved` : "";
        parts.push(`${res.inserted} piutang${tail}`);
      }

      setResult(parts.join(" · ") || "Tidak ada data untuk di-commit");
      setStep("done");
      toast.success(`Import selesai — ${parts.join(", ")}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Commit gagal");
      setStep("error");
    }
  };

  const detectedAnyData = pergantian.length + tunjangan.length + payables.length + vendors.length > 0;

  return (
    <div className="space-y-6">
      {/* ── Idle / parsing ── */}
      {(step === "idle" || step === "parsing") && (
        <div className="rounded-xl border border-border bg-card p-1 shadow-sm">
          <UploadDropzone onFileSelect={handleFile} isLoading={step === "parsing"} />
        </div>
      )}

      {/* ── Preview ── */}
      {step === "preview" && detection && (
        <div className="space-y-5">
          <DetectionCard det={detection} fileName={file?.name ?? ""} />

          {KIND_EXTERNAL_ROUTE[detection.kind] && (
            <a
              href={KIND_EXTERNAL_ROUTE[detection.kind]!.url}
              className="block rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm hover:bg-amber-100/70"
            >
              {KIND_EXTERNAL_ROUTE[detection.kind]!.label}
              <p className="text-xs text-muted-foreground mt-1">
                File ini punya flow khusus (multi-step preview) — buka halaman dedicated supaya parser jalan lengkap.
              </p>
            </a>
          )}

          {/* Per-target preview cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pergantian.length > 0 && (
              <PreviewCard
                title="Pergantian Produk"
                badge={`${pergantian.length} item`}
                meta={pergantianPeriod || "—"}
                total={totalPergantian}
                sample={pergantian.slice(0, 3).map((p) => `${p.itemName} · Rp${p.totalPrice.toLocaleString("id-ID")}`)}
              />
            )}
            {tunjangan.length > 0 && (
              <PreviewCard
                title="Tunjangan Karyawan"
                badge={`${tunjangan.length} karyawan`}
                meta={tunjanganPeriod || "—"}
                total={totalTunjangan}
                sample={tunjangan.slice(0, 3).map((t) => `${t.employeeName} (${t.position ?? "-"})`)}
              />
            )}
            {vendors.length > 0 && (
              <PreviewCard
                title="Master Vendor"
                badge={`${vendors.length} vendor`}
                meta="Dedupe by name"
                total={null}
                sample={vendors.slice(0, 3).map((v) => v.name)}
              />
            )}
            {payables.length > 0 && (
              <PreviewCard
                title="Bulk Piutang"
                badge={`${payables.length} invoice`}
                meta="Vendor harus ada di master"
                total={totalPayables}
                sample={payables.slice(0, 3).map((p) => `${p.vendorName} · ${p.invoiceDate}`)}
              />
            )}
          </div>

          {!detectedAnyData && detection.kind !== "weekly_sv" && detection.kind !== "bank_statement" && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
              File terdeteksi tapi tidak ada baris data yang ke-ekstrak. Periksa header/format file.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={reset}
              className="px-5 py-2.5 rounded-xl border border-border hover:bg-muted/50 text-sm font-medium"
            >
              Batal / Pilih File Lain
            </button>
            {detectedAnyData && (
              <button
                onClick={commit}
                disabled={!effectiveBranchId}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                Commit Import
              </button>
            )}
          </div>
        </div>
      )}

      {step === "committing" && (
        <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center gap-4 shadow-sm">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm font-medium">Menyimpan ke semua tabel terkait…</p>
        </div>
      )}

      {step === "done" && (
        <div className="rounded-xl border border-green-300 bg-green-50 dark:bg-green-950/20 p-8 flex flex-col items-center gap-4 text-center">
          <CheckCircle className="h-12 w-12 text-green-600" />
          <div>
            <h3 className="text-lg font-bold text-green-800 dark:text-green-300">Import selesai</h3>
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">{result}</p>
          </div>
          <button onClick={reset} className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700">
            Upload File Lain
          </button>
        </div>
      )}

      {step === "error" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm font-medium text-destructive">Import gagal — coba upload ulang atau cek format file.</p>
          <button onClick={reset} className="px-5 py-2.5 rounded-xl border border-destructive/30 hover:bg-destructive/10 text-sm font-semibold">
            Coba Lagi
          </button>
        </div>
      )}
    </div>
  );
}

function DetectionCard({ det, fileName }: { det: DetectionResult; fileName: string }) {
  const tone = det.confidence === "high" ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20"
    : det.confidence === "medium" ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
    : "border-rose-300 bg-rose-50 dark:bg-rose-950/20";
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 mt-0.5 text-foreground/70 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detected</p>
          <h2 className="text-lg font-bold mt-0.5">{KIND_LABEL[det.kind]}</h2>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <FileText className="h-3 w-3" /> {fileName} · <span className="opacity-70">{det.reason}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewCard({
  title, badge, meta, total, sample,
}: {
  title: string; badge: string; meta: string; total: number | null; sample: string[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">{badge}</span>
      </div>
      <p className="text-xs text-muted-foreground">{meta}</p>
      {total !== null && (
        <p className="text-lg font-bold mt-2">{formatRpFull(total)}</p>
      )}
      <ul className="mt-3 text-xs space-y-0.5">
        {sample.map((s, i) => (
          <li key={i} className="truncate text-muted-foreground">• {s}</li>
        ))}
        {sample.length === 0 && <li className="text-muted-foreground/50">—</li>}
      </ul>
    </div>
  );
}
