"use client";

import { DailyClosingPanel } from "@/features/closing";
import { ReportButton, ReportPrintShell } from "@/features/report-pdf";

export default function Page() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-3" data-print="hide">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Closing & Setoran</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Daily closing, transfer owner, import CSV — cetak tab aktif sebagai PDF.
          </p>
        </div>
        <ReportButton hint="Cetak tab aktif sebagai PDF" />
      </div>
      <ReportPrintShell title="Closing & Setoran">
        <DailyClosingPanel />
      </ReportPrintShell>
    </div>
  );
}
