"use client";

import { ReportOverview } from "@/features/report";
import { ReportButton, ReportPrintShell } from "@/features/report-pdf";

export default function ReportPage() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      <div className="flex items-start justify-between gap-3" data-print="hide">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Ringkasan Laporan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tren pendapatan, rincian pengeluaran, dan arus kas — periode aktif.
          </p>
        </div>
        <ReportButton />
      </div>
      <ReportPrintShell title="Ringkasan Laporan">
        <ReportOverview />
      </ReportPrintShell>
    </div>
  );
}
