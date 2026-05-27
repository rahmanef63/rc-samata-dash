"use client";

import { Moon } from "lucide-react";
import { DailyClosingPanel } from "@/features/closing";
import { ReportPage } from "@/features/report-pdf";

export default function Page() {
  return (
    <ReportPage
      icon={Moon}
      title="Closing & Setoran"
      description="Daily closing, transfer owner, import CSV — cetak tab aktif sebagai PDF."
      reportTitle="Laporan Closing & Setoran"
      printHint="Cetak tab aktif sebagai PDF"
      containerClassName="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto"
    >
      <DailyClosingPanel />
    </ReportPage>
  );
}
