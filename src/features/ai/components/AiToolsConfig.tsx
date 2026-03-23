"use client";

import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { motion } from "framer-motion";
import {
  Wrench, Database, Brain, Calculator, TrendingUp, Search, ToggleLeft, ToggleRight,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  data: Database,
  memory: Brain,
  calculation: Calculator,
  utility: TrendingUp,
};

const CATEGORY_LABELS: Record<string, string> = {
  data: "Data & Query",
  memory: "Memori",
  calculation: "Kalkulasi",
  utility: "Utilitas",
};

export function AiToolsConfig() {
  const tools = useQuery(api.features.ai.queries.listTools);
  const seedTools = useMutation(api.features.ai.mutations.seedDefaultTools);
  const toggleTool = useMutation(api.features.ai.mutations.toggleTool);

  // Auto-seed default tools if none exist
  useEffect(() => {
    if (tools && tools.length === 0) {
      seedTools({}).then((r) => {
        if (r.seeded > 0) toast.success(`${r.seeded} tools bawaan ditambahkan.`);
      });
    }
  }, [tools, seedTools]);

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    await toggleTool({ id: id as never, isEnabled: !currentEnabled });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" /> Skills & Tools
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Aktifkan/nonaktifkan skills yang tersedia untuk AI Assistant
        </p>
      </div>

      {!tools ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl shadow-card p-4 h-16 animate-pulse" />
          ))}
        </div>
      ) : tools.length === 0 ? (
        <div className="bg-muted rounded-xl p-6 text-center">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Memuat tools bawaan...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tools.map((tool: typeof tools[number]) => {
            const Icon = CATEGORY_ICONS[tool.category] || Wrench;
            return (
              <div
                key={tool._id}
                className={`bg-card rounded-xl shadow-card p-4 border-2 transition-colors ${
                  tool.isEnabled ? "border-primary/20" : "border-transparent opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    tool.isEnabled ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <Icon className={`h-4 w-4 ${tool.isEnabled ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{tool.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {CATEGORY_LABELS[tool.category] || tool.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {tool.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle(tool._id, tool.isEnabled)}
                    className="shrink-0 mt-1"
                    title={tool.isEnabled ? "Nonaktifkan" : "Aktifkan"}
                  >
                    {tool.isEnabled ? (
                      <ToggleRight className="h-6 w-6 text-primary" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
