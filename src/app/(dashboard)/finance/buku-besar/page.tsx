"use client";

import dynamic from "next/dynamic";
import { BookOpen, Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components";

const BukuBesarNotion = dynamic(
  () => import("@/features/buku-besar/components/BukuBesarNotion").then((m) => ({ default: m.BukuBesarNotion })),
  { ssr: false, loading: () => <p className="px-8 py-12 text-sm text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Memuat Buku Besar...</p> },
);

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={BookOpen}
        title="Buku Besar"
        description="Semua transaksi cabang dalam satu tabel SSOT — 6 visual, per-cell edit, multi-row checkbox, Export + Replace CSV."
      />
      <BukuBesarNotion />
    </div>
  );
}
