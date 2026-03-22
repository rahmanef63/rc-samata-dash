"use client";

import { formatRpFull } from "@/shared/lib";
import type { LPKKItem } from "../parsers/parseLPKK";
import type { ProductSaleItem } from "../parsers/parsePenjualan";
import type { VendorPurchaseItem } from "../parsers/parseVendor";
import type { InventoryValuationItem } from "../parsers/parseWeeklyFC";

type ParsedData = {
  lpkk: LPKKItem[];
  penjualan: ProductSaleItem[];
  vendor: VendorPurchaseItem[];
  weeklyFc: InventoryValuationItem[];
};

type Props = {
  data: ParsedData;
  activeTab: string;
  onTabChange: (tab: string) => void;
};

const TABS = [
  { key: "lpkk",     label: "Kas Kecil (LPKK)" },
  { key: "penjualan", label: "Penjualan" },
  { key: "vendor",   label: "Vendor/Stok" },
  { key: "weeklyFc", label: "Food Cost" },
] as const;

export function ImportPreview({ data, activeTab, onTabChange }: Props) {
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {TABS.map((tab) => {
          const count = data[tab.key as keyof ParsedData].length;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`
                flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                ${activeTab === tab.key
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {tab.label}
              <span className="ml-1 text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border overflow-hidden">
        {activeTab === "lpkk" && <LPKKTable items={data.lpkk} />}
        {activeTab === "penjualan" && <PenjualanTable items={data.penjualan} />}
        {activeTab === "vendor" && <VendorTable items={data.vendor} />}
        {activeTab === "weeklyFc" && <FCTable items={data.weeklyFc} />}
      </div>
    </div>
  );
}

// ─── Sub-tables ─────────────────────────────────────────────

function TableWrapper({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto max-h-72 overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/60 sticky top-0">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function LPKKTable({ items }: { items: LPKKItem[] }) {
  return (
    <TableWrapper headers={["Tanggal", "Kategori", "Deskripsi", "Jumlah"]}>
      {items.slice(0, 100).map((item, i) => (
        <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
          <td className="px-3 py-1.5 text-muted-foreground">{item.expenseDate}</td>
          <td className="px-3 py-1.5">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              item.categoryType === "cogs" ? "bg-orange-100 text-orange-700" :
              item.categoryType === "utility" ? "bg-blue-100 text-blue-700" :
              "bg-gray-100 text-gray-600"
            }`}>
              {item.categoryLabel}
            </span>
          </td>
          <td className="px-3 py-1.5 max-w-[160px] truncate">{item.description}</td>
          <td className="px-3 py-1.5 text-right font-mono text-destructive">{formatRpFull(item.amount)}</td>
        </tr>
      ))}
      {items.length > 100 && (
        <tr>
          <td colSpan={4} className="px-3 py-2 text-center text-muted-foreground">
            + {items.length - 100} baris lagi
          </td>
        </tr>
      )}
    </TableWrapper>
  );
}

function PenjualanTable({ items }: { items: ProductSaleItem[] }) {
  return (
    <TableWrapper headers={["Tanggal", "Produk", "Qty", "Harga Satuan", "Total"]}>
      {items.slice(0, 100).map((item, i) => (
        <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
          <td className="px-3 py-1.5 text-muted-foreground">{item.businessDate}</td>
          <td className="px-3 py-1.5 font-medium">{item.productName}</td>
          <td className="px-3 py-1.5 text-right">{item.qty}</td>
          <td className="px-3 py-1.5 text-right font-mono">{formatRpFull(item.unitPrice)}</td>
          <td className="px-3 py-1.5 text-right font-mono text-primary">{formatRpFull(item.amount)}</td>
        </tr>
      ))}
      {items.length > 100 && (
        <tr>
          <td colSpan={5} className="px-3 py-2 text-center text-muted-foreground">
            + {items.length - 100} baris lagi
          </td>
        </tr>
      )}
    </TableWrapper>
  );
}

function VendorTable({ items }: { items: VendorPurchaseItem[] }) {
  return (
    <TableWrapper headers={["Komoditi", "Opening Qty", "Beli Qty", "Pemakaian", "Closing Qty", "Closing Value"]}>
      {items.map((item, i) => (
        <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
          <td className="px-3 py-1.5 font-medium">{item.commodityName}</td>
          <td className="px-3 py-1.5 text-right">{item.openingQty.toFixed(1)}</td>
          <td className="px-3 py-1.5 text-right">{item.purchaseQty.toFixed(1)}</td>
          <td className="px-3 py-1.5 text-right text-orange-600">{item.usageQty.toFixed(1)}</td>
          <td className="px-3 py-1.5 text-right">{item.closingQty.toFixed(1)}</td>
          <td className="px-3 py-1.5 text-right font-mono">{formatRpFull(item.closingValue)}</td>
        </tr>
      ))}
    </TableWrapper>
  );
}

function FCTable({ items }: { items: InventoryValuationItem[] }) {
  return (
    <TableWrapper headers={["Kategori", "Item", "Qty", "Satuan", "Harga", "Total"]}>
      {items.slice(0, 100).map((item, i) => (
        <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
          <td className="px-3 py-1.5 text-muted-foreground text-[10px]">{item.category}</td>
          <td className="px-3 py-1.5 font-medium">{item.itemName}</td>
          <td className="px-3 py-1.5 text-right">{item.qty}</td>
          <td className="px-3 py-1.5">{item.unit}</td>
          <td className="px-3 py-1.5 text-right font-mono">{formatRpFull(item.unitPrice)}</td>
          <td className="px-3 py-1.5 text-right font-mono text-primary">{formatRpFull(item.totalValue)}</td>
        </tr>
      ))}
      {items.length > 100 && (
        <tr>
          <td colSpan={6} className="px-3 py-2 text-center text-muted-foreground">
            + {items.length - 100} baris lagi
          </td>
        </tr>
      )}
    </TableWrapper>
  );
}
