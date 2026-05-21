"use client";

import { ClipboardList } from "lucide-react";
import { AuditLogViewer } from "@/features/audit";
import { PageHeader } from "@/shared/components";

export default function Page() {
  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6">
      <PageHeader
        icon={ClipboardList}
        title="Log Audit"
        description="Riwayat semua mutasi data — create / update / delete per entitas. Filter by tipe + tanggal."
      />
      <AuditLogViewer />
    </div>
  );
}
