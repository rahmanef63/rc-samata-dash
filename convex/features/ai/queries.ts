import { query, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

// ─── Provider Queries ───────────────────────────────────────

/** List all providers (masks API key for client safety) */
export const listProviders = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
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
    await requireAuth(ctx);
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

// ─── Tool Queries ───────────────────────────────────────────

/** List all tools */
export const listTools = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("aiTools").collect();
  },
});

/** Internal: list enabled tools for server-side prompt building */
export const listEnabledToolsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("aiTools")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();
  },
});

// ─── Agent Queries ──────────────────────────────────────────

/** List all agents */
export const listAgents = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("aiAgents").collect();
  },
});

/** Internal: list enabled agents for server-side prompt building */
export const listEnabledAgentsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("aiAgents")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();
  },
});

/** Internal: get agent by agentId */
export const getAgentByAgentIdInternal = internalQuery({
  args: { agentId: v.string() },
  handler: async (ctx, { agentId }) => {
    return await ctx.db
      .query("aiAgents")
      .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
      .first();
  },
});

/** List enabled tools */
export const listEnabledTools = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("aiTools")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();
  },
});

// ─── Instruction Queries ────────────────────────────────────

/** List all custom instructions */
export const listInstructions = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("aiCustomInstructions").collect();
  },
});

/** Internal: get the active instruction for server-side bootstrap */
export const getActiveInstructionInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("aiCustomInstructions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();
  },
});

/** Get the active instruction */
export const getActiveInstruction = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("aiCustomInstructions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();
  },
});

// ─── Chat Queries ───────────────────────────────────────────

/** List chat sessions */
export const listChatSessions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query("aiChatSessions")
      .withIndex("by_user_created", (q) => q.eq("userId", userId as never))
      .order("desc")
      .take(50);
  },
});

/** Get messages for a session */
export const getChatMessages = query({
  args: { sessionId: v.id("aiChatSessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await requireAuth(ctx);
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Chat session not found.");
    }
    return await ctx.db
      .query("aiChatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
  },
});

/** Get full AI config (provider + tools + instruction) for chat init */
export const getAiConfig = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const provider = await ctx.db
      .query("aiProviders")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    const instruction = await ctx.db
      .query("aiCustomInstructions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    const tools = await ctx.db
      .query("aiTools")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();

    // Count total embeddings for RAG status
    const embeddingDocs = await ctx.db.query("aiEmbeddings").take(1);
    const hasEmbeddings = embeddingDocs.length > 0;
    const ragEnabled = hasEmbeddings && !!provider?.embeddingModel;

    return {
      provider: provider ? {
        ...provider,
        apiKey: provider.apiKey ? `${provider.apiKey.slice(0, 8)}...${provider.apiKey.slice(-4)}` : "",
      } : null,
      instruction,
      tools,
      ragEnabled,
      hasEmbeddings,
    };
  },
});

/** Get embedding stats for a report */
export const getEmbeddingStats = query({
  args: { reportId: v.optional(v.id("weeklyReports")) },
  handler: async (ctx, { reportId }) => {
    await requireAuth(ctx);
    if (reportId) {
      const docs = await ctx.db
        .query("aiEmbeddings")
        .withIndex("by_report", (q) => q.eq("reportId", reportId))
        .collect();
      return { count: docs.length, indexed: docs.length > 0 };
    }
    // Total count
    const allDocs = await ctx.db.query("aiEmbeddings").collect();
    return { count: allDocs.length, indexed: allDocs.length > 0 };
  },
});
