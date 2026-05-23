"use client";

import dynamic from "next/dynamic";
import { Loader2, Landmark } from "lucide-react";
import { PageHeader } from "@/shared/components";

const View = dynamic(
  () => import("@/features/closing/components/BankStatementBatchesNotionView").then((m) => ({ default: m.BankStatementBatchesNotionView })),
  { ssr: false, loading: () => <p className="px-8 py-12 text-sm text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Memuat...</p> },
);

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Landmark}
        title="Statement Bank"
        description="Batch statement bank owner & PIC yang sudah diupload. Klik baris untuk reconciliation detail."
      />
      <View />
    </div>
  );
}
