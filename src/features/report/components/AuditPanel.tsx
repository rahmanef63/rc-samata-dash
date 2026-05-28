"use client";

import { useQuery } from "convex/react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Import-integrity panel for a weekly report: compares rows the xlsx parser
// pulled (Parsed) vs rows now in the staging tables (Actual). Self-contained
// leaf — takes only reportId, owns its own query.
export function AuditPanel({ reportId }: { reportId: Id<"weeklyReports"> }) {
  const audit = useQuery(api.features.reports.queries.getReportAuditCounts, { reportId });
  if (audit === undefined) {
    return (
      <Card className="p-4 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }
  if (audit === null) {
    return <Card className="p-4 text-sm">Report tidak ditemukan.</Card>;
  }
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        {audit.allClean ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <h3 className="text-sm font-semibold">
            {audit.allClean ? "Data ter-record lengkap" : "Ada selisih antara Excel vs DB"}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            Bandingkan jumlah row yang Excel-parser tarik dari file (kolom <b>Parsed</b>)
            vs jumlah row yang sekarang ada di staging tables DB (kolom <b>Actual</b>).
            Kalau <b>Diff = 0</b> berarti integritas data utuh — tidak ada yang hilang
            atau ke-duplikat.
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            File: <span className="font-mono">{audit.fileName ?? "—"}</span> · Periode{" "}
            {audit.periodStart} → {audit.periodEnd}
          </p>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Kategori</th>
              <th className="px-3 py-2 font-medium text-right">Parsed (Excel)</th>
              <th className="px-3 py-2 font-medium text-right">Actual (DB)</th>
              <th className="px-3 py-2 font-medium text-right">Diff</th>
              <th className="px-3 py-2 font-medium text-center w-16">Status</th>
            </tr>
          </thead>
          <tbody>
            {audit.rows.map((r) => (
              <tr key={r.key} className="border-t">
                <td className="px-3 py-2">{r.label}</td>
                <td className="px-3 py-2 text-right font-mono">{r.parsed.toLocaleString("id-ID")}</td>
                <td className="px-3 py-2 text-right font-mono">{r.actual.toLocaleString("id-ID")}</td>
                <td className={`px-3 py-2 text-right font-mono ${r.diff === 0 ? "text-muted-foreground" : "text-orange-600 font-semibold"}`}>
                  {r.diff > 0 ? "+" : ""}{r.diff.toLocaleString("id-ID")}
                </td>
                <td className="px-3 py-2 text-center">
                  {r.diff === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 inline" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-600 inline" />
                  )}
                </td>
              </tr>
            ))}
            <tr className="border-t bg-muted/30 font-medium">
              <td className="px-3 py-2">TOTAL</td>
              <td className="px-3 py-2 text-right font-mono">{audit.totalParsed.toLocaleString("id-ID")}</td>
              <td className="px-3 py-2 text-right font-mono">{audit.totalActual.toLocaleString("id-ID")}</td>
              <td className={`px-3 py-2 text-right font-mono ${audit.totalDiff === 0 ? "text-muted-foreground" : "text-orange-600"}`}>
                {audit.totalDiff > 0 ? "+" : ""}{audit.totalDiff.toLocaleString("id-ID")}
              </td>
              <td className="px-3 py-2 text-center">
                {audit.allClean ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 inline" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-600 inline" />
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3 leading-relaxed">
        <p className="font-medium mb-1">Cara baca:</p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li><b>Parsed = Actual</b> → row dari Excel sukses ter-import semua, masih utuh di DB.</li>
          <li><b>Parsed &gt; Actual</b> → ada yang hilang setelah import (delete manual, bridge gagal, dst). Investigasi.</li>
          <li><b>Parsed &lt; Actual</b> → ada duplikat di DB (upload sama 2x atau migrasi). Cek dengan staff.</li>
          <li>Cek tab masing-masing kategori untuk drill-down list transaksi.</li>
        </ul>
      </div>
    </Card>
  );
}
