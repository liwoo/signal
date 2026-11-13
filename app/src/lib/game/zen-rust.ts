// ── Rust Zen ──
// Heuristic idiom coaching for the Rust realization of Act I. Same shape as
// Go's rules in ./zen.ts: `check` passing earns the bonus and Maya's memory
// jolt, failing earns a gentle suggestion. Grounded in what rustfmt and clippy
// would say about a beginner's first programs. Pure functions only.

import { tokenize } from "@/lib/rust/tokenizer";
import type { Token } from "@/lib/lang/types";
import type { ZenRule } from "./zen";

// ══════════════════════════════════════════════════════════════
//  Shape helpers
// ══════════════════════════════════════════════════════════════

/**
 * Blank out comments and string contents, keeping every offset and newline in
 * place. Quotes survive, so `println!("{} {}", a, b) // x; y` keeps its shape
 * but no check ever trips on text inside a string or comment.
 */
export function maskRs(code: string): string {
  let out = "";
  let prev = 0;
  for (const t of tokenize(code)) {
    out += code.slice(prev, t.start);
    if (t.type === "comment") {
      out += t.value.replace(/[^\n]/g, " ");
    } else if (t.type === "string") {
      const open = t.value.search(/["']/) + 1;
      const close = t.value.length - Math.max(t.value.lastIndexOf('"'), t.value.lastIndexOf("'"));
      const inner = t.value.slice(open, t.value.length - close).replace(/[^\n]/g, "x");
      out += t.value.slice(0, open) + inner + t.value.slice(t.value.length - close);
    } else {
      out += t.value;
    }
    prev = t.end;
  }
  return out + code.slice(prev);
}

/** Tokens minus comments — the code that actually runs. */
function codeTokens(code: string): Token[] {
  return tokenize(code).filter((t) => t.type !== "comment");
}

/** Masked body (between the braces) of `fn name`, or null when it isn't defined. */
export function fnBody(code: string, name: string): string | null {
  const m = maskRs(code);
  const head = new RegExp(`\\bfn\\s+${name}\\b`).exec(m);
  if (!head) return null;
  const open = m.indexOf("{", head.index);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < m.length; i++) {
    if (m[i] === "{") depth++;
    else if (m[i] === "}" && --depth === 0) return m.slice(open + 1, i);
  }
  return m.slice(open + 1);
}

/** The text between `fn name(` and its `)` — the parameter list. */
function fnParams(code: string, name: string): string | null {
  const m = maskRs(code).match(new RegExp(`\\bfn\\s+${name}\\s*\\(([^)]*)\\)`));
  return m ? m[1] : null;
}

/** Statements of a block, split on `;` (and after a closing `}`) at depth 0, trimmed, empty dropped. */
function statements(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of body) {
    if ("({[".includes(ch)) depth++;
    else if (")}]".includes(ch)) depth--;
    if (ch === ";" && depth === 0) {
      out.push(`${cur.trim()};`);
      cur = "";
    } else {
      cur += ch;
      // a block (`for … { … }`, `if … { … }`) ends its statement at its closing brace
      if (ch === "}" && depth === 0) {
        out.push(cur.trim());
        cur = "";
      }
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter((s) => s !== ";");
}

/** Names of every `fn` the player defined. */
function definedFns(code: string): string[] {
  return [...maskRs(code).matchAll(/\bfn\s+([A-Za-z_]\w*)/g)].map((m) => m[1]);
}

/** Every `name!(...)` macro call: the macro token and the token right after its closing paren. */
function macroCalls(code: string, name: string): { at: Token; after: Token | undefined }[] {
  const toks = codeTokens(code);
  const out: { at: Token; after: Token | undefined }[] = [];
  toks.forEach((t, i) => {
    if (t.value !== `${name}!` || toks[i + 1]?.value !== "(") return;
    let depth = 0;
    for (let j = i + 1; j < toks.length; j++) {
      if (toks[j].value === "(") depth++;
      else if (toks[j].value === ")" && --depth === 0) {
        out.push({ at: t, after: toks[j + 1] });
        return;
      }
    }
    out.push({ at: t, after: undefined });
  });
  return out;
}

const COMPARISONS = new Set(["==", "!=", "<=", ">="]);

// ══════════════════════════════════════════════════════
//  Rules
// ══════════════════════════════════════════════════════

// ── chapter-01:scaffold ──

const braceSameLine: ZenRule = {
  id: "rs_brace_same_line",
  principle: "the brace stays on the line",
  isRelevant: (code) => /\bfn\s+\w+/.test(maskRs(code)),
  check: (code) => !/\)\s*(->[^{\n]*)?\n\s*\{/.test(maskRs(code)),
  bonusXP: 5,
  jolt: "...`fn main() {` — the brace on the same line as the function. that's how rustfmt writes it, and every rust file you'll ever open looks the same because of it. one shape. nobody argues about it.",
  suggestion: "keep the opening brace on the same line as the function: `fn main() {`, not on a line of its own. that's the shape rustfmt gives every rust file.",
};

const fourSpaceIndent: ZenRule = {
  id: "rs_four_space_indent",
  principle: "four spaces per level",
  isRelevant: (code) => maskRs(code).split("\n").some((l) => l.trim() && /^[ \t]/.test(l)),
  check: (code) =>
    maskRs(code).split("\n").every((line) => {
      if (!line.trim()) return true;
      const lead = (line.match(/^[ \t]*/) ?? [""])[0];
      return !lead.includes("\t") && lead.length % 4 === 0;
    }),
  bonusXP: 5,
  jolt: "four spaces inside the braces. rustfmt indents every level by exactly four, so the shape of the code shows you what's inside what before you read a word.",
  suggestion: "indent each level by four spaces — no tabs, no two-space steps. rustfmt settles on four, and every rust file follows it.",
};

// ── chapter-01:location ──

const onePrintln: ZenRule = {
  id: "rs_one_println",
  principle: "one line, one `println!`",
  isRelevant: (code) => /\bprint(ln)?!\s*\(/.test(maskRs(code)),
  check: (code) => macroCalls(code, "print").length === 0,
  bonusXP: 10,
  jolt: "...one `println!` with two `{}` slots. the template reads like the output, and the values drop in where they belong. no stitching a line together from pieces. i used to do that. it never lined up.",
  suggestion: "no need to build the line from several `print!` calls. one `println!` with a `{}` per value does it: `println!(\"CELL {} - SUBLEVEL {}\", cellblock::CELL, cellblock::SUBLEVEL);`.",
};

const modAtTop: ZenRule = {
  id: "rs_mod_at_top",
  principle: "modules declared first, set apart",
  isRelevant: (code) => /^\s*(pub\s+)?mod\s+\w+\s*;/m.test(maskRs(code)),
  check: (code) => {
    const lines = maskRs(code).split("\n");
    const isMod = (l: string) => /^\s*(pub\s+)?(mod|use)\s/.test(l);
    const last = lines.reduce((acc, l, i) => (isMod(l) ? i : acc), -1);
    const before = lines.slice(0, last).every((l) => !l.trim() || isMod(l));
    const next = lines[last + 1];
    return before && (next === undefined || next.trim() === "");
  },
  bonusXP: 5,
  jolt: "`mod cellblock;` up top, then a blank line, then `fn main`. you can see what this file leans on before anything runs. sections that breathe.",
  suggestion: "put `mod cellblock;` at the very top and leave a blank line after it, before `fn main`. what a file depends on comes first, set apart.",
};

const noGlobImport: ZenRule = {
  id: "rs_no_glob_import",
  principle: "say where it came from",
  isRelevant: (code) => /\bcellblock\b/.test(maskRs(code)),
  check: (code) => !/\buse\s+[\w:]*::\*/.test(maskRs(code)),
  bonusXP: 10,
  jolt: "`cellblock::CELL` — the module's name right there in front. anyone reading knows exactly where my cell number came from. a path is a little longer, and it never lies.",
  suggestion: "skip `use cellblock::*` — it pulls every name in and hides where they came from. write the path, `cellblock::CELL`, so the reader knows the source.",
};

// ── chapter-02:scaffold ──

const statementSemicolon: ZenRule = {
  id: "rs_statement_semicolon",
  principle: "statements end with `;`",
  isRelevant: (code) => macroCalls(code, "println").length > 0,
  check: (code) => macroCalls(code, "println").every((c) => c.after?.value === ";"),
  bonusXP: 5,
  jolt: "`println!(\"Hello World\");` — semicolon and all. in rust a `;` turns an expression into a statement: do this, move on. you closed every one.",
  suggestion: "end each `println!(...)` with a `;`. rust lets the last line skip it, but a print is a statement — do it, move on — and rustfmt writes it with the semicolon.",
};

const noTrailingWhitespace: ZenRule = {
  id: "rs_no_trailing_whitespace",
  principle: "no trailing whitespace",
  isRelevant: (code) => code.trim().length > 0,
  check: (code) => !code.split("\n").some((l) => /\S[ \t]+$/.test(l)),
  bonusXP: 3,
  jolt: "clean line endings — nothing hiding after the last character. rustfmt strips those, because invisible spaces turn into noisy diffs later. tidy is a habit. you have it.",
  suggestion: "there are stray spaces at the end of a line. you can't see them, but every diff can. rustfmt would trim them.",
};

// ── chapter-02:loop ──

const inclusiveRange: ZenRule = {
  id: "rs_inclusive_range",
  principle: "say the range you mean",
  isRelevant: (code) => /\d\s*\.\.=?\s*\d/.test(maskRs(code)),
  check: (code) => {
    const m = maskRs(code);
    return /\b1\s*\.\.=\s*10\b/.test(m) && !/"\s*,\s*\w+\s*\+\s*1\s*\)/.test(m);
  },
  bonusXP: 10,
  jolt: "`1..=10` — start where the keypad starts, stop where it stops, and the `=` says 10 is in. no `1..11` riddle, no `i + 1` patching. the numbers you mean are the numbers you wrote.",
  suggestion: "`1..11` works, but `1..=10` says what you mean — one to ten, ten included. no off-by-one arithmetic for the next reader to check.",
};

const forOverWhile: ZenRule = {
  id: "rs_for_over_while",
  principle: "`for` walks a range for you",
  isRelevant: (code) => codeTokens(code).some((t) => t.value === "for" || t.value === "while" || t.value === "loop"),
  check: (code) => {
    const toks = codeTokens(code);
    return toks.some((t) => t.value === "for") && !toks.some((t) => t.value === "while" || t.value === "loop");
  },
  bonusXP: 10,
  jolt: "...`for i in 1..=10`. no counter to set up, no `i += 1` to forget, nothing mutable at all. the range hands you each number and the loop ends itself. that's the rust way to count.",
  suggestion: "a `while` with a counter works, but `for i in 1..=10 { ... }` does the counting for you — no `let mut i`, no `i += 1` to forget.",
};

// ── chapter-02:classify ──

const noParenCondition: ZenRule = {
  id: "rs_no_paren_condition",
  principle: "conditions without brackets",
  isRelevant: (code) => codeTokens(code).some((t) => t.value === "if" || t.value === "while"),
  check: (code) => !/\b(?:if|while)\s*\([^{}\n]*\)\s*\{/.test(maskRs(code)),
  bonusXP: 5,
  jolt: "`if i <= 3 {` — no brackets around the condition. rust doesn't need them, and the compiler would have warned you if you'd added them. the braces already say where it ends.",
  suggestion: "drop the brackets around the condition: `if i <= 3 {`, not `if (i <= 3) {`. rust doesn't use them — the compiler even warns about it.",
};

const elseIfChain: ZenRule = {
  id: "rs_else_if_chain",
  principle: "one flat `else if` ladder",
  isRelevant: (code) => codeTokens(code).filter((t) => t.value === "if").length >= 2,
  check: (code) => {
    const m = maskRs(code);
    return /\belse\s+if\b/.test(m) && !/\belse\s*\{\s*if\b/.test(m);
  },
  bonusXP: 15,
  jolt: "...a flat `if` / `else if` / `else` ladder. one decision, read top to bottom, first true branch wins. nothing buried inside an `else`. flat code is code you can trust at a glance.",
  suggestion: "chain the conditions with `else if` instead of separate `if`s or an `if` buried inside `else { }`. one ladder, first true branch wins.",
};

const operatorSpacing: ZenRule = {
  id: "rs_operator_spacing",
  principle: "space around comparisons",
  isRelevant: (code) => codeTokens(code).some((t) => t.type === "operator" && COMPARISONS.has(t.value)),
  check: (code) =>
    codeTokens(code).every((t) => {
      if (t.type !== "operator" || !COMPARISONS.has(t.value)) return true;
      return /[ \t]/.test(code[t.start - 1] ?? "") && /[ \t]/.test(code[t.end] ?? "");
    }),
  bonusXP: 5,
  jolt: "`i <= 3` — a space on each side of the comparison. rustfmt writes it that way so every condition reads like a sentence. you did it without thinking.",
  suggestion: "put a space on each side of a comparison: `i <= 3`, not `i<=3`. rustfmt would — it makes every condition easier to scan.",
};

// ── chapter-02:rewrite ──

const matchIsExpression: ZenRule = {
  id: "rs_match_expression",
  principle: "`match` hands back a value",
  isRelevant: (code) => codeTokens(code).some((t) => t.value === "match"),
  check: (code) => !/=>\s*\{?\s*print(ln)?!/.test(maskRs(code)),
  bonusXP: 15,
  jolt: "...`let level = match i { ... };` — the match decides, then one `println!` prints. a match is an expression: it gives a value back. the decision and the output stay apart, so either can change alone.",
  suggestion: "a match can hand back a value: `let level = match i { 1..=3 => \"DENY\", ... };`, then print once with `println!(\"{} {}\", i, level);`. no `println!` repeated in every arm.",
};

const rangePatterns: ZenRule = {
  id: "rs_range_patterns",
  principle: "ranges in patterns",
  isRelevant: (code) => codeTokens(code).some((t) => t.value === "match"),
  check: (code) => {
    const m = maskRs(code);
    return /\d\s*\.\.=\s*\d+\s*=>/.test(m) && !/\b\d+\s*\|\s*\d+/.test(m) && !/\bif\s+\w+\s*[<>]=?/.test(m.slice(m.indexOf("match")));
  },
  bonusXP: 10,
  jolt: "`1..=3 =>` — a whole range in one arm. no `1 | 2 | 3`, no `if` guard. the pattern says exactly which codes land there, and the compiler checks you covered them all.",
  suggestion: "match a whole range in one arm: `1..=3 => \"DENY\",` instead of listing `1 | 2 | 3` or adding `if` guards. the pattern says it plainly.",
};

// ── chapter-03:scaffold ──

const commentSpace: ZenRule = {
  id: "rs_comment_space",
  principle: "comments start with `// `",
  isRelevant: (code) => tokenize(code).some((t) => t.type === "comment" && t.value.startsWith("//")),
  check: (code) =>
    tokenize(code).every((t) => t.type !== "comment" || !t.value.startsWith("//") || /^\/\/(\/|!)?( |$)/.test(t.value)),
  bonusXP: 3,
  jolt: "`// ` — slashes, a space, then words. it reads like a note in a margin. i left notes like that all over my thesis code.",
  suggestion: "start comments with the slashes and a space: `// like this`, not `//like this`. it keeps notes readable.",
};

const singleBlankLines: ZenRule = {
  id: "rs_single_blank_lines",
  principle: "one blank line is enough",
  isRelevant: (code) => code.trim().length > 0,
  check: (code) => !/\n[ \t]*\n[ \t]*\n/.test(code.trim()),
  bonusXP: 3,
  jolt: "never more than one blank line in a row. rustfmt collapses the rest anyway — space separates ideas, it doesn't pad them.",
  suggestion: "one blank line between things is enough — rustfmt squeezes two or more down to one.",
};

// ── chapter-03:sumfunc ──

const iterSum: ZenRule = {
  id: "rs_iter_sum",
  principle: "let the iterator add it up",
  isRelevant: (code) => fnBody(code, "sum_codes") !== null,
  check: (code) => /\.iter\(\)(\.copied\(\)|\.cloned\(\))?\.sum\b/.test(fnBody(code, "sum_codes") ?? ""),
  bonusXP: 10,
  jolt: "...`codes.iter().sum()`. the loop is already written for you — walk the slice, add each value, hand back the total. no counter, no `mut`. rust's iterators do the busywork.",
  suggestion: "the loop is worth knowing — but rust ships it already built: `codes.iter().sum()`. one line, nothing mutable, nothing to forget.",
};

const tailExpression: ZenRule = {
  id: "rs_tail_expression",
  principle: "the last expression is the answer",
  isRelevant: (code) => fnBody(code, "sum_codes") !== null,
  check: (code) => {
    const stmts = statements(fnBody(code, "sum_codes") ?? "");
    const last = stmts[stmts.length - 1] ?? "";
    return !/^return\b/.test(last);
  },
  bonusXP: 10,
  jolt: "`total` on its own line, no `return`, no semicolon. in rust a block's last expression is its value. you let the function end on its answer.",
  suggestion: "no need for `return total;` at the end — write `total` with no semicolon. the last expression in a rust function is what it hands back.",
};

const needlessMut: ZenRule = {
  id: "rs_needless_mut",
  principle: "`mut` only when it changes",
  isRelevant: (code) => /\blet\s+mut\s+\w+/.test(maskRs(code)),
  check: (code) => {
    const m = maskRs(code);
    return [...m.matchAll(/\blet\s+mut\s+(\w+)/g)].every((d) => {
      const name = d[1];
      const after = m.slice((d.index ?? 0) + d[0].length);
      return new RegExp(`(^|[^\\w.])${name}\\s*([-+*/%]?=(?!=)|\\.\\w+\\s*\\()|&mut\\s+${name}\\b`).test(after);
    });
  },
  bonusXP: 5,
  jolt: "`let mut total` — and `total` really does change. rust makes you say `mut` out loud, so a reader knows exactly which values move. you only said it where it's true.",
  suggestion: "a `let mut` that never changes should just be `let`. in rust everything is frozen by default — `mut` is a promise that this value moves.",
};

// ── chapter-03:validate ──

const directBool: ZenRule = {
  id: "rs_direct_bool",
  principle: "the comparison is the bool",
  isRelevant: (code) => fnBody(code, "validate_code") !== null,
  check: (code) => !/\b(true|false)\b/.test(fnBody(code, "validate_code") ?? ""),
  bonusXP: 15,
  jolt: "...`(total, total > 100)`. the comparison already is a `bool` — you handed it straight back. no `if` just to say `true` or `false`. the tuple says how much and whether it's enough, in one line.",
  suggestion: "skip the `if ... { (total, true) } else { (total, false) }`. a comparison already is a `bool`: end with `(total, total > 100)`.",
};

const reuseSum: ZenRule = {
  id: "rs_reuse_sum",
  principle: "build on what you wrote",
  isRelevant: (code) => fnBody(code, "validate_code") !== null,
  check: (code) => /\bsum_codes\s*\(/.test(fnBody(code, "validate_code") ?? ""),
  bonusXP: 10,
  jolt: "`let total = sum_codes(codes);` — you reused the function you'd already written and passed the slice straight through. one place does the adding. fix it there, it's fixed everywhere.",
  suggestion: "you already wrote the adding — reuse it: `let total = sum_codes(codes);`. the slice passes straight through.",
};

const borrowSlice: ZenRule = {
  id: "rs_borrow_slice",
  principle: "borrow a slice, don't take a vec",
  isRelevant: (code) => fnParams(code, "validate_code") !== null,
  check: (code) =>
    ["sum_codes", "validate_code"].every((name) => {
      const params = fnParams(code, name);
      return params === null || (/&\s*\[/.test(params) && !/\bVec\s*</.test(params));
    }),
  bonusXP: 10,
  jolt: "`codes: &[i32]` — a borrowed slice. your functions read the numbers without owning them, so they take an array, a vec, or part of either. borrow what you only need to look at.",
  suggestion: "take `codes: &[i32]` rather than a `Vec<i32>`. a borrowed slice works with arrays, vecs, and parts of both — and the caller keeps what's theirs.",
};

const snakeCase: ZenRule = {
  id: "rs_snake_case",
  principle: "functions in snake_case",
  isRelevant: (code) => definedFns(code).some((n) => n !== "main"),
  check: (code) => definedFns(code).every((n) => /^[a-z_][a-z0-9_]*$/.test(n)),
  bonusXP: 5,
  jolt: "`sum_codes`, `validate_code` — lowercase words joined by underscores. that's how rust names functions, and the compiler nags anyone who doesn't. yours read like everyone else's.",
  suggestion: "rust names functions in snake_case: `validate_code`, not `validateCode`. the compiler will warn about it otherwise.",
};

// ── Registry ──

export const RUST_ZEN_RULES: Record<string, ZenRule[]> = {
  "chapter-01:scaffold": [braceSameLine, fourSpaceIndent],
  "chapter-01:location": [onePrintln, modAtTop, noGlobImport],
  "chapter-02:scaffold": [statementSemicolon, noTrailingWhitespace],
  "chapter-02:loop": [inclusiveRange, forOverWhile],
  "chapter-02:classify": [elseIfChain, noParenCondition, operatorSpacing],
  "chapter-02:rewrite": [matchIsExpression, rangePatterns],
  "chapter-03:scaffold": [commentSpace, singleBlankLines],
  "chapter-03:sumfunc": [iterSum, tailExpression, needlessMut],
  "chapter-03:validate": [directBool, reuseSum, borrowSlice, snakeCase],
};
