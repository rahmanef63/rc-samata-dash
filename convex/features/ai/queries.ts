import { query, internalQuery } from "../../_generated/server";
import { v } from "convex/values";

/** List all providers (masks API key for client safety) */
export const listProviders = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db.query("aiProviders").collect();
    return providers.map((p) => ({
      ...p,
      apiKey: p.apiKey ? `${p.apiKey.slice(0, 8)}...${p.apiKey.slice(-4)}` : "",
    }));
  },
});

/** Get the currently active provider (masked key) */
export const getActiveProvider = query({
  args: {},
  handler: async (ctx) => {
    const provider = await ctx.db
      .query("aiProviders")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();
    if (!provider) return null;
    return {
      ...provider,
      apiKey: provider.apiKey ? `${provider.apiKey.slice(0, 8)}...${provider.apiKey.slice(-4)}` : "",
    };
  },
});

/** Internal: get full provider with raw API key (only for actions) */
export const getProviderWithKey = internalQuery({
  args: { id: v.id("aiProviders") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/** Internal: get active provider with raw key */
export const getActiveProviderWithKey = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("aiProviders")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();
  },
});

/** List chat sessions */
export const listChatSessions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("aiChatSessions")
      .withIndex("by_created")
      .order("desc")
      .take(50);
  },
});

/** Get messages for a session */
export const getChatMessages = query({
  args: { sessionId: v.id("aiChatSessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("aiChatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
  },
});
