import type { AIBackend } from "@/types/game";

export async function detectMayaBackend(): Promise<AIBackend> {
  // 1. Try Chrome Built-in AI (Gemini Nano) — free, on-device, instant
  if ("LanguageModel" in globalThis) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const LM = (globalThis as any).LanguageModel;
      const status = await LM.availability();
      if (status === "available") return "gemini-nano";
      if (status === "downloadable") {
        await LM.create(); // triggers model download
        return "gemini-nano";
      }
    } catch {
      // Fall through to server-side
    }
  }

  // 2. Server-side API (Ollama or Anthropic)
  return "anthropic-api";
}
