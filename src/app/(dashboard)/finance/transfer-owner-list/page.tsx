"use client";

import { ArrowLeftRight } from "lucide-react";
import { OwnerTransfersNotionView } from "@/features/closing/components/OwnerTransfersNotionView";
import { PageHeader } from "@/shared/components";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={ArrowLeftRight}
        title="Transfer Owner"
        description="Riwayat setoran cabang → owner & topup owner → cabang. Arah, tujuan, status."
      />
      <OwnerTransfersNotionView />
    </div>
  );
}
