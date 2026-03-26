# RC Samata Gowa — Panduan Pengguna

Selamat datang di **RC Samata Dashboard**, sistem manajemen operasional untuk franchise Rocket Chicken cabang Samata Gowa. Dokumen ini menjelaskan cara menggunakan semua fitur yang tersedia.

---

## Daftar Isi

1. [Login & Akses](#1-login--akses)
2. [Dashboard Utama](#2-dashboard-utama)
3. [Upload Laporan Mingguan](#3-upload-laporan-mingguan)
4. [Analisis Data (Data Browser)](#4-analisis-data-data-browser)
5. [Halaman Report](#5-halaman-report)
6. [Finance](#6-finance)
7. [Operations](#7-operations)
8. [Skenario Umum](#8-skenario-umum)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Login & Akses

### Cara Login
1. Buka dashboard di browser
2. Masukkan **Email** dan **Password** yang sudah didaftarkan
3. Klik **Sign In**

### Lupa Password
Hubungi administrator untuk reset password.

### Role & Akses
Saat ini semua pengguna yang login memiliki akses penuh ke semua menu (owner-level). Role-based access control akan ditambahkan di versi mendatang.

---

## 2. Dashboard Utama

**Halaman:** `/` (Home)

Dashboard menampilkan ringkasan real-time dari data yang sudah di-upload:

### KPI Cards (Atas)
- **Total Sales** — Total penjualan kotor dari seluruh laporan
- **Net Profit** — Estimasi laba bersih (Revenue - COGS - Opex)
- **Food Cost %** — Persentase HPP terhadap penjualan
- **Total Expenses** — Total pengeluaran (kas kecil + operasional)

> Semua angka otomatis terupdate setiap kali laporan baru di-upload.

### Chart & Grafik
| Chart | Keterangan |
|-------|-----------|
| **Sales Last 7 Days** | Tren penjualan harian dari 7 hari terakhir (data productSales) |
| **30 Day Trend** | Tren penjualan kotor 30 hari (data dailyCashSummary) |
| **Expense by Category** | Pie chart pembagian biaya (bahan, gaji, dll) |
| **Cashflow Waterfall** | Revenue → COGS → Opex → Net Profit |

### Petty Cash Requests
Menampilkan permintaan kas kecil yang butuh approval. Klik item untuk approve/reject.

### Recent Transactions
5 transaksi terakhir (penjualan & pengeluaran). Klik untuk lihat detail.

---

## 3. Upload Laporan Mingguan

**Halaman:** `/laporan/upload`

Ini adalah fitur utama — parse file Excel laporan mingguan ("NEW LAP") dan simpan ke database.

### Langkah-langkah Upload

#### Step 1: Pilih File
1. Buka menu **Upload Laporan**
2. Drag & drop file Excel atau klik area upload
3. File harus berformat `.xlsx` (Excel)
4. Nama file idealnya mengandung periode, contoh: `NEW LAP 01-07 JAN 2025.xlsx`

#### Step 2: Review Preview
Setelah file dibaca, sistem akan menampilkan:
- **Summary cards** — Jumlah record per kategori (Kas Kecil, Penjualan, Vendor, dll)
- **Tabel preview** — Klik tab untuk melihat data per sheet
- **Validasi** — Warning & error otomatis

#### Step 3: Edit Kategori (BARU!)
Sebelum import, Anda bisa **mengedit kategori** langsung di tabel preview:
- Klik dropdown pada kolom **Tipe/Kategori/Section/Channel**
- Pilih dari daftar yang ada, atau ketik untuk **membuat kategori baru**
- Perubahan langsung terlihat di tabel

**Kolom yang bisa diedit:**
| Tab | Kolom | Contoh Nilai |
|-----|-------|-------------|
| Kas Kecil | Tipe | COGS, Utility, Other |
| Kas Kecil | Kategori | Gas, Listrik, Kebersihan, dll |
| Platform | Channel | GrabFood, GoFood, ShopeeFood |
| Vendor | Section | Bumbu, Protein, Sayur, dll |
| Food Cost | Kategori | Kategori barang inventori |
| Transfer | Arah | IN, OUT |
| Transfer | Kategori | Kategori transfer |
| HPP | Kelas | Standard, Kelas 2, Kelas 3A, dll |
| Insentif | Jenis | Tipe insentif karyawan |

#### Step 4: Cek Validasi
Sistem menjalankan 8 validasi otomatis:

| Validasi | Level | Keterangan |
|----------|-------|-----------|
| Periode terdeteksi | Error | Periode harus bisa diparse dari nama file |
| Tabel kosong | Warning | Tabel tanpa data akan di-skip |
| Sales tanpa HPP | Warning | Produk terjual tapi tidak punya data HPP |
| Vendor tanpa Cost Analysis | Info | Item vendor tanpa analisis biaya |
| Jumlah negatif | Warning | Angka minus yang tidak wajar |
| Tanggal di luar periode | Error | Data dengan tanggal di luar range |
| Cash flow tidak konsisten | Warning | Saldo awal != saldo akhir hari sebelumnya |
| Nama produk duplikat | Info | Produk dengan nama mirip/sama |

- **Error (merah)** → Import diblokir, harus diperbaiki
- **Warning (kuning)** → Bisa dilanjutkan, tapi perlu dicek
- **Info (biru)** → Informasi saja

#### Step 5: Import
1. Klik **Import X Record** (jika tidak ada error)
2. Tunggu progress bar selesai
3. Setelah sukses, lihat ringkasan import

#### Step 6: Aktifkan RAG untuk Chat AI
1. Buka **Settings → AI Provider**
2. Pastikan provider aktif adalah OpenAI, OpenRouter, atau endpoint OpenAI-compatible
3. Setelah upload selesai, klik **Proses Index ke AI Chat**
4. Cek halaman Chat AI dan pastikan indikator **RAG aktif** muncul

### Duplikat Periode
Jika periode yang sama sudah pernah di-upload:
- Sistem akan menampilkan **peringatan duplikat**
- Pilih **Timpa & Import Ulang** untuk mengganti data lama
- Atau **Batal** untuk membatalkan

### Riwayat Upload
Di bagian bawah halaman (saat idle), terlihat daftar semua laporan yang pernah di-upload. Bisa dihapus dengan klik ikon tempat sampah.

---

## 4. Analisis Data (Data Browser)

**Halaman:** `/laporan/analisis`

Halaman analisis memiliki beberapa tab:

### Tab: Overview
Ringkasan visual dari semua laporan — revenue, profitability, trends.

### Tab: Data Browser
Browse semua data mentah yang sudah di-upload:
- Pilih **report** dari dropdown
- Pilih **sub-tabel** (Sales, Vendor, Cash Summary, dll)
- **Search** untuk filter data
- Tabel dengan scroll horizontal & vertikal

**10 Sub-tabel tersedia:**
1. Product Sales — Data penjualan produk
2. Vendor Purchases — Pembelian dari supplier
3. Daily Cash Summary — Ringkasan kas harian
4. Daily Cash Flow — Arus kas harian
5. Cost Analysis — Analisis biaya per item
6. Inventory Valuation — Valuasi stok (Weekly FC)
7. Product HPP — Harga Pokok Produksi per produk
8. Transfer Items — Transfer barang TO/TI
9. Employee Incentives — Insentif karyawan
10. Food Cost Summary — Ikhtisar food cost

---

## 5. Halaman Report

**Halaman:** `/report`

Menampilkan overview performa bisnis:
- **Total Penjualan** — Dari data yang sudah di-upload
- **Revenue Trend** — Grafik garis penjualan
- **Expense Breakdown** — Pie chart biaya
- **Cashflow Waterfall** — Aliran kas
- **Daftar Laporan** — Semua file yang sudah di-upload, klik untuk analisis

---

## 6. Finance

### Penjualan (`/finance`)
Data penjualan dari semua channel (dine-in, GrabFood, GoFood, ShopeeFood).

### Expenses (`/finance/expenses`)
Daftar pengeluaran/kas kecil (LPKK).

### Piutang Vendor (`/finance/payables`)
Data pembelian kredit yang belum lunas.

### Petty Cash (`/finance/petty-cash`)
Pengelolaan kas kecil — request, approval, pencairan.

### Closing & Setoran (`/finance/closing`)
Data closing harian dan setoran ke bank.

---

## 7. Operations

### Inventory (`/operation`)
Data stok barang (dari sheet Weekly FC / Food Cost).

### Audit (`/operation/audit`)
Bandingkan data di database dengan file asli untuk deteksi selisih.

### Master Data (`/operation/master-data`)
Kelola data master:
- **Branches** — Data cabang
- **Master Products** — Registry produk (PRD-001, PRD-002, ...)
- **Master Ingredients** — Registry bahan baku (ING-001, ING-002, ...)
- Sistem alias otomatis untuk mencocokkan variasi nama

### Settings (`/operation/settings`)
Pengaturan aplikasi.

---

## 8. Skenario Umum

### Skenario 1: Upload Laporan Mingguan Pertama Kali

1. Buka `/laporan/upload`
2. Drop file `NEW LAP 01-07 JAN 2025.xlsx`
3. Tunggu parsing (~3-5 detik)
4. Review summary: pastikan jumlah record masuk akal
5. Cek validasi — selesaikan error jika ada
6. Klik **Import**
7. Buka Dashboard (`/`) — chart akan terisi otomatis

### Skenario 2: Upload Laporan Minggu Berikutnya

1. Upload file `NEW LAP 08-14 JAN 2025.xlsx`
2. Sistem otomatis deteksi periode baru
3. Import seperti biasa
4. Dashboard akan menampilkan tren 2 minggu

### Skenario 3: Upload Ulang (Koreksi Data)

1. Upload file yang sudah diperbaiki
2. Sistem deteksi: "Laporan periode ini sudah ada!"
3. Klik **Timpa & Import Ulang**
4. Data lama akan dihapus dan diganti data baru

### Skenario 4: Cek Apakah Food Cost Terlalu Tinggi

1. Buka Dashboard — lihat **Food Cost %** di KPI card
2. Jika > 38% (kuning) atau > 42% (merah), perlu investigasi
3. Buka `/laporan/analisis` → Tab **Data Browser**
4. Pilih report terakhir → pilih **Cost Analysis**
5. Cari item dengan variance tinggi (warna merah)
6. Item dengan variance positif = pemakaian > dari yang seharusnya

### Skenario 5: Cek Profitabilitas Produk (HPP vs Harga Jual)

1. Buka `/laporan/analisis` → Tab **Data Browser**
2. Pilih report → pilih **Product HPP**
3. Lihat kolom **Margin**:
   - Hijau (>= 35%) = sehat
   - Kuning (20-35%) = perlu perhatian
   - Merah (< 20%) = rugi/margin tipis
4. Produk dengan margin merah perlu review harga atau HPP

### Skenario 6: Cek Penjualan per Platform

1. Upload laporan yang memiliki data platform (GrabFood, GoFood, ShopeeFood)
2. Buka `/laporan/analisis` → **Data Browser** → **Product Sales**
3. Filter berdasarkan channel
4. Atau lihat di **Daily Cash Summary** → kolom komisi per platform

### Skenario 7: Edit Kategori Sebelum Import

1. Upload file Excel
2. Di preview, buka tab **Kas Kecil**
3. Klik dropdown di kolom **Tipe** atau **Kategori**
4. Ubah ke kategori yang benar
5. Jika kategori belum ada, ketik nama baru dan tekan Enter → kategori baru dibuat
6. Setelah semua benar, klik **Import**

### Skenario 8: Lihat Tren Penjualan 30 Hari

1. Upload minimal 4 laporan mingguan berturut-turut
2. Buka Dashboard
3. Lihat chart **30 Day Trend**
4. Atau buka `/report` untuk grafik yang lebih detail

### Skenario 9: Monitor Kas Harian

1. Pastikan laporan sudah di-upload
2. Buka `/laporan/analisis` → **Data Browser** → **Daily Cash Flow**
3. Cek:
   - Saldo awal = saldo akhir hari sebelumnya?
   - Total pengeluaran wajar?
   - Sales inflow cocok dengan data penjualan?

### Skenario 10: Petty Cash Approval

1. Buka Dashboard — lihat card **Petty Cash Requests**
2. Klik request yang pending
3. Review detail (tanggal, jumlah, kategori)
4. Klik **Approve** atau **Reject**

---

## 10. File Yang Didukung

Project ini mendukung **3 jenis file** untuk di-upload:

| Jenis File | Format | Halaman Upload | Keterangan |
|---|---|---|---|
| **NEW LAP** (Laporan Mingguan) | `.xlsx` — 15 sheet | `/laporan/upload` | File utama: penjualan, kas kecil, vendor, food cost, dll |
| **Pergantian Produk** | `.xlsx` — 1 sheet | `/laporan/upload-pergantian` | Data bahan yang diganti/expired per periode |
| **Form Tunjangan Khusus** | `.xlsx` — 1 sheet | `/laporan/upload-tunjangan` | Tunjangan luar kota, kost, subsidi transport |

### File yang TIDAK Didukung

| File | Alasan |
|---|---|
| BA Pemakaian Ayam (`.docx`) | Format Word, data sudah ada di sheet TO-TI |
| File `.xls` (Excel lama) | Harus dikonversi ke `.xlsx` terlebih dahulu |

---

## 9. Troubleshooting

### File Tidak Bisa Di-parse
- Pastikan file berformat `.xlsx` (bukan `.xls` atau `.csv`)
- Pastikan file adalah template "NEW LAP" dari Rocket Chicken
- Coba buka file di Excel, save as `.xlsx`, dan upload ulang

### Angka Tidak Cocok
- Periksa format angka di Excel (titik vs koma sebagai pemisah ribuan)
- Sistem mendukung format Indonesia (60.000 = 60 ribu) dan US (60,000 = 60 ribu)
- Jika ada cell kosong di Excel, nilai akan dibaca sebagai 0

### Dashboard Kosong
- Pastikan sudah upload minimal 1 laporan
- Refresh halaman (Ctrl+R)
- Cek apakah branch sudah terdaftar di Master Data

### Import Error
- Cek console browser (F12 → Console) untuk detail error
- Pastikan koneksi internet stabil (data dikirim ke server Convex)
- Coba upload ulang

### Session Expired
- Login kembali
- Jika error berulang, hubungi administrator untuk cek konfigurasi JWT

---

## Glosarium

| Istilah | Penjelasan |
|---------|-----------|
| **LPKK** | Laporan Pengeluaran Kas Kecil |
| **HPP** | Harga Pokok Produksi |
| **COGS** | Cost of Goods Sold (= HPP) |
| **Food Cost %** | (Total pemakaian bahan / Total penjualan) x 100% |
| **TO/TI** | Transfer Out / Transfer In (pindah barang antar cabang) |
| **FC** | Food Cost |
| **CU** | Customer Unit (jumlah pelanggan) |
| **Net Sales** | Penjualan setelah dikurangi komisi platform & diskon |
| **Gross Sales** | Penjualan kotor sebelum potongan |
| **Variance** | Selisih antara stok aktual dan stok yang seharusnya |
| **Spending Power** | Rata-rata belanja per pelanggan |

---

## Sheet Excel yang Didukung

### File NEW LAP (15 sheet)

| No | Sheet | Data | Tabel Database |
|----|-------|------|---------------|
| 1 | LPKK | Pengeluaran kas kecil | expenses |
| 2 | LAP. PENJUALAN | Penjualan semua channel | productSales |
| 3 | GrabFood | Penjualan GrabFood | productSales (channel=GrabFood) |
| 4 | GoFood | Penjualan GoFood | productSales (channel=GoFood) |
| 5 | ShopeeFood | Penjualan ShopeeFood | productSales (channel=ShopeeFood) |
| 6 | Tambahan | Penjualan tambahan | productSales (channel=Tambahan) |
| 7 | VENDOR | Stok & pembelian vendor | vendorPurchases |
| 8 | WEEKLY FC | Valuasi inventori | inventoryValuation |
| 9 | LEFT OVER | Sisa makanan harian | leftoverItems |
| 10 | LAPORAN KAS PERIODE | Ringkasan kas harian | dailyCashSummary |
| 11 | SALES CONTROL | Target vs aktual penjualan | salesControl |
| 12 | PEMBELIAN KREDIT | Pembelian hutang | creditPurchases |
| 13 | IKHTISAR FC | Ringkasan food cost | foodCostSummary |
| 14 | TRANSFER TO-TI | Transfer barang | transferItems |
| 15 | HPP PRODUK | HPP per produk | productHPP |
| 16 | COST ANALYSIS | Analisis biaya per item | costAnalysis |
| 17 | LAP. CF | Arus kas harian | dailyCashFlow |
| 18 | INSENTIF | Insentif karyawan | employeeIncentives |

### File Pergantian Produk

| Kolom | Data | Tabel Database |
|-------|------|---------------|
| NAMA BAHAN | Nama bahan yang diganti | productChanges |
| EXPIRED | Tanggal expired (opsional) | productChanges |
| HARGA / JMLH / PPN / TOTAL | Data harga & kuantitas | productChanges |

### File Form Tunjangan Khusus

| Kolom | Data | Tabel Database |
|-------|------|---------------|
| NAMA LENGKAP | Nama karyawan | employeeAllowances |
| JABATAN / STORE | Info posisi & penempatan | employeeAllowances |
| LUAR KOTA / SUBSIDI TRANSPORT / BUDGET KOS | 3 jenis tunjangan | employeeAllowances |
