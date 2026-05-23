/**
 * AI Provider, Chat, Tools, Instructions & Embedding schema
 *
 * Stores AI provider configurations (API keys, models), chat history,
 * tools/skills definitions, custom instructions, and embedding config.
 * API keys are stored server-side and never exposed to the client via public queries.
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  aiProviderValidator,
  aiToolCategoryValidator,
  chatRoleValidator,
} from "./_types";

// Re-export for backwards compatibility with mutations/queries that
// imported these from this module before the `_types` extraction.
export { aiProviderValidator, aiToolCategoryValidator };

export const aiTables = {
  aiProviders: defineTable({
    provider: aiProviderValidator,
    displayName: v.string(),
    baseUrl: v.string(),
    apiKey: v.string(),
    defaultModel: v.string(),
    isActive: v.boolean(),
    customHeaders: v.optional(v.string()), // JSON string of extra headers
    // Embedding config — auto-enabled for OpenRouter
    embeddingModel: v.optional(v.string()),
    embeddingBaseUrl: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_provider", ["provider"])
    .index("by_active", ["isActive"]),

  /** Tools/skills the AI can reference in responses */
  aiTools: defineTable({
    toolId: v.string(),            // "laporan_query", "memory_recall", etc.
    name: v.string(),              // Display name: "Query Laporan"
    description: v.string(),       // What it does
    category: aiToolCategoryValidator,
    syntaxGuide: v.string(),       // How the AI should use this skill
    isBuiltIn: v.boolean(),        // System default vs user-created
    isEnabled: v.boolean(),        // Active/inactive toggle
    parameters: v.optional(v.string()), // JSON schema for params
    createdAt: v.string(),
  })
    .index("by_toolId", ["toolId"])
    .index("by_enabled", ["isEnabled"]),

  /** Agents are higher-level workflows/personalities that can use tools */
  aiAgents: defineTable({
    agentId: v.string(),           // "business_analyst", "ops_planner", etc.
    name: v.string(),
    description: v.string(),
    systemPrompt: v.string(),
    allowedToolIds: v.array(v.string()),
    isBuiltIn: v.boolean(),
    isEnabled: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_agentId", ["agentId"])
    .index("by_enabled", ["isEnabled"]),

  /** Custom instructions — default + user-defined */
  aiCustomInstructions: defineTable({
    name: v.string(),              // "Default RC Samata", "Custom"
    content: v.string(),           // The instruction text
    isDefault: v.boolean(),        // Is this the system default
    isActive: v.boolean(),         // Currently active instruction
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_active", ["isActive"])
    .index("by_default", ["isDefault"]),

  /** Vector embeddings for RAG — stores embedded text chunks from report data */
  aiEmbeddings: defineTable({
    sourceTable: v.string(),            // "productSales", "costAnalysis", etc.
    sourceId: v.string(),               // ID of source document (string for flexibility)
    reportId: v.optional(v.id("weeklyReports")),
    periodKey: v.string(),              // "2026-W12", "2026-03" for grouping
    textContent: v.string(),            // Human-readable text that was embedded
    embedding: v.array(v.float64()),    // 1536-dim vector
    embeddingModel: v.string(),         // "text-embedding-3-small"
    createdAt: v.string(),
  })
    .index("by_source", ["sourceTable", "sourceId"])
    .index("by_report", ["reportId"])
    .index("by_period", ["periodKey"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["sourceTable"],
    }),

  aiChatSessions: defineTable({
    title: v.string(),
    userId: v.optional(v.id("users")),
    providerId: v.optional(v.id("aiProviders")),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    customInstructionId: v.optional(v.id("aiCustomInstructions")),
    enabledToolIds: v.optional(v.array(v.string())),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_created", ["createdAt"])
    .index("by_user_created", ["userId", "createdAt"]),

  aiChatMessages: defineTable({
    sessionId: v.id("aiChatSessions"),
    role: chatRoleValidator,
    content: v.string(),
    visualsJson: v.optional(v.string()),
    model: v.optional(v.string()),
    tokenUsage: v.optional(
      v.object({
        promptTokens: v.number(),
        completionTokens: v.number(),
      })
    ),
    createdAt: v.string(),
  }).index("by_session", ["sessionId", "createdAt"]),
};
