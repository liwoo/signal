import type { ChallengeRealization } from "@/types/game";
import type { BossPhaseRealization } from "../realizations";
import { PY_BOSS_01, PY_CHAPTER_01, PY_CHAPTER_02, PY_CHAPTER_03 } from "./act-1";
import { PY_CHAPTER_04, PY_CHAPTER_04_2 } from "./act-2";
import { PY_LOCKMASTER_PHASES } from "./boss-01";

/** Acts I–II in Python, keyed by challenge id. */
export const PYTHON_REALIZATIONS: Record<string, ChallengeRealization> = {
  "chapter-01": PY_CHAPTER_01,
  "chapter-02": PY_CHAPTER_02,
  "chapter-03": PY_CHAPTER_03,
  "boss-01": PY_BOSS_01,
  "chapter-04": PY_CHAPTER_04,
  "chapter-04.2": PY_CHAPTER_04_2,
};

/** Boss-arena coding phases, keyed by arena level id then phase id. */
export const PYTHON_BOSS_PHASES: Record<string, Record<string, BossPhaseRealization>> = {
  "boss-01-fight": PY_LOCKMASTER_PHASES,
};
