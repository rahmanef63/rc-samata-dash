# RC Samata Dashboard — Agent Onboarding Context

## Proyek Overview

Dashboard operasional untuk **RC Samata** (restoran cepat saji). Menggunakan:
- **Frontend**: Next.js 16 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: Convex self-hosted (deployed via Dokploy)
- **Auth**: `@convex-dev/auth` v0.0.91 (Password provider)

## File Data: `_data/JANUARI 2026/`

Semua file Excel yang di-upload melalui dashboard berasal dari folder `_data/JANUARI 2026/`. Ada 3 tipe file utama:

| Tipe File | Contoh Nama File | Jumlah Sheet | Parser Entry Point |
|---|---|---|---|
| **NEW LAP** (Laporan Mingguan) | `NEW LAP 1-7 JAN 2025.xlsx` | ~48 sheet | `src/app/(dashboard)/laporan/upload/page.tsx` → 15 parsers |
| **Pergantian Produk** | `RC SAMATA PERGANTIAN PRODUK 22-31 JANUARI 2026.xlsx` | 1 sheet | `parsers/parseProductChanges.ts` |
| **Form Tunjangan Khusus** | `RC_SAMATA JANUARI-FORM_PENGAJUAN_TUNJANGAN_KHUSUS_...xlsx` | 1 sheet | `parsers/parseAllowances.ts` |

---

## Struktur Sheet "VENDOR" (NEW LAP)

**Lokasi parser**: `src/features/report-upload/parsers/parseVendor.ts`

### Struktur 3 Lembar

Sheet VENDOR berisi **3 tabel** (lembar) yang tersusun vertikal dalam 1 sheet:

```
LEMBAR 1 (rows ~8-81)     → Bahan baku makanan & minuman
LEMBAR 2 (rows ~93-174)   → Pembungkus, Minyak, Bumbu/Groceries
LEMBAR 3 (rows ~190-248)  → Lain-lain & Operasional
```

Setiap lembar dipisahkan oleh:
- Baris `TOTAL LEMBAR 1` / `TOTAL LEMBAR KE 2`
- Baris `VENDOR REPORT` (header tabel baru)

### Section dalam VENDOR

| Section | Lembar | Deteksi | Item Contoh |
|---|---|---|---|
| AYAM | 1 | Header di col3 row 8 | DADA MENTOK, PAHA ATAS, SAYAP, AYAM UTUH |
| PELENGKAP | 1 | Vertical A-Y-A-M lalu P-E-L-E-N-G-K-A-P di col1 | VEGETABLE MIX, BERAS, ROTI BURGER, PERKEDEL |
| BAHAN ES | 1 | Label "BAHAN ES" di col1 | GULA PASIR, ICE CREAM |
| MINUMAN | 1 | Vertical M-I-N-U-M-A-N di col1 | TEH BOTOL, AIR MINERAL, STEE, MILKY MANGGO |
| PEMBUNGKUS | 2 | Default saat VENDOR REPORT; vertical P-E-M-B-U-N-G-K-U-S | PLASTIK, BOX NASI, CUP, TISSUE |
| MINYAK | 2 | Label "MINYAK" di col1 (hanya 1-2 item) | MINYAK GORENG |
| GROCERIES | 2 | Item# restart + vertical G-R-O-C-E-R-I-E-S | TELUR, CABE, BUMBU, TEPUNG, SAMBAL |
| LAIN-LAIN | 3 | Default saat VENDOR REPORT kedua | TELUR CATERING, GAS ELPIJI, ISOLASI |
| OTHERS | 3 | Label "OTHERS" di col1 | BAHAN PEMBERSIH, TRANSPORT |

### Mekanisme "Vertical Letter Spelling"

Section names di VENDOR sheet ditulis **secara vertikal** di kolom 1:
```
Row 26: col1="P"  col2=2  col3="BERAS"
Row 27: col1="E"  col2=3  col3="FRENCH FRIES"
Row 28: col1="L"  col2=4  col3="ROTI BURGER"
...
Row 34: col1="P"  col2=10 col3="SOSIS MINI JUMBO"
→ Akumulasi: P-E-L-E-N-G-K-A-P → Section = PELENGKAP
```

**Penting**: Huruf vertikal dimulai SETELAH item pertama dari section baru. Parser menggunakan **retroactive section assignment** — ketika huruf vertikal resolve menjadi section name, semua item sejak restart item# di-update ke section yang benar.

### Potensi Masalah yang Sering Muncul

1. **Section bocor**: Jika section boundary tidak terdeteksi, item dari section B muncul di section A.
   - **Diagnosa**: Cek apakah item numbering (col2) restart ke 1 → itu tanda section baru.
   - **Cek file**: Lihat rows di sekitar boundary, apakah ada vertical letters atau label?

2. **Admin items masuk**: Lembar 3 berisi data operasional (GAJI STAFF, SETOR BANK, TF VIA GOPAY, dll) yang BUKAN komoditi stok. Parser mem-filter ini via `ADMIN_PATTERNS`.
   - **Diagnosa**: Jika ada item operasional di output, tambahkan pattern ke `ADMIN_PATTERNS`.

3. **"BAHAN ROTI"**: Ini sub-label di col3 row 43 dengan nomor item 19. Ini BUKAN section terpisah — masih bagian PELENGKAP. Parser mendeteksinya karena `BAHAN ROTI` tidak match `matchSection()`.

---

## Struktur Sheet "WEEKLY FC" (Food Cost)

**Lokasi parser**: `src/features/report-upload/parsers/parseWeeklyFC.ts`

### Layout

```
Row 8:  Header → NO | BAHAN | UNIT | QTY | PRICE | TOTAL (Rp)
Row 9:  Section → col0="I"  col1="BAHAN AYAM"
Row 10: Item    → col0="1"  col1="DADA MENTOK"  col2="PCS"  col3=qty  col4=price  col5=total
...
Row 30: JUMLAH (subtotal)
Row 31: Section → col0="II" col1="BAHAN PELENGKAP"
Row 32: Item    → col0="1"  col1="VEGETABLE MIX"
```

### Sections

Detected via Roman numeral (I, II, III...) di col0 + nama section di col1.

| # | Section Name | Item Contoh |
|---|---|---|
| I | BAHAN AYAM | DADA MENTOK, PAHA ATAS, CHICKEN PATTY |
| II | BAHAN PELENGKAP | VEGETABLE MIX, BERAS, ROTI BURGER |
| — | BAHAN ROTI (sub-section) | SLICED CHEESE, DRESSING BURGER |
| III | BAHAN ES | GULA PASIR, ICE CREAM |
| IV | MINUMAN BOTOL | TEH BOTOL, AIR MINERAL |
| V | BAHAN MINUMAN | NESTEA, BUAH FROZEN |
| VI | MINYAK GORENG | MINYAK GORENG |
| VII | BUMBU & SAOS | BAHAN PERKEDEL, TELUR, CABE, MARINADE |
| VIII | GROCERIES | SAMBAL, TOMATO, CHEESE MELT, PREMIK |

### Potensi Masalah

1. **Category detect vs data row**: `detectCategory()` hanya membaca col0/col1 dan match keyword. Jika item name kebetulan mengandung keyword (misal item "BAHAN ES" di row 48), bisa salah mendetect sebagai section header.
   - **Diagnosa**: Cek apakah row juga punya data numerik — jika ya, itu item row bukan section header.

2. **"Umum" fallback**: Jika parser gagal detect category, item masuk "Umum". Ini biasanya karena section header tidak cocok keyword di `CATEGORY_KEYWORDS`.

---

## Struktur Sheet "TO - TI" (Transfer)

**Lokasi parser**: `src/features/report-upload/parsers/parseTransferTOTI.ts`

### Layout: Side-by-Side Sections

Sheet ini berisi **6 section berdampingan horizontal** di kolom offset 0, 5, 10, 15, 20, 25:

```
Col 0:  TO / TI PERKEDEL
Col 5:  TO CATTERING STAFF
Col 10: TO FREE UNDIAN GELEGAR JANUARI
Col 15: TO / TI CHICKEN PATTY
Col 20: TO / TI PERKEDEL MANUAL
Col 25: TO CATTERING KHUSUS
```

Row 0 berisi judul section, Row 4 berisi header kolom (NAMA BAHAN, QTY, HARGA, TOTAL), dan Row 5+ berisi item data.

### Potensi Masalah

1. **Category mismatch**: Setiap section punya kolom sendiri (4 kolom: name, qty, price, total). Jika parser membaca kolom yang salah, item bisa mendapat category dari section lain.
   - **Diagnosa**: Verify section detection dari Row 0: `rows[0][col]` harus mengandung section title.

2. **Standalone sheets**: File juga punya sheet terpisah "TO-TI PERKEDEL" dan "TO CATTERING STAFF" yang mungkin duplikat data sheet utama.
   - Parser juga membaca standalone sheets — cek apakah ini menyebabkan data duplikat.

---

## Debugging Checklist

Jika menemukan masalah section/category pada preview tabel upload:

### 1. Buat Script Inspeksi
```bash
# Buat /tmp/inspect_sheet.js yang membaca file Excel dan print raw row data
node /tmp/inspect_sheet.js
```

### 2. Identifikasi Boundary
- Cari baris dimana **item numbering (col2) restart ke 1** — ini tanda section baru.
- Cari baris dengan **vertical letters di col1** (satu huruf per baris berurutan).
- Cari baris dengan **label explicit** di col1 atau col3 tanpa item number.

### 3. Verifikasi Parser
- Modifikasi parser (file di `src/features/report-upload/parsers/`).
- Jalankan test script terhadap SEMUA file di `_data/JANUARI 2026/NEW LAP *.xlsx`.
- Pastikan output section assignment konsisten di semua 4 file.

### 4. TypeScript Check
```bash
npx tsc --noEmit
```

---

## File Map: Parser Flow

```
src/features/report-upload/
├── lib/
│   ├── xlsxHelpers.ts          ← parseExcelFile(), getSheetRows(), toNumber()
│   └── validateParsedData.ts   ← Validation rules for preview warnings
├── parsers/
│   ├── parseLPKK.ts            ← Sheet "LPKK" → expense items
│   ├── parsePenjualan.ts       ← Sheet "LAP. PENJUALAN" → product sales
│   ├── parsePlatformSales.ts   ← Sheets "GRAB FOOD", "GO FOOD", "SHOPEE FOOD"
│   ├── parseVendor.ts          ← Sheet "VENDOR" → vendor purchases (3 lembar, 9 sections)
│   ├── parseWeeklyFC.ts        ← Sheet "WEEKLY FC" → food cost inventory
│   ├── parseLeftOver.ts        ← Sheet "LEFT OVER"
│   ├── parseLaporanKasPeriode.ts  ← Sheet "LAPORAN KAS PERIODE"
│   ├── parseSalesControl.ts    ← Sheet "SALES CONTROL"
│   ├── parsePembelianKredit.ts ← Sheet "PEMBELIAN KREDIT"
│   ├── parseIkhtisarFC.ts      ← Sheet "IKHTISAR FOOD COST"
│   ├── parseTransferTOTI.ts    ← Sheet "TO - TI" (6 side-by-side sections)
│   ├── parseHPPProduk.ts       ← Sheet "HITUNGAN HPP PRODUK"
│   ├── parseCostAnalysis.ts    ← Sheet "COST ANALYSIS"
│   ├── parseLapCF.ts           ← Sheet "LAP. CF" (cash flow)
│   ├── parseInsentif.ts        ← Sheet "INSENTIF"
│   ├── parseProductChanges.ts  ← Pergantian Produk file
│   └── parseAllowances.ts      ← Form Tunjangan Khusus file
└── components/
    ├── UploadDropzone.tsx       ← Drag & drop file selector
    └── ImportPreview.tsx        ← Tab-based preview of parsed data
```

## Convex Schema (Reports)

```
convex/features/reports/
├── _schema.ts                  ← Table definitions (weeklyReports, expenses, productSales, etc.)
├── mutations.ts                ← Import batch mutations & delete
└── queries.ts                  ← List queries for preview & history
```

Key tables: `weeklyReports`, `expenses`, `productSales`, `vendorPurchases`, `inventoryValuations`, `leftOverRecords`, `dailyCashSummaries`, `salesControlRecords`, `creditPurchases`, `foodCostSummaries`, `transferItems`, `productHPP`, `costAnalysisRecords`, `dailyCashFlows`, `employeeIncentives`, `productChanges`, `employeeAllowances`.
