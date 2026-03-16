import { logEvent } from "firebase/analytics";
import { getFirebaseAnalytics } from "./firebase";

// ── Typed event helper ──

type EventParams = Record<string, string | number | boolean>;

async function track(name: string, params?: EventParams) {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) {
    console.warn(`[Analytics] Dropped "${name}" — analytics not available`);
    return;
  }
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

export function trackBeginnerHotspot(chapterId: string, hotspotText: string) {
  track("beginner_hotspot", { chapter_id: chapterId, hotspot: hotspotText.slice(0, 80) });
}

// ── Chat ──

export function trackChatAsk(chapterId: string, stepId: string, message: string) {
  track("chat_ask", { chapter_id: chapterId, step_id: stepId, message: message.slice(0, 120) });
}

export function trackChatExplain(chapterId: string, stepId: string) {
  track("chat_explain", { chapter_id: chapterId, step_id: stepId });
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

// ── Purchase funnel ──

export function trackPaywallView(source: string) {
  track("paywall_view", { source });
}

export function trackPurchaseCtaClick(plan: "single" | "team", price: string) {
  track("purchase_cta_click", { plan, price });
}

export function trackConsentModalView(plan: "single" | "team", price: string) {
  track("consent_modal_view", { plan, price });
}

export function trackConsentAccepted(plan: "single" | "team", price: string) {
  track("consent_accepted", { plan, price });
}

export function trackConsentDismissed(plan: "single" | "team", price: string) {
  track("consent_dismissed", { plan, price });
}

export function trackPurchaseStart(plan: "single" | "team", price: string) {
  track("purchase_start", { plan, price });
}

// ── Navigation ──

export function trackChapterSelect(chapterId: string) {
  track("chapter_select", { chapter_id: chapterId });
}

export function trackWinModalTab(tab: string) {
  track("win_modal_tab", { tab_name: tab });
}

// ── Mobile gate ──

export function trackMobileEmailCapture(email: string) {
  // Hash the email to a domain-only string for privacy — never log full addresses
  const domain = email.includes("@") ? email.split("@")[1] : "unknown";
  track("mobile_email_capture", { email_domain: domain });
}

// ── Warmup ──

export function trackWarmupStart() {
  track("warmup_start");
}

export function trackWarmupComplete(skipped: boolean) {
  track("warmup_complete", { skipped });
}

export function trackWarmupExercise(exercise: number, attempts: number, timeMs: number) {
  track("warmup_exercise", { exercise_number: exercise, attempts, time_ms: timeMs });
}

export function trackWarmupError(exercise: number, input: string) {
  track("warmup_error", { exercise_number: exercise, input: input.slice(0, 100) });
}

export function trackWarmupSkipExercise(exercise: number) {
  track("warmup_skip", { at_exercise: exercise });
}

export function trackWarmupFontScale(scale: number) {
  track("warmup_font_scale", { scale });
}

// ── Code formatting ──

export function trackCodeFormat(success: boolean) {
  track("code_format", { success });
}

// ── Autocomplete ──

export function trackAutocomplete(label: string) {
  track("autocomplete_accept", { label: label.slice(0, 60) });
}

// ── AI suggestions ──

export function trackAISuggestOpen(chapterId: string, stepId: string) {
  track("ai_suggest_open", { chapter_id: chapterId, step_id: stepId });
}

export function trackAISuggestUse(chapterId: string, stepId: string, label: string, tokensRemaining: number) {
  track("ai_suggest_use", {
    chapter_id: chapterId,
    step_id: stepId,
    suggestion: label.slice(0, 60),
    tokens_remaining: tokensRemaining,
  });
}

// ── Timer ──

export function trackTimerExpire(chapterId: string, cause: "main" | "rush") {
  track("timer_expire", { chapter_id: chapterId, cause });
}

export function trackTimerBonus(chapterId: string, bonusSeconds: number) {
  track("timer_bonus", { chapter_id: chapterId, bonus_seconds: bonusSeconds });
}

// ── Hearts ──

export function trackHeartLost(chapterId: string, heartsRemaining: number, cause: string) {
  track("heart_lost", { chapter_id: chapterId, hearts_remaining: heartsRemaining, cause });
}

// ── Jeopardy ──

export function trackJeopardy(chapterId: string, eventType: string) {
  track("jeopardy", { chapter_id: chapterId, event_type: eventType });
}

// ── Guided tour ──

export function trackTourStart() {
  track("tour_start");
}

export function trackTourStep(stepIndex: number, stepTarget: string) {
  track("tour_step", { step_index: stepIndex, step_target: stepTarget });
}

export function trackTourSkip(atStep: number) {
  track("tour_skip", { at_step: atStep });
}

export function trackTourComplete() {
  track("tour_complete");
}
