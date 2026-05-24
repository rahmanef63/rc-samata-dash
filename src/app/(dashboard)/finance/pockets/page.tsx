"use client";

import { Wallet } from "lucide-react";
import { PocketsOverview } from "@/features/pockets";
import { PageHeader } from "@/shared/components";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Wallet}
        title="Pocket — Cash Ledger"
        description="Tempat fisik saldo (brankas, dompet PIC, rekening, dll). Setiap transaksi harus di-tag pocket sumber agar saldo rekonsiliasi vs fisik."
      />
      <PocketsOverview />
    </div>
  );
}
