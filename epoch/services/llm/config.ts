import { z } from "zod";

export type LLMProviderId = "gemini" | "lm_studio" | "lm_proxy" | "openrouter";

export interface GeminiConfig {
  provider: "gemini";
  model: string;
}

export interface OpenAICompatibleConfig {
  provider: "lm_studio" | "lm_proxy" | "openrouter";
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export type LLMProviderConfig = GeminiConfig | OpenAICompatibleConfig;

const envSchema = z.object({
  VITE_LLM_PROVIDER: z
    .enum(["gemini", "lm_studio", "lm_proxy", "openrouter"])
    .optional()
    .default("gemini"),
  VITE_GEMINI_MODEL: z.string().optional().default("gemini-2.0-flash-exp"),
  VITE_LM_STUDIO_BASE_URL: z
    .string()
    .optional()
    .default("http://localhost:1234/v1"),
  VITE_LM_STUDIO_MODEL: z.string().optional().default("lmstudio-community/Phi-3-4k-mini"),
  VITE_LM_PROXY_BASE_URL: z
    .string()
    .optional()
    .default("http://localhost:8000/v1"),
  VITE_LM_PROXY_MODEL: z
    .string()
    .optional()
    .default("lmproxy/default"),
  VITE_OPENROUTER_BASE_URL: z
    .string()
    .optional()
    .default("https://openrouter.ai/api/v1"),
  VITE_OPENROUTER_MODEL: z
    .string()
    .optional()
    .default("openrouter/auto"),
  VITE_OPENROUTER_API_KEY: z.string().optional(),
});

let cachedConfig: LLMProviderConfig | null = null;

export const loadLLMConfig = (): LLMProviderConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const env = envSchema.parse(import.meta.env);
  const provider = env.VITE_LLM_PROVIDER as LLMProviderId;

  switch (provider) {
    case "gemini": {
      cachedConfig = {
        provider,
        model: env.VITE_GEMINI_MODEL,
      } satisfies GeminiConfig;
      return cachedConfig;
    }

    case "lm_studio": {
      cachedConfig = {
        provider,
        baseUrl: env.VITE_LM_STUDIO_BASE_URL,
        model: env.VITE_LM_STUDIO_MODEL,
      } satisfies OpenAICompatibleConfig;
      return cachedConfig;
    }

    case "lm_proxy": {
      cachedConfig = {
        provider,
        baseUrl: env.VITE_LM_PROXY_BASE_URL,
        model: env.VITE_LM_PROXY_MODEL,
      } satisfies OpenAICompatibleConfig;
      return cachedConfig;
    }

    case "openrouter": {
      if (!env.VITE_OPENROUTER_API_KEY) {
        throw new Error("VITE_OPENROUTER_API_KEY is required when using the OpenRouter provider.");
      }

      cachedConfig = {
        provider,
        baseUrl: env.VITE_OPENROUTER_BASE_URL,
        model: env.VITE_OPENROUTER_MODEL,
        apiKey: env.VITE_OPENROUTER_API_KEY,
      } satisfies OpenAICompatibleConfig;
      return cachedConfig;
    }

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
};
