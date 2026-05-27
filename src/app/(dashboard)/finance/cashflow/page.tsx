"use client";

import { TrendingUp } from "lucide-react";
import { CashflowOverview } from "@/features/cashflow";
import { ReportPage } from "@/features/report-pdf";

export default function Page() {
  return (
    <ReportPage
      icon={TrendingUp}
      title="Cashflow"
      description="Arus kas bersih per periode — pendapatan, operasional, piutang, pocket."
      reportTitle="Laporan Cashflow"
      containerClassName="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto"
    >
      <CashflowOverview />
    </ReportPage>
  );
}
