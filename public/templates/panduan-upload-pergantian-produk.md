# Panduan AI — Upload Pergantian Produk (RC Samata)

> Kirim panduan ini + file Excel mentah ke ChatGPT / Claude / AI.
> Minta AI rapikan sebelum upload ke `/laporan/upload-pergantian`.

---

## Prompt Sistem (copy-paste ke AI)

```
Kamu asisten data RC Samata. Saya kirim file Excel pergantian
produk (penggantian/refund bahan ke supplier karena expired,
rusak, atau ganti varian). Rapikan sesuai panduan, JANGAN ubah
angka. Output 1 file .xlsx + ringkasan perubahan.
```

---

## Konteks

Pergantian Produk = bahan baku yang harus diganti dari supplier
karena alasan expired / rusak / wrong varian. Catatan ini terpisah
dari pembelian normal, karena masuk ke `productChanges` table.

---

## Struktur Sheet

- **Nama sheet**: bebas (parser baca sheet pertama).
- **Layout** (row 0-based):

| Row | Isi |
|---|---|
| 2 | Title: `PERGANTIAN PRODUK` |
| 4 | Branch name: `RC SAMATA` |
| 6 | Periode: `22-31 JANUARI 2026` (format `DD-DD BULAN YYYY`) |
| 9 | Header row (lihat di bawah) |
| 10+ | Data rows |

### Header (row 9)
| Col | Label | Tipe | Wajib |
|---|---|---|---|
| 0 | NAMA BAHAN | string UPPERCASE | ✅ |
| 1 | EXPIRED | tanggal `YYYY-MM-DD` | opsional |
| 2 | UNIT | string singkat (`KG`, `PCS`, `LITER`) | opsional |
| 3 | HARGA | angka Rp (unit price) | ✅ |
| 4 | JMLH | angka qty (boleh desimal) | ✅ |
| 5 | PPN (11%) | angka Rp tax | opsional |
| 6 | TOTAL HARGA | angka Rp = HARGA × JMLH + PPN | ✅ |

### Aturan data
- Stop parsing kalau NAMA BAHAN kosong ATAU mengandung `TOTAL` / `JUMLAH`.
- TOTAL HARGA = 0 → skip baris (template kosong).
- Nama bahan: UPPERCASE konsisten, tanpa singkatan ambigu.

---

## Format Data

| Tipe | Format | Contoh |
|---|---|---|
| Tanggal expired | `YYYY-MM-DD` | `2026-06-30` |
| Angka rupiah | murni angka | `45000` |
| Qty | angka pakai titik desimal | `2.5` |
| Unit | UPPERCASE | `KG`, `PCS`, `BOTOL`, `IKAT` |

### Unit standar
`KG`, `GR`, `LITER`, `ML`, `PCS`, `BUNGKUS`, `BOTOL`, `BOX`, `IKAT`, `BIJI`, `LEMBAR`

---

## Contoh Data Bersih

| NAMA BAHAN | EXPIRED | UNIT | HARGA | JMLH | PPN (11%) | TOTAL HARGA |
|---|---|---|---|---|---|---|
| MINYAK GORENG FORTUNE | 2026-09-15 | LITER | 18000 | 5 | 9900 | 99900 |
| BERAS PREMIUM | 2026-12-01 | KG | 15000 | 10 | 16500 | 166500 |
| KECAP BANGO | 2027-02-28 | BOTOL | 12000 | 8 | 10560 | 106560 |

---

## Checklist sebelum Output

- [ ] Periode di row 6 jelas: `DD-DD BULAN YYYY`
- [ ] Header tepat di row 9 (0-based)
- [ ] Data mulai row 10
- [ ] Tidak ada baris kosong/total di tengah data
- [ ] Nama bahan UPPERCASE, tanpa noise (cth: hapus `(EXP. 15/9)` di nama, pindah ke kolom EXPIRED)
- [ ] Cek matematika: `TOTAL = HARGA × JMLH + PPN` (toleransi ±100)
- [ ] Unit pakai daftar standar

---

## Output Akhir

```
✅ Baris valid    : 25
⚠ Baris di-skip  : 3 (NAMA BAHAN kosong / TOTAL=0)
🔧 Perubahan:
   - Periode parsed → 22-31 JANUARI 2026
   - Nama bahan normalisasi UPPERCASE: 17 baris
   - Format tanggal expired → YYYY-MM-DD: 5 baris
   - Unit dirapikan ke daftar standar: 8 baris
```

Owner upload file output ke `/laporan/upload-pergantian`.
