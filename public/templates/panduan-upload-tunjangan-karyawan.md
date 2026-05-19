# Panduan AI — Upload Tunjangan Karyawan (RC Samata)

> Kirim panduan ini + file Excel mentah ke ChatGPT / Claude / AI.
> Minta AI rapikan sebelum upload ke `/laporan/upload-tunjangan`.

---

## Prompt Sistem (copy-paste ke AI)

```
Kamu asisten data RC Samata. Saya kirim form Excel pengajuan
tunjangan khusus karyawan (luar kota, kost, subsidi transport).
Rapikan sesuai panduan. JANGAN ubah angka. Output 1 file .xlsx
+ ringkasan perubahan.
```

---

## Konteks

Tunjangan Khusus = 3 jenis subsidi yang diberi ke karyawan
yang ditempatkan jauh dari domisili:

1. **Luar Kota** — tunjangan bulanan rotasi keluar kota
2. **Subsidi Transport** — uang bensin/transport harian
3. **Budget Kos/Kontrakan** — subsidi akomodasi bulanan

Data masuk ke table `employeeAllowances`.

---

## Struktur Sheet

- **Nama sheet**: parser baca sheet pertama (biasanya bernama `1.` atau `Sheet1`).
- **Layout** (row 0-based):

| Row | Isi |
|---|---|
| 1 | Title: `PENGAJUAN TUNJANGAN KHUSUS (LUAR KOTA, KOST DAN SUBSIDI TRANSPORT)` |
| 2 | Tahun: `TAHUN 2026` |
| 3 | Meta: STORE, AREA, REGION, TANGGAL PENGAJUAN |
| 5-7 | Header merged cells (lihat layout kolom di bawah) |
| 8-22 | Data rows (15 baris karyawan, sebagian boleh kosong) |

### Layout Kolom (0-based)
| Col | Label | Tipe | Wajib |
|---|---|---|---|
| 0 | NO | nomor urut | - (auto) |
| 1 | NAMA LENGKAP | string | ✅ |
| 2 | TGL MASUK | tanggal `YYYY-MM-DD` | opsional |
| 3 | JABATAN | string | opsional |
| 4 | STORE AWAL (TRAINEE) | string | opsional |
| 5 | STORE PENEMPATAN | string | opsional |
| 6 | ROTASI ANTAR | string (kota/area) | opsional |
| 7 | JARAK | string + satuan | opsional |
| 8 | WAKTU TEMPUH | string | opsional |
| 9 | LUAR KOTA | angka Rp tunjangan | opsional |
| 10 | SUBSIDI TRANSPORT | angka Rp | opsional |
| 11 | BUDGET KOS | angka Rp | opsional |
| 12 | REIMBURSE | string `MASUK GAJI` / `REIMBURSE` / `-` | opsional |
| 13 | KETERANGAN KOS | string catatan | opsional |

### Aturan data
- Skip baris kalau NAMA LENGKAP kosong.
- Skip baris kalau NAMA LENGKAP mengandung `NAMA` atau `TOTAL`.
- Tunjangan = 0 → tetap di-import (record kehadiran nama).

---

## Format Data

| Tipe | Format | Contoh |
|---|---|---|
| Tanggal | `YYYY-MM-DD` | `2024-08-15` |
| Angka Rp | murni angka, tanpa Rp/titik/koma | `750000` |
| Jarak | string `<angka> KM` | `120 KM` |
| Waktu tempuh | string | `2 jam 30 menit` |
| Nama karyawan | UPPERCASE | `BUDI SETIAWAN` |
| Store | UPPERCASE singkat | `RC SAMATA`, `RC LAINNYA` |

---

## Daftar Jabatan Standar

Pakai EXACT label ini di kolom JABATAN:

- `Manager`
- `Asst. Manager`
- `Supervisor`
- `Captain`
- `Crew`
- `Trainee`
- `Cashier`
- `Cook`
- `Helper Kitchen`
- `Cleaner`
- `Driver`
- `Admin`

Variasi penulisan → AI normalisasi ke salah satu di atas.

---

## Tipe Rotasi Standar

- `Rotasi Antar Kota`
- `Rotasi Antar Cabang`
- `Penempatan Awal`
- `Trainee → Permanent`

---

## Tipe Reimburse

| Label | Arti |
|---|---|
| `MASUK GAJI` | Tunjangan ditambahkan ke gaji bulanan |
| `REIMBURSE` | Karyawan klaim ke kasir setiap bulan |
| `LANGSUNG TRANSFER` | Owner transfer ke rekening karyawan |
| `-` | Tidak ada / belum ditentukan |

---

## Contoh Data Bersih

| NO | NAMA LENGKAP | TGL MASUK | JABATAN | STORE PENEMPATAN | LUAR KOTA | SUBSIDI TRANSPORT | BUDGET KOS | REIMBURSE |
|---|---|---|---|---|---|---|---|---|
| 1 | BUDI SETIAWAN | 2024-08-15 | Supervisor | RC SAMATA | 500000 | 300000 | 800000 | MASUK GAJI |
| 2 | SARI WULAN | 2025-01-10 | Cook | RC SAMATA | 0 | 200000 | 0 | REIMBURSE |
| 3 | ANDI PRATAMA | 2025-03-22 | Crew | RC SAMATA | 0 | 150000 | 600000 | MASUK GAJI |

---

## Checklist sebelum Output

- [ ] Header tepat di row 5-7 (boleh merged)
- [ ] Data mulai row 8
- [ ] Maksimum 15 karyawan (row 8-22). Lebih dari itu → buat sheet kedua.
- [ ] Nama lengkap UPPERCASE
- [ ] Tanggal masuk `YYYY-MM-DD`
- [ ] Semua kolom Rp murni angka
- [ ] Jabatan match daftar standar
- [ ] Reimburse match daftar standar
- [ ] Tidak ada formula Excel (semua sudah jadi nilai)

---

## Output Akhir

```
✅ Karyawan valid : 8
⚠ Baris di-skip  : 2 (nama kosong)
🔧 Perubahan:
   - Nama UPPERCASE: 8 baris
   - Tanggal masuk ke YYYY-MM-DD: 6 baris
   - Jabatan normalisasi: 4 baris (cth: "SPV" → "Supervisor")
   - Rp dirapikan jadi angka murni: 18 cell
```

Owner upload file output ke `/laporan/upload-tunjangan`.
