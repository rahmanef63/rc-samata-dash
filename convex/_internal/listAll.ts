/**
 * Paginated listAll helper for ETL.
 *
 * Returns rows from a table with cursor pagination. Used by
 * superspace/scripts/merge-etl/rc-samata-dash/etl-rc-samata.ts for
 * Phase 0-5 ports.
 *
 * Admin-key-auth only (internalQuery).
 */

import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

export default internalQuery({
  args: {
    table: v.string(),
    cursor: v.optional(v.union(v.string(), v.null())),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, { table, cursor, pageSize }) => {
    const result = await ctx.db
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .query(table as any)
      .order("asc")
      .paginate({ cursor: cursor ?? null, numItems: pageSize ?? 100 });
    return {
      page: result.page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});
