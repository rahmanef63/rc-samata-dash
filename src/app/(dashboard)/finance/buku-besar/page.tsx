"use client";

import { useQuery } from "convex/react";
import { BookOpen } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { BukuBesarNotion } from "@/features/buku-besar/components/BukuBesarNotion";

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
          Semua transaksi cabang dalam satu tabel SSOT. 6 visual (Tabel / Board / List / Kalender / Gallery / Feed), per-cell edit, multi-row select via checkbox, Export+Replace via CSV.
        </p>
      </header>
      <BukuBesarNotion branchId={branchId} />
    </div>
  );
}
