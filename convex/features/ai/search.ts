/**
 * AI Semantic Search (RAG)
 *
 * Searches embedded data using vector similarity.
 * Returns relevant context for AI chat responses.
 */
import { internalAction, internalQuery } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";

/** Fetch full embedding documents by IDs (after vector search) */
export const fetchEmbeddingResults = internalQuery({
  args: { ids: v.array(v.id("aiEmbeddings")) },
  handler: async (ctx, { ids }) => {
    const results = [];
    for (const id of ids) {
      const doc = await ctx.db.get(id);
      if (doc) {
        results.push({
          _id: doc._id,
          sourceTable: doc.sourceTable,
          textContent: doc.textContent,
          periodKey: doc.periodKey,
        });
      }
    }
    return results;
  },
});

/** Count total embeddings (for UI status) */
export const countEmbeddings = internalQuery({
  args: { reportId: v.optional(v.id("weeklyReports")) },
  handler: async (ctx, { reportId }) => {
    if (reportId) {
      const docs = await ctx.db
        .query("aiEmbeddings")
        .withIndex("by_report", (q) => q.eq("reportId", reportId))
        .collect();
      return docs.length;
    }
    const docs = await ctx.db.query("aiEmbeddings").take(20000);
    return docs.length;
  },
});

/** Semantic search — find relevant data for a user query */
export const semanticSearch = internalAction({
  args: {
    query: v.string(),
    sourceTable: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    Array<{
      text: string;
      score: number;
      sourceTable: string;
      periodKey: string;
    }>
  > => {
    // 1. Generate embedding for the query
    const queryEmbedding: number[] = await ctx.runAction(
      internal.features.ai.embedding.generateEmbedding,
      { text: args.query }
    );

    // 2. Vector search (single-tenant — no branch filter)
    const searchQuery: {
      vector: number[];
      limit: number;
    } = {
      vector: queryEmbedding,
      limit: args.limit || 10,
    };

    const searchResults = await ctx.vectorSearch(
      "aiEmbeddings",
      "by_embedding",
      searchQuery as never,
    );

    if (searchResults.length === 0) return [];

    // 3. Fetch full documents
    const docs = await ctx.runQuery(
      internal.features.ai.search.fetchEmbeddingResults,
      { ids: searchResults.map((r: { _id: Id<"aiEmbeddings"> }) => r._id) }
    );

    // 4. Merge scores with docs
    const scoreMap = new Map(
      searchResults.map((r: { _id: Id<"aiEmbeddings">; _score: number }) => [r._id, r._score])
    );

    return docs.map((d) => ({
      text: d.textContent,
      score: scoreMap.get(d._id) || 0,
      sourceTable: d.sourceTable,
      periodKey: d.periodKey,
    }));
  },
});
