"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useConvex, useMutation } from "convex/react";
import { toast } from "sonner";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useFilteredByDate } from "@/shared/hooks";
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
  Download,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { downloadReportAsXlsx } from "../lib/exportReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChartCard,
  SectionHeader,
} from "@/shared/components";
import { formatRpFull } from "@/shared/lib";
import { formatDateRange, formatShortDate } from "@/shared/lib";
import { useUserRole } from "@/features/auth/useUserRole";
import { ReportButton, ReportPrintHeader, ReportPrintFooter } from "@/features/report-pdf";

const STATUS_LABEL: Record<string, string> = {
  processed: "Diproses",
  uploaded: "Diunggah",
  error: "Gagal",
};

const STATUS_BADGE: Record<string, string> = {
  processed: "bg-success/10 text-success border border-success/20",
  uploaded:  "bg-warning/10 text-warning border border-warning/20",
  error:     "bg-destructive/10 text-destructive border border-destructive/20",
};

/**
 * Owner-friendly hub: every weekly report at a glance, plus quick links
 * into the deep analytics tabs. No upload / data-entry surface.
 */
export default function ReportHub() {
  const router = useRouter();
  const convex = useConvex();
  const role = useUserRole();
  const isOwner = role === "owner";
  const canDelete = role === "super_admin";
  const deleteReport = useMutation(api.features.reports.mutations.deleteWeeklyReport);
  const [pendingDelete, setPendingDelete] = useState<
    { id: Id<"weeklyReports">; fileName: string } | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await deleteReport({ reportId: pendingDelete.id });
      const counts = res as { stagingDeleted?: number; derivedDeleted?: number } | null;
      const staging = counts?.stagingDeleted ?? 0;
      const derived = counts?.derivedDeleted ?? 0;
      toast.success(
        `Laporan dihapus · ${staging} staging + ${derived} CRUD/SSOT rows`,
      );
      setPendingDelete(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus laporan",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleDownload(
    e: React.MouseEvent,
    storageId: string | undefined,
    fileName: string,
  ) {
    e.stopPropagation();
    if (!storageId) {
      toast.error("File asli tidak tersimpan untuk laporan ini (upload lama sebelum fitur download aktif).");
      return;
    }
    try {
      const url = await convex.query(
        api.features.reports.queries.getReportFileUrl,
        { storageId: storageId as Id<"_storage"> },
      );
      if (!url) throw new Error("URL kosong");
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error("Gagal mengunduh file");
    }
  }

  const [exporting, setExporting] = useState<string | null>(null);

  async function handleExportConverted(e: React.MouseEvent, reportId: string) {
    e.stopPropagation();
    setExporting(reportId);
    try {
      const data = await convex.query(
        api.features.reports.queries.getReportExport,
        { reportId: reportId as Id<"weeklyReports"> },
      );
      if (!data) {
        toast.error("Laporan tidak ditemukan");
        return;
      }
      downloadReportAsXlsx(data);
      toast.success("Export selesai");
    } catch {
      toast.error("Gagal export data");
    } finally {
      setExporting(null);
    }
  }

  const rawReports = useQuery(api.features.reports.queries.listWeeklyReports, {});
  const rawMonthlySales = useQuery(api.features.reports.dashboardQueries.getMonthlySalesTrend, {});
  const reports = useFilteredByDate(rawReports, "periodStart");
  const monthlySales = useFilteredByDate(rawMonthlySales, "date");

  const [search, setSearch] = useState("");

  const isLoading = !rawReports || !rawMonthlySales;

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
    () => monthlySales.reduce((s, d) => s + d.value, 0),
    [monthlySales],
  );
  const lastReport = reports?.[0];
  const periodLabel =
    monthlySales.length > 0
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
      <div className="flex items-start justify-between gap-3" data-print="hide">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Semua Laporan</h1>
          <p className="text-sm text-muted-foreground">
            Semua laporan mingguan yang sudah di-upload
          </p>
        </div>
        <ReportButton />
      </div>

      <ReportPrintHeader title="Daftar Laporan Mingguan" />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          label="Total Pendapatan (30 hari)"
          value={isLoading ? null : formatRpFull(totalRevenue)}
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
            onClick={() => router.push("/")}
          />
          <NavTile
            icon={<Gauge className="h-5 w-5" />}
            title="KPI"
            subtitle="Target vs aktual"
            onClick={() => router.push("/")}
          />
          <NavTile
            icon={<TrendingUp className="h-5 w-5" />}
            title="Profitabilitas"
            subtitle="Margin produk"
            onClick={() => router.push("/")}
          />
          <NavTile
            icon={<TrendingDown className="h-5 w-5" />}
            title="Arus Kas"
            subtitle="Pemasukan vs pengeluaran"
            onClick={() => router.push("/")}
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
                onClick={() => router.push("/upload")}
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" /> Upload Laporan
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReports.map((r) => (
              <div
                key={r._id}
                onClick={() => router.push(`/laporan/${r._id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors text-left cursor-pointer"
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 shrink-0"
                  onClick={(e) => handleExportConverted(e, r._id)}
                  title="Export data hasil parse RCS (multi-sheet xlsx) — untuk compare dengan xlsx asli"
                  disabled={exporting === r._id}
                >
                  {exporting === r._id ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 shrink-0"
                  onClick={(e) => handleDownload(e, r.fileStorageId, r.fileName)}
                  title={r.fileStorageId ? "Unduh xlsx asli" : "File asli tidak tersimpan (upload lama)"}
                  disabled={!r.fileStorageId}
                >
                  <Download className="h-4 w-4" />
                </Button>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete({ id: r._id, fileName: r.fileName });
                    }}
                    title="Hapus laporan + semua data turunan (staging, dailySales, payables, expenses, transactions)"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    STATUS_BADGE[r.status] ?? STATUS_BADGE.uploaded
                  }`}
                >
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus laporan ini?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium text-foreground">
                    {pendingDelete?.fileName}
                  </span>{" "}
                  akan dihapus permanen, termasuk:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>File xlsx asli</li>
                  <li>14 staging tables (productSales, vendorPurchases, dst)</li>
                  <li>Penjualan harian (dailySales)</li>
                  <li>Closing harian (dailyClosings)</li>
                  <li>Piutang vendor dari report ini (payables)</li>
                  <li>Expenses dari LPKK + kas kecil report ini</li>
                  <li>Entry buku besar (transactions)</li>
                </ul>
                <p className="text-destructive font-medium">
                  Aksi ini tidak bisa di-undo. Data inventaris (stockItems) tidak ikut terhapus — running totals, jalankan re-bridge untuk refresh.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Menghapus..." : "Hapus laporan + semua data turunan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportPrintFooter title="Daftar Laporan Mingguan" />
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
