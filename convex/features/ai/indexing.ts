/**
 * AI Data Indexing Pipeline
 *
 * Converts report data into text chunks, generates embeddings,
 * and stores them for RAG vector search.
 */
import { action, internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

const now = () => new Date().toISOString();

// ─── Text Conversion ────────────────────────────────────────

type RecordToTextFn = (record: Record<string, unknown>) => string;

const formatRp = (n: unknown) => {
  const num = Number(n) || 0;
  return `Rp ${num.toLocaleString("id-ID")}`;
};

const TABLE_CONVERTERS: Record<string, RecordToTextFn> = {
  productSales: (r) =>
    `Penjualan ${r.productName}: ${r.qty} pcs, ${formatRp(r.amount)}, harga satuan ${formatRp(r.unitPrice)}, tanggal ${r.businessDate}${r.channel && r.channel !== "all" ? `, channel ${r.channel}` : ""}`,

  vendorPurchases: (r) =>
    `Vendor purchase ${r.commodityName}${r.section ? ` (${r.section})` : ""}: opening ${r.openingQty} (${formatRp(r.openingValue)}), purchase ${r.purchaseQty} (${formatRp(r.purchaseValue)}), usage ${r.usageQty}, closing ${r.closingQty} (${formatRp(r.closingValue)})`,

  costAnalysis: (r) =>
    `Cost analysis ${r.itemName}: opening ${r.openingQty} (${formatRp(r.openingValue)}), purchase ${r.purchaseQty} (${formatRp(r.purchaseValue)}), usage ${r.usageQty} (${formatRp(r.usageValue)}), closing ${r.closingQty} (${formatRp(r.closingValue)}), variance ${formatRp(r.variance)}`,

  dailyCashSummary: (r) =>
    `Kas harian ${r.businessDate}: gross sales ${formatRp(r.grossSales)}, komisi GoFood ${formatRp(r.komisiGofood)}, GrabFood ${formatRp(r.komisiGrabfood)}, ShopeeFood ${formatRp(r.komisiShopeefood)}, koreksi ${formatRp(r.koreksi)}, diskon ${formatRp(r.discount)}, net sales ${formatRp(r.netSales)}`,

  dailyCashFlow: (r) =>
    `Arus kas ${r.businessDate}: opening ${formatRp(r.openingBalance)}, inflow penjualan ${formatRp(r.salesInflow)}, inflow lain ${formatRp(r.otherInflow)}, outflow expense ${formatRp(r.expenseOutflow)}, outflow lain ${formatRp(r.otherOutflow)}, closing ${formatRp(r.closingBalance)}`,

  inventoryValuation: (r) =>
    `Inventori ${r.itemName} (${r.category}): ${r.qty} ${r.unit}, harga satuan ${formatRp(r.unitPrice)}, total ${formatRp(r.totalValue)}, tanggal ${r.valuationDate}`,

  productHPP: (r) =>
    `HPP ${r.productName} (${r.pricingClass}): total HPP ${formatRp(r.totalHPP)}${r.sellingPrice ? `, harga jual ${formatRp(r.sellingPrice)}` : ""}`,

  foodCostSummary: (r) =>
    `Food cost ${r.category}: opening ${formatRp(r.openingValue)}, purchase ${formatRp(r.purchaseValue)}, transfer out ${formatRp(r.transferOutValue)}, transfer in ${formatRp(r.transferInValue)}, closing ${formatRp(r.closingValue)}, usage ${formatRp(r.usageValue)}${r.foodCostPct ? `, food cost ${Number(r.foodCostPct).toFixed(1)}%` : ""}`,

  salesControl: (r) =>
    `Sales control ${r.businessDate}: net sales ${formatRp(r.netSales)}, customer ${r.customerCount}, spending power ${formatRp(r.spendingPower)}, target ${formatRp(r.targetSales)}, achievement ${Number(r.achievementPct).toFixed(1)}%`,

  leftoverItems: (r) =>
    `Left over ${r.itemName}: ${r.qty} pcs, tanggal ${r.businessDate}`,

  creditPurchases: (r) =>
    `Kredit ${r.supplierName}: ${r.itemName}, ${r.qty} pcs, harga satuan ${formatRp(r.unitPrice)}, total ${formatRp(r.totalAmount)}, tanggal ${r.purchaseDate}`,

  transferItems: (r) =>
    `Transfer ${r.direction === "out" ? "keluar" : "masuk"} ${r.category}: ${r.itemName}, ${r.qty}${r.unit ? ` ${r.unit}` : ""}, total ${formatRp(r.totalValue)}`,

  employeeIncentives: (r) =>
    `Insentif ${r.employeeName}: ${r.incentiveType}, ${formatRp(r.amount)}${r.notes ? ` (${r.notes})` : ""}`,
};

/** Convert a record to searchable text */
function recordToText(table: string, record: Record<string, unknown>): string {
  const converter = TABLE_CONVERTERS[table];
  if (!converter) return JSON.stringify(record);
  return converter(record);
}

// ─── Tables to index (in priority order) ────────────────────

const INDEXABLE_TABLES = [
  "productSales",
  "costAnalysis",
  "vendorPurchases",
  "dailyCashSummary",
  "dailyCashFlow",
  "inventoryValuation",
  "productHPP",
  "foodCostSummary",
  "salesControl",
  "leftoverItems",
  "creditPurchases",
  "transferItems",
  "employeeIncentives",
] as const;

// ─── Internal mutation to store embeddings ──────────────────

/** Store a batch of embeddings */
export const storeEmbeddings = internalMutation({
  args: {
    items: v.array(
      v.object({
        sourceTable: v.string(),
        sourceId: v.string(),
        reportId: v.optional(v.id("weeklyReports")),
        periodKey: v.string(),
        textContent: v.string(),
        embedding: v.array(v.float64()),
        embeddingModel: v.string(),
      })
    ),
  },
  handler: async (ctx, { items }) => {
    let count = 0;
    for (const item of items) {
      await ctx.db.insert("aiEmbeddings", {
        ...item,
        createdAt: now(),
      });
      count++;
    }
    return count;
  },
});

/** Delete embeddings for a report (before re-indexing) */
export const deleteEmbeddingsByReport = internalMutation({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    const existing = await ctx.db
      .query("aiEmbeddings")
      .withIndex("by_report", (q) => q.eq("reportId", reportId))
      .collect();
    for (const e of existing) {
      await ctx.db.delete(e._id);
    }
    return existing.length;
  },
});

// ─── Fetch records by report ─────────────────────────────────

/** Fetch all records for any report-linked table */
export const fetchRecordsByReport = internalMutation({
  args: {
    tableName: v.string(),
    reportId: v.id("weeklyReports"),
  },
  handler: async (ctx, { tableName, reportId }) => {
    // Use raw query approach — all report data tables have reportId field
    const records = await (ctx.db.query(tableName as never) as never as {
      withIndex: (name: string, fn: (q: { eq: (f: string, v: unknown) => unknown }) => unknown) => {
        collect: () => Promise<Array<Record<string, unknown>>>;
      };
    }).withIndex("by_report", (q) => q.eq("reportId", reportId)).collect();
    return records;
  },
});

// ─── Main indexing action ───────────────────────────────────

/** Index all data from a weekly report for RAG */
export const indexReportData = action({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }): Promise<{
    indexed: number;
    tables: Record<string, number>;
  }> => {
    await requireAuth(ctx);

    // 1. Get report header for period info
    const report = await ctx.runQuery(
      internal.features.reports.queries.getReportById,
      { reportId }
    );
    if (!report) throw new Error("Report not found");

    // Check if active provider has embedding model
    const provider = await ctx.runQuery(
      internal.features.ai.queries.getActiveProviderWithKey,
      {}
    );
    if (!provider?.embeddingModel) {
      throw new Error(
        "Aktifkan AI provider dengan embedding model terlebih dahulu (OpenRouter atau OpenAI)."
      );
    }

    const periodKey = `${report.periodStart}_${report.periodEnd}`;
    const embeddingModel = provider.embeddingModel;

    // 2. Delete existing embeddings for this report
    await ctx.runMutation(
      internal.features.ai.indexing.deleteEmbeddingsByReport,
      { reportId }
    );

    // 3. For each table, fetch records and build text chunks
    const allTexts: Array<{
      sourceTable: string;
      sourceId: string;
      textContent: string;
    }> = [];
    const tableCounts: Record<string, number> = {};

    for (const tableName of INDEXABLE_TABLES) {
      try {
        const records = await ctx.runMutation(
          internal.features.ai.indexing.fetchRecordsByReport,
          { tableName, reportId }
        );

        for (const record of records) {
          const text = recordToText(tableName, record);
          allTexts.push({
            sourceTable: tableName,
            sourceId: String(record._id),
            textContent: text,
          });
        }
        tableCounts[tableName] = records.length;
      } catch {
        // Table might not have data for this report
        tableCounts[tableName] = 0;
      }
    }

    if (allTexts.length === 0) {
      return { indexed: 0, tables: tableCounts };
    }

    // 4. Generate embeddings in batches
    const texts = allTexts.map((t) => t.textContent);
    const embeddings = await ctx.runAction(
      internal.features.ai.embedding.generateBatchEmbeddings,
      { texts }
    );

    // 5. Store embeddings in batches of 50 (Convex mutation size limit)
    const STORE_BATCH = 50;
    let totalStored = 0;

    for (let i = 0; i < allTexts.length; i += STORE_BATCH) {
      const batch = allTexts.slice(i, i + STORE_BATCH).map((item, j) => ({
        sourceTable: item.sourceTable,
        sourceId: item.sourceId,
        reportId,
        periodKey,
        textContent: item.textContent,
        embedding: embeddings[i + j],
        embeddingModel,
      }));

      const stored = await ctx.runMutation(
        internal.features.ai.indexing.storeEmbeddings,
        { items: batch }
      );
      totalStored += stored;
    }

    return { indexed: totalStored, tables: tableCounts };
  },
});
