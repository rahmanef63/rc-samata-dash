import * as XLSX from "xlsx";

type ReportMeta = {
  _id: string;
  fileName: string;
  periodStart: string;
  periodEnd: string;
  branchId: string;
  uploadedAt: number;
  status: string;
  salesCount?: number;
  expenseCount?: number;
  vendorCount?: number;
  inventoryCount?: number;
};

type ExportPayload = {
  report: ReportMeta;
  tables: Record<string, unknown[]>;
};

const SHEET_NAME: Record<string, string> = {
  productSales: "LAP. PENJUALAN",
  vendorPurchases: "VENDOR",
  inventoryValuation: "WEEKLY FC",
  leftoverItems: "LEFT OVER",
  dailyCashSummary: "LAPORAN KAS PERIODE",
  salesControl: "SALES CONTROL",
  creditPurchases: "PEMBELIAN KREDIT",
  foodCostSummary: "IKHTISAR FC",
  transferItems: "TO - TI",
  productHPP: "HPP PRODUK",
  costAnalysis: "COST ANALYSIS",
  dailyCashFlow: "LAP. CF",
  employeeIncentives: "INSENTIF",
  ownerTransfers: "OWNER TRANSFERS",
  expenses_byPeriod: "LPKK (by period)",
};

function stripNoise(row: unknown): Record<string, unknown> {
  if (!row || typeof row !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    if (k === "_creationTime") continue;
    out[k] = v;
  }
  return out;
}

export function downloadReportAsXlsx(data: ExportPayload) {
  const wb = XLSX.utils.book_new();

  // Sheet INFO — header metadata + per-table row counts
  const counts = Object.entries(data.tables).map(([k, rows]) => ({
    sheet: SHEET_NAME[k] ?? k,
    table: k,
    rows: rows.length,
  }));
  const info = [
    { key: "fileName",     value: data.report.fileName },
    { key: "periodStart",  value: data.report.periodStart },
    { key: "periodEnd",    value: data.report.periodEnd },
    { key: "branchId",     value: data.report.branchId },
    { key: "uploadedAt",   value: new Date(data.report.uploadedAt).toISOString() },
    { key: "status",       value: data.report.status },
    { key: "reportId",     value: data.report._id },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(info), "INFO");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(counts), "RINGKASAN");

  for (const [key, rows] of Object.entries(data.tables)) {
    if (!rows.length) continue;
    const clean = rows.map(stripNoise);
    const ws = XLSX.utils.json_to_sheet(clean);
    const sheetName = (SHEET_NAME[key] ?? key).slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const base = data.report.fileName.replace(/\.xlsx?$/i, "") || "RCS-export";
  XLSX.writeFile(wb, `${base}__converted.xlsx`);
}
