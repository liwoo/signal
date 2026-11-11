// ── Python Zen ──
// Heuristic idiom coaching for the Python realizations of Acts I–III. Same shape as
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
  suggestion: "gluing text with `+` and `str()` works, but an f-string reads like the output: `f\"CELL {cellblock.CELL} - SUBLEVEL {cellblock.SUBLEVEL}\"`. values in braces, numbers converted for you.",
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

// ══════════════════════════════════════════════════════
//  Act II helpers
// ══════════════════════════════════════════════════════

/** Body of `def name(...)` as written (comments and strings kept), or null. Same lines as defBody. */
function rawBody(code: string, name: string): string | null {
  const re = new RegExp(`^\\s*def\\s+${name}\\s*\\(`);
  const at = maskPy(code).split("\n").findIndex((l) => re.test(l));
  return at === -1 ? null : blockAt(code.split("\n"), at);
}

/** First parameter name of `def name(...)`, or null. */
function firstParam(code: string, name: string): string | null {
  const m = maskPy(code).match(new RegExp(`^\\s*def\\s+${name}\\s*\\(\\s*\\*{0,2}(\\w+)`, "m"));
  return m ? m[1] : null;
}

/** Masked text of the first `{ ... }` in `body`, braces included, or null. */
function firstBraces(body: string): string | null {
  const open = body.indexOf("{");
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < body.length; i++) {
    if (body[i] === "{") depth++;
    else if (body[i] === "}" && --depth === 0) return body.slice(open, i + 1);
  }
  return null;
}

/** `"key": value` pairs inside a masked dict literal. */
const pairCount = (text: string) => (text.match(/["']x*["']\s*:/g) ?? []).length;

// ── chapter-04:scaffold ──

const lineLength: ZenRule = {
  id: "py_line_length",
  principle: "lines that fit in 79 characters",
  isRelevant: (code) => code.trim().length > 0,
  check: (code) => code.split("\n").every((l) => l.length <= 79),
  bonusXP: 3,
  jolt: "every line fits in 79 characters. pep 8 keeps lines short so two files sit side by side and nobody scrolls sideways. the roster's coming — five guards. short lines are about to matter.",
  suggestion: "a line runs past 79 characters. pep 8 keeps them short — break a long one inside its brackets, one item per line.",
};

// ── chapter-04:guardmap ──

const dictLiteralRoster: ZenRule = {
  id: "py_dict_literal",
  principle: "build the dict in one literal",
  isRelevant: (code) => defBody(code, "build_roster") !== null,
  check: (code) => {
    const body = defBody(code, "build_roster") ?? "";
    const braces = firstBraces(body);
    return !!braces && pairCount(braces) > 0 && !/\b\w+\s*\[[^\]\n]*\]\s*=(?!=)/.test(body);
  },
  bonusXP: 10,
  jolt: "...the whole roster in one literal. you can read every guard at a glance — the dict looks like the schedule it came from. no empty dict filled in line by line. \"readability counts.\"",
  suggestion: "you don't need an empty dict and five assignments. write it in one go: `return {\"Chen\": \"Floor 1\", ...}` — the data reads like the schedule.",
};

const onePairPerLine: ZenRule = {
  id: "py_one_pair_per_line",
  principle: "one pair per line, trailing comma",
  isRelevant: (code) => {
    const braces = firstBraces(defBody(code, "build_roster") ?? "");
    return !!braces && pairCount(braces) >= 3;
  },
  check: (code) => {
    const braces = firstBraces(defBody(code, "build_roster") ?? "")!;
    const lines = braces.slice(1, -1).split("\n");
    const filled = lines.filter((l) => l.trim());
    const lastLine = braces.slice(braces.lastIndexOf("\n") + 1);
    return (
      lines.length > 1 &&
      filled.every((l) => pairCount(l) === 1) &&
      /,\s*$/.test(filled[filled.length - 1] ?? "") &&
      lastLine.trim() === "}"
    );
  },
  bonusXP: 5,
  jolt: "one guard per line, a comma after every one — even the last — and the brace on its own line. add a sixth guard and exactly one line changes. pep 8 calls that trailing comma helpful. it is.",
  suggestion: "with five pairs, give each its own line, end every line with a comma — the last one too — and close the brace on its own line. the next guard is then a one-line change.",
};

// ── chapter-04:clearfloors ──

const setMembership: ZenRule = {
  id: "py_set_membership",
  principle: "a set for membership",
  isRelevant: (code) => defBody(code, "find_clear_floor") !== null,
  check: (code) => /\bset\s*\(|\{[^:{}]*\bfor\b[^:{}]*\}/.test(defBody(code, "find_clear_floor") ?? ""),
  bonusXP: 15,
  jolt: "...a set. each floor in it once, and `in` answers straight away instead of walking a list. some languages have no set at all — you fake one with a dict full of trues. python just hands you the real thing.",
  suggestion: "collect the occupied floors in a set: `set(guards.values())`. checking `in` on a list walks every item; a set answers at once and drops the repeats.",
};

const dictValues: ZenRule = {
  id: "py_dict_values",
  principle: "ask for the values you need",
  isRelevant: (code) => {
    const g = firstParam(code, "find_clear_floor");
    return !!g && new RegExp(`\\b${g}\\b`).test(defBody(code, "find_clear_floor") ?? "");
  },
  check: (code) => {
    const g = firstParam(code, "find_clear_floor")!;
    const body = defBody(code, "find_clear_floor") ?? "";
    return (
      new RegExp(`\\b${g}\\s*\\.\\s*values\\s*\\(`).test(body) &&
      !new RegExp(`\\b${g}\\s*\\[|\\b${g}\\s*\\.\\s*(items|keys)\\s*\\(`).test(body)
    );
  },
  bonusXP: 10,
  jolt: "`guards.values()` — you never needed the names here, so you didn't ask for them. no `guards[name]` round trip. the code says exactly what it uses.",
  suggestion: "you only need the floors, not the names. `guards.values()` hands them straight over — no looping through keys to look each one up.",
};

const notIn: ZenRule = {
  id: "py_not_in",
  principle: "`not in`, not `not ... in`",
  isRelevant: (code) => /^\s*(if|elif|while)\b[^\n]*\bin\b/m.test(maskPy(code)),
  check: (code) => !/\bnot\s+\(?\s*[\w.]+(?:\([^()\n]*\))?\s+in\b/.test(maskPy(code)),
  bonusXP: 5,
  jolt: "`name not in occupied` — one operator, and it reads like a sentence. pep 8 asks for exactly that over `not name in occupied`. small. it made me smile.",
  suggestion: "write `name not in occupied`, not `not name in occupied`. same result, but `not in` is one operator and reads like english — pep 8 prefers it.",
};

// ── chapter-04.2:scaffold ──

const blankLineLimit: ZenRule = {
  id: "py_blank_line_limit",
  principle: "never more than two blank lines",
  isRelevant: (code) => code.trim().length > 0,
  check: (code) => !/\n[ \t]*\n[ \t]*\n[ \t]*\n/.test(code.trim()),
  bonusXP: 3,
  jolt: "no long gaps. pep 8 puts two blank lines between top-level functions and never more — enough to breathe, not enough to lose your place. the cipher's about to need a few functions. you're ready.",
  suggestion: "there are three or more blank lines in a row. pep 8 says two at most, around top-level functions. trim the gap.",
};

// ── chapter-04.2:reverseword ──

const sliceReverse: ZenRule = {
  id: "py_slice_reverse",
  principle: "slice it backwards",
  isRelevant: (code) => defBody(code, "reverse_word") !== null,
  check: (code) => /\[\s*:\s*:\s*-\s*1\s*\]/.test(defBody(code, "reverse_word") ?? ""),
  bonusXP: 15,
  jolt: "...`s[::-1]`. the whole cipher in five characters. no swapping, no counters — a string is already a sequence, so you just walked it backwards. \"simple is better than complex.\"",
  suggestion: "a loop works, but a slice does the whole reversal: `return s[::-1]`. empty start, empty stop, step -1.",
};

const noRangeLen: ZenRule = {
  id: "py_no_range_len",
  principle: "loop over the thing, not its indexes",
  isRelevant: (code) => /^\s*for\s/m.test(defBody(code, "reverse_word") ?? ""),
  check: (code) => !/\brange\s*\(\s*len\s*\(/.test(defBody(code, "reverse_word") ?? ""),
  bonusXP: 5,
  jolt: "`for ch in s` — you walked the characters themselves, not their positions. no `s[i]`, no index to get wrong by one.",
  suggestion: "`for i in range(len(s))` works, but python loops can hand you the characters directly: `for ch in s:`. no index to keep track of.",
};

// ── chapter-04.2:encode ──

const joinWords: ZenRule = {
  id: "py_join_words",
  principle: "join, don't concatenate",
  isRelevant: (code) => defBody(code, "encode") !== null,
  check: (code) => {
    const body = defBody(code, "encode") ?? "";
    return /\.\s*join\s*\(/.test(body) && !/\+=/.test(body);
  },
  bonusXP: 10,
  jolt: "`\" \".join(...)` — spaces only between the words, never a stray one on the end. and no string rebuilt on every pass of a loop. one call does the gluing.",
  suggestion: "skip the `+=` gluing — it leaves a stray space and rebuilds the string every pass. `\" \".join(words)` puts spaces only between them.",
};

const splitWhitespace: ZenRule = {
  id: "py_split_whitespace",
  principle: "split() with no argument",
  isRelevant: (code) => /\.\s*split\s*\(/.test(defBody(code, "encode") ?? ""),
  check: (code) => /\.\s*split\s*\(\s*\)/.test(defBody(code, "encode") ?? ""),
  bonusXP: 5,
  jolt: "`msg.split()` — empty brackets. it splits on any run of spaces, tabs or newlines and never hands back an empty word. a double space can't break your cipher.",
  suggestion: "`split(\" \")` leaves an empty word wherever there's a double space. `msg.split()` with no argument splits on any run of whitespace and skips the empties.",
};

const comprehensionJoin: ZenRule = {
  id: "py_comprehension_join",
  principle: "a comprehension instead of an append loop",
  isRelevant: (code) => /\.\s*join\s*\(/.test(defBody(code, "encode") ?? ""),
  check: (code) => {
    const body = defBody(code, "encode") ?? "";
    const inline = /\.\s*join\s*\([^\n]*\bfor\b/.test(body) || /\.\s*join\s*\(\s*map\s*\(/.test(body);
    const built = /=\s*\[[^\n]*\bfor\b/.test(body);
    return (inline || built) && !/\.\s*append\s*\(/.test(body);
  },
  bonusXP: 10,
  jolt: "...`reverse_word(w) for w in msg.split()`, straight into the join. no empty list, no append, no loop to read past. the transformation is the whole line. that's the pythonic shape.",
  suggestion: "the append loop works, but python can say it in one line: `\" \".join(reverse_word(w) for w in msg.split())`. the loop lives inside the brackets.",
};

// ── chapter-04.2:relayheader ──

const narrowExcept: ZenRule = {
  id: "py_narrow_except",
  principle: "catch the error you expect",
  isRelevant: (code) => /^\s*except\b/m.test(defBody(code, "relay_header") ?? ""),
  check: (code) => !/^\s*except\s*(:|\(?\s*(Exception|BaseException)\b)/m.test(defBody(code, "relay_header") ?? ""),
  bonusXP: 15,
  jolt: "...`except ValueError`. you caught the one failure you expected and let everything else stay loud. a typo still crashes where you can see it. \"errors should never pass silently, unless explicitly silenced.\" you silenced exactly one.",
  suggestion: "a bare `except:` catches everything — typos included — and turns them all into `ERR`. catch the one you expect: `except ValueError:`.",
};

const smallTry: ZenRule = {
  id: "py_small_try",
  principle: "keep the try block small",
  isRelevant: (code) => /^\s*try\s*:/m.test(defBody(code, "relay_header") ?? ""),
  check: (code) => {
    const lines = (defBody(code, "relay_header") ?? "").split("\n");
    return lines.every((l, i) => !/^\s*try\s*:/.test(l) || blockAt(lines, i).split("\n").filter((x) => x.trim()).length === 1);
  },
  bonusXP: 5,
  jolt: "one line inside the `try` — the conversion, the only thing that can fail. the header-building sits outside, where a mistake would still show. you know exactly what the except is guarding.",
  suggestion: "keep only the risky line inside `try:` — `n = int(code)`. build and return the header after it, so the except only ever catches the bad number.",
};

const fStringHeader: ZenRule = {
  id: "py_fstring_header",
  principle: "f-strings for the header",
  isRelevant: (code) => defBody(code, "relay_header") !== null,
  check: (code) => {
    const body = rawBody(code, "relay_header") ?? "";
    return codeTokens(body).some(isFString) && !gluesStrings(body);
  },
  bonusXP: 10,
  jolt: "`f\"F{floor}-C{n * 2}\"` — the header looks like the header. no `str()`, no `+` chains, and the doubling happens right where it lands.",
  suggestion: "gluing with `+` and `str()` works, but an f-string reads like the header itself: `f\"F{floor}-C{n * 2}\"`.",
};

// ══════════════════════════════════════════════════════
//  Act III helpers
// ══════════════════════════════════════════════════════

const PY_DEF = /^(\s*)(async\s+)?def\s+(\w+)\s*\(([^)]*)\)/;

interface ZenFn {
  isAsync: boolean;
  params: string[];
  /** Masked body, nested functions included. */
  body: string;
}

function zenFnAt(lines: string[], at: number): ZenFn {
  const m = lines[at].match(PY_DEF)!;
  const params = m[4].split(",").map((p) => p.replace(/[:=].*$/, "").replace(/^\*+/, "").trim()).filter(Boolean);
  return { isAsync: !!m[2], params, body: blockAt(lines, at) };
}

/** `def name` or `async def name`, anywhere in the program. */
function zenFn(code: string, name: string): ZenFn | null {
  const lines = maskPy(code).split("\n");
  const at = lines.findIndex((l) => l.match(PY_DEF)?.[3] === name);
  return at === -1 ? null : zenFnAt(lines, at);
}

/** Functions defined inside `f`, and `f`'s own lines with them cut out. */
function zenInner(f: ZenFn): { inner: ZenFn[]; outer: string } {
  const lines = f.body.split("\n");
  const inner: ZenFn[] = [];
  const outer: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!PY_DEF.test(lines[i])) {
      outer.push(lines[i]);
      continue;
    }
    inner.push(zenFnAt(lines, i));
    const base = indentOf(lines[i]);
    let j = i + 1;
    while (j < lines.length && (!lines[j].trim() || indentOf(lines[j]) > base)) j++;
    i = j - 1;
  }
  return { inner, outer: outer.join("\n") };
}

/** The lines of the first block opened by `opener` in `body`, or "". */
function zenClause(body: string, opener: RegExp): string {
  const lines = body.split("\n");
  const at = lines.findIndex((l) => opener.test(l));
  return at === -1 ? "" : blockAt(lines, at);
}

/** Index of the bracket matching the one at `open`, or -1. */
function matchingParen(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if ("([{".includes(s[i])) depth++;
    else if (")]}".includes(s[i]) && --depth === 0) return i;
  }
  return -1;
}

function topLevelComma(inner: string): boolean {
  let depth = 0;
  for (const ch of inner) {
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    else if (ch === "," && depth === 0) return true;
  }
  return false;
}

/** `if (x):`, `return (x)`, `print(("x"))` — a bracket pair that only wraps. */
function redundantParens(code: string): boolean {
  return maskPy(code).split("\n").some((line) => {
    const kw = line.match(/^\s*(if|elif|while|return)\s*(?=\()/);
    if (kw) {
      const open = kw[0].length;
      const close = matchingParen(line, open);
      const rest = line.slice(close + 1).trim();
      return close !== -1 && (rest === ":" || rest === "") && !topLevelComma(line.slice(open + 1, close));
    }
    const call = line.match(/\bprint\s*\(\s*(?=\()/);
    if (!call) return false;
    const inner = call.index! + call[0].length;
    const close = matchingParen(line, inner);
    return close !== -1 && /^\s*\)/.test(line.slice(close + 1)) && !topLevelComma(line.slice(inner + 1, close));
  });
}

/** Names an import line brings in (`import a as b` → b, `from x import y` → y). */
function importedNames(code: string): string[] {
  const names: string[] = [];
  for (const line of maskPy(code).split("\n")) {
    const plain = line.match(/^\s*import\s+(.+)$/);
    const from = line.match(/^\s*from\s+[\w.]+\s+import\s+\(?([^)]+)\)?\s*$/);
    const list = plain?.[1] ?? from?.[1];
    if (!list) continue;
    for (const part of list.split(",")) {
      const p = part.trim();
      if (!p || p === "*") continue;
      const alias = p.match(/\bas\s+(\w+)$/);
      names.push(alias ? alias[1] : p.split(".")[0]);
    }
  }
  return names;
}

const ASYNC_SLEEP = /\basyncio\s*\.\s*sleep\s*\(/;
const BLOCKING_SLEEP = /\btime\s*\.\s*sleep\s*\(|^\s*from\s+time\s+import\b[^\n]*\bsleep\b/m;

/** A `for` loop whose block awaits — one at a time. */
function zenAwaitsInLoop(body: string): boolean {
  const lines = body.split("\n");
  return lines.some((l, i) => /^\s*(async\s+)?for\b/.test(l) && /\bawait\b/.test(blockAt(lines, i)));
}

// ── chapter-07:scaffold ──

const spacesNotTabs: ZenRule = {
  id: "py_spaces_not_tabs",
  principle: "spaces, never tabs",
  isRelevant: (code) => code.trim().length > 0,
  check: (code) => !code.split("\n").some((l) => /^[ ]*\t/.test(l)),
  bonusXP: 3,
  jolt: "spaces, not tabs. pep 8 picks four spaces and python refuses to guess when the two get mixed. this chapter nests functions inside functions — the indentation is about to carry real weight.",
  suggestion: "a line starts with a tab. pep 8 indents with spaces — four per level — and python stops with a TabError if tabs and spaces get mixed. swap the tab for spaces.",
};

// ── chapter-07:scan ──

const nonlocalCounter: ZenRule = {
  id: "py_nonlocal_counter",
  principle: "say nonlocal when a closure changes a name",
  isRelevant: (code) => {
    const f = zenFn(code, "scan_archive");
    return !!f && zenInner(f).inner.length > 0;
  },
  check: (code) => {
    const { inner } = zenInner(zenFn(code, "scan_archive")!);
    return inner.some((g) => /^\s*nonlocal\b/m.test(g.body)) &&
      !inner.some((g) => /^\s*global\b/m.test(g.body) || /\[\s*0\s*\]\s*\+=/.test(g.body));
  },
  bonusXP: 15,
  jolt: "...`nonlocal count`. the inner function says out loud which name it means to change — the one a level up. no one-item list, no global. \"explicit is better than implicit.\" kira writes it the same way. i hate that i noticed.",
  suggestion: "the counter works, but a one-item list or a `global` is the workaround. keep `count = 0` in `scan_archive` and write `nonlocal count` inside `scan` — it says exactly which variable the closure changes.",
};

const finallyLog: ZenRule = {
  id: "py_finally_log",
  principle: "cleanup goes in finally",
  isRelevant: (code) => {
    const f = zenFn(code, "scan_archive");
    return !!f && zenInner(f).inner.some((g) => /\bprint\s*\(/.test(g.body));
  },
  check: (code) => zenInner(zenFn(code, "scan_archive")!).inner.some((g) => /\bprint\s*\(/.test(zenClause(g.body, /^\s*finally\s*:/))),
  bonusXP: 10,
  jolt: "the log sits in `finally`. whatever happens inside the walk — a return, an error — that line still runs on the way out. you wrote the cleanup once, and python guarantees it.",
  suggestion: "printing after the loop works until something inside it fails — then the log never runs. put it in `finally:` and python runs it on the way out, every time.",
};

const endswithCheck: ZenRule = {
  id: "py_endswith",
  principle: "ask the string what it ends with",
  isRelevant: (code) => /\bfor\b/.test(zenFn(code, "scan_archive")?.body ?? ""),
  check: (code) => {
    const body = zenFn(code, "scan_archive")!.body;
    return /\.\s*endswith\s*\(/.test(body) && !/\[\s*-\s*1\s*\]\s*==/.test(body) && !/\[\s*len\s*\(/.test(body);
  },
  bonusXP: 5,
  jolt: "`entry.endswith(\"/\")` — reads like the question you're asking. no counting back from the end, no index to get wrong.",
  suggestion: "`entry[-1] == \"/\"` works, but `entry.endswith(\"/\")` says it in words — and doesn't break on an empty name.",
};

// ── chapter-07:recover ──

const exceptPerCall: ZenRule = {
  id: "py_except_per_call",
  principle: "catch at the boundary of the work",
  isRelevant: (code) => /^\s*except\b/m.test(zenFn(code, "safe_scan")?.body ?? ""),
  check: (code) => {
    const { inner, outer } = zenInner(zenFn(code, "safe_scan")!);
    return inner.some((g) => /^\s*except\b/m.test(g.body)) && !/^\s*except\b/m.test(outer);
  },
  bonusXP: 15,
  jolt: "...each directory catches its own trouble. the vault fails, the vault gets logged, and root never even notices. catch where one unit of work ends — not around the whole job, where one failure costs everything.",
  suggestion: "one `try` around the whole scan means the first bad directory ends it. put the `except` inside `scan`, so each directory is its own boundary and the walk keeps going.",
};

const specificRaise: ZenRule = {
  id: "py_specific_raise",
  principle: "raise a specific exception",
  isRelevant: (code) => /^\s*raise\b/m.test(zenFn(code, "safe_scan")?.body ?? ""),
  check: (code) => !/^\s*raise\s+(Exception|BaseException)\b/m.test(zenFn(code, "safe_scan")!.body),
  bonusXP: 5,
  jolt: "`RuntimeError`, not plain `Exception`. a named error tells whoever catches it what kind of trouble this is — and lets them catch only that.",
  suggestion: "`raise Exception(...)` is the vaguest error there is. pick a specific one — `RuntimeError(\"corrupted directory\")` — so a catcher can tell it apart.",
};

const isNone: ZenRule = {
  id: "py_is_none",
  principle: "`is None`, never `== None`",
  isRelevant: (code) => /\bNone\b/.test(zenFn(code, "safe_scan")?.body ?? ""),
  check: (code) => !/[=!]=\s*None\b|\bNone\s*[=!]=/.test(zenFn(code, "safe_scan")!.body),
  bonusXP: 5,
  jolt: "`is None`. there's exactly one `None`, so you asked whether it's that one. pep 8 asks for exactly this.",
  suggestion: "compare with `is None`, not `== None`. there's only one `None` — pep 8 says check for it by identity.",
};

// ── chapter-08:scaffold ──

const unusedImport: ZenRule = {
  id: "py_unused_import",
  principle: "import what you use, when you use it",
  isRelevant: (code) => importedNames(code).length > 0,
  check: (code) => {
    const body = maskPy(code).split("\n").filter((l) => !/^\s*(import|from)\s/.test(l)).join("\n");
    return importedNames(code).every((n) => new RegExp(`\\b${n}\\b`).test(body));
  },
  bonusXP: 3,
  jolt: "every import gets used. nothing sits at the top waiting for a step that hasn't come yet. when `asyncio` shows up, it'll be because the code needs it.",
  suggestion: "there's an import nothing uses yet. bring it in the step that needs it — an unused import is just noise at the top of the file.",
};

const noSpaceInsideBrackets: ZenRule = {
  id: "py_no_space_inside_brackets",
  principle: "no padding inside brackets",
  isRelevant: (code) => codeTokens(code).some((t) => "([{".includes(t.value)),
  check: (code) => {
    const toks = codeTokens(code);
    return !toks.some((t, i) => {
      const next = toks[i + 1];
      const prev = toks[i - 1];
      const padAfterOpen = "([{".includes(t.value) && t.value.length === 1 && next && next.line === t.line && next.start > t.end;
      const padBeforeClose = ")]}".includes(t.value) && t.value.length === 1 && prev && prev.line === t.line && t.start > prev.end && prev.value !== ",";
      return padAfterOpen || padBeforeClose;
    });
  },
  bonusXP: 3,
  jolt: "`print(\"Hello World\")` — the brackets hug what's inside. pep 8 calls the alternative extraneous whitespace. tight is how python reads.",
  suggestion: "there's a space just inside a bracket — `print( \"Hello World\" )`. pep 8 keeps brackets tight: `print(\"Hello World\")`.",
};

// ── chapter-08:goroutine ──

const taskReference: ZenRule = {
  id: "py_task_reference",
  principle: "keep a reference to every task",
  isRelevant: (code) => /\bcreate_task\s*\(/.test(zenFn(code, "cut_async")?.body ?? ""),
  check: (code) =>
    zenFn(code, "cut_async")!.body.split("\n")
      .filter((l) => /\bcreate_task\s*\(/.test(l))
      .every((l) => /^\s*(return\b|\w+\s*=(?!=))/.test(l)),
  bonusXP: 10,
  jolt: "...you returned the task instead of dropping it. the event loop only holds a weak grip on tasks — the asyncio docs say to keep a reference, or one can vanish halfway. now whoever called you can wait on it, check it, or cancel it.",
  suggestion: "`asyncio.create_task(...)` on a line by itself throws the task away. return it — `return asyncio.create_task(cut(name))` — so the caller can wait on it, and so it can't be lost mid-run.",
};

const asyncioNamespace: ZenRule = {
  id: "py_asyncio_namespace",
  principle: "keep asyncio's names under asyncio",
  isRelevant: (code) => /^\s*(import\s+asyncio\b|from\s+asyncio\s+import)/m.test(maskPy(code)),
  check: (code) => !/^\s*from\s+asyncio\s+import\b/m.test(maskPy(code)),
  bonusXP: 5,
  jolt: "`asyncio.create_task`, `asyncio.sleep` — every async tool wears its module's name. you can see at a glance which lines touch the event loop.",
  suggestion: "`from asyncio import create_task` works, but `import asyncio` and `asyncio.create_task(...)` shows which lines touch the event loop. \"namespaces are one honking great idea.\"",
};

// ── chapter-08:fanout ──

const gatherNotLoop: ZenRule = {
  id: "py_gather_not_loop",
  principle: "start them all, then wait once",
  isRelevant: (code) => zenFn(code, "cut_all") !== null,
  check: (code) => {
    const body = zenFn(code, "cut_all")!.body;
    return /\bgather\s*\(/.test(body) && !zenAwaitsInLoop(body);
  },
  bonusXP: 15,
  jolt: "...`asyncio.gather`. every breaker started before you waited on any of them, and the answers came back in circuit order. no counter of who's still running, no list filled in by hand — the waiting and the results in one call.",
  suggestion: "awaiting each breaker in a loop waits on one before starting the next. hand them all to `asyncio.gather(*(...))` — they run together and the results come back in order.",
};

const gatherIsTheList: ZenRule = {
  id: "py_gather_results",
  principle: "gather is the results list",
  isRelevant: (code) => /\bgather\s*\(/.test(zenFn(code, "cut_all")?.body ?? ""),
  check: (code) => !/\.\s*append\s*\(/.test(zenFn(code, "cut_all")!.body),
  bonusXP: 5,
  jolt: "you returned what `gather` gave you. no empty list, no appends — the results already line up with the circuits.",
  suggestion: "`gather` already hands back a list in the order you passed things in. no need to build one: `return await asyncio.gather(...)`.",
};

// ── chapter-08:window ──

const asyncSleep: ZenRule = {
  id: "py_async_sleep",
  principle: "never block the event loop",
  isRelevant: (code) => /\basync\s+def\b/.test(maskPy(code)) && /\bsleep\s*\(/.test(maskPy(code)),
  check: (code) => ASYNC_SLEEP.test(maskPy(code)) && !BLOCKING_SLEEP.test(maskPy(code)),
  bonusXP: 15,
  jolt: "...`await asyncio.sleep`. each breaker steps aside while it waits, and the other three get their turn. one `time.sleep` in there and the whole loop would have stood still — four breakers, one at a time, alarm.",
  suggestion: "`time.sleep` inside async code freezes the whole event loop — nothing else runs while it waits. use `await asyncio.sleep(seconds)`.",
};

const zipPairs: ZenRule = {
  id: "py_zip_pairs",
  principle: "zip lists that go together",
  isRelevant: (code) => (zenFn(code, "cut_timed")?.params.length ?? 0) === 2,
  check: (code) => {
    const f = zenFn(code, "cut_timed")!;
    const [names, delays] = f.params;
    return /\bzip\s*\(/.test(f.body) && !/\brange\s*\(\s*len\s*\(/.test(f.body) &&
      !new RegExp(`\\b(${names}|${delays})\\s*\\[`).test(f.body);
  },
  bonusXP: 10,
  jolt: "`zip(circuits, delays)` — each name walks in with its own delay. no index, no `delays[i]`, nothing to fall out of step.",
  suggestion: "indexing two lists with `range(len(...))` works, but `zip(circuits, delays)` hands you each pair directly: `for n, d in zip(circuits, delays)`.",
};

// ── chapter-09:scaffold ──

const noExtraParens: ZenRule = {
  id: "py_no_extra_parens",
  principle: "no brackets that only wrap",
  isRelevant: (code) => code.trim().length > 0,
  check: (code) => !redundantParens(code),
  bonusXP: 3,
  jolt: "no brackets doing nothing. `print(\"Hello World\")`, not `print((\"Hello World\"))`; `if ready:`, not `if (ready):`. python's syntax already marks where things start and stop.",
  suggestion: "a pair of brackets is only wrapping — `if (x):` or `print((\"x\"))`. python doesn't need them: `if x:` reads cleaner.",
};

// ── chapter-09:hail ──

const hailPlainDef: ZenRule = {
  id: "py_hail_plain_def",
  principle: "only async what awaits",
  isRelevant: (code) => zenFn(code, "hail") !== null,
  check: (code) => {
    const f = zenFn(code, "hail")!;
    return !f.isAsync && /\bcreate_task\s*\(/.test(zenInner(f).outer);
  },
  bonusXP: 10,
  jolt: "...`hail` is a plain `def`. it never waits, so it isn't async — it starts the call and hands back the task. the waiting lives in `respond`, the only thing that sleeps. one function schedules, one function waits.",
  suggestion: "`hail` never waits on anything itself, so keep it a plain `def` that returns `asyncio.create_task(respond())`. only `respond`, which sleeps, needs `async def`.",
};

const msToSeconds: ZenRule = {
  id: "py_ms_to_seconds",
  principle: "true division for units",
  isRelevant: (code) => /\b1000\b/.test(maskPy(code)) && ASYNC_SLEEP.test(maskPy(code)),
  check: (code) => !/\/\/\s*1000\b/.test(maskPy(code)),
  bonusXP: 5,
  jolt: "`delay_ms / 1000` — one slash, so 100 milliseconds stays 0.1 seconds. asyncio counts in seconds, and you converted at the door.",
  suggestion: "`// 1000` rounds down — `100 // 1000` is 0, and every team answers instantly. `/ 1000` keeps the fraction.",
};

// ── chapter-09:first ──

const cancelLosers: ZenRule = {
  id: "py_cancel_losers",
  principle: "cancel what you stopped waiting for",
  isRelevant: (code) => /\basyncio\s*\.\s*wait\s*\(/.test(zenFn(code, "first_responder")?.body ?? ""),
  check: (code) => /\.\s*cancel\s*\(\s*\)/.test(zenFn(code, "first_responder")!.body),
  bonusXP: 15,
  jolt: "...you cancelled the teams that lost. a task keeps running until it finishes or someone stops it — alpha and charlie would have kept talking into a dead line. you won the race and cleaned up after it.",
  suggestion: "alpha and charlie are still running after bravo wins. cancel what's left: `for t in pending: t.cancel()` — a task you've stopped caring about shouldn't keep working.",
};

const unpackWait: ZenRule = {
  id: "py_unpack_wait",
  principle: "name both halves of the wait",
  isRelevant: (code) => /\basyncio\s*\.\s*wait\s*\(/.test(zenFn(code, "first_responder")?.body ?? ""),
  check: (code) => /\b\w+\s*,\s*\w+\s*=\s*(\(\s*)?await\s+asyncio\s*\.\s*wait\s*\(/.test(zenFn(code, "first_responder")!.body),
  bonusXP: 5,
  jolt: "`done, pending = await asyncio.wait(...)` — two sets, two names, one line. nobody has to remember which half is `[0]`.",
  suggestion: "`asyncio.wait` hands back two sets. unpack them into names: `done, pending = await asyncio.wait(...)`. clearer than `result[0]`.",
};

// ── chapter-09:timeout ──

const sweepPlainDef: ZenRule = {
  id: "py_sweep_plain_def",
  principle: "a function that never waits isn't async",
  isRelevant: (code) => zenFn(code, "sweep") !== null,
  check: (code) => {
    const f = zenFn(code, "sweep")!;
    return !f.isAsync && !/\bawait\b/.test(f.body);
  },
  bonusXP: 15,
  jolt: "...`sweep` is a plain `def`. it can't wait even if it wanted to — it looks at `task.done()` and answers. in python, \"doesn't wait\" and \"isn't async\" are the same promise, and you made it.",
  suggestion: "`sweep` only looks, so make it a plain `def` with `task.done()`. an `async def` can pause — and a quick glance should never be able to.",
};

const timeoutFromParam: ZenRule = {
  id: "py_timeout_from_param",
  principle: "the deadline comes from the caller",
  isRelevant: (code) => /\btimeout\s*=/.test(zenFn(code, "await_contact")?.body ?? ""),
  check: (code) => {
    const f = zenFn(code, "await_contact")!;
    const t = f.body.match(/\btimeout\s*=\s*([^,)\n]+)/)?.[1] ?? "";
    return f.params.length === 4 && new RegExp(`\\b${f.params[3]}\\b`).test(t);
  },
  bonusXP: 10,
  jolt: "`timeout=timeout_ms / 1000` — the deadline comes from whoever's asking. a fixed number would be right once and wrong every other call.",
  suggestion: "the deadline is a number you typed. use the one you were handed: `timeout=timeout_ms / 1000`.",
};

const emptyIsFalsy: ZenRule = {
  id: "py_empty_falsy",
  principle: "an empty set is false",
  isRelevant: (code) => /^\s*if\b/m.test(zenFn(code, "await_contact")?.body ?? ""),
  check: (code) => !/\blen\s*\([^)\n]*\)\s*(==|<=|<|!=|>)\s*[01]\b|==\s*set\s*\(\s*\)/.test(zenFn(code, "await_contact")!.body),
  bonusXP: 5,
  jolt: "`if not done:` — an empty set is already false. pep 8 asks for exactly that over `len(done) == 0`. it reads like the sentence: if nothing's done.",
  suggestion: "`len(done) == 0` works, but an empty set is already false: `if not done:`. pep 8 prefers it.",
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
  "chapter-04:scaffold": [lineLength],
  "chapter-04:guardmap": [dictLiteralRoster, onePairPerLine],
  "chapter-04:clearfloors": [setMembership, dictValues, notIn],
  "chapter-04.2:scaffold": [blankLineLimit],
  "chapter-04.2:reverseword": [sliceReverse, noRangeLen],
  "chapter-04.2:encode": [joinWords, splitWhitespace, comprehensionJoin],
  "chapter-04.2:relayheader": [narrowExcept, smallTry, fStringHeader],
  "chapter-07:scaffold": [spacesNotTabs],
  "chapter-07:scan": [nonlocalCounter, finallyLog, endswithCheck],
  "chapter-07:recover": [exceptPerCall, specificRaise, isNone],
  "chapter-08:scaffold": [unusedImport, noSpaceInsideBrackets],
  "chapter-08:goroutine": [taskReference, asyncioNamespace],
  "chapter-08:fanout": [gatherNotLoop, gatherIsTheList],
  "chapter-08:window": [asyncSleep, zipPairs],
  "chapter-09:scaffold": [noExtraParens],
  "chapter-09:hail": [hailPlainDef, msToSeconds],
  "chapter-09:first": [cancelLosers, unpackWait],
  "chapter-09:timeout": [sweepPlainDef, timeoutFromParam, emptyIsFalsy],
};
