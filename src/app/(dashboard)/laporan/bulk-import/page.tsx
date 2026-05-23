"use client";

import { useState } from "react";
import { Upload, ScanLine, Receipt, FileText } from "lucide-react";
import { FilenameScanner } from "@/features/bulk-import/components/FilenameScanner";
import { BulkReceiptsImport } from "@/features/bulk-import/components/BulkReceiptsImport";
import { BulkPayablesImport } from "@/features/bulk-import/components/BulkPayablesImport";
import { cn } from "@/lib/utils";

type Tab = "scan" | "receipts" | "payables";

const TABS: { key: Tab; label: string; icon: typeof Upload }[] = [
  { key: "scan", label: "Scan Filenames", icon: ScanLine },
  { key: "receipts", label: "Bukti Bayar", icon: Receipt },
  { key: "payables", label: "Penagihan Piutang", icon: FileText },
];

export default function BulkImportPage() {
  const [tab, setTab] = useState<Tab>("scan");

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Upload className="h-6 w-6 text-primary" />
          Bulk Import dari Chat
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Workflow: <b>Scan Filenames</b> dari chat WhatsApp → export CSV scaffold (auto isi vendor/tanggal) → lengkapi <i>amount</i> di Excel → upload via tab Bukti Bayar atau Penagihan Piutang.
        </p>
      </header>

      <div className="overflow-x-auto">
        <div className="flex gap-1 rounded-xl bg-muted p-1 min-w-max">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap inline-flex items-center gap-1.5",
                  tab === t.key
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "scan" && <FilenameScanner />}
      {tab === "receipts" && <BulkReceiptsImport />}
      {tab === "payables" && <BulkPayablesImport />}
    </div>
  );
}
