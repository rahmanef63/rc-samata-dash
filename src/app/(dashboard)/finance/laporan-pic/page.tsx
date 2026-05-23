"use client";

import { useState } from "react";
import { ClipboardList, Upload, History, AlertTriangle, GitMerge } from "lucide-react";
import { ImportLaporanPic } from "@/features/laporan-pic/components/ImportLaporanPic";
import { RiwayatTransaksi } from "@/features/laporan-pic/components/RiwayatTransaksi";
import { AnomaliTab } from "@/features/laporan-pic/components/AnomaliTab";
import { MatchingTab } from "@/features/laporan-pic/components/MatchingTab";
import { cn } from "@/lib/utils";

type Tab = "riwayat" | "import" | "anomali" | "matching";

const TABS: { key: Tab; label: string; icon: typeof Upload; desc: string }[] = [
  { key: "riwayat",  label: "Riwayat",  icon: History,        desc: "Semua transaksi PIC (tagihan + bayar + transfer owner)" },
  { key: "import",   label: "Import CSV", icon: Upload,       desc: "Upload format LONG atau PIVOT" },
  { key: "anomali",  label: "Anomali",  icon: AlertTriangle,  desc: "Row flagged mislabel / duplikat / bukan transfer / partial saat import" },
  { key: "matching", label: "Matching", icon: GitMerge,       desc: "Pivot view tagihan ↔ bayar — derivasi dari payables + receipts. Export CSV available." },
];

export default function LaporanPicPage() {
  const [tab, setTab] = useState<Tab>("riwayat");

  const activeTab = TABS.find((t) => t.key === tab)!;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Laporan PIC
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sumber data PIC (counterpart laporan mingguan). Upload CSV dari chat → sistem auto-categorize jadi tagihan piutang / bukti bayar / transfer owner. Cross-validate ke laporan mingguan via Riwayat + Matching.
        </p>
      </header>

      <div className="overflow-x-auto">
        <div className="flex gap-1 rounded-xl bg-muted p-1 min-w-max">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap inline-flex items-center gap-1.5",
                  tab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground italic">{activeTab.desc}</p>

      {tab === "riwayat" && <RiwayatTransaksi />}
      {tab === "import" && <ImportLaporanPic />}
      {tab === "anomali" && <AnomaliTab />}
      {tab === "matching" && <MatchingTab />}
    </div>
  );
}
