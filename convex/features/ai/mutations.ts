import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { aiProviderValidator, aiToolCategoryValidator } from "./_schema";
import { BUILTIN_AI_AGENT_MANIFEST, BUILTIN_AI_TOOL_MANIFEST } from "./toolManifest";
import { requireAuth } from "../../shared/auth";

const now = () => new Date().toISOString();

/** Default base URLs — fallback if client sends empty */
const DEFAULT_BASE_URLS: Record<string, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  openclaw: "https://api.openclaw.ai/v1",
  custom: "http://localhost:11434/v1",
};

/** Default embedding models per provider */
const DEFAULT_EMBEDDING_MODELS: Record<string, string> = {
  openrouter: "openai/text-embedding-3-small",
  openai: "text-embedding-3-small",
};

// ─── Provider Mutations ─────────────────────────────────────

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
    embeddingModel: v.optional(v.string()),
    embeddingBaseUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
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

    const baseUrl = args.baseUrl?.trim() && args.baseUrl.startsWith("http")
      ? args.baseUrl
      : DEFAULT_BASE_URLS[args.provider] || DEFAULT_BASE_URLS.openrouter;

    // Auto-enable embedding model for OpenRouter
    const embeddingModel = args.embeddingModel
      || DEFAULT_EMBEDDING_MODELS[args.provider]
      || "text-embedding-3-small";

    if (args.id) {
      const update: Record<string, unknown> = {
        provider: args.provider,
        displayName: args.displayName,
        baseUrl,
        defaultModel: args.defaultModel,
        isActive: args.isActive,
        customHeaders: args.customHeaders,
        embeddingModel,
        embeddingBaseUrl: args.embeddingBaseUrl,
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
        baseUrl,
        apiKey: args.apiKey,
        defaultModel: args.defaultModel,
        isActive: args.isActive,
        customHeaders: args.customHeaders,
        embeddingModel,
        embeddingBaseUrl: args.embeddingBaseUrl,
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
    await requireAuth(ctx);
    await ctx.db.delete(id);
  },
});

/** Set a provider as active */
export const setActiveProvider = mutation({
  args: { id: v.id("aiProviders") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
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

// ─── Tool/Skill Mutations ───────────────────────────────────

/** Upsert a tool definition */
export const upsertTool = mutation({
  args: {
    id: v.optional(v.id("aiTools")),
    toolId: v.string(),
    name: v.string(),
    description: v.string(),
    category: aiToolCategoryValidator,
    syntaxGuide: v.string(),
    isBuiltIn: v.boolean(),
    isEnabled: v.boolean(),
    parameters: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (args.id) {
      await ctx.db.patch(args.id, {
        toolId: args.toolId,
        name: args.name,
        description: args.description,
        category: args.category,
        syntaxGuide: args.syntaxGuide,
        isEnabled: args.isEnabled,
        parameters: args.parameters,
      });
      return args.id;
    }
    return await ctx.db.insert("aiTools", {
      toolId: args.toolId,
      name: args.name,
      description: args.description,
      category: args.category,
      syntaxGuide: args.syntaxGuide,
      isBuiltIn: args.isBuiltIn,
      isEnabled: args.isEnabled,
      parameters: args.parameters,
      createdAt: now(),
    });
  },
});

/** Toggle a tool on/off */
export const toggleTool = mutation({
  args: { id: v.id("aiTools"), isEnabled: v.boolean() },
  handler: async (ctx, { id, isEnabled }) => {
    await requireAuth(ctx);
    await ctx.db.patch(id, { isEnabled });
  },
});

// ─── Agent Mutations ────────────────────────────────────────

/** Upsert an agent definition */
export const upsertAgent = mutation({
  args: {
    id: v.optional(v.id("aiAgents")),
    agentId: v.string(),
    name: v.string(),
    description: v.string(),
    systemPrompt: v.string(),
    allowedToolIds: v.array(v.string()),
    isBuiltIn: v.boolean(),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (args.id) {
      await ctx.db.patch(args.id, {
        agentId: args.agentId,
        name: args.name,
        description: args.description,
        systemPrompt: args.systemPrompt,
        allowedToolIds: args.allowedToolIds,
        isEnabled: args.isEnabled,
        updatedAt: now(),
      });
      return args.id;
    }

    return await ctx.db.insert("aiAgents", {
      agentId: args.agentId,
      name: args.name,
      description: args.description,
      systemPrompt: args.systemPrompt,
      allowedToolIds: args.allowedToolIds,
      isBuiltIn: args.isBuiltIn,
      isEnabled: args.isEnabled,
      createdAt: now(),
      updatedAt: now(),
    });
  },
});

/** Toggle an agent on/off */
export const toggleAgent = mutation({
  args: { id: v.id("aiAgents"), isEnabled: v.boolean() },
  handler: async (ctx, { id, isEnabled }) => {
    await requireAuth(ctx);
    await ctx.db.patch(id, { isEnabled, updatedAt: now() });
  },
});

/** Delete an agent (only non-built-in) */
export const deleteAgent = mutation({
  args: { id: v.id("aiAgents") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    const agent = await ctx.db.get(id);
    if (agent?.isBuiltIn) throw new Error("Tidak bisa menghapus agent bawaan.");
    await ctx.db.delete(id);
  },
});

/** Seed default built-in agents (idempotent) */
export const seedDefaultAgents = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const existing = await ctx.db.query("aiAgents").collect();
    const existingByAgentId = new Map(existing.map((agent) => [agent.agentId, agent]));

    let inserted = 0;
    let updated = 0;

    for (const agent of BUILTIN_AI_AGENT_MANIFEST) {
      const existingAgent = existingByAgentId.get(agent.agentId);
      if (!existingAgent) {
        await ctx.db.insert("aiAgents", {
          agentId: agent.agentId,
          name: agent.name,
          description: agent.description,
          systemPrompt: agent.systemPrompt,
          allowedToolIds: agent.allowedToolIds ?? [],
          isBuiltIn: true,
          isEnabled: true,
          createdAt: now(),
          updatedAt: now(),
        });
        inserted += 1;
        continue;
      }

      const nextValues = {
        name: agent.name,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        allowedToolIds: agent.allowedToolIds || [],
        isBuiltIn: true,
      };

      const changed =
        existingAgent.name !== nextValues.name ||
        existingAgent.description !== nextValues.description ||
        existingAgent.systemPrompt !== nextValues.systemPrompt ||
        JSON.stringify(existingAgent.allowedToolIds || []) !== JSON.stringify(nextValues.allowedToolIds) ||
        existingAgent.isBuiltIn !== true;

      if (changed) {
        await ctx.db.patch(existingAgent._id, { ...nextValues, updatedAt: now() });
        updated += 1;
      }
    }

    return { seeded: inserted, updated };
  },
});

/** Delete a tool (only non-built-in) */
export const deleteTool = mutation({
  args: { id: v.id("aiTools") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    const tool = await ctx.db.get(id);
    if (tool?.isBuiltIn) throw new Error("Tidak bisa menghapus tool bawaan.");
    await ctx.db.delete(id);
  },
});

/** Seed default built-in tools (idempotent) */
export const seedDefaultTools = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const existing = await ctx.db.query("aiTools").collect();
    const existingByToolId = new Map(existing.map((tool) => [tool.toolId, tool]));

    let inserted = 0;
    let updated = 0;

    for (const tool of BUILTIN_AI_TOOL_MANIFEST) {
      const existingTool = existingByToolId.get(tool.toolId);
      if (!existingTool) {
        await ctx.db.insert("aiTools", {
          ...tool,
          isBuiltIn: true,
          isEnabled: true,
          createdAt: now(),
        });
        inserted += 1;
        continue;
      }

      const nextValues = {
        name: tool.name,
        description: tool.description,
        category: tool.category,
        syntaxGuide: tool.syntaxGuide,
        isBuiltIn: true,
      };

      const changed =
        existingTool.name !== nextValues.name ||
        existingTool.description !== nextValues.description ||
        existingTool.category !== nextValues.category ||
        existingTool.syntaxGuide !== nextValues.syntaxGuide ||
        existingTool.isBuiltIn !== true;

      if (changed) {
        await ctx.db.patch(existingTool._id, nextValues);
        updated += 1;
      }
    }

    return { seeded: inserted, updated };
  },
});

// ─── Custom Instructions Mutations ──────────────────────────

/** Upsert a custom instruction */
export const upsertInstruction = mutation({
  args: {
    id: v.optional(v.id("aiCustomInstructions")),
    name: v.string(),
    content: v.string(),
    isDefault: v.boolean(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    // If setting active, deactivate others
    if (args.isActive) {
      const active = await ctx.db
        .query("aiCustomInstructions")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
      for (const i of active) {
        if (i._id !== args.id) {
          await ctx.db.patch(i._id, { isActive: false, updatedAt: now() });
        }
      }
    }

    if (args.id) {
      await ctx.db.patch(args.id, {
        name: args.name,
        content: args.content,
        isActive: args.isActive,
        updatedAt: now(),
      });
      return args.id;
    }
    return await ctx.db.insert("aiCustomInstructions", {
      name: args.name,
      content: args.content,
      isDefault: args.isDefault,
      isActive: args.isActive,
      createdAt: now(),
      updatedAt: now(),
    });
  },
});

/** Delete a custom instruction (not default) */
export const deleteInstruction = mutation({
  args: { id: v.id("aiCustomInstructions") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    const inst = await ctx.db.get(id);
    if (inst?.isDefault) throw new Error("Tidak bisa menghapus instruksi default.");
    await ctx.db.delete(id);
  },
});

/** Set an instruction as active */
export const setActiveInstruction = mutation({
  args: { id: v.id("aiCustomInstructions") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    const all = await ctx.db
      .query("aiCustomInstructions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    for (const i of all) {
      await ctx.db.patch(i._id, { isActive: false, updatedAt: now() });
    }
    await ctx.db.patch(id, { isActive: true, updatedAt: now() });
  },
});

/** Seed default instruction (idempotent) */
export const seedDefaultInstruction = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const existing = await ctx.db
      .query("aiCustomInstructions")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .first();

    const defaultContent = `Kamu adalah AI Assistant untuk RC Samata Gowa (franchise Rocket Chicken).
Kamu membantu pemilik/owner memahami data bisnis: omzet, expense, stok, cashflow, HPP, dan laporan keuangan.

## Panduan Respons
- Jawab dalam Bahasa Indonesia yang profesional dan ringkas
- Gunakan angka dan data spesifik jika relevan
- Format angka Rupiah: Rp 1.234.567
- Gunakan tabel markdown untuk perbandingan data
- Berikan rekomendasi actionable berdasarkan data
- Jika user meminta diagram, KPI ringkas, perbandingan, daftar aksi, atau tabel data, siapkan visual yang sesuai karena UI chat bisa merender visual otomatis

## Skills yang Tersedia
Kamu memiliki akses ke tools berikut. Gunakan manifest dan tool call protocol secara konsisten.

### 1. Query Laporan [DATA]
Akses data laporan: penjualan, HPP, expense, cashflow, vendor, stok.

### 2. KPI & Target [KPI]
Evaluasi performa: food cost %, margin, waste, sales achievement.
Benchmark: Food Cost <33% (baik), 33-38% (perhatian), >38% (bahaya).

### 3. Catatan & Memori [MEMORY]
Ingat konteks percakapan dan keputusan penting.

### 4. Kalkulator Bisnis [CALC]
Hitung: food cost, margin, break-even, ROI, inventory turnover.

### 5. RAG Database [RAG]
Retrieval dari database Convex untuk jawaban berbasis data aktual.
Tabel: productSales, vendorPurchases, costAnalysis, dailyCashSummary,
dailyCashFlow, inventoryValuation, productHPP, expenses, leftoverItems.

### 6. Analisis Tren [TREND]
Analisis tren waktu: perbandingan periode, anomali, forecasting.

### 7. Agents
Agent adalah workflow multi-langkah. Gunakan kalau perlu analisis bertahap atau sintesis beberapa data.

## Tool Call Protocol
Router akan memilih tool, agent, atau jawaban langsung.
Jika perlu memakai data atau kalkulasi, jangan berhenti di teks placeholder.
Jika user meminta visual, ambil data yang relevan lalu pilih visual yang paling sesuai.
Keluarkan satu blok code fence berlabel \`tool-call\` berisi JSON valid.
Contoh:
\`\`\`tool-call
{"mode":"tool","toolId":"petty_cash_summary","query":"Berapa petty cash bulan Februari?"}
\`\`\`

Setelah tool result diberikan kembali oleh sistem, jawab final secara ringkas dan langsung ke inti.

## Konteks Bisnis
- Rocket Chicken: franchise ayam goreng
- Cabang: RC Samata Gowa (Sulawesi Selatan)
- Metrik utama: omzet harian, food cost %, gross margin, waste rate
- Periode laporan: mingguan (Senin-Minggu)`;

    if (existing) {
      const needsUpdate = existing.content !== defaultContent || !existing.isDefault;
      if (needsUpdate) {
        await ctx.db.patch(existing._id, {
          name: "RC Samata Default",
          content: defaultContent,
          isDefault: true,
          isActive: true,
          updatedAt: now(),
        });
      }
      return { seeded: false, id: existing._id, updated: needsUpdate };
    }

    const id = await ctx.db.insert("aiCustomInstructions", {
      name: "RC Samata Default",
      content: defaultContent,
      isDefault: true,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    });

    return { seeded: true, id };
  },
});

// ─── Chat Session Mutations ─────────────────────────────────

/** Create a new chat session */
export const createChatSession = mutation({
  args: {
    title: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const active = await ctx.db
      .query("aiProviders")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    // Get active instruction
    const instruction = await ctx.db
      .query("aiCustomInstructions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    // Get enabled tools
    const enabledTools = await ctx.db
      .query("aiTools")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();

    return await ctx.db.insert("aiChatSessions", {
      title: args.title || "Chat baru",
      userId: userId as never,
      providerId: active?._id,
      model: active?.defaultModel,
      systemPrompt: args.systemPrompt || instruction?.content,
      customInstructionId: instruction?._id,
      enabledToolIds: enabledTools.map((t) => t.toolId),
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
    visualsJson: v.optional(v.string()),
    model: v.optional(v.string()),
    tokenUsage: v.optional(
      v.object({
        promptTokens: v.number(),
        completionTokens: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Chat session not found.");
    }

    if (args.role === "user") {
      if (session?.title === "Chat baru") {
        const title = args.content.slice(0, 60) + (args.content.length > 60 ? "..." : "");
        await ctx.db.patch(args.sessionId, { title, updatedAt: now() });
      }
    }

    return await ctx.db.insert("aiChatMessages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      visualsJson: args.visualsJson,
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
    const userId = await requireAuth(ctx);
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Chat session not found.");
    }

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
