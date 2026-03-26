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

export type AiRouteDecision =
  | {
      mode: "tool";
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
    }
  | {
      mode: "answer";
      answer: string;
    };

export const BUILTIN_AI_TOOL_MANIFEST: AiToolManifestItem[] = [
  {
    toolId: "laporan_query",
    name: "Query Laporan",
    description: "Fallback untuk pertanyaan data umum yang belum cocok ke tool spesifik.",
    category: "data",
    syntaxGuide: `Gunakan tool ini untuk pertanyaan operasional yang butuh data aktual.
Output tool call yang valid:
\`\`\`tool-call
{"mode":"tool","toolId":"laporan_query","query":"pertanyaan user"}
\`\`\`

Contoh:
- "Berapa total omzet minggu ini?"
- "Berapa petty cash bulan Februari?"
- "Tampilkan expense breakdown bulan ini"

Gunakan tool ini hanya jika tool yang lebih spesifik tidak tersedia.`,
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
    toolId: "petty_cash_summary",
    name: "Ringkasan Petty Cash",
    description: "Mengambil ringkasan petty cash bulanan dari Convex.",
    category: "data",
    syntaxGuide: `Gunakan tool ini untuk pertanyaan petty cash per bulan.
Output tool call:
\`\`\`tool-call
{"mode":"tool","toolId":"petty_cash_summary","query":"petty cash bulan Februari"}
\`\`\`

Jika user menyebut bulan dan tahun, sertakan di query.`,
  },
  {
    toolId: "cashflow_summary",
    name: "Ringkasan Cashflow",
    description: "Menampilkan ringkasan cashflow dan aliran kas dari Convex.",
    category: "data",
    syntaxGuide: `Gunakan tool ini untuk pertanyaan tentang arus kas, cashflow, atau aliran kas.
Output tool call:
\`\`\`tool-call
{"mode":"tool","toolId":"cashflow_summary","query":"ringkasan cashflow minggu ini"}
\`\`\``,
  },
  {
    toolId: "expense_breakdown",
    name: "Breakdown Expense",
    description: "Menampilkan rincian expense atau biaya yang tercatat di Convex.",
    category: "data",
    syntaxGuide: `Gunakan tool ini untuk pertanyaan tentang pengeluaran, biaya, atau expense breakdown.
Output tool call:
\`\`\`tool-call
{"mode":"tool","toolId":"expense_breakdown","query":"expense breakdown bulan ini"}
\`\`\``,
  },
  {
    toolId: "recent_transactions",
    name: "Transaksi Terbaru",
    description: "Menampilkan transaksi terbaru dari data operasional.",
    category: "data",
    syntaxGuide: `Gunakan tool ini untuk pertanyaan tentang transaksi terakhir atau transaksi terbaru.
Output tool call:
\`\`\`tool-call
{"mode":"tool","toolId":"recent_transactions","query":"transaksi terbaru"}
\`\`\``,
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
  {
    toolId: "waste_analysis",
    name: "Analisis Waste",
    description: "Menganalisis bahan atau item yang paling sering waste berdasarkan qty dan estimasi biaya.",
    category: "data",
    syntaxGuide: `Gunakan tool ini untuk pertanyaan tentang bahan paling boros, waste terbanyak, atau item paling sering terbuang.
Output tool call:
\`\`\`tool-call
{"mode":"tool","toolId":"waste_analysis","query":"bahan paling boros"}
\`\`\`

Pakai tool ini untuk pertanyaan seperti:
- "Bahan paling boros?"
- "Item mana yang paling sering waste?"
- "Apa bahan yang paling banyak terbuang bulan ini?"`,
  },
];

export function buildToolRouterPrompt(tools: Array<Pick<AiToolManifestItem, "toolId" | "name" | "description" | "syntaxGuide">>): string {
  if (tools.length === 0) return "";

  const lines = [
    "## Tool Router",
    "Kamu adalah router yang memilih tool paling tepat atau menjawab langsung jika tidak butuh tool.",
    "Jangan memberi penjelasan proses. Jangan bilang 'saya akan cek' atau 'tunggu sebentar'.",
    "Keluarkan HANYA satu blok code fence `tool-call` berisi JSON valid dengan salah satu bentuk berikut:",
    `{"mode":"tool","toolId":"...","query":"..."}`,
    `{"mode":"answer","answer":"..."}`,
    "Jika pertanyaan butuh data, analitik, kalkulasi, atau RAG, pilih tool yang paling spesifik.",
    "Jangan pilih laporan_query jika ada tool spesifik yang cocok seperti petty_cash_summary, cashflow_summary, expense_breakdown, recent_transactions, waste_analysis, kpi_check, atau trend_analysis.",
    "Jika bisa dijawab tanpa tool, pilih mode answer dan jawab langsung.",
    ...tools.flatMap((tool, index) => [
      `### ${index + 1}. ${tool.name} (${tool.toolId})`,
      tool.description,
      tool.syntaxGuide,
    ]),
  ];

  return `\n\n${lines.join("\n")}`;
}

export function extractToolRouteDecision(content: string): AiRouteDecision | null {
  const blockMatch = content.match(/```(?:tool-call|json)?\s*([\s\S]*?)```/i);
  const raw = (blockMatch?.[1] || content).trim();

  if (!raw.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const mode = typeof parsed.mode === "string" ? parsed.mode : "";

    if (mode === "answer" && typeof parsed.answer === "string") {
      return { mode: "answer", answer: parsed.answer.trim() };
    }

    const toolId = typeof parsed.toolId === "string" ? parsed.toolId : typeof parsed.tool === "string" ? parsed.tool : "";
    if (!toolId) return null;

    const call: AiRouteDecision = { mode: "tool", toolId };
    for (const key of ["query", "action", "branchId", "reportId", "period", "month", "year", "expression"] as const) {
      if (typeof parsed[key] === "string") (call as Extract<AiRouteDecision, { mode: "tool" }>)[key] = parsed[key];
    }
    if (parsed.args && typeof parsed.args === "object" && !Array.isArray(parsed.args)) {
      (call as Extract<AiRouteDecision, { mode: "tool" }>).args = parsed.args as Record<string, unknown>;
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
