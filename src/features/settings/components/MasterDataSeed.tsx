"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Database, Sparkles, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";

type SeedResult = {
  expenseCategories: { inserted: number; total: number };
  incomeChannels: { inserted: number; total: number };
  categoryRules: { inserted: number; total: number };
  sheetRegistry: { inserted: number; total: number };
  products: { inserted: number; total: number };
  ingredients: { inserted: number; total: number };
};

export function MasterDataSeed() {
  const runSeed = useAction(api.features.masterData.mutations.runFullMasterSeed);
  const rules = useQuery(api.features.masterData.queries.listCategoryRules, { activeOnly: true });
  const sheets = useQuery(api.features.masterData.queries.listSheetRegistry, { activeOnly: true });
  const cats = useQuery(api.features.masterData.queries.listExpenseCategories);
  const products = useQuery(api.features.masterData.queries.listMasterProducts, {});
  const ingredients = useQuery(api.features.masterData.queries.listMasterIngredients, {});

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);

  async function handleSeed() {
    setRunning(true);
    try {
      const out = await runSeed({});
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
            <p className="text-sm font-medium">Seed master data</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Idempotent — aman dijalankan berulang. Insert kategori, aturan keyword,
              sheet registry, plus bootstrap master produk &amp; bahan dari semua laporan
              yang sudah diupload (tidak overwrite yang sudah ada). Otomatis jalan
              setiap habis upload — tombol ini cuma untuk re-trigger manual.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSeed}
            disabled={running}
            className="inline-flex items-center gap-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {running ? "Menjalankan..." : "Seed Sekarang"}
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
      </div>
    </div>
  );
}
