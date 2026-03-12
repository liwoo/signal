import { logEvent } from "firebase/analytics";
import { getFirebaseAnalytics } from "./firebase";

// ── Typed event helper ──

type EventParams = Record<string, string | number | boolean>;

async function track(name: string, params?: EventParams) {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;
  logEvent(analytics, name, params);
}

// ── Game lifecycle ──

export function trackChapterStart(chapterId: string, chapter: number) {
  track("chapter_start", { chapter_id: chapterId, chapter_number: chapter });
}

export function trackChapterComplete(chapterId: string, chapter: number, xp: number, timeMs: number) {
  track("chapter_complete", {
    chapter_id: chapterId,
    chapter_number: chapter,
    xp_earned: xp,
    time_seconds: Math.round(timeMs / 1000),
  });
}

export function trackStepComplete(chapterId: string, stepIndex: number, stepId: string, xp: number) {
  track("step_complete", {
    chapter_id: chapterId,
    step_index: stepIndex,
    step_id: stepId,
    xp_earned: xp,
  });
}

// ── Code submissions ──

export function trackCodeSubmit(chapterId: string, stepIndex: number, attempt: number, success: boolean) {
  track("code_submit", {
    chapter_id: chapterId,
    step_index: stepIndex,
    attempt_number: attempt,
    success,
  });
}

// ── Boss fight ──

export function trackBossStart(bossId: string) {
  track("boss_start", { boss_id: bossId });
}

export function trackBossTurnResult(bossId: string, turn: number, outcome: string) {
  track("boss_turn_result", { boss_id: bossId, turn_number: turn, outcome });
}

export function trackBossVictory(bossId: string, xp: number, heartsLost: number) {
  track("boss_victory", { boss_id: bossId, xp_earned: xp, hearts_lost: heartsLost });
}

export function trackBossDefeat(bossId: string, turn: number, heartsLost: number) {
  track("boss_defeat", { boss_id: bossId, turn_reached: turn, hearts_lost: heartsLost });
}

export function trackBossRetry(bossId: string) {
  track("boss_retry", { boss_id: bossId });
}

// ── Game over & retry ──

export function trackGameOver(chapterId: string, cause: string) {
  track("game_over", { chapter_id: chapterId, cause });
}

export function trackRetry(chapterId: string) {
  track("retry", { chapter_id: chapterId });
}

// ── Beginner mode ──

export function trackBeginnerStart(chapterId: string) {
  track("beginner_start", { chapter_id: chapterId });
}

export function trackBeginnerComplete(chapterId: string, hotspotsFound: number) {
  track("beginner_complete", { chapter_id: chapterId, hotspots_found: hotspotsFound });
}

export function trackBeginnerDisable(chapterId: string) {
  track("beginner_disable", { chapter_id: chapterId });
}

// ── Settings ──

export function trackSettingChange(setting: string, value: string | boolean) {
  track("setting_change", { setting_name: setting, value: String(value) });
}

// ── Cinematic ──

export function trackCinematicStart(chapterId: string, type: "intro" | "complete") {
  track("cinematic_start", { chapter_id: chapterId, cinematic_type: type });
}

export function trackCinematicSkip(chapterId: string, type: "intro" | "complete") {
  track("cinematic_skip", { chapter_id: chapterId, cinematic_type: type });
}

// ── Zen ──

export function trackZenBonus(chapterId: string, stepId: string, bonusXP: number, jolts: number) {
  track("zen_bonus", { chapter_id: chapterId, step_id: stepId, bonus_xp: bonusXP, jolts_count: jolts });
}

// ── Store ──

export function trackHeartBuy(currentHearts: number, xpSpent: number) {
  track("heart_buy", { hearts_after: currentHearts, xp_spent: xpSpent });
}

// ── Navigation ──

export function trackChapterSelect(chapterId: string) {
  track("chapter_select", { chapter_id: chapterId });
}

export function trackWinModalTab(tab: string) {
  track("win_modal_tab", { tab_name: tab });
}
