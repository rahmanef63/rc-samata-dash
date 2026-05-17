"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { FileText } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionHeader } from "@/shared/components";
import { formatLongDate, formatRpFull } from "@/shared/lib";
import { amountColorClass } from "@/shared/lib";
import { itemVariants } from "@/shared/constants";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useUserRole } from "@/features/auth/useUserRole";
import { useBranchScope } from "../context/BranchScopeContext";
import { useDateScope } from "../context/DateScopeContext";
import { useFilteredByDate } from "@/shared/hooks";

export function DashboardTransactionLog() {
  const router = useRouter();
  const isOwner = useUserRole() === "owner";
  const { branchId: scopeBranchId, branches } = useBranchScope();
  const { rangeLabel, setGranularity } = useDateScope();
  const branchId = scopeBranchId ?? branches?.[0]?._id;
  const rawTransactions = useQuery(
    api.features.reports.dashboardQueries.getRecentTransactions,
    branchId ? { branchId } : "skip",
  );
  const transactions = useFilteredByDate(rawTransactions, "time");

  if (!rawTransactions) {
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
        <div className="bg-card rounded-xl shadow-card p-8 text-center space-y-2">
          <FileText className="h-6 w-6 mx-auto text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            {rawTransactions.length === 0
              ? isOwner
                ? "Belum ada transaksi pada cabang ini."
                : "Belum ada transaksi. Upload laporan mingguan untuk melihat data."
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
                <TableHead className="label-uppercase">Sumber</TableHead>
                <TableHead className="label-uppercase text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const signedFull = typeof tx.rawAmount === "number"
                  ? `${tx.direction === "in" ? "+" : "-"}${formatRpFull(Math.abs(tx.rawAmount))}`
                  : tx.amount;
                return (
                  <TableRow
                    key={tx.id}
                    className={tx.reportId ? "cursor-pointer hover:bg-muted/40" : ""}
                    onClick={() => tx.reportId && router.push(`/laporan/${tx.reportId}`)}
                    title={tx.reportId ? "Buka laporan sumber" : undefined}
                  >
                    <TableCell className="font-mono-data text-xs">{tx.id}</TableCell>
                    <TableCell>{tx.name}</TableCell>
                    <TableCell className="text-muted-foreground">{tx.type}</TableCell>
                    <TableCell className={`text-right font-mono-data ${amountColorClass(tx.amount)}`}>{signedFull}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatLongDate(tx.time)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]" title={tx.sourceFile}>
                      {tx.sourceFile ?? "—"}
                    </TableCell>
                    <TableCell className="text-right"><StatusBadge status={tx.status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </motion.div>
  );
}
