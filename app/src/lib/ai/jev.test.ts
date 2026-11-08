import { describe, test, expect, vi } from "vitest";
import {
  buildHelpQuestions,
  buildZenQuestions,
  chooseHelpReply,
  helpDecisionFromAnswers,
  helpOptions,
  isJevStep,
  zenVerdictsFromAnswers,
  type HelpDecision,
} from "./jev";
import { callJev, jevConfig, JevError } from "./jev-server";
import { findJevStep } from "./jev-steps";
import { getStepBank } from "./engine";
import { JEV_ZEN_CRITERIA } from "@/data/jev-zen-criteria";
import { analyzeZen, calculateMissedXP, evaluateZenRules, getZenRules } from "@/lib/game/zen";
import type { LanguageId } from "@/types/game";

const ACT_ONE_STEPS = [
  "chapter-01:scaffold",
  "chapter-01:location",
  "chapter-02:scaffold",
  "chapter-02:loop",
  "chapter-02:classify",
  "chapter-02:rewrite",
  "chapter-03:scaffold",
  "chapter-03:sumfunc",
  "chapter-03:validate",
];
const LANGS: LanguageId[] = ["go", "python", "javascript"];

describe("scope", () => {
  test("Act I steps are on Jev, later acts are not", () => {
    for (const id of ACT_ONE_STEPS) expect(isJevStep(id)).toBe(true);
    expect(isJevStep("boss-01:predict")).toBe(true);
    expect(isJevStep("chapter-04:guardmap")).toBe(false);
    expect(isJevStep("chapter-04.2:encode")).toBe(false);
  });

  test("every Act I step resolves in every language", () => {
    for (const lang of LANGS) {
      for (const id of ACT_ONE_STEPS) {
        expect(findJevStep(id, lang)?.id, `${id} (${lang})`).toBe(id);
      }
    }
  });
});

describe("zen criteria", () => {
  test("every criterion names a real zen rule", () => {
    const allIds = new Set(
      LANGS.flatMap((lang) => [...ACT_ONE_STEPS, "boss-01:scaffold", "boss-01:predict"].flatMap((id) => getZenRules(id, lang).map((r) => r.id)))
    );
    for (const id of Object.keys(JEV_ZEN_CRITERIA)) expect(allIds.has(id), id).toBe(true);
  });

  test("every Act I step with a semantic rule gets at least one Jev question", () => {
    const covered = ACT_ONE_STEPS.filter((id) =>
      LANGS.some((lang) => getZenRules(id, lang).some((r) => JEV_ZEN_CRITERIA[r.id]))
    );
    // classify / loop / sumfunc / validate / location are the idiom-heavy steps
    for (const id of ["chapter-01:location", "chapter-02:classify", "chapter-03:sumfunc", "chapter-03:validate"]) {
      expect(covered).toContain(id);
    }
  });

  test("formatting rules are never sent to Jev", () => {
    for (const id of ["import_form", "package_import_sep", "py_no_semicolon", "js_semicolons", "py_four_space_indent"]) {
      expect(JEV_ZEN_CRITERIA[id]).toBeUndefined();
    }
  });

  test("buildZenQuestions makes a follows + relevance question", () => {
    const q = buildZenQuestions(["switch_over_ifelse", "no_unnecessary_break", "not_a_rule"], JEV_ZEN_CRITERIA);
    expect(Object.keys(q).sort()).toEqual([
      "no_unnecessary_break",
      "no_unnecessary_break__relevant",
      "switch_over_ifelse",
      "switch_over_ifelse__relevant",
    ]);
    expect(q.switch_over_ifelse.type).toBe("noul");
  });

  test("zenVerdictsFromAnswers reads noul probabilities and skips junk", () => {
    const v = zenVerdictsFromAnswers(
      {
        switch_over_ifelse: { type: "noul", noul: 0.97 },
        switch_over_ifelse__relevant: { type: "noul", noul: 0.9 },
        no_unnecessary_break: { type: "choice", choice: "x" },
      },
      ["switch_over_ifelse", "no_unnecessary_break"]
    );
    expect(v).toEqual({ switch_over_ifelse: { follows: 0.97, relevant: 0.9 } });
  });
});

describe("zen with Jev verdicts", () => {
  const LOOP_BREAK = `package main

import "fmt"

func main() {
    for i := 1; i <= 10; i++ {
        switch {
        case i <= 3:
            fmt.Println(i, "DENY")
        case i <= 6:
            fmt.Println(i, "WARN")
        case i <= 9:
            fmt.Println(i, "GRANT")
        default:
            fmt.Println(i, "OVERRIDE")
        }
        if i == 10 {
            break
        }
    }
}`;

  test("heuristic alone misreads a loop `break` as a switch break", () => {
    const outcome = evaluateZenRules("chapter-02:classify", LOOP_BREAK, "go").find((o) => o.rule.id === "no_unnecessary_break")!;
    expect(outcome.passed).toBe(false);
  });

  test("a confident Jev verdict overrides it", () => {
    const verdicts = { no_unnecessary_break: { follows: 0.95, relevant: 0.99 } };
    const outcome = evaluateZenRules("chapter-02:classify", LOOP_BREAK, "go", verdicts).find(
      (o) => o.rule.id === "no_unnecessary_break"
    )!;
    expect(outcome.passed).toBe(true);
    const withJev = analyzeZen("chapter-02:classify", LOOP_BREAK, undefined, "go", verdicts);
    const without = analyzeZen("chapter-02:classify", LOOP_BREAK, undefined, "go");
    expect(withJev.bonusXP - without.bonusXP).toBe(10);
  });

  test("an unsure Jev verdict leaves the heuristic in charge", () => {
    const verdicts = { no_unnecessary_break: { follows: 0.6 } };
    const outcome = evaluateZenRules("chapter-02:classify", LOOP_BREAK, "go", verdicts).find(
      (o) => o.rule.id === "no_unnecessary_break"
    )!;
    expect(outcome.passed).toBe(false);
  });

  test("Jev can mark a rule irrelevant — no XP, no nag, no missed XP", () => {
    const verdicts = { switch_over_ifelse: { relevant: 0.05 }, no_unnecessary_break: { relevant: 0.05 } };
    const r = analyzeZen("chapter-02:classify", LOOP_BREAK, undefined, "go", verdicts);
    expect(r.jolts.some((j) => j.includes("switch without a variable"))).toBe(false);
    const missed = calculateMissedXP("chapter-02:classify", r, LOOP_BREAK, "go", verdicts);
    expect(missed).toBeGreaterThanOrEqual(0);
    expect(missed).toBeLessThanOrEqual(10); // only use_constants_labels left
  });

  test("Jev saying a rule is not followed takes away the heuristic's pass", () => {
    const code = `package main

import "fmt"

func main() {
    x := 1
    fmt.Println(x)
}`;
    const pass = evaluateZenRules("chapter-01:location", code, "go").find((o) => o.rule.id === "use_named_values")!;
    const judged = evaluateZenRules("chapter-01:location", code, "go", { use_named_values: { follows: 0.02 } }).find(
      (o) => o.rule.id === "use_named_values"
    )!;
    expect(judged.passed).toBe(false);
    expect(pass.relevant).toBe(true);
  });
});

describe("help routing", () => {
  const bank = getStepBank("chapter-02:classify", "go")!;
  const options = helpOptions(bank, findJevStep("chapter-02:classify", "go")?.quickCheck);

  test("options cover the FAQ and STUCK? items with stable keys", () => {
    expect(options.length).toBeGreaterThanOrEqual(bank.conceptFAQ.length);
    expect(options.some((o) => o.key === "faq_0")).toBe(true);
    const q = buildHelpQuestions(options);
    expect(q.topic.type).toBe("choice");
    if (q.topic.type === "choice") {
      expect(Object.keys(q.topic.criteria)).toContain("none");
      for (const o of options) expect(q.topic.criteria[o.key]).toBeTruthy();
    }
    expect(q.frustration.type).toBe("score");
  });

  test("helpDecisionFromAnswers resolves the chosen answer text", () => {
    const d = helpDecisionFromAnswers(
      {
        intent: { type: "choice", choice: "concept", confidence: 0.9 },
        topic: { type: "choice", choice: "faq_5", probabilities: { faq_5: 0.8, none: 0.2 } },
        frustration: { type: "score", score: 0.3 },
      },
      options
    )!;
    expect(d.intent).toBe("concept");
    expect(d.topic).toBe("faq_5");
    expect(d.topicConfidence).toBe(0.8);
    expect(d.topicAnswer).toBe(bank.conceptFAQ[5].response);
  });

  test("unknown intent or topic keys are rejected", () => {
    expect(helpDecisionFromAnswers({ intent: { type: "choice", choice: "hack" } }, options)).toBeNull();
    const d = helpDecisionFromAnswers(
      { intent: { type: "choice", choice: "concept", confidence: 1 }, topic: { type: "choice", choice: "faq_999" } },
      options
    )!;
    expect(d.topic).toBeNull();
    expect(d.topicAnswer).toBeNull();
  });

  const base: HelpDecision = {
    intent: "concept",
    intentConfidence: 0.9,
    topic: "faq_5",
    topicConfidence: 0.9,
    topicAnswer: "go's switch doesn't fall through by default",
    frustration: 0,
  };
  const ctx = { bank, attempts: 0, inRush: false, diagnostic: null, fallback: "KEYWORD", random: () => 0 };

  test("a concept question gets the chosen authored answer", () => {
    expect(chooseHelpReply(base, ctx)).toEqual({ reply: base.topicAnswer, source: "jev" });
  });

  test("no decision, or an unsure one, falls back to the keyword reply", () => {
    expect(chooseHelpReply(null, ctx).reply).toBe("KEYWORD");
    expect(chooseHelpReply({ ...base, intentConfidence: 0.2 }, ctx).reply).toBe("KEYWORD");
    expect(chooseHelpReply({ ...base, topicConfidence: 0.3 }, ctx).reply).toBe("KEYWORD");
  });

  test("a frustrated player asking what to do gets the direct hint", () => {
    const r = chooseHelpReply({ ...base, intent: "next_step", frustration: 2 }, ctx);
    expect(r.reply).toBe(bank.stuckResponses[0]);
  });

  test("an error question with broken code points at the compiler error", () => {
    const r = chooseHelpReply({ ...base, intent: "error" }, { ...ctx, diagnostic: "line 4: missing }" });
    expect(r.reply).toContain("line 4: missing }");
  });

  test("story and small talk stay with the keyword engine", () => {
    expect(chooseHelpReply({ ...base, intent: "story" }, ctx).reply).toBe("KEYWORD");
    expect(chooseHelpReply({ ...base, intent: "chatter" }, ctx).reply).toBe("KEYWORD");
  });

  test("rush adds urgency", () => {
    expect(chooseHelpReply(base, { ...ctx, inRush: true }).reply).toMatch(/now hurry\.$/);
  });

  test("every routable option carries an authored answer", () => {
    for (const lang of LANGS) {
      for (const id of ACT_ONE_STEPS) {
        const b = getStepBank(id, lang)!;
        for (const o of helpOptions(b, findJevStep(id, lang)?.quickCheck)) {
          expect(o.answer, `${id} ${lang}`).toBeTruthy();
        }
      }
    }
  });
});

describe("jev-server", () => {
  test("no key → disabled", () => {
    expect(jevConfig({})).toBeNull();
    expect(jevConfig({ JEV_API_KEY: "  " })).toBeNull();
  });

  test("JEV_API_KEY defaults to the AI Gateway's TypeSafe API", () => {
    expect(jevConfig({ JEV_API_KEY: "k" })).toEqual({
      apiKey: "k",
      baseUrl: "https://ai-gateway.vercel.sh/typesafe",
      model: "typesafe-ai/jev",
    });
  });

  test("TYPESAFE_API_KEY goes direct with jev-latest", () => {
    expect(jevConfig({ TYPESAFE_API_KEY: "t" })).toEqual({ apiKey: "t", baseUrl: "https://api.typesafe.ai", model: "jev-latest" });
    expect(jevConfig({ TYPESAFE_API_KEY: "t", JEV_MODEL: "jev-preview" })?.model).toBe("jev-preview");
  });

  test("JEV_BASE_URL overrides and loses its trailing slash", () => {
    expect(jevConfig({ JEV_API_KEY: "k", JEV_BASE_URL: "https://example.test/x/" })?.baseUrl).toBe("https://example.test/x");
  });

  test("callJev posts the systemone shape and returns answers", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ answers: { a: { type: "noul", noul: 0.9 } } }), { status: 200 })
    );
    const answers = await callJev(
      { apiKey: "k", baseUrl: "https://gw.test/typesafe", model: "typesafe-ai/jev" },
      { code: "x" },
      { a: { type: "noul", instructions: "?" } },
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(answers).toEqual({ a: { type: "noul", noul: 0.9 } });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://gw.test/typesafe/v1/systemone");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer k");
    expect(JSON.parse(String(init.body))).toEqual({
      model: "typesafe-ai/jev",
      state: { code: "x" },
      questions: { a: { type: "noul", instructions: "?" } },
    });
  });

  test("callJev surfaces TypeSafe's error message", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ message: "bad key", error_type: "auth" }), { status: 401 })
    );
    await expect(
      callJev({ apiKey: "k", baseUrl: "https://x.test", model: "m" }, "s", {}, { fetchImpl: fetchImpl as unknown as typeof fetch })
    ).rejects.toThrow(JevError);
  });
});
