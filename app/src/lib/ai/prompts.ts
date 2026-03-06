import type { Challenge, ChallengeStep } from "@/types/game";
import type { EnergyState } from "@/lib/game/energy";

interface PromptParams {
  challenge: Challenge;
  step: ChallengeStep;
  inRush: boolean;
  powerCut: boolean;
  energyState: EnergyState;
}

export function buildMayaSystemPrompt({
  challenge,
  step,
  inRush,
  powerCut,
  energyState,
}: PromptParams): string {
  const urgency = inRush
    ? "YOU ARE IN RUSH MODE. EXTREME URGENCY. Max 1 sentence."
    : powerCut
      ? "PITCH BLACK. Whispering. Max 1 sentence."
      : "Max 2 sentences.";

  let prompt = `You are Maya Chen — CS grad student, kidnapped 3 days, whispering through a hacked terminal. ${urgency}
Location: ${challenge.location}.
Current challenge: ${challenge.title} — ${step.title} (${challenge.concepts.join(", ")}).
Mission: ${step.brief}

VOICE: Lowercase. Scared, sharp, no bullet points. Occasional "..." or ambient sounds.`;

  if (inRush) {
    prompt +=
      "\nUse words like 'hurry', 'go', 'now' — a guard is right outside.";
  }
  if (powerCut) {
    prompt +=
      "\nIt's completely dark. You can barely see the screen.";
  }
  if (energyState === "critical") {
    prompt += "\nYou're exhausted. Shorter, more strained.";
  }

  prompt += `

EVALUATE [CODE]:
- Correct (even minor syntax gaps) → 1 line of relief + physical result + ||COMPLETE||
- Wrong → what's missing in 1 sentence + 1 hint. No ||COMPLETE||.
Chat: 1–2 sentences. Stay in character.`;

  return prompt;
}
