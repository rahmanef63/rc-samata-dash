"use client";

// Shared validator warning UI — extracted from /laporan/upload page so
// MultiFileUploader can render the same inline cards per-file without
// duplicating markup.

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Info, Copy, Check } from "lucide-react";
import type { ValidationWarning } from "../lib/validateParsedData";

export function formatWarningForClipboard(w: ValidationWarning): string {
  const lines: string[] = [];
  lines.push(`[${w.severity.toUpperCase()}] ${w.category}`);
  lines.push(`Pesan: ${w.message}`);
  if (w.tip) lines.push(`Tip: ${w.tip}`);
  const items = w.fullDetails ?? w.details ?? [];
  if (items.length > 0) {
    lines.push("");
    lines.push("Item detail:");
    items.forEach((d) => lines.push(d.startsWith("•") || d.startsWith("·") ? d : `• ${d}`));
  }
  return lines.join("\n");
}

export function WarningCard({ w }: { w: ValidationWarning }) {
  const [copied, setCopied] = useState(false);
  const items = w.fullDetails ?? w.details ?? [];
  const displayed = w.details ?? items;
  const hiddenCount = items.length - displayed.length;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatWarningForClipboard(w));
      setCopied(true);
      toast.success(`Disalin: ${w.category} (${items.length} item)`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Gagal menyalin ke clipboard");
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 text-sm ${
        w.severity === "warning"
          ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800"
          : "border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800"
      }`}
    >
      <div className="flex items-start gap-3">
        {w.severity === "warning" ? (
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
        ) : (
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
        )}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono font-semibold text-muted-foreground bg-background/70 px-1.5 py-0.5 rounded border border-border/50">
              {w.category}
            </span>
            <p className="font-semibold text-foreground text-sm flex-1">{w.message}</p>
            <button
              type="button"
              onClick={handleCopy}
              title={items.length > 0 ? `Salin ${items.length} item ke clipboard` : "Salin teks peringatan"}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground bg-background/70 hover:bg-background border border-border/50 px-2 py-0.5 rounded shrink-0"
            >
              {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
              {copied ? "Tersalin" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{w.tip}</p>
          {displayed.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-1 bg-background/50 rounded-lg py-2 px-3 border border-border/30">
              {displayed.map((d, j) => (
                <li key={j} className="tracking-wide break-words">{d.startsWith("•") || d.startsWith("·") ? d : `• ${d}`}</li>
              ))}
              {hiddenCount > 0 && (
                <li className="tracking-wide text-muted-foreground/70 italic pt-1 border-t border-border/30">
                  … +{hiddenCount} lainnya — klik Copy untuk dapat list lengkap
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function CopyAllWarnings({ warnings }: { warnings: ValidationWarning[] }) {
  const [copied, setCopied] = useState(false);
  const totalItems = warnings.reduce((s, w) => s + (w.fullDetails?.length ?? w.details?.length ?? 0), 0);

  async function handleCopyAll() {
    try {
      const text = warnings.map((w) => formatWarningForClipboard(w)).join("\n\n──────────\n\n");
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`Semua peringatan disalin (${warnings.length} kategori, ${totalItems} item)`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Gagal menyalin");
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2">
      <span className="text-xs text-muted-foreground">
        {warnings.length} kategori · {totalItems} item — kirim ke AI buat bantu set kategori / fix mass
      </span>
      <button
        type="button"
        onClick={handleCopyAll}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-background hover:bg-muted border border-border px-2.5 py-1 rounded shrink-0"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Tersalin" : "Copy semua"}
      </button>
    </div>
  );
}

export function WarningPanel({ warnings }: { warnings: ValidationWarning[] }) {
  if (warnings.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-2">
        <Check className="h-3.5 w-3.5" /> Tidak ada peringatan validasi.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <CopyAllWarnings warnings={warnings} />
      {warnings.map((w, i) => (
        <WarningCard key={i} w={w} />
      ))}
    </div>
  );
}
