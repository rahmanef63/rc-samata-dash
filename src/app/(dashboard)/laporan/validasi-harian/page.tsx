"use client";

import { useQuery } from "convex/react";
import { MessageSquareText, History } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { WhatsAppValidator } from "@/features/daily-report-validation/components/WhatsAppValidator";
import { useDailyReportValidations } from "@/features/daily-report-validation/api";
import { cn } from "@/lib/utils";

export default function ValidasiHarianPage() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  const history = useDailyReportValidations(branchId);

  if (!branchId) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Memuat cabang...</p>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquareText className="h-6 w-6 text-primary" />
          Validasi Laporan Harian (WhatsApp)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste teks WhatsApp setoran/sales/transfer online → sistem cocokkan dengan data yang sudah tersimpan dari laporan mingguan + statement bank.
          Tolerance <b>exact match</b> (Rp 0) — semua selisih ditandai mismatch.
        </p>
      </header>

      <WhatsAppValidator branchId={branchId} />

      <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Riwayat Validasi
          </h2>
          <span className="text-[10px] text-muted-foreground font-mono">{history?.length ?? 0} entry</span>
        </div>
        {!history ? (
          <p className="px-6 py-8 text-xs text-center text-muted-foreground">Memuat...</p>
        ) : history.length === 0 ? (
          <p className="px-6 py-8 text-xs text-center text-muted-foreground">Belum ada validasi tersimpan</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold">Waktu</th>
                  <th className="px-3 py-2 font-semibold">Tanggal Data</th>
                  <th className="px-3 py-2 font-semibold">Format</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {history.map((v) => (
                  <tr key={v._id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-3 py-1.5 font-mono text-[10px]">
                      {new Date(v.validatedAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-3 py-1.5 font-mono">{v.businessDate}</td>
                    <td className="px-3 py-1.5 text-[10px] uppercase font-semibold text-muted-foreground">{v.kind}</td>
                    <td className="px-3 py-1.5">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded font-semibold uppercase",
                        v.matchedAll
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
                      )}>
                        {v.matchedAll ? "MATCH" : "MISMATCH"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[260px]" title={v.note ?? ""}>{v.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
