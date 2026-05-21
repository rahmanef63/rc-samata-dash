"use client";

import { useQuery } from "convex/react";
import { Coins } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { PettyCashNotionView } from "@/features/pettyCash/components/PettyCashNotionView";
import { PageHeader } from "@/shared/components";

export default function Page() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  if (!branchId) return <p className="p-8 text-center text-sm text-muted-foreground">Memuat cabang...</p>;
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Coins}
        title="Petty Cash"
        description="Request kas kecil cabang — approval flow, kategori tujuan, status pencairan."
      />
      <PettyCashNotionView branchId={branchId} />
    </div>
  );
}
