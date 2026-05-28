"use client";

import { Coins } from "lucide-react";
import { PettyCashNotionView } from "@/features/pettyCash/components/PettyCashNotionView";
import { ReportPage } from "@/features/report-pdf";

export default function Page() {
  return (
    <ReportPage
      icon={Coins}
      title="Petty Cash"
      description="Request kas kecil cabang — approval flow, kategori tujuan, status pencairan."
      reportTitle="Laporan Petty Cash"
      printHint="Cetak PDF — pilih view 'Tabel' dulu untuk hasil terbaik"
    >
      <PettyCashNotionView />
    </ReportPage>
  );
}
