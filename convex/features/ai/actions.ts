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
  buildExecutionRouterPrompt,
  extractToolRouteDecision,
  type AiToolCall,
  type AiRouteDecision,
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
  customHeaders?: string,
  temperature = 0.7,
  maxTokens = 4096,
  jsonMode = false
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
        max_tokens: maxTokens,
        temperature,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    },
  };
}

/** Build request for Anthropic Messages API */
function buildAnthropicRequest(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Message[],
  temperature = 0.7,
  maxTokens = 4096
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
        max_tokens: maxTokens,
        temperature,
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

async function requestModelCompletion(
  provider: {
    provider: string;
    apiKey: string;
    baseUrl: string;
    defaultModel: string;
    customHeaders?: string | null;
  },
  model: string,
  messages: Message[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<{
  content: string;
  tokenUsage?: { promptTokens: number; completionTokens: number };
}> {
  const baseUrl = resolveBaseUrl(provider.provider, provider.baseUrl);
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 4096;
  const jsonMode = options?.jsonMode ?? false;
  const req =
    provider.provider === "anthropic"
      ? buildAnthropicRequest(baseUrl, provider.apiKey, model, messages, temperature, maxTokens)
      : buildOpenAIRequest(baseUrl, provider.apiKey, model, messages, provider.customHeaders ?? undefined, temperature, maxTokens, jsonMode);

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

function parseToolRouteDecisionFromContent(content: string): AiRouteDecision | null {
  return extractToolRouteDecision(content);
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

    case "petty_cash_summary": {
      if (!branchId) {
        return {
          toolId: toolCall.toolId,
          title: "Ringkasan Petty Cash",
          summary: "Branch belum tersedia untuk menghitung petty cash.",
        };
      }

      const explicitYearMonth =
        toolCall.year && toolCall.month ? `${toolCall.year}-${String(toolCall.month).padStart(2, "0")}` : null;
      const yearMonth = explicitYearMonth || parseYearMonthFromQuery(queryText) || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

      const summary = await ctx.runQuery(
        internal.features.pettyCash.queries.getMonthlySummaryInternal,
        { branchId: branchId as never, yearMonth } as never
      ) as PettyCashMonthlySummary;

      if (!summary.count) {
        return {
          toolId: toolCall.toolId,
          title: "Ringkasan Petty Cash",
          summary: `Tidak ada data petty cash untuk ${yearMonth}.`,
          raw: summary,
        };
      }

      const statusParts = Object.entries(summary.byStatus)
        .map(([status, total]) => `${status}: ${formatNumber(Number(total))}`)
        .join(", ");

      return {
        toolId: toolCall.toolId,
        title: "Ringkasan Petty Cash",
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

    case "cashflow_summary": {
      if (!branchId) {
        return {
          toolId: toolCall.toolId,
          title: "Ringkasan Cashflow",
          summary: "Branch belum tersedia untuk menghitung cashflow.",
        };
      }

      const result = await ctx.runQuery(internal.features.reports.dashboardQueries.getCashflowWaterfallInternal, {
        branchId: branchId as never,
      }) as Array<{ name: string; value: number }>;

      return {
        toolId: toolCall.toolId,
        title: "Ringkasan Cashflow",
        summary: result.length
          ? result.map((row) => `- ${row.name}: ${formatNumber(row.value)}`).join("\n")
          : "Tidak ada ringkasan cashflow yang tersedia.",
        raw: result,
      };
    }

    case "expense_breakdown": {
      if (!branchId) {
        return {
          toolId: toolCall.toolId,
          title: "Breakdown Expense",
          summary: "Branch belum tersedia untuk menghitung expense.",
        };
      }

      const result = await ctx.runQuery(internal.features.reports.dashboardQueries.getExpenseBreakdownInternal, {
        branchId: branchId as never,
      }) as Array<{ name: string; value: number }>;

      return {
        toolId: toolCall.toolId,
        title: "Breakdown Expense",
        summary: result.length
          ? result.map((row) => `- ${row.name}: ${formatNumber(row.value)}`).join("\n")
          : "Tidak ada breakdown expense yang tersedia.",
        raw: result,
      };
    }

    case "recent_transactions": {
      if (!branchId) {
        return {
          toolId: toolCall.toolId,
          title: "Transaksi Terbaru",
          summary: "Branch belum tersedia untuk mengambil transaksi terbaru.",
        };
      }

      const result = await ctx.runQuery(internal.features.reports.dashboardQueries.getRecentTransactionsInternal, {
        branchId: branchId as never,
      }) as Array<{ name: string; type: string; amount: string; time: string; status: string }>;

      return {
        toolId: toolCall.toolId,
        title: "Transaksi Terbaru",
        summary: result.length
          ? result.map((row) => `- ${row.time} | ${row.name} | ${row.amount} | ${row.status}`).join("\n")
          : "Tidak ada transaksi terbaru yang ditemukan.",
        raw: result,
      };
    }

    case "waste_analysis": {
      if (!branchId) {
        return {
          toolId: toolCall.toolId,
          title: "Analisis Waste",
          summary: "Branch belum tersedia untuk analisis waste.",
        };
      }

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
          toolId: toolCall.toolId,
          title: "Analisis Waste",
          summary: "Tidak ada data waste untuk cabang ini.",
          raw: waste,
        };
      }

      const answerLines = [
        topByQty ? `Bahan yang paling sering waste adalah ${topByQty.itemName} (${topByQty.totalQty} unit).` : null,
        topByCost ? `Dari sisi biaya, yang paling besar waste-nya adalah ${topByCost.itemName} (${formatNumber(topByCost.estimatedCost)}).` : null,
        `Total waste tercatat: ${waste.totalWasteQty} unit dengan estimasi biaya ${formatNumber(waste.totalWasteCost)}.`,
      ].filter(Boolean);

      return {
        toolId: toolCall.toolId,
        title: "Analisis Waste",
        summary: answerLines.join("\n"),
        raw: waste,
      };
    }

    case "laporan_query": {
      if (!queryText) return null;
      return executeToolCall(ctx, { ...toolCall, toolId: "rag_database" }, branchId);
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

async function executeAgentFlow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  provider: {
    provider: string;
    apiKey: string;
    baseUrl: string;
    defaultModel: string;
    customHeaders?: string | null;
  },
  model: string,
  messages: Message[],
  branchId: string | undefined,
  agentId: string
): Promise<{
  content: string;
  tokenUsage?: { promptTokens: number; completionTokens: number };
}> {
  const agent = await ctx.runQuery(internal.features.ai.queries.getAgentByAgentIdInternal, { agentId }) as
    | {
        agentId: string;
        name: string;
        description: string;
        systemPrompt: string;
        allowedToolIds: string[];
        isEnabled: boolean;
      }
    | null;

  if (!agent || !agent.isEnabled) {
    return {
      content: `Agent ${agentId} tidak tersedia.`,
    };
  }

  const enabledTools = await ctx.runQuery(internal.features.ai.queries.listEnabledToolsInternal, {});
  const filteredTools = agent.allowedToolIds.length > 0
    ? enabledTools.filter((tool: { toolId: string }) => agent.allowedToolIds.includes(tool.toolId))
    : enabledTools;
  const toolPrompt = buildExecutionRouterPrompt(
    filteredTools.map((tool: { toolId: string; name: string; description: string; syntaxGuide: string }) => ({
      toolId: tool.toolId,
      name: tool.name,
      description: tool.description,
      syntaxGuide: tool.syntaxGuide,
    })),
    []
  );

  const workingMessages: Message[] = [
    ...messages,
    {
      role: "system",
      content: [
        `Kamu sedang menjalankan agent: ${agent.name} (${agent.agentId}).`,
        "Abaikan instruksi router sebelumnya dan fokus pada tugas agent ini.",
        agent.systemPrompt,
        toolPrompt,
        "Jika kamu memakai tool, keluarkan JSON `tool-call` yang valid.",
        "Jika tugas sudah cukup jelas dari data, jawab langsung tanpa placeholder.",
      ].join("\n\n"),
    },
  ];

  let tokenUsage: { promptTokens: number; completionTokens: number } | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parsed = await requestModelCompletion(provider, model, workingMessages, {
      temperature: 0.2,
      maxTokens: 2048,
      jsonMode: true,
    });
    tokenUsage = parsed.tokenUsage;

    const routeDecision = parseToolRouteDecisionFromContent(parsed.content);
    if (!routeDecision) {
      return {
        content: parsed.content,
        tokenUsage,
      };
    }

    if (routeDecision.mode === "answer") {
      return {
        content: routeDecision.answer,
        tokenUsage,
      };
    }

    if (routeDecision.mode === "agent") {
      return {
        content: `Agent ${agentId} meminta agent lain, tetapi nested agent routing belum diizinkan.`,
        tokenUsage,
      };
    }

    const toolResult = await executeToolCall(
      ctx,
      {
        toolId: routeDecision.toolId,
        query: routeDecision.query,
        action: routeDecision.action,
        args: routeDecision.args,
        branchId: routeDecision.branchId,
        reportId: routeDecision.reportId,
        period: routeDecision.period,
        month: routeDecision.month,
        year: routeDecision.year,
        expression: routeDecision.expression,
      },
      branchId
    );

    if (!toolResult) {
      return {
        content: parsed.content,
        tokenUsage,
      };
    }

    workingMessages.push(
      { role: "assistant", content: parsed.content },
      {
        role: "system",
        content: [
          "Hasil tool untuk agent:",
          formatToolResult(toolResult),
          "Jawab final tanpa menampilkan placeholder, JSON, atau proses berpikir.",
        ].join("\n\n"),
      }
    );
  }

  return {
    content: "Agent belum menghasilkan jawaban final.",
    tokenUsage,
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

    const [enabledTools, enabledAgents] = await Promise.all([
      ctx.runQuery(internal.features.ai.queries.listEnabledToolsInternal, {}),
      ctx.runQuery(internal.features.ai.queries.listEnabledAgentsInternal, {}),
    ]);
    const routerPrompt = buildExecutionRouterPrompt(
      enabledTools.map((tool) => ({
        toolId: tool.toolId,
        name: tool.name,
        description: tool.description,
        syntaxGuide: tool.syntaxGuide,
      })),
      enabledAgents.map((agent) => ({
        agentId: agent.agentId,
        name: agent.name,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
      }))
    );

    const routerMessages: Message[] = [
      { role: "system", content: routerPrompt },
      ...messages.filter((message) => message.role !== "system"),
    ];

    const branchId = args.branchId ? String(args.branchId) : undefined;
    const routerResponse = await requestModelCompletion(provider, model, routerMessages, {
      temperature: 0,
      maxTokens: 1024,
      jsonMode: true,
    });

    const routeDecision = parseToolRouteDecisionFromContent(routerResponse.content);

    if (!routeDecision) {
      return {
        content: routerResponse.content,
        model,
        tokenUsage: routerResponse.tokenUsage,
        ragContext: ragTexts.length > 0 ? ragTexts : undefined,
      };
    }

    if (routeDecision.mode === "answer") {
      return {
        content: routeDecision.answer,
        model,
        tokenUsage: routerResponse.tokenUsage,
        ragContext: ragTexts.length > 0 ? ragTexts : undefined,
      };
    }

    if (routeDecision.mode === "agent") {
      const agentResponse = await executeAgentFlow(
        ctx,
        provider,
        model,
        messages,
        branchId,
        routeDecision.agentId
      );

      return {
        content: agentResponse.content,
        model,
        tokenUsage: agentResponse.tokenUsage ?? routerResponse.tokenUsage,
        ragContext: ragTexts.length > 0 ? ragTexts : undefined,
      };
    }

    const toolResult = await executeToolCall(
      ctx,
      {
        toolId: routeDecision.toolId,
        query: routeDecision.query,
        action: routeDecision.action,
        args: routeDecision.args,
        branchId: routeDecision.branchId,
        reportId: routeDecision.reportId,
        period: routeDecision.period,
        month: routeDecision.month,
        year: routeDecision.year,
        expression: routeDecision.expression,
      },
      branchId
    );

    if (!toolResult) {
      return {
        content: `Tool ${routeDecision.toolId} belum bisa dieksekusi.`,
        model,
        tokenUsage: routerResponse.tokenUsage,
        ragContext: ragTexts.length > 0 ? ragTexts : undefined,
      };
    }

    return {
      content: toolResult.summary,
      model,
      tokenUsage: routerResponse.tokenUsage,
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
