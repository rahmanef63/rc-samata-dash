// Helper utilities to split a ZIA Group multi-pocket master workbook into
// RC Samata-compatible row arrays per import target. Mirrors the
// /tmp/zia-converter.js logic but runs in-browser against an already-parsed
// XLSX.WorkBook so the universal import page can preview + commit each
// sub-target without intermediate file downloads.

import type XLSX from "xlsx";
import type { ProductChangeItem } from "@/features/report-upload/parsers/parseProductChanges";
import type { AllowanceItem } from "@/features/report-upload/parsers/parseAllowances";

function rows(wb: XLSX.WorkBook, sheet: string, X: typeof XLSX): unknown[][] {
  const ws = wb.Sheets[sheet];
  if (!ws) return [];
  return X.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
}

function excelSerialToISO(serial: unknown): string | null {
  if (typeof serial !== "number" || !isFinite(serial)) return null;
  const ms = Date.UTC(1899, 11, 30) + serial * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

export type ZiaSplit = {
  pergantian: ProductChangeItem[];
  pergantianPeriod: string;
  tunjangan: AllowanceItem[];
  payables: Array<{
    vendorName: string;
    invoiceDate: string;
    dueDate: string;
    amount: number;
    paidAmount: number;
    description: string;
    reference?: string;
    fileName?: string;
  }>;
  vendors: Array<{ name: string; type?: string; phone?: string; notes?: string }>;
};

export function splitZiaWorkbook(wb: XLSX.WorkBook, X: typeof XLSX, fileName: string): ZiaSplit {
  const out: ZiaSplit = {
    pergantian: [],
    pergantianPeriod: "",
    tunjangan: [],
    payables: [],
    vendors: [],
  };

  // ── pergantian_produk ──
  const pp = rows(wb, "pergantian_produk", X);
  if (pp.length > 0) {
    const meta = String(pp[1]?.[0] ?? "");
    out.pergantianPeriod = meta.match(/Periode\s+([^|]+)/i)?.[1]?.trim() ?? "";
    for (let i = 5; i < pp.length; i++) {
      const r = pp[i] as (string | number)[];
      if (!r[1]) continue;
      const itemName = String(r[1]).trim();
      const upper = itemName.toUpperCase();
      if (!itemName || upper.includes("TOTAL") || upper.includes("JUMLAH")) continue;
      const qty = Number(r[2]) || 0;
      const unitPrice = Number(r[3]) || 0;
      const totalPrice = Number(r[4]) || 0;
      if (totalPrice === 0) continue;
      out.pergantian.push({
        itemName,
        unit: "PCS",
        unitPrice,
        qty,
        ppn: 0,
        totalPrice,
      });
    }
  }

  // ── tunjangan_karyawan ──
  const tk = rows(wb, "tunjangan_karyawan", X);
  for (let i = 5; i < tk.length; i++) {
    const r = tk[i] as (string | number)[];
    const name = String(r[1] || "").trim();
    if (!name || name.toUpperCase().includes("TOTAL")) continue;
    out.tunjangan.push({
      employeeName: name,
      joinDate: String(r[2] || "").trim() || undefined,
      position: String(r[3] || "").trim() || undefined,
      storeOrigin: String(r[4] || "").trim() || undefined,
      storePlacement: String(r[5] || "").trim() || undefined,
      distance: r[6] ? `${r[6]} km` : undefined,
      luarKotaAmount: Number(r[7]) || 0,
      subsidiTransportAmount: Number(r[8]) || 0,
      budgetKosAmount: Number(r[9]) || 0,
    });
  }

  // ── vendor_register ──
  const vr = rows(wb, "vendor_register", X);
  const vMap: Record<string, string> = {};
  for (let i = 5; i < vr.length; i++) {
    const r = vr[i] as (string | number)[];
    if (!r[1]) continue;
    const code = String(r[0] || "").trim();
    const name = String(r[1]).trim();
    if (code) vMap[code] = name;
    out.vendors.push({
      name,
      type: String(r[2] || "").trim() || undefined,
      phone: String(r[3] || "").replace(/Belum Ada \(.*\)/g, "").trim() || undefined,
      notes: String(r[5] || "").trim() || undefined,
    });
  }

  // ── transaksi (filter expense+bahan_baku → payables) ──
  const tx = rows(wb, "transaksi", X);
  for (let i = 5; i < tx.length; i++) {
    const r = tx[i] as (string | number)[];
    if (!r[0] || !r[1]) continue;
    if (String(r[2]).trim() !== "expense") continue;
    if (String(r[3]).trim() !== "bahan_baku") continue;
    const iso = excelSerialToISO(Number(r[1]));
    if (!iso) continue;
    const amount = Number(r[6]) || 0;
    if (amount <= 0) continue;
    const desc = String(r[4] || "").trim();
    const vCode = String(r[12] || "").trim();
    let vendorName = vMap[vCode] || vCode;
    if (!vendorName) continue;
    if (/\(Setoran|Bukan |\(Gaji|\(Pembelian|\(Beli /i.test(vendorName)) continue;
    vendorName = vendorName.replace(/\s*\(.*\)\s*$/, "").trim();

    const d = new Date(iso + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 30);
    const dueDate = d.toISOString().slice(0, 10);

    const refMatch = String(r[10] || "").match(/row\d+/);

    out.payables.push({
      vendorName,
      invoiceDate: iso,
      dueDate,
      amount,
      paidAmount: 0,
      description: desc,
      reference: refMatch ? refMatch[0] : undefined,
      fileName,
    });
  }

  return out;
}
