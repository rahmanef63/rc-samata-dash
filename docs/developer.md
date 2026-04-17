# RC Samata Dashboard — Developer Guide

## Setup Lokal

```bash
# Clone
git clone <repo-url>
cd rc-samata-dash

# Install dependencies
pnpm install

# Environment
cp .env.example .env.local
# Edit .env.local:
# NEXT_PUBLIC_CONVEX_URL=https://api-rcsamata.rahmanef.com

# Run dev server
pnpm dev
```

## Konvensi Kode

### File Structure

- **Convex backend**: `convex/features/<nama>/` — `_schema.ts`, `mutations.ts`, `queries.ts`
- **Frontend features**: `src/features/<nama>/` — `components/`, `lib/`, `types/`
- **Pages**: `src/app/(dashboard)/<route>/page.tsx`
- **Shared UI**: `src/components/ui/` (shadcn/ui)
- **Shared logic**: `src/shared/` (constants, helpers, lib)

### Naming

- Components: PascalCase (`DashboardPage.tsx`)
- Utilities: camelCase (`formatRpFull.ts`)
- Convex tables: camelCase (`productSales`, `weeklyReports`)
- Routes: kebab-case (`/laporan/upload`, `/finance/petty-cash`)

### Barrel Exports

Setiap feature folder punya `index.ts` yang re-export semua public components:

```typescript
// src/features/dashboard/index.ts
export { DashboardKpiCards } from "./components/DashboardKpiCards";
export { DashboardSalesChart } from "./components/DashboardSalesChart";
// ...
```

## Menambah Tabel Baru di Convex

1. Tambah definisi di `convex/features/<nama>/_schema.ts`:
   ```typescript
   export const newTable = defineTable({
     field: v.string(),
   }).index("by_field", ["field"]);
   ```

2. Import dan merge di `convex/schema.ts`:
   ```typescript
   import { newTable } from "./features/<nama>/_schema";
   // tambah ke defineSchema({...})
   ```

3. Buat queries di `convex/features/<nama>/queries.ts`
4. Buat mutations di `convex/features/<nama>/mutations.ts`
5. Update `convex/_generated/api.d.ts` (jika tidak bisa run `npx convex dev`)

## Menambah Parser Excel Baru

1. Buat file `src/features/report-upload/parsers/parseNamaSheet.ts`
2. Export type dan parse function:
   ```typescript
   export type NewItem = { field: string; value: number };
   export function parseNewSheet(wb: WorkBook): NewItem[] { ... }
   ```
3. Import dan panggil di `src/app/(dashboard)/laporan/upload/page.tsx`
4. Tambah tab di `ImportPreview.tsx`
5. Buat batch mutation di `convex/features/reports/mutations.ts`

## File Upload Yang Didukung

Project mendukung 3 jenis file upload:

| Jenis | Upload Page | Parser | Convex Table |
|-------|------------|--------|-------------|
| NEW LAP (mingguan) | `/laporan/upload` | 15 parsers di `parsers/` | 14 tables via `weeklyReports` |
| Pergantian Produk | `/laporan/upload-pergantian` | `parseProductChanges.ts` | `productChanges` |
| Form Tunjangan | `/laporan/upload-tunjangan` | `parseAllowances.ts` | `employeeAllowances` |

NEW LAP menggunakan flow `createReport → importBatch × N → finalizeReport`.
Pergantian Produk dan Tunjangan menggunakan flow standalone (langsung `importBatch`).

## Menambah Dashboard Component Baru

1. Buat query di `convex/features/reports/dashboardQueries.ts`
2. Buat component di `src/features/dashboard/components/`
3. Export dari `src/features/dashboard/index.ts`
4. Tambah ke grid di `DashboardPage.tsx`

## TagSelect Component

Untuk kolom yang perlu editable tags (Notion-like dropdown):

```tsx
import { TagSelect, type TagOption } from "@/components/ui/tag-select";

const options: TagOption[] = [
  { value: "cogs", label: "COGS" },
  { value: "utility", label: "Utility" },
];

<TagSelect
  value={currentValue}
  options={options}
  onChange={(v) => handleChange(v)}
  onCreate={(label) => handleCreate(label)} // optional: allow creating new
/>
```

## Validasi Upload

Validasi di `src/features/report-upload/lib/validateParsedData.ts`.

Untuk menambah validasi baru:

```typescript
// Di validateParsedData():
if (someCondition) {
  warnings.push({
    severity: "warning", // "error" | "warning" | "info"
    category: "Category Name",
    message: "Deskripsi masalah",
    details: ["Detail item 1", "Detail item 2"],
  });
}
```

## Testing

```bash
# Type check
npx tsc --noEmit

# Build (includes type check + page generation)
pnpm build

# Lint
pnpm lint
```

## AI Visual Chat Pattern

Untuk feature AI chat yang butuh teks + visual terstruktur + tools/agents reusable, gunakan panduan ini:

- [docs/AI_VISUAL_CHAT_PATTERN.md](./AI_VISUAL_CHAT_PATTERN.md)

Dokumen itu menjelaskan pemisahan `custom instruction`, `data tools`, `visual tools`, `agents`, dan `visual contract` supaya pola yang sama bisa diterapkan di feature lain tanpa copy-paste logic.

## Convex API Types (Manual Update)

Karena `npx convex dev` tidak bisa jalan di CI, update `convex/_generated/api.d.ts` manual saat menambah file Convex baru:

1. Tambah import di bagian atas:
   ```typescript
   import type * as features_newModule_queries from "../features/newModule/queries.js";
   ```

2. Tambah entry di `fullApi`:
   ```typescript
   "features/newModule/queries": typeof features_newModule_queries;
   ```
