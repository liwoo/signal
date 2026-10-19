// ── AI Token System ──
// Simulated AI code completion powered by XP-activated tokens.
// Maya "discovers" a model in the terminal at chapter 3.
// Tokens deplete with each suggestion used.
// Pure functions only.

import type { LanguageId } from "@/types/game";

export const INITIAL_TOKENS = 0;
export const TOKEN_GRANT_CHAPTER_03 = 5;
export const TOKEN_COST_PER_USE = 1;

export interface AISuggestion {
  id: string;
  label: string;          // short label shown in picker, e.g. "variadic loop"
  code: string;           // the code snippet to insert
  description: string;    // Maya's explanation
}

/** Get AI suggestions for a given step, in the language being taught. Returns empty if not available. */
export function getAISuggestions(stepId: string, language: LanguageId = "go"): AISuggestion[] {
  const bank = language === "go" ? STEP_SUGGESTIONS : language === "javascript" ? JS_SUGGESTIONS : PY_SUGGESTIONS;
  return bank[stepId] ?? [];
}

/** Use a token. Returns new token count, or null if can't afford it. */
export function useToken(tokens: number): number | null {
  if (tokens < TOKEN_COST_PER_USE) return null;
  return tokens - TOKEN_COST_PER_USE;
}

/** Check if player can use AI assist. */
export function canUseAI(tokens: number): boolean {
  return tokens >= TOKEN_COST_PER_USE;
}

// ── Step-keyed suggestion banks ──
// These are "simulated" AI completions — curated suggestions that
// teach patterns while feeling like AI-assisted coding.

const STEP_SUGGESTIONS: Record<string, AISuggestion[]> = {
  "chapter-03:sumfunc": [
    {
      id: "sum-variadic-sig",
      label: "function signature",
      code: `func sumCodes(codes ...int) int {`,
      description: "variadic function signature — ...int accepts any number of ints",
    },
    {
      id: "sum-range-loop",
      label: "range loop",
      code: `    for _, c := range codes {
        total += c
    }`,
      description: "iterate over the variadic slice with range — _ discards the index",
    },
    {
      id: "sum-full-body",
      label: "full function body",
      code: `    total := 0
    for _, c := range codes {
        total += c
    }
    return total`,
      description: "complete sum logic — initialize, accumulate, return",
    },
  ],
  "chapter-03:validate": [
    {
      id: "validate-sig",
      label: "function signature",
      code: `func validateCode(codes ...int) (int, bool) {`,
      description: "multiple return types — (int, bool) in parentheses",
    },
    {
      id: "validate-compose",
      label: "reuse sumCodes",
      code: `    total := sumCodes(codes...)`,
      description: "composition — call sumCodes with codes... to spread the slice",
    },
    {
      id: "validate-direct-return",
      label: "direct bool return",
      code: `    return total, total > 100`,
      description: "total > 100 IS a boolean — return it directly, no if/else needed",
    },
  ],
};

const JS_SUGGESTIONS: Record<string, AISuggestion[]> = {
  "chapter-03:sumfunc": [
    {
      id: "sum-rest-sig",
      label: "function signature",
      code: `function sumCodes(...codes) {`,
      description: "rest parameter — ...codes gathers every argument into one array",
    },
    {
      id: "sum-for-of",
      label: "for...of loop",
      code: `  for (const c of codes) {
    total += c;
  }`,
      description: "walk the array with for...of — each pass hands you the next value",
    },
    {
      id: "sum-full-body",
      label: "full function body",
      code: `  let total = 0;
  for (const c of codes) {
    total += c;
  }
  return total;`,
      description: "complete sum logic — start at 0, accumulate, return",
    },
  ],
  "chapter-03:validate": [
    {
      id: "validate-sig",
      label: "function signature",
      code: `function validateCode(...codes) {`,
      description: "same rest parameter — any number of codes",
    },
    {
      id: "validate-compose",
      label: "reuse sumCodes",
      code: `  const total = sumCodes(...codes);`,
      description: "spread the array back out with ...codes so sumCodes gets every value",
    },
    {
      id: "validate-two-values",
      label: "return both values",
      code: `  return [total, total > 100];`,
      description: "return an array of two — the caller unpacks it with const [sum, valid] = ...",
    },
  ],
};

const PY_SUGGESTIONS: Record<string, AISuggestion[]> = {
  "chapter-03:sumfunc": [
    {
      id: "sum-star-sig",
      label: "function signature",
      code: `def sum_codes(*codes):`,
      description: "*codes gathers every argument into one tuple",
    },
    {
      id: "sum-for-loop",
      label: "for loop",
      code: `    for c in codes:
        total += c`,
      description: "walk the tuple — each pass hands you the next value",
    },
    {
      id: "sum-full-body",
      label: "full function body",
      code: `    total = 0
    for c in codes:
        total += c
    return total`,
      description: "complete sum logic — start at 0, accumulate, return",
    },
  ],
  "chapter-03:validate": [
    {
      id: "validate-sig",
      label: "function signature",
      code: `def validate_code(*codes):`,
      description: "same *codes — any number of codes",
    },
    {
      id: "validate-compose",
      label: "reuse sum_codes",
      code: `    total = sum_codes(*codes)`,
      description: "unpack the tuple back out with *codes so sum_codes gets every value",
    },
    {
      id: "validate-two-values",
      label: "return both values",
      code: `    return total, total > 100`,
      description: "a comma returns a tuple — the caller unpacks it with s, v = ...",
    },
  ],
};
