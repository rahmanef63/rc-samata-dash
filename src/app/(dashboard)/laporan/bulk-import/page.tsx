"use client";

import Link from "next/link";
import { ScanLine } from "lucide-react";
import { FilenameScanner } from "@/features/bulk-import/components/FilenameScanner";

export default function BulkImportPage() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" />
          Scan Filename WA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste daftar nama file dari chat WhatsApp → sistem deteksi vendor + tanggal dari pola filename → export CSV scaffold. Lengkapi <i>amount</i> di Excel, lalu upload via <Link href="/upload" className="text-primary hover:underline font-medium">/upload</Link> (auto-detect kind: bukti bayar / piutang).
        </p>
      </header>

      <FilenameScanner />
    </div>
  );
}
