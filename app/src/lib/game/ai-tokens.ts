// ── AI Token System ──
// Simulated AI code completion powered by XP-activated tokens.
// Maya "discovers" a model in the terminal at chapter 3.
// Tokens deplete with each suggestion used.
// Pure functions only.

export const INITIAL_TOKENS = 0;
export const TOKEN_GRANT_CHAPTER_03 = 5;
export const TOKEN_COST_PER_USE = 1;

export interface AISuggestion {
  id: string;
  label: string;          // short label shown in picker, e.g. "variadic loop"
  code: string;           // the code snippet to insert
  description: string;    // Maya's explanation
}

/** Get AI suggestions for a given step. Returns empty if not available. */
export function getAISuggestions(stepId: string): AISuggestion[] {
  return STEP_SUGGESTIONS[stepId] ?? [];
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
