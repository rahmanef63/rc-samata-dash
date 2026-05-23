"use client";

import { Receipt } from "lucide-react";
import { PaymentReceiptsNotionView } from "@/features/closing/components/PaymentReceiptsNotionView";
import { PageHeader } from "@/shared/components";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Receipt}
        title="Bukti Bayar"
        description="Riwayat bukti pembayaran piutang vendor — owner & PIC. Filter by paidBy, search by file/reference."
      />
      <PaymentReceiptsNotionView />
    </div>
  );
}
