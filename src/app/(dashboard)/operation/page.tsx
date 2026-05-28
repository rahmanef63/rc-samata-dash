"use client";

import { Boxes } from "lucide-react";
import { StockItemsNotionView } from "@/features/inventory/components/StockItemsNotionView";
import { ReportPage } from "@/features/report-pdf";

export default function Page() {
  return (
    <ReportPage
      icon={Boxes}
      title="Inventaris"
      description="Master stock items cabang — kategori, satuan, minimum stock, status active."
      reportTitle="Laporan Inventaris"
      printHint="Cetak PDF — pilih view 'Tabel' dulu untuk hasil terbaik"
    >
      <StockItemsNotionView />
    </ReportPage>
  );
}
