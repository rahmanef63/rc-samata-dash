/**
 * AI Provider & Chat schema
 *
 * Stores AI provider configurations (API keys, models) and chat history.
 * API keys are stored server-side and never exposed to the client via public queries.
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const aiProviderValidator = v.union(
  v.literal("openrouter"),
  v.literal("openai"),
  v.literal("anthropic"),
  v.literal("openclaw"),
  v.literal("custom")
);

export const aiTables = {
  aiProviders: defineTable({
    provider: aiProviderValidator,
    displayName: v.string(),
    baseUrl: v.string(),
    apiKey: v.string(),
    defaultModel: v.string(),
    isActive: v.boolean(),
    customHeaders: v.optional(v.string()), // JSON string of extra headers
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_provider", ["provider"])
    .index("by_active", ["isActive"]),

  aiChatSessions: defineTable({
    title: v.string(),
    providerId: v.optional(v.id("aiProviders")),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_created", ["createdAt"]),

  aiChatMessages: defineTable({
    sessionId: v.id("aiChatSessions"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
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
