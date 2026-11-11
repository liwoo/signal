// ── Boss 3 · KIRA · ALLEGIANCE — pure rules ──
// Study (mark the lines) → verdict (explain in words + TRUST/REJECT) →
// optional redemption. No hearts, no game over. Spec:
// spec/levels/boss-03-kira-allegiance.md. Pure: no React, no DOM.

import type { KiraVerdict, StoryBranch } from "@/types/game";

// ── Phase 1: marking the suspect lines ──

export const STUDY_BASE_XP = 100;
export const STUDY_FLOOR_XP = 50;
export const STUDY_WRONG_COST = 25;
/** Wrong mark submissions that cost nothing. */
export const FREE_WRONG_MARKS = 2;

export interface MarkResult {
  correct: boolean;
  /** Required lines the player left unmarked. */
  missing: number[];
  /** Marked lines that aren't suspect (and aren't fair game). */
  extra: number[];
}

export function checkMarks(marked: Iterable<number>, suspect: number[], acceptable: number[] = []): MarkResult {
  const set = new Set(marked);
  const allowed = new Set([...suspect, ...acceptable]);
  const missing = suspect.filter((l) => !set.has(l));
  const extra = [...set].filter((l) => !allowed.has(l)).sort((a, b) => a - b);
  return { correct: missing.length === 0 && extra.length === 0, missing, extra };
}

/** Study-phase XP after `wrongAttempts` wrong submissions: free twice, then −25 each, floor 50. */
export function studyXP(wrongAttempts: number): number {
  const charged = Math.max(0, wrongAttempts - FREE_WRONG_MARKS);
  return Math.max(STUDY_FLOOR_XP, STUDY_BASE_XP - charged * STUDY_WRONG_COST);
}

// ── Phase 2: grading the explanation ──
// The rubric (spec): (1) shared backing memory / the slice is a view, not a
// copy, (2) the data is mutated AFTER frames were sent, so sent frames change,
// (3) no copy is made / copy before sending is the fix. ≥2 of 3 passes.
// Plain-language equivalents count; keyword salad with no causal chain doesn't.

export type Marker = "shared" | "mutation" | "copy";

export interface ExplanationGrade {
  markers: Record<Marker, boolean>;
  score: number;
  passes: boolean;
  /** The explanation reads like code, which this phase refuses. */
  isCode: boolean;
  /** Long enough and joined up enough to count as reasoning. */
  reasoned: boolean;
}

const SHARED = [
  /\b(same|shared?|sharing|single|one|original|underlying|backing)\b[^.!?\n]{0,40}\b(array|arrays|memory|buffer|bytes?|backing|storage|data|block)\b/,
  /\b(array|memory|buffer|bytes?|data|storage)\b[^.!?\n]{0,30}\b(is |are )?(shared|the same)\b/,
  /\balias(ed|es|ing)?\b/,
  /\b(points?|pointing|refers?|referenc(e|es|ing)|window|view)\b[^.!?\n]{0,40}\b(same|original|underlying|back(ing)?|into|onto|data|bytes|array|buffer)\b/,
  /\bslice header\b|\bheader\b[^.!?\n]{0,30}\b(not|never)\b[^.!?\n]{0,20}\bbytes\b/,
  /\b(memoryview|subarray|sub-?array|view)\b[^.!?\n]{0,40}\b(same|share|original|underlying|not a copy|no copy|doesn'?t copy|does not copy)\b/,
  /\bby reference\b|\breference(s)? to\b/,
  /\bnot (a |its own |their own )?(cop(y|ies)|separate)\b/,
];

const MUTATE = /\b(mutat\w*|modif\w*|chang\w*|flip\w*|overwr\w*|rewr\w*|xor\w*|alter\w*|corrupt\w*|edit\w*|writ(e|es|ing)|updat\w*|scrambl\w*|garbl\w*)\b|\^=/;
const AFTER = /\b(after|afterwards|later|keeps?|keep(s|ing)? (going|flipping|changing)|still|subsequent\w*|already|previous(ly)?|earlier|next|following|every (later|next)|under (its|their|the receiver'?s) feet|once (it'?s |they'?re )?sent|been sent|were sent|was sent|has sent|have sent|sent frames?|frames? (she |it )?sent)\b/;

const COPY = [
  /\b(no|never|without|doesn'?t|does not|didn'?t|did not|isn'?t|is not|missing|forgot|forgets|lacks?|instead of)\b[^.!?\n]{0,30}\bcop(y|ies|ying|ied)\b/,
  /\bcop(y|ies|ying|ied)\b[^.!?\n]{0,50}\b(new|fresh|separate|own|first|before|each|every|frame|out|into|instead)\b/,
  /\b(should|needs? to|need to|has to|must|fix|would)\b[^.!?\n]{0,40}\bcop(y|ies|ying)\b/,
  /\bmake\b[^.!?\n]{0,30}\bcopy\b|\bcopy\(/,
  /\b(slice\(|\.slice|bytes\(|tobytes|clone|duplicat\w*|snapshot\w*)\b[^.!?\n]{0,40}\b(instead|before|each|frame|fix|freeze|new)\b/,
  /\b(instead of)\b[^.!?\n]{0,30}\b(subarray|memoryview|view|slice)\b/,
];

const CAUSAL = /\b(because|so|since|which|that means|therefore|meaning|means|thus|as a result|causing|causes|caused|hence|then|when|while|by the time|so that)\b|->|→/;

const CODE_LINE = /(^|\n)\s*(func |def |function |for \(|for .* in .*:|if \(|const |let |var |return |ch <- |\w+\s*:=)|[{};]\s*($|\n)|=>/;

/** Does this read like code rather than an explanation? */
export function looksLikeCode(text: string): boolean {
  const lines = text.split("\n").filter((l) => l.trim());
  const codeLines = lines.filter((l) => CODE_LINE.test(l));
  return codeLines.length >= 2 || (lines.length > 0 && codeLines.length === lines.length && lines.length <= 2 && /[{};=]/.test(text));
}

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?;\n])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}

export function gradeExplanation(raw: string): ExplanationGrade {
  const text = raw.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " ").trim();
  const isCode = looksLikeCode(raw);
  const words = text.split(" ").filter(Boolean).length;
  const reasoned = words >= 8 && CAUSAL.test(text);

  const shared = SHARED.some((re) => re.test(text));
  // Mutation must be tied to time-after-sending in the same sentence — the causal chain.
  const mutation = sentences(raw.toLowerCase()).some((s) => MUTATE.test(s) && AFTER.test(s));
  const copy = COPY.some((re) => re.test(text));

  const markers = { shared, mutation, copy };
  const score = Number(shared) + Number(mutation) + Number(copy);
  return { markers, score, passes: !isCode && reasoned && score >= 2, isCode, reasoned };
}

// ── The verdict ──

export type Verdict = "trust" | "reject";

export type VerdictOutcome =
  /** Explanation passes + REJECT — the correct read. Full bonus, +2 tokens. */
  | "informed-reject"
  /** Explanation passes + TRUST — Maya challenges once before it sticks. */
  | "challenge"
  /** Confirmed TRUST after the challenge — eyes-open gamble. Base only. */
  | "eyes-open-trust"
  /** Explanation fails + REJECT, first time — one revision allowed (−10 XP). */
  | "lucky-guess"
  /** Explanation fails twice + REJECT — the verdict stands, unproven. Base only. */
  | "unproven-reject"
  /** Explanation fails + TRUST — the wrong read. Base only. */
  | "wrong-trust";

export interface VerdictInput {
  passes: boolean;
  verdict: Verdict;
  /** 1 for the first submission, 2 after a revision. */
  attempt: number;
  /** The player already saw Maya's challenge and is confirming TRUST. */
  confirmingTrust?: boolean;
}

export function resolveVerdict({ passes, verdict, attempt, confirmingTrust }: VerdictInput): VerdictOutcome {
  if (passes) {
    if (verdict === "reject") return "informed-reject";
    return confirmingTrust ? "eyes-open-trust" : "challenge";
  }
  if (verdict === "trust") return "wrong-trust";
  return attempt >= 2 ? "unproven-reject" : "lucky-guess";
}

/** Outcomes that end the verdict phase (the others ask for one more move). */
export function isFinal(outcome: VerdictOutcome): boolean {
  return outcome !== "challenge" && outcome !== "lucky-guess";
}

export function kiraVerdictFor(outcome: VerdictOutcome): KiraVerdict {
  return outcome === "informed-reject" || outcome === "unproven-reject" ? "rejected" : "trusted";
}

/** Act IV branch: A = trusted Kira (cameras dark), B = rejected (lockdown). design.md §Act IV. */
export function storyBranchFor(verdict: KiraVerdict): StoryBranch {
  return verdict === "trusted" ? "a" : verdict === "rejected" ? "b" : null;
}

// ── XP ──

export const VERDICT_BASE_XP = 500;
export const INFORMED_BONUS_XP = 400;
export const INFORMED_BONUS_FLOOR = 200;
export const BONUS_WHOLE_SECONDS = 300;
export const BONUS_DECAY_PER_MINUTE = 50;
/** The soft clock fades in at this point — never before. */
export const CLOCK_VISIBLE_AT_SECONDS = 240;
export const REVISION_COST_XP = 10;
export const REDEMPTION_XP = 150;
export const REDEMPTION_SECONDS = 180;
export const INFORMED_TOKENS = 2;

/** The informed-verdict bonus at `seconds` into the verdict phase: whole for 300s, then −50/min, floor 200. */
export function informedBonus(seconds: number): number {
  if (seconds <= BONUS_WHOLE_SECONDS) return INFORMED_BONUS_XP;
  const minutesOver = Math.ceil((seconds - BONUS_WHOLE_SECONDS) / 60);
  return Math.max(INFORMED_BONUS_FLOOR, INFORMED_BONUS_XP - minutesOver * BONUS_DECAY_PER_MINUTE);
}

export interface AllegianceTally {
  study: number;
  verdict: number;
  bonus: number;
  revisionCost: number;
  redemption: number;
  tokens: number;
  total: number;
}

export function tallyXP(args: {
  wrongMarks: number;
  outcome: VerdictOutcome;
  verdictSeconds: number;
  revisions: number;
  redeemed: boolean;
}): AllegianceTally {
  const study = studyXP(args.wrongMarks);
  const verdict = VERDICT_BASE_XP;
  const informed = args.outcome === "informed-reject";
  const bonus = informed ? informedBonus(args.verdictSeconds) : 0;
  const revisionCost = args.revisions * REVISION_COST_XP;
  const redemption = args.redeemed ? REDEMPTION_XP : 0;
  return {
    study,
    verdict,
    bonus,
    revisionCost,
    redemption,
    tokens: informed ? INFORMED_TOKENS : 0,
    total: Math.max(0, study + verdict + bonus + redemption - revisionCost),
  };
}

/** Did the redemption fix actually copy? (Any one of the language's copy idioms.) */
export function usesCopy(code: string, anyOf: string[]): boolean {
  return anyOf.some((p) => code.includes(p));
}
