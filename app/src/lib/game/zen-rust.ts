// ── Rust Zen ──
// Heuristic idiom coaching for the Rust realization (Acts I–III). Same shape as
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

const CLOSERS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

/** Index of the bracket that closes the one at `open` (in masked code), or the end of the text. */
function closeOf(m: string, open: number): number {
  const opener = m[open];
  const closer = CLOSERS[opener];
  let depth = 0;
  for (let i = open; i < m.length; i++) {
    if (m[i] === opener) depth++;
    else if (m[i] === closer && --depth === 0) return i;
  }
  return m.length;
}

/** For every match of `head` (which must end on an opening bracket), the [open, close] span it opens. */
function spansAfter(m: string, head: RegExp): [number, number][] {
  const re = new RegExp(head.source, head.flags.includes("g") ? head.flags : `${head.flags}g`);
  return [...m.matchAll(re)].map((x) => {
    const open = (x.index ?? 0) + x[0].length - 1;
    return [open, closeOf(m, open)];
  });
}

/** Masked code with the body of `fn name` blanked, so a rule can look at everything else. */
function withoutFn(code: string, name: string): string {
  const m = maskRs(code);
  const head = new RegExp(`\\bfn\\s+${name}\\b`).exec(m);
  if (!head) return m;
  const open = m.indexOf("{", head.index);
  if (open === -1) return m;
  const close = closeOf(m, open);
  return m.slice(0, open + 1) + m.slice(open + 1, close).replace(/[^\n]/g, " ") + m.slice(close);
}

/** The names a file's `use` lines bring into scope (`self` counts as its module). */
function usedNames(m: string): { name: string; at: number; end: number }[] {
  const out: { name: string; at: number; end: number }[] = [];
  for (const u of m.matchAll(/^\s*use\s+([^;]+);/gm)) {
    const at = u.index ?? 0;
    const end = at + u[0].length;
    const path = u[1].replace(/\s+/g, "");
    const brace = path.match(/^(.*?)::\{(.*)\}$/);
    const leaves = brace ? brace[2].split(",").filter(Boolean) : [path];
    const parent = (brace ? brace[1] : "").split("::").pop() ?? "";
    for (const leaf of leaves) {
      if (leaf.endsWith("*")) continue;
      const alias = leaf.match(/\bas([A-Za-z_]\w*)$/);
      const name = alias ? alias[1] : leaf === "self" ? parent : leaf.split("::").pop() ?? "";
      if (name && name !== "_") out.push({ name, at, end });
    }
  }
  return out;
}

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

// ══════════════════════════════════════════════════════
//  Act II
// ══════════════════════════════════════════════════════

// ── chapter-04:scaffold ──

const lineWidth: ZenRule = {
  id: "rs_line_width",
  principle: "lines that fit in 100 columns",
  isRelevant: (code) => code.trim().length > 0,
  check: (code) => code.split("\n").every((l) => l.length <= 100),
  bonusXP: 3,
  jolt: "every line fits in a hundred columns. that's rustfmt's limit — past it, it breaks the line for you. code you can read without scrolling sideways is code you actually read.",
  suggestion: "a line runs past 100 characters. rustfmt wraps anything longer — break it inside its brackets, one argument per line.",
};

// ── chapter-04:guardmap ──

const hashmapFrom: ZenRule = {
  id: "rs_hashmap_from",
  principle: "build the map in one expression",
  isRelevant: (code) => fnBody(code, "build_roster") !== null,
  check: (code) => {
    const body = fnBody(code, "build_roster") ?? "";
    return /\bHashMap::from\s*\(|\.collect\b/.test(body) && !/\.insert\s*\(/.test(body);
  },
  bonusXP: 10,
  jolt: "...`HashMap::from([...])`. the whole roster in one expression — no empty map, no `mut`, no five `insert` calls. the code looks like the schedule it holds. i built lookup tables like that for my cipher. data you can read at a glance.",
  suggestion: "no need for `HashMap::new()`, a `mut`, and five `insert` calls. build it in one expression: `HashMap::from([(\"Chen\", \"Floor 1\"), ...])` — one tuple per guard, and nothing has to change after.",
};

const onePairPerLine: ZenRule = {
  id: "rs_one_pair_per_line",
  principle: "one pair per line, trailing comma",
  isRelevant: (code) => /\bHashMap::from\s*\(\s*\[/.test(fnBody(code, "build_roster") ?? ""),
  check: (code) => {
    const body = fnBody(code, "build_roster") ?? "";
    const [span] = spansAfter(body, /\bHashMap::from\s*\(\s*\[/);
    if (!span) return false;
    const inner = body.slice(span[0] + 1, span[1]);
    const lines = inner.split("\n").map((l) => l.trim()).filter(Boolean);
    return /\n\s*$/.test(inner) && lines.length > 0 && lines.every((l) => /^\([^()]*\),$/.test(l));
  },
  bonusXP: 5,
  jolt: "one guard per line, a comma after every pair — the last one too — and the `])` on a line of its own. exactly how rustfmt lays it out. the next guard is a one-line change, and the diff shows only that line.",
  suggestion: "give each pair its own line and end every one with a comma, the last included, with `])` on its own line. that's rustfmt's shape — adding a guard then touches one line.",
};

// ── chapter-04:clearfloors ──

const mapValues: ZenRule = {
  id: "rs_map_values",
  principle: "ask for the values you need",
  isRelevant: (code) => fnBody(code, "find_clear_floor") !== null,
  check: (code) => /\.values\s*\(\)/.test(fnBody(code, "find_clear_floor") ?? ""),
  bonusXP: 10,
  jolt: "`guards.values()` — just the floors, none of the names. you asked the map for exactly what you needed. no pairs to pull apart, nothing thrown away with `_`.",
  suggestion: "you only need the floors, not the names. `guards.values()` hands them straight over — no `for (_, floor) in guards` to unpack.",
};

const collectSet: ZenRule = {
  id: "rs_collect_set",
  principle: "collect straight into the set",
  isRelevant: (code) => /\bHashSet\b/.test(fnBody(code, "find_clear_floor") ?? ""),
  check: (code) => {
    const body = fnBody(code, "find_clear_floor") ?? "";
    return /\.collect\b|\bfrom_iter\b/.test(body) && !/\.insert\s*\(/.test(body);
  },
  bonusXP: 10,
  jolt: "...`let occupied: HashSet<&str> = guards.values().copied().collect();` — you named the type and `collect` built it. no empty set, no `mut`, no insert loop. the type on the left does the work.",
  suggestion: "skip the `HashSet::new()` and the insert loop. name the type and collect into it: `let occupied: HashSet<&str> = guards.values().copied().collect();`.",
};

const boolComparison: ZenRule = {
  id: "rs_bool_comparison",
  principle: "a bool is already the answer",
  isRelevant: (code) => /\.contains\s*\(/.test(fnBody(code, "find_clear_floor") ?? ""),
  check: (code) => !/(==|!=)\s*(true|false)\b|\b(true|false)\s*(==|!=)/.test(fnBody(code, "find_clear_floor") ?? ""),
  bonusXP: 5,
  jolt: "`if !occupied.contains(...)` — the `!` in front, no `== false` trailing behind. `contains` already hands back a `bool`; you used it as one. clippy would have nothing to say.",
  suggestion: "no need for `== false` — `contains` already gives a `bool`. write `if !occupied.contains(name.as_str())`. clippy flags the comparison.",
};

// ── chapter-04.2:scaffold ──

const printLiteral: ZenRule = {
  id: "rs_print_literal",
  principle: "the text goes in the template",
  isRelevant: (code) => macroCalls(code, "println").length + macroCalls(code, "print").length > 0,
  check: (code) => {
    const toks = codeTokens(code);
    return !toks.some((t, i) => {
      if (t.type !== "string" || toks[i - 1]?.value !== ",") return false;
      // a literal argument right after the format string: `println!("{}", "x")`
      for (let j = i - 2, depth = 0; j >= 0; j--) {
        const v = toks[j].value;
        if (v === ")") depth++;
        else if (v === "(" && depth-- === 0) return /^print(ln)?!$/.test(toks[j - 1]?.value ?? "");
      }
      return false;
    });
  },
  bonusXP: 3,
  jolt: "`println!(\"Hello World\")` — the words right in the template. nothing passed through a `{}` that didn't need to be. clippy calls that a print literal and asks you not to. you didn't.",
  suggestion: "no need for `println!(\"{}\", \"Hello World\")` — put the text straight in the template: `println!(\"Hello World\");`. a `{}` is for values that change.",
};

// ── chapter-04.2:reverseword ──

const charsRev: ZenRule = {
  id: "rs_chars_rev",
  principle: "walk characters, never bytes",
  isRelevant: (code) => fnBody(code, "reverse_word") !== null,
  check: (code) => {
    const body = fnBody(code, "reverse_word") ?? "";
    return /\.chars\s*\(\)\s*\.rev\s*\(\)/.test(body) && !/\b(as_)?bytes\s*\(\)/.test(body);
  },
  bonusXP: 10,
  jolt: "...`s.chars().rev()`. whole characters, walked from the end. rust strings are utf-8 — flip the bytes and an `é` breaks in half. my thesis had a test file full of accents just to catch that bug.",
  suggestion: "walk characters, not bytes or indexes: `s.chars().rev()`. a rust string is utf-8, so one letter can take several bytes — `chars()` keeps each one whole.",
};

const collectString: ZenRule = {
  id: "rs_collect_string",
  principle: "collect, don't push",
  isRelevant: (code) => fnBody(code, "reverse_word") !== null,
  check: (code) => {
    const body = fnBody(code, "reverse_word") ?? "";
    return /\.collect\b/.test(body) && !/\.(push|push_str|insert)\s*\(/.test(body);
  },
  bonusXP: 10,
  jolt: "`.collect()` with no semicolon — the reversed characters gathered straight into the `String` your signature promised. no `mut`, no push loop. one chain, one answer.",
  suggestion: "a `String::new()` and a push loop works, but the chain can end itself: `s.chars().rev().collect()`. the `-> String` return type tells `collect` what to build.",
};

// ── chapter-04.2:encode ──

const splitWhitespace: ZenRule = {
  id: "rs_split_whitespace",
  principle: "split on any run of spaces",
  isRelevant: (code) => fnBody(code, "encode") !== null,
  check: (code) => {
    const body = fnBody(code, "encode") ?? "";
    return /\.split_whitespace\s*\(\)/.test(body) && !/\.split\s*\(/.test(body);
  },
  bonusXP: 10,
  jolt: "`msg.split_whitespace()` — any run of spaces is one gap, and no empty words sneak through. a doubled space in a relay message won't scramble the cipher.",
  suggestion: "`split(' ')` hands back an empty word wherever two spaces meet. `msg.split_whitespace()` treats any run of spaces as one gap.",
};

const joinWords: ZenRule = {
  id: "rs_join_words",
  principle: "join, don't glue",
  isRelevant: (code) => fnBody(code, "encode") !== null,
  check: (code) => {
    const body = fnBody(code, "encode") ?? "";
    return /\.join\s*\(/.test(body) && !/\.push_str\s*\(|\+=|\.trim(_end)?\s*\(\)/.test(body);
  },
  bonusXP: 10,
  jolt: "`.join(\" \")` — spaces only between the words, never a stray one on the end to trim off. you described the result instead of building it a piece at a time.",
  suggestion: "skip the `push_str` loop and the trim. collect the words and `.join(\" \")` them — the space only goes between.",
};

const mapByName: ZenRule = {
  id: "rs_map_by_name",
  principle: "hand the function over by name",
  isRelevant: (code) => /\.map\s*\(/.test(fnBody(code, "encode") ?? ""),
  check: (code) => /\.map\s*\(\s*reverse_word\s*\)/.test(fnBody(code, "encode") ?? ""),
  bonusXP: 10,
  jolt: "...`.map(reverse_word)`. you passed the function itself — no `|w| reverse_word(w)` wrapper around it. a function is a value in rust. and the reversal lives in one place, so fixing it fixes the cipher.",
  suggestion: "you already wrote `reverse_word` — hand it to `map` by name: `.map(reverse_word)`. no closure needed just to call it, and clippy flags `|w| reverse_word(w)` as redundant.",
};

// ── chapter-04.2:relayheader ──

const noUnwrapParse: ZenRule = {
  id: "rs_no_unwrap_parse",
  principle: "look inside the result",
  isRelevant: (code) => /\bparse\b/.test(fnBody(code, "relay_header") ?? ""),
  check: (code) => !/\.(unwrap|expect)\s*\(/.test(fnBody(code, "relay_header") ?? ""),
  bonusXP: 15,
  jolt: "...`match code.parse::<i32>() { Ok(n) => ..., Err(_) => ... }`. you opened the result and handled both sides. no `unwrap` promising the input is clean. bad input is just another case — the relay stays up.",
  suggestion: "`.unwrap()` means \"this can't fail\" — and on \"abc\" it panics and the relay goes down. match on it instead: `match code.parse::<i32>() { Ok(n) => ..., Err(_) => ... }`.",
};

const formatHeader: ZenRule = {
  id: "rs_format_header",
  principle: "`format!` for the header",
  isRelevant: (code) => fnBody(code, "relay_header") !== null,
  check: (code) => {
    const body = fnBody(code, "relay_header") ?? "";
    return /\bformat!/.test(body) && !/\+\s*&|\.push_str\s*\(/.test(body);
  },
  bonusXP: 5,
  jolt: "`format!(\"F{}-C{}\", floor, n * 2)` — the template reads like the header itself. no `to_string()` and `+ &` stitched together. you can see the shape of the output in the code.",
  suggestion: "gluing with `+ &` and `to_string()` works, but `format!` reads like the header: `format!(\"F{}-C{}\", floor, n * 2)`.",
};

// ══════════════════════════════════════════════════════
//  Act III
// ══════════════════════════════════════════════════════

// ── chapter-07:scaffold ──

const printlnNewline: ZenRule = {
  id: "rs_println_newline",
  principle: "`println!` ends the line for you",
  isRelevant: (code) => macroCalls(code, "println").length + macroCalls(code, "print").length > 0,
  check: (code) => {
    const toks = codeTokens(code);
    return !toks.some((t, i) => t.value === "print!" && toks[i + 1]?.value === "(" && /\\n"$/.test(toks[i + 2]?.value ?? ""));
  },
  bonusXP: 3,
  jolt: "`println!` — the `ln` ends the line, so no `\\n` tacked on the end of your text. clippy has a lint for exactly that habit. you skipped it.",
  suggestion: "no need for `print!(\"Hello World\\n\")` — `println!(\"Hello World\");` adds the newline itself. clippy flags the hand-written one.",
};

// ── chapter-07:scan ──

const namedDropGuard: ZenRule = {
  id: "rs_named_drop_guard",
  principle: "name the guard so it lives",
  isRelevant: (code) => /\bimpl\s+Drop\s+for\s+\w+/.test(maskRs(code)),
  check: (code) => {
    const m = maskRs(code);
    const guard = m.match(/\bimpl\s+Drop\s+for\s+(\w+)/)?.[1] ?? "";
    const binds = [...m.matchAll(new RegExp(`\\blet\\s+(\\w+)\\s*=\\s*${guard}\\s*[({]`, "g"))].map((x) => x[1]);
    return binds.length > 0 && binds.every((n) => n.startsWith("_") && n.length > 1);
  },
  bonusXP: 10,
  jolt: "...`let _log = Log(...)`. the underscore tells the compiler you won't touch it, and the name keeps it alive to the end of the call. `let _ =` would drop it on the spot. a guard that runs on every way out — however `scan` ends.",
  suggestion: "bind the guard to an underscored name: `let _log = Log(dir.to_string());`. a plain `log` the code never reads draws an unused-variable warning, and a bare `let _ =` drops it at once — the log line would print first, not last.",
};

const stripSuffix: ZenRule = {
  id: "rs_strip_suffix",
  principle: "ask and trim in one go",
  isRelevant: (code) => fnBody(code, "scan") !== null,
  check: (code) => {
    const body = fnBody(code, "scan") ?? "";
    return /\.strip_suffix\s*\(/.test(body) && !/\.len\s*\(\)\s*-\s*1/.test(body);
  },
  bonusXP: 10,
  jolt: "`if let Some(sub) = entry.strip_suffix('/')` — one call answers \"is it a directory\" and hands you the name without the slash. no `ends_with` then slicing by hand. the check and the trim can't disagree.",
  suggestion: "skip `ends_with('/')` plus `&entry[..entry.len() - 1]`. `entry.strip_suffix('/')` does both: `Some(name)` for a directory, `None` for a file — `if let Some(sub) = ...`.",
};

// ── chapter-07:recover ──

/** Masked bodies of every fn whose signature returns a `Result`. */
function resultFnBodies(code: string): string[] {
  const names = [...maskRs(code).matchAll(/\bfn\s+(\w+)[^{;]*->\s*Result\s*</g)].map((x) => x[1]);
  return names.map((n) => fnBody(code, n) ?? "");
}

const questionMark: ZenRule = {
  id: "rs_question_mark",
  principle: "`?` passes the error up",
  isRelevant: (code) => resultFnBodies(code).length > 0,
  check: (code) => resultFnBodies(code).some((b) => b.includes("?")),
  bonusXP: 15,
  jolt: "...`.ok_or(\"corrupted directory\")?`. one character says: if this failed, hand the error back and stop here. no `match` with a `return Err` in it. errors are values — `?` just moves them along.",
  suggestion: "no need to `match` and `return Err(...)` by hand. turn the option into a result and let `?` pass the error up: `let entries = archive[dir].as_ref().ok_or(\"corrupted directory\")?;`.",
};

const errorsNotPanics: ZenRule = {
  id: "rs_errors_not_panics",
  principle: "bad data is an error, not a panic",
  isRelevant: (code) => /\bResult\s*</.test(maskRs(code)),
  check: (code) => !/\bpanic!|\bcatch_unwind\b|\.unwrap\s*\(\)|\.expect\s*\(/.test(withoutFn(code, "main")),
  bonusXP: 10,
  jolt: "no `panic!`, no `unwrap` — a corrupted directory comes back as an `Err`, like any other answer. in rust a panic means a bug. bad data isn't a bug. it's tuesday.",
  suggestion: "a corrupted directory is bad data, not a bug — so no `panic!`, `unwrap` or `catch_unwind`. return `Err(...)` and handle it where you walk in: `if let Err(e) = walk(...) { ... }`.",
};

// ── chapter-08:scaffold ──

const noUnusedUse: ZenRule = {
  id: "rs_no_unused_use",
  principle: "`use` what you use, when you use it",
  isRelevant: (code) => code.trim().length > 0,
  check: (code) => {
    const m = maskRs(code);
    return usedNames(m).every(({ name, at, end }) => new RegExp(`\\b${name}\\b`).test(m.slice(0, at) + m.slice(end)));
  },
  bonusXP: 3,
  jolt: "no `use` line waiting around for later. you bring a path in the step that needs it, so the top of the file only lists what the program really leans on.",
  suggestion: "there's a `use` line nothing touches yet — the compiler warns about it. bring it in the step that needs it.",
};

// ── chapter-08:goroutine ──

const reuseCut: ZenRule = {
  id: "rs_reuse_cut",
  principle: "the thread runs what you already wrote",
  isRelevant: (code) => fnBody(code, "cut_async") !== null,
  check: (code) => {
    const body = fnBody(code, "cut_async") ?? "";
    return /\bcut\s*\(/.test(body) && !/\bprint(ln)?!/.test(body);
  },
  bonusXP: 10,
  jolt: "`thread::spawn(move || cut(&name))` — the new thread runs the `cut` you'd already written. the breaker logic lives in one place; `cut_async` only decides where it runs.",
  suggestion: "don't copy the `println!` into `cut_async` — call the function you wrote: `thread::spawn(move || cut(&name));`. one place prints the line.",
};

const threadModulePath: ZenRule = {
  id: "rs_thread_module_path",
  principle: "call through the module",
  isRelevant: (code) => /\bspawn\s*\(/.test(maskRs(code)),
  check: (code) => {
    const m = maskRs(code);
    return /\bthread::spawn\s*\(/.test(m) && !/\buse\s+std::thread::(\*|spawn\b|\{[^}]*\bspawn\b)/.test(m);
  },
  bonusXP: 5,
  jolt: "`use std::thread;` and then `thread::spawn(...)`. bring the module in, call through it — that's how the rust book does functions. anyone skimming sees `thread::` and knows this line starts something new.",
  suggestion: "bring in the module, not the function: `use std::thread;` then `thread::spawn(...)`. a bare `spawn(...)` hides that a new thread starts here.",
};

// ── chapter-08:fanout ──

/** Bodies of every loop and every `.map(…)`/`.for_each(…)` closure in masked code. */
function loopBodies(m: string): string[] {
  return [
    ...spansAfter(m, /\b(?:for|while|loop)\b[^{;]*\{/),
    ...spansAfter(m, /\.(?:map|for_each)\s*\(/),
  ].map(([a, b]) => m.slice(a + 1, b));
}

/** True when a `spawn(…)` is joined straight away — `spawn(…).join()`. */
function joinsOnSpawn(m: string): boolean {
  return spansAfter(m, /\bspawn\s*\(/).some(([, close]) => /^\s*\.join\s*\(/.test(m.slice(close + 1)));
}

const spawnAllThenJoin: ZenRule = {
  id: "rs_spawn_all_then_join",
  principle: "start them all, then wait",
  isRelevant: (code) => /\bspawn\s*\(/.test(fnBody(code, "cut_all") ?? ""),
  check: (code) => {
    const body = fnBody(code, "cut_all") ?? "";
    return !joinsOnSpawn(body) && !loopBodies(body).some((b) => /\bspawn\s*\(/.test(b) && /\.join\s*\(\)/.test(b));
  },
  bonusXP: 15,
  jolt: "...every thread spawned in one loop, every `join` after it. all four breakers running at once, then you wait. join inside the spawning loop and they'd go one at a time — threads that never overlap.",
  suggestion: "don't `join` inside the loop that spawns — that waits for each thread before starting the next. keep the handles in a `Vec`, and join them only after the loop.",
};

const joinCollect: ZenRule = {
  id: "rs_join_collect",
  principle: "joining is the results list",
  isRelevant: (code) => /\.join\s*\(\)/.test(fnBody(code, "cut_all") ?? ""),
  check: (code) => {
    const body = fnBody(code, "cut_all") ?? "";
    return /\.map\s*\(\s*(move\s*)?\|[^|]*\|[^;]*\.join\s*\(\)/.test(body) && /\.collect\b/.test(body);
  },
  bonusXP: 10,
  jolt: "`handles.into_iter().map(|h| h.join().unwrap()).collect()` — one line waits for every thread and builds the results, in circuit order. no second `Vec` to push into.",
  suggestion: "no need for a results `Vec` and a push loop. the handles already make the list: `handles.into_iter().map(|h| h.join().unwrap()).collect()`.",
};

// ── chapter-08:window ──

const sleepInThread: ZenRule = {
  id: "rs_sleep_in_thread",
  principle: "each thread waits on its own",
  isRelevant: (code) => /\bsleep\s*\(/.test(fnBody(code, "cut_timed") ?? ""),
  check: (code) => {
    const body = fnBody(code, "cut_timed") ?? "";
    const spans = spansAfter(body, /\bspawn\s*\(/);
    return [...body.matchAll(/\bsleep\s*\(/g)].every((s) => spans.some(([a, b]) => (s.index ?? 0) > a && (s.index ?? 0) < b));
  },
  bonusXP: 10,
  jolt: "...the `thread::sleep` sits inside each thread's closure. every breaker waits out its own delay, all at the same time. the window is the slowest one, not all of them added up.",
  suggestion: "move the `thread::sleep(Duration::from_millis(d))` inside the thread's closure. sleeping in the loop holds up the next spawn — the delays add up and the alarm trips.",
};

const zipPairs: ZenRule = {
  id: "rs_zip_pairs",
  principle: "zip what goes together",
  isRelevant: (code) => fnBody(code, "cut_timed") !== null,
  check: (code) => {
    const body = fnBody(code, "cut_timed") ?? "";
    return /\.zip\s*\(/.test(body) && !/\.\.=?\s*\w+\.len\s*\(\)/.test(body);
  },
  bonusXP: 10,
  jolt: "`circuits.iter().zip(delays)` — each name walks beside its delay. no index, no `delays[i]` that could fall off the end. clippy has a lint for range loops that only index; you never needed one.",
  suggestion: "skip `for i in 0..circuits.len()` and indexing both slices. `for (name, &d) in circuits.iter().zip(delays)` hands you each pair directly.",
};

// ── chapter-09:scaffold ──

const tightCall: ZenRule = {
  id: "rs_tight_call",
  principle: "no space before the bracket",
  isRelevant: (code) => /\bfn\s+\w+|\w!/.test(maskRs(code)),
  check: (code) => !/\bfn\s+\w+[ \t]+[(<]|\b\w+![ \t]+[([]/.test(maskRs(code)),
  bonusXP: 3,
  jolt: "`fn main()` and `println!(...)` — the bracket hugs the name. rustfmt writes every call that way, so a call always looks like a call.",
  suggestion: "no space between a name and its bracket: `fn main()`, `println!(...)` — not `fn main ()` or `println! (...)`. rustfmt pulls them together.",
};

// ── chapter-09:hail ──

const fromMillis: ZenRule = {
  id: "rs_from_millis",
  principle: "say the unit you have",
  isRelevant: (code) => /\bDuration::/.test(fnBody(code, "hail") ?? ""),
  check: (code) => /\bDuration::from_millis\s*\(/.test(fnBody(code, "hail") ?? ""),
  bonusXP: 10,
  jolt: "`Duration::from_millis(delay_ms)` — milliseconds in, milliseconds meant. no dividing by a thousand, no rounding. the name of the function is the unit.",
  suggestion: "the delay is already in milliseconds — use `Duration::from_millis(delay_ms)`. `from_secs(delay_ms / 1000)` rounds 100ms down to zero and every team answers at once.",
};

const mpscPath: ZenRule = {
  id: "rs_mpsc_path",
  principle: "`mpsc::channel()`, path and all",
  isRelevant: (code) => /\bchannel\s*(::<[^>]*>)?\s*\(/.test(maskRs(code)),
  check: (code) => {
    const m = maskRs(code);
    return /\bmpsc::channel\b/.test(m) && !/(^|[^:\w])channel\s*(::<[^>]*>)?\s*\(/.test(m);
  },
  bonusXP: 5,
  jolt: "`mpsc::channel()` — the module right there in the call. multi-producer, single-consumer: the name tells you how the pipe works before you read another line.",
  suggestion: "call it through its module: `use std::sync::mpsc;` and `mpsc::channel()`. a bare `channel()` hides which kind of pipe you made.",
};

// ── chapter-09:first ──

const loopTheTeams: ZenRule = {
  id: "rs_loop_the_teams",
  principle: "one loop, every team",
  isRelevant: (code) => /\bspawn\s*\(/.test(withoutFn(code, "hail")),
  check: (code) => [...withoutFn(code, "hail").matchAll(/\bspawn\s*\(/g)].length <= 1,
  bonusXP: 15,
  jolt: "...one `for r in [alpha, bravo, charlie]`, one forwarder written once. a fourth team would be one more name in the list. the same code listening three times is the same code to fix three times.",
  suggestion: "three copies of the forwarder is three places for a bug. loop instead: `for r in [alpha, bravo, charlie] { let tx = tx.clone(); thread::spawn(move || ...); }`.",
};

const sendIgnoreClosed: ZenRule = {
  id: "rs_send_ignore_closed",
  principle: "a late send isn't a crash",
  isRelevant: (code) => /\.send\s*\(/.test(maskRs(code)),
  check: (code) => {
    const m = maskRs(code);
    return !spansAfter(m, /\.send\s*\(/).some(([, close]) => /^\s*\.(unwrap|expect)\s*\(/.test(m.slice(close + 1)));
  },
  bonusXP: 10,
  jolt: "`let _ = tx.send(...)` — a team that loses the race sends into a channel nobody reads any more, and that's fine. you said so on purpose, instead of letting the thread panic over it.",
  suggestion: "`tx.send(...).unwrap()` panics when nobody's listening — and the teams that lose the race always find nobody listening. write `let _ = tx.send(...)` to drop that error on purpose.",
};

// ── chapter-09:timeout ──

const recvTimeout: ZenRule = {
  id: "rs_recv_timeout",
  principle: "let the channel keep the clock",
  isRelevant: (code) => fnBody(code, "await_contact") !== null,
  check: (code) => {
    const body = fnBody(code, "await_contact") ?? "";
    return /\.recv_timeout\s*\(/.test(body) && !/\b(loop|while)\b|\bInstant\b|\bsleep\s*\(/.test(body);
  },
  bonusXP: 15,
  jolt: "...`recv_timeout(Duration::from_millis(timeout_ms))`. one call waits for the first message or the deadline, whichever lands first. no loop checking a clock, no sleeping in slices. the waiting is the channel's job.",
  suggestion: "no need to spin a loop of `try_recv` and `sleep` against an `Instant`. one call does it: `rx.recv_timeout(Duration::from_millis(timeout_ms))` — `Ok(msg)` or the deadline.",
};

const sweepNoWait: ZenRule = {
  id: "rs_sweep_no_wait",
  principle: "a glance never waits",
  isRelevant: (code) => fnBody(code, "sweep") !== null,
  check: (code) => {
    const body = fnBody(code, "sweep") ?? "";
    return /\.try_recv\s*\(/.test(body) && !/\.recv(_timeout)?\s*\(|\bsleep\s*\(/.test(body);
  },
  bonusXP: 10,
  jolt: "`ch.try_recv()` and nothing else — a message already waiting, or `channel silent`, right now. no deadline, no pause. the sweep looks and moves on.",
  suggestion: "a sweep shouldn't wait at all — not even a short `recv_timeout`. `ch.try_recv()` answers right now: `Ok(msg)` if one's there, `Err(_)` if not.",
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
  "chapter-04:scaffold": [lineWidth],
  "chapter-04:guardmap": [hashmapFrom, onePairPerLine],
  "chapter-04:clearfloors": [mapValues, collectSet, boolComparison],
  "chapter-04.2:scaffold": [printLiteral],
  "chapter-04.2:reverseword": [charsRev, collectString],
  "chapter-04.2:encode": [splitWhitespace, joinWords, mapByName],
  "chapter-04.2:relayheader": [noUnwrapParse, formatHeader],
  "chapter-07:scaffold": [printlnNewline],
  "chapter-07:scan": [namedDropGuard, stripSuffix],
  "chapter-07:recover": [questionMark, errorsNotPanics],
  "chapter-08:scaffold": [noUnusedUse],
  "chapter-08:goroutine": [reuseCut, threadModulePath],
  "chapter-08:fanout": [spawnAllThenJoin, joinCollect],
  "chapter-08:window": [sleepInThread, zipPairs],
  "chapter-09:scaffold": [tightCall],
  "chapter-09:hail": [fromMillis, mpscPath],
  "chapter-09:first": [loopTheTeams, sendIgnoreClosed],
  "chapter-09:timeout": [recvTimeout, sweepNoWait],
};
