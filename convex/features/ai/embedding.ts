/**
 * AI Embedding Generation
 *
 * Generates text embeddings via OpenAI-compatible API (OpenRouter, OpenAI).
 * Used for vector search / RAG.
 */
import { internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";

/** Default embedding base URLs */
const DEFAULT_EMBEDDING_URLS: Record<string, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
};

const DEFAULT_EMBEDDING_MODELS: Record<string, string> = {
  openrouter: "openai/text-embedding-3-small",
  openai: "text-embedding-3-small",
};

/** Resolve the embedding API base URL */
function resolveEmbeddingUrl(provider: {
  provider: string;
  embeddingBaseUrl?: string;
  baseUrl: string;
}): string {
  if (provider.embeddingBaseUrl?.trim()) return provider.embeddingBaseUrl;
  return DEFAULT_EMBEDDING_URLS[provider.provider] || provider.baseUrl;
}

/** Generate embedding for a single text */
export const generateEmbedding = internalAction({
  args: { text: v.string() },
  handler: async (ctx, { text }): Promise<number[]> => {
    const provider = await ctx.runQuery(
      internal.features.ai.queries.getActiveProviderWithKey,
      {}
    );
    if (!provider) throw new Error("No active AI provider for embeddings");

    const embeddingModel =
      provider.embeddingModel || DEFAULT_EMBEDDING_MODELS[provider.provider] || "text-embedding-3-small";
    const baseUrl = resolveEmbeddingUrl(provider);

    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/embeddings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: embeddingModel,
          input: text,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Embedding API error ${response.status}: ${errorText.slice(0, 200)}`
      );
    }

    const data = await response.json();
    return data.data[0].embedding as number[];
  },
});

/** Generate embeddings for a batch of texts (max 2048 per OpenAI spec) */
export const generateBatchEmbeddings = internalAction({
  args: { texts: v.array(v.string()) },
  handler: async (ctx, { texts }): Promise<number[][]> => {
    const provider = await ctx.runQuery(
      internal.features.ai.queries.getActiveProviderWithKey,
      {}
    );
    if (!provider) throw new Error("No active AI provider for embeddings");

    const embeddingModel =
      provider.embeddingModel || DEFAULT_EMBEDDING_MODELS[provider.provider] || "text-embedding-3-small";
    const baseUrl = resolveEmbeddingUrl(provider);

    // Batch in chunks of 100 to avoid timeouts
    const BATCH_SIZE = 100;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);

      const response = await fetch(
        `${baseUrl.replace(/\/$/, "")}/embeddings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            model: embeddingModel,
            input: batch,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Embedding API error ${response.status}: ${errorText.slice(0, 200)}`
        );
      }

      const data = await response.json();
      // OpenAI returns embeddings sorted by index
      const sorted = (
        data.data as Array<{ index: number; embedding: number[] }>
      ).sort((a, b) => a.index - b.index);
      allEmbeddings.push(...sorted.map((d) => d.embedding));
    }

    return allEmbeddings;
  },
});
