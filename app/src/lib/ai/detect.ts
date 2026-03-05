import type { AIBackend } from "@/types/game";

export async function detectMayaBackend(): Promise<AIBackend> {
  // 1. Try Chrome Built-in AI (Gemini Nano)
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
      // Fall through to next backend
    }
  }

  // 2. Try WebLLM (requires WebGPU)
  if (typeof navigator !== "undefined" && "gpu" in navigator) {
    return "webllm";
  }

  // 3. Fallback to Anthropic API
  return "anthropic-api";
}
