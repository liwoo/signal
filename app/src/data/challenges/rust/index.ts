import type { ChallengeRealization } from "@/types/game";
import type { BossPhaseRealization } from "../realizations";
import { RS_BOSS_01, RS_CHAPTER_01, RS_CHAPTER_02, RS_CHAPTER_03 } from "./act-1";
import { RS_CHAPTER_04, RS_CHAPTER_04_2 } from "./act-2";
import { RS_BOSS_03, RS_CHAPTER_07, RS_CHAPTER_08, RS_CHAPTER_09 } from "./act-3";
import { RS_LOCKMASTER_PHASES } from "./boss-01";

/** Acts I–III in Rust, keyed by challenge id. */
export const RUST_REALIZATIONS: Record<string, ChallengeRealization> = {
  "chapter-01": RS_CHAPTER_01,
  "chapter-02": RS_CHAPTER_02,
  "chapter-03": RS_CHAPTER_03,
  "boss-01": RS_BOSS_01,
  "chapter-04": RS_CHAPTER_04,
  "chapter-04.2": RS_CHAPTER_04_2,
  "chapter-07": RS_CHAPTER_07,
  "chapter-08": RS_CHAPTER_08,
  "chapter-09": RS_CHAPTER_09,
  "boss-03": RS_BOSS_03,
};

/** Boss-arena coding phases, keyed by arena level id then phase id. */
export const RUST_BOSS_PHASES: Record<string, Record<string, BossPhaseRealization>> = {
  "boss-01-fight": RS_LOCKMASTER_PHASES,
};
