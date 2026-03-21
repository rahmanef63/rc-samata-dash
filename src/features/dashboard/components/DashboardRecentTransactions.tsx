import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TransactionRow } from "@/shared/components";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { recentTransactions, itemVariants } from "../lib";
import type { Transaction } from "../types";

export function DashboardRecentTransactions() {
  const router = useRouter();
  const [selected, setSelected] = useState<Transaction | null>(null);

  return (
    <>
      <motion.div variants={itemVariants} className="lg:col-span-2 bg-card rounded-xl shadow-card p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Recent Transactions</h2>
          <button onClick={() => router.push("/finance")} className="text-xs text-primary font-medium hover:underline">View All</button>
        </div>
        <div className="space-y-3">
          {recentTransactions.map((tx) => (
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
                <span className="text-muted-foreground">Outlet</span>
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
                <span className="text-muted-foreground">Waktu</span>
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
