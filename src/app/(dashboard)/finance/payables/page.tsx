"use client";

import { CreditCard } from "lucide-react";
import { PayablesNotionView } from "@/features/payables/components/PayablesNotionView";
import { PageHeader } from "@/shared/components";
import { ImportLinkButton } from "@/features/universal-import/components/ImportLinkButton";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={CreditCard}
        title="Piutang Vendor"
        description="Daftar invoice vendor yang masih open/partial. Klik baris untuk detail bukti bayar."
        action={<ImportLinkButton />}
      />
      <PayablesNotionView />
    </div>
  );
}
