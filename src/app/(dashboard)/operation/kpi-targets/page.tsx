"use client";

import { Target } from "lucide-react";
import { KpiTargetAdmin } from "@/features/dashboard/components/KpiTargetAdmin";
import { ReportPage } from "@/features/report-pdf";

export default function Page() {
  return (
    <ReportPage
      icon={Target}
      title="Target KPI"
      description="Set target per-cabang untuk Food Cost, Gross Margin, Waste, Sales, dll. Dipakai dashboard untuk hitung BAHAYA/SEHAT."
      reportTitle="Target KPI"
    >
      <KpiTargetAdmin />
    </ReportPage>
  );
}
