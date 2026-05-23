"use client";

import { Banknote } from "lucide-react";
import { DailyClosingsNotionView } from "@/features/closing/components/DailyClosingsNotionView";
import { PageHeader } from "@/shared/components";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Banknote}
        title="Setoran Harian"
        description="Daily closing kas — cash sales, non-cash, expected vs actual, selisih, status verified."
      />
      <DailyClosingsNotionView />
    </div>
  );
}
