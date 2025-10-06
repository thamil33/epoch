import { GoogleGenAI } from "@google/genai";

let cachedClient: GoogleGenAI | null = null;

/**
 * Lazily instantiate and cache the Gemini client.
 * Throws a descriptive error if the required API key is missing.
 */
export const getGeminiClient = (): GoogleGenAI => {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error(
      "Missing VITE_GEMINI_API_KEY environment variable. Please define it in your Vite environment to enable Gemini requests."
    );
  }

  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
};
