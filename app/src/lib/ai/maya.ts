import type { Challenge, ChallengeStep } from "@/types/game";
import type { EnergyState } from "@/lib/game/energy";
import { buildMayaSystemPrompt } from "./prompts";
import { detectMayaBackend } from "./detect";
import type { AIBackend } from "@/types/game";

interface MayaResponse {
  reply: string;
  isComplete: boolean;
}

interface SimpleMessage {
  from: string;
  text: string;
}

let detectedBackend: AIBackend | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nanoSession: any = null;

export async function getBackend(): Promise<AIBackend> {
  if (!detectedBackend) {
    detectedBackend = await detectMayaBackend();
  }
  return detectedBackend;
}

function toTurnMessages(
  messages: SimpleMessage[]
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter((m) => m.from === "YOU" || m.from === "MAYA")
    .map((m) => ({
      role: (m.from === "YOU" ? "user" : "assistant") as "user" | "assistant",
      content: m.text,
    }));
}

// ── Gemini Nano (Chrome Built-in AI) ──

async function callGeminiNano(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LM = (globalThis as any).LanguageModel;

  if (!nanoSession) {
    nanoSession = await LM.create({ systemPrompt: system });
  }

  if (nanoSession.tokensLeft < 200) {
    nanoSession.destroy();
    nanoSession = await LM.create({ systemPrompt: system });
  }

  const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  return await nanoSession.prompt(prompt);
}

// ── Server-side API (proxied through /api/maya) ──

async function callServerAPI(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  const res = await fetch("/api/maya", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `API error: ${res.status}`);
  }

  const data = await res.json();
  return data.reply ?? "...";
}

// ── Main entry point ──

export async function callMaya(
  history: SimpleMessage[],
  challenge: Challenge,
  step: ChallengeStep,
  userMessage: string,
  isCode: boolean,
  inRush: boolean,
  powerCut: boolean,
  energyState: EnergyState
): Promise<MayaResponse> {
  const system = buildMayaSystemPrompt({
    challenge,
    step,
    inRush,
    powerCut,
    energyState,
  });

  const content = isCode ? `[CODE]\n${userMessage}` : userMessage;
  const apiMessages = [
    ...toTurnMessages(history),
    { role: "user" as const, content },
  ];

  const backend = await getBackend();
  let rawReply: string;

  if (backend === "gemini-nano") {
    rawReply = await callGeminiNano(system, apiMessages);
  } else {
    rawReply = await callServerAPI(system, apiMessages);
  }

  const isComplete = rawReply.includes("||COMPLETE||");
  const reply = rawReply.replace("||COMPLETE||", "").trim();

  return { reply, isComplete };
}
