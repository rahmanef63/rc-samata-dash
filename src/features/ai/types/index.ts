/** AI Provider types — reusable across projects */

export type AiProviderType = "openrouter" | "openai" | "anthropic" | "openclaw" | "custom";

export interface AiProviderDefinition {
  type: AiProviderType;
  displayName: string;
  description: string;
  defaultBaseUrl: string;
  apiKeyPlaceholder: string;
  apiKeyHelpUrl?: string;
  supportsCustomHeaders: boolean;
  models: AiModelDefinition[];
}

export interface AiModelDefinition {
  id: string;
  name: string;
  contextWindow?: number;
  maxOutput?: number;
  supportsVision?: boolean;
  supportsFunctions?: boolean;
}

export interface AiChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  tokenUsage?: { promptTokens: number; completionTokens: number };
  createdAt?: string;
}

export interface AiProviderConfig {
  _id: string;
  provider: AiProviderType;
  displayName: string;
  baseUrl: string;
  apiKey: string; // masked on client
  defaultModel: string;
  isActive: boolean;
  customHeaders?: string;
  embeddingModel?: string;
  embeddingBaseUrl?: string;
}
