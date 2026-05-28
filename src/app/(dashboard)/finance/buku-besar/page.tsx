"use client";

import dynamic from "next/dynamic";
import { BookOpen, Loader2 } from "lucide-react";
import { ReportPage } from "@/features/report-pdf";

const BukuBesarNotion = dynamic(
  () => import("@/features/buku-besar/components/BukuBesarNotion").then((m) => ({ default: m.BukuBesarNotion })),
  { ssr: false, loading: () => <p className="px-8 py-12 text-sm text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Memuat Buku Besar...</p> },
);

export default function Page() {
  return (
    <ReportPage
      icon={BookOpen}
      title="Buku Besar"
      description="Semua transaksi cabang dalam satu tabel SSOT — 6 visual, per-cell edit, multi-row checkbox, Export + Replace CSV."
      reportTitle="Buku Besar — Semua Transaksi"
      printHint="Cetak PDF — pilih visual 'Tabel' dulu untuk hasil terbaik"
    >
      <BukuBesarNotion />
    </ReportPage>
  );
}
