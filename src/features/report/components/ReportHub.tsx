"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  FileText,
  Calendar,
  TrendingUp,
  TrendingDown,
  Search,
  PieChart,
  Gauge,
  ListChecks,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChartCard,
  SectionHeader,
} from "@/shared/components";
import { formatRp } from "../lib";
import { formatDateRange, formatShortDate } from "@/shared/lib";
import { useUserRole } from "@/features/auth/useUserRole";

const STATUS_LABEL: Record<string, string> = {
  processed: "Diproses",
  uploaded: "Diunggah",
  error: "Gagal",
};

const STATUS_BADGE: Record<string, string> = {
  processed:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  uploaded:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  error:
    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

/**
 * Owner-friendly hub: every weekly report at a glance, plus quick links
 * into the deep analytics tabs. No upload / data-entry surface.
 */
export default function ReportHub() {
  const router = useRouter();
  const isOwner = useUserRole() === "owner";

  // Single-cabang app — auto-pick the only branch, no selector.
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branch = branches?.[0] ?? null;
  const branchId = branch?._id ?? null;

  const reports = useQuery(
    api.features.reports.queries.listWeeklyReports,
    branchId ? { branchId } : "skip",
  );
  const monthlySales = useQuery(
    api.features.reports.dashboardQueries.getMonthlySalesTrend,
    branchId ? { branchId } : "skip",
  );

  const [search, setSearch] = useState("");

  const isLoading =
    !branches || (branchId && (!reports || !monthlySales));

  const filteredReports = useMemo(() => {
    if (!reports) return [];
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(
      (r) =>
        r.fileName?.toLowerCase().includes(q) ||
        r.periodStart?.toLowerCase().includes(q) ||
        r.periodEnd?.toLowerCase().includes(q),
    );
  }, [reports, search]);

  const totalRevenue = useMemo(
    () => monthlySales?.reduce((s, d) => s + d.value, 0) ?? 0,
    [monthlySales],
  );
  const lastReport = reports?.[0];
  const periodLabel =
    monthlySales && monthlySales.length > 0
      ? formatDateRange(
          monthlySales[0].date,
          monthlySales[monthlySales.length - 1].date,
        )
      : "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto"
    >
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Semua Laporan</h1>
        <p className="text-sm text-muted-foreground">
          {branch?.name ?? "Cabang"}
          {branch?.location ? ` · ${branch.location}` : ""}
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          label="Total Pendapatan (30 hari)"
          value={isLoading ? null : formatRp(totalRevenue)}
          hint={periodLabel}
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
        />
        <KpiTile
          label="Jumlah Laporan"
          value={isLoading ? null : `${reports?.length ?? 0}`}
          hint={lastReport ? `Terakhir: ${formatShortDate(lastReport.periodEnd)}` : "—"}
          icon={<FileText className="h-4 w-4 text-primary" />}
        />
        <KpiTile
          label="Status Terakhir"
          value={
            isLoading
              ? null
              : lastReport
                ? STATUS_LABEL[lastReport.status] ?? lastReport.status
                : "—"
          }
          hint={
            lastReport
              ? formatDateRange(lastReport.periodStart, lastReport.periodEnd)
              : "Belum ada laporan"
          }
          icon={<Gauge className="h-4 w-4 text-primary" />}
        />
        <KpiTile
          label="Total Penjualan (data)"
          value={
            isLoading
              ? null
              : `${reports?.reduce((s, r) => s + (r.salesCount ?? 0), 0) ?? 0}`
          }
          hint="Akumulasi dari semua laporan"
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
        />
      </div>

      {/* Sales trend mini-chart */}
      {monthlySales && monthlySales.length > 0 && (
        <AreaChartCard
          data={monthlySales.map((entry) => ({
            ...entry,
            label: formatShortDate(entry.date),
          }))}
          title="Tren Pendapatan"
          subtitle={periodLabel}
          height={180}
          gradientId="hubGrad"
          tooltipLabel="Pendapatan"
          fitRange
        />
      )}

      {/* Quick navigation tiles */}
      <div>
        <SectionHeader title="Buka Analisis" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <NavTile
            icon={<PieChart className="h-5 w-5" />}
            title="Ikhtisar"
            subtitle="Ringkasan keuangan"
            onClick={() => router.push("/laporan/analisis")}
          />
          <NavTile
            icon={<Gauge className="h-5 w-5" />}
            title="KPI"
            subtitle="Target vs aktual"
            onClick={() => router.push("/laporan/analisis?tab=kpi")}
          />
          <NavTile
            icon={<TrendingUp className="h-5 w-5" />}
            title="Profitabilitas"
            subtitle="Margin produk"
            onClick={() => router.push("/laporan/analisis?tab=profit")}
          />
          <NavTile
            icon={<TrendingDown className="h-5 w-5" />}
            title="Arus Kas"
            subtitle="Pemasukan vs pengeluaran"
            onClick={() => router.push("/laporan/analisis?tab=cashflow")}
          />
        </div>
      </div>

      {/* Reports list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionHeader title="Daftar Laporan Mingguan" />
          <div className="relative w-56">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari laporan…"
              className="pl-8 h-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-card rounded-xl shadow-card p-8 text-center space-y-3">
            <ListChecks className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              {reports && reports.length === 0
                ? isOwner
                  ? "Belum ada laporan tersedia untuk cabang ini."
                  : "Belum ada laporan diunggah."
                : "Tidak ada laporan cocok dengan pencarian."}
            </p>
            {!isOwner && reports && reports.length === 0 && (
              <Button
                onClick={() => router.push("/laporan/upload")}
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" /> Upload Laporan
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReports.map((r) => (
              <button
                key={r._id}
                type="button"
                onClick={() =>
                  router.push(`/laporan/analisis?report=${r._id}`)
                }
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {r.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {formatDateRange(r.periodStart, r.periodEnd)}
                    <span className="opacity-50">·</span>
                    {r.salesCount ?? 0} penjualan
                    <span className="opacity-50">·</span>
                    {r.expenseCount ?? 0} pengeluaran
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    STATUS_BADGE[r.status] ?? STATUS_BADGE.uploaded
                  }`}
                >
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function KpiTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | null;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl shadow-card p-4 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon}
      </div>
      {value === null ? (
        <Skeleton className="h-6 w-24" />
      ) : (
        <p className="text-base font-bold font-mono-data tracking-tight">
          {value}
        </p>
      )}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function NavTile({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-card rounded-xl shadow-card p-4 hover:shadow-card-hover transition-all border border-transparent hover:border-primary/30"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
        {icon}
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </button>
  );
}
