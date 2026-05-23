"use client";

import { Package } from "lucide-react";
import { StockMovementsNotionView } from "@/features/inventory/components/StockMovementsNotionView";
import { PageHeader } from "@/shared/components";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Package}
        title="Mutasi Stok"
        description="Pergerakan inventory cabang — masuk, keluar, transfer, adjustment. Auto-derived dari snapshot mingguan."
      />
      <StockMovementsNotionView />
    </div>
  );
}
