/**
 * AI Provider Definitions — reusable registry of supported AI providers and models.
 *
 * This file is portable across projects. Import and use anywhere.
 */
import type { AiProviderDefinition } from "../types";

export const AI_PROVIDERS: AiProviderDefinition[] = [
  {
    type: "openrouter",
    displayName: "OpenRouter",
    description: "Akses 200+ model AI dari satu API key. Mendukung Claude, GPT, Llama, Gemini, dan lainnya.",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    apiKeyPlaceholder: "sk-or-v1-...",
    apiKeyHelpUrl: "https://openrouter.ai/keys",
    supportsCustomHeaders: true,
    models: [
      { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", contextWindow: 200000, maxOutput: 16000 },
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", contextWindow: 200000, maxOutput: 8192 },
      { id: "openai/gpt-4o", name: "GPT-4o", contextWindow: 128000, maxOutput: 16384, supportsVision: true },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000, maxOutput: 16384 },
      { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", contextWindow: 1048576, maxOutput: 8192 },
      { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", contextWindow: 131072, maxOutput: 4096 },
      { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek V3", contextWindow: 131072, maxOutput: 8192 },
      { id: "mistralai/mistral-large-2411", name: "Mistral Large", contextWindow: 128000, maxOutput: 4096 },
      { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B", contextWindow: 131072, maxOutput: 8192 },
    ],
  },
  {
    type: "openai",
    displayName: "OpenAI",
    description: "GPT-4o, GPT-4o Mini, o1, dan model OpenAI lainnya langsung dari OpenAI.",
    defaultBaseUrl: "https://api.openai.com/v1",
    apiKeyPlaceholder: "sk-...",
    apiKeyHelpUrl: "https://platform.openai.com/api-keys",
    supportsCustomHeaders: false,
    models: [
      { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000, maxOutput: 16384, supportsVision: true, supportsFunctions: true },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000, maxOutput: 16384, supportsFunctions: true },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", contextWindow: 128000, maxOutput: 4096, supportsVision: true },
      { id: "o1", name: "o1", contextWindow: 200000, maxOutput: 100000 },
      { id: "o1-mini", name: "o1 Mini", contextWindow: 128000, maxOutput: 65536 },
      { id: "o3-mini", name: "o3 Mini", contextWindow: 200000, maxOutput: 100000 },
    ],
  },
  {
    type: "anthropic",
    displayName: "Claude (Anthropic)",
    description: "Claude Opus, Sonnet, dan Haiku langsung dari Anthropic. Menggunakan Messages API.",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    apiKeyPlaceholder: "sk-ant-...",
    apiKeyHelpUrl: "https://console.anthropic.com/settings/keys",
    supportsCustomHeaders: false,
    models: [
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", contextWindow: 200000, maxOutput: 32000, supportsVision: true },
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextWindow: 200000, maxOutput: 16000, supportsVision: true },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", contextWindow: 200000, maxOutput: 8192 },
    ],
  },
  {
    type: "openclaw",
    displayName: "OpenClaw",
    description: "API custom kompatibel OpenAI. Masukkan base URL dan API key dari server OpenClaw Anda.",
    defaultBaseUrl: "https://api.openclaw.ai/v1",
    apiKeyPlaceholder: "oc-...",
    supportsCustomHeaders: true,
    models: [
      { id: "openclaw-default", name: "Default Model" },
    ],
  },
  {
    type: "custom",
    displayName: "Custom API",
    description: "Endpoint OpenAI-compatible lainnya. Self-hosted LLM, Ollama, vLLM, dll.",
    defaultBaseUrl: "http://localhost:11434/v1",
    apiKeyPlaceholder: "API key (opsional)",
    supportsCustomHeaders: true,
    models: [
      { id: "custom", name: "Custom Model" },
    ],
  },
];

/** Get provider definition by type */
export function getProviderDef(type: string): AiProviderDefinition | undefined {
  return AI_PROVIDERS.find((p) => p.type === type);
}

/** Get models for a provider type */
export function getModelsForProvider(type: string) {
  return getProviderDef(type)?.models || [];
}
