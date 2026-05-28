"use client";

import { ClipboardList } from "lucide-react";
import { AuditLogViewer } from "@/features/audit";
import { ReportPage } from "@/features/report-pdf";

export default function Page() {
  return (
    <ReportPage
      icon={ClipboardList}
      title="Log Audit"
      description="Riwayat semua mutasi data — create / update / delete per entitas. Filter by tipe + tanggal."
      reportTitle="Log Audit"
      printHint="Cetak PDF — pilih view 'Tabel' dulu untuk hasil terbaik"
      containerClassName="max-w-[1400px] mx-auto p-4 md:p-6"
    >
      <AuditLogViewer />
    </ReportPage>
  );
}
