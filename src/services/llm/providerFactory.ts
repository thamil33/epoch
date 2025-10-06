import { getGeminiClient } from "../genaiClient";
import { loadLLMConfig, GeminiConfig, OpenAICompatibleConfig, LLMProviderConfig } from "./config";
import { geminiSchemaToJsonSchema } from "./schema";

export interface GenerateJsonParams {
  prompt: string;
  systemInstruction?: string;
  responseSchema?: unknown;
  responseMimeType?: string;
}

export interface LLMProvider {
  id: LLMProviderConfig["provider"];
  generateJson<T = unknown>(params: GenerateJsonParams): Promise<T>;
}

let cachedProvider: LLMProvider | null = null;

const ensureTrailingPath = (baseUrl: string, path: string) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}${path}`;
};

const callOpenAIEndpoint = async <T>(
  config: OpenAICompatibleConfig,
  body: Record<string, unknown>,
  includeResponseFormat: boolean
): Promise<T> => {
  const endpoint = ensureTrailingPath(config.baseUrl, "/chat/completions");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
    if (config.provider === "openrouter") {
      if (typeof window !== "undefined") {
        headers["HTTP-Referer"] = window.location.origin;
      }
      headers["X-Title"] = typeof document !== "undefined" && document.title ? document.title : "Epoch Simulation";
    }
  }

  const payload = {
    ...body,
    ...(includeResponseFormat ? { response_format: { type: "json_object" } } : {}),
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OpenAI-compatible provider request failed (${response.status}): ${errorBody}`
    );
  }

  const json = await response.json();
  const rawContent = json?.choices?.[0]?.message?.content;
  const content = Array.isArray(rawContent)
    ? rawContent.map((part: any) => part?.text ?? '').join('').trim()
    : (rawContent ?? '').toString().trim();

  if (!content) {
    throw new Error("No content returned from OpenAI-compatible provider");
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Provider returned non-JSON content: ${content}`);
  }
};

const createGeminiProvider = (config: GeminiConfig): LLMProvider => {
  const client = getGeminiClient();
  return {
    id: config.provider,
    async generateJson<T>({ prompt, systemInstruction, responseSchema, responseMimeType = "application/json" }: GenerateJsonParams): Promise<T> {
      const response = await client.models.generateContent({
        model: config.model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType,
          ...(responseSchema ? { responseSchema } : {}),
        },
      });

      const text = response.text?.trim();
      if (!text) {
        throw new Error("Gemini provider returned empty response");
      }

      return JSON.parse(text) as T;
    },
  };
};

const createOpenAICompatibleProvider = (config: OpenAICompatibleConfig): LLMProvider => {
  return {
    id: config.provider,
    async generateJson<T>({ prompt, systemInstruction, responseSchema }: GenerateJsonParams): Promise<T> {
      const messages: Array<{ role: "system" | "user"; content: string }> = [];
      const schemaJson = responseSchema ? geminiSchemaToJsonSchema(responseSchema) : undefined;

      const baseInstruction = systemInstruction ?? "";
      const schemaInstruction = schemaJson
        ? `Return a JSON object that matches the following JSON schema. Do not include markdown or additional commentary.\n\n${JSON.stringify(schemaJson, null, 2)}`
        : "Respond ONLY with valid JSON matching the user's request.";

      messages.push({
        role: "system",
        content: `${baseInstruction}\n\n${schemaInstruction}`.trim(),
      });

      messages.push({
        role: "user",
        content: `${prompt}\n\nRemember: respond with JSON only.`,
      });

      try {
        return await callOpenAIEndpoint<T>(
          config,
          {
            model: config.model,
            messages,
            temperature: 0.7,
          },
          true
        );
      } catch (error) {
        const message = (error as Error).message;
        if (message.includes("response_format")) {
          return await callOpenAIEndpoint<T>(
            config,
            {
              model: config.model,
              messages,
              temperature: 0.7,
            },
            false
          );
        }
        throw error;
      }
    },
  };
};

export const getLLMProvider = (): LLMProvider => {
  if (cachedProvider) {
    return cachedProvider;
  }

  const config = loadLLMConfig();
  cachedProvider =
    config.provider === "gemini"
      ? createGeminiProvider(config)
      : createOpenAICompatibleProvider(config);

  return cachedProvider;
};
