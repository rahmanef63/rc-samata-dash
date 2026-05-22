"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Database, Sparkles, Loader2, CheckCircle, RefreshCw, GitBranch, Wrench } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { useBranchScope } from "@/features/dashboard";

type SeedResult = {
  expenseCategories: { inserted: number; total: number };
  incomeChannels: { inserted: number; total: number };
  categoryRules: { inserted: number; total: number };
  sheetRegistry: { inserted: number; total: number };
  products: { inserted: number; total: number };
  ingredients: { inserted: number; total: number };
};

export function MasterDataSeed() {
  const { branchId } = useBranchScope();
  const runSeed = useAction(api.features.masterData.mutations.runFullMasterSeed);
  const runBackfill = useAction(api.features.reports.bridges.backfillAllReports);
  const runRepair = useAction(api.features.reports.bridges.repairLegacySourceReportId);
  const rules = useQuery(api.features.masterData.queries.listCategoryRules, { activeOnly: true });
  const sheets = useQuery(api.features.masterData.queries.listSheetRegistry, { activeOnly: true });
  const cats = useQuery(api.features.masterData.queries.listExpenseCategories);
  const products = useQuery(api.features.masterData.queries.listMasterProducts, {});
  const ingredients = useQuery(api.features.masterData.queries.listMasterIngredients, {});

  const [running, setRunning] = useState(false);
  const [bridging, setBridging] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [bridgeResult, setBridgeResult] = useState<{ reports: number; inserted: number } | null>(null);
  const [repairResult, setRepairResult] = useState<{
    expensesFixed: number; payablesFixed: number; salesFixed: number; closingsFixed: number;
  } | null>(null);

  async function handleRepair() {
    setRepairing(true);
    try {
      const out = await runRepair();
      setRepairResult(out);
      const total = out.expensesFixed + out.payablesFixed + out.salesFixed + out.closingsFixed;
      toast.success(`Repair selesai · ${total} row di-patch (now cascade-deletable)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Repair gagal");
    } finally {
      setRepairing(false);
    }
  }

  async function handleBackfill() {
    setBridging(true);
    try {
      const out = await runBackfill();
      const inserted = (out.results ?? []).reduce((s: number, r: { payables?: { inserted?: number }; expenses?: { inserted?: number }; sales?: { inserted?: number }; transfers?: { inserted?: number }; incentives?: { inserted?: number } }) =>
        s +
        (r.payables?.inserted ?? 0) +
        (r.expenses?.inserted ?? 0) +
        (r.sales?.inserted ?? 0) +
        (r.transfers?.inserted ?? 0) +
        (r.incentives?.inserted ?? 0), 0);
      setBridgeResult({ reports: out.reports, inserted });
      toast.success(`Bridge selesai: ${out.reports} laporan, +${inserted} transaksi`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bridge gagal");
    } finally {
      setBridging(false);
    }
  }

  async function handleSeed() {
    if (!branchId) {
      toast.error("Pilih cabang dulu di header sebelum seed.");
      return;
    }
    setRunning(true);
    try {
      const out = await runSeed({ branchId });
      setResult(out);
      const totalInserted =
        out.expenseCategories.inserted +
        out.incomeChannels.inserted +
        out.categoryRules.inserted +
        out.sheetRegistry.inserted +
        out.products.inserted +
        out.ingredients.inserted;
      toast.success(`Seed selesai. ${totalInserted} baris baru di-insert.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menjalankan seed");
    } finally {
      setRunning(false);
    }
  }

  const stats: { label: string; count: number | undefined; key: keyof SeedResult }[] = [
    { label: "Kategori Pengeluaran", count: cats?.length,        key: "expenseCategories" },
    { label: "Channel Income",       count: undefined,           key: "incomeChannels" },
    { label: "Aturan Inferensi",     count: rules?.length,       key: "categoryRules" },
    { label: "Sheet Registry",       count: sheets?.length,      key: "sheetRegistry" },
    { label: "Master Produk",        count: products?.length,    key: "products" },
    { label: "Master Bahan",         count: ingredients?.length, key: "ingredients" },
  ];

  return (
    <div>
      <h2 className="text-base font-semibold mb-3">Master Data &amp; Seed</h2>
      <div className="bg-card rounded-xl shadow-card p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Seed semua kategori &amp; aturan inferensi</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Idempotent — aman dijalankan berulang. Insert kategori, aturan keyword,
              sheet registry, plus bootstrap master produk &amp; bahan dari data laporan
              yang sudah diupload (tidak overwrite yang sudah ada).
            </p>
          </div>
          <button
            type="button"
            onClick={handleSeed}
            disabled={running || !branchId}
            className="inline-flex items-center gap-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {running ? "Menjalankan..." : "Seed Semua"}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {stats.map((s) => {
            const r = result?.[s.key];
            return (
              <div
                key={s.label}
                className="border border-border/60 rounded-lg p-2.5 bg-background/40"
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <p className="text-base font-semibold mt-0.5">
                  {s.count !== undefined ? s.count : <span className="text-muted-foreground/50">—</span>}
                </p>
                {r && (
                  <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    +{r.inserted} baru
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {!branchId && (
          <p className="text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2 flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            Pilih cabang di header untuk bootstrap master produk &amp; bahan dari laporan yang sudah diupload.
          </p>
        )}

        <p className="text-[11px] text-muted-foreground italic">
          Tip: jalankan setiap habis upload laporan baru — bahan/produk yang muncul
          di file otomatis ke-bootstrap ke master.
        </p>

        <div className="border-t border-border/60 pt-4 mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <GitBranch className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Bridge ulang semua laporan</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sinkron ulang staging → Buku Besar (transactions) + Piutang (payables) +
                Closings + Stock movements untuk SEMUA laporan yang sudah ada. Pakai
                kalau Buku Besar / Piutang kosong padahal upload sukses (terjadi pada
                laporan yang di-upload sebelum auto-bridge ada).
              </p>
            </div>
            <button
              type="button"
              onClick={handleBackfill}
              disabled={bridging}
              className="inline-flex items-center gap-2 text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bridging ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
              {bridging ? "Bridging..." : "Bridge Sekarang"}
            </button>
          </div>
          {bridgeResult && (
            <p className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
              {bridgeResult.reports} laporan diproses · +{bridgeResult.inserted} transaksi/payable di-insert
            </p>
          )}
        </div>

        <div className="border-t border-border/60 pt-4 mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Repair data legacy (sourceReportId FK)</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Patch <code className="text-[10px] bg-muted px-1 rounded">sourceReportId</code> dari
                <code className="text-[10px] bg-muted px-1 rounded ml-1">etlSource.reportId</code> ke
                expenses / payables / dailySales / dailyClosings yang masih NULL. Setelah ini, hapus
                laporan akan cascade-delete row terkait via index (no scan). Jalankan SEKALI saja
                untuk fix data lama. Idempotent — aman re-run.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRepair}
              disabled={repairing}
              className="inline-flex items-center gap-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {repairing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
              {repairing ? "Repairing..." : "Repair Sekarang"}
            </button>
          </div>
          {repairResult && (
            <p className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
              Patched · expenses {repairResult.expensesFixed} · payables {repairResult.payablesFixed} ·
              dailySales {repairResult.salesFixed} · dailyClosings {repairResult.closingsFixed}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
