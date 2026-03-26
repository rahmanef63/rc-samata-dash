/**
 * AI Chat Completion Action
 *
 * Server-side proxy for AI API calls. Keeps API keys secure.
 * Supports: OpenRouter, OpenAI, Anthropic, OpenClaw, Custom endpoints.
 */
import { action } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";

type Message = { role: "user" | "assistant" | "system"; content: string };

/** Default base URLs per provider (fallback if stored value is empty) */
const DEFAULT_BASE_URLS: Record<string, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  openclaw: "https://api.openclaw.ai/v1",
  custom: "http://localhost:11434/v1",
};

function resolveBaseUrl(provider: string, storedUrl: string): string {
  const url = storedUrl?.trim();
  if (url && url.startsWith("http")) return url;
  return DEFAULT_BASE_URLS[provider] || DEFAULT_BASE_URLS.openrouter;
}

/** Build request for OpenAI-compatible APIs (OpenAI, OpenRouter, OpenClaw, Custom) */
function buildOpenAIRequest(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Message[],
  customHeaders?: string
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // Merge custom headers
  if (customHeaders) {
    try {
      const extra = JSON.parse(customHeaders);
      Object.assign(headers, extra);
    } catch { /* ignore invalid JSON */ }
  }

  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  return {
    url,
    options: {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4096,
        temperature: 0.7,
      }),
    },
  };
}

/** Build request for Anthropic Messages API */
function buildAnthropicRequest(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Message[]
) {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs = messages.filter((m) => m.role !== "system");

  return {
    url: `${baseUrl.replace(/\/$/, "")}/messages`,
    options: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: chatMsgs.map((m) => ({ role: m.role, content: m.content })),
      }),
    },
  };
}

/** Parse response from OpenAI-compatible API */
function parseOpenAIResponse(data: Record<string, unknown>): {
  content: string;
  tokenUsage?: { promptTokens: number; completionTokens: number };
} {
  const choices = data.choices as Array<{ message: { content: string } }>;
  const usage = data.usage as { prompt_tokens: number; completion_tokens: number } | undefined;

  return {
    content: choices?.[0]?.message?.content || "Tidak ada respons dari AI.",
    tokenUsage: usage
      ? { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens }
      : undefined,
  };
}

/** Parse response from Anthropic API */
function parseAnthropicResponse(data: Record<string, unknown>): {
  content: string;
  tokenUsage?: { promptTokens: number; completionTokens: number };
} {
  const contentBlocks = data.content as Array<{ type: string; text: string }>;
  const usage = data.usage as { input_tokens: number; output_tokens: number } | undefined;

  return {
    content: contentBlocks?.find((b) => b.type === "text")?.text || "Tidak ada respons dari AI.",
    tokenUsage: usage
      ? { promptTokens: usage.input_tokens, completionTokens: usage.output_tokens }
      : undefined,
  };
}

/** Send a chat completion request (with optional RAG) */
export const chatCompletion = action({
  args: {
    providerId: v.optional(v.id("aiProviders")),
    model: v.optional(v.string()),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
        content: v.string(),
      })
    ),
    useRag: v.optional(v.boolean()),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args): Promise<{
    content: string;
    model: string;
    tokenUsage?: { promptTokens: number; completionTokens: number };
    ragContext?: string[];
  }> => {
    // Get provider config (with raw API key)
    let provider;
    if (args.providerId) {
      provider = await ctx.runQuery(internal.features.ai.queries.getProviderWithKey, {
        id: args.providerId,
      });
    } else {
      provider = await ctx.runQuery(internal.features.ai.queries.getActiveProviderWithKey, {});
    }

    if (!provider) {
      throw new Error("Belum ada AI provider yang dikonfigurasi. Buka Pengaturan → AI Provider.");
    }

    const model = args.model || provider.defaultModel;
    const messages = [...args.messages] as Message[];
    const baseUrl = resolveBaseUrl(provider.provider, provider.baseUrl);

    // RAG: If enabled and provider has embedding model, search for relevant data
    let ragTexts: string[] = [];
    if (args.useRag !== false && provider.embeddingModel) {
      // Get the last user message for search query
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
      if (lastUserMsg) {
        try {
          const searchResults: Array<{ text: string; score: number; sourceTable: string; periodKey: string }> =
            await ctx.runAction(
              internal.features.ai.search.semanticSearch,
              {
                query: lastUserMsg.content,
                branchId: args.branchId,
                limit: 8,
              }
            );

          if (searchResults.length > 0) {
            ragTexts = searchResults.map((r) => r.text);
            const ragContext = `\n\n## Data Konteks dari Database (RAG):\n${ragTexts.map((t) => `- ${t}`).join("\n")}\n\nGunakan data di atas untuk menjawab pertanyaan user secara akurat. Jika data tidak relevan, abaikan.`;

            // Inject RAG context into system message
            const systemIdx = messages.findIndex((m) => m.role === "system");
            if (systemIdx >= 0) {
              messages[systemIdx] = {
                ...messages[systemIdx],
                content: messages[systemIdx].content + ragContext,
              };
            } else {
              messages.unshift({ role: "system", content: ragContext });
            }
          }
        } catch {
          // RAG failure should not block chat — just continue without context
        }
      }
    }

    let req;
    if (provider.provider === "anthropic") {
      req = buildAnthropicRequest(baseUrl, provider.apiKey, model, messages);
    } else {
      req = buildOpenAIRequest(
        baseUrl,
        provider.apiKey,
        model,
        messages,
        provider.customHeaders
      );
    }

    const response = await fetch(req.url, req.options);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `API Error ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.error?.message || errorJson.message || errorMsg;
      } catch {
        errorMsg = errorText.slice(0, 200) || errorMsg;
      }
      throw new Error(errorMsg);
    }

    const data = (await response.json()) as Record<string, unknown>;

    const parsed =
      provider.provider === "anthropic"
        ? parseAnthropicResponse(data)
        : parseOpenAIResponse(data);

    return {
      content: parsed.content,
      model,
      tokenUsage: parsed.tokenUsage,
      ragContext: ragTexts.length > 0 ? ragTexts : undefined,
    };
  },
});

/** Test a provider connection (validate API key) */
export const testConnection = action({
  args: { providerId: v.id("aiProviders") },
  handler: async (ctx, { providerId }) => {
    const provider = await ctx.runQuery(internal.features.ai.queries.getProviderWithKey, {
      id: providerId,
    });

    if (!provider) throw new Error("Provider tidak ditemukan.");

    const messages: Message[] = [{ role: "user", content: "Hi, respond with just 'OK'" }];
    const baseUrl = resolveBaseUrl(provider.provider, provider.baseUrl);

    let req;
    if (provider.provider === "anthropic") {
      req = buildAnthropicRequest(baseUrl, provider.apiKey, provider.defaultModel, messages);
    } else {
      req = buildOpenAIRequest(
        baseUrl,
        provider.apiKey,
        provider.defaultModel,
        messages,
        provider.customHeaders
      );
    }

    const response = await fetch(req.url, req.options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Koneksi gagal (${response.status}): ${errorText.slice(0, 200)}`);
    }

    return { success: true, status: response.status };
  },
});
