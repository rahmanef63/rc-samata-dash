"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { CheckCircle, AlertTriangle, FileText, ClipboardPaste, Save, Loader2, X } from "lucide-react";
import { useDailyCheckData, useSaveValidation } from "../api";
import { parseWhatsAppReport, type WhatsAppReport } from "../parsers";
import { compareReport, type DiffRow } from "../lib/compare";
import { formatRpFull } from "@/shared/lib";
import { cn } from "@/lib/utils";

const SAMPLES = {
  transferOnline: `*Transfer Online Owner 29 april 2026*

Gojek : 133.273
Grab: 420.360
Shopee: 84.000
Ovo: 1.834.071

Total: 2.471.704`,
  dailySummary: `*RC Samata (M)*
_senin, 29 april 2026_
Sales: 3.876.633
Online: 2.471.704
Cash: 1.404.929
Total sales: 132.420.270`,
  monthlyTally: `_*SALES RC SAMATA BULAN APRIL 2026*_
Sales/total sales/customer

1. 4.712.936/4.712.936/178
2. 5.732.764/10.455.700/175
3. 4.500.091/14.945.791/131`,
};

const KIND_LABELS: Record<WhatsAppReport["kind"], string> = {
  transferOnline: "Transfer Online Owner",
  dailySummary: "Ringkasan Harian",
  monthlyTally: "Tally Bulanan",
};

export function WhatsAppValidator() {
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [parsed, setParsed] = useState<WhatsAppReport | null>(null);
  const saveValidation = useSaveValidation();
  const [saving, setSaving] = useState(false);

  // Derived date for the check query — only relevant for transferOnline + dailySummary.
  const businessDate = useMemo(() => {
    if (!parsed) return undefined;
    if (parsed.kind === "transferOnline") return parsed.date;
    if (parsed.kind === "dailySummary") return parsed.date;
    return undefined;
  }, [parsed]);

  const snapshot = useDailyCheckData(businessDate);

  const diff = useMemo(() => {
    if (!parsed) return null;
    if (parsed.kind === "monthlyTally") return null;
    if (!snapshot) return null;
    return compareReport(parsed, snapshot);
  }, [parsed, snapshot]);

  const handleParse = () => {
    if (!text.trim()) {
      toast.error("Paste teks WhatsApp dulu");
      return;
    }
    const result = parseWhatsAppReport(text);
    if (!result) {
      setParsed(null);
      toast.error("Tidak bisa kenali format WhatsApp. Pastikan ada tanggal + minimal 1 kolom angka.");
      return;
    }
    setParsed(result);
    toast.success(`Parse OK · format ${KIND_LABELS[result.kind]}`);
  };

  const handleClear = () => {
    setText("");
    setNote("");
    setParsed(null);
  };

  const handleSave = async () => {
    if (!parsed || !businessDate || !diff) {
      toast.error("Tidak ada hasil parse untuk disimpan");
      return;
    }
    setSaving(true);
    try {
      await saveValidation({
        businessDate,
        kind: parsed.kind,
        rawText: text,
        parsedJson: JSON.stringify(parsed),
        expectedJson: JSON.stringify(snapshot),
        diffJson: JSON.stringify(diff),
        matchedAll: diff.matchedAll,
        note: note || undefined,
      });
      toast.success(`Validasi tersimpan — ${diff.matchedAll ? "MATCH" : `${diff.rows.filter((r) => !r.match).length} mismatch`}`);
      handleClear();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal simpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Paste panel */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <ClipboardPaste className="h-4 w-4 text-primary" />
            Paste Teks WhatsApp
          </h2>
          <div className="flex gap-1 flex-wrap">
            {(["transferOnline", "dailySummary", "monthlyTally"] as const).map((k) => (
              <button
                key={k}
                onClick={() => { setText(SAMPLES[k]); setParsed(null); }}
                className="text-[10px] px-2 py-1 rounded border border-border hover:bg-muted/50 font-semibold"
              >
                Sample {KIND_LABELS[k]}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste laporan WhatsApp di sini (Transfer Online Owner / Sales harian / Tally bulanan)..."
            rows={14}
            className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-y"
          />
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <X className="h-3 w-3" /> Bersih
            </button>
            <button
              onClick={handleParse}
              disabled={!text.trim()}
              className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" /> Parse
            </button>
          </div>
        </div>
      </div>

      {/* Result panel */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <h2 className="text-sm font-bold flex items-center gap-2">
            {parsed?.kind === "monthlyTally" ? <FileText className="h-4 w-4 text-blue-600" /> :
             diff?.matchedAll ? <CheckCircle className="h-4 w-4 text-green-600" /> :
             diff ? <AlertTriangle className="h-4 w-4 text-yellow-600" /> :
             <FileText className="h-4 w-4 text-muted-foreground" />}
            Hasil Validasi
          </h2>
          {parsed && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Format: <b>{KIND_LABELS[parsed.kind]}</b>
              {businessDate ? ` · tanggal ${businessDate}` : ""}
            </p>
          )}
        </div>
        <div className="p-4 space-y-3">
          {!parsed ? (
            <p className="text-xs text-muted-foreground italic text-center py-8">Belum ada hasil — klik Parse setelah paste.</p>
          ) : parsed.kind === "monthlyTally" ? (
            <MonthlyTallyView parsed={parsed} />
          ) : !snapshot ? (
            <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Memuat data sistem...</p>
          ) : diff ? (
            <DiffTable rows={diff.rows} />
          ) : null}

          {parsed && parsed.kind !== "monthlyTally" && diff && (
            <>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Catatan opsional (alasan diff, dll)..."
                rows={2}
                className="w-full px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              />
              <button
                onClick={handleSave}
                disabled={saving || !snapshot}
                className="w-full px-3 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? "Menyimpan..." : `Simpan Validasi (${diff.matchedAll ? "MATCH" : `${diff.rows.filter((r) => !r.match).length} mismatch`})`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DiffTable({ rows }: { rows: DiffRow[] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-[11px]">
        <thead className="bg-muted/40">
          <tr className="text-left">
            <th className="px-2 py-1.5 font-semibold">Item</th>
            <th className="px-2 py-1.5 font-semibold text-right">WhatsApp</th>
            <th className="px-2 py-1.5 font-semibold text-right">Sistem</th>
            <th className="px-2 py-1.5 font-semibold text-right">Selisih</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={cn("border-t border-border/40", r.match ? "" : "bg-yellow-50 dark:bg-yellow-950/20")}>
              <td className="px-2 py-1 font-medium flex items-center gap-1.5">
                {r.match
                  ? <CheckCircle className="h-3 w-3 text-green-600 shrink-0" />
                  : <AlertTriangle className="h-3 w-3 text-yellow-600 shrink-0" />}
                {r.label}
              </td>
              <td className="px-2 py-1 text-right font-mono">{formatRpFull(r.whatsApp)}</td>
              <td className="px-2 py-1 text-right font-mono text-muted-foreground">{formatRpFull(r.system)}</td>
              <td className={cn("px-2 py-1 text-right font-mono font-semibold",
                r.match ? "text-muted-foreground" : r.diff > 0 ? "text-blue-600" : "text-destructive",
              )}>
                {r.match ? "—" : (r.diff > 0 ? "+" : "") + formatRpFull(r.diff)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthlyTallyView({ parsed }: { parsed: Extract<WhatsAppReport, { kind: "monthlyTally" }> }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {parsed.rows.length} hari · {parsed.month ? `bulan ${parsed.month}` : "bulan tidak terdeteksi"}
        {parsed.year ? ` · ${parsed.year}` : ""}
      </p>
      <div className="rounded-lg border border-border overflow-auto max-h-[400px]">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/40 sticky top-0">
            <tr className="text-left">
              <th className="px-2 py-1.5 font-semibold">Tgl</th>
              <th className="px-2 py-1.5 font-semibold text-right">Sales</th>
              <th className="px-2 py-1.5 font-semibold text-right">MTD</th>
              <th className="px-2 py-1.5 font-semibold text-right">Cust</th>
            </tr>
          </thead>
          <tbody>
            {parsed.rows.map((r) => (
              <tr key={r.day} className="border-t border-border/40">
                <td className="px-2 py-1 font-mono">{r.date ?? r.day}</td>
                <td className="px-2 py-1 text-right font-mono">{formatRpFull(r.sales)}</td>
                <td className="px-2 py-1 text-right font-mono text-muted-foreground">{formatRpFull(r.mtdCumulative)}</td>
                <td className="px-2 py-1 text-right font-mono">{r.customerCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground italic">
        Cross-check tally bulanan vs salesControl per-hari belum aktif — gunakan format Daily Summary atau Transfer Online untuk validasi per tanggal.
      </p>
    </div>
  );
}
