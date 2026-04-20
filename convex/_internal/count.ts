/**
 * Row-count helper for ETL baseline.
 *
 * Called from superspace/scripts/merge-etl/rc-samata-dash/count-rows.ts.
 * Admin-key-auth only (internalQuery).
 *
 * For tables >1M rows replace .collect() with paginated count.
 * See: https://docs.convex.dev/database/pagination
 */

import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

export default internalQuery({
  args: { table: v.string() },
  handler: async (ctx, { table }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await ctx.db.query(table as any).collect();
    return rows.length;
  },
});
