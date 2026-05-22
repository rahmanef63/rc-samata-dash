# SSOT Status — Buku Besar sebagai Source of Truth

Snapshot per **2026-05-22** sehabis Ship A → F. Caveman style intentional.

Buku Besar = `transactions` table di `convex/features/transactions/`. Semua proyeksi keuangan (sales, expenses, payables, closings, transfers, receipts, bank entries) **mirror dua arah**: create proyeksi → insert tx, delete tx → cascade hapus proyeksi.

---

## ✅ SUDAH (Ship A → F)

### Ship A/B — Weekly Report cascade + staging FK
- `deleteWeeklyReport` cascade hapus semua derived (sales/expenses/payables/closings/stock movements/audit logs) lewat `by_source_report` + legacy fallback scan `etlSource.reportId`.
- Staging tables (`stagingExpenses`, `stagingPayables`) dapat `categoryId` FK + dropdown frontend ambil dari master.
- Commit: `e7a5486`, `92c2651`.

### Ship C — Buku Besar 2-way + Setoran Harian delete UI
- `dailyClosings` legacy fallback ditambah: scan `by_branch_date` filter `etlSource.reportId` ATAU `referenceNo` prefix `etl:${reportId}:`.
- `removeClosing` mutation: hapus 1 closing + cascade `transactionId`.
- `DailyClosingsNotionView` wire bulk delete + per-row delete via `useMutation(removeClosing)`.
- Action `repairLegacySourceReportId` di `bridges.ts` walk 4 tables (expenses, payables, dailySales, dailyClosings), patch `sourceReportId` dari `etlSource.reportId`. UI button "Repair Sekarang" di `MasterDataSeed`.
- Commit: `4e531ca`.

### Ship D — Reverse cascade tx → proyeksi
- Schema: tambah `transactionId: v.optional(v.id("transactions"))` + index `by_transaction` di:
  - `dailyClosings`, `ownerTransfers`, `paymentReceipts`, `bankStatementEntries` (closing/_schema.ts)
  - `expenses` (expenses/_schema.ts)
  - `payables`, `payablePayments` (payables/_schema.ts)
  - `dailySales` (sales/_schema.ts)
- `bulkDeleteTransactionsCascade` di `convex/features/transactions/mutations.ts`:
  - Per tx → query 6+1 proyeksi via `by_transaction.eq(transactionId)` → `ctx.db.delete()` direct (bypass cascade-back loop).
  - Cascade `expense.lineItems`, `payable.payments`; null FK di receipts + bank entries.
- Frontend `BukuBesarNotion` switch `bulkDelete` ke `bulkDeleteTransactionsCascade`. Toast: `${txDeleted} tx + ${projDeleted} proyeksi rows dihapus`.
- Commit: `5f0a19f`.

### Ship E — Full SSOT coverage (manual mutations mirror)
- Audit lewat Explore agent: catat semua create mutation yang skip mirror.
- Tambah `mirrorTx` call di:
  - `closing/mutations.ts` → `createClosing` (kind=`receipt`, dir=`in`, amt=`actualCash+nonCashSales`)
  - `closing/mutations.ts` → `importDailyClosings` (per-row mirror)
  - `closing/mutations.ts` → `createTransfer` (kind=`transfer`, dir=`owner_to_branch?in:out`)
  - `closing/mutations.ts` → `createPaymentReceipt` (kind=`payment`, dir=`out`)
  - `sales/mutations.ts` → `create` (kind=`receipt`, dir=`in`, amt=`netAmount`)
  - `expenses/mutations.ts` → `create` (kind=`expense`, dir=`out`)
  - `payables/mutations.ts` → `create` (kind=`invoice`)
  - `payables/mutations.ts` → `addPayment` (kind=`payment`, dir=`out`) + patch back txId
- Bridge `bridgeProductSalesToDailySales` & `bridgeCashFlowToExpenses` di `bridges.ts` patch `transactionId` after `mirrorTx`.
- Enum fix: `TX_KINDS` cuma `invoice|payment|receipt|transfer|expense|anomaly`. Drop salah pakai `"closing"`/`"payable"`/`"receipt"` (kas keluar).
- Commit: `626d7c2`.

### Ship F — Audit checklist dropped, Log Audit Clean All
- **Hapus**: `/operation/audit` page + `AuditChecklist` component + frontend QSR template (lib/types/hooks).
- **Hapus**: sidebar entry "Audit" di `routes.ts:99`.
- **Tetap**: `auditLogs` table + `insertAuditLog` helper — semua mutation create/update/delete trail.
- **Tambah**: `audit.remove` (1 log), `audit.removeMany` (bulk), `audit.clearByBranch` (purge per cabang, paginate 2000/batch).
- **UI**: `AuditLogViewer` — tombol merah Clean All toolbar + confirm dialog, hover icon trash per-row → single delete.
- Commit: `ab78c40`.

---

## Tabel Coverage Matrix

| Tabel | Create mirror tx? | Delete cascade tx→? | Delete cascade tx← (proyeksi delete)? |
|-------|-------------------|---------------------|----------------------------------------|
| `transactions` (Buku Besar) | self | — | — |
| `dailySales` | ✅ create + bridge | ✅ patch back txId | ✅ `bulkDeleteTransactionsCascade` |
| `expenses` | ✅ create + bridge | ✅ patch back txId | ✅ cascade + lineItems |
| `payables` | ✅ create | ✅ patch back txId | ✅ cascade + payments |
| `payablePayments` | ✅ addPayment | ✅ patch back txId | ✅ cascade |
| `dailyClosings` | ✅ createClosing + importDailyClosings | ✅ patch back txId | ✅ cascade |
| `ownerTransfers` | ✅ createTransfer | ✅ patch back txId | ✅ cascade |
| `paymentReceipts` | ✅ createPaymentReceipt | ✅ patch back txId | ✅ null FK (jaga history) |
| `bankStatementEntries` | (via validation batch) | ✅ patch back txId | ✅ null FK (statement immutable) |
| `pettyCash`, `stockMovements`, `productSales` | belum (out of SSOT scope) | — | — |
| `auditLogs` | trail-only, bukan financial | — | purge via Clean All |

Legend:
- **Create mirror** = mutation create di table ini auto insert ke `transactions`.
- **Delete cascade tx→** = delete proyeksi row auto delete tx mirror lewat `transactionId` FK.
- **Delete cascade tx←** = delete tx di Buku Besar UI auto bersihin proyeksi rows.

---

## ⏳ BELUM (pending / out of scope)

### Backfill legacy data
- **`repairLegacyTransactionId` action** (deferred dari Ship E).
  - Untuk rows pre-Ship E yang `transactionId == undefined`.
  - Strategy: pair-match per branch+date+amount → patch FK ke tx existing.
  - Risk: ambiguity kalau 2 tx amount sama di tanggal sama.
  - Lokasi rencana: `convex/features/transactions/repair.ts` (belum dibuat).

### Update/patch sync
- Saat ini sync cuma 1-way di create + delete.
- **Update mutation** untuk `sales` + `expenses` belum mirror perubahan amount/category ke tx. Kalau user edit sales row, tx mirror stale.
- Sudah ada `syncTx` di closing/payable/transfer/receipt — pattern bisa di-copy.
- Risk medium: untuk now user delete + recreate biasa pakai.

### Plan `lazy-booping-glacier.md` — Statement Validator UI + Vendor Hub
File plan: `/home/rahman/.claude/plans/lazy-booping-glacier.md`. Belum mulai sama sekali.

**Phase 1 — Backend:**
- `importBankStatementEntries` extend dengan `payableId` + `learnAlias`.
- Query baru `listVendorsWithAggregate` + `getVendorDetail` di `convex/features/payables/queries.ts`.

**Phase 2 — Statement Preview UI:**
- `StatementImportPreview` komponen baru pola `ImportPreview.tsx` (tabs per kategori, inline edit TagCell, link payable combobox).
- `PayableLinkCombo` komponen baru dengan auto-match by amount ± Rp 1500.
- Refactor `StatementSection` di `finance/owner-transfer/page.tsx`.

**Phase 3 — Vendor Hub `/finance/vendors`:**
- List page + detail page (4 tabs: Info, Piutang, Pembayaran, Alias Bank).
- Cross-link dari `PayablesOverview` + validator + master data.

**Phase 4 — Universal table tooling:**
- Migrate 3 Riwayat lists (Bukti Bayar, Statement, Validasi) ke `DataTable` + `useTableState`.
- `DateRangeFilter` reusable component.

Estimasi: 2000-2500 LOC new.

### Tabel non-financial yang belum SSOT
- `pettyCash` — physically tipped ke owner sebagai cash, secara akuntansi udah masuk closing. Skip.
- `stockMovements` — inventory, bukan financial flow. Skip.
- `productSales` — staging dari upload, sudah bridge ke `dailySales`. Skip.
- `inventoryItems`, `masterProducts`, `masterIngredients`, `incomeChannels`, `expenseCategories`, `vendors`, `vendorBankAliases` — master data, bukan transaksi.
- `auditLogs` — trail event, bukan transaksi.

---

## Cara Verify SSOT Masih Konsisten

```bash
# Convex query check — buka dashboard atau:
pnpm exec convex run features/transactions/queries:listByBranch '{"branchId":"<id>"}'

# Vs aggregate proyeksi: count tx == sum(sales+expenses+payables+closings+transfers+receipts)
# Pakai mcp__rc-samata__report_cashflow_by_branch buat sanity check
```

UI smoke test:
1. `/finance/buku-besar` → bulk select 3 row → Delete → cek `/finance` & `/finance/expenses` row hilang.
2. `/finance/closing` → Setoran Harian → delete row → cek `/finance/buku-besar` tx hilang.
3. `/operation/audit/logs` → Clean All → confirm → toast "N log audit dihapus" → list kosong.

---

## File Map Cepat

**Backend SSOT helpers:**
- `convex/features/transactions/_helpers.ts` — `mirrorTx`, `syncTx`
- `convex/features/transactions/mutations.ts` — `bulkDeleteTransactionsCascade`
- `convex/features/reports/bridges.ts` — `repairLegacySourceReportIdInternal/Action`
- `convex/shared/helpers.ts` — `insertAuditLog`

**Per-feature schemas (FK ke transactions):**
- `convex/features/{sales,expenses,payables,closing}/_schema.ts` → semua punya `transactionId` + `by_transaction` index

**Frontend UI:**
- `src/features/buku-besar/components/BukuBesarNotion.tsx` — bulk delete cascade
- `src/features/closing/components/DailyClosingsNotionView.tsx` — delete cascade
- `src/features/audit/components/AuditLogViewer.tsx` — Clean All + per-row delete
- `src/features/settings/components/MasterDataSeed.tsx` — Repair Sekarang button

---

## Commit Trail (chronological)

```
ab78c40  chore(audit): drop checklist, add Clean All + per-row delete on Log Audit  (Ship F)
626d7c2  feat(ssot): manual create mutations mirror to Buku Besar — full coverage    (Ship E)
5f0a19f  feat(ssot): tx → proyeksi cascade — true 2-way Buku Besar SSOT              (Ship D)
4e531ca  feat(ssot): cascade fix legacy + Buku Besar 2-way + Setoran Harian delete UI (Ship C)
92c2651  feat(ssot): staging tables categoryId FK + frontend dropdowns master-sourced (Ship B)
e7a5486  feat(reports): cascade delete weekly report + all derived CRUD/SSOT          (Ship A)
```
