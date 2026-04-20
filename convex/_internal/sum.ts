/**
 * Financial-sum helper for ETL baseline.
 *
 * Called from superspace/scripts/merge-etl/rc-samata-dash/sum-financial.ts.
 * Admin-key-auth only (internalQuery).
 *
 * Groups rows by a tenant/branch field AND calendar month derived from a
 * date/timestamp field. Returns { [group]: { [YYYY-MM]: sum } }.
 */

import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

export default internalQuery({
  args: {
    table: v.string(),
    amountField: v.string(),
    dateField: v.string(),
    groupField: v.optional(v.string()),
  },
  handler: async (ctx, { table, amountField, dateField, groupField }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = await ctx.db.query(table as any).collect();
    const out: Record<string, Record<string, number>> = {};

    for (const row of rows) {
      const amount = Number(row[amountField] ?? 0);
      if (!Number.isFinite(amount)) continue;

      const rawDate = dateField === "_creationTime" ? row._creationTime : row[dateField];
      let month = "unknown";
      if (typeof rawDate === "number") {
        month = new Date(rawDate).toISOString().slice(0, 7);
      } else if (typeof rawDate === "string" && rawDate.length >= 7) {
        month = rawDate.slice(0, 7);
      }

      const group = groupField ? String(row[groupField] ?? "_none") : "_global";
      out[group] ??= {};
      out[group][month] = (out[group][month] ?? 0) + amount;
    }

    return {
      table,
      amountField,
      dateField,
      groupField: groupField ?? null,
      totalRows: rows.length,
      groups: out,
    };
  },
});
