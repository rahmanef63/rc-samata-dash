"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { BukuBesarPage } from "@/features/buku-besar/components/BukuBesarPage";

export default function Page() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  if (!branchId) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Memuat cabang...</p>;
  }
  return <BukuBesarPage branchId={branchId} />;
}
