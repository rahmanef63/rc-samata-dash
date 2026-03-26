import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { aiProviderValidator, aiToolCategoryValidator } from "./_schema";

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
    await ctx.db.patch(id, { isEnabled });
  },
});

/** Delete a tool (only non-built-in) */
export const deleteTool = mutation({
  args: { id: v.id("aiTools") },
  handler: async (ctx, { id }) => {
    const tool = await ctx.db.get(id);
    if (tool?.isBuiltIn) throw new Error("Tidak bisa menghapus tool bawaan.");
    await ctx.db.delete(id);
  },
});

/** Seed default built-in tools (idempotent) */
export const seedDefaultTools = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("aiTools").collect();
    const existingIds = new Set(existing.map((t) => t.toolId));

    const defaults = [
      {
        toolId: "laporan_query",
        name: "Query Laporan",
        description: "Mengakses data laporan mingguan: penjualan, HPP, expense, cashflow, vendor, stok",
        category: "data" as const,
        syntaxGuide: `Gunakan skill ini untuk menjawab pertanyaan tentang data bisnis.
Contoh query yang bisa dijawab:
- "Berapa total omzet minggu ini?" → Referensi data productSales
- "Apa food cost bulan ini?" → Referensi data costAnalysis
- "Vendor mana yang paling banyak pembelian?" → Referensi data vendorPurchases
- "Berapa saldo kas?" → Referensi data dailyCashSummary

Format jawaban: Gunakan angka spesifik dari data, format Rupiah dengan separator ribuan.`,
      },
      {
        toolId: "kpi_check",
        name: "KPI & Target",
        description: "Memeriksa KPI aktual vs target: food cost %, gross margin, waste, sales achievement",
        category: "data" as const,
        syntaxGuide: `Gunakan skill ini untuk analisis performa bisnis.
KPI standar QSR:
- Food Cost: target <33%, warning 38%, danger >42%
- Gross Margin: target >67%, warning <60%, danger <55%
- Waste: target <1.5%, warning >2.5%, danger >4%
- Sales Achievement: target 100%, warning <85%, danger <70%

Format: Tampilkan status (Baik/Perhatian/Bahaya) dengan warna indikator.`,
      },
      {
        toolId: "memory_notes",
        name: "Catatan & Memori",
        description: "Menyimpan dan mengingat catatan penting tentang bisnis, keputusan, dan insight",
        category: "memory" as const,
        syntaxGuide: `Gunakan skill ini untuk mengingat konteks percakapan sebelumnya.
Kemampuan:
- Mengingat insight penting dari analisis sebelumnya
- Menyimpan keputusan yang sudah diambil owner
- Mengingat pola atau tren yang ditemukan

Contoh: "Ingat bahwa vendor X sering telat kirim" atau "Bulan lalu food cost naik karena harga ayam naik"`,
      },
      {
        toolId: "calculator",
        name: "Kalkulator Bisnis",
        description: "Menghitung food cost, margin, break-even, ROI, dan metrik keuangan lainnya",
        category: "calculation" as const,
        syntaxGuide: `Gunakan skill ini untuk perhitungan keuangan.
Formula yang tersedia:
- Food Cost % = (COGS / Revenue) × 100
- Gross Margin % = ((Revenue - COGS) / Revenue) × 100
- Break Even = Fixed Cost / (1 - Variable Cost Ratio)
- ROI = (Gain - Cost) / Cost × 100
- Inventory Turnover = COGS / Average Inventory

Format: Tampilkan formula, input, dan hasil dengan format Rupiah.`,
      },
      {
        toolId: "rag_database",
        name: "RAG Database",
        description: "Retrieval-Augmented Generation dari database Convex untuk jawaban akurat berbasis data",
        category: "data" as const,
        syntaxGuide: `Skill ini secara otomatis mengambil data relevan dari database Convex.

Tabel yang tersedia untuk RAG:
- productSales: Data penjualan produk (qty, amount, productName)
- vendorPurchases: Data pembelian vendor (commodity, qty, price)
- costAnalysis: Analisis biaya (opening, purchase, usage, closing, variance)
- dailyCashSummary: Ringkasan kas harian (grossSales, expenses, netSales)
- dailyCashFlow: Arus kas harian (inflow, outflow, balance)
- inventoryValuation: Valuasi stok (item, qty, value)
- productHPP: HPP per produk (cost breakdown, selling price)
- expenses: Data pengeluaran per kategori
- leftoverItems: Data sisa/waste harian

Syntax untuk query:
[DATA:tabel_name] → ambil semua data dari tabel
[DATA:tabel_name:filter_field=value] → ambil data dengan filter
[AGGREGATE:tabel_name:sum:field_name] → agregasi data`,
      },
      {
        toolId: "trend_analysis",
        name: "Analisis Tren",
        description: "Menganalisis tren penjualan, biaya, dan performa dari waktu ke waktu",
        category: "utility" as const,
        syntaxGuide: `Gunakan skill ini untuk analisis tren dan forecasting.
Kemampuan:
- Perbandingan periode (minggu ini vs minggu lalu)
- Tren harian dalam satu minggu
- Identifikasi anomali (lonjakan/penurunan tidak wajar)
- Prediksi sederhana berdasarkan tren

Format: Gunakan persentase perubahan, tanda ↑/↓, dan highlight anomali.`,
      },
    ];

    for (const tool of defaults) {
      if (!existingIds.has(tool.toolId)) {
        await ctx.db.insert("aiTools", {
          ...tool,
          isBuiltIn: true,
          isEnabled: true,
          createdAt: now(),
        });
      }
    }

    return { seeded: defaults.filter((t) => !existingIds.has(t.toolId)).length };
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
    const inst = await ctx.db.get(id);
    if (inst?.isDefault) throw new Error("Tidak bisa menghapus instruksi default.");
    await ctx.db.delete(id);
  },
});

/** Set an instruction as active */
export const setActiveInstruction = mutation({
  args: { id: v.id("aiCustomInstructions") },
  handler: async (ctx, { id }) => {
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
    const existing = await ctx.db
      .query("aiCustomInstructions")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .first();

    if (existing) return { seeded: false, id: existing._id };

    const id = await ctx.db.insert("aiCustomInstructions", {
      name: "RC Samata Default",
      content: `Kamu adalah AI Assistant untuk RC Samata Gowa (franchise Rocket Chicken).
Kamu membantu pemilik/owner memahami data bisnis: omzet, expense, stok, cashflow, HPP, dan laporan keuangan.

## Panduan Respons
- Jawab dalam Bahasa Indonesia yang profesional dan ringkas
- Gunakan angka dan data spesifik jika relevan
- Format angka Rupiah: Rp 1.234.567
- Gunakan tabel markdown untuk perbandingan data
- Berikan rekomendasi actionable berdasarkan data

## Skills yang Tersedia
Kamu memiliki akses ke skills berikut untuk membantu menjawab:

### 1. Query Laporan [DATA]
Akses data laporan: penjualan, HPP, expense, cashflow, vendor, stok.
Syntax: Referensikan data dari tabel yang sesuai.

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

## Konteks Bisnis
- Rocket Chicken: franchise ayam goreng
- Cabang: RC Samata Gowa (Sulawesi Selatan)
- Metrik utama: omzet harian, food cost %, gross margin, waste rate
- Periode laporan: mingguan (Senin-Minggu)`,
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
    model: v.optional(v.string()),
    tokenUsage: v.optional(
      v.object({
        promptTokens: v.number(),
        completionTokens: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
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
