"use client";

import dynamic from "next/dynamic";
import { useQuery } from "convex/react";
import { BookOpen, Loader2 } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";

const BukuBesarNotion = dynamic(
  () => import("@/features/buku-besar/components/BukuBesarNotion").then((m) => ({ default: m.BukuBesarNotion })),
  { ssr: false, loading: () => <p className="px-8 py-12 text-sm text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Memuat Buku Besar...</p> },
);

export default function Page() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  if (!branchId) return <p className="p-8 text-center text-sm text-muted-foreground">Memuat cabang...</p>;
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Buku Besar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Semua transaksi cabang dalam satu tabel SSOT. 6 visual, per-cell edit, multi-row checkbox, Export+Replace CSV.
        </p>
      </header>
      <BukuBesarNotion branchId={branchId} />
    </div>
  );
}
