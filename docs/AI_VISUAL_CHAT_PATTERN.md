# RC Samata — AI Visual Chat Pattern

Panduan ini menjelaskan pola terbaik untuk menerapkan fitur AI chat dengan `custom instruction`, `skills/tools`, `agents`, dan output visual terstruktur agar bisa dipakai ulang di feature lain.

Dokumen ini sengaja memisahkan:
- konteks domain
- kemampuan tool
- orkestrasi agent
- kontrak visual UI

Itu membuat implementasi mudah dipindah ke feature lain tanpa menyalin prompt atau logic bisnis secara acak.

## Tujuan Pattern

Gunakan pattern ini jika sebuah feature butuh:
- chat AI yang menjawab dari data feature tersebut
- jawaban yang kadang berupa teks, kadang berupa visual
- tools/skills yang bisa diaktifkan/nonaktifkan dari admin
- agent yang bisa memilih tools secara konsisten

Contoh feature yang cocok:
- dashboard analytics
- finance
- inventory
- audit
- HR / payroll
- CRM / sales pipeline

## Prinsip Arsitektur

### 1. Pisahkan 4 lapisan

Selalu pisahkan implementasi ke 4 lapisan ini:

1. `Instruction`
- aturan gaya jawab
- konteks bisnis/domain
- kapan AI boleh jawab langsung
- kapan AI wajib pakai tool

2. `Tool / Skill Manifest`
- daftar kemampuan yang tersedia
- deskripsi tiap tool
- syntax guide / routing guide
- bukan tempat logika query besar

3. `Agent`
- workflow tingkat atas
- memilih tool atau menyusun analisis multi-langkah
- bukan tempat render UI

4. `Visual Contract`
- shape data yang dirender UI
- stabil dan generik
- tidak bergantung pada domain tertentu

Jika 4 lapisan ini tercampur, feature akan sulit dipakai ulang.

### 2. Data tool dan visual tool jangan disatukan

Best approach:
- `data tools` mengambil atau menghitung data domain
- `visual tools` membungkus hasil data menjadi payload renderable

Jangan membuat satu tool yang:
- query data
- formatting narasi
- sekaligus menentukan UI detail

Itu membuat tool sulit dipakai ulang.

### 3. Custom instruction harus tipis

Custom instruction bukan tempat menaruh semua aturan bisnis.

Isi instruction sebaiknya hanya:
- identitas assistant
- gaya bahasa
- guardrails
- kapan wajib pakai data/tool
- kapan wajib menampilkan visual

Jangan masukkan:
- daftar query detail
- struktur JSON panjang
- contoh domain terlalu banyak

Yang detail pindahkan ke manifest tools/agents.

## Pola yang Disarankan

### A. Custom Instruction

Gunakan instruction default seperti ini:

1. Identitas domain
- siapa assistant ini
- domain bisnis apa yang dibantu

2. Response rules
- bahasa
- tingkat keringkasan
- format angka/tanggal
- larangan mengarang data

3. Tool rules
- pertanyaan data aktual -> wajib tool
- pertanyaan visual -> data tool dulu, lalu visual tool
- pertanyaan konseptual sederhana -> boleh jawab langsung

4. UI-aware rules
- chart / KPI / tabel / action list akan dirender otomatis
- assistant tidak perlu menulis placeholder seperti "lihat chart di bawah"

Instruction sebaiknya dianggap sebagai policy, bukan engine.

### B. Tool / Skill Manifest

Gunakan 2 kelompok tool:

#### 1. Data tools

Contoh:
- `sales_trend`
- `expense_breakdown`
- `inventory_alerts`
- `audit_findings`
- `customer_summary`

Output terbaik untuk data tools:
- `summary` singkat
- `raw` terstruktur

`raw` harus stabil karena akan dipakai lagi oleh:
- visual builder
- agent
- synthesis final

#### 2. Visual tools

Tool visual harus generik dan reusable lintas feature:
- `generateChart`
- `generateKPICards`
- `generateComparisonTable`
- `generateActionList`
- `generateTable`

Jangan buat tool visual per-domain seperti:
- `generateInventoryPieForGudang`
- `generateAuditBranchHeatmap`

Lebih baik:
- data domain-specific
- visual generic

## Kontrak Visual Standar

Gunakan kontrak visual yang stabil dan generik.

### `chart`

Dipakai untuk:
- tren
- proporsi
- waterfall

Shape:

```ts
{
  type: "chart",
  title: string,
  subtitle?: string,
  variant: "area" | "pie" | "waterfall",
  data: Array<Record<string, string | number>>
}
```

### `kpi_cards`

Dipakai untuk:
- snapshot performa
- status utama

```ts
{
  type: "kpi_cards",
  title: string,
  subtitle?: string,
  items: Array<{
    label: string,
    value: string,
    badge?: string,
    tone?: "default" | "success" | "warning" | "destructive"
  }>
}
```

### `comparison_table`

Dipakai untuk:
- actual vs target
- cabang A vs cabang B
- before vs after

```ts
{
  type: "comparison_table",
  title: string,
  subtitle?: string,
  columns: string[],
  rows: string[][],
  summary?: string
}
```

### `action_list`

Dipakai untuk:
- rekomendasi prioritas
- follow-up
- next actions

```ts
{
  type: "action_list",
  title: string,
  subtitle?: string,
  items: Array<{
    title: string,
    description?: string,
    priority?: "high" | "medium" | "low",
    impact?: string
  }>
}
```

### `table`

Dipakai untuk:
- transaksi
- item audit
- data rinci

```ts
{
  type: "table",
  title: string,
  subtitle?: string,
  columns: string[],
  rows: string[][]
}
```

## Pattern Implementasi di Feature Lain

Setiap feature baru sebaiknya mengikuti checklist ini.

### 1. Tambah data tool feature-specific

Contoh untuk inventory:
- `inventory_stock_status`
- `inventory_fast_moving`
- `inventory_dead_stock`

Output:
- summary
- raw yang stabil

### 2. Reuse visual contract yang sama

Jangan buat shape visual baru kalau use case masih muat di:
- chart
- kpi_cards
- comparison_table
- action_list
- table

Tambah shape baru hanya jika benar-benar tidak muat.

### 3. Reuse visual renderer yang sama

UI chat sebaiknya punya satu renderer pusat yang menerima `VisualBlock[]`.

Feature lain tidak perlu membuat renderer chat sendiri jika bloknya masih memakai kontrak standar.

### 4. Tambah agent hanya jika workflow multi-step

Buat `agent` baru hanya jika memang perlu:
- memilih beberapa tool
- melakukan sintesis bertahap
- menahan aturan khusus domain

Jangan buat agent baru jika cukup satu data tool + satu visual tool.

Rule praktis:
- pertanyaan sederhana -> router + tool
- pertanyaan kompleks lintas sumber -> agent

## Template Adopsi ke Feature Baru

Gunakan langkah ini saat menerapkan ke feature lain:

1. Tentukan pertanyaan utama user di feature itu
2. Turunkan menjadi 3-6 data tools domain
3. Pastikan tiap data tool mengembalikan `raw` yang terstruktur
4. Petakan hasil tool ke visual contract standar
5. Tambahkan rules routing di tool manifest
6. Jika perlu orkestrasi multi-step, tambahkan agent domain
7. Render output lewat renderer pusat
8. Simpan payload visual bersama message agar histori chat tetap utuh

## Anti-Pattern yang Harus Dihindari

Jangan lakukan ini:

- menaruh semua logic di custom instruction
- menaruh semua logic di satu tool "serbaguna"
- menyimpan hanya teks final tanpa payload visual
- membuat visual shape baru untuk setiap feature
- membiarkan model bebas mengarang format visual
- membuat agent yang langsung hardcode query UI

Akibatnya:
- sulit dites
- sulit dipakai ulang
- output UI tidak stabil

## Rekomendasi Struktur Folder

Untuk feature lain, pakai pola berikut:

```text
convex/features/<feature>/queries.ts
convex/features/<feature>/mutations.ts
convex/features/ai/toolManifest.ts
convex/features/ai/actions.ts

src/features/ai-visual/
  components/
  types/
  index.ts
src/features/<feature>/components/
src/features/ai/types/index.ts
src/features/ai/hooks/useAiChat.ts
```

Jika jumlah visual makin besar, pisahkan:

```text
src/features/ai-visual/components/
  ChatVisualRenderer.tsx
  ChatComparisonTable.tsx
  ChatActionList.tsx
```

## Checklist Review Sebelum Reuse

Sebelum menerapkan ke feature lain, cek:

- apakah data tool sudah punya output `raw` yang stabil
- apakah instruction hanya berisi policy, bukan logic data
- apakah agent memang diperlukan
- apakah visual contract masih bisa reuse
- apakah message history menyimpan payload visual
- apakah build, lint, dan typecheck lolos

## Keputusan Desain yang Disarankan untuk RC Samata

Untuk codebase ini, approach terbaik adalah:

1. `instruction` tetap tipis dan domain-aware
2. `tool manifest` menjadi pusat kemampuan AI
3. `data tools` tetap memakai query RC Samata yang sudah ada
4. `visual tools` tetap generik dan reusable
5. `agents` dipakai hanya untuk orkestrasi
6. `src/features/ai-visual/ChatVisualRenderer` menjadi satu pintu render untuk semua feature

Dengan pola ini, fitur yang sama bisa dipindahkan ke:
- analytics chat
- finance copilot
- inventory assistant
- audit assistant

tanpa mengulang desain dari nol.
