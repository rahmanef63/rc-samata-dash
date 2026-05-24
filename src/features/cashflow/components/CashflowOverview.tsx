"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, ArrowDownRight, ArrowUpRight, Receipt } from "lucide-react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRpFull } from "@/shared/lib";
import { useDateScope } from "@/features/dashboard";

function SectionCard({
  title,
  subtitle,
  tone,
  children,
}: {
  title: string;
  subtitle?: string;
  tone?: "success" | "destructive" | "warning" | "default";
  children: React.ReactNode;
}) {
  const ring =
    tone === "success" ? "ring-success/20"
    : tone === "destructive" ? "ring-destructive/20"
    : tone === "warning" ? "ring-warning/20"
    : "ring-border/40";
  return (
    <div className={`bg-card rounded-xl shadow-card p-4 ring-1 ${ring}`}>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function BreakdownRow({
  label,
  primary,
  secondary,
  meta,
  tone,
}: {
  label: string;
  primary: number;
  secondary?: { label: string; value: number }[];
  meta?: string;
  tone?: "in" | "out";
}) {
  const valueClass = tone === "in" ? "text-success" : tone === "out" ? "text-destructive" : "";
  return (
    <div className="border-b border-border/40 last:border-0 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium truncate">{label}</p>
        <p className={`text-sm font-mono-data font-semibold ${valueClass}`}>
          {formatRpFull(primary)}
        </p>
      </div>
      {(secondary || meta) && (
        <div className="flex items-center justify-between mt-1 gap-3">
          {meta && <p className="text-[11px] text-muted-foreground">{meta}</p>}
          {secondary && (
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              {secondary.map((s) => (
                <span key={s.label}>
                  {s.label}: <span className="font-mono-data">{formatRpFull(s.value)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CashflowOverview() {
  const { startDate, endDate, rangeLabel } = useDateScope();
  const args = { startDate, endDate };

  const income = useQuery(api.features.reports.dashboardQueries.getIncomeByChannel, args);
  const expense = useQuery(api.features.reports.dashboardQueries.getExpenseByCategory, args);
  const piutang = useQuery(api.features.reports.dashboardQueries.getPiutangPaymentsByVendor, args);
  const pockets = useQuery(api.features.pockets.queries.getPocketBalances, args);

  if (!income || !expense || !piutang || !pockets) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const totalIncome = income.totals.gross;
  // Operational expense excludes piutang-paid line items (those tracked under piutang section).
  const operationalExpense = expense.totals.ownerDirect + expense.totals.pettyCash;
  const piutangPaid = piutang.totals.paidThisPeriod;
  const totalOutflow = operationalExpense + piutangPaid;
  const net = totalIncome - totalOutflow;
  const isPositive = net >= 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Hero net card */}
      <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
        <p className="text-xs opacity-80 mb-1">Arus Kas Bersih · {rangeLabel}</p>
        <p className="text-3xl font-bold font-mono-data tracking-tight">{formatRpFull(net)}</p>
        <div className="flex items-center gap-4 mt-2">
          <p className="text-xs flex items-center gap-1 opacity-80">
            <Wallet className="h-3 w-3" /> Masuk: {formatRpFull(totalIncome)}
          </p>
          <p className="text-xs flex items-center gap-1 opacity-80">
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            Keluar: {formatRpFull(totalOutflow)}
          </p>
        </div>
      </div>

      {/* Summary triplets */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl shadow-card p-3 ring-1 ring-success/20">
          <p className="text-[10px] uppercase text-muted-foreground font-medium flex items-center gap-1">
            <ArrowDownRight className="h-3 w-3 text-success" /> Pendapatan
          </p>
          <p className="text-sm font-bold font-mono-data text-success mt-1">{formatRpFull(totalIncome)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {income.rows.length} channel · {income.totals.txCount} tx
          </p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-3 ring-1 ring-destructive/20">
          <p className="text-[10px] uppercase text-muted-foreground font-medium flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3 text-destructive" /> Operasional
          </p>
          <p className="text-sm font-bold font-mono-data text-destructive mt-1">{formatRpFull(operationalExpense)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            cash/owner · {expense.totals.txCount} tx
          </p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-3 ring-1 ring-warning/20">
          <p className="text-[10px] uppercase text-muted-foreground font-medium flex items-center gap-1">
            <Receipt className="h-3 w-3 text-warning" /> Bayar Piutang
          </p>
          <p className="text-sm font-bold font-mono-data text-warning mt-1">{formatRpFull(piutangPaid)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {piutang.rows.length} vendor · {piutang.totals.paymentCount} pmt
          </p>
        </div>
      </div>

      {/* Outstanding alert if open payables exceed paid */}
      {piutang.totals.outstandingNow > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-2 text-xs flex items-center justify-between">
          <span>Total outstanding piutang vendor:</span>
          <span className="font-mono-data font-semibold text-warning-foreground">{formatRpFull(piutang.totals.outstandingNow)}</span>
        </div>
      )}

      {/* Income per channel */}
      <SectionCard
        title="Pendapatan per Channel"
        subtitle={`Gross ${formatRpFull(totalIncome)} · Net ${formatRpFull(income.totals.net)}`}
        tone="success"
      >
        {income.rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Belum ada penjualan di periode ini.</p>
        ) : (
          <div className="-mb-2">
            {income.rows.map((r) => (
              <BreakdownRow
                key={r.channelId}
                label={r.channelName}
                primary={r.gross}
                tone="in"
                meta={`${r.txCount} tx · Net ${formatRpFull(r.net)}`}
                secondary={[
                  { label: "Cash", value: r.cashReceived },
                  { label: "Fee", value: r.platformFee },
                  { label: "Promo", value: r.promoCost },
                ]}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Expense per category (operational — excludes piutang) */}
      <SectionCard
        title="Pengeluaran Operasional per Kategori"
        subtitle={`Owner+Petty ${formatRpFull(operationalExpense)}`}
        tone="destructive"
      >
        {expense.rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Belum ada pengeluaran di periode ini.</p>
        ) : (
          <div className="-mb-2">
            {expense.rows
              .filter((r) => r.ownerDirect + r.pettyCash > 0)
              .map((r) => (
                <BreakdownRow
                  key={r.categoryId}
                  label={r.categoryName}
                  primary={r.ownerDirect + r.pettyCash}
                  tone="out"
                  meta={`${r.txCount} tx`}
                  secondary={[
                    { label: "Owner", value: r.ownerDirect },
                    { label: "Petty", value: r.pettyCash },
                  ]}
                />
              ))}
          </div>
        )}
      </SectionCard>

      {/* Arus per Pocket — cash trail */}
      <SectionCard
        title="Arus per Pocket"
        subtitle={`Net ${formatRpFull(pockets.totals.net)} · ${pockets.totals.txCount} tx`}
      >
        {pockets.rows.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            Belum ada pocket terdaftar.{" "}
            <Link href="/finance/pockets" className="text-primary underline">
              Setup pocket
            </Link>{" "}
            untuk tracking arus per brankas / dompet / rekening.
          </div>
        ) : (
          <div className="-mb-2">
            {pockets.rows.map((r) => (
              <BreakdownRow
                key={r.pocketId ?? "untagged"}
                label={r.pocketName + (r.bankAccount ? ` · ${r.bankAccount}` : "")}
                primary={r.net}
                tone={r.net >= 0 ? "in" : "out"}
                meta={`${r.txCount} tx · ${r.pocketKind}${!r.pocketId ? " · ⚠ perlu di-tag" : ""}`}
                secondary={[
                  { label: "↓ Masuk", value: r.inflow },
                  { label: "↑ Keluar", value: r.outflow },
                ]}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Piutang payments per vendor */}
      <SectionCard
        title="Pembayaran Piutang (PI) per Vendor"
        subtitle={`Outstanding ${formatRpFull(piutang.totals.outstandingNow)}`}
        tone="warning"
      >
        {piutang.rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Tidak ada pembayaran piutang di periode ini.
          </p>
        ) : (
          <div className="-mb-2">
            {piutang.rows.map((r) => (
              <BreakdownRow
                key={r.vendorId}
                label={r.vendorName}
                primary={r.paidThisPeriod}
                tone="out"
                meta={`${r.paymentCount} pmt · ${r.openPayableCount} invoice open`}
                secondary={[
                  { label: "Sisa", value: r.outstandingNow },
                ]}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </motion.div>
  );
}
