// ── Jev: the decision model behind Maya's judgement calls ──
// Jev (TypeSafe AI's "System One" model) answers typed questions — yes/no,
// choice, score — about a piece of state, with probabilities. It doesn't write
// prose, so Maya's voice stays authored: Jev only DECIDES.
//
//  1. Zen judging — "does this code follow the idiom?" per semantic zen rule,
//     overriding the shape heuristics when it's confident (see zen.ts).
//  2. Help routing — "what is the player actually asking, and which of Maya's
//     authored answers fits?" so a stuck player gets the right hint even when
//     their words don't hit the keyword banks.
//
// This file is pure: question builders and answer interpreters, shared by the
// /api/jev route (server) and useGame (client). HTTP lives in jev-server.ts /
// jev-client.ts. Wire format: TypeSafe's `systemone` request/response.

import type { LanguageId, QuickCheck } from "@/types/game";
import type { StepBank } from "./banks/types";
import type { ZenVerdicts } from "@/lib/game/zen";
import type { JevZenCriterion } from "@/data/jev-zen-criteria";

// ── Wire types (TypeSafe systemone) ──

export type JevQuestion =
  | { type: "noul"; instructions: string }
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] };

export type JevAnswer =
  | { type: "noul"; noul: number }
  | { type: "choice"; choice: string; probabilities?: Record<string, number>; confidence?: number }
  | { type: "score"; score: number; probabilities?: Record<string, number>; confidence?: number };

export type JevAnswers = Record<string, JevAnswer | undefined>;

// ── Scope ──

/** Act I runs on Jev: chapters 1–3 and the LOCKMASTER boss. */
export const JEV_CHAPTERS = ["chapter-01", "chapter-02", "chapter-03", "boss-01"] as const;

export function isJevStep(stepId: string): boolean {
  const chapter = stepId.split(":")[0];
  return (JEV_CHAPTERS as readonly string[]).includes(chapter);
}

export const JEV_LANGUAGES: readonly LanguageId[] = ["go", "python", "javascript", "rust"];

/** Hard caps on what a request may carry — the route is public. */
export const JEV_MAX_CODE = 6000;
export const JEV_MAX_MESSAGE = 500;

const LANGUAGE_NAMES: Record<LanguageId, string> = { go: "Go", python: "Python", javascript: "JavaScript", rust: "Rust" };

function clip(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function probability(answer: JevAnswer | undefined): number | undefined {
  if (!answer || answer.type !== "noul") return undefined;
  const p = Number(answer.noul);
  return Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : undefined;
}

function choiceConfidence(answer: Extract<JevAnswer, { type: "choice" }>): number {
  if (typeof answer.confidence === "number" && answer.confidence > 0) return answer.confidence;
  const p = answer.probabilities?.[answer.choice];
  return typeof p === "number" ? p : 0;
}

// ══════════════════════════════════════════════════════
//  Zen judging
// ══════════════════════════════════════════════════════

const RELEVANT_SUFFIX = "__relevant";

export interface ZenJudgeInput {
  language: LanguageId;
  stepTitle: string;
  objective: string;
  code: string;
}

export function buildZenState(input: ZenJudgeInput) {
  return {
    language: LANGUAGE_NAMES[input.language],
    task: `${input.stepTitle}: ${input.objective}`,
    code: clip(input.code, JEV_MAX_CODE),
  };
}

/** One yes/no question per judged rule (plus a relevance question where the rubric has one). */
export function buildZenQuestions(
  ruleIds: string[],
  criteria: Record<string, JevZenCriterion>
): Record<string, JevQuestion> {
  const questions: Record<string, JevQuestion> = {};
  for (const id of ruleIds) {
    const c = criteria[id];
    if (!c) continue;
    questions[id] = { type: "noul", instructions: c.follows };
    if (c.relevant) questions[id + RELEVANT_SUFFIX] = { type: "noul", instructions: c.relevant };
  }
  return questions;
}

export function zenVerdictsFromAnswers(answers: JevAnswers, ruleIds: string[]): ZenVerdicts {
  const verdicts: ZenVerdicts = {};
  for (const id of ruleIds) {
    const follows = probability(answers[id]);
    const relevant = probability(answers[id + RELEVANT_SUFFIX]);
    if (follows === undefined && relevant === undefined) continue;
    verdicts[id] = {
      ...(follows !== undefined ? { follows } : {}),
      ...(relevant !== undefined ? { relevant } : {}),
    };
  }
  return verdicts;
}

// ══════════════════════════════════════════════════════
//  Help routing
// ══════════════════════════════════════════════════════

export const HELP_INTENTS = {
  next_step: "the player is stuck on the task itself or asks what to do next / how to start / for a hint",
  concept: "the player asks how a specific language feature, keyword, function or piece of syntax works",
  error: "the player asks about an error message, a rejected submission, or why their code doesn't work",
  story: "the player asks about Maya, the facility, the guards, where she is or the story",
  chatter: "a greeting, thanks, acknowledgement or small talk",
  off_topic: "unrelated to the game or to programming",
} as const;

export type HelpIntent = keyof typeof HELP_INTENTS;

const FRUSTRATION_SCALE = [
  "calm or curious",
  "unsure, somewhat stuck",
  "frustrated, stuck for a while, or about to give up",
];

/** One of Maya's authored answers Jev can route a question to. */
export interface HelpOption {
  key: string;
  description: string;
  answer: string;
}

export const NO_TOPIC = "none";

/** The step's authored answers (concept FAQ + the STUCK? helper's items) as routing options. */
export function helpOptions(bank: StepBank, quickCheck?: QuickCheck): HelpOption[] {
  const faq = bank.conceptFAQ.map((entry, i) => ({
    key: `faq_${i}`,
    description: clip(`about: ${entry.keywords.slice(0, 8).join(", ")} — answer: ${entry.response}`, 260),
    answer: entry.response,
  }));
  const qc = (quickCheck?.items ?? []).map((item, i) => ({
    key: `qc_${i}`,
    description: clip(`"${item.question}" — answer: ${item.answer}`, 260),
    answer: item.answer,
  }));
  return [...qc, ...faq];
}

export interface HelpInput {
  language: LanguageId;
  stepTitle: string;
  objective: string;
  message: string;
  code: string;
  attempts: number;
}

export function buildHelpState(input: HelpInput) {
  return {
    setting:
      "a narrative coding game. Maya is trapped in a facility; the player writes code to help her escape and can message her for help.",
    language: LANGUAGE_NAMES[input.language],
    current_task: `${input.stepTitle}: ${input.objective}`,
    failed_submissions: input.attempts,
    player_code: clip(input.code, JEV_MAX_CODE) || "(empty)",
    player_message: clip(input.message, JEV_MAX_MESSAGE),
  };
}

export function buildHelpQuestions(options: HelpOption[]): Record<string, JevQuestion> {
  const topics: Record<string, string> = {};
  for (const o of options) topics[o.key] = o.description;
  topics[NO_TOPIC] = "none of these answers addresses what the player is asking";
  return {
    intent: {
      type: "choice",
      instructions: "What is the player's message asking for?",
      criteria: { ...HELP_INTENTS },
    },
    topic: {
      type: "choice",
      instructions:
        "Which one of Maya's prepared answers best answers the player's message, given their current code? Pick none if no answer fits.",
      criteria: topics,
    },
    frustration: {
      type: "score",
      instructions: "How stuck or frustrated does the player seem, from their message and failed submissions?",
      criteria: FRUSTRATION_SCALE,
    },
  };
}

export interface HelpDecision {
  intent: HelpIntent;
  intentConfidence: number;
  /** Chosen answer's key, or null for none. */
  topic: string | null;
  topicConfidence: number;
  /** The chosen answer's text, resolved where the options were built. */
  topicAnswer: string | null;
  /** 0 (calm) … 2 (frustrated). */
  frustration: number;
}

export function helpDecisionFromAnswers(answers: JevAnswers, options: HelpOption[]): HelpDecision | null {
  const intent = answers.intent;
  if (!intent || intent.type !== "choice" || !(intent.choice in HELP_INTENTS)) return null;
  const topic = answers.topic;
  const option =
    topic && topic.type === "choice" && topic.choice !== NO_TOPIC
      ? options.find((o) => o.key === topic.choice)
      : undefined;
  const frustration = answers.frustration;
  return {
    intent: intent.choice as HelpIntent,
    intentConfidence: choiceConfidence(intent),
    topic: option ? option.key : null,
    topicConfidence: option && topic?.type === "choice" ? choiceConfidence(topic) : 0,
    topicAnswer: option ? option.answer : null,
    frustration:
      frustration && frustration.type === "score" && Number.isFinite(frustration.score)
        ? Math.max(0, Math.min(2, frustration.score))
        : 0,
  };
}

/**
 * Below these, Jev's read is a guess — Maya falls back to her keyword banks.
 * The topic bar is low on purpose: live calls (Nov 2026) showed a low topic
 * confidence usually means two of the step's answers cover the same question
 * (e.g. the STUCK? item and the FAQ entry for `print`), not that none fits.
 */
export const HELP_MIN_INTENT_CONFIDENCE = 0.4;
export const HELP_MIN_TOPIC_CONFIDENCE = 0.35;

export interface HelpReplyContext {
  bank: StepBank;
  attempts: number;
  inRush: boolean;
  /** First compiler/diagnostic error in the player's code, e.g. "line 4: missing }". */
  diagnostic: string | null;
  /** What the keyword engine would have said. */
  fallback: string;
  random?: () => number;
}

export interface HelpReply {
  reply: string;
  source: "jev" | "local";
}

/**
 * Turn Jev's decision into one of Maya's authored replies. Jev picks; the
 * banks speak — so the reply is always in Maya's voice and never invented.
 */
export function chooseHelpReply(decision: HelpDecision | null, ctx: HelpReplyContext): HelpReply {
  const local: HelpReply = { reply: ctx.fallback, source: "local" };
  if (!decision || decision.intentConfidence < HELP_MIN_INTENT_CONFIDENCE) return local;

  const rand = ctx.random ?? Math.random;
  const pick = (arr: string[]) => arr[Math.floor(rand() * arr.length) % arr.length];
  const hurry = (text: string) => (ctx.inRush ? `${text}\n\nnow hurry.` : text);
  const topic =
    decision.topicAnswer && decision.topicConfidence >= HELP_MIN_TOPIC_CONFIDENCE ? decision.topicAnswer : null;
  // The most direct hint the step has — for a player who's really stuck.
  const stuck = ctx.bank.stuckResponses.length > 0 ? pick(ctx.bank.stuckResponses) : null;
  const veryStuck = decision.frustration >= 1.5 || ctx.attempts >= 3;

  switch (decision.intent) {
    case "error":
      if (ctx.diagnostic) {
        return { reply: hurry(`your code won't compile yet. ${ctx.diagnostic}`), source: "jev" };
      }
      if (topic) return { reply: hurry(topic), source: "jev" };
      return stuck ? { reply: hurry(stuck), source: "jev" } : local;
    case "next_step":
      if (topic && !veryStuck) return { reply: hurry(topic), source: "jev" };
      if (stuck) return { reply: hurry(stuck), source: "jev" };
      return topic ? { reply: hurry(topic), source: "jev" } : local;
    case "concept":
      return topic ? { reply: hurry(topic), source: "jev" } : local;
    default:
      // story, chatter, off-topic: the keyword engine already handles these in character
      return local;
  }
}
