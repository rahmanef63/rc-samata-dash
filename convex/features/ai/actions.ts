/**
 * AI Chat Completion Action
 *
 * Server-side proxy for AI API calls. Keeps API keys secure.
 * Supports: OpenRouter, OpenAI, Anthropic, OpenClaw, Custom endpoints.
 */
import { action } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";
import {
  buildToolManifestPrompt,
  extractLegacyDataQuery,
  extractToolCall,
  type AiToolCall,
} from "./toolManifest";

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

function monthNameToNumber(input: string): string | null {
  const normalized = input.toLowerCase();
  const months: Record<string, string> = {
    january: "01",
    jan: "01",
    februari: "02",
    february: "02",
    feb: "02",
    maret: "03",
    march: "03",
    mar: "03",
    april: "04",
    apr: "04",
    mei: "05",
    may: "05",
    juni: "06",
    june: "06",
    jul: "07",
    juli: "07",
    july: "07",
    agustus: "08",
    august: "08",
    agu: "08",
    aug: "08",
    september: "09",
    sep: "09",
    oktober: "10",
    october: "10",
    okt: "10",
    oct: "10",
    november: "11",
    nov: "11",
    desember: "12",
    december: "12",
    dec: "12",
  };

  for (const [k, v] of Object.entries(months)) {
    if (normalized.includes(k)) return v;
  }
  return null;
}

type PettyCashMonthlySummary = {
  yearMonth: string;
  count: number;
  totalRequested: number;
  totalApproved: number;
  totalActual: number;
  byStatus: Record<string, number>;
  records: Array<Record<string, unknown>>;
};

type ToolExecutionResult = {
  toolId: string;
  title: string;
  summary: string;
  raw?: unknown;
};

function formatNumber(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function normalizeQueryText(text: string): string {
  return text.toLowerCase().trim();
}

function parseYearMonthFromQuery(query: string): string | null {
  const month = monthNameToNumber(query);
  if (!month) return null;
  const yearMatch = query.match(/\b(20\d{2})\b/);
  const year = yearMatch?.[1] || new Date().getFullYear().toString();
  return `${year}-${month}`;
}

function detectReportIntent(query: string): "pettyCash" | "kpi" | "trend" | "cashflow" | "expense" | "recent" | "rag" | null {
  const q = normalizeQueryText(query);

  if (
    q.includes("petty cash") ||
    q.includes("kas kecil") ||
    q.includes("kas petty")
  ) {
    return "pettyCash";
  }
  if (
    q.includes("kpi") ||
    q.includes("food cost") ||
    q.includes("gross margin") ||
    q.includes("waste") ||
    q.includes("sales achievement")
  ) {
    return "kpi";
  }
  if (
    q.includes("tren") ||
    q.includes("trend") ||
    q.includes("perbandingan") ||
    q.includes("bulan ini vs") ||
    q.includes("minggu ini vs")
  ) {
    return "trend";
  }
  if (q.includes("cashflow") || q.includes("arus kas") || q.includes("aliran kas")) {
    return "cashflow";
  }
  if (q.includes("expense") || q.includes("pengeluaran") || q.includes("biaya")) {
    return "expense";
  }
  if (q.includes("transaksi terbaru") || q.includes("recent transaction") || q.includes("terakhir")) {
    return "recent";
  }
  if (q.includes("rag") || q.includes("database") || q.includes("cari konteks") || q.includes("semantik")) {
    return "rag";
  }
  return null;
}

function detectDirectAnalyticIntent(query: string): "waste" | null {
  const q = normalizeQueryText(query);
  if (q.includes("waste") || q.includes("sisa bahan") || q.includes("bahan paling sering waste") || q.includes("bahan apa yang paling sering waste")) {
    return "waste";
  }
  return null;
}

async function requestModelCompletion(
  provider: {
    provider: string;
    apiKey: string;
    baseUrl: string;
    defaultModel: string;
    customHeaders?: string | null;
  },
  model: string,
  messages: Message[]
): Promise<{
  content: string;
  tokenUsage?: { promptTokens: number; completionTokens: number };
}> {
  const baseUrl = resolveBaseUrl(provider.provider, provider.baseUrl);
  const req =
    provider.provider === "anthropic"
      ? buildAnthropicRequest(baseUrl, provider.apiKey, model, messages)
      : buildOpenAIRequest(baseUrl, provider.apiKey, model, messages, provider.customHeaders ?? undefined);

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
  return provider.provider === "anthropic" ? parseAnthropicResponse(data) : parseOpenAIResponse(data);
}

function formatToolResult(result: ToolExecutionResult): string {
  return [
    `TOOL_RESULT: ${result.toolId}`,
    `TITLE: ${result.title}`,
    result.summary,
    result.raw ? `RAW: ${JSON.stringify(result.raw, null, 2)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function parseToolCallFromContent(content: string): AiToolCall | null {
  const toolCall = extractToolCall(content);
  if (toolCall) return toolCall;

  const legacy = extractLegacyDataQuery(content);
  if (legacy) {
    return { toolId: "laporan_query", query: legacy };
  }

  return null;
}

async function executeToolCall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  toolCall: AiToolCall,
  branchId?: string
): Promise<ToolExecutionResult | null> {
  const queryText = (toolCall.query || toolCall.action || "").trim();
  const normalized = normalizeQueryText(queryText);

  switch (toolCall.toolId) {
    case "rag_database": {
      if (!queryText) return null;
      const searchResults = await ctx.runAction(
        internal.features.ai.search.semanticSearch,
        {
          query: queryText,
          branchId,
          limit: 8,
        }
      ) as Array<{ text: string; score: number; sourceTable: string; periodKey: string }>;

      if (searchResults.length === 0) {
        return {
          toolId: toolCall.toolId,
          title: "RAG Database",
          summary: "Tidak ditemukan data relevan di embedding database.",
          raw: searchResults,
        };
      }

      const summary = searchResults
        .map((item, index) => `${index + 1}. [${item.sourceTable}] ${item.text}`)
        .join("\n");

      return {
        toolId: toolCall.toolId,
        title: "RAG Database",
        summary,
        raw: searchResults,
      };
    }

    case "kpi_check": {
      if (!branchId) {
        return {
          toolId: toolCall.toolId,
          title: "KPI & Target",
          summary: "Branch belum tersedia untuk menghitung KPI.",
        };
      }

      const timeFilter =
        normalized.includes("minggu") || normalized.includes("weekly")
          ? "weekly"
          : normalized.includes("harian") || normalized.includes("daily")
            ? "daily"
            : normalized.includes("quarter") || normalized.includes("kuartal")
              ? "quarterly"
              : normalized.includes("bulan") || normalized.includes("monthly")
                ? "monthly"
                : "monthly";

      const result = await ctx.runQuery(internal.features.reports.kpiAnalytics.getKPIDashboardInternal, {
        branchId: branchId as never,
        timeFilter,
      }) as { kpis: Array<{ kpiLabel: string; actual: number; target: number; unit: string; status: string }>; hasTargets: boolean };

      if (!result.kpis.length) {
        return {
          toolId: toolCall.toolId,
          title: "KPI & Target",
          summary: "Belum ada KPI target atau data yang bisa dihitung untuk periode ini.",
          raw: result,
        };
      }

      const summary = result.kpis
        .map((kpi) => `- ${kpi.kpiLabel}: actual ${kpi.actual}${kpi.unit}, target ${kpi.target}${kpi.unit}, status ${kpi.status}`)
        .join("\n");

      return {
        toolId: toolCall.toolId,
        title: "KPI & Target",
        summary: `Hasil KPI:\n${summary}`,
        raw: result,
      };
    }

    case "trend_analysis": {
      if (!branchId) {
        return {
          toolId: toolCall.toolId,
          title: "Analisis Tren",
          summary: "Branch belum tersedia untuk analisis tren.",
        };
      }

      const useMonthly =
        normalized.includes("bulan") ||
        normalized.includes("monthly") ||
        normalized.includes("30 hari");

      const result = useMonthly
        ? await ctx.runQuery(internal.features.reports.dashboardQueries.getMonthlySalesTrendInternal, {
            branchId: branchId as never,
          }) as Array<{ label: string; date: string; value: number }>
        : await ctx.runQuery(internal.features.reports.dashboardQueries.getWeeklySalesTrendInternal, {
            branchId: branchId as never,
          }) as Array<{ label: string; date: string; value: number }>;

      return {
        toolId: toolCall.toolId,
        title: "Analisis Tren",
        summary: result.length
          ? result.map((row: { label: string; date: string; value: number }) => `- ${row.date}: ${formatNumber(row.value)}`).join("\n")
          : "Tidak ada data tren yang tersedia untuk periode ini.",
        raw: result,
      };
    }

    case "laporan_query": {
      const intent = detectReportIntent(queryText);

      if (intent === "pettyCash") {
        if (!branchId) {
          return {
            toolId: toolCall.toolId,
            title: "Query Laporan",
            summary: "Branch belum tersedia untuk menghitung petty cash.",
          };
        }

        const yearMonth = parseYearMonthFromQuery(queryText) || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
        const summary = await ctx.runQuery(
          internal.features.pettyCash.queries.getMonthlySummaryInternal,
          { branchId: branchId as never, yearMonth } as never
        ) as PettyCashMonthlySummary;

        if (!summary.count) {
          return {
            toolId: toolCall.toolId,
            title: "Query Laporan",
            summary: `Tidak ada data petty cash untuk ${yearMonth}.`,
            raw: summary,
          };
        }

        const statusParts = Object.entries(summary.byStatus)
          .map(([status, total]) => `${status}: ${formatNumber(Number(total))}`)
          .join(", ");

        return {
          toolId: toolCall.toolId,
          title: "Query Laporan",
          summary: [
            `Ringkasan petty cash ${yearMonth}:`,
            `- Total request: ${formatNumber(summary.totalRequested)}`,
            `- Total approved: ${formatNumber(summary.totalApproved)}`,
            `- Total actual: ${formatNumber(summary.totalActual)}`,
            `- Jumlah pengajuan: ${summary.count}`,
            statusParts ? `- Per status: ${statusParts}` : null,
          ].filter(Boolean).join("\n"),
          raw: summary,
        };
      }

      if (intent === "kpi") {
        return executeToolCall(ctx, { ...toolCall, toolId: "kpi_check" }, branchId);
      }

      if (intent === "trend") {
        return executeToolCall(ctx, { ...toolCall, toolId: "trend_analysis" }, branchId);
      }

      if (intent === "cashflow") {
        if (!branchId) return null;
        const result = await ctx.runQuery(internal.features.reports.dashboardQueries.getCashflowWaterfallInternal, {
          branchId: branchId as never,
        }) as Array<{ name: string; value: number }>;
        return {
          toolId: toolCall.toolId,
          title: "Cashflow Waterfall",
          summary: result.map((row) => `- ${row.name}: ${formatNumber(row.value)}`).join("\n"),
          raw: result,
        };
      }

      if (intent === "expense") {
        if (!branchId) return null;
        const result = await ctx.runQuery(internal.features.reports.dashboardQueries.getExpenseBreakdownInternal, {
          branchId: branchId as never,
        }) as Array<{ name: string; value: number }>;
        return {
          toolId: toolCall.toolId,
          title: "Expense Breakdown",
          summary: result.length
            ? result.map((row) => `- ${row.name}: ${formatNumber(row.value)}`).join("\n")
            : "Tidak ada breakdown expense yang tersedia.",
          raw: result,
        };
      }

      if (intent === "recent") {
        if (!branchId) return null;
        const result = await ctx.runQuery(internal.features.reports.dashboardQueries.getRecentTransactionsInternal, {
          branchId: branchId as never,
        }) as Array<{ name: string; type: string; amount: string; time: string; status: string }>;
        return {
          toolId: toolCall.toolId,
          title: "Recent Transactions",
          summary: result.length
            ? result.map((row) => `- ${row.time} | ${row.name} | ${row.amount} | ${row.status}`).join("\n")
            : "Tidak ada transaksi terbaru yang ditemukan.",
          raw: result,
        };
      }

      if (intent === "rag" || (!intent && queryText)) {
        return executeToolCall(ctx, { ...toolCall, toolId: "rag_database" }, branchId);
      }

      return null;
    }

    case "calculator": {
      if (!queryText && !toolCall.expression) return null;
      const expression = (toolCall.expression || queryText).trim();
      const safeExpression = expression.replace(/[^0-9+\-*/().,%\s]/g, "");
      if (!safeExpression) {
        return {
          toolId: toolCall.toolId,
          title: "Kalkulator Bisnis",
          summary: "Ekspresi kalkulasi tidak valid.",
        };
      }

      const result = Function(`"use strict"; return (${safeExpression.replace(/,/g, "")});`)() as number;
      if (typeof result !== "number" || Number.isNaN(result) || !Number.isFinite(result)) {
        return {
          toolId: toolCall.toolId,
          title: "Kalkulator Bisnis",
          summary: "Hasil kalkulasi tidak valid.",
        };
      }

      return {
        toolId: toolCall.toolId,
        title: "Kalkulator Bisnis",
        summary: `Hasil kalkulasi: ${result}`,
        raw: { expression: safeExpression, result },
      };
    }

    case "memory_notes":
      return {
        toolId: toolCall.toolId,
        title: "Catatan & Memori",
        summary: "Tool memori sudah terdaftar di manifest, tetapi persistence memori belum diaktifkan di backend.",
      };

    default:
      return null;
  }
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

    const enabledTools = await ctx.runQuery(internal.features.ai.queries.listEnabledToolsInternal, {});
    const toolPrompt = buildToolManifestPrompt(
      enabledTools.map((tool) => ({
        toolId: tool.toolId,
        name: tool.name,
        description: tool.description,
        syntaxGuide: tool.syntaxGuide,
      }))
    );

    if (toolPrompt) {
      const systemIdx = messages.findIndex((m) => m.role === "system");
      if (systemIdx >= 0) {
        messages[systemIdx] = {
          ...messages[systemIdx],
          content: messages[systemIdx].content + toolPrompt,
        };
      } else {
        messages.unshift({ role: "system", content: toolPrompt });
      }
    }

    const branchId = args.branchId ? String(args.branchId) : undefined;
    const directIntent = detectDirectAnalyticIntent(messages.find((m) => m.role === "user")?.content ?? "");
    if (directIntent === "waste" && branchId) {
      const waste = await ctx.runQuery(internal.features.reports.analytics.getWasteAnalysisInternal, {
        branchId: branchId as never,
      }) as {
        topWastedItems: Array<{ itemName: string; totalQty: number; estimatedCost: number }>;
        topWastedByQty: Array<{ itemName: string; totalQty: number; estimatedCost: number }>;
        totalWasteCost: number;
        totalWasteQty: number;
      };

      const topByQty = waste.topWastedByQty?.[0];
      const topByCost = waste.topWastedItems?.[0];

      if (!topByQty && !topByCost) {
        return {
          content: "Tidak ada data waste untuk cabang ini.",
          model,
          ragContext: ragTexts.length > 0 ? ragTexts : undefined,
        };
      }

      const answerLines = [
        topByQty
          ? `Bahan yang paling sering waste adalah ${topByQty.itemName} (${topByQty.totalQty} unit).`
          : null,
        topByCost
          ? `Dari sisi biaya, yang paling besar waste-nya adalah ${topByCost.itemName} (${formatNumber(topByCost.estimatedCost)}).`
          : null,
        `Total waste tercatat: ${waste.totalWasteQty} unit dengan estimasi biaya ${formatNumber(waste.totalWasteCost)}.`,
      ].filter(Boolean);

      return {
        content: answerLines.join("\n"),
        model,
        ragContext: ragTexts.length > 0 ? ragTexts : undefined,
      };
    }

    let workingMessages = [...messages];
    let tokenUsage: { promptTokens: number; completionTokens: number } | undefined;
    let finalContent = "Tidak ada respons dari AI.";
    let lastToolResult: ToolExecutionResult | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const parsed = await requestModelCompletion(provider, model, workingMessages);
      tokenUsage = parsed.tokenUsage;
      finalContent = parsed.content;

      const toolCall = parseToolCallFromContent(parsed.content);
      if (!toolCall) {
        return {
          content: parsed.content,
          model,
          tokenUsage,
          ragContext: ragTexts.length > 0 ? ragTexts : undefined,
        };
      }

      const toolResult = await executeToolCall(ctx, toolCall, branchId);
      if (!toolResult) {
        return {
          content: parsed.content,
          model,
          tokenUsage,
          ragContext: ragTexts.length > 0 ? ragTexts : undefined,
        };
      }
      lastToolResult = toolResult;

      workingMessages = [
        ...workingMessages,
        { role: "assistant", content: parsed.content },
        {
          role: "system",
          content: [
            "Hasil tool yang harus dipakai untuk jawaban final:",
            formatToolResult(toolResult),
            "Jawab user secara final tanpa menampilkan placeholder atau JSON tool-call.",
          ].join("\n\n"),
        },
      ];
    }

    return {
      content: lastToolResult
        ? `${lastToolResult.title}:\n${lastToolResult.summary}`
        : finalContent,
      model,
      tokenUsage,
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
