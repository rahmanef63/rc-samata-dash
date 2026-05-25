"use client";

// Unified multi-file uploader. Drop banyak file sekaligus — tiap file
// di-detect dengan scored matcher, ranking + alternatif, manual override.
// Untuk weekly_sv: parse inline + validator panel + commit penuh (15
// mutations + bridges + AI index) via useWeeklyImport hook. Kind lain
// pakai existing parsers + commit mutations.

import { useState, useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Upload, Loader2, CheckCircle, AlertCircle, FileSpreadsheet, X,
  ChevronDown, ChevronUp, ExternalLink, Sparkles, Layers, ShieldAlert, ShieldCheck,
  Eye,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "../../../../convex/_generated/api";
import { formatRpFull } from "@/shared/lib";
import {
  parseProductChanges, extractPeriodLabel,
  type ProductChangeItem,
} from "@/features/report-upload/parsers/parseProductChanges";
import {
  parseAllowances, extractAllowanceMetadata,
  type AllowanceItem,
} from "@/features/report-upload/parsers/parseAllowances";
import { useWeeklyImport, type WeeklyParsedData, type WeeklyImportProgress } from "@/features/report-upload/hooks/useWeeklyImport";
import type { ValidationWarning } from "@/features/report-upload/lib/validateParsedData";
import { WarningPanel } from "@/features/report-upload/components/WarningPanel";
import {
  bindXlsx, type FileKind,
} from "../lib/detector";
import {
  scoreAllKinds, topMatchOrUnknown, type ScoredDetection,
} from "../lib/scoredDetector";
import { splitZiaWorkbook, type ZiaSplit } from "../lib/ziaSplit";

// ─── Types ─────────────────────────────────────────────────

type FileStatus = "parsing" | "ready" | "importing" | "done" | "error";

type ParsedPayload = {
  pergantian?: ProductChangeItem[];
  pergantianPeriod?: string;
  tunjangan?: AllowanceItem[];
  tunjanganPeriod?: string;
  payables?: ZiaSplit["payables"];
  vendors?: ZiaSplit["vendors"];
  tableRowsCount?: number;
  // Weekly-specific
  weekly?: WeeklyParsedData;
  weeklyWarnings?: ValidationWarning[];
};

type FileEntry = {
  id: string;
  file: File;
  wb: XLSX.WorkBook | null;
  ranked: ScoredDetection[];
  topKind: FileKind;
  topScore: number;
  topReasons: string[];
  parsed: ParsedPayload;
  status: FileStatus;
  importResult?: string;
  error?: string;
  showAlternatives?: boolean;
  progress?: WeeklyImportProgress;
};

const KIND_LABEL: Record<FileKind, string> = {
  zia_multi: "ZIA Group Multi-Pocket",
  weekly_sv: "Laporan Mingguan SV",
  pergantian: "Pergantian Produk",
  tunjangan: "Tunjangan Karyawan",
  bank_statement: "Statement Bank",
  payables_table: "Bulk Piutang",
  receipts_table: "Bulk Bukti Bayar",
  vendors_table: "Master Vendor",
  unknown: "Belum dikenali",
};

const KIND_EXTERNAL_ROUTE: Partial<Record<FileKind, { url: string; label: string; reason: string }>> = {
  bank_statement: {
    url: "/finance/owner-transfer",
    label: "Buka Owner Transfer",
    reason: "Statement bank di-match terhadap owner transfer + reconciliation.",
  },
};

const ALL_KINDS: FileKind[] = [
  "zia_multi", "weekly_sv", "pergantian", "tunjangan",
  "bank_statement", "payables_table", "receipts_table", "vendors_table", "unknown",
];

// ─── CSV/XLSX loader ───────────────────────────────────────

function csvToWorkbook(text: string): XLSX.WorkBook {
  const lines = text.split(/\r?\n/);
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
  return wb;
}

async function fileToWorkbook(file: File): Promise<XLSX.WorkBook> {
  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
  if (isCsv) return csvToWorkbook(await file.text());
  return XLSX.read(await file.arrayBuffer(), { type: "array" });
}

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

// ─── Main component ───────────────────────────────────────

export function MultiFileUploader() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [validatorOpenFor, setValidatorOpenFor] = useState<string | null>(null);

  const weekly = useWeeklyImport();
  const importPergantian = useMutation(api.features.reports.mutations.importProductChangesBatch);
  const importTunjangan = useMutation(api.features.reports.mutations.importAllowancesBatch);
  const importPayables = useMutation(api.features.payables.mutations.importPayablesBulk);
  const importVendors = useMutation(api.features.masterData.mutations.importVendorsBulk);
  const recordUpload = useMutation(api.features.universalUploads.mutations.recordUniversalUpload);

  const updateEntry = useCallback((id: string, patch: Partial<FileEntry>) => {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, ...patch } : e));
  }, []);

  const extractPayloadForKind = useCallback(async (
    wb: XLSX.WorkBook, kind: FileKind, file: File,
  ): Promise<ParsedPayload> => {
    switch (kind) {
      case "weekly_sv": {
        const { parsed, warnings } = await weekly.parse(file);
        return { weekly: parsed, weeklyWarnings: warnings };
      }
      case "zia_multi": {
        const split = splitZiaWorkbook(wb, XLSX, file.name);
        return {
          pergantian: split.pergantian,
          pergantianPeriod: split.pergantianPeriod,
          tunjangan: split.tunjangan,
          tunjanganPeriod: "ZIA " + new Date().toISOString().slice(0, 7),
          payables: split.payables,
          vendors: split.vendors,
        };
      }
      case "pergantian": {
        return {
          pergantian: parseProductChanges(wb),
          pergantianPeriod: extractPeriodLabel(wb),
        };
      }
      case "tunjangan": {
        const items = parseAllowances(wb);
        const meta = extractAllowanceMetadata(wb);
        return {
          tunjangan: items,
          tunjanganPeriod: `${meta.year} ${meta.submissionDate}`.trim() || file.name,
        };
      }
      case "payables_table": {
        const rows = extractTableRows(wb);
        return {
          payables: rows.map((r) => ({
            vendorName: r.vendorName ?? r.vendor_name ?? r.name ?? "",
            invoiceDate: r.invoiceDate ?? r.invoice_date ?? "",
            dueDate: r.dueDate ?? r.due_date ?? r.invoiceDate ?? "",
            amount: num(r.amount ?? r.total),
            paidAmount: num(r.paidAmount ?? r.paid_amount),
            description: r.description ?? r.desc ?? "",
            reference: r.reference,
            fileName: file.name,
          })).filter((r) => r.vendorName && r.amount > 0),
          tableRowsCount: rows.length,
        };
      }
      case "vendors_table": {
        const rows = extractTableRows(wb);
        return {
          vendors: rows.map((r) => ({
            name: r.name ?? r.vendor_name ?? r.vendorName ?? "",
            type: r.type,
            phone: r.phone ?? r.contact,
            notes: r.notes,
          })).filter((r) => r.name),
          tableRowsCount: rows.length,
        };
      }
      default:
        return {};
    }
  }, [weekly]);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    bindXlsx(XLSX);
    const newEntries: FileEntry[] = [];
    for (const file of Array.from(files)) {
      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      newEntries.push({
        id, file, wb: null, ranked: [],
        topKind: "unknown", topScore: 0, topReasons: [],
        parsed: {}, status: "parsing",
      });
    }
    setEntries((prev) => [...prev, ...newEntries]);

    for (const entry of newEntries) {
      try {
        const wb = await fileToWorkbook(entry.file);
        const ranked = scoreAllKinds(wb);
        const top = topMatchOrUnknown(ranked);
        const parsed = top.kind === "unknown" ? {} : await extractPayloadForKind(wb, top.kind, entry.file);
        updateEntry(entry.id, {
          wb, ranked,
          topKind: top.kind, topScore: top.score, topReasons: top.reasons,
          parsed, status: "ready",
        });
      } catch (err) {
        updateEntry(entry.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Gagal baca file",
        });
      }
    }
  }, [extractPayloadForKind, updateEntry]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files.length > 0) void processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) void processFiles(e.target.files);
    e.target.value = "";
  }, [processFiles]);

  const overrideKind = useCallback(async (id: string, kind: FileKind) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry || !entry.wb) return;
    updateEntry(id, { status: "parsing" });
    try {
      const matched = entry.ranked.find((r) => r.kind === kind);
      const parsed = kind === "unknown" ? {} : await extractPayloadForKind(entry.wb, kind, entry.file);
      updateEntry(id, {
        topKind: kind,
        topScore: matched?.score ?? 0,
        topReasons: matched?.reasons ?? ["Manual override"],
        parsed, status: "ready",
      });
    } catch (err) {
      updateEntry(id, {
        status: "error",
        error: err instanceof Error ? err.message : "Gagal re-parse",
      });
    }
  }, [entries, extractPayloadForKind, updateEntry]);

  const toggleAlt = useCallback((id: string) => {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, showAlternatives: !e.showAlternatives } : e));
  }, []);

  const removeFile = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const commitOne = useCallback(async (entry: FileEntry) => {
    if (entry.status !== "ready") return;
    updateEntry(entry.id, { status: "importing" });
    try {
      // Weekly_sv: full flow via hook
      if (entry.topKind === "weekly_sv" && entry.parsed.weekly) {
        const dup = weekly.findDuplicate(entry.parsed.weekly);
        const result = await weekly.commit(
          entry.parsed.weekly,
          entry.parsed.weeklyWarnings ?? [],
          {
            replaceExistingId: dup?._id,
            onProgress: (p) => updateEntry(entry.id, { progress: p }),
          },
        );
        const totalRecords = Object.values(result.counts).reduce((s, n) => s + n, 0);
        const msg = `${totalRecords} record imported${dup ? " (menimpa periode lama)" : ""}`;
        updateEntry(entry.id, { status: "done", importResult: msg, progress: undefined });
        toast.success(`${entry.file.name}: ${msg}`);
        await recordUpload({
          kind: "weekly_sv",
          fileName: entry.file.name,
          fileSize: entry.file.size,
          periodStart: entry.parsed.weekly.periodStart || undefined,
          periodEnd: entry.parsed.weekly.periodEnd || undefined,
          recordCount: totalRecords,
          counts: result.counts,
          warningCount: entry.parsed.weeklyWarnings?.length ?? 0,
          detectScore: entry.topScore,
          weeklyReportId: result.reportId,
          status: "success",
        }).catch((e) => console.error("recordUpload weekly", e));
        return;
      }

      // Other kinds: existing batch mutations
      const parts: string[] = [];
      const fName = entry.file.name;
      const { parsed } = entry;
      let counts: Parameters<typeof recordUpload>[0]["counts"] = {};
      let totalRecords = 0;
      if (parsed.pergantian && parsed.pergantian.length > 0) {
        const count = await importPergantian({
          fileName: fName, periodLabel: parsed.pergantianPeriod || "Tanpa periode",
          items: parsed.pergantian,
        });
        parts.push(`${count} pergantian`);
        counts = { ...counts, pergantian: count };
        totalRecords += count;
      }
      if (parsed.tunjangan && parsed.tunjangan.length > 0) {
        const count = await importTunjangan({
          fileName: fName, periodLabel: parsed.tunjanganPeriod || "Tanpa periode",
          items: parsed.tunjangan,
        });
        parts.push(`${count} tunjangan`);
        counts = { ...counts, tunjangan: count };
        totalRecords += count;
      }
      if (parsed.vendors && parsed.vendors.length > 0) {
        const res = await importVendors({ rows: parsed.vendors });
        parts.push(`${res.inserted} vendor${res.skipped > 0 ? ` (${res.skipped} skip)` : ""}`);
        counts = { ...counts, vendors: res.inserted };
        totalRecords += res.inserted;
      }
      if (parsed.payables && parsed.payables.length > 0) {
        const res = await importPayables({ rows: parsed.payables });
        const tail = res.unresolvedVendors.length > 0 ? `, ${res.unresolvedVendors.length} vendor unresolved` : "";
        parts.push(`${res.inserted} piutang${tail}`);
        counts = { ...counts, payables: res.inserted };
        totalRecords += res.inserted;
      }
      const msg = parts.length > 0 ? parts.join(" · ") : "Tidak ada baris ke-commit";
      updateEntry(entry.id, { status: "done", importResult: msg });
      toast.success(`${entry.file.name}: ${msg}`);
      await recordUpload({
        kind: entry.topKind === "unknown" ? "weekly_sv" : entry.topKind,
        fileName: entry.file.name,
        fileSize: entry.file.size,
        periodLabel: parsed.pergantianPeriod ?? parsed.tunjanganPeriod ?? undefined,
        recordCount: totalRecords,
        counts,
        detectScore: entry.topScore,
        status: totalRecords > 0 ? "success" : "partial",
      }).catch((e) => console.error("recordUpload", e));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Commit gagal";
      updateEntry(entry.id, { status: "error", error: msg, progress: undefined });
      toast.error(`${entry.file.name}: ${msg}`);
      await recordUpload({
        kind: entry.topKind === "unknown" ? "weekly_sv" : entry.topKind,
        fileName: entry.file.name,
        fileSize: entry.file.size,
        recordCount: 0,
        detectScore: entry.topScore,
        status: "error",
        errorMessage: msg,
      }).catch((e) => console.error("recordUpload error", e));
    }
  }, [weekly, importPergantian, importTunjangan, importPayables, importVendors, recordUpload, updateEntry]);

  const commitAll = useCallback(async () => {
    const ready = entries.filter((e) => e.status === "ready" && isCommittable(e));
    for (const e of ready) {
      await commitOne(e);
    }
  }, [entries, commitOne]);

  const readyCount = useMemo(() => entries.filter((e) => e.status === "ready" && isCommittable(e)).length, [entries]);

  return (
    <div className="space-y-6">
      {/* ── Dropzone ── */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`block rounded-xl border-2 border-dashed transition-all cursor-pointer ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50 hover:bg-muted/20"
        }`}
      >
        <input
          type="file"
          multiple
          accept=".xlsx,.csv"
          onChange={onFileInput}
          className="sr-only"
        />
        <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
          <Layers className="h-10 w-10 text-primary/70" />
          <div>
            <p className="font-semibold">Drop file XLSX/CSV (banyak file OK)</p>
            <p className="text-xs text-muted-foreground mt-1">
              Setiap file otomatis di-deteksi jenisnya. Bisa beda format dalam 1 upload.
              Weekly SV: validator + commit inline. Tipe lain: commit langsung.
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
            Klik atau drag-drop di sini
          </span>
        </div>
      </label>

      {/* ── File list ── */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {entries.length} file ({readyCount} siap import)
            </p>
            {readyCount > 0 && (
              <button
                onClick={() => void commitAll()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
              >
                <Upload className="h-4 w-4" />
                Import Semua ({readyCount})
              </button>
            )}
          </div>
          {entries.map((entry) => (
            <FileCard
              key={entry.id}
              entry={entry}
              onOverride={(k) => void overrideKind(entry.id, k)}
              onToggleAlt={() => toggleAlt(entry.id)}
              onOpenValidator={() => setValidatorOpenFor(entry.id)}
              onRemove={() => removeFile(entry.id)}
              onImport={() => void commitOne(entry)}
            />
          ))}
        </div>
      )}

      {/* ── Validator Dialog ── */}
      <ValidatorDialog
        entry={entries.find((e) => e.id === validatorOpenFor) ?? null}
        onClose={() => setValidatorOpenFor(null)}
      />
    </div>
  );
}

function ValidatorDialog({
  entry, onClose,
}: { entry: FileEntry | null; onClose: () => void }) {
  const open = entry !== null;
  const warnings = entry?.parsed.weeklyWarnings ?? [];
  const period = entry?.parsed.weekly && entry.parsed.weekly.periodStart && entry.parsed.weekly.periodEnd
    ? `${entry.parsed.weekly.periodStart} → ${entry.parsed.weekly.periodEnd}`
    : null;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {warnings.length > 0
              ? <ShieldAlert className="h-5 w-5 text-yellow-600" />
              : <ShieldCheck className="h-5 w-5 text-emerald-600" />}
            Validator — {entry?.file.name ?? ""}
          </DialogTitle>
          <DialogDescription>
            {period ? `Periode: ${period} · ` : ""}
            {warnings.length > 0
              ? `${warnings.length} catatan validasi. Tinjau sebelum import.`
              : "Tidak ada peringatan — data bersih."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="pb-4">
            <WarningPanel warnings={warnings} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── File card ────────────────────────────────────────────

function isCommittable(entry: FileEntry): boolean {
  const { parsed, topKind } = entry;
  if (topKind === "bank_statement" || topKind === "unknown") return false;
  if (topKind === "weekly_sv") {
    return !!parsed.weekly && (
      parsed.weekly.lpkk.length + parsed.weekly.penjualan.length +
      parsed.weekly.platformSales.length + parsed.weekly.cashFlow.length > 0
    );
  }
  return (
    (parsed.pergantian?.length ?? 0) > 0 ||
    (parsed.tunjangan?.length ?? 0) > 0 ||
    (parsed.payables?.length ?? 0) > 0 ||
    (parsed.vendors?.length ?? 0) > 0
  );
}

function FileCard({
  entry, onOverride, onToggleAlt, onOpenValidator, onRemove, onImport,
}: {
  entry: FileEntry;
  onOverride: (k: FileKind) => void;
  onToggleAlt: () => void;
  onOpenValidator: () => void;
  onRemove: () => void;
  onImport: () => void;
}) {
  const tone = entry.status === "done"
    ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20"
    : entry.status === "error"
    ? "border-rose-300 bg-rose-50 dark:bg-rose-950/20"
    : entry.topScore >= 70
    ? "border-emerald-300/60"
    : entry.topScore >= 40
    ? "border-amber-300/60"
    : "border-border";

  const ext = KIND_EXTERNAL_ROUTE[entry.topKind];
  const committable = isCommittable(entry);
  const warningCount = entry.parsed.weeklyWarnings?.length ?? 0;

  return (
    <div className={`rounded-xl border bg-card p-4 shadow-sm ${tone}`}>
      <div className="flex items-start gap-3">
        <FileSpreadsheet className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{entry.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(entry.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <StatusBadge status={entry.status} />
            <button
              onClick={onRemove}
              disabled={entry.status === "importing"}
              className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30"
              aria-label="Hapus dari list"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Detection row */}
          {entry.status === "parsing" && (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Menganalisis…
            </p>
          )}

          {entry.status !== "parsing" && entry.status !== "error" && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                <span className="text-xs text-muted-foreground">Terdeteksi:</span>
                <select
                  value={entry.topKind}
                  onChange={(e) => onOverride(e.target.value as FileKind)}
                  disabled={entry.status === "importing" || entry.status === "done"}
                  className="text-xs font-semibold px-2 py-1 rounded border border-border bg-background"
                >
                  {ALL_KINDS.map((k) => (
                    <option key={k} value={k}>{KIND_LABEL[k]}</option>
                  ))}
                </select>
                <ScoreBadge score={entry.topScore} />
                {entry.ranked.filter((r) => r.score > 0 && r.kind !== entry.topKind).length > 0 && (
                  <button
                    onClick={onToggleAlt}
                    className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    {entry.showAlternatives ? "Tutup" : "Alternatif"}
                    {entry.showAlternatives ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                )}
              </div>
              {entry.topReasons.length > 0 && (
                <p className="text-xs text-muted-foreground italic">
                  {entry.topReasons[0]}
                </p>
              )}
              {entry.showAlternatives && (
                <div className="rounded-lg bg-muted/30 p-2 space-y-1">
                  {entry.ranked.filter((r) => r.score > 0 && r.kind !== entry.topKind).map((r) => (
                    <button
                      key={r.kind}
                      onClick={() => onOverride(r.kind)}
                      className="w-full text-left text-xs px-2 py-1 rounded hover:bg-background flex items-center justify-between gap-2"
                    >
                      <span className="font-medium">{KIND_LABEL[r.kind]}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground truncate">{r.reasons[0] ?? "—"}</span>
                        <ScoreBadge score={r.score} />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Weekly-specific summary */}
              {entry.topKind === "weekly_sv" && entry.parsed.weekly && (
                <WeeklySummary parsed={entry.parsed.weekly} />
              )}

              {/* Validator dialog trigger (weekly only) */}
              {entry.topKind === "weekly_sv" && entry.parsed.weeklyWarnings && (
                <div className="pt-1">
                  <button
                    onClick={onOpenValidator}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition ${
                      warningCount > 0
                        ? "bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-950/20 dark:border-yellow-800 dark:text-yellow-300 hover:bg-yellow-100"
                        : "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
                    }`}
                    title="Buka dialog validator"
                  >
                    {warningCount > 0
                      ? <ShieldAlert className="h-3.5 w-3.5" />
                      : <ShieldCheck className="h-3.5 w-3.5" />}
                    Buka Validator
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-background/70 border border-current/30 font-mono">
                      {warningCount > 0 ? `${warningCount} catatan` : "0"}
                    </span>
                    <Eye className="h-3 w-3 opacity-70" />
                  </button>
                </div>
              )}

              {/* Preview row for non-weekly */}
              {entry.topKind !== "weekly_sv" && committable && <PreviewRow entry={entry} />}

              {/* External-route hint */}
              {ext && entry.status === "ready" && (
                <a
                  href={ext.url}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 hover:underline font-medium"
                >
                  <ExternalLink className="h-3 w-3" /> {ext.label}
                  <span className="text-muted-foreground font-normal ml-1">— {ext.reason}</span>
                </a>
              )}

              {entry.topKind === "unknown" && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  Tidak ada match kuat. Pilih jenis manual dari dropdown di atas.
                </p>
              )}

              {/* Progress bar during weekly commit */}
              {entry.status === "importing" && entry.progress && (
                <ProgressBar progress={entry.progress} />
              )}

              {entry.status === "done" && entry.importResult && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  ✓ {entry.importResult}
                </p>
              )}

              {/* Per-file Import button */}
              {committable && entry.status === "ready" && (
                <button
                  onClick={onImport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold"
                >
                  <Upload className="h-3.5 w-3.5" /> Import file ini
                </button>
              )}
            </div>
          )}

          {entry.status === "error" && (
            <p className="text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> {entry.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: FileStatus }) {
  if (status === "parsing") return <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">parsing…</span>;
  if (status === "ready") return <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">ready</span>;
  if (status === "importing") return <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" /> importing</span>;
  if (status === "done") return <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 inline-flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5" /> done</span>;
  return <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 inline-flex items-center gap-1"><AlertCircle className="h-2.5 w-2.5" /> error</span>;
}

function ScoreBadge({ score }: { score: number }) {
  if (score === 0) return null;
  const tone =
    score >= 70 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" :
    score >= 40 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" :
    "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200";
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${tone}`}>{score}%</span>;
}

function PreviewRow({ entry }: { entry: FileEntry }) {
  const { parsed } = entry;
  const chips: Array<{ label: string; value: string; total?: number }> = [];
  if (parsed.pergantian && parsed.pergantian.length > 0) {
    const total = parsed.pergantian.reduce((s, p) => s + p.totalPrice, 0);
    chips.push({ label: "Pergantian", value: `${parsed.pergantian.length} item`, total });
  }
  if (parsed.tunjangan && parsed.tunjangan.length > 0) {
    const total = parsed.tunjangan.reduce((s, t) => s + t.luarKotaAmount + t.subsidiTransportAmount + t.budgetKosAmount, 0);
    chips.push({ label: "Tunjangan", value: `${parsed.tunjangan.length} karyawan`, total });
  }
  if (parsed.vendors && parsed.vendors.length > 0) {
    chips.push({ label: "Vendor", value: `${parsed.vendors.length} vendor` });
  }
  if (parsed.payables && parsed.payables.length > 0) {
    const total = parsed.payables.reduce((s, p) => s + p.amount, 0);
    chips.push({ label: "Piutang", value: `${parsed.payables.length} invoice`, total });
  }
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {chips.map((c) => (
        <div key={c.label} className="text-xs px-2 py-1 rounded-md bg-muted/50 border border-border/60">
          <span className="font-semibold">{c.label}:</span> {c.value}
          {c.total !== undefined && <span className="text-muted-foreground ml-1">· {formatRpFull(c.total)}</span>}
        </div>
      ))}
    </div>
  );
}

function WeeklySummary({ parsed }: { parsed: WeeklyParsedData }) {
  const totalRecords =
    parsed.lpkk.length + parsed.penjualan.length + parsed.platformSales.length +
    parsed.vendor.length + parsed.weeklyFc.length + parsed.leftover.length +
    parsed.kasPeriode.length + parsed.salesControl.length + parsed.pembelianKredit.length +
    parsed.ikhtisarFC.length + parsed.transferTOTI.length + parsed.hppProduk.length +
    parsed.costAnalysis.length + parsed.cashFlow.length + parsed.insentif.length;
  const period = parsed.periodStart && parsed.periodEnd ? `${parsed.periodStart} → ${parsed.periodEnd}` : "Periode tidak terdeteksi";
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <div className="text-xs px-2 py-1 rounded-md bg-muted/50 border border-border/60">
        <span className="font-semibold">Periode:</span> {period}
      </div>
      <div className="text-xs px-2 py-1 rounded-md bg-muted/50 border border-border/60">
        <span className="font-semibold">Total record:</span> {totalRecords}
      </div>
      {parsed.lpkk.length > 0 && <Chip label="Kas kecil" n={parsed.lpkk.length} />}
      {(parsed.penjualan.length + parsed.platformSales.length) > 0 && <Chip label="Penjualan" n={parsed.penjualan.length + parsed.platformSales.length} />}
      {parsed.vendor.length > 0 && <Chip label="Vendor" n={parsed.vendor.length} />}
      {parsed.hppProduk.length > 0 && <Chip label="HPP" n={parsed.hppProduk.length} />}
      {parsed.cashFlow.length > 0 && <Chip label="Cash flow" n={parsed.cashFlow.length} />}
      {parsed.unknownSheets.length > 0 && (
        <div className="text-xs px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-300/60 text-amber-700 dark:text-amber-300">
          {parsed.unknownSheets.length} sheet tak dikenal
        </div>
      )}
    </div>
  );
}

function Chip({ label, n }: { label: string; n: number }) {
  return (
    <div className="text-xs px-2 py-1 rounded-md bg-muted/30 border border-border/40">
      <span className="text-muted-foreground">{label}:</span> <span className="font-semibold">{n}</span>
    </div>
  );
}

function ProgressBar({ progress }: { progress: WeeklyImportProgress }) {
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{progress.label}</span>
        <span className="font-mono font-semibold">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
