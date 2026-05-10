/**
 * Central AI completion wrapper.
 *
 * Provider resolution (via AI_PROVIDER env var):
 *   "gemini"   → Google Gemini (gratuito para dev: aistudio.google.com)
 *   "claude"   → Anthropic Claude (produção)
 *   "mock"     → sempre mock (CI / sem API key)
 *   default    → tenta gemini se GOOGLE_AI_API_KEY existir, senão claude, senão mock
 *
 * Model tiers (escolhido por cada action via options.tier):
 *   "fast"    → gemini-2.0-flash          / claude-haiku-4-5-20251001
 *   "quality" → gemini-2.5-pro-preview-05-06 / claude-sonnet-4-6
 */

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export interface AICompletionOptions {
  system:     string;
  user:       string;
  maxTokens?: number;
  tier?:      "fast" | "quality"; // default: "fast"
}

export interface AICompletionResult {
  text:         string;
  inputTokens:  number;
  outputTokens: number;
  provider:     string;
  modelId:      string;
}

// ── Modelos por provider e tier ───────────────────────────────────────────────

const MODELS = {
  anthropic: {
    fast:    process.env.AI_MODEL_FAST    ?? "claude-haiku-4-5-20251001",
    quality: process.env.AI_MODEL_QUALITY ?? "claude-sonnet-4-6",
  },
  gemini: {
    fast:    "gemini-2.0-flash",
    quality: "gemini-2.5-pro-preview-05-06",
  },
} as const;

// ── Seleção de provider ───────────────────────────────────────────────────────

type ActiveProvider = "anthropic" | "gemini" | "mock";

function resolveProvider(): ActiveProvider {
  const p = (process.env.AI_PROVIDER ?? "").toLowerCase();
  if (p === "mock")                                     return "mock";
  if (p === "gemini" && process.env.GOOGLE_AI_API_KEY)  return "gemini";
  if (p === "claude" && process.env.ANTHROPIC_API_KEY)  return "anthropic";
  if (p === "gemini" || p === "claude") {
    console.warn(`[ai] AI_PROVIDER="${p}" set but matching API key missing — falling back to mock`);
  }
  // Auto-detect: prefere gemini se disponível, depois claude
  if (process.env.GOOGLE_AI_API_KEY)                    return "gemini";
  if (process.env.ANTHROPIC_API_KEY)                    return "anthropic";
  return "mock";
}

export function isAIEnabled(): boolean {
  return resolveProvider() !== "mock";
}

// ── Singletons ────────────────────────────────────────────────────────────────

let _anthropic: Anthropic | null = null;
function anthropicClient(): Anthropic {
  _anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _anthropic;
}

let _gemini: GoogleGenerativeAI | null = null;
function geminiClient(): GoogleGenerativeAI {
  _gemini ??= new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  return _gemini;
}

// ── Completions por provider ──────────────────────────────────────────────────

async function completeWithClaude(
  options: AICompletionOptions,
  modelId: string
): Promise<AICompletionResult> {
  const response = await anthropicClient().messages.create({
    model:      modelId,
    max_tokens: options.maxTokens ?? 512,
    system:     options.system,
    messages:   [{ role: "user", content: options.user }],
  });

  const text = response.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("");

  return {
    text,
    inputTokens:  response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    provider:     "anthropic",
    modelId,
  };
}

async function completeWithGemini(
  options: AICompletionOptions,
  modelId: string
): Promise<AICompletionResult> {
  const model = geminiClient().getGenerativeModel({
    model: modelId,
    systemInstruction: options.system,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: options.user }] }],
    generationConfig: { maxOutputTokens: options.maxTokens ?? 512 },
  });

  const text      = result.response.text();
  const usage     = result.response.usageMetadata;
  const inputTok  = usage?.promptTokenCount     ?? 0;
  const outputTok = usage?.candidatesTokenCount ?? 0;

  return {
    text,
    inputTokens:  inputTok,
    outputTokens: outputTok,
    provider:     "gemini",
    modelId,
  };
}

// ── Função principal ──────────────────────────────────────────────────────────

/**
 * Executa uma completion de IA.
 * Lança erro se AI_PROVIDER=mock ou nenhuma API key configurada.
 * Cada action deve capturar o erro e usar seu mock como fallback.
 */
export async function aiComplete(
  options: AICompletionOptions
): Promise<AICompletionResult> {
  const provider = resolveProvider();
  const tier     = options.tier ?? "fast";

  if (provider === "mock") throw new Error("ai-disabled");

  if (provider === "anthropic") {
    return completeWithClaude(options, MODELS.anthropic[tier]);
  }

  return completeWithGemini(options, MODELS.gemini[tier]);
}

/**
 * Parse JSON de resposta da IA, removendo fences de markdown se presentes.
 * Lança SyntaxError em JSON inválido — action deve usar mock como fallback.
 */
export function parseAIJson<T>(text: string): T {
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
