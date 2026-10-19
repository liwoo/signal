import type { ChallengeRealization } from "@/types/game";
import type { BossPhaseRealization } from "../realizations";
import { JS_BOSS_01, JS_CHAPTER_01, JS_CHAPTER_02, JS_CHAPTER_03 } from "./act-1";
import { JS_LOCKMASTER_PHASES } from "./boss-01";

/** Act I in JavaScript, keyed by challenge id. */
export const JAVASCRIPT_REALIZATIONS: Record<string, ChallengeRealization> = {
  "chapter-01": JS_CHAPTER_01,
  "chapter-02": JS_CHAPTER_02,
  "chapter-03": JS_CHAPTER_03,
  "boss-01": JS_BOSS_01,
};

/** Boss-arena coding phases, keyed by arena level id then phase id. */
export const JAVASCRIPT_BOSS_PHASES: Record<string, Record<string, BossPhaseRealization>> = {
  "boss-01-fight": JS_LOCKMASTER_PHASES,
};
