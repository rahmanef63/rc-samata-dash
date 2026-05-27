"use client";

import { BarChart3 } from "lucide-react";
import { ReportOverview } from "@/features/report";
import { ReportPage as ReportPageShell } from "@/features/report-pdf";

export default function ReportPage() {
  return (
    <ReportPageShell
      icon={BarChart3}
      title="Ringkasan Laporan"
      description="Tren pendapatan, rincian pengeluaran, dan arus kas — periode aktif."
      containerClassName="p-4 md:p-6 space-y-4 max-w-[1400px]"
    >
      <ReportOverview />
    </ReportPageShell>
  );
}
