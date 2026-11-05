/**
 * Warm-up drill grading — pure, no React.
 *
 * Each drill asks the player to retype one exact line (or the Go skeleton).
 * Grading is strict and case-sensitive, because the real compiler is: a drill
 * that waves `fmt.println` through teaches the opposite of what the level then
 * rejects (playtest 2 Nov 2026). Every rejection carries a short, specific
 * reason so the player knows what to fix — never a silent shake.
 */

import type { LanguageId } from "@/types/game";

export type WarmupExercise = 1 | 2 | 3 | 4;

export type WarmupCheck = { ok: true } | { ok: false; error: string };

const OK: WarmupCheck = { ok: true };
const fail = (error: string): WarmupCheck => ({ ok: false, error });

/** Collapse runs of spaces/tabs and trim each line; drop blank lines. */
function lines(input: string): string[] {
  return input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter((l) => l.length > 0);
}

/** Remove whitespace that sits outside string literals ("i'm in" keeps its space). */
function squash(input: string): string {
  let out = "";
  let inString = false;
  for (const ch of input) {
    if (ch === '"') inString = !inString;
    if (!inString && /\s/.test(ch)) continue;
    out += ch;
  }
  return out;
}

const GENERIC = "not quite — compare it with the target, character for character.";

// ── Go ──

/** Specific, common slips first — each one is a real compile error in Go. */
function goSlip(input: string): string | null {
  const lowerCall = input.match(/\bfmt\.(println|printf|print|sprintf)\b/);
  if (lowerCall) {
    const name = lowerCall[1];
    const fixed = name[0].toUpperCase() + name.slice(1);
    return `go is case-sensitive — it's \`fmt.${fixed}\` with a capital ${fixed[0]}. \`fmt.${name}\` won't compile: names you use from another package start with a capital letter.`;
  }
  if (/\bFmt\./.test(input)) {
    return "the package name is all lowercase: `fmt`, not `Fmt`.";
  }
  if (/fmt\.\w+\s*\(\s*'/.test(input)) {
    return "text goes in double quotes in go — `\"i'm in\"`. single quotes are for one character.";
  }
  if (/[“”]/.test(input)) {
    return "those are curly quotes — go needs straight double quotes `\"`.";
  }
  return null;
}

const GO: Record<WarmupExercise, (input: string) => WarmupCheck> = {
  1: (input) => {
    const slip = goSlip(input);
    if (slip) return fail(slip);
    const l = lines(input);
    if (l.length === 1 && squash(l[0]).replace(/;$/, "") === `fmt.Println("i'm in")`) return OK;
    if (!input.includes(`"i'm in"`)) return fail("print exactly `\"i'm in\"` — quotes included.");
    return fail(GENERIC);
  },
  2: (input) => {
    const slip = goSlip(input);
    if (slip) return fail(slip);
    const l = lines(input).map(squash);
    if (l.length === 2 && l[0] === `cell:="B-09"` && l[1] === "fmt.Println(cell)") return OK;
    if (l[0] && /^cell=/.test(l[0])) return fail("use `:=` to create the variable — the colon matters. `cell := \"B-09\"`.");
    if (l[1] && l[1] === `fmt.Println("cell")`) return fail("no quotes around `cell` — you want the variable, not the word.");
    return fail(GENERIC);
  },
  3: (input) => {
    const slip = goSlip(input);
    if (slip) return fail(slip);
    const l = lines(input);
    if (l.length === 1 && squash(l[0]) === `fmt.Printf("CELL %s\\n",cell)`) return OK;
    if (input.includes("%S")) return fail("the blank is a lowercase `%s`.");
    if (input.includes("/n")) return fail("a new line is a backslash: `\\n`, not `/n`.");
    return fail(GENERIC);
  },
  4: (input) => {
    const slip = goSlip(input);
    if (slip) return fail(slip);
    // `func main()` and `{` must share a line — go inserts a semicolon otherwise.
    if (/func\s+main\s*\(\s*\)[ \t]*\n\s*\{/.test(input)) {
      return fail("the `{` has to sit on the same line as `func main()` — go won't compile it on the next line.");
    }
    const s = squash(input);
    const valid =
      s === `packagemainimport"fmt"funcmain(){fmt.Println("i'm in")}` ||
      s === `packagemainimport("fmt")funcmain(){fmt.Println("i'm in")}`;
    if (valid) return OK;
    if (!/^\s*package\s+main\b/.test(input)) return fail("start with `package main` on the first line.");
    if (!/import\s*(\(\s*)?"fmt"/.test(input)) return fail("bring in printing with `import \"fmt\"` under the package line.");
    if (!/func\s+main\s*\(\s*\)/.test(input)) return fail("the program starts in `func main() {` — add it after the import.");
    return fail(GENERIC);
  },
};

// ── JavaScript / Python — same strictness, their own slips ──

const JAVASCRIPT: Record<WarmupExercise, (input: string) => WarmupCheck> = {
  1: (v) => (/^console\.log\(\s*"i'm in"\s*\)\s*;?$/.test(v.trim()) ? OK : jsSlip(v)),
  2: (v) => (/const\s+cell\s*=\s*["']B-09["']/.test(v) && /console\.log\(\s*cell\s*\)/.test(v) ? OK : jsSlip(v)),
  3: (v) => (v.includes("console.log(`") && v.includes("${cell}") ? OK : jsSlip(v)),
  4: (v) =>
    /import\s*\{\s*cell\s*\}\s*from\s*["']\.\/cellblock\.js["']/.test(v) && /console\.log\(\s*cell\s*\)/.test(v) ? OK : jsSlip(v),
};

function jsSlip(v: string): WarmupCheck {
  if (/\bconsole\.Log\b|\bConsole\./.test(v)) return fail("javascript is case-sensitive — it's `console.log`, all lowercase.");
  return fail(GENERIC);
}

const PYTHON: Record<WarmupExercise, (input: string) => WarmupCheck> = {
  1: (v) => (/^print\(\s*"i'm in"\s*\)$/.test(v.trim()) ? OK : pySlip(v)),
  2: (v) => (/cell\s*=\s*["']B-09["']/.test(v) && /print\(\s*cell\s*\)/.test(v) ? OK : pySlip(v)),
  3: (v) => (/print\(f["']CELL \{cell\}["']\)/.test(v) ? OK : pySlip(v)),
  4: (v) => (/^\s*import\s+cellblock\s*$/m.test(v) && v.includes("print(cellblock.CELL)") ? OK : pySlip(v)),
};

function pySlip(v: string): WarmupCheck {
  if (/\bPrint\(/.test(v)) return fail("python is case-sensitive — it's `print`, all lowercase.");
  if (/cellblock\.cell\b/.test(v)) return fail("the name is `CELL` in capitals — python is case-sensitive.");
  return fail(GENERIC);
}

const BY_LANGUAGE: Record<LanguageId, Record<WarmupExercise, (input: string) => WarmupCheck>> = {
  go: GO,
  javascript: JAVASCRIPT,
  python: PYTHON,
};

/** Grade one warm-up drill. Empty input is always a (gentle) miss. */
export function checkWarmup(language: LanguageId, exercise: WarmupExercise, input: string): WarmupCheck {
  if (!input.trim()) return fail("type the target line first.");
  return BY_LANGUAGE[language][exercise](input);
}
