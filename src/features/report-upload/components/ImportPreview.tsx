"use client";

import { formatRpFull } from "@/shared/lib";
import type { LPKKItem } from "../parsers/parseLPKK";
import type { ProductSaleItem } from "../parsers/parsePenjualan";
import type { VendorPurchaseItem } from "../parsers/parseVendor";
import type { InventoryValuationItem } from "../parsers/parseWeeklyFC";
import type { LeftOverItem } from "../parsers/parseLeftOver";
import type { DailyCashSummaryItem } from "../parsers/parseLaporanKasPeriode";
import type { SalesControlItem } from "../parsers/parseSalesControl";
import type { CreditPurchaseItem } from "../parsers/parsePembelianKredit";

type ParsedData = {
  lpkk: LPKKItem[];
  penjualan: ProductSaleItem[];
  platformSales: ProductSaleItem[];
  vendor: VendorPurchaseItem[];
  weeklyFc: InventoryValuationItem[];
  leftover: LeftOverItem[];
  kasPeriode: DailyCashSummaryItem[];
  salesControl: SalesControlItem[];
  pembelianKredit: CreditPurchaseItem[];
};

type Props = {
  data: ParsedData;
  activeTab: string;
  onTabChange: (tab: string) => void;
};

const TABS = [
  { key: "lpkk",          label: "Kas Kecil",    countKey: "lpkk" },
  { key: "penjualan",     label: "Penjualan",    countKey: "penjualan" },
  { key: "platform",      label: "Platform",     countKey: "platformSales" },
  { key: "kasPeriode",    label: "Kas Periode",  countKey: "kasPeriode" },
  { key: "salesControl",  label: "Sales Ctrl",   countKey: "salesControl" },
  { key: "leftover",      label: "Left Over",    countKey: "leftover" },
  { key: "vendor",        label: "Vendor",       countKey: "vendor" },
  { key: "weeklyFc",      label: "Food Cost",    countKey: "weeklyFc" },
  { key: "kredit",        label: "Beli Kredit",  countKey: "pembelianKredit" },
] as const;

export function ImportPreview({ data, activeTab, onTabChange }: Props) {
  return (
    <div className="space-y-3">
      {/* Tabs — scroll horizontal di mobile */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 rounded-xl bg-muted p-1 min-w-max">
          {TABS.map((tab) => {
            const count = (data[tab.countKey as keyof ParsedData] as unknown[]).length;
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                  ${activeTab === tab.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}
                `}
              >
                {tab.label}
                <span className="ml-1 opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        {activeTab === "lpkk"         && <LPKKTable items={data.lpkk} />}
        {activeTab === "penjualan"    && <SalesTable items={data.penjualan} title="LAP. PENJUALAN (semua channel)" />}
        {activeTab === "platform"     && <SalesTable items={data.platformSales} title="Platform (Grab/GoFood/Shopee)" showChannel />}
        {activeTab === "kasPeriode"   && <KasPeriodeTable items={data.kasPeriode} />}
        {activeTab === "salesControl" && <SalesControlTable items={data.salesControl} />}
        {activeTab === "leftover"     && <LeftOverTable items={data.leftover} />}
        {activeTab === "vendor"       && <VendorTable items={data.vendor} />}
        {activeTab === "weeklyFc"     && <FCTable items={data.weeklyFc} />}
        {activeTab === "kredit"       && <KreditTable items={data.pembelianKredit} />}
      </div>
    </div>
  );
}

// ─── Shared wrapper ──────────────────────────────────────────

function TableWrapper({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto max-h-64 overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/60 sticky top-0">
          <tr>{headers.map((h) => <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody>
          {empty ? (
            <tr><td colSpan={headers.length} className="px-3 py-6 text-center text-muted-foreground">Tidak ada data</td></tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
}

function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-t border-border/50 hover:bg-muted/20">{children}</tr>;
}

function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-1.5 ${className}`}>{children ?? "-"}</td>;
}

function MoreRows({ shown, total, cols }: { shown: number; total: number; cols: number }) {
  if (total <= shown) return null;
  return <tr><td colSpan={cols} className="px-3 py-2 text-center text-muted-foreground">+ {total - shown} baris lagi</td></tr>;
}

// ─── Tables ──────────────────────────────────────────────────

function LPKKTable({ items }: { items: LPKKItem[] }) {
  const SHOW = 80;
  return (
    <TableWrapper headers={["Tanggal", "Kategori", "Deskripsi", "Jumlah"]} empty={items.length === 0}>
      {items.slice(0, SHOW).map((item, i) => (
        <Tr key={i}>
          <Td className="text-muted-foreground">{item.expenseDate}</Td>
          <Td>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              item.categoryType === "cogs" ? "bg-orange-100 text-orange-700" :
              item.categoryType === "utility" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
            }`}>{item.categoryLabel}</span>
          </Td>
          <Td className="max-w-[160px] truncate">{item.description}</Td>
          <Td className="text-right font-mono text-destructive">{formatRpFull(item.amount)}</Td>
        </Tr>
      ))}
      <MoreRows shown={SHOW} total={items.length} cols={4} />
    </TableWrapper>
  );
}

function SalesTable({ items, title, showChannel }: { items: ProductSaleItem[]; title?: string; showChannel?: boolean }) {
  const SHOW = 80;
  return (
    <TableWrapper headers={showChannel ? ["Tanggal", "Channel", "Produk", "Qty", "Total"] : ["Tanggal", "Produk", "Qty", "Harga", "Total"]} empty={items.length === 0}>
      {items.slice(0, SHOW).map((item, i) => (
        <Tr key={i}>
          <Td className="text-muted-foreground">{item.businessDate}</Td>
          {showChannel && <Td><span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{item.channel}</span></Td>}
          <Td className="font-medium">{item.productName}</Td>
          <Td className="text-right">{item.qty}</Td>
          {!showChannel && <Td className="text-right font-mono">{formatRpFull(item.unitPrice)}</Td>}
          <Td className="text-right font-mono text-primary">{formatRpFull(item.amount)}</Td>
        </Tr>
      ))}
      <MoreRows shown={SHOW} total={items.length} cols={showChannel ? 5 : 5} />
    </TableWrapper>
  );
}

function KasPeriodeTable({ items }: { items: DailyCashSummaryItem[] }) {
  return (
    <TableWrapper headers={["Tanggal", "Penjualan Kotor", "Komisi GF", "Komisi Grab", "Komisi Shopee", "Discount", "Net Sales"]} empty={items.length === 0}>
      {items.map((item, i) => (
        <Tr key={i}>
          <Td className="text-muted-foreground">{item.businessDate}</Td>
          <Td className="text-right font-mono">{formatRpFull(item.grossSales)}</Td>
          <Td className="text-right font-mono text-destructive">{formatRpFull(item.komisiGofood)}</Td>
          <Td className="text-right font-mono text-destructive">{formatRpFull(item.komisiGrabfood)}</Td>
          <Td className="text-right font-mono text-destructive">{formatRpFull(item.komisiShopeefood)}</Td>
          <Td className="text-right font-mono text-destructive">{formatRpFull(item.discount)}</Td>
          <Td className="text-right font-mono text-primary font-semibold">{formatRpFull(item.netSales)}</Td>
        </Tr>
      ))}
    </TableWrapper>
  );
}

function SalesControlTable({ items }: { items: SalesControlItem[] }) {
  return (
    <TableWrapper headers={["Tanggal", "Net Sales", "CU", "Daya Beli", "Target", "Capaian %"]} empty={items.length === 0}>
      {items.map((item, i) => (
        <Tr key={i}>
          <Td className="text-muted-foreground">{item.businessDate}</Td>
          <Td className="text-right font-mono">{formatRpFull(item.netSales)}</Td>
          <Td className="text-right">{item.customerCount}</Td>
          <Td className="text-right font-mono">{formatRpFull(item.spendingPower)}</Td>
          <Td className="text-right font-mono">{formatRpFull(item.targetSales)}</Td>
          <Td className={`text-right font-semibold ${item.achievementPct >= 1 ? "text-green-600" : "text-destructive"}`}>
            {(item.achievementPct * 100).toFixed(1)}%
          </Td>
        </Tr>
      ))}
    </TableWrapper>
  );
}

function LeftOverTable({ items }: { items: LeftOverItem[] }) {
  return (
    <TableWrapper headers={["Tanggal", "Item", "Qty"]} empty={items.length === 0}>
      {items.map((item, i) => (
        <Tr key={i}>
          <Td className="text-muted-foreground">{item.businessDate}</Td>
          <Td className="font-medium">{item.itemName}</Td>
          <Td className="text-right text-destructive font-semibold">{item.qty}</Td>
        </Tr>
      ))}
    </TableWrapper>
  );
}

function VendorTable({ items }: { items: VendorPurchaseItem[] }) {
  return (
    <TableWrapper headers={["Komoditi", "Opening Qty", "Beli Qty", "Pemakaian", "Closing Qty", "Closing Value"]} empty={items.length === 0}>
      {items.map((item, i) => (
        <Tr key={i}>
          <Td className="font-medium">{item.commodityName}</Td>
          <Td className="text-right">{item.openingQty.toFixed(1)}</Td>
          <Td className="text-right">{item.purchaseQty.toFixed(1)}</Td>
          <Td className="text-right text-orange-600">{item.usageQty.toFixed(1)}</Td>
          <Td className="text-right">{item.closingQty.toFixed(1)}</Td>
          <Td className="text-right font-mono">{formatRpFull(item.closingValue)}</Td>
        </Tr>
      ))}
    </TableWrapper>
  );
}

function FCTable({ items }: { items: InventoryValuationItem[] }) {
  const SHOW = 80;
  return (
    <TableWrapper headers={["Kategori", "Item", "Qty", "Satuan", "Harga", "Total"]} empty={items.length === 0}>
      {items.slice(0, SHOW).map((item, i) => (
        <Tr key={i}>
          <Td className="text-muted-foreground text-[10px]">{item.category}</Td>
          <Td className="font-medium">{item.itemName}</Td>
          <Td className="text-right">{item.qty}</Td>
          <Td>{item.unit}</Td>
          <Td className="text-right font-mono">{formatRpFull(item.unitPrice)}</Td>
          <Td className="text-right font-mono text-primary">{formatRpFull(item.totalValue)}</Td>
        </Tr>
      ))}
      <MoreRows shown={SHOW} total={items.length} cols={6} />
    </TableWrapper>
  );
}

function KreditTable({ items }: { items: CreditPurchaseItem[] }) {
  return (
    <TableWrapper headers={["Tanggal", "Supplier", "Item", "Qty", "Harga", "Total", "Jatuh Tempo"]} empty={items.length === 0}>
      {items.map((item, i) => (
        <Tr key={i}>
          <Td className="text-muted-foreground">{item.purchaseDate}</Td>
          <Td className="text-xs">{item.supplierName}</Td>
          <Td className="font-medium">{item.itemName}</Td>
          <Td className="text-right">{item.qty}</Td>
          <Td className="text-right font-mono">{formatRpFull(item.unitPrice)}</Td>
          <Td className="text-right font-mono text-destructive">{formatRpFull(item.totalAmount)}</Td>
          <Td className="text-muted-foreground">{item.dueDate ?? "-"}</Td>
        </Tr>
      ))}
    </TableWrapper>
  );
}
