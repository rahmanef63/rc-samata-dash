"use client";

import { useQuery } from "convex/react";
import { Package } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { StockMovementsNotionView } from "@/features/inventory/components/StockMovementsNotionView";
import { PageHeader } from "@/shared/components";

export default function Page() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  if (!branchId) return <p className="p-8 text-center text-sm text-muted-foreground">Memuat cabang...</p>;
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Package}
        title="Mutasi Stok"
        description="Pergerakan inventory cabang — masuk, keluar, transfer, adjustment. Auto-derived dari snapshot mingguan."
      />
      <StockMovementsNotionView branchId={branchId} />
    </div>
  );
}
