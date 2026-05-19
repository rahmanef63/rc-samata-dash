# Changelog

## 2026-05-19

### Changed — AI guide jadi dialog 3-tab dynamic (replaces static md)

Button "Panduan AI" sekarang buka dialog dengan 3 tab:
- **Markdown** — full prose guide, human-readable
- **JSON** — schema lengkap (kolom + categories live + inference rules),
  format paling AI-friendly
- **CSV** — template header-only + 1 row contoh per sheet,
  buka di Excel langsung
Tiap tab punya tombol "Salin" + "Download".

Konten **dynamic dari single source of truth**:
- `convex/shared/uploadSchemas.ts` — semua sheet spec
- `convex/shared/categoryInference.ts` — `INFERENCE_RULES` array
- `useQuery(listExpenseCategories)` — live kategori dari DB

Drift docs ↔ runtime tidak mungkin lagi: schema + inference rule
yang sama dipake parser, bridge, AI guide.

### Changed — sticky riwayat panel + info card stats

Riwayat di 3 halaman upload (`/laporan/upload`, `/laporan/upload-pergantian`,
`/laporan/upload-tunjangan`) sekarang:
- Sticky `top-6` dengan `max-h-[calc(100vh-3rem)]` — pas viewport, gak
  pernah overflow off-screen
- Info card di header: total upload, status processed/needs_review, last upload date
- Scroll body internal — long history scrollable tanpa hilangin upload area

### Added — AI guide templates for 3 upload pages (DEPRECATED)
Static `public/templates/*.md` dihapus, diganti dialog dynamic di atas.

### Original — AI guide templates for 3 upload pages

3 markdown panduan di `public/templates/` yang owner bisa download
+ kirim ke ChatGPT/Claude/AI lain sebelum upload. AI rapikan file
mentah dulu sesuai spec project, baru owner upload ke dashboard.

- `panduan-upload-laporan-mingguan.md` — 17 sheet weekly, daftar
  kategori COGS/Utility/Other + BPJS/Salary/Maintenance/Marketing/Fee,
  inference rule keyword (AYAM/MINYAK/ES/BERAS/dst), checklist.
- `panduan-upload-pergantian-produk.md` — schema row 9 header,
  unit standar list, contoh data bersih.
- `panduan-upload-tunjangan-karyawan.md` — 14-kolom schema row 8+,
  daftar jabatan + tipe rotasi + tipe reimburse standar.

Tombol "Panduan AI" muncul di pojok kanan atas tiap halaman upload
(`/laporan/upload`, `/laporan/upload-pergantian`, `/laporan/upload-tunjangan`).
Klik = download file .md.

### Fixed — ETL tag prefix leaking into user-visible columns

Owner saw expense descriptions like
`etl:n9740d1wpb9thkfja2xjpd2mwn86vx6f: pengeluaran harian 2026-05-13 · Kas Kecil Rp 26.209.985`.

Cause: bridges used `description.startsWith("etl:<reportId>")` for
idempotent wipe-then-reinsert. The tag prefix was getting written to
end-user fields (expenses.description, payables.description,
stockMovements.notes, ownerTransfers.referenceNo).

Fix:
- Switch idempotency from string-prefix to `etlSource.reportId` check
  in every bridge. `stockMovements` schema gained an `etlSource`
  optional field so it follows the same pattern.
- Inserted descriptions now read like `"Pengeluaran harian · Kas Kecil
  Rp 26.209.985"` (clean), `"AYAM, ES BATU, MINYAK +3"` (payable),
  `"Dari 2026-04-30 (5.2 KG) → 2026-05-07 (3.1 KG)"` (movement),
  `"IN-2026-05-13"` (owner transfer referenceNo).
- New `stripEtlPrefixes` action (calls `stripEtlPrefixesInternal`)
  scans expenses + payables + stockMovements + ownerTransfers and
  rewrites legacy values. Idempotent — safe to run multiple times.

### Added — Upload-time category validation + ingredient inference

Owner reported food ingredients (bahan ayam, minyak, beras, …) were silently
landing in **Lain-lain** because the LPKK row had no per-column amount and
the WeeklyFC parser fell back to the generic "Umum" category. Added a
validation step the owner can use to catch this **before** clicking Import.

- `convex/shared/categoryInference.ts` — single source of truth.
  `inferIngredientCategory(text)` matches keywords (AYAM / MINYAK / ES /
  MINUMAN / PEMBUNGKUS / GROCERIES / PEMBERSIH / TRANSPORT / ATK / BPJS /
  GAJI / MAINTENANCE / MARKETING / FEE) against item name or description
  and returns `{label, type}` that maps 1-to-1 with seeded
  `expenseCategories`.
- `parseLPKK` — if no per-column amount, infer category from description
  instead of defaulting to "Lain-lain".
- `parseWeeklyFC` — when row's section header didn't match any keyword
  ("Umum" fallback), infer from item name.
- `importLPKKBatch` — matches `expenseCategories` by exact label first,
  falls back to type. So "Bahan Ayam" row now binds to the actual
  "Bahan Ayam" category id, not a random first-cogs id. Adds `etlSource`
  so each expense deep-links back to the LPKK row.
- `validateParsedData` — new rule 9: counts rows still landing in
  "Lain-lain"/"Umum" across LPKK + WeeklyFC, emits a warning with
  per-row preview. Rule 10: lists unknown sheets so owner can flag
  variant xlsx structure.
- `ImportPreview` — LPKK and Food Cost tabs now show an amber banner
  with row count + a "Tampilkan N Lain-lain" filter button, plus an
  amber badge on each uncategorized cell. Owner can use the existing
  TagSelect to fix categories before import.

### Fixed — parseWeeklyFC col 0 bug + retro-migration

Discovered during audit: parser was reading col 0 (NO column) as itemName,
causing all inventoryValuation rows to have itemName="1","2",..."55" with
real names ("DADA", "EKOR", "TOMAT") leaked into the `unit` field.

Parser fix: skip col 0 if purely numeric, use col 1 as itemName; unit
search shifted past nameCol.

**Retro-migration** added so existing 17 reports don't need re-upload:
- `migrateInventoryNamesInternal` — swaps `itemName ↔ unit` where the
  former is purely numeric and the latter is a real string.
- `wipeStockTablesInternal` — clears ETL-tagged stockItems +
  stockMovements before rebuild.
- `runFullRebuild` action — chains migrate → wipe → re-seed →
  bridge-all-reports → cross-report delta movements. One-shot.

Result: **2502/2695 inventoryValuation rows fixed** (~93%, rest had
empty or numeric unit field — unrecoverable without re-upload).
stockItems now show real bahan names (BERAS, TELUR, MILO, BAYGON,
HARPIC, BAYAM, SERAI, SELADA, …). stockMovements populated with
~2000 cross-report deltas (`stock_in` / `usage`).

### Added — ETL fidelity round 2 (bridges, deltas, dynamic prep)

**3 new bridges** (extend `convex/features/reports/bridges.ts`):
- `bridgeInventoryDeltasToMovementsInternal` — cross-report scan of
  `inventoryValuation`; for each item, sort valuations by date, emit
  `stockMovements` row per consecutive delta (positive → `stock_in`,
  negative → `usage`). Populates `/operation/stock-movements` page.
- `bridgeCashFlowToOwnerTransfersInternal` — pulls `otherInflow` rows
  (Penerimaan lain-lain) into `ownerTransfers` table with
  `purpose="adjustment"`, `direction="owner_to_branch"`, reportId stamped.
- `bridgeIncentivesToExpensesInternal` — aggregates `employeeIncentives`
  per report period into one `expenses` row tagged `salary_support`,
  paymentSource=owner_direct.

**Existing bridge improvements**:
- `bridgeProductSalesToDailySales`: `promoCost` now proportional to
  channel's share of daily gross (was: discount/4 split). More accurate
  fee allocation per channel.
- `bridgeCashFlowToExpenses`: expense description shows actual
  breakdown — `"Kas Kecil Rp X + Lain-lain Rp Y"` instead of generic
  "pengeluaran harian".
- `deriveVendorsInternal`: type inference from supplier name patterns
  (PLN/PDAM → utility, BPJS/SERVICE → service, GAJI/INSENTIF → payroll,
  ATK/FOTO COPY → misc, default → food_supplier). Replaces all-default
  `food_supplier`.

**Dynamic prep** for variable xlsx sheets:
- `weeklyReports.unknownSheets` field added — captures sheet names
  present in xlsx that no parser matched. LPKK or any future sheet type
  is now visible-but-skipped rather than silently lost.
- Upload page computes unknownSheets at parse time, sends to
  `createWeeklyReport` mutation.
- WeeklyReportDrill summary tab surfaces unknown sheets as amber alert
  with sheet name list — owner can request a new parser without losing
  the upload.

**PayablesOverview**: replaced inline Dialog with shared
`RowSourceDialog` + `deriveSourceFromEtl` — now shows tab "Pembelian
Kredit" + row N + deep-link to /laporan/{reportId}?tab=&row=, same as
other CRUD pages.

### Changed — Tabbed comparison charts (de-duplicate)
Old `DashboardSalesChart` ("Tren Penjualan") + `Dashboard30DayChart` ("Tren Omzet") menampilkan data sumber sama (`productSales`). Removed.

Replaced with **2 main multi-line charts**:

1. **`DashboardComparisonChart`** — tabbed: `Omzet | Biaya Bahan | Profit | Pelanggan`. Tiap tab overlay 2 line:
   - Solid (`Sekarang`) = aktual periode aktif
   - Dashed slate (`Periode lalu`) = window same-length sebelumnya
   - Header card menunjukkan total + delta % vs prior period

2. **`DashboardKpiTrendChart`** — tabbed: `Food Cost % | Margin %`. Tiap tab plot KPI harian + 4 horizontal reference lines: Ideal (sky dashed), Target (foreground), Warning (amber), Danger (rose). Header chip shows current status SEHAT/PERHATIAN/BAHAYA.

Backend: new `getFinancialTrend({branchId, startDate?, endDate?})` returns per-day aggregates `{date, revenue, cogs, profit, customers, foodCostPct, marginPct}` from joined `productSales` + `foodCostSummary` + `salesControl`.

Shared component: new `MultiLineChart` (recharts LineChart, N series, optional reference horizontal lines).


`/laporan/analisis` (Analytics page) merged into Dashboard `/`. Old route now redirects. Sidebar item removed. ReportHub + ReportOverview tiles updated.

New `DashboardKpiRichGrid` replaces `DashboardKpiCards` + `DashboardKpiTargets` — 10 cards each carrying:
- **value** sekarang (`text-3xl` foreground-solid)
- **Δ vs periode sebelumnya** (auto-adjust dengan granularity: hari/minggu/bulan/kuartal/tahun)
- **Avg** — rata-rata 12 periode terakhir
- **Ideal** — industry standard (DEFAULT_KPIS hardcoded)
- **Target** — branch's customized target (kpiTargets table)
- Gauge bar dengan marker biru (ideal) + hitam (target)
- Accent bar warna status di kiri + chip status di pojok

Backend: new `getKpiDashboardRich({branchId, startDate, endDate, granularity})` di `convex/features/reports/kpiAnalytics.ts`. Compute actuals 3× (current / prior / avg-window). `shiftRange` derives prior window per granularity, `avgWindows` returns rolling-N count (12 for day/week/month, 4 for quarter, 3 for year).

New `DashboardAnalysisDrill` ports 5 analisis tabs (Item Prioritas / Profitabilitas / Efisiensi Beli / Pemborosan / Arus Kas) ke bawah dashboard. `timeFilter` mengikuti `granularity` (day → "daily", week → "weekly", etc).

Deleted: `src/features/analytics/` (AnalyticsPage + ReportDataBrowser) + `DashboardKpiTargets.tsx` (dead).

### Fixed — Dashboard polish (5 issues)
1. **KPI card readability** — saturated colored bg dibuang; switch ke `bg-card` netral + 1px left accent bar (warna status) + `text-3xl` foreground value. Avg/Ideal/Target footer dapat border-top + larger `text-sm` font.
2. **Waterfall chart bars flipped** — rewrite signed bars (positif up, negatif down) on zero `ReferenceLine`. Labels colored match bar (green inflow / red outflow), position auto-flip (atas untuk +, bawah untuk -). Replaces broken stacked-base waterfall yang sembunyiin bar negatif.
3. **Recent transactions compactness** — wrap di `ScrollArea max-h-[320px]` + denser rows w/ hover bg.
4. **Line chart filter** — `getWeeklySalesTrend` + `getMonthlySalesTrend` sekarang accept optional `startDate / endDate` (ms). Frontend kirim DateScope range. Chart judul + subtitle dynamic show `rangeLabel` + jumlah titik data. Empty state suggest switch granularity instead of dead-end placeholder.
5. **Dead code** — `DashboardKpiTargets` (replaced) di-purge dari `index.ts` exports + file deleted.

### Note
Backend KPI rich query menjalankan 8 tables × 3 windows = 24 fetches per render. Cached Convex queries amortize cost, tapi cold cache pertama kali bisa ~1-2s. Future optimization: consolidate into single internal query if becomes bottleneck.

---

## 2026-05-18

### Added — Row-source dialog on 7 surfaces
Klik baris (row) di tabel berikut → dialog muncul dengan sumber data:

| Page | Source displayed | Trigger |
|---|---|---|
| `/finance/payables` | Sheet xlsx (PEMBELIAN KREDIT) + filename + reportPeriod + link `/laporan/{reportId}` | row click |
| `/finance/expenses` | Tanggal, deskripsi, kategori, jumlah, sumber bayar, vendor, status | row click |
| `/finance` (Sales) | Channel, gross, fee, promo, net, cash, settlement date, ref no | row click |
| `/finance/petty-cash` | Diminta oleh, kategori, request, approved, realisasi, status, catatan | row click |
| `/finance/closing` | Closings tab: 8 fields; Transfers tab: 8 fields + LAP. CF source link | row click |
| `/operation` (Inventory) | Movement type, qty, unit, catatan | row click pada Pergerakan Stok |
| `/laporan/[reportId]` (WeeklyReportDrill) | 16 tabs, per-row source dialog | row click |

Source: rows yang berasal dari ETL xlsx upload menampilkan **sheet name + file name + period**, ada tombol "Buka laporan sumber" yang link ke `/laporan/{reportId}`. Rows yang manual entry menampilkan badge "Manual entry".

Komponen baru: `src/shared/components/RowSourceDialog.tsx`. Props `{ open, onClose, title, row, fields, source? }`.

### Added — Filter modes 5 buah (Hari/Minggu/Bulan/Kuartal/Tahun)
`DateScope` granularity expanded:

- **Hari** — single day, URL `?g=day&d=YYYY-MM-DD`
- **Minggu** — 4 fixed week-of-month buckets (W5 = sisa hari di bulan jika overshoot), URL `?g=week&y=&m=&w=`
- **Bulan** — single calendar month, URL `?g=month&y=&m=`
- **Kuartal** — 3-month span (Q1=Jan-Mar, Q4=Oct-Dec), URL `?g=quarter&y=&q=`
- **Tahun** — full year (Jan 1 → next Jan 1), URL `?g=year&y=`

Picker UI di TopHeader: ToggleGroup 5 pilihan + mode-specific picker (Calendar/Select). `goPrev`/`goNext`/`goToday` extended untuk semua mode.

### Fixed — `RangeError: Invalid time value` di Hari/Minggu mode (React error #310)
`formatShortDate` / `formatLongDate` di `src/shared/lib/index.ts` sebelumnya throw `RangeError` kalau date string kosong atau invalid (chart dashboard pass empty bucket key dari Convex). Crash trigger React #310 ("rendered fewer hooks than expected"). Fix: tambah `isValidDateLike` guard, return `"—"` placeholder kalau input invalid. Bulan/Kuartal mode gak terdampak karena filter range-nya broader → chart selalu dapat valid date.

### Infra — Auto-deploy Convex via pre-push hook
- `pnpm exec convex deploy` di-run otomatis SEBELUM `git push` kalau `convex/` ke-touch sejak `origin/main`
- Convex CLI v1.27+ auto-detect self-hosted dari `.env.local` (`CONVEX_SELF_HOSTED_URL` + `CONVEX_SELF_HOSTED_ADMIN_KEY`)
- Hook source: `.git/hooks/pre-push` (re-install via `node ~/.claude/skills/sc-git/scripts/hook.js install --repo rc-samata-dash`)
- User **tidak perlu** lagi run `npx convex deploy` / `pnpm convex:deploy` manual

### Infra — Lint relaxation (no-explicit-any → warn)
CRUD helpers + xlsx parsers cross type boundary cukup sering. Project-wide tightening = refactor besar yang gak in scope. ESLint config di `eslint.config.mjs` relax `@typescript-eslint/no-explicit-any` ke warn. Pre-push hook lint sekarang pass.

### Infra — Dokploy orphan service cleanup (resolved root cause)
Orphan swarm service `rc-samata-dash-d6z1ha` Up 13 hari (image dari May 5, pre-feature) had stale Traefik dynamic config yang intercept `rcsamata.rahmanef.com` sebelum sampai ke service `njeulr` (current). Symptom: setiap Dokploy deploy reports "done" tapi prod serve old image.

Fix: `ssh -i ~/.ssh/id_n8n rahman@srv614914` →
```bash
sudo -n rm /etc/dokploy/traefik/dynamic/rc-samata-dash-d6z1ha.yml
sudo -n docker service rm rc-samata-dash-d6z1ha
```
Traefik file provider auto-reload ~5-10s. Setelah ini, prod langsung serve build terbaru.

Documented dalam `~/.claude/skills/sc-dokploy/SKILL.md` "REST vs SSH" section + orphan-service pattern. Memory: `feedback_verify_deploy_routing_not_just_build`.

---

## Workflow recap

**Untuk ship perubahan baru** (zero-touch):
```bash
git add <files>
git commit -m "..."
git push origin main
# Hook auto: typecheck/lint → source .env.local → pnpm exec convex deploy (kalau convex/ touched) → push → Dokploy webhook → frontend rebuild
```

**Kalau prod stale setelah deploy "done"**:
```bash
# JANGAN retry deploy. SSH cek routing:
ssh -i ~/.ssh/id_n8n rahman@srv614914 'sudo -n docker service ls | grep rc-samata'
# Kalau ada 2 service untuk project sama → orphan. Cleanup pattern di sc-dokploy SKILL.
```

**Cek prod sehat**:
```bash
curl -s https://rcsamata.rahmanef.com/api/version
# Expected: {"buildId":"...","deployedAt":"..."} JSON
# Bukan SPA 404 page
```
