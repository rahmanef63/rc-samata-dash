"use client";

import { useQuery } from "convex/react";
import { CreditCard } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { PayablesNotionView } from "@/features/payables/components/PayablesNotionView";
import { PageHeader } from "@/shared/components";
import { ImportLinkButton } from "@/features/universal-import/components/ImportLinkButton";

export default function Page() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  if (!branchId) return <p className="p-8 text-center text-sm text-muted-foreground">Memuat cabang...</p>;
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={CreditCard}
        title="Piutang Vendor"
        description="Daftar invoice vendor yang masih open/partial. Klik baris untuk detail bukti bayar."
        action={<ImportLinkButton />}
      />
      <PayablesNotionView branchId={branchId} />
    </div>
  );
}
