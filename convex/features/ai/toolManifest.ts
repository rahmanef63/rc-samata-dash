export type AiToolCategory = "data" | "memory" | "calculation" | "utility";

export type AiToolManifestItem = {
  toolId: string;
  name: string;
  description: string;
  category: AiToolCategory;
  syntaxGuide: string;
  parameters?: string;
};

export type AiToolCall = {
  toolId: string;
  query?: string;
  action?: string;
  args?: Record<string, unknown>;
  branchId?: string;
  reportId?: string;
  period?: string;
  month?: string;
  year?: string;
  expression?: string;
};

export const BUILTIN_AI_TOOL_MANIFEST: AiToolManifestItem[] = [
  {
    toolId: "laporan_query",
    name: "Query Laporan",
    description: "Mengakses data laporan mingguan dan ringkasan operasional dari Convex.",
    category: "data",
    syntaxGuide: `Gunakan tool ini untuk pertanyaan operasional yang butuh data aktual.
Output tool call yang valid:
\`\`\`tool-call
{"toolId":"laporan_query","query":"pertanyaan user"}
\`\`\`

Contoh:
- "Berapa total omzet minggu ini?"
- "Berapa petty cash bulan Februari?"
- "Tampilkan expense breakdown bulan ini"

Tool ini akan otomatis diarahkan ke query Convex yang paling relevan.`,
  },
  {
    toolId: "kpi_check",
    name: "KPI & Target",
    description: "Memeriksa KPI aktual vs target, termasuk food cost, margin, waste, dan sales achievement.",
    category: "data",
    syntaxGuide: `Gunakan tool ini untuk evaluasi performa.
Output tool call:
\`\`\`tool-call
{"toolId":"kpi_check","query":"evaluasi KPI bulan ini"}
\`\`\`

Jika user menyebut periode tertentu, sertakan di query.`,
  },
  {
    toolId: "memory_notes",
    name: "Catatan & Memori",
    description: "Mencatat insight penting dan konteks percakapan untuk dipakai lagi nanti.",
    category: "memory",
    syntaxGuide: `Gunakan tool ini untuk menyimpan atau mengambil catatan bisnis yang penting.
Output tool call:
\`\`\`tool-call
{"toolId":"memory_notes","action":"remember","query":"simpan catatan ini"}
\`\`\`

Saat ini tool ini dipersiapkan sebagai manifest, tetapi bisa dikembangkan ke persistence penuh jika tabel memori diaktifkan.`,
  },
  {
    toolId: "calculator",
    name: "Kalkulator Bisnis",
    description: "Menghitung food cost, margin, ROI, break-even, dan metrik keuangan lain.",
    category: "calculation",
    syntaxGuide: `Gunakan tool ini untuk perhitungan numerik.
Output tool call:
\`\`\`tool-call
{"toolId":"calculator","expression":"(cogs / revenue) * 100"}
\`\`\`

Jika pertanyaan berbasis formula bisnis, jelaskan input yang dipakai.`,
  },
  {
    toolId: "rag_database",
    name: "RAG Database",
    description: "Pencarian semantik ke data Convex untuk jawaban berbasis konteks data.",
    category: "data",
    syntaxGuide: `Gunakan tool ini saat pertanyaan butuh pencarian konteks dari database.
Output tool call:
\`\`\`tool-call
{"toolId":"rag_database","query":"pertanyaan user"}
\`\`\`

Tabel utama yang didukung: productSales, vendorPurchases, costAnalysis, dailyCashSummary, dailyCashFlow, inventoryValuation, productHPP, expenses, leftoverItems.`,
  },
  {
    toolId: "trend_analysis",
    name: "Analisis Tren",
    description: "Menganalisis tren penjualan, cashflow, dan performa antar periode.",
    category: "utility",
    syntaxGuide: `Gunakan tool ini untuk perbandingan periode dan analisis tren.
Output tool call:
\`\`\`tool-call
{"toolId":"trend_analysis","query":"bandingkan minggu ini vs minggu lalu"}
\`\`\`

Jika user menyebut periode harian, mingguan, atau bulanan, sertakan di query.`,
  },
];

export function buildToolManifestPrompt(tools: Array<Pick<AiToolManifestItem, "toolId" | "name" | "description" | "syntaxGuide">>): string {
  if (tools.length === 0) return "";

  const lines = [
    "## Tool Manifest",
    "Kamu memiliki akses ke tools berikut. Gunakan hanya jika memang diperlukan.",
    ...tools.flatMap((tool, index) => [
      `### ${index + 1}. ${tool.name} (${tool.toolId})`,
      tool.description,
      tool.syntaxGuide,
    ]),
    "## Tool Call Protocol",
    "Jika perlu memakai tool, jangan jawab dengan placeholder seperti [DATA QUERY: ...].",
    "Sebagai gantinya, keluarkan satu blok code fence berlabel `tool-call` berisi JSON valid.",
    "Contoh:",
    "```tool-call",
    '{"toolId":"laporan_query","query":"Berapa petty cash bulan Februari?"}',
    "```",
    "Setelah tool hasilnya diberikan kembali oleh sistem, jawab user secara final dan ringkas.",
  ];

  return `\n\n${lines.join("\n")}`;
}

export function extractToolCall(content: string): AiToolCall | null {
  const blockMatch = content.match(/```(?:tool-call|json)?\s*([\s\S]*?)```/i);
  const raw = (blockMatch?.[1] || content).trim();

  if (!raw.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const toolId = typeof parsed.toolId === "string" ? parsed.toolId : typeof parsed.tool === "string" ? parsed.tool : "";
    if (!toolId) return null;

    const call: AiToolCall = { toolId };
    for (const key of ["query", "action", "branchId", "reportId", "period", "month", "year", "expression"] as const) {
      if (typeof parsed[key] === "string") call[key] = parsed[key];
    }
    if (parsed.args && typeof parsed.args === "object" && !Array.isArray(parsed.args)) {
      call.args = parsed.args as Record<string, unknown>;
    }
    return call;
  } catch {
    return null;
  }
}

export function extractLegacyDataQuery(content: string): string | null {
  const match = content.match(/\[DATA QUERY:\s*([^\]]+)\]/i);
  return match?.[1]?.trim() || null;
}
