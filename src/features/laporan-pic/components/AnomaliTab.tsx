"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useAnomalyReceipts } from "../api";
import { formatRpFull } from "@/shared/lib";
import { cn } from "@/lib/utils";

const ANOMALY_LABEL: Record<string, string> = {
  mislabel: "Salah Label",
  duplicate: "Duplikat",
  not_transfer: "Bukan Transfer",
  partial: "Pembayaran Sebagian",
};

const ANOMALY_CLS: Record<string, string> = {
  mislabel: "bg-yellow-100 text-yellow-700",
  duplicate: "bg-blue-100 text-blue-700",
  not_transfer: "bg-red-100 text-red-700",
  partial: "bg-orange-100 text-orange-700",
};

export function AnomaliTab() {
  const list = useAnomalyReceipts();

  const grouped = useMemo(() => {
    const map: Record<string, typeof list extends (infer T)[] | undefined ? T[] : never> =
      { mislabel: [], duplicate: [], not_transfer: [], partial: [] } as never;
    for (const r of list ?? []) {
      const flag = r.anomalyFlag ?? "ok";
      if (flag === "ok") continue;
      (map[flag] as Array<typeof r>).push(r);
    }
    return map;
  }, [list]);

  if (!list) {
    return <p className="px-6 py-8 text-xs text-center text-muted-foreground">Memuat anomali...</p>;
  }
  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Tidak ada anomali tercatat. Bagus — laporan PIC bersih.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(["mislabel", "duplicate", "not_transfer", "partial"] as const).map((k) => (
          <div key={k} className={cn("rounded-lg border border-border bg-card p-3", grouped[k].length === 0 && "opacity-50")}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{ANOMALY_LABEL[k]}</p>
            <p className="text-xl font-bold mt-0.5">{grouped[k].length}</p>
          </div>
        ))}
      </div>

      {(["not_transfer", "duplicate", "mislabel", "partial"] as const).map((k) => {
        const rows = grouped[k];
        if (rows.length === 0) return null;
        return (
          <section key={k} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className={cn("px-2 py-0.5 rounded font-bold uppercase", ANOMALY_CLS[k])}>{ANOMALY_LABEL[k]}</span>
              </h3>
              <span className="text-[10px] text-muted-foreground font-mono">{rows.length} row</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-semibold text-muted-foreground">Tanggal</th>
                    <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Nominal</th>
                    <th className="px-3 py-2 font-semibold text-muted-foreground">Catatan</th>
                    <th className="px-3 py-2 font-semibold text-muted-foreground">Ref</th>
                    <th className="px-3 py-2 font-semibold text-muted-foreground">File</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r._id} className="border-t border-border/40 hover:bg-muted/20">
                      <td className="px-3 py-1.5 font-mono">{r.paidDate}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{formatRpFull(r.amount)}</td>
                      <td className="px-3 py-1.5 truncate max-w-[280px]" title={r.notes ?? ""}>{r.notes ?? "—"}</td>
                      <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground truncate max-w-[140px]" title={r.reference ?? ""}>{r.reference ?? "—"}</td>
                      <td className="px-3 py-1.5 text-[10px] text-muted-foreground truncate max-w-[200px]" title={r.proofFileName ?? ""}>{r.proofFileName ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
