// ── Jev from the browser ──
// Thin calls to /api/jev. Every call is best-effort: a missing key, a slow
// network or a bad answer resolves to null and the game carries on with its
// heuristics and keyword banks — Jev sharpens Maya, it never blocks her.

import type { LanguageId } from "@/types/game";
import type { ZenVerdicts } from "@/lib/game/zen";
import { isJevStep, type HelpDecision } from "./jev";

let available: Promise<boolean> | null = null;

/** Is a Jev key configured on the server? Asked once per session. */
export function jevAvailable(): Promise<boolean> {
  if (!available) {
    available = fetch("/api/jev", { method: "GET" })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d: { enabled?: boolean }) => d.enabled === true)
      .catch(() => false);
  }
  return available;
}

async function post<T>(payload: Record<string, unknown>, timeoutMs: number): Promise<T | null> {
  if (!isJevStep(String(payload.stepId)) || !(await jevAvailable())) return null;
  try {
    const res = await fetch("/api/jev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 503) {
      available = Promise.resolve(false); // key removed — stop asking
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Jev's read of each semantic zen rule for this code, or null. */
export async function jevJudgeZen(stepId: string, language: LanguageId, code: string): Promise<ZenVerdicts | null> {
  const data = await post<{ verdicts?: ZenVerdicts }>({ task: "zen", stepId, language, code }, 5000);
  return data?.verdicts && Object.keys(data.verdicts).length > 0 ? data.verdicts : null;
}

/** What the player is asking and which of Maya's answers fits, or null. */
export async function jevRouteHelp(args: {
  stepId: string;
  language: LanguageId;
  message: string;
  code: string;
  attempts: number;
}): Promise<HelpDecision | null> {
  const data = await post<{ decision?: HelpDecision | null }>({ task: "help", ...args }, 3000);
  return data?.decision ?? null;
}
