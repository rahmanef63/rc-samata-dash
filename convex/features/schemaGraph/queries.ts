/**
 * Read-only query exposing the schema relation graph to the UI.
 * The spec lives in `convex/_schemaGraph.ts`; this query just
 * gates it behind auth and shapes it for the frontend.
 */
import { query } from "../../_generated/server";
import { requireAuth } from "../../shared/auth";
import { SCHEMA_GRAPH, tablesByFeature } from "../../_schemaGraph";

export const getSchemaGraph = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return {
      tables: SCHEMA_GRAPH,
      byFeature: tablesByFeature(),
      stats: {
        tableCount: SCHEMA_GRAPH.length,
        fkCount: SCHEMA_GRAPH.reduce((s, t) => s + t.fk.length, 0),
        looseCount: SCHEMA_GRAPH.reduce((s, t) => s + (t.loose?.length ?? 0), 0),
        featureCount: Object.keys(tablesByFeature()).length,
      },
    };
  },
});
