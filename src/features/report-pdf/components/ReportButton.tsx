"use client";

import { Printer } from "lucide-react";
import { toast } from "sonner";

export function ReportButton({
  label = "Cetak PDF",
  disabled,
  onBeforePrint,
  hint = "Buka dialog cetak — pilih 'Save as PDF' untuk simpan",
}: {
  label?: string;
  disabled?: boolean;
  onBeforePrint?: () => void | Promise<void>;
  hint?: string;
}) {
  const handleClick = async () => {
    if (disabled) return;
    try {
      await onBeforePrint?.();
    } catch (e) {
      toast.error("Gagal siapkan cetak: " + (e instanceof Error ? e.message : "unknown"));
      return;
    }
    requestAnimationFrame(() => {
      toast.message("Pilih 'Save as PDF' di dialog cetak");
      window.print();
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      data-print="hide"
      title={hint}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Printer className="h-3.5 w-3.5 text-primary" />
      {label}
    </button>
  );
}
