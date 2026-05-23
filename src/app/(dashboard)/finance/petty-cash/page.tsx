"use client";

import { Coins } from "lucide-react";
import { PettyCashNotionView } from "@/features/pettyCash/components/PettyCashNotionView";
import { PageHeader } from "@/shared/components";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Coins}
        title="Petty Cash"
        description="Request kas kecil cabang — approval flow, kategori tujuan, status pencairan."
      />
      <PettyCashNotionView />
    </div>
  );
}
