import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TrendingUp, Building2, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AreaChartCard, PieChartCard, WaterfallChart, ListCard, SectionHeader, ViewAllButton, ProgressBar } from "@/shared/components";
import { monthlyData, branches, reports, expenseBreakdown, cashflowWaterfallReport } from "../lib";
import { toast } from "sonner";

interface Branch { name: string; transactions: string; amount: string; percentage: number }
interface Report { name: string; date: string; size: string }

export function ReportOverview() {
  const router = useRouter();
  const chartData = monthlyData.map(d => ({ label: d.month, value: d.value }));
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Monthly Revenue - clickable */}
      <div
        className="bg-card rounded-xl shadow-card p-5 cursor-pointer hover:shadow-card-hover transition-shadow"
        onClick={() => router.push("/finance")}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-muted-foreground">Monthly Revenue</p>
          <span className="text-xs text-primary font-medium">Detail →</span>
        </div>
        <p className="text-2xl font-bold font-mono-data tracking-tight">Rp 450.000.000</p>
        <p className="text-xs text-success flex items-center gap-1 mt-1">
          <TrendingUp className="h-3 w-3" /> +12.5% vs last month
        </p>
      </div>

      <AreaChartCard data={chartData} title="Revenue Trend" height={192} gradientId="repGrad" tooltipLabel="Revenue" />

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="cursor-pointer" onClick={() => router.push("/expenses")}>
          <PieChartCard data={expenseBreakdown} title="Expense Breakdown" subtitle="Total 6 bulan" height={200} />
        </div>
        <div className="cursor-pointer" onClick={() => router.push("/closing")}>
          <WaterfallChart data={cashflowWaterfallReport} title="Cashflow Waterfall" subtitle="Aliran kas 6 bulan" height={200} />
        </div>
      </div>

      {/* Branch Performance */}
      <SectionHeader title="Branch Performance" />
      <div className="space-y-3">
        {branches.map((b) => (
          <ListCard
            key={b.name}
            icon={<Building2 className="h-4 w-4 text-primary" />}
            title={b.name}
            subtitle={b.transactions}
            onClick={() => setSelectedBranch(b)}
            right={
              <div className="text-right">
                <p className="text-sm font-mono-data font-semibold text-primary">{b.amount}</p>
                <ProgressBar percentage={b.percentage} className="w-20 mt-1" />
              </div>
            }
          />
        ))}
      </div>

      {/* Download Reports */}
      <SectionHeader title="Download Reports" action={<ViewAllButton />} />
      <div className="space-y-3">
        {reports.map((r) => (
          <ListCard
            key={r.name}
            icon={<FileText className="h-4 w-4 text-destructive" />}
            title={r.name}
            subtitle={`Generated: ${r.date} · ${r.size}`}
            onClick={() => setSelectedReport(r)}
            right={
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); toast.success(`Downloading ${r.name}...`); }}>
                <Download className="h-4 w-4 text-muted-foreground" />
              </Button>
            }
          />
        ))}
      </div>

      {/* Branch Detail Dialog */}
      <Dialog open={!!selectedBranch} onOpenChange={(v) => !v && setSelectedBranch(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedBranch?.name}</DialogTitle>
            <DialogDescription>Branch Performance Detail</DialogDescription>
          </DialogHeader>
          {selectedBranch && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Transaksi</span>
                <span className="font-medium">{selectedBranch.transactions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-mono-data font-semibold text-primary">{selectedBranch.amount}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Target</span>
                <ProgressBar percentage={selectedBranch.percentage} className="w-32" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(v) => !v && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedReport?.name}</DialogTitle>
            <DialogDescription>Report Detail</DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Generated</span>
                <span>{selectedReport.date}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">File Size</span>
                <span>{selectedReport.size}</span>
              </div>
              <Button className="w-full mt-2" onClick={() => { toast.success(`Downloading ${selectedReport.name}...`); setSelectedReport(null); }}>
                <Download className="h-4 w-4 mr-2" /> Download Report
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
