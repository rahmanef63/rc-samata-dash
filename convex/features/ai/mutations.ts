import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { aiProviderValidator } from "./_schema";

const now = () => new Date().toISOString();

/** Create or update an AI provider config */
export const upsertProvider = mutation({
  args: {
    id: v.optional(v.id("aiProviders")),
    provider: aiProviderValidator,
    displayName: v.string(),
    baseUrl: v.string(),
    apiKey: v.string(),
    defaultModel: v.string(),
    isActive: v.boolean(),
    customHeaders: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // If setting active, deactivate all others
    if (args.isActive) {
      const active = await ctx.db
        .query("aiProviders")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
      for (const p of active) {
        if (p._id !== args.id) {
          await ctx.db.patch(p._id, { isActive: false, updatedAt: now() });
        }
      }
    }

    if (args.id) {
      // Update — only update apiKey if it's not a masked value
      const update: Record<string, unknown> = {
        provider: args.provider,
        displayName: args.displayName,
        baseUrl: args.baseUrl,
        defaultModel: args.defaultModel,
        isActive: args.isActive,
        customHeaders: args.customHeaders,
        updatedAt: now(),
      };
      if (!args.apiKey.includes("...")) {
        update.apiKey = args.apiKey;
      }
      await ctx.db.patch(args.id, update);
      return args.id;
    } else {
      return await ctx.db.insert("aiProviders", {
        provider: args.provider,
        displayName: args.displayName,
        baseUrl: args.baseUrl,
        apiKey: args.apiKey,
        defaultModel: args.defaultModel,
        isActive: args.isActive,
        customHeaders: args.customHeaders,
        createdAt: now(),
        updatedAt: now(),
      });
    }
  },
});

/** Delete a provider */
export const deleteProvider = mutation({
  args: { id: v.id("aiProviders") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

/** Set a provider as active */
export const setActiveProvider = mutation({
  args: { id: v.id("aiProviders") },
  handler: async (ctx, { id }) => {
    const all = await ctx.db
      .query("aiProviders")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    for (const p of all) {
      await ctx.db.patch(p._id, { isActive: false, updatedAt: now() });
    }
    await ctx.db.patch(id, { isActive: true, updatedAt: now() });
  },
});

/** Create a new chat session */
export const createChatSession = mutation({
  args: {
    title: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const active = await ctx.db
      .query("aiProviders")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    return await ctx.db.insert("aiChatSessions", {
      title: args.title || "Chat baru",
      providerId: active?._id,
      model: active?.defaultModel,
      systemPrompt: args.systemPrompt,
      createdAt: now(),
      updatedAt: now(),
    });
  },
});

/** Add a message to a session */
export const addChatMessage = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    // Update session title from first user message
    if (args.role === "user") {
      const session = await ctx.db.get(args.sessionId);
      if (session?.title === "Chat baru") {
        const title = args.content.slice(0, 60) + (args.content.length > 60 ? "..." : "");
        await ctx.db.patch(args.sessionId, { title, updatedAt: now() });
      }
    }

    return await ctx.db.insert("aiChatMessages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      model: args.model,
      tokenUsage: args.tokenUsage,
      createdAt: now(),
    });
  },
});

/** Delete a chat session and all its messages */
export const deleteChatSession = mutation({
  args: { sessionId: v.id("aiChatSessions") },
  handler: async (ctx, { sessionId }) => {
    const messages = await ctx.db
      .query("aiChatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
    await ctx.db.delete(sessionId);
  },
});
