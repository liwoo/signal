import type { LanguageId, PriorLanguage } from "@/types/game";

/**
 * The first-session syntax bridge: one line the player already knows, beside
 * the same idea in the language they're learning. It's the first thing they'll
 * write (print a line), so the bridge pays off on the very first task.
 */
export interface SyntaxBridge {
  /** The line in the language they already know (absent for "none" / same language). */
  from?: string;
  /** The same line in the language they're learning. */
  to: string;
  /** One short sentence under the bridge. */
  note: string;
}

const PRINT: Record<LanguageId, string> = {
  go: 'fmt.Println("hi")',
  python: 'print("hi")',
  javascript: 'console.log("hi")',
};

const LABEL: Record<LanguageId, string> = { go: "Go", python: "Python", javascript: "JavaScript" };

export function bridgeFor(prior: PriorLanguage, learning: LanguageId): SyntaxBridge {
  if (prior === "none") {
    return { to: PRINT[learning], note: "no problem. guided mode walks you through your first lines." };
  }
  if (prior === learning) {
    return { to: PRINT[learning], note: `you already speak ${LABEL[learning]}. you'll be at home — the puzzles bring the challenge.` };
  }
  return {
    from: PRINT[prior],
    to: PRINT[learning],
    note: `learning ${LABEL[learning]} from ${LABEL[prior]}: same idea, new syntax. NOTES keeps references beside your code.`,
  };
}

/** Answers to "what do you already code in?", in display order. */
export const PRIOR_OPTIONS: { id: PriorLanguage; label: string }[] = [
  { id: "none", label: "NOTHING YET" },
  { id: "python", label: "PYTHON" },
  { id: "javascript", label: "JAVASCRIPT" },
  { id: "go", label: "GO" },
];
