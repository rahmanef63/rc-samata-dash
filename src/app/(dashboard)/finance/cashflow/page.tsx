"use client";

import { CashflowOverview } from "@/features/cashflow";
import { ReportButton, ReportPrintShell } from "@/features/report-pdf";

export default function Page() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-3" data-print="hide">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Cashflow</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Arus kas bersih per periode — pendapatan, operasional, piutang, pocket.
          </p>
        </div>
        <ReportButton />
      </div>
      <ReportPrintShell title="Laporan Cashflow">
        <CashflowOverview />
      </ReportPrintShell>
    </div>
  );
}
