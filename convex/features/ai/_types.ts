/**
 * AI feature types — provider + tool category + chat-message role.
 */
import { v } from "convex/values";

export const AI_PROVIDERS = ["openrouter", "openai", "anthropic", "openclaw", "custom"] as const;
export type AiProvider = typeof AI_PROVIDERS[number];
export const aiProviderValidator = v.union(
  v.literal("openrouter"),
  v.literal("openai"),
  v.literal("anthropic"),
  v.literal("openclaw"),
  v.literal("custom"),
);

export const AI_TOOL_CATEGORIES = ["data", "memory", "calculation", "utility"] as const;
export type AiToolCategory = typeof AI_TOOL_CATEGORIES[number];
export const aiToolCategoryValidator = v.union(
  v.literal("data"),
  v.literal("memory"),
  v.literal("calculation"),
  v.literal("utility"),
);

export const CHAT_ROLES = ["user", "assistant", "system"] as const;
export type ChatRole = typeof CHAT_ROLES[number];
export const chatRoleValidator = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);
