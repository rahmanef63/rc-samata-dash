"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const View = dynamic(
  () => import("@/features/master-data/components/VendorBankAliasesNotionView").then((m) => ({ default: m.VendorBankAliasesNotionView })),
  { ssr: false, loading: () => <p className="px-8 py-12 text-sm text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Memuat...</p> },
);

export default function Page() {
  return <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8"><View /></div>;
}
