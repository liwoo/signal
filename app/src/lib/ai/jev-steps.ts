// The Act I steps Jev knows about, realized per language — so the /api/jev
// route can build its questions from the step's own brief and STUCK? helper
// rather than trusting anything the browser sends.

import type { ChallengeStep, LanguageId } from "@/types/game";
import { chapter01 } from "@/data/challenges/chapter-01";
import { chapter02 } from "@/data/challenges/chapter-02";
import { chapter03 } from "@/data/challenges/chapter-03";
import { boss01 } from "@/data/challenges/boss-01";
import { isChallengeAvailable, realizeChallenge } from "@/data/challenges/realizations";

const ACT_ONE = [chapter01, chapter02, chapter03, boss01];

export function findJevStep(stepId: string, language: LanguageId): ChallengeStep | null {
  const chapterId = stepId.split(":")[0];
  const challenge = ACT_ONE.find((c) => c.id === chapterId);
  if (!challenge || !isChallengeAvailable(challenge.id, language)) return null;
  return realizeChallenge(challenge, language).steps.find((s) => s.id === stepId) ?? null;
}
