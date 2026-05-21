"use client";

import dynamic from "next/dynamic";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";

const View = dynamic(
  () => import("@/features/closing/components/ValidationBatchesNotionView").then((m) => ({ default: m.ValidationBatchesNotionView })),
  { ssr: false, loading: () => <p className="px-8 py-12 text-sm text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Memuat...</p> },
);

export default function Page() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  if (!branchId) return <p className="p-8 text-center text-sm text-muted-foreground">Memuat cabang...</p>;
  return <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8"><View branchId={branchId} /></div>;
}
