"use client";

import { Database } from "lucide-react";
import { MasterDataPanel } from "@/features/master-data";
import { PageHeader } from "@/shared/components";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Database}
        title="Master Data"
        description="Vendor, channel pendapatan, kategori pengeluaran — referensi yang dipakai semua transaksi."
      />
      <MasterDataPanel />
    </div>
  );
}
