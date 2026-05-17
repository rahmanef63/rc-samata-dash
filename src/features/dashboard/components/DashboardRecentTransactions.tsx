"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { TransactionRow } from "@/shared/components";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { itemVariants } from "@/shared/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranchScope } from "../context/BranchScopeContext";

type TransactionItem = {
  id: string;
  name: string;
  type: string;
  amount: string;
  time: string;
  status: string;
  direction: "in" | "out";
};

export function DashboardRecentTransactions() {
  const router = useRouter();
  const [selected, setSelected] = useState<TransactionItem | null>(null);

  const { branchId: scopeBranchId, branches } = useBranchScope();
  const branchId = scopeBranchId ?? branches?.[0]?._id;
  const transactions = useQuery(
    api.features.reports.dashboardQueries.getRecentTransactions,
    branchId ? { branchId } : "skip",
  );

  if (!transactions) {
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
          <p className="text-sm text-muted-foreground py-4 text-center">Belum ada transaksi.</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="cursor-pointer" onClick={() => setSelected(tx)}>
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
                <span className="font-mono-data font-semibold">{selected.amount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tanggal</span>
                <span>{selected.time}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={selected.status} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
