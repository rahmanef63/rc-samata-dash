"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { BookOpen, LayoutGrid, Table2 } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { BukuBesarPage } from "@/features/buku-besar/components/BukuBesarPage";
import { BukuBesarNotion } from "@/features/buku-besar/components/BukuBesarNotion";
import { cn } from "@/lib/utils";

// Two surfaces side-by-side during the transition:
// - "Notion" view consumes the unified `transactions` table (post-
//   backfill) via NotionDatabase from notion-shell — 6 views + per-
//   cell edit + relations-aware.
// - "Legacy" view consumes the old UNION query (payables + receipts
//   + transfers + closings) so historical rows render until the
//   backfill has run + data validated.

type Mode = "notion" | "legacy";

export default function Page() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  const [mode, setMode] = useState<Mode>("notion");

  if (!branchId) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Memuat cabang...</p>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Buku Besar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Semua transaksi cabang dalam satu tabel SSOT. Notion view: 6 visual (Table / Board / List / Calendar / Gallery / Feed), per-cell edit, multi-row select, Export+Replace via CSV.
        </p>
      </header>

      <div className="inline-flex gap-1 rounded-xl bg-muted p-1">
        <button
          onClick={() => setMode("notion")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5",
            mode === "notion" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Notion View
        </button>
        <button
          onClick={() => setMode("legacy")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5",
            mode === "legacy" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Table2 className="h-3.5 w-3.5" /> Legacy Table
        </button>
      </div>

      {mode === "notion" ? <BukuBesarNotion branchId={branchId} /> : <BukuBesarPage branchId={branchId} />}
    </div>
  );
}
