/**
 * Upload schemas — single source of truth used by:
 *  - parsers (validation-only, parsers still hard-code row indices for now)
 *  - panduan-AI dialog (rendered as CSV/JSON/MD on the fly)
 *  - validation warnings (column-count checks)
 *
 * Mirror exactly what each parser expects. Keep in sync when parser changes.
 */

export type ColumnSpec = {
  index: number;
  name: string;
  type: "string" | "number" | "date" | "currency" | "qty" | "unit" | "enum";
  required: boolean;
  example?: string;
  notes?: string;
  enumValues?: string[];
};

export type SheetSpec = {
  key: string;
  keyword: string;            // case-insensitive substring match against sheet name
  label: string;
  description: string;
  headerRow: number;          // 0-based
  dataStartRow: number;       // 0-based
  columns: ColumnSpec[];
  stopOnEmpty?: string[];     // text in col0 that signals end of data
};

// ─── Weekly Upload — 17 sheets ─────────────────────────────

export const WEEKLY_SHEETS: SheetSpec[] = [
  {
    key: "lpkk",
    keyword: "LPKK",
    label: "LPKK (Kas Kecil)",
    description: "Pengeluaran kas kecil harian per kategori.",
    headerRow: 8,
    dataStartRow: 10,
    stopOnEmpty: ["TOTAL", "JUMLAH"],
    columns: [
      { index: 0,  name: "TGL",              type: "date",     required: false, example: "2026-05-13", notes: "sparse — kosong = pakai tanggal sebelumnya" },
      { index: 1,  name: "NO NOTA",          type: "string",   required: false, example: "1234" },
      { index: 2,  name: "BAHAN AYAM",       type: "currency", required: false, example: "85000",  notes: "type=cogs" },
      { index: 3,  name: "BAHAN PELENGKAP",  type: "currency", required: false, notes: "type=cogs" },
      { index: 4,  name: "BAHAN ES",         type: "currency", required: false, notes: "type=cogs" },
      { index: 5,  name: "BAHAN MINUMAN",    type: "currency", required: false, notes: "type=cogs" },
      { index: 6,  name: "BAHAN PEMBUNGKUS", type: "currency", required: false, notes: "type=cogs" },
      { index: 7,  name: "MINYAK GORENG",    type: "currency", required: false, notes: "type=cogs" },
      { index: 8,  name: "GROCERIES/BUMBU",  type: "currency", required: false, notes: "type=cogs" },
      { index: 9,  name: "BAHAN PEMBERSIH",  type: "currency", required: false, notes: "type=utility" },
      { index: 10, name: "TRANSPORT",        type: "currency", required: false, notes: "type=utility" },
      { index: 11, name: "FOTO COPY/ATK",    type: "currency", required: false, notes: "type=other" },
      { index: 12, name: "NO ACC",           type: "string",   required: false, notes: "abaikan (skip)" },
      { index: 13, name: "LAIN-LAIN",        type: "currency", required: false, notes: "fallback — sistem auto-infer dari KETERANGAN" },
      { index: 14, name: "KETERANGAN",       type: "string",   required: false, example: "Beli ayam 5 kg di pasar" },
      { index: 15, name: "JUMLAH",           type: "currency", required: true,  example: "85000",  notes: "wajib = sum kolom 2..13" },
    ],
  },
  {
    key: "penjualan",
    keyword: "LAP. PENJUALAN",
    label: "LAP. PENJUALAN",
    description: "Penjualan harian (semua channel digabung).",
    headerRow: 0,
    dataStartRow: 1,
    columns: [
      { index: 0, name: "TANGGAL",       type: "date",     required: true, example: "2026-05-13" },
      { index: 1, name: "NAMA PRODUK",   type: "string",   required: true, example: "AYAM CRISPY PAHA" },
      { index: 2, name: "QTY",           type: "qty",      required: true, example: "12" },
      { index: 3, name: "HARGA SATUAN",  type: "currency", required: true, example: "15000" },
      { index: 4, name: "TOTAL",         type: "currency", required: true, example: "180000" },
    ],
  },
  {
    key: "platform_grab",
    keyword: "LAP. PENJUALAN GRAB FOOD",
    label: "LAP. PENJUALAN GRAB FOOD",
    description: "Penjualan via GrabFood (channel=grabfood).",
    headerRow: 0,
    dataStartRow: 1,
    columns: [
      { index: 0, name: "TANGGAL",     type: "date",     required: true },
      { index: 1, name: "CHANNEL",     type: "enum",     required: true, enumValues: ["GRABFOOD"] },
      { index: 2, name: "NAMA PRODUK", type: "string",   required: true },
      { index: 3, name: "QTY",         type: "qty",      required: true },
      { index: 4, name: "TOTAL",       type: "currency", required: true },
    ],
  },
  {
    key: "platform_go",
    keyword: "LAP. PENJUALAN GO FOOD",
    label: "LAP. PENJUALAN GO FOOD",
    description: "Penjualan via GoFood (channel=gofood).",
    headerRow: 0,
    dataStartRow: 1,
    columns: [
      { index: 0, name: "TANGGAL",     type: "date",     required: true },
      { index: 1, name: "CHANNEL",     type: "enum",     required: true, enumValues: ["GOFOOD"] },
      { index: 2, name: "NAMA PRODUK", type: "string",   required: true },
      { index: 3, name: "QTY",         type: "qty",      required: true },
      { index: 4, name: "TOTAL",       type: "currency", required: true },
    ],
  },
  {
    key: "platform_shopee",
    keyword: "LAP. PENJUALAN SHOPEE FOOD",
    label: "LAP. PENJUALAN SHOPEE FOOD",
    description: "Penjualan via ShopeeFood (channel=shopeefood).",
    headerRow: 0,
    dataStartRow: 1,
    columns: [
      { index: 0, name: "TANGGAL",     type: "date",     required: true },
      { index: 1, name: "CHANNEL",     type: "enum",     required: true, enumValues: ["SHOPEEFOOD"] },
      { index: 2, name: "NAMA PRODUK", type: "string",   required: true },
      { index: 3, name: "QTY",         type: "qty",      required: true },
      { index: 4, name: "TOTAL",       type: "currency", required: true },
    ],
  },
  {
    key: "vendor",
    keyword: "VENDOR",
    label: "VENDOR (Pembelian & Stok Bahan)",
    description: "3 lembar dengan section header vertikal (P-E-L-E-N-G-K-A-P). Jangan otak-atik struktur — cuma rapikan nama bahan + angka.",
    headerRow: 7,
    dataStartRow: 8,
    columns: [
      { index: 0, name: "NO/LABEL",       type: "string",   required: false },
      { index: 1, name: "COMMODITY",      type: "string",   required: true },
      { index: 2, name: "OPENING QTY",    type: "qty",      required: true },
      { index: 3, name: "PURCHASE QTY",   type: "qty",      required: true },
      { index: 4, name: "USAGE QTY",      type: "qty",      required: true },
      { index: 5, name: "CLOSING QTY",    type: "qty",      required: true },
      { index: 6, name: "PURCHASE VALUE", type: "currency", required: true },
      { index: 7, name: "USAGE VALUE",    type: "currency", required: true },
    ],
  },
  {
    key: "weekly_fc",
    keyword: "WEEKLY FC",
    label: "WEEKLY FC (Food Cost)",
    description: "Valuasi inventory akhir periode. Item dikelompokkan per kategori (baris kategori = text tanpa angka).",
    headerRow: 3,
    dataStartRow: 4,
    columns: [
      { index: 0, name: "NO atau NAMA",  type: "string",   required: false, notes: "kalau col0 = angka urut, parser pakai col1" },
      { index: 1, name: "NAMA ITEM",     type: "string",   required: true },
      { index: 2, name: "QTY",           type: "qty",      required: true },
      { index: 3, name: "UNIT",          type: "unit",     required: true, example: "KG" },
      { index: 4, name: "HARGA SATUAN",  type: "currency", required: true },
      { index: 5, name: "TOTAL",         type: "currency", required: true },
    ],
  },
  {
    key: "leftover",
    keyword: "LEFT OVER",
    label: "LEFT OVER (Sisa/Spoilage)",
    description: "Sisa produk harian. Header row 7 berisi 7 tanggal (kolom 2-8).",
    headerRow: 6,
    dataStartRow: 8,
    columns: [
      { index: 0, name: "ITEM",          type: "string", required: true },
      { index: 1, name: "PERSEDIAAN AWAL", type: "qty",  required: false },
      { index: 2, name: "QTY HARI 1",    type: "qty",    required: false },
      { index: 3, name: "QTY HARI 2",    type: "qty",    required: false },
      { index: 4, name: "QTY HARI 3",    type: "qty",    required: false },
      { index: 5, name: "QTY HARI 4",    type: "qty",    required: false },
      { index: 6, name: "QTY HARI 5",    type: "qty",    required: false },
      { index: 7, name: "QTY HARI 6",    type: "qty",    required: false },
      { index: 8, name: "QTY HARI 7",    type: "qty",    required: false },
    ],
  },
  {
    key: "kas_periode",
    keyword: "LAPORAN KAS PERIODE",
    label: "LAPORAN KAS PERIODE",
    description: "Ringkasan kas harian per channel.",
    headerRow: 0,
    dataStartRow: 1,
    columns: [
      { index: 0, name: "TANGGAL",          type: "date",     required: true },
      { index: 1, name: "PENJUALAN KOTOR",  type: "currency", required: true },
      { index: 2, name: "KOMISI GOFOOD",    type: "currency", required: false },
      { index: 3, name: "KOMISI GRABFOOD",  type: "currency", required: false },
      { index: 4, name: "KOMISI SHOPEE",    type: "currency", required: false },
      { index: 5, name: "DISCOUNT",         type: "currency", required: false },
      { index: 6, name: "NET SALES",        type: "currency", required: true },
    ],
  },
  {
    key: "sales_control",
    keyword: "SALES CONTROL",
    label: "SALES CONTROL",
    description: "Target vs aktual harian + daya beli (spending power).",
    headerRow: 0,
    dataStartRow: 1,
    columns: [
      { index: 0, name: "TANGGAL",        type: "date",     required: true },
      { index: 1, name: "NET SALES",      type: "currency", required: true },
      { index: 2, name: "CUSTOMER COUNT", type: "qty",      required: true },
      { index: 3, name: "DAYA BELI",      type: "currency", required: false },
      { index: 4, name: "TARGET",         type: "currency", required: false },
      { index: 5, name: "CAPAIAN %",      type: "qty",      required: false, notes: "0.0–1.0 atau 0%–100%" },
    ],
  },
  {
    key: "kredit",
    keyword: "PEMBELIAN KREDIT",
    label: "PEMBELIAN KREDIT (Hutang Supplier)",
    description: "Pembelian belum dibayar — masuk ke payables.",
    headerRow: 0,
    dataStartRow: 1,
    columns: [
      { index: 0, name: "TANGGAL BELI",  type: "date",     required: true },
      { index: 1, name: "SUPPLIER",      type: "string",   required: true },
      { index: 2, name: "NAMA ITEM",     type: "string",   required: true },
      { index: 3, name: "QTY",           type: "qty",      required: true },
      { index: 4, name: "HARGA SATUAN",  type: "currency", required: true },
      { index: 5, name: "TOTAL",         type: "currency", required: true },
      { index: 6, name: "JATUH TEMPO",   type: "date",     required: false },
      { index: 7, name: "NO INVOICE",    type: "string",   required: false },
      { index: 8, name: "TANGGAL BAYAR", type: "date",     required: false, notes: "kalau sudah dibayar" },
    ],
  },
  {
    key: "ikhtisar_fc",
    keyword: "IKHTISAR FOOD COST",
    label: "IKHTISAR FOOD COST",
    description: "Ringkasan FC% per kategori inventory.",
    headerRow: 0,
    dataStartRow: 1,
    columns: [
      { index: 0, name: "KATEGORI",     type: "string",   required: true },
      { index: 1, name: "OPENING",      type: "currency", required: true },
      { index: 2, name: "PEMBELIAN",    type: "currency", required: true },
      { index: 3, name: "TRANSFER OUT", type: "currency", required: false },
      { index: 4, name: "TRANSFER IN",  type: "currency", required: false },
      { index: 5, name: "CLOSING",      type: "currency", required: true },
      { index: 6, name: "PEMAKAIAN",    type: "currency", required: true },
      { index: 7, name: "FC %",         type: "qty",      required: false, notes: "0.0–1.0" },
    ],
  },
  {
    key: "transfer",
    keyword: "TO - TI",
    label: "TO - TI (Transfer Out/In)",
    description: "Transfer bahan antar cabang.",
    headerRow: 0,
    dataStartRow: 1,
    columns: [
      { index: 0, name: "ARAH",      type: "enum",     required: true, enumValues: ["OUT", "IN"] },
      { index: 1, name: "KATEGORI",  type: "string",   required: true },
      { index: 2, name: "NAMA ITEM", type: "string",   required: true },
      { index: 3, name: "QTY",       type: "qty",      required: true },
      { index: 4, name: "UNIT",      type: "unit",     required: false },
      { index: 5, name: "TOTAL",     type: "currency", required: true },
    ],
  },
  {
    key: "hpp",
    keyword: "HITUNGAN HPP PRODUK",
    label: "HITUNGAN HPP PRODUK",
    description: "HPP (cost of goods) per produk + ingredients.",
    headerRow: 0,
    dataStartRow: 1,
    columns: [
      { index: 0, name: "NAMA PRODUK",   type: "string",   required: true },
      { index: 1, name: "KELAS",         type: "enum",     required: true, enumValues: ["standard","kelas2","kelas3a","kelas3b","kelas4"] },
      { index: 2, name: "TOTAL HPP",     type: "currency", required: true },
      { index: 3, name: "HARGA JUAL",    type: "currency", required: false },
    ],
  },
  {
    key: "cost_analysis",
    keyword: "COST ANALYSIS",
    label: "COST ANALYSIS",
    description: "Variance qty pakai vs beli per item.",
    headerRow: 0,
    dataStartRow: 1,
    columns: [
      { index: 0, name: "NAMA ITEM",    type: "string",   required: true },
      { index: 1, name: "OPENING QTY",  type: "qty",      required: true },
      { index: 2, name: "PURCHASE QTY", type: "qty",      required: true },
      { index: 3, name: "USAGE QTY",    type: "qty",      required: true },
      { index: 4, name: "CLOSING QTY",  type: "qty",      required: true },
      { index: 5, name: "VARIANCE",     type: "currency", required: false },
    ],
  },
  {
    key: "cash_flow",
    keyword: "LAP. CF",
    label: "LAP. CF (Cash Flow Harian)",
    description: "Saldo + arus kas per hari.",
    headerRow: 0,
    dataStartRow: 1,
    columns: [
      { index: 0, name: "TANGGAL",                type: "date",     required: true },
      { index: 1, name: "SALDO AWAL",             type: "currency", required: true },
      { index: 2, name: "PENJUALAN (INFLOW)",     type: "currency", required: true },
      { index: 3, name: "PENERIMAAN LAIN",        type: "currency", required: false },
      { index: 4, name: "PENGELUARAN KAS KECIL",  type: "currency", required: true },
      { index: 5, name: "PENGELUARAN LAIN",       type: "currency", required: false },
      { index: 6, name: "SALDO AKHIR",            type: "currency", required: true },
    ],
  },
  {
    key: "insentif",
    keyword: "INSENTIF",
    label: "INSENTIF",
    description: "Insentif/gaji karyawan.",
    headerRow: 0,
    dataStartRow: 1,
    columns: [
      { index: 0, name: "NAMA KARYAWAN", type: "string",   required: true },
      { index: 1, name: "JENIS",         type: "enum",     required: true, enumValues: ["harian","mingguan","bulanan","bonus"] },
      { index: 2, name: "JUMLAH",        type: "currency", required: true },
      { index: 3, name: "CATATAN",       type: "string",   required: false },
    ],
  },
];

// ─── Pergantian Produk ─────────────────────────────────────

export const PERGANTIAN_SCHEMA: SheetSpec = {
  key: "pergantian",
  keyword: "*",
  label: "PERGANTIAN PRODUK",
  description: "Bahan baku yang diganti supplier karena expired/rusak/wrong-varian. Title di row 2, periode di row 6, header di row 9, data mulai row 10.",
  headerRow: 9,
  dataStartRow: 10,
  stopOnEmpty: ["TOTAL", "JUMLAH"],
  columns: [
    { index: 0, name: "NAMA BAHAN",   type: "string",   required: true,  example: "MINYAK GORENG FORTUNE" },
    { index: 1, name: "EXPIRED",      type: "date",     required: false, example: "2026-09-15" },
    { index: 2, name: "UNIT",         type: "unit",     required: false, example: "LITER" },
    { index: 3, name: "HARGA",        type: "currency", required: true,  example: "18000" },
    { index: 4, name: "JMLH",         type: "qty",      required: true,  example: "5" },
    { index: 5, name: "PPN (11%)",    type: "currency", required: false, example: "9900" },
    { index: 6, name: "TOTAL HARGA",  type: "currency", required: true,  example: "99900", notes: "= HARGA × JMLH + PPN" },
  ],
};

// ─── Bank Statement (Owner / PIC) ──────────────────────────
//
// Format curated dari raw BCA export, sudah dilabeli Kategori + Pihak
// per row sehingga parser tinggal map. Lihat sample file PIC: header
// detail dimulai di row "No | Bulan | Tanggal | Sumber | ...".

export const BANK_STATEMENT_SCHEMA: SheetSpec = {
  key: "bank_statement",
  keyword: "*",
  label: "Detail Transaksi Gabungan (PIC / Owner)",
  description:
    "Mutasi rekening yang sudah di-clean + dilabeli per baris. Header section di-skip otomatis (Ringkasan Bulanan / Ringkasan Kategori). Detail header berisi 14 kolom. Tanggal format DD/MM — tahun diisi dari periodStart yang dipilih di UI.",
  headerRow: 0,
  dataStartRow: 1,
  stopOnEmpty: [],
  columns: [
    { index: 0,  name: "No",                type: "qty",      required: false, notes: "nomor urut, parser pakai sebagai data-row signal" },
    { index: 1,  name: "Bulan",             type: "enum",     required: true,  enumValues: ["JAN","FEB","MAR","APR","MEI","JUN","JUL","AGU","SEP","OKT","NOV","DES"] },
    { index: 2,  name: "Tanggal",           type: "string",   required: true,  example: "13/02", notes: "format DD/MM (tanpa tahun)" },
    { index: 3,  name: "Sumber",            type: "string",   required: false, example: "feb", notes: "label sumber file (boleh kosong)" },
    { index: 4,  name: "Baris",             type: "qty",      required: false, notes: "row index dari sumber asli (boleh kosong)" },
    { index: 5,  name: "Jenis Transaksi",   type: "enum",     required: true,
      enumValues: ["Saldo Awal","BI-FAST CR","BI-FAST DB","TRSF E-BANKING CR","TRSF E-BANKING DB","SWITCHING CR","BIAYA KARTU ATM","BIAYA ADM"] },
    { index: 6,  name: "Kategori",          type: "enum",     required: true,
      enumValues: [
        "Saldo Awal",
        "Setoran/Transfer Masuk",
        "Penjualan/Settlement",
        "Petty Cash/Operasional",
        "Supplier - Ayam/JAPFA",
        "Supplier - Rocket Chicken",
        "Supplier - Bumbu/Saus",
        "Supplier - Bahan/Minuman",
        "Gaji/THR",
        "Transfer Keluar - Personal",
        "Biaya Bank/Admin",
      ],
      notes: "wajib pakai daftar ini — parser map ke kategori internal (sales_inflow/payable_payment/expense_outflow/topup_pic/transfer_internal)" },
    { index: 7,  name: "Pihak",             type: "string",   required: false, example: "DZIKRULLAH / JAPFA FOOD / AIRPAY INTERNATIONAL / SALDI / AL DANNY IRVAN NUG" },
    { index: 8,  name: "Keterangan Detail", type: "string",   required: false, example: "1502/FTSCY/WS95271 | 4018710.00 | Piutang rc samata, ayam ciamos | JAPFA FOOD INDONES" },
    { index: 9,  name: "Debit",             type: "currency", required: true,  example: "4018710", notes: "keluar / out (Rp). 0 jika row credit." },
    { index: 10, name: "Kredit",            type: "currency", required: true,  example: "0",       notes: "masuk / in (Rp). 0 jika row debit." },
    { index: 11, name: "Net",               type: "currency", required: false, notes: "kredit - debit (auto-derived kalau kosong)" },
    { index: 12, name: "Saldo Setelah",     type: "currency", required: false, notes: "saldo running setelah tx (boleh kosong, parser ignore)" },
    { index: 13, name: "Catatan",           type: "string",   required: false, notes: "catatan extra (parser simpan ke description)" },
  ],
};

/**
 * Mapping Kategori xlsx → kategori internal bankStatementEntries.
 * AI guide harus pakai label kiri persis; parser map ke union kanan.
 */
export const BANK_STATEMENT_CATEGORY_MAP: Record<string, { category: string; pihakHints?: Record<string, string> }> = {
  "Saldo Awal":                  { category: "other" },
  "Setoran/Transfer Masuk":      {
    category: "transfer_internal",
    pihakHints: {
      DZIKRULLAH: "topup_pic",        // owner topup ke PIC
      SALDI: "sales_inflow",          // cashier setor cash
      "AL DANNY IRVAN NUG": "sales_inflow",
    },
  },
  "Penjualan/Settlement":        { category: "sales_inflow" },   // AIRPAY = ShopeeFood / GoFood / Grab settlement
  "Petty Cash/Operasional":      { category: "expense_outflow" },
  "Supplier - Ayam/JAPFA":       { category: "payable_payment" },
  "Supplier - Rocket Chicken":   { category: "payable_payment" },
  "Supplier - Bumbu/Saus":       { category: "payable_payment" },
  "Supplier - Bahan/Minuman":    { category: "payable_payment" },
  "Gaji/THR":                    { category: "expense_outflow" },
  "Transfer Keluar - Personal":  { category: "expense_outflow" },
  "Biaya Bank/Admin":            { category: "expense_outflow" },
};

/**
 * Channel inference dari Pihak / Kategori.
 */
export const BANK_STATEMENT_CHANNEL_HINTS: { match: RegExp; channel: string }[] = [
  { match: /AIRPAY|SHOPEE/i,                  channel: "shopeefood" },
  { match: /GOFOOD|GO ?FOOD/i,                channel: "gofood" },
  { match: /GRAB ?FOOD/i,                     channel: "grabfood" },
  { match: /OVO/i,                            channel: "ovo" },
  { match: /DANA/i,                           channel: "dana" },
  { match: /QRIS/i,                           channel: "qris" },
  { match: /SALDI|AL DANNY|CASH SETOR/i,      channel: "cash" },
  { match: /BIAYA|ADMIN/i,                    channel: "bank_fee" },
];

// ─── Tunjangan Karyawan ────────────────────────────────────

export const TUNJANGAN_SCHEMA: SheetSpec = {
  key: "tunjangan",
  keyword: "*",
  label: "PENGAJUAN TUNJANGAN KHUSUS",
  description: "Form 14-kolom. Max 15 karyawan (row 8–22). Title row 1, header merged row 5–7.",
  headerRow: 5,
  dataStartRow: 8,
  columns: [
    { index: 0,  name: "NO",                       type: "qty",      required: false, notes: "auto-number" },
    { index: 1,  name: "NAMA LENGKAP",             type: "string",   required: true,  example: "BUDI SETIAWAN" },
    { index: 2,  name: "TGL MASUK",                type: "date",     required: false, example: "2024-08-15" },
    { index: 3,  name: "JABATAN",                  type: "enum",     required: false, enumValues: ["Manager","Asst. Manager","Supervisor","Captain","Crew","Trainee","Cashier","Cook","Helper Kitchen","Cleaner","Driver","Admin"] },
    { index: 4,  name: "STORE AWAL (TRAINEE)",     type: "string",   required: false },
    { index: 5,  name: "STORE PENEMPATAN",         type: "string",   required: false, example: "RC SAMATA" },
    { index: 6,  name: "ROTASI ANTAR",             type: "enum",     required: false, enumValues: ["Rotasi Antar Kota","Rotasi Antar Cabang","Penempatan Awal","Trainee → Permanent"] },
    { index: 7,  name: "JARAK",                    type: "string",   required: false, example: "120 KM" },
    { index: 8,  name: "WAKTU TEMPUH",             type: "string",   required: false, example: "2 jam 30 menit" },
    { index: 9,  name: "LUAR KOTA",                type: "currency", required: false, example: "500000" },
    { index: 10, name: "SUBSIDI TRANSPORT",        type: "currency", required: false, example: "300000" },
    { index: 11, name: "BUDGET KOS",               type: "currency", required: false, example: "800000" },
    { index: 12, name: "REIMBURSE",                type: "enum",     required: false, enumValues: ["MASUK GAJI","REIMBURSE","LANGSUNG TRANSFER","-"] },
    { index: 13, name: "KETERANGAN KOS",           type: "string",   required: false },
  ],
};
