"use client";

import { Bot } from "lucide-react";
import {
  AiProviderConfig,
  AiToolsConfig,
  AiInstructionsConfig,
  AiAgentsConfig,
} from "@/features/ai";
import { PageHeader } from "@/shared/components";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        icon={Bot}
        title="Konfigurasi AI"
        description="Provider model, tools, agents, dan custom instructions untuk Chat AI."
      />
      <AiProviderConfig />
      <AiToolsConfig />
      <AiAgentsConfig />
      <AiInstructionsConfig />
    </div>
  );
}
