"use client";

import { useQuery } from "convex/react";
import { Receipt } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { PaymentReceiptsNotionView } from "@/features/closing/components/PaymentReceiptsNotionView";
import { PageHeader } from "@/shared/components";

export default function Page() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  if (!branchId) return <p className="p-8 text-center text-sm text-muted-foreground">Memuat cabang...</p>;
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Receipt}
        title="Bukti Bayar"
        description="Riwayat bukti pembayaran piutang vendor — owner & PIC. Filter by paidBy, search by file/reference."
      />
      <PaymentReceiptsNotionView branchId={branchId} />
    </div>
  );
}
