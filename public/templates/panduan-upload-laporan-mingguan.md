# Panduan AI — Upload Laporan Mingguan (RC Samata)

> Kirim file ini + file Excel mentah ke ChatGPT / Claude / AI lain.
> Minta AI rapikan file Excel-nya sesuai panduan di bawah sebelum
> upload ke dashboard `rc-samata-dash`. AI **tidak boleh** mengubah
> angka — hanya merapikan struktur, nama kolom, format tanggal,
> dan kategori.

---

## Prompt Sistem (copy-paste ke AI)

```
Kamu adalah asisten data RC Samata. Saya akan kirim file Excel
laporan mingguan. Tugasmu: rapikan file ini sesuai panduan
di bawah dan kembalikan dalam format .xlsx baru.

Aturan keras:
1. JANGAN ubah angka apapun (qty, harga, total).
2. JANGAN buat data baru. Cuma rapikan yang ada.
3. Nama sheet harus persis sesuai pola di panduan.
4. Tanggal pakai format YYYY-MM-DD (atau DD/MM/YYYY).
5. Nama bahan/item: huruf besar konsisten (UPPERCASE).
6. Kategori bahan/expense WAJIB pakai daftar di bawah.
   Kalau ragu, klasifikasi pakai keyword inference rule
   yang disediakan.
7. Hapus baris kosong dan baris total/jumlah di tengah data.
8. Output: 1 file .xlsx dengan semua sheet yang diperlukan,
   ditambah ringkasan perubahan di chat.
```

---

## Konvensi File

### Nama file
Format: `<BRANCH> NEW LAP <D1>-<D2> <MMM> <YYYY>.xlsx`

Contoh: `RC SAMATA NEW LAP 1-7 MEI 2026.xlsx`

Bulan: `JAN FEB MAR APR MEI/MAY JUN JUL AGU/AUG SEP OKT/OCT NOV DES/DEC`

Penting: tanpa periode yang valid di nama file, sistem tidak bisa
deteksi duplikat upload.

### Format data umum

| Tipe | Format | Contoh |
|---|---|---|
| Tanggal | `YYYY-MM-DD` | `2026-05-07` |
| Angka rupiah | murni angka (tanpa "Rp", titik, koma) | `1500000` |
| Qty | angka desimal pakai titik | `12.5` |
| Unit | UPPERCASE singkat | `KG`, `PCS`, `LITER`, `IKAT`, `BUNGKUS` |

---

## Daftar Sheet Wajib (17 sheet)

Parser akan otomatis mengenali nama sheet via keyword. Boleh ada
variasi penamaan, tapi keyword utama harus muncul.

| # | Nama Sheet (keyword) | Isi |
|---|---|---|
| 1 | `LPKK` | Kas kecil harian per kategori |
| 2 | `LAP. PENJUALAN` | Penjualan kotor semua channel |
| 3 | `LAP. PENJUALAN GRAB FOOD` | Penjualan platform Grab |
| 4 | `LAP. PENJUALAN GO FOOD` | Penjualan platform Gofood |
| 5 | `LAP. PENJUALAN SHOPEE FOOD` | Penjualan platform Shopee |
| 6 | `VENDOR` | Pembelian + stok bahan baku |
| 7 | `WEEKLY FC` | Valuasi inventory akhir periode |
| 8 | `LEFT OVER` | Sisa/spoilage harian |
| 9 | `LAPORAN KAS PERIODE` | Ringkasan kas harian |
| 10 | `SALES CONTROL` | Target vs aktual harian |
| 11 | `PEMBELIAN KREDIT` | Hutang ke supplier |
| 12 | `IKHTISAR FOOD COST` | Ringkasan FC% per kategori |
| 13 | `TO - TI` | Transfer Out / Transfer In antar cabang |
| 14 | `HITUNGAN HPP PRODUK` | HPP per produk |
| 15 | `COST ANALYSIS` | Variance qty pakai vs beli |
| 16 | `LAP. CF` | Cash flow harian (saldo, sales, expense) |
| 17 | `INSENTIF` | Insentif/gaji karyawan |

Sheet yang **belum punya parser** (nama tidak match keyword di atas)
akan di-skip tanpa hilang — sistem akan flag di "Catatan Validasi".

---

## Spesifikasi Sheet Penting

### LPKK (Kas Kecil)

Mulai data: row 10 (0-based).

| Kolom | Isi | Catatan |
|---|---|---|
| 0 | TGL | tanggal pengeluaran, sparse (boleh kosong = carry-forward) |
| 1 | NO NOTA | nomor nota |
| 2 | BAHAN AYAM | jumlah Rp (cogs) |
| 3 | BAHAN PELENGKAP | jumlah Rp (cogs) |
| 4 | BAHAN ES | jumlah Rp (cogs) |
| 5 | BAHAN MINUMAN | jumlah Rp (cogs) |
| 6 | BAHAN PEMBUNGKUS | jumlah Rp (cogs) |
| 7 | MINYAK GORENG | jumlah Rp (cogs) |
| 8 | GROCERIES/BUMBU | jumlah Rp (cogs) |
| 9 | BAHAN PEMBERSIH | jumlah Rp (utility) |
| 10 | TRANSPORT | jumlah Rp (utility) |
| 11 | FOTO COPY/ATK | jumlah Rp (other) |
| 12 | NO ACC | abaikan |
| 13 | LAIN-LAIN | jumlah Rp (other) |
| 14 | KETERANGAN | deskripsi |
| 15 | JUMLAH | total baris (cek = sum kolom 2–13) |

Untuk pengeluaran yang tidak masuk kolom spesifik, pakai kolom
**LAIN-LAIN** + deskripsi jelas — sistem akan auto-infer kategori
dari deskripsi (lihat "Inference Rule" di bawah).

### LAP. PENJUALAN / Platform Sales

| Kolom | Isi |
|---|---|
| 0 | TANGGAL |
| 1 | NAMA PRODUK |
| 2 | QTY |
| 3 | HARGA SATUAN |
| 4 | TOTAL |
| 5 | CHANNEL (untuk platform: GRAB/GOFOOD/SHOPEE) |

### VENDOR

Struktur kompleks 3 lembar dengan section header vertikal
(P-E-L-E-N-G-K-A-P style). Kalau AI tidak yakin, jangan otak-atik.

Kolom inti (per item):
`COMMODITY | OPEN_QTY | BELI_QTY | PAKAI_QTY | CLOSE_QTY | BELI_RP | PAKAI_RP`

### WEEKLY FC (Food Cost)

Mulai data row 4. Item dikelompokkan per kategori
(BAHAN AYAM, ES, MINUMAN, dll).

| Kolom | Isi |
|---|---|
| 0 | NO atau NAMA ITEM |
| 1 | NAMA ITEM (kalau col 0 = NO) |
| 2 | QTY |
| 3 | UNIT |
| 4 | HARGA SATUAN |
| 5 | TOTAL |

Baris kategori: text murni tanpa angka (cth: "BAHAN AYAM").

### PEMBELIAN KREDIT

| Kolom | Isi |
|---|---|
| 0 | TANGGAL BELI |
| 1 | SUPPLIER |
| 2 | NAMA ITEM |
| 3 | QTY |
| 4 | HARGA SATUAN |
| 5 | TOTAL |
| 6 | JATUH TEMPO |
| 7 | NO INVOICE (opsional) |
| 8 | TANGGAL BAYAR (opsional) |

### LAP. CF (Cash Flow)

| Kolom | Isi |
|---|---|
| 0 | TANGGAL |
| 1 | SALDO AWAL |
| 2 | PENJUALAN (inflow) |
| 3 | PENERIMAAN LAIN |
| 4 | PENGELUARAN KAS KECIL |
| 5 | PENGELUARAN LAIN |
| 6 | SALDO AKHIR |

### INSENTIF

| Kolom | Isi |
|---|---|
| 0 | NAMA KARYAWAN |
| 1 | JENIS (HARIAN/MINGGUAN/BULANAN/BONUS) |
| 2 | JUMLAH |
| 3 | CATATAN (opsional) |

---

## Daftar Kategori Standar (untuk Expense + Inventory)

Pakai EXACT label ini di kolom kategori/section.

### COGS (Cost of Goods Sold)
- `Bahan Ayam` — daging ayam, paha, dada, sayap, ekor, fillet, ceker, jeroan
- `Bahan Pelengkap` — sayuran tambahan (kemangi, selada, kol, wortel, kentang)
- `Bahan Es` — es batu, es kristal
- `Bahan Minuman` — milo, teh, kopi, sirup, jeruk, susu, sprite, aqua
- `Bahan Pembungkus` — dus, box, plastik, paper bag, kantong, cup, sedotan
- `Minyak Goreng` — minyak, margarine, mentega, butter, fortune, bimoli
- `Groceries/Bumbu` — beras, tepung, gula, garam, lada, bawang, cabe, kecap, tahu, tempe, telur, mie

### Utility
- `Bahan Pembersih` — sabun, sunlight, harpic, baygon, vixal, rinso
- `Transport` — bensin, pertamax, parkir, ongkos kirim, gojek/grab express

### Other
- `Foto Copy/ATK` — fotokopi, kertas, pulpen, tinta, map, amplop
- `Lain-lain` — fallback (hindari, owner akan diminta klasifikasi manual)
- `Pengeluaran Kas Kecil` — agregat harian dari LAP. CF (auto)

### Khusus
- `BPJS` (type: bpjs) — BPJS karyawan, jamsostek, JKN
- `Insentif / Gaji` (type: salary_support) — gaji, upah, honor, insentif, THR
- `Maintenance` (type: maintenance) — service, repair, sparepart, gas LPG, AC
- `Marketing` (type: marketing) — iklan, banner, flyer, endorse
- `Platform Fee` (type: fee) — komisi GoFood/Grab/Shopee, MDR bank

---

## Inference Rule (untuk mengisi "Lain-lain" di LPKK)

Kalau deskripsi berisi keyword di bawah, AI WAJIB klasifikasi:

| Keyword (any of) | Kategori |
|---|---|
| AYAM, PAHA, DADA, SAYAP, EKOR, FILLET, CEKER, HATI AMPELA | Bahan Ayam |
| MINYAK, MARGARINE, MENTEGA, BUTTER, FORTUNE, BIMOLI | Minyak Goreng |
| ES BATU, ES KRISTAL, ICE | Bahan Es |
| MILO, TEH, KOPI, SIRUP, JERUK, SUSU, AQUA, SPRITE, FANTA | Bahan Minuman |
| DUS, BOX, KEMASAN, PLASTIK, CUP, SEDOTAN, KANTONG | Bahan Pembungkus |
| BERAS, TEPUNG, GULA, GARAM, BAWANG, CABE, KECAP, TELUR, MIE | Groceries/Bumbu |
| SAYUR, KEMANGI, SELADA, KOL, KENTANG, WORTEL, BUNCIS | Bahan Pelengkap |
| SABUN, SUNLIGHT, HARPIC, BAYGON, RINSO, VIXAL | Bahan Pembersih |
| BENSIN, SOLAR, PERTAMAX, TRANSPORT, PARKIR, TOL | Transport |
| FOTO COPY, ATK, KERTAS, PULPEN, TINTA | Foto Copy/ATK |
| BPJS, JAMSOSTEK, JKN | BPJS |
| GAJI, UPAH, INSENTIF, THR, TUNJANGAN | Insentif / Gaji |
| SERVICE, REPAIR, GAS LPG, SPARE PART | Maintenance |
| IKLAN, BANNER, FLYER, ENDORSE, PROMO | Marketing |
| KOMISI, MDR, ADMIN BANK | Platform Fee |

Kalau tidak ada keyword match → kategori `Lain-lain` + tulis catatan
"⚠ butuh review manual" di kolom deskripsi.

---

## Checklist sebelum Output

- [ ] Nama file sudah pakai pola `<BRANCH> NEW LAP <D1>-<D2> <MMM> <YYYY>.xlsx`
- [ ] Semua 17 sheet ada (atau sheet tidak relevan dihilangkan, bukan dikosongkan)
- [ ] Tanggal format `YYYY-MM-DD` konsisten di semua sheet
- [ ] Angka rupiah murni angka (tanpa "Rp"/titik/koma di dalam cell)
- [ ] Kategori LPKK + WEEKLY FC pakai label EXACT dari daftar standar
- [ ] Baris total/jumlah dihapus dari data area
- [ ] Tidak ada sel merged di area data (header boleh)
- [ ] Item name UPPERCASE konsisten

---

## Output Akhir

AI kembalikan 1 file `.xlsx` (binary) + ringkasan teks:

```
✅ Sheet diproses : 17
✅ Baris dirapikan: 1234
⚠ Sheet di-skip : 2 (alasan: tidak match keyword)
⚠ Baris Lain-lain: 8 (butuh review owner)
🔧 Perubahan utama:
   - Format tanggal: 12 baris diperbaiki ke YYYY-MM-DD
   - Kategori auto-inferred: 23 baris LPKK kolom LAIN-LAIN diklasifikasi
   - Baris kosong dihapus: 45 baris
```

Owner upload file output ke `/laporan/upload` di dashboard.
