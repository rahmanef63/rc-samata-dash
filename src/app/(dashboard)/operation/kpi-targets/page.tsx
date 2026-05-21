"use client";

import { Target } from "lucide-react";
import { KpiTargetAdmin } from "@/features/dashboard/components/KpiTargetAdmin";
import { PageHeader } from "@/shared/components";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Target}
        title="Target KPI"
        description="Set target per-cabang untuk Food Cost, Gross Margin, Waste, Sales, dll. Dipakai dashboard untuk hitung BAHAYA/SEHAT."
      />
      <KpiTargetAdmin />
    </div>
  );
}
