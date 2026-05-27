"use client";

import { CreditCard } from "lucide-react";
import { PayablesNotionView } from "@/features/payables/components/PayablesNotionView";
import { ImportLinkButton } from "@/features/universal-import/components/ImportLinkButton";
import { ReportPage } from "@/features/report-pdf";

export default function Page() {
  return (
    <ReportPage
      icon={CreditCard}
      title="Piutang Vendor"
      description="Daftar invoice vendor yang masih open/partial. Klik baris untuk detail bukti bayar."
      extraActions={<ImportLinkButton />}
      printHint="Cetak PDF — pilih view 'Tabel' dulu untuk hasil terbaik"
    >
      <PayablesNotionView />
    </ReportPage>
  );
}
