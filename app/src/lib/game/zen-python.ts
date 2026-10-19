// ── Python Zen ──
// Heuristic idiom coaching for the Python realization of Act I. Same shape as
// Go's rules in ./zen.ts: `check` passing earns the bonus and Maya's memory
// jolt, failing earns a gentle suggestion. Based on `import this` (the zen of
// python) and pep 8. Pure functions only.

import { tokenize } from "@/lib/python/tokenizer";
import type { Token } from "@/lib/lang/types";
import type { ZenRule } from "./zen";

// ══════════════════════════════════════════════════════════════
//  Shape helpers (shared with the python answer banks)
// ══════════════════════════════════════════════════════════════

const STRING_HEAD = /^([rRbBuUfF]{0,2})("""|'''|"|')/;

/**
 * Blank out comments and string contents, keeping every offset and newline in
 * place. Quotes and prefixes survive, so `print("x;y")  # a; b` becomes
 * `print("xxx")         ` — code-shaped checks never trip on text.
 */
export function maskPy(code: string): string {
  let out = "";
  let prev = 0;
  for (const t of tokenize(code)) {
    out += code.slice(prev, t.start);
    if (t.type === "comment") {
      out += " ".repeat(t.value.length);
    } else if (t.type === "string") {
      const head = t.value.match(STRING_HEAD);
      const open = head ? head[0].length : 0;
      const close = head ? head[2].length : 0;
      const inner = t.value.slice(open, t.value.length - close).replace(/[^\n]/g, "x");
      out += t.value.slice(0, open) + inner + t.value.slice(t.value.length - close);
    } else {
      out += t.value;
    }
    prev = t.end;
  }
  return out + code.slice(prev);
}

function indentOf(line: string): number {
  return (line.match(/^[ \t]*/) ?? [""])[0].length;
}

/** Index of the `:` that opens a block on a (masked) line, outside brackets. */
function blockColon(line: string): number {
  let depth = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    else if (ch === ":" && depth === 0 && line[i + 1] !== "=") return i;
  }
  return -1;
}

/**
 * The body of the block opened on `lines[at]` (a line ending in `:`): any code
 * after the colon on the same line, plus every following line indented deeper
 * than the opener. Blank lines inside the block are kept.
 */
export function blockAt(lines: string[], at: number): string {
  const head = lines[at];
  const base = indentOf(head);
  const colon = blockColon(head);
  const inline = colon >= 0 ? head.slice(colon + 1) : "";
  const body: string[] = inline.trim() ? [inline] : [];
  for (let i = at + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() && indentOf(line) <= base) break;
    body.push(line);
  }
  return body.join("\n");
}

/** Masked body of `def name(...)`, or null when the function isn't defined. */
export function defBody(code: string, name: string): string | null {
  const lines = maskPy(code).split("\n");
  const re = new RegExp(`^\\s*def\\s+${name}\\s*\\(`);
  const at = lines.findIndex((l) => re.test(l));
  return at === -1 ? null : blockAt(lines, at);
}

/** Tokens minus comments — the code that actually runs. */
function codeTokens(code: string): Token[] {
  return tokenize(code).filter((t) => t.type !== "comment");
}

function isFString(t: Token): boolean {
  const head = t.value.match(STRING_HEAD);
  return t.type === "string" && !!head && /f/i.test(head[1]);
}

/** `"CELL " + cell`, `str(n)` — text glued together by hand. */
function gluesStrings(code: string): boolean {
  const toks = codeTokens(code);
  return toks.some((t, i) => {
    if (t.value === "+" && (toks[i - 1]?.type === "string" || toks[i + 1]?.type === "string")) return true;
    return t.value === "str" && toks[i + 1]?.value === "(" && toks[i - 1]?.value !== ".";
  });
}

function usesFormatting(code: string): boolean {
  const toks = codeTokens(code);
  return toks.some((t, i) =>
    isFString(t) ||
    (t.type === "string" && toks[i + 1]?.value === "%") ||
    (t.type === "string" && toks[i + 1]?.value === "." && toks[i + 2]?.value === "format"),
  );
}

/** Line numbers (1-based) whose first token sits inside an open bracket. */
function continuationLines(code: string): Set<number> {
  const out = new Set<number>();
  let depth = 0;
  let lastLine = 0;
  for (const t of tokenize(code)) {
    if (t.line !== lastLine) {
      if (depth > 0) out.add(t.line);
      lastLine = t.line;
    }
    if ("([{".includes(t.value)) depth++;
    else if (")]}".includes(t.value)) depth = Math.max(0, depth - 1);
    if (t.type === "string" && t.value.includes("\n")) {
      // lines inside a multi-line string are text, not code
      const first = t.line;
      const span = t.value.split("\n").length - 1;
      for (let l = first + 1; l <= first + span; l++) out.add(l);
      lastLine = first + span;
    }
  }
  return out;
}

const COMPARISONS = new Set(["==", "!=", "<=", ">=", "<", ">"]);

// ══════════════════════════════════════════════════════
//  Rules
// ══════════════════════════════════════════════════════

// ── chapter-01:scaffold ──

const noSemicolon: ZenRule = {
  id: "py_no_semicolon",
  principle: "the line ends the statement",
  isRelevant: (code) => code.trim().length > 0,
  check: (code) => !maskPy(code).includes(";"),
  bonusXP: 5,
  jolt: "...no semicolon. the end of the line is the end of the statement — python never needed the extra mark. less punctuation, less noise. the zen of python says it plainly: \"beautiful is better than ugly.\"",
  suggestion: "python doesn't need a `;` at the end of a line — the newline ends the statement. drop it and the code reads cleaner.",
};

const noSpaceBeforeParen: ZenRule = {
  id: "py_no_space_before_paren",
  principle: "calls hug their brackets",
  isRelevant: (code) => codeTokens(code).some((t, i, all) =>
    (t.type === "identifier" || t.type === "builtin") && all[i + 1]?.value === "("),
  check: (code) => {
    const toks = codeTokens(code);
    return !toks.some((t, i) => {
      const next = toks[i + 1];
      return (t.type === "identifier" || t.type === "builtin") &&
        next?.value === "(" && next.line === t.line && next.start > t.end;
    });
  },
  bonusXP: 3,
  jolt: "`print(` — no gap between the name and its bracket. pep 8 asks for exactly that. a call looks like a call. my old style checker never once complained about yours.",
  suggestion: "write calls with no space before the bracket: `print(\"Hello World\")`, not `print (\"Hello World\")`. pep 8 keeps the name and its arguments together.",
};

// ── chapter-02:scaffold ──

const flatTopLevel: ZenRule = {
  id: "py_flat_top_level",
  principle: "flat is better than nested",
  isRelevant: (code) => code.trim().length > 0,
  check: (code) => !/^\s*def\s/m.test(maskPy(code)),
  bonusXP: 5,
  jolt: "...one line, top level, no wrapper. the file is the program — python runs it from the top. \"flat is better than nested.\" i used to wrap everything in a main function out of habit. you didn't need to.",
  suggestion: "you don't need a `def main():` here — python runs the file from the top. one `print(...)` at the top level is the whole program. flat is better than nested.",
};

const noTrailingWhitespace: ZenRule = {
  id: "py_no_trailing_whitespace",
  principle: "no trailing whitespace",
  isRelevant: (code) => code.trim().length > 0,
  check: (code) => !code.split("\n").some((l) => /\S[ \t]+$/.test(l)),
  bonusXP: 3,
  jolt: "clean line endings — nothing hiding after the last character. pep 8 asks for that because invisible spaces turn into noisy diffs later. tidy is a habit. you have it.",
  suggestion: "there are stray spaces at the end of a line. you can't see them, but every diff can. pep 8 says trim them.",
};

// ── chapter-03:scaffold ──

const consistentQuotes: ZenRule = {
  id: "py_consistent_quotes",
  principle: "one quote style",
  isRelevant: (code) => codeTokens(code).some((t) => t.type === "string"),
  check: (code) => {
    const styles = new Set<string>();
    for (const t of codeTokens(code)) {
      if (t.type !== "string") continue;
      const head = t.value.match(STRING_HEAD);
      if (!head || head[2].length === 3) continue;
      const quote = head[2];
      const other = quote === '"' ? "'" : '"';
      // switching quotes to avoid escaping is fine
      if (t.value.includes(other)) continue;
      styles.add(quote);
    }
    return styles.size <= 1;
  },
  bonusXP: 3,
  jolt: "one quote style, kept the whole way through. python doesn't care which you pick — pep 8 just asks you to pick one and stick to it. consistency is a kindness to whoever reads next.",
  suggestion: "you're mixing `'single'` and `\"double\"` quotes. python accepts both, but pick one and stick to it — pep 8's only rule here is consistency.",
};

const commentSpace: ZenRule = {
  id: "py_comment_space",
  principle: "comments start with `# `",
  isRelevant: (code) => tokenize(code).some((t) => t.type === "comment" && !t.value.startsWith("#!")),
  check: (code) => tokenize(code).every((t) =>
    t.type !== "comment" || t.value === "#" || /^#( |!)/.test(t.value)),
  bonusXP: 3,
  jolt: "`# ` — hash, space, then words. that's the pep 8 comment. it reads like a note in a margin. i left notes like that all over my thesis code.",
  suggestion: "start comments with a hash and a space: `# like this`, not `#like this`. pep 8 — it keeps notes readable.",
};

// ── chapter-01:location ──

const fString: ZenRule = {
  id: "py_fstring",
  principle: "f-strings over gluing text",
  // only when the player is mixing text and values in one string
  isRelevant: (code) => gluesStrings(code) || usesFormatting(code),
  check: (code) => codeTokens(code).some(isFString) && !gluesStrings(code),
  bonusXP: 15,
  jolt: "...an f-string. `f\"CELL {cellblock.CELL}\"` — the template and the values in one place, and python converts the number for you. no `+`, no `str()`. \"readability counts.\" that line is in `import this`, and you just proved it.",
  suggestion: "gluing text with `+` and `str()` works, but an f-string reads like the output: `f\"CELL {cellblock.CELL} · SUBLEVEL {cellblock.SUBLEVEL}\"`. values in braces, numbers converted for you.",
};

const qualifiedImport: ZenRule = {
  id: "py_qualified_import",
  principle: "namespaces are one honking great idea",
  isRelevant: (code) => /\bcellblock\b/.test(maskPy(code)),
  check: (code) => {
    const m = maskPy(code);
    // usage may sit inside an f-string's braces, so look past the mask (comments still dropped)
    const refs = codeTokens(code).filter((t) =>
      t.type === "string" ? /\bcellblock\.\w/.test(t.value) : t.value === "cellblock").length;
    // one ref is the import itself; any more is the module in use
    return refs >= 2 && /^\s*import\s+cellblock\b/m.test(m) && !/^\s*from\s+cellblock\s+import\b/m.test(m);
  },
  bonusXP: 10,
  jolt: "`cellblock.CELL` — you kept the module's name in front. anyone reading knows exactly where my cell number came from. the last line of the zen of python: \"namespaces are one honking great idea — let's do more of those.\"",
  suggestion: "keep the module name in front: `import cellblock`, then `cellblock.CELL`. pulling names out with `from ... import` hides where they came from. namespaces tell the reader.",
};

const importsAtTop: ZenRule = {
  id: "py_imports_at_top",
  principle: "imports at the top, set apart",
  isRelevant: (code) => /^\s*(import|from)\s/m.test(maskPy(code)),
  check: (code) => {
    const lines = maskPy(code).split("\n");
    const isImport = (l: string) => /^(import|from)\s/.test(l);
    const last = lines.reduce((acc, l, i) => (isImport(l) ? i : acc), -1);
    if (last === -1) return false; // only indented imports
    const before = lines.slice(0, last).every((l) => !l.trim() || isImport(l));
    const next = lines[last + 1];
    return before && (next === undefined || next.trim() === "");
  },
  bonusXP: 3,
  jolt: "import first, then a blank line, then the work. pep 8 puts imports at the very top so you see what a file depends on before anything runs. sections that breathe.",
  suggestion: "put the import at the very top and leave a blank line after it: `import cellblock`, blank line, then your `print`. pep 8 — dependencies first, set apart.",
};

// ── chapter-02:loop ──

const rangeStartStop: ZenRule = {
  id: "py_range_start_stop",
  principle: "let range count for you",
  isRelevant: (code) => /\brange\s*\(/.test(maskPy(code)),
  check: (code) => {
    const m = maskPy(code);
    return /\brange\s*\(\s*1\s*,\s*11\s*\)/.test(m) && !/\bprint\s*\(\s*\w+\s*\+\s*1\s*\)/.test(m);
  },
  bonusXP: 10,
  jolt: "`range(1, 11)` — start where the keypad starts, stop one past the end. no `i + 1` patching inside the loop. the numbers you need come straight out of range. \"explicit is better than implicit.\"",
  suggestion: "give range both ends: `range(1, 11)` counts 1 to 10 on its own. then the body is just `print(i)` — no `+ 1` arithmetic to get wrong.",
};

const fourSpaceIndent: ZenRule = {
  id: "py_four_space_indent",
  principle: "four spaces per level",
  isRelevant: (code) => maskPy(code).split("\n").some((l) => l.trim() && /^[ \t]/.test(l)),
  check: (code) => {
    const skip = continuationLines(code);
    return code.split("\n").every((line, i) => {
      if (!line.trim() || skip.has(i + 1) || line.trim().startsWith("#")) return true;
      const lead = (line.match(/^[ \t]*/) ?? [""])[0];
      return !lead.includes("\t") && lead.length % 4 === 0;
    });
  },
  bonusXP: 5,
  jolt: "four spaces, every level. in python the indentation is the structure — it's how the loop knows its own body. pep 8 says four. you didn't make me count.",
  suggestion: "indent each level by four spaces — no tabs, no two-space steps. in python the indentation is the structure, and pep 8 settles on four.",
};

// ── chapter-02:classify ──

/** `else:` whose block starts with a fresh `if` — an elif written the long way. */
function nestedElseIf(code: string): boolean {
  const lines = maskPy(code).split("\n");
  return lines.some((line, i) => {
    if (!/^\s*else\s*:\s*$/.test(line)) return false;
    const next = lines.slice(i + 1).find((l) => l.trim());
    return !!next && indentOf(next) > indentOf(line) && /^\s*if\b/.test(next);
  });
}

const elifChain: ZenRule = {
  id: "py_elif_chain",
  principle: "elif over nested if/else",
  isRelevant: (code) => codeTokens(code).filter((t) => t.value === "if" || t.value === "elif").length >= 2,
  check: (code) => codeTokens(code).some((t) => t.value === "elif") && !nestedElseIf(code),
  bonusXP: 15,
  jolt: "...a flat `if` / `elif` / `else` ladder. one decision, read top to bottom, first true condition wins. no nesting, no repeated checks. \"flat is better than nested\" — that one always stuck with me.",
  suggestion: "chain the conditions with `elif` instead of separate `if`s or an `if` buried under `else:`. one ladder, first true branch wins, and the code stays flat.",
};

const operatorSpacing: ZenRule = {
  id: "py_operator_spacing",
  principle: "space around comparisons",
  isRelevant: (code) => codeTokens(code).some((t) => t.type === "operator" && COMPARISONS.has(t.value)),
  check: (code) => codeTokens(code).every((t) => {
    if (t.type !== "operator" || !COMPARISONS.has(t.value)) return true;
    return /[ \t]/.test(code[t.start - 1] ?? "") && /[ \t]/.test(code[t.end] ?? "");
  }),
  bonusXP: 5,
  jolt: "`i <= 3` — a space on each side of the comparison. pep 8 asks for it so the condition reads like a sentence. small thing. you did it without thinking.",
  suggestion: "put a space on each side of a comparison: `i <= 3`, not `i<=3`. pep 8 — it makes every condition easier to scan.",
};

const printSeparator: ZenRule = {
  id: "py_print_separator",
  principle: "let print do the spacing",
  isRelevant: (code) => /\bprint\s*\(/.test(maskPy(code)),
  check: (code) => !gluesStrings(code),
  bonusXP: 5,
  jolt: "`print(i, \"DENY\")` — you handed print two things and let it put the space between them. no `str()`, no `+`. let the tool do its job.",
  suggestion: "no need to glue with `str(i) + \" DENY\"`. give print both values — `print(i, \"DENY\")` — and it adds the space for you.",
};

// ── chapter-02:rewrite ──

const dictLiteral = (code: string) => /\{[^{}]*\d+\s*:\s*["']/.test(code);

const dataOverBranches: ZenRule = {
  id: "py_data_over_branches",
  principle: "data over branches",
  isRelevant: (code) => dictLiteral(code),
  check: (code) => !codeTokens(code).some((t) => t.value === "if" || t.value === "elif"),
  bonusXP: 10,
  jolt: "...no conditions left at all. the table holds the answers and the loop just asks. when the rules change, you edit data, not logic. \"there should be one obvious way to do it\" — for a fixed mapping, a dict is it.",
  suggestion: "the dict already knows every level — the leftover `if` checks can go. let `levels[i]` do the deciding.",
};

const dictTrailingComma: ZenRule = {
  id: "py_dict_trailing_comma",
  principle: "trailing comma in a multi-line literal",
  isRelevant: (code) => {
    const toks = codeTokens(code);
    return toks.some((t, i) => t.value === "}" && toks[i - 1] && toks[i - 1].line < t.line);
  },
  check: (code) => {
    const toks = codeTokens(code);
    return toks.every((t, i) => t.value !== "}" || !toks[i - 1] || toks[i - 1].line === t.line || toks[i - 1].value === ",");
  },
  bonusXP: 5,
  jolt: "a comma after the last entry, and the closing brace on its own line. add code 11 tomorrow and only one line changes. pep 8 calls those trailing commas exactly that — helpful.",
  suggestion: "when a dict spans several lines, end the last entry with a comma too — `10: \"OVERRIDE\",` — and put `}` on its own line. adding an entry later touches one line, not two.",
};

// ── chapter-03:sumfunc ──

const sumBuiltin: ZenRule = {
  id: "py_sum_builtin",
  principle: "batteries included",
  isRelevant: (code) => defBody(code, "sum_codes") !== null,
  check: (code) => /\bsum\s*\(/.test(defBody(code, "sum_codes") ?? ""),
  bonusXP: 10,
  jolt: "...`return sum(codes)`. python ships the loop already written. one line, no counter to forget to reset. they call it batteries included. i'd forgotten how much i liked that.",
  suggestion: "the loop is worth knowing — but python ships it already built: `return sum(codes)`. one line, nothing to forget.",
};

const pureFunction: ZenRule = {
  id: "py_pure_function",
  principle: "return it, don't print it",
  isRelevant: (code) => defBody(code, "sum_codes") !== null,
  check: (code) => {
    const body = defBody(code, "sum_codes") ?? "";
    return /\breturn\b/.test(body) && !/\bprint\s*\(/.test(body);
  },
  bonusXP: 10,
  jolt: "`sum_codes` hands the total back and stays quiet. no printing inside. whoever calls it decides what to do with the number. one function, one job.",
  suggestion: "keep `sum_codes` to the math: `return total`, and let the caller print. a function that prints can't be reused by the next function.",
};

const augmentedAssign: ZenRule = {
  id: "py_augmented_assign",
  principle: "augmented assignment",
  isRelevant: (code) => {
    const m = maskPy(code);
    return /\+=/.test(m) || /\b(\w+)\s*=\s*\1\s*\+/.test(m);
  },
  check: (code) => !/\b(\w+)\s*=\s*\1\s*[-+*/]/.test(maskPy(code)),
  bonusXP: 5,
  jolt: "`total += c` — say the name once and let `+=` do the rest. shorter, and you can't misspell the second copy. small, sharp, pythonic.",
  suggestion: "`total = total + c` works, but `total += c` says the same thing with the name written once.",
};

// ── chapter-03:validate ──

const directBoolReturn: ZenRule = {
  id: "py_direct_bool_return",
  principle: "return the comparison itself",
  isRelevant: (code) => defBody(code, "validate_code") !== null,
  check: (code) => !/\b(True|False)\b/.test(defBody(code, "validate_code") ?? ""),
  bonusXP: 15,
  jolt: "...`return total, total > 100`. the comparison already is `True` or `False` — you returned it straight. no `if` wrapped around a boolean. \"simple is better than complex.\" my advisor would've circled that line. in a good way.",
  suggestion: "`total > 100` is already `True` or `False`. no need for an `if` that returns them by hand — `return total, total > 100`.",
};

const reuseUnpack: ZenRule = {
  id: "py_reuse_unpack",
  principle: "reuse, and pass the args through",
  isRelevant: (code) => defBody(code, "validate_code") !== null,
  check: (code) => /\bsum_codes\s*\(\s*\*\s*\w+/.test(defBody(code, "validate_code") ?? ""),
  bonusXP: 10,
  jolt: "`sum_codes(*codes)` — you reused what you'd built and spread the tuple right back into it. one place does the sum. the star on the way in, the star on the way out.",
  suggestion: "call the function you already have: `total = sum_codes(*codes)`. the star spreads the tuple back out into separate arguments.",
  getSuggestion: (code) => {
    const body = defBody(code, "validate_code") ?? "";
    if (/\bsum_codes\s*\(\s*\w+\s*\)/.test(body)) {
      return "without the star, `sum_codes(codes)` gets one tuple instead of the numbers. spread it back out: `sum_codes(*codes)`.";
    }
    return "call the function you already have: `total = sum_codes(*codes)`. the star spreads the tuple back out into separate arguments.";
  },
};

const tupleUnpacking: ZenRule = {
  id: "py_tuple_unpacking",
  principle: "unpack the tuple",
  // only when the player calls validate_code themselves
  isRelevant: (code) => (maskPy(code).match(/\bvalidate_code\s*\(/g) ?? []).length > (defBody(code, "validate_code") !== null ? 1 : 0),
  check: (code) => /\b\w+\s*,\s*\w+\s*=\s*validate_code\s*\(/.test(maskPy(code)),
  bonusXP: 5,
  jolt: "`s, v = validate_code(...)` — two names, one line, the tuple split clean. no `result[0]`, no `result[1]`. names beat positions.",
  suggestion: "unpack the result straight into names: `s, v = validate_code(25, 30)`. names read better than `result[0]` and `result[1]`.",
};

// ── Registry ──

export const PYTHON_ZEN_RULES: Record<string, ZenRule[]> = {
  "chapter-01:scaffold": [noSemicolon, noSpaceBeforeParen],
  "chapter-01:location": [fString, qualifiedImport, importsAtTop],
  "chapter-02:scaffold": [flatTopLevel, noTrailingWhitespace],
  "chapter-02:loop": [rangeStartStop, fourSpaceIndent],
  "chapter-02:classify": [elifChain, operatorSpacing, printSeparator],
  "chapter-02:rewrite": [dataOverBranches, dictTrailingComma],
  "chapter-03:scaffold": [consistentQuotes, commentSpace],
  "chapter-03:sumfunc": [pureFunction, sumBuiltin, augmentedAssign],
  "chapter-03:validate": [directBoolReturn, reuseUnpack, tupleUnpacking],
};
