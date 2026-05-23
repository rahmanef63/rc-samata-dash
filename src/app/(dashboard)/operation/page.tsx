"use client";

import { Boxes } from "lucide-react";
import { StockItemsNotionView } from "@/features/inventory/components/StockItemsNotionView";
import { PageHeader } from "@/shared/components";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Boxes}
        title="Inventaris"
        description="Master stock items cabang — kategori, satuan, minimum stock, status active."
      />
      <StockItemsNotionView />
    </div>
  );
}
