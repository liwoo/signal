import { NextResponse } from "next/server";
import type { LanguageId } from "@/types/game";
import {
  buildHelpQuestions,
  buildHelpState,
  buildZenQuestions,
  buildZenState,
  helpDecisionFromAnswers,
  helpOptions,
  isJevStep,
  JEV_LANGUAGES,
  JEV_MAX_CODE,
  JEV_MAX_MESSAGE,
  zenVerdictsFromAnswers,
} from "@/lib/ai/jev";
import { callJev, jevConfig } from "@/lib/ai/jev-server";
import { findJevStep } from "@/lib/ai/jev-steps";
import { getStepBank } from "@/lib/ai/engine";
import { getZenRules } from "@/lib/game/zen";
import { JEV_ZEN_CRITERIA } from "@/data/jev-zen-criteria";

// Jev (TypeSafe's decision model) for Act I. The browser only names a task,
// a step and the player's own text; every question is built here from the
// step's data, so this route can't be used as a general-purpose Jev proxy.
//
//   GET  → { enabled }                         is a key configured?
//   POST { task: "zen",  stepId, language, code }                → { verdicts }
//   POST { task: "help", stepId, language, code, message, attempts } → { decision }

export async function GET() {
  return NextResponse.json({ enabled: jevConfig() !== null });
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const config = jevConfig();
  if (!config) return bad("jev not configured", 503);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return bad("invalid json");
  }

  const { task, stepId, language } = body;
  const code = typeof body.code === "string" ? body.code : "";
  if (typeof stepId !== "string" || !isJevStep(stepId)) return bad("step not on jev");
  if (typeof language !== "string" || !JEV_LANGUAGES.includes(language as LanguageId)) return bad("bad language");
  if (code.length > JEV_MAX_CODE) return bad("code too long", 413);
  const lang = language as LanguageId;
  const step = findJevStep(stepId, lang);
  if (!step) return bad("unknown step", 404);

  try {
    if (task === "zen") {
      const ruleIds = getZenRules(stepId, lang)
        .map((r) => r.id)
        .filter((id) => JEV_ZEN_CRITERIA[id]);
      if (ruleIds.length === 0 || !code.trim()) return NextResponse.json({ verdicts: {} });
      const answers = await callJev(
        config,
        buildZenState({ language: lang, stepTitle: step.title, objective: step.brief, code }),
        buildZenQuestions(ruleIds, JEV_ZEN_CRITERIA)
      );
      return NextResponse.json({ verdicts: zenVerdictsFromAnswers(answers, ruleIds) });
    }

    if (task === "help") {
      const message = typeof body.message === "string" ? body.message.trim() : "";
      if (!message || message.length > JEV_MAX_MESSAGE) return bad("bad message");
      const bank = getStepBank(stepId, lang);
      if (!bank) return bad("unknown step", 404);
      const attempts = typeof body.attempts === "number" && body.attempts >= 0 ? Math.floor(body.attempts) : 0;
      const options = helpOptions(bank, step.quickCheck);
      const answers = await callJev(
        config,
        buildHelpState({ language: lang, stepTitle: step.title, objective: step.brief, message, code, attempts }),
        buildHelpQuestions(options)
      );
      return NextResponse.json({ decision: helpDecisionFromAnswers(answers, options) });
    }

    return bad("unknown task");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "jev failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
