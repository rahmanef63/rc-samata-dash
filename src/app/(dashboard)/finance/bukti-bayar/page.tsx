"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { PaymentReceiptsNotionView } from "@/features/closing/components/PaymentReceiptsNotionView";

export default function Page() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  if (!branchId) return <p className="p-8 text-center text-sm text-muted-foreground">Memuat cabang...</p>;
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PaymentReceiptsNotionView branchId={branchId} />
    </div>
  );
}
