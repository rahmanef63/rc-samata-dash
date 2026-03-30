"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionHeader } from "@/shared/components";
import { formatLongDate } from "@/shared/lib";
import { amountColorClass } from "@/shared/lib";
import { itemVariants } from "@/shared/constants";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function DashboardTransactionLog() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  const transactions = useQuery(
    api.features.reports.dashboardQueries.getRecentTransactions,
    branchId ? { branchId } : "skip",
  );

  if (!transactions) {
    return (
      <motion.div variants={itemVariants} className="hidden md:block space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </motion.div>
    );
  }

  if (transactions.length === 0) {
    return (
      <motion.div variants={itemVariants} className="hidden md:block space-y-4">
        <SectionHeader title="Log Transaksi Detail" />
        <div className="bg-card rounded-xl shadow-card p-8 text-center text-muted-foreground text-sm">
          Belum ada transaksi. Upload laporan mingguan untuk melihat data.
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants} className="hidden md:block space-y-4">
      <SectionHeader title="Log Transaksi Detail" />
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="label-uppercase">ID</TableHead>
                <TableHead className="label-uppercase">Nama</TableHead>
                <TableHead className="label-uppercase">Kategori</TableHead>
                <TableHead className="label-uppercase text-right">Jumlah</TableHead>
                <TableHead className="label-uppercase">Tanggal</TableHead>
                <TableHead className="label-uppercase text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono-data text-xs">{tx.id}</TableCell>
                  <TableCell>{tx.name}</TableCell>
                  <TableCell className="text-muted-foreground">{tx.type}</TableCell>
                  <TableCell className={`text-right font-mono-data ${amountColorClass(tx.amount)}`}>{tx.amount}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formatLongDate(tx.time)}</TableCell>
                  <TableCell className="text-right"><StatusBadge status={tx.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </motion.div>
  );
}
