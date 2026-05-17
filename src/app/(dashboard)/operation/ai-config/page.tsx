"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import {
  AiProviderConfig,
  AiToolsConfig,
  AiInstructionsConfig,
  AiAgentsConfig,
} from "@/features/ai";

export default function Page() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 text-primary p-2">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Konfigurasi AI</h1>
          <p className="text-sm text-muted-foreground">
            Provider model, tools, agents, dan custom instructions untuk Chat AI
          </p>
        </div>
      </div>

      <AiProviderConfig />
      <AiToolsConfig />
      <AiAgentsConfig />
      <AiInstructionsConfig />
    </motion.div>
  );
}
