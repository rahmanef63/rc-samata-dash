# Vector Search & Embedding Plan — RC Samata AI RAG

## Overview

Enable Retrieval-Augmented Generation (RAG) so the AI chat can answer questions
using actual data from the Convex database. When a user asks "berapa omzet minggu
ini?", the system retrieves relevant records, embeds them, and includes the data
in the AI prompt context.

## Architecture

```
User Question
    │
    ▼
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Embed Query │────▶│  Vector Search    │────▶│ Build RAG Prompt│
│  (OpenAI API)│     │  (Convex vectors) │     │ (data + question)│
└──────────────┘     └──────────────────┘     └────────┬────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │  Chat Completion │
                                              │  (AI Provider)   │
                                              └─────────────────┘
```

## Phase 1: Embedding Infrastructure

### 1A. Schema — `convex/features/ai/_schema.ts`

New table:

```typescript
aiEmbeddings: defineTable({
  sourceTable: v.string(),       // "productSales", "costAnalysis", etc.
  sourceId: v.id("_any"),        // Reference to source document
  branchId: v.id("branches"),
  periodKey: v.string(),         // "2026-W12", "2026-03" for grouping
  textContent: v.string(),       // The text that was embedded
  embedding: v.array(v.float64()), // 1536-dim vector (text-embedding-3-small)
  embeddingModel: v.string(),    // "text-embedding-3-small"
  createdAt: v.string(),
})
  .index("by_source", ["sourceTable", "sourceId"])
  .index("by_period", ["branchId", "periodKey"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["sourceTable", "branchId"],
  })
```

### 1B. Embedding Action — `convex/features/ai/embedding.ts`

```typescript
// Generate embedding via OpenAI-compatible API
export const generateEmbedding = action({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    const provider = await ctx.runQuery(internal...getActiveProviderWithKey);
    const embeddingModel = provider.embeddingModel || "text-embedding-3-small";
    const baseUrl = provider.embeddingBaseUrl || resolveEmbeddingUrl(provider);

    const response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: embeddingModel,
        input: text,
      }),
    });

    const data = await response.json();
    return data.data[0].embedding; // float64[]
  },
});
```

### 1C. Auto-Enable for OpenRouter

Already implemented in `mutations.ts`:

```typescript
const DEFAULT_EMBEDDING_MODELS = {
  openrouter: "openai/text-embedding-3-small",
  openai: "text-embedding-3-small",
};
```

When a provider is created/updated, `embeddingModel` is auto-set for
OpenRouter and OpenAI. Other providers can configure manually.

### 1D. Where the embedding config lives

The embedding model is stored in Convex as fields on `aiProviders`:

- `embeddingModel`
- `embeddingBaseUrl`

Set them from **Settings → AI Provider → Pengaturan Lanjutan**. They are not separate `.env` variables.

## Phase 2: Data Indexing Pipeline

### 2A. Text Conversion

Convert Convex records to searchable text chunks:

```typescript
function recordToText(table: string, record: any): string {
  switch (table) {
    case "productSales":
      return `Penjualan ${record.productName}: ${record.qty} pcs, Rp ${record.amount}, tanggal ${record.businessDate}`;
    case "costAnalysis":
      return `Cost Analysis ${record.itemName}: opening ${record.openingQty}, purchase ${record.purchaseQty}, usage ${record.usageQty}, closing ${record.closingQty}, variance ${record.variance}`;
    case "vendorPurchases":
      return `Vendor ${record.supplierName || ''}: ${record.commodityName}, qty ${record.purchaseQty}, harga Rp ${record.purchaseValue}`;
    case "dailyCashSummary":
      return `Kas ${record.businessDate}: gross sales Rp ${record.grossSales}, expenses Rp ${record.totalExpenses}, net Rp ${record.netSales}`;
    // ... more tables
  }
}
```

### 2B. Batch Indexing — `convex/features/ai/indexing.ts`

```typescript
// Triggered after report upload or manually
export const indexReportData = action({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, { reportId }) => {
    // 1. Get all data tables linked to this report
    // 2. For each record, convert to text
    // 3. Batch embed (OpenAI supports batch of up to 2048 texts)
    // 4. Store embeddings in aiEmbeddings table
    // 5. Return count of indexed records
  },
});
```

### 2C. Incremental Updates

- On report upload → use the **Proses Index ke AI Chat** button after import
- On data edit → re-index affected records
- Periodic re-index for consistency

## Phase 3: RAG Query Flow

### 3A. Search — `convex/features/ai/search.ts`

```typescript
export const semanticSearch = action({
  args: {
    query: v.string(),
    branchId: v.optional(v.id("branches")),
    sourceTable: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Embed the query
    const queryEmbedding = await generateEmbedding(args.query);

    // 2. Vector search in Convex
    const results = await ctx.vectorSearch("aiEmbeddings", "by_embedding", {
      vector: queryEmbedding,
      limit: args.limit || 10,
      filter: (q) => {
        if (args.branchId) q.eq("branchId", args.branchId);
        if (args.sourceTable) q.eq("sourceTable", args.sourceTable);
      },
    });

    // 3. Return text content of matched records
    return results.map(r => ({
      text: r.textContent,
      score: r._score,
      sourceTable: r.sourceTable,
    }));
  },
});
```

### 3B. Enhanced Chat Completion

Update `chatCompletion` action to include RAG:

```typescript
// Before sending to AI:
// 1. Embed user's question
// 2. Search for relevant data
// 3. Prepend search results to system prompt as context
// 4. Send enriched prompt to AI

const ragContext = await semanticSearch({ query: userMessage, branchId });
const enrichedSystemPrompt = `${systemPrompt}

## Data Konteks (dari database):
${ragContext.map(r => `- ${r.text}`).join('\n')}

Gunakan data di atas untuk menjawab pertanyaan user secara akurat.`;
```

## Phase 4: Supported Data Tables for Embedding

| Table | Key Fields | Priority |
|-------|-----------|----------|
| productSales | productName, qty, amount, businessDate | HIGH |
| costAnalysis | itemName, openingQty, usageQty, variance | HIGH |
| vendorPurchases | commodityName, purchaseQty, purchaseValue | HIGH |
| dailyCashSummary | grossSales, totalExpenses, netSales | HIGH |
| dailyCashFlow | salesInflow, expenseOutflow, closingBalance | MEDIUM |
| inventoryValuation | itemName, qty, totalValue | MEDIUM |
| productHPP | productName, totalCost, sellingPrice | MEDIUM |
| expenses | description, amount, category | MEDIUM |
| leftoverItems | itemName, qty | LOW |
| creditPurchases | supplierName, itemName, qty, amount | LOW |

## Phase 5: UI Integration

### Settings
- Show embedding model and embedding base URL in provider config
- "Index Data" button per report in upload page
- Indexing status indicator (indexed/pending)

### Chat
- Show "Searching data..." indicator during RAG query
- Display source attribution: "Berdasarkan data penjualan 17-23 Mar 2026"
- Toggle RAG on/off per session

## Implementation Order

```
Phase 1A: Schema (aiEmbeddings table)
    ↓
Phase 1B: Embedding action (generate vectors)
    ↓
Phase 2A: Text conversion (record → text)
    ↓
Phase 2B: Batch indexing (after upload)
    ↓
Phase 3A: Semantic search (query → results)
    ↓
Phase 3B: Enhanced chat (RAG in prompt)
    ↓
Phase 4: Index all existing data
    ↓
Phase 5: UI polish
```

## Costs & Considerations

- **Embedding cost**: ~$0.02 per 1M tokens (text-embedding-3-small)
- **Storage**: 1536 floats × 8 bytes = ~12KB per embedding
- **Latency**: Embedding query ~100ms, vector search ~50ms, total RAG overhead ~200ms
- **OpenRouter**: Supports OpenAI embedding models via `openai/text-embedding-3-small`
- **Convex vector search**: Built-in, no external vector DB needed

## Dependencies

- Convex vector search support (built-in since Convex 1.x)
- OpenAI-compatible embedding endpoint (OpenRouter, OpenAI)
- No additional npm packages needed
