/**
 * Embedding export helper for ETL baseline.
 *
 * Called from superspace/scripts/merge-etl/rc-samata-dash/export-embeddings.ts.
 * Admin-key-auth only (internalQuery).
 *
 * Returns paginated chunks of aiEmbeddings rows preserving the 1536-dim
 * vector + model + version metadata so superspace can re-index without
 * recomputation.
 */

import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

export default internalQuery({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, { cursor, pageSize }) => {
    const result = await ctx.db
      .query("aiEmbeddings")
      .order("asc")
      .paginate({ cursor: cursor ?? null, numItems: pageSize ?? 200 });
    return {
      page: result.page.map((row) => ({
        _id: row._id,
        _creationTime: row._creationTime,
        sourceTable: row.sourceTable,
        sourceId: row.sourceId,
        reportId: row.reportId ?? null,
        periodKey: row.periodKey,
        textContent: row.textContent,
        embedding: row.embedding,
        embeddingModel: row.embeddingModel,
        createdAt: row.createdAt,
      })),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});
