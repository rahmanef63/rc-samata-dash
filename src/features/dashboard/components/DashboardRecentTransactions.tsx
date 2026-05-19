"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { FileText, ArrowUpRight } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { TransactionRow } from "@/shared/components";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { itemVariants } from "@/shared/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBranchScope } from "../context/BranchScopeContext";
import { useDateScope } from "../context/DateScopeContext";
import { useFilteredByDate } from "@/shared/hooks";
import { formatRpFull } from "@/shared/lib";

type TransactionItem = {
  id: string;
  name: string;
  type: string;
  amount: string;
  rawAmount?: number;
  time: string;
  status: string;
  direction: "in" | "out";
  reportId?: string;
  sourceFile?: string;
  sourceSheet?: string;
};

export function DashboardRecentTransactions() {
  const router = useRouter();
  const [selected, setSelected] = useState<TransactionItem | null>(null);

  const { branchId: scopeBranchId, branches } = useBranchScope();
  const { setGranularity, rangeLabel } = useDateScope();
  const branchId = scopeBranchId ?? branches?.[0]?._id;
  const rawTransactions = useQuery(
    api.features.reports.dashboardQueries.getRecentTransactions,
    branchId ? { branchId } : "skip",
  );
  const transactions = useFilteredByDate(rawTransactions, "time");

  if (!rawTransactions) {
    return (
      <motion.div variants={itemVariants} className="bg-card rounded-xl shadow-card p-4 md:p-5">
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div variants={itemVariants} className="bg-card rounded-xl shadow-card p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Transaksi Terbaru</h2>
          <button onClick={() => router.push("/finance")} className="text-xs text-primary font-medium hover:underline">Lihat Semua</button>
        </div>
        {transactions.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <FileText className="h-6 w-6 mx-auto text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {rawTransactions.length === 0
                ? "Belum ada transaksi pada cabang ini."
                : `Tidak ada transaksi pada periode ${rangeLabel}.`}
            </p>
            {rawTransactions.length > 0 && (
              <button
                onClick={() => setGranularity("month")}
                className="text-xs text-primary font-medium hover:underline"
              >
                Lihat seluruh bulan →
              </button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[320px] pr-3">
            <div className="space-y-1.5">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="cursor-pointer rounded-lg hover:bg-muted/40 -mx-2 px-2 py-1 transition-colors"
                  onClick={() => setSelected(tx)}
                >
                  <TransactionRow
                    title={tx.name}
                    subtitle={tx.type}
                    amount={tx.amount}
                    direction={tx.direction}
                    rightLabel={tx.time}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </motion.div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
            <DialogDescription>{selected?.id}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nama</span>
                <span className="font-medium">{selected.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tipe</span>
                <span>{selected.type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Jumlah</span>
                <span className="font-mono-data font-semibold">
                  {typeof selected.rawAmount === "number"
                    ? `${selected.direction === "in" ? "+" : "-"}${formatRpFull(Math.abs(selected.rawAmount))}`
                    : selected.amount}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tanggal</span>
                <span>{selected.time}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={selected.status} />
              </div>
              {selected.sourceFile && (
                <div className="flex justify-between text-sm items-start gap-3 pt-2 border-t">
                  <span className="text-muted-foreground shrink-0">Sumber</span>
                  <div className="text-right min-w-0">
                    <p className="font-mono text-xs truncate" title={selected.sourceFile}>
                      {selected.sourceFile}
                    </p>
                    {selected.sourceSheet && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        sheet: {selected.sourceSheet}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {selected.reportId && (
                <Link
                  href={`/laporan/${selected.reportId}`}
                  onClick={() => setSelected(null)}
                  className="flex items-center justify-center gap-1.5 text-xs text-primary font-medium hover:underline pt-1"
                >
                  Buka laporan sumber <ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
