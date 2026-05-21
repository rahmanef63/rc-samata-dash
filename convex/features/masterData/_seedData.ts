/**
 * Seed payloads for master data — keyword inference rules + sheet registry.
 *
 * Edited via Convex dashboard or UI bulk-edit; this file just provides
 * defaults so a fresh deployment boots with a working ruleset. Existing
 * rows are NOT overwritten by the seed mutation.
 */

import { DEFAULT_EXPENSE_CATEGORIES } from "../../projectConstants";

/**
 * Inference keyword rules. Each row will be inserted into `categoryRules`
 * table. `label` MUST match an expenseCategories.name — seedMasterData
 * inserts any missing labels automatically.
 */
export const DEFAULT_CATEGORY_RULES: { keyword: string; label: string; type: string; priority: number }[] = [
  // ── Settlement / Owner Transfer (platform → Owner)
  { keyword: "TF OWNER GOFOOD",        label: "Settlement Owner", type: "other",   priority: 10 },
  { keyword: "TF OWNER GO FOOD",       label: "Settlement Owner", type: "other",   priority: 10 },
  { keyword: "TF OWNER GRABFOOD",      label: "Settlement Owner", type: "other",   priority: 10 },
  { keyword: "TF OWNER GRAB FOOD",     label: "Settlement Owner", type: "other",   priority: 10 },
  { keyword: "TF OWNER SHOPEEFOOD",    label: "Settlement Owner", type: "other",   priority: 10 },
  { keyword: "TF OWNER SHOPEE FOOD",   label: "Settlement Owner", type: "other",   priority: 10 },
  { keyword: "TF OWNER QRIS",          label: "Settlement Owner", type: "other",   priority: 10 },
  { keyword: "TF OWNER",               label: "Settlement Owner", type: "other",   priority: 15 },
  { keyword: "SETORAN OWNER",          label: "Settlement Owner", type: "other",   priority: 15 },

  // ── Admin fee platform
  { keyword: "ADMIN OVO",              label: "Platform Fee",     type: "fee",     priority: 10 },
  { keyword: "ADMINOVO",               label: "Platform Fee",     type: "fee",     priority: 10 },
  { keyword: "ADMIN GOFOOD",           label: "Platform Fee",     type: "fee",     priority: 10 },
  { keyword: "ADMIN GRABFOOD",         label: "Platform Fee",     type: "fee",     priority: 10 },
  { keyword: "ADMIN SHOPEEFOOD",       label: "Platform Fee",     type: "fee",     priority: 10 },
  { keyword: "ADMIN QRIS",             label: "Platform Fee",     type: "fee",     priority: 10 },

  // ── Utilities
  { keyword: "TOKEN LISTRIK",          label: "Listrik",          type: "utility", priority: 10 },
  { keyword: "LISTRIK",                label: "Listrik",          type: "utility", priority: 20 },
  { keyword: "PLN",                    label: "Listrik",          type: "utility", priority: 20 },
  { keyword: "AIR PDAM",               label: "Air",              type: "utility", priority: 10 },
  { keyword: "PDAM",                   label: "Air",              type: "utility", priority: 20 },
  { keyword: "IURAN KEAMANAN",         label: "Iuran Keamanan",   type: "utility", priority: 10 },
  { keyword: "IURAN",                  label: "Iuran Keamanan",   type: "utility", priority: 20 },
  { keyword: "KEAMANAN",               label: "Iuran Keamanan",   type: "utility", priority: 25 },
  { keyword: "SAMPAH",                 label: "Iuran Keamanan",   type: "utility", priority: 25 },
  { keyword: "INTERNET",               label: "Internet",         type: "utility", priority: 20 },
  { keyword: "WIFI",                   label: "Internet",         type: "utility", priority: 20 },

  // ── Operasional cabang
  { keyword: "KIRIM LAPORAN",          label: "Operasional Cabang", type: "other", priority: 15 },
  { keyword: "PEMATIK API",            label: "Maintenance",      type: "maintenance", priority: 15 },
  { keyword: "PEMATIK",                label: "Maintenance",      type: "maintenance", priority: 20 },
  { keyword: "GAS",                    label: "Gas LPG",          type: "maintenance", priority: 30 },
  { keyword: "TABUNG",                 label: "Gas LPG",          type: "maintenance", priority: 25 },

  // ── Marinasi / pelengkap (LPKK)
  { keyword: "PEL MARINASI",           label: "Groceries/Bumbu",  type: "cogs",    priority: 15 },
  { keyword: "MARINASI",               label: "Groceries/Bumbu",  type: "cogs",    priority: 20 },

  // ── COGS — Ayam
  { keyword: "AYAM",     label: "Bahan Ayam", type: "cogs", priority: 40 },
  { keyword: "PAHA",     label: "Bahan Ayam", type: "cogs", priority: 40 },
  { keyword: "DADA",     label: "Bahan Ayam", type: "cogs", priority: 40 },
  { keyword: "SAYAP",    label: "Bahan Ayam", type: "cogs", priority: 40 },
  { keyword: "FILLET",   label: "Bahan Ayam", type: "cogs", priority: 40 },
  { keyword: "CEKER",    label: "Bahan Ayam", type: "cogs", priority: 40 },
  { keyword: "KARKAS",   label: "Bahan Ayam", type: "cogs", priority: 40 },
  { keyword: "JEROAN",   label: "Bahan Ayam", type: "cogs", priority: 40 },

  // ── COGS — Minyak
  { keyword: "MINYAK",   label: "Minyak Goreng", type: "cogs", priority: 40 },
  { keyword: "MARGARINE",label: "Minyak Goreng", type: "cogs", priority: 40 },
  { keyword: "MENTEGA",  label: "Minyak Goreng", type: "cogs", priority: 40 },
  { keyword: "BUTTER",   label: "Minyak Goreng", type: "cogs", priority: 40 },
  { keyword: "FORTUNE",  label: "Minyak Goreng", type: "cogs", priority: 40 },
  { keyword: "BIMOLI",   label: "Minyak Goreng", type: "cogs", priority: 40 },

  // ── COGS — Es
  { keyword: "ES BATU",  label: "Bahan Es", type: "cogs", priority: 40 },
  { keyword: "ES KRISTAL",label: "Bahan Es", type: "cogs", priority: 40 },
  { keyword: "ICE",      label: "Bahan Es", type: "cogs", priority: 45 },

  // ── COGS — Minuman
  { keyword: "MILO",     label: "Bahan Minuman", type: "cogs", priority: 40 },
  { keyword: "TEH",      label: "Bahan Minuman", type: "cogs", priority: 40 },
  { keyword: "TEA",      label: "Bahan Minuman", type: "cogs", priority: 40 },
  { keyword: "KOPI",     label: "Bahan Minuman", type: "cogs", priority: 40 },
  { keyword: "COFFEE",   label: "Bahan Minuman", type: "cogs", priority: 40 },
  { keyword: "SIRUP",    label: "Bahan Minuman", type: "cogs", priority: 40 },
  { keyword: "LEMON",    label: "Bahan Minuman", type: "cogs", priority: 40 },
  { keyword: "FRESTEA",  label: "Bahan Minuman", type: "cogs", priority: 40 },
  { keyword: "SPRITE",   label: "Bahan Minuman", type: "cogs", priority: 40 },
  { keyword: "FANTA",    label: "Bahan Minuman", type: "cogs", priority: 40 },
  { keyword: "AQUA",     label: "Bahan Minuman", type: "cogs", priority: 40 },

  // ── COGS — Pembungkus
  { keyword: "DUS",      label: "Bahan Pembungkus", type: "cogs", priority: 40 },
  { keyword: "BOX",      label: "Bahan Pembungkus", type: "cogs", priority: 40 },
  { keyword: "PLASTIK",  label: "Bahan Pembungkus", type: "cogs", priority: 40 },
  { keyword: "CUP",      label: "Bahan Pembungkus", type: "cogs", priority: 40 },
  { keyword: "SENDOK PLASTIK", label: "Bahan Pembungkus", type: "cogs", priority: 40 },
  { keyword: "SEDOTAN",  label: "Bahan Pembungkus", type: "cogs", priority: 40 },
  { keyword: "TISSUE",   label: "Bahan Pembungkus", type: "cogs", priority: 40 },
  { keyword: "PAPER",    label: "Bahan Pembungkus", type: "cogs", priority: 45 },
  { keyword: "KEMASAN",  label: "Bahan Pembungkus", type: "cogs", priority: 40 },
  { keyword: "PEMBUNGKUS", label: "Bahan Pembungkus", type: "cogs", priority: 40 },

  // ── COGS — Groceries/Bumbu
  { keyword: "BERAS",    label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "NASI",     label: "Groceries/Bumbu", type: "cogs", priority: 50 },
  { keyword: "TEPUNG",   label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "TERIGU",   label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "GULA",     label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "GARAM",    label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "MERICA",   label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "BAWANG",   label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "CABE",     label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "CABAI",    label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "KECAP",    label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "SAMBAL",   label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "SAUS",     label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "TELUR",    label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "TELOR",    label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "ROYCO",    label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "MASAKO",   label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "VEGETABLE",label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "ROTI",     label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "CHICKEN PATTY", label: "Groceries/Bumbu", type: "cogs", priority: 30 },
  { keyword: "FRENCH FRIES", label: "Groceries/Bumbu", type: "cogs", priority: 30 },
  { keyword: "CRINKLE",  label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "CHEESE",   label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "KEJU",     label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "PERKEDEL", label: "Groceries/Bumbu", type: "cogs", priority: 30 },
  { keyword: "DRESSING", label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "PUDDING",  label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "SUSU",     label: "Groceries/Bumbu", type: "cogs", priority: 40 },
  { keyword: "CUKA",     label: "Groceries/Bumbu", type: "cogs", priority: 40 },

  // ── COGS — Pelengkap
  { keyword: "SAYUR",    label: "Bahan Pelengkap", type: "cogs", priority: 40 },
  { keyword: "KEMANGI",  label: "Bahan Pelengkap", type: "cogs", priority: 40 },
  { keyword: "SELADA",   label: "Bahan Pelengkap", type: "cogs", priority: 40 },
  { keyword: "KOL",      label: "Bahan Pelengkap", type: "cogs", priority: 50 },
  { keyword: "WORTEL",   label: "Bahan Pelengkap", type: "cogs", priority: 40 },
  { keyword: "KENTANG",  label: "Bahan Pelengkap", type: "cogs", priority: 40 },
  { keyword: "JAGUNG",   label: "Bahan Pelengkap", type: "cogs", priority: 40 },

  // ── Utility — Pembersih
  { keyword: "SABUN",    label: "Bahan Pembersih", type: "utility", priority: 40 },
  { keyword: "SUNLIGHT", label: "Bahan Pembersih", type: "utility", priority: 40 },
  { keyword: "DETERGEN", label: "Bahan Pembersih", type: "utility", priority: 40 },
  { keyword: "PEMBERSIH",label: "Bahan Pembersih", type: "utility", priority: 40 },
  { keyword: "BAYCLIN",  label: "Bahan Pembersih", type: "utility", priority: 40 },
  { keyword: "VIXAL",    label: "Bahan Pembersih", type: "utility", priority: 40 },
  { keyword: "WIPOL",    label: "Bahan Pembersih", type: "utility", priority: 40 },

  // ── Utility — Transport
  { keyword: "BENSIN",   label: "Transport",       type: "utility", priority: 40 },
  { keyword: "SOLAR",    label: "Transport",       type: "utility", priority: 40 },
  { keyword: "PERTAMAX", label: "Transport",       type: "utility", priority: 40 },
  { keyword: "PERTALITE",label: "Transport",       type: "utility", priority: 40 },
  { keyword: "GOJEK",    label: "Transport",       type: "utility", priority: 40 },
  { keyword: "PARKIR",   label: "Transport",       type: "utility", priority: 40 },
  { keyword: "TRANSPORT",label: "Transport",       type: "utility", priority: 40 },

  // ── Other — ATK
  { keyword: "FOTOCOPY", label: "Foto Copy/ATK",   type: "other",   priority: 40 },
  { keyword: "FOTO COPY",label: "Foto Copy/ATK",   type: "other",   priority: 40 },
  { keyword: "ATK",      label: "Foto Copy/ATK",   type: "other",   priority: 40 },
  { keyword: "PULPEN",   label: "Foto Copy/ATK",   type: "other",   priority: 40 },
  { keyword: "KERTAS",   label: "Foto Copy/ATK",   type: "other",   priority: 50 },
  { keyword: "STEMPEL",  label: "Foto Copy/ATK",   type: "other",   priority: 40 },
  { keyword: "NOTA",     label: "Foto Copy/ATK",   type: "other",   priority: 40 },

  // ── BPJS / Gaji
  { keyword: "BPJS",     label: "BPJS",            type: "bpjs",    priority: 30 },
  { keyword: "JAMSOSTEK",label: "BPJS",            type: "bpjs",    priority: 30 },
  { keyword: "GAJI",     label: "Insentif / Gaji", type: "salary_support", priority: 30 },
  { keyword: "UPAH",     label: "Insentif / Gaji", type: "salary_support", priority: 30 },
  { keyword: "HONOR",    label: "Insentif / Gaji", type: "salary_support", priority: 30 },
  { keyword: "INSENTIF", label: "Insentif / Gaji", type: "salary_support", priority: 30 },
  { keyword: "BONUS",    label: "Insentif / Gaji", type: "salary_support", priority: 30 },
  { keyword: "TUNJANGAN",label: "Insentif / Gaji", type: "salary_support", priority: 30 },
  { keyword: "THR",      label: "Insentif / Gaji", type: "salary_support", priority: 30 },

  // ── Maintenance
  { keyword: "SERVICE",  label: "Maintenance",     type: "maintenance", priority: 30 },
  { keyword: "REPAIR",   label: "Maintenance",     type: "maintenance", priority: 30 },
  { keyword: "PERBAIKAN",label: "Maintenance",     type: "maintenance", priority: 30 },
  { keyword: "GAS LPG",  label: "Gas LPG",         type: "maintenance", priority: 10 },
  { keyword: "REGULATOR",label: "Gas LPG",         type: "maintenance", priority: 20 },

  // ── Marketing
  { keyword: "IKLAN",    label: "Marketing",       type: "marketing", priority: 30 },
  { keyword: "PROMO",    label: "Marketing",       type: "marketing", priority: 30 },
  { keyword: "BANNER",   label: "Marketing",       type: "marketing", priority: 30 },
  { keyword: "BROSUR",   label: "Marketing",       type: "marketing", priority: 30 },
  { keyword: "MARKETING",label: "Marketing",       type: "marketing", priority: 30 },

  // ── Fee
  { keyword: "KOMISI",   label: "Platform Fee",    type: "fee",     priority: 30 },
  { keyword: "MDR",      label: "Platform Fee",    type: "fee",     priority: 30 },
  { keyword: "BIAYA BANK",label:"Platform Fee",    type: "fee",     priority: 30 },
  { keyword: "ADMIN BANK",label:"Platform Fee",    type: "fee",     priority: 30 },

  // ── Ulang tahun / event (kartu undangan, balon, topi)
  { keyword: "TOPI ULTAH",label: "Marketing",      type: "marketing", priority: 25 },
  { keyword: "BALON",    label: "Marketing",       type: "marketing", priority: 30 },
  { keyword: "KARTU UNDANGAN", label: "Marketing", type: "marketing", priority: 25 },

  // ── Catering staff (TELUR CATERING STAFF di list user)
  { keyword: "CATERING STAFF", label: "Operasional Cabang", type: "other", priority: 25 },

  // ── Cable ties / sundries (HAND GLOVES, CABLE TIES)
  { keyword: "HAND GLOVES",   label: "Bahan Pembungkus", type: "cogs", priority: 30 },
  { keyword: "CABLE TIES",    label: "Foto Copy/ATK",   type: "other", priority: 35 },
  { keyword: "ISOLASI",       label: "Foto Copy/ATK",   type: "other", priority: 35 },
  { keyword: "TUSUK GIGI",    label: "Bahan Pembungkus", type: "cogs", priority: 35 },

  // ── Pulsa / Internet karyawan + provider
  { keyword: "XL PRABAYAR",   label: "Internet",        type: "utility", priority: 10 },
  { keyword: "PRABAYAR",      label: "Internet",        type: "utility", priority: 20 },
  { keyword: "BUDGET PULSA",  label: "Internet",        type: "utility", priority: 15 },
  { keyword: "PULSA",         label: "Internet",        type: "utility", priority: 25 },
  { keyword: "TELKOMSEL",     label: "Internet",        type: "utility", priority: 20 },
  { keyword: "INDOSAT",       label: "Internet",        type: "utility", priority: 20 },

  // ── Bahan tambahan resep (PATTY untuk burger, dll)
  { keyword: "BAHAN PATTY",   label: "Groceries/Bumbu", type: "cogs", priority: 15 },
  { keyword: "PATTY",         label: "Groceries/Bumbu", type: "cogs", priority: 30 },
  { keyword: "BURGER",        label: "Groceries/Bumbu", type: "cogs", priority: 35 },

  // ── Renovasi / equipment
  { keyword: "RENOVASI DAPUR",label: "Maintenance",     type: "maintenance", priority: 10 },
  { keyword: "RENOVASI",      label: "Maintenance",     type: "maintenance", priority: 15 },
  { keyword: "MIC",           label: "Maintenance",     type: "maintenance", priority: 60 }, // setelah MICIN (40)
  { keyword: "SOUND",         label: "Maintenance",     type: "maintenance", priority: 35 },

  // ── Print / materai (varian Foto Copy/ATK)
  { keyword: "PRINT",         label: "Foto Copy/ATK",   type: "other", priority: 25 },
  { keyword: "PRINTING",      label: "Foto Copy/ATK",   type: "other", priority: 25 },
  { keyword: "MATERAI",       label: "Foto Copy/ATK",   type: "other", priority: 15 },
];

/**
 * Sheet patterns known but NOT parsed. These sheets get silently skipped
 * at upload time instead of showing as "Sheet Baru" warning. Edit via UI
 * when a new parser ships (set isParsed=true, parserName="parseXyz").
 */
export const DEFAULT_SHEET_REGISTRY: { sheetNamePattern: string; description: string; isParsed: boolean; parserName?: string }[] = [
  // Parsed sheets (canonical names from KNOWN_SHEET_PATTERNS at upload page)
  { sheetNamePattern: "LPKK",                       description: "Laporan Pengeluaran Kas Kecil", isParsed: true, parserName: "parseLPKK" },
  { sheetNamePattern: "LAP. PENJUALAN",             description: "Penjualan all-channel",         isParsed: true, parserName: "parsePenjualan" },
  { sheetNamePattern: "LAP. PENJUALAN GRAB FOOD",   description: "Penjualan GrabFood",            isParsed: true, parserName: "parsePlatformSales" },
  { sheetNamePattern: "LAP. PENJUALAN GO FOOD",     description: "Penjualan GoFood",              isParsed: true, parserName: "parsePlatformSales" },
  { sheetNamePattern: "LAP. PENJUALAN SHOPEE FOOD", description: "Penjualan ShopeeFood",          isParsed: true, parserName: "parsePlatformSales" },
  { sheetNamePattern: "VENDOR",                     description: "Vendor purchases",              isParsed: true, parserName: "parseVendor" },
  { sheetNamePattern: "WEEKLY FC",                  description: "Weekly food cost inventory",    isParsed: true, parserName: "parseWeeklyFC" },
  { sheetNamePattern: "LEFT OVER",                  description: "Left over items",               isParsed: true, parserName: "parseLeftOver" },
  { sheetNamePattern: "LAPORAN KAS PERIODE",        description: "Kas periode",                   isParsed: true, parserName: "parseLaporanKasPeriode" },
  { sheetNamePattern: "SALES CONTROL",              description: "Sales control",                 isParsed: true, parserName: "parseSalesControl" },
  { sheetNamePattern: "PEMBELIAN KREDIT",           description: "Pembelian kredit",              isParsed: true, parserName: "parsePembelianKredit" },
  { sheetNamePattern: "IKHTISAR FOOD COST",         description: "Ikhtisar food cost",            isParsed: true, parserName: "parseIkhtisarFC" },
  { sheetNamePattern: "TO - TI",                    description: "Transfer TO-TI",                isParsed: true, parserName: "parseTransferTOTI" },
  { sheetNamePattern: "HITUNGAN HPP PRODUK",        description: "HPP produk",                    isParsed: true, parserName: "parseHPPProduk" },
  { sheetNamePattern: "FOOD COST ITEM KELAS",       description: "Cost analysis",                 isParsed: true, parserName: "parseCostAnalysis" },
  { sheetNamePattern: "COST ANALYSIS",              description: "Cost analysis",                 isParsed: true, parserName: "parseCostAnalysis" },
  { sheetNamePattern: "LAP. CF",                    description: "Daily cash flow",               isParsed: true, parserName: "parseLapCF" },
  { sheetNamePattern: "INSENTIF",                   description: "Employee incentives",           isParsed: true, parserName: "parseInsentif" },

  // Intentionally skipped — operational sheets without per-row data
  { sheetNamePattern: "PETUNJUK PENGERJAAN",  description: "Cover/petunjuk — no data",         isParsed: false },
  { sheetNamePattern: "SOP ADMINISTRASI",     description: "SOP doc — no data",                isParsed: false },
  { sheetNamePattern: "LAP TAMBAHAN",         description: "Tambahan free-form — no data",     isParsed: false },
  { sheetNamePattern: "kas periode",          description: "Duplicate sheet name (legacy)",    isParsed: false },
  { sheetNamePattern: "FC ITEM KELAS 2",      description: "Cost analysis class 2 (covered)",  isParsed: false },
  { sheetNamePattern: "FC ITEM KELAS 3A",     description: "Cost analysis class 3A (covered)", isParsed: false },
  { sheetNamePattern: "FC ITEM KELAS 3B",     description: "Cost analysis class 3B (covered)", isParsed: false },
  { sheetNamePattern: "FC ITEM KELAS 4",      description: "Cost analysis class 4 (covered)",  isParsed: false },
  { sheetNamePattern: "RANDOM COOK",          description: "Random cook tracking — no parser", isParsed: false },
  { sheetNamePattern: "MCC",                  description: "Marketing channel tracking",       isParsed: false },
  { sheetNamePattern: "PENANGGALAN",          description: "Date dictionary helper",           isParsed: false },
  { sheetNamePattern: "PHT",                  description: "Internal PHT sheet",               isParsed: false },
  { sheetNamePattern: "MO",                   description: "Manager order",                    isParsed: false },
  { sheetNamePattern: "MO GREEN CRISPY",      description: "MO Green Crispy variant",          isParsed: false },
  { sheetNamePattern: "LKK",                  description: "Laporan Kas Kecil duplicate",      isParsed: false },
  { sheetNamePattern: "LKK FULL PAJAK",       description: "Tax variant",                      isParsed: false },
  { sheetNamePattern: "STOCK CONTROL CASHIER",description: "Cashier stock control",            isParsed: false },
  { sheetNamePattern: "KOREKSI KASIR",        description: "Cashier corrections",              isParsed: false },
  { sheetNamePattern: "PLU REGULER",          description: "PLU price list reguler",           isParsed: false },
  { sheetNamePattern: "PLU PROMO REGION",     description: "PLU promo regional",               isParsed: false },
  { sheetNamePattern: "PLU GO FOOD",          description: "PLU GoFood mapping",               isParsed: false },
  { sheetNamePattern: "PLU GRAB",             description: "PLU GrabFood mapping",             isParsed: false },
  { sheetNamePattern: "PLU SHOPEE",           description: "PLU ShopeeFood mapping",           isParsed: false },
  { sheetNamePattern: "LOG BOOK",             description: "Operational log",                  isParsed: false },
  { sheetNamePattern: "MANAGER CEK LIST",     description: "Manager checklist",                isParsed: false },
  { sheetNamePattern: "MANAGEMENT BOOK",      description: "Management book",                  isParsed: false },
  { sheetNamePattern: "JADWAL",               description: "Schedule",                         isParsed: false },
  { sheetNamePattern: "Sheet1",               description: "Default Excel sheet (empty)",      isParsed: false },
  { sheetNamePattern: "Sheet2",               description: "Default Excel sheet (empty)",      isParsed: false },
  { sheetNamePattern: "TO-TI PERKEDEL",       description: "Transfer perkedel variant",        isParsed: false },
  { sheetNamePattern: "TO CATTERING STAFF",   description: "Catering staff transfer",          isParsed: false },
];

/**
 * Extra expense categories the seed rules reference that aren't in the
 * base DEFAULT_EXPENSE_CATEGORIES list. seedFullMasterData merges these.
 */
export const EXTRA_EXPENSE_CATEGORIES: { name: string; type: string }[] = [
  { name: "Settlement Owner",   type: "other" },
  { name: "Listrik",            type: "utility" },
  { name: "Air",                type: "utility" },
  { name: "Iuran Keamanan",     type: "utility" },
  { name: "Internet",           type: "utility" },
  { name: "Operasional Cabang", type: "other" },
  { name: "Gas LPG",            type: "maintenance" },
];

export const ALL_EXPENSE_CATEGORIES = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...EXTRA_EXPENSE_CATEGORIES,
];
