export interface AIOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AIProvider {
  complete(prompt: string, options?: AIOptions): Promise<string>;
}

export interface AILogEntry {
  tenantId: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  action: string;
  modelProvider: string;
  modelId: string;
  promptTokens?: number;
  completionTokens?: number;
  inputSummary?: string;
  outputSummary?: string;
}

import { claudeProvider } from "./providers/claude";
import { openaiProvider } from "./providers/openai";
import { geminiProvider } from "./providers/gemini";

function getProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? "claude";

  switch (provider) {
    case "claude":
      return claudeProvider;
    case "openai":
      return openaiProvider;
    case "gemini":
      return geminiProvider;
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

export function getAIProvider(): AIProvider {
  return getProvider();
}
