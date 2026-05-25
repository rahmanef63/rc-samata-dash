/**
 * Convex Schema — SSOT Aggregator
 *
 * Single-tenant (RC Samata Gowa). No `branches` table — sengaja dihapus
 * 2026-05-23 karena tidak akan ada cabang lain.
 *
 * To add/edit tables, modify the feature's own _schema.ts file.
 */
import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";

// ─── Import feature schemas ────────────────────────────────
import { masterDataTables } from "./features/masterData/_schema";
import { salesTables } from "./features/sales/_schema";
import { expensesTables } from "./features/expenses/_schema";
import { payablesTables } from "./features/payables/_schema";
import { pettyCashTables } from "./features/pettyCash/_schema";
import { closingTables } from "./features/closing/_schema";
import { inventoryTables } from "./features/inventory/_schema";
import { auditTables } from "./features/audit/_schema";
import { reportsTables } from "./features/reports/_schema";
import { aiTables } from "./features/ai/_schema";
import { authExtensionTables } from "./features/auth/_schema";
import { dailyReportValidationTables } from "./features/dailyReportValidation/_schema";
import { transactionsTables } from "./features/transactions/_schema";
import { pocketsTables } from "./features/pockets/_schema";
import { hrTables } from "./features/hr/_schema";
import { waAuditTables } from "./features/waAudit/_schema";
import { universalUploadsTables } from "./features/universalUploads/_schema";

// ─── Merge all feature tables into one schema ───────────────
export default defineSchema({
  ...authTables,
  ...authExtensionTables,
  ...masterDataTables,
  ...salesTables,
  ...expensesTables,
  ...payablesTables,
  ...pettyCashTables,
  ...closingTables,
  ...inventoryTables,
  ...auditTables,
  ...reportsTables,
  ...aiTables,
  ...dailyReportValidationTables,
  ...transactionsTables,
  ...pocketsTables,
  ...hrTables,
  ...waAuditTables,
  ...universalUploadsTables,
});
