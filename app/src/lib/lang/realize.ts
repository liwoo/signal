// ── Realize a challenge in a language ──
// A Challenge is the language-neutral spine (story, stakes, XP, events, rush,
// timer) whose code-shaped fields happen to be authored in Go. Realizing it in
// another language overlays that language's StepRealization on each step, so
// every downstream consumer (useGame, MissionPanel, the engine) keeps reading
// a plain Challenge. Pure.

import type { Challenge, ChallengeRealization, ChallengeStep, StepRealization } from "@/types/game";

function realizeStep(step: ChallengeStep, r: StepRealization | undefined): ChallengeStep {
  if (!r) return step;
  const next: ChallengeStep = { ...step };
  for (const key of Object.keys(r) as (keyof StepRealization)[]) {
    if (r[key] !== undefined) (next as unknown as Record<string, unknown>)[key] = r[key];
  }
  // Fields the language doesn't need must not leak through from the Go spine
  // (e.g. a Go txtar module or harness on a JS step that ships no module).
  if (!("compileModule" in r)) delete next.compileModule;
  if (!("testHarness" in r)) delete next.testHarness;
  if (!("requiredCode" in r)) delete next.requiredCode;
  if (!("expectedOutput" in r)) delete next.expectedOutput;
  if (!("quickCheck" in r)) delete next.quickCheck;
  return next;
}

/**
 * Overlay a realization on the spine. Every step must be realized — a
 * half-translated chapter would hand the player Go briefs in another language.
 */
export function applyRealization(challenge: Challenge, realization: ChallengeRealization): Challenge {
  const missing = challenge.steps.filter((s) => !realization.steps[s.id]).map((s) => s.id);
  if (missing.length > 0) {
    throw new Error(`${challenge.id}: realization is missing steps ${missing.join(", ")}`);
  }
  return {
    ...challenge,
    concepts: realization.concepts ?? challenge.concepts,
    steps: challenge.steps.map((s) => realizeStep(s, realization.steps[s.id])),
  };
}
