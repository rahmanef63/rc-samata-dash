"use client";

import { MessageSquareText } from "lucide-react";
import { WaAuditOverview } from "@/features/wa-audit";
import { PageHeader } from "@/shared/components";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={MessageSquareText}
        title="WA Daily Audit"
        description="Cross-check laporan harian SV via WhatsApp (Tier-2) vs weekly xlsx (Tier-3). Discrepancy &gt; Rp 5.000 = perlu reconcile."
      />
      <WaAuditOverview />
    </div>
  );
}
