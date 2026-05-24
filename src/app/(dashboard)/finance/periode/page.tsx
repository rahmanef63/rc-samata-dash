"use client";

import { Lock } from "lucide-react";
import { PeriodLockOverview } from "@/features/period-lock";
import { PageHeader } from "@/shared/components";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Lock}
        title="Periode Akuntansi"
        description="Lock periode untuk freeze edit transaksi past period. Closing review = locked, audit final = closed."
      />
      <PeriodLockOverview />
    </div>
  );
}
