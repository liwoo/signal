// ── Maya's answer banks · Rust ──
// Same story beats and stakes as the Go banks in ../engine.ts, teaching Rust
// and agreeing with src/data/challenges/rust/act-1.ts. When the Rust Playground
// can't be reached (offline), the engine falls back to these codePatterns — so
// each step's ||COMPLETE|| pattern recognizes a genuinely correct program, and
// the patterns above it catch the classic mistakes first (first match wins).
//
// Voice rule: every `!` (println!, macros) lives inside backticks — Maya never
// exclaims.

import type { CodePattern, OutputPattern, StepBank } from "./types";

// ══════════════════════════════════════════════════════════════
//  Reading the player's Rust
// ══════════════════════════════════════════════════════════════

/** Comments removed, strings kept. */
export function noComments(code: string): string {
  let out = "";
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '"') {
      const start = i;
      for (i++; i < code.length && code[i] !== '"'; i++) if (code[i] === "\\") i++;
      out += code.slice(start, i + 1);
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      while (i < code.length && code[i] !== "\n") i++;
      out += "\n";
      continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      const chunk = code.slice(i, end === -1 ? code.length : end + 2);
      out += chunk.replace(/[^\n]/g, " ");
      i = end === -1 ? code.length : end + 1;
      continue;
    }
    out += ch;
  }
  return out;
}

/** Comments removed and string contents blanked to spaces (same length, so indices line up with `noComments`). */
export function maskRs(code: string): string {
  return noComments(code).replace(/"(?:[^"\\]|\\[\s\S])*"/g, (lit) => `"${" ".repeat(lit.length - 2)}"`);
}

/** The contents of every string literal, escapes left as written. */
function stringsOf(code: string): string[] {
  return [...noComments(code).matchAll(/"((?:[^"\\]|\\[\s\S])*)"/g)].map((m) => m[1]);
}

const hasMain = (code: string) => /\bfn\s+main\s*\(\s*\)/.test(maskRs(code));
const printsSomething = (code: string) => /\b(e?print(ln)?)!\s*\(/.test(maskRs(code));

/** Index just past the bracket matching the opener at `open` (strings respected). */
function matchClose(code: string, open: number): number {
  const pairs: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
  const want = pairs[code[open]];
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    const ch = code[i];
    if (ch === '"') {
      for (i++; i < code.length && code[i] !== '"'; i++) if (code[i] === "\\") i++;
      continue;
    }
    if (ch === code[open]) depth++;
    else if (ch === want) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return code.length;
}

/** Split `a, "b, c", f(x, y)` on top-level commas. */
function splitArgs(inner: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '"') {
      const start = i;
      for (i++; i < inner.length && inner[i] !== '"'; i++) if (inner[i] === "\\") i++;
      cur += inner.slice(start, i + 1);
      continue;
    }
    if ("([{".includes(ch)) depth++;
    if (")]}".includes(ch)) depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

interface PrintCall {
  /** The format string's contents, or null when the first argument isn't a string literal. */
  format: string | null;
  args: string[];
}

/** Every `println!(…)` / `print!(…)` call. */
function printCalls(code: string): PrintCall[] {
  const src = noComments(code);
  const out: PrintCall[] = [];
  for (const m of src.matchAll(/\bprint(?:ln)?!\s*\(/g)) {
    const open = m.index! + m[0].length - 1;
    const inner = src.slice(open + 1, matchClose(src, open) - 1);
    const parts = splitArgs(inner);
    const lit = parts[0]?.match(/^"((?:[^"\\]|\\[\s\S])*)"$/);
    out.push({ format: lit ? lit[1] : parts.length ? null : "", args: lit ? parts.slice(1) : parts });
  }
  return out;
}

/** Positional `{}` slots (inline `{name}` slots fill themselves). */
function positionalSlots(format: string): number {
  const f = format.replace(/\{\{|\}\}/g, "");
  return [...f.matchAll(/\{([^{}]*)\}/g)].filter((m) => !/^[A-Za-z_]/.test(m[1])).length;
}

/** A print call whose `{}` count and value count disagree — rustc refuses it. */
function slotMismatch(code: string): boolean {
  return printCalls(code).some((c) => c.format !== null && positionalSlots(c.format) !== c.args.length);
}

/** `println!(i)` — the first argument has to be a string literal. */
const printsWithoutFormat = (code: string) => printCalls(code).some((c) => c.format === null);

/** A `{path::to}` inline slot — only bare names can sit inside the braces. */
const inlinePathSlot = (code: string) =>
  printCalls(code).some((c) => c.format !== null && /\{[A-Za-z_]\w*(::|\.)\w+[^}]*\}/.test(c.format));

const HELLO_RE = /\bprintln!\s*\(\s*"Hello World"\s*\)|\bprintln!\s*\(\s*"\{\}"\s*,\s*"Hello World"\s*\)/;

const LABELS = ["DENY", "WARN", "GRANT", "OVERRIDE"] as const;
type Label = (typeof LABELS)[number];

function expectedLabel(i: number): Label {
  if (i <= 3) return "DENY";
  if (i <= 6) return "WARN";
  if (i <= 9) return "GRANT";
  return "OVERRIDE";
}

const hasLabel = (code: string, label: string) => stringsOf(code).some((s) => new RegExp(`\\b${label}\\b`).test(s));
const allLabels = (code: string) => LABELS.every((l) => hasLabel(code, l));

// ── for loops over a range ──

interface RsFor {
  variable: string;
  /** Values the loop visits, or null when the iterator isn't a plain integer range. */
  values: number[] | null;
  body: string;
}

function forLoops(code: string): RsFor[] {
  const src = maskRs(code);
  const out: RsFor[] = [];
  for (const m of src.matchAll(/\bfor\s+(\w+)\s+in\s+([^{]+)\{/g)) {
    const open = m.index! + m[0].length - 1;
    const body = noComments(code).slice(open + 1, matchClose(src, open) - 1);
    const r = m[2].trim().replace(/^\(\s*|\s*\)$/g, "").match(/^(-?\d+)\s*\.\.(=?)\s*(-?\d+)$/);
    let values: number[] | null = null;
    if (r) {
      const start = Number(r[1]);
      const end = Number(r[3]) + (r[2] ? 1 : 0);
      values = [];
      for (let v = start; v < end && values.length < 100; v++) values.push(v);
    }
    out.push({ variable: m[1], values, body });
  }
  return out;
}

const rangeLoop = (code: string) => forLoops(code).find((f) => f.values !== null);

/** What the loop body prints for each value: v itself, or v + 1 (counting from 0). */
function printedShift(loop: RsFor): number | null {
  const v = loop.variable;
  for (const call of printCalls(loop.body)) {
    if (call.format === null) continue;
    if (call.format === `{${v}}` && call.args.length === 0) return 0;
    if (call.format !== "{}" || call.args.length !== 1) continue;
    const a = call.args[0].replace(/\s+/g, "");
    if (a === v) return 0;
    if (a === `${v}+1` || a === `1+${v}`) return 1;
  }
  return null;
}

// ── conditions: if / else if chains and match arms, simulated over 1..=10 ──

type Pred = (i: number) => boolean;

/** A tiny parser for `i <= 3`, `i >= 4 && i <= 6`, `(1..=3).contains(&i)`, `i == 10 || i > 9`. */
function parseCondition(text: string, variable: string): Pred | null {
  const src = text.trim();
  const toks = src.match(/\(\s*-?\d+\s*\.\.=?\s*-?\d+\s*\)\s*\.\s*contains\s*\(\s*&?\s*\w+\s*\)|&&|\|\||<=|>=|==|!=|<|>|\(|\)|-?\d+|\w+|\S/g);
  if (!toks) return null;
  let pos = 0;
  const peek = () => toks[pos];
  const operand = (t: string | undefined): ((i: number) => number) | null => {
    if (t === undefined) return null;
    if (t === variable) return (i) => i;
    if (/^-?\d+$/.test(t)) return () => Number(t);
    return null;
  };
  function primary(): Pred | null {
    const t = peek();
    if (t === undefined) return null;
    const contains = t.match(/^\(\s*(-?\d+)\s*\.\.(=?)\s*(-?\d+)\s*\)\s*\.\s*contains\s*\(\s*&?\s*(\w+)\s*\)$/);
    if (contains) {
      pos++;
      if (contains[4] !== variable) return null;
      const lo = Number(contains[1]);
      const hi = Number(contains[3]);
      return contains[2] ? (i) => i >= lo && i <= hi : (i) => i >= lo && i < hi;
    }
    if (t === "(") {
      pos++;
      const inner = or();
      if (peek() !== ")") return null;
      pos++;
      return inner;
    }
    const left = operand(t);
    if (!left) return null;
    pos++;
    const op = peek();
    pos++;
    const right = operand(peek());
    if (!right) return null;
    pos++;
    switch (op) {
      case "<": return (i) => left(i) < right(i);
      case "<=": return (i) => left(i) <= right(i);
      case ">": return (i) => left(i) > right(i);
      case ">=": return (i) => left(i) >= right(i);
      case "==": return (i) => left(i) === right(i);
      case "!=": return (i) => left(i) !== right(i);
      default: return null;
    }
  }
  function and(): Pred | null {
    let p = primary();
    while (p && peek() === "&&") {
      pos++;
      const q = primary();
      if (!q) return null;
      const prev = p;
      p = (i) => prev(i) && q(i);
    }
    return p;
  }
  function or(): Pred | null {
    let p = and();
    while (p && peek() === "||") {
      pos++;
      const q = and();
      if (!q) return null;
      const prev = p;
      p = (i) => prev(i) || q(i);
    }
    return p;
  }
  const result = or();
  return result && pos === toks.length ? result : null;
}

const firstLabel = (text: string): Label | null => {
  for (const s of stringsOf(text)) {
    const m = s.match(/\b(DENY|WARN|GRANT|OVERRIDE)\b/);
    if (m) return m[1] as Label;
  }
  return null;
};

/** The labels an if / else if / else chain assigns to 1..=10, or null if it can't be read. */
function simulateIfChain(body: string, variable: string): Label[] | null {
  const masked = maskRs(body);
  const heads = [...masked.matchAll(/(\belse\s+)?\bif\s+([^{]+)\{|\belse\s*\{/g)];
  if (heads.length === 0) return null;
  const branches: { pred: Pred; label: Label | null; chainStart: boolean }[] = [];
  for (let k = 0; k < heads.length; k++) {
    const h = heads[k];
    const open = h.index! + h[0].length - 1;
    const close = matchClose(masked, open);
    const label = firstLabel(body.slice(open, close));
    if (h[2] === undefined) {
      branches.push({ pred: () => true, label, chainStart: false });
    } else {
      const pred = parseCondition(h[2], variable);
      if (!pred) return null;
      branches.push({ pred, label, chainStart: !h[1] });
    }
  }
  // Only the first chain counts.
  const end = branches.findIndex((b, k) => k > 0 && b.chainStart);
  const chain = end === -1 ? branches : branches.slice(0, end);
  const out: Label[] = [];
  for (let i = 1; i <= 10; i++) {
    const hit = chain.find((b) => b.pred(i));
    if (!hit || !hit.label) return null;
    out.push(hit.label);
  }
  return out;
}

/** One match pattern alternative → predicate. */
function patternPred(pat: string, variable: string): Pred | null {
  const p = pat.trim();
  const guard = p.match(/^(\w+)\s+if\s+(.+)$/);
  if (guard) return parseCondition(guard[2], guard[1] === "_" ? variable : guard[1]);
  if (p === "_" || /^[a-z_]\w*$/.test(p)) return () => true;
  const range = p.match(/^(-?\d+)\s*\.\.(=?)\s*(-?\d+)$/);
  if (range) {
    const lo = Number(range[1]);
    const hi = Number(range[3]);
    return range[2] ? (i) => i >= lo && i <= hi : (i) => i >= lo && i < hi;
  }
  const open = p.match(/^(-?\d+)\s*\.\.$/);
  if (open) return (i) => i >= Number(open[1]);
  if (/^-?\d+$/.test(p)) return (i) => i === Number(p);
  return null;
}

interface MatchArm {
  pattern: string;
  label: Label | null;
}

/** The arms of the first `match <var> { … }`. */
function matchArms(code: string): { variable: string; arms: MatchArm[] } | null {
  const masked = maskRs(code);
  const m = masked.match(/\bmatch\s+(\w+)\s*\{/);
  if (!m) return null;
  const open = m.index! + m[0].length - 1;
  const close = matchClose(masked, open);
  const inner = masked.slice(open + 1, close - 1);
  const raw = noComments(code).slice(open + 1, close - 1);
  const arrows = [...inner.matchAll(/=>/g)].map((a) => a.index!);
  if (arrows.length === 0) return { variable: m[1], arms: [] };
  const arms: MatchArm[] = [];
  let from = 0;
  for (let k = 0; k < arrows.length; k++) {
    // The pattern is the text after the previous arm's end (last top-level comma or `}`) up to `=>`.
    const before = inner.slice(from, arrows[k]);
    const cut = Math.max(before.lastIndexOf(","), before.lastIndexOf("}"));
    const pattern = before.slice(cut + 1).trim();
    const nextArrow = arrows[k + 1] ?? inner.length;
    const armText = raw.slice(arrows[k], nextArrow);
    arms.push({ pattern, label: firstLabel(armText) });
    from = arrows[k] + 2;
  }
  return { variable: m[1], arms };
}

function simulateMatch(code: string, loopVar: string): Label[] | null {
  const parsed = matchArms(code);
  if (!parsed || parsed.variable !== loopVar || parsed.arms.length === 0) return null;
  const arms = parsed.arms.map((a) => {
    const alts = a.pattern.split("|").map((p) => patternPred(p, loopVar));
    if (alts.some((x) => x === null)) return null;
    return { pred: (i: number) => alts.some((x) => x!(i)), label: a.label };
  });
  if (arms.some((a) => a === null)) return null;
  const out: Label[] = [];
  for (let i = 1; i <= 10; i++) {
    const hit = arms.find((a) => a!.pred(i));
    if (!hit || !hit.label) return null;
    out.push(hit.label);
  }
  return out;
}

const isCorrect = (sim: Label[] | null) => sim !== null && sim.every((l, k) => l === expectedLabel(k + 1));

/** The classification the loop body produces, via a match or an if chain. */
function simulateClassify(code: string): Label[] | null {
  const loop = rangeLoop(code);
  if (!loop) return null;
  const viaMatch = /\bmatch\b/.test(maskRs(loop.body)) ? simulateMatch(loop.body, loop.variable) : null;
  return viaMatch ?? simulateIfChain(loop.body, loop.variable);
}

// ── functions ──

interface RsFn {
  params: string;
  ret: string | null;
  body: string;
}

function fnDef(code: string, name: string): RsFn | null {
  const masked = maskRs(code);
  const m = masked.match(new RegExp(`\\bfn\\s+${name}\\s*\\(([^)]*)\\)\\s*(?:->\\s*([^{]+?))?\\s*\\{`));
  if (!m) return null;
  const open = m.index! + m[0].length - 1;
  return { params: m[1].trim(), ret: m[2]?.trim() ?? null, body: masked.slice(open + 1, matchClose(masked, open) - 1) };
}

/** The last statement of a body, and whether it ends with a semicolon. */
function tail(body: string): { text: string; semicolon: boolean } {
  const trimmed = body.trim();
  const semicolon = trimmed.endsWith(";");
  const lines = trimmed.replace(/;$/, "").split(/;|\n/).map((l) => l.trim()).filter(Boolean);
  return { text: lines[lines.length - 1] ?? "", semicolon };
}

/** Does the function hand back `name` (or the expression) as its value? */
function returnsValue(fn: RsFn): boolean {
  if (/\breturn\b/.test(fn.body) && !/\bfor\b[^{]*\{[^}]*\breturn\b/.test(fn.body)) return true;
  const t = tail(fn.body);
  return !t.semicolon && t.text !== "" && !t.text.endsWith("}");
}

const takesSlice = (fn: RsFn) => /:\s*&\s*\[\s*\w+\s*\]/.test(fn.params);
const intReturn = (fn: RsFn) => fn.ret !== null && /^(i|u)(8|16|32|64|128|size)$/.test(fn.ret);

function sumCodesWorks(code: string): boolean {
  const fn = fnDef(code, "sum_codes");
  if (!fn || !takesSlice(fn) || !intReturn(fn) || !returnsValue(fn)) return false;
  const viaIter = /\.\s*(iter|into_iter)\s*\(\s*\)\s*\.\s*(sum|fold)\b/.test(fn.body) || /\.\s*(sum|fold)\b/.test(fn.body);
  const viaLoop = /\bfor\b/.test(fn.body) && /\+=|=\s*\w+\s*\+/.test(fn.body) && /\blet\s+mut\b/.test(fn.body);
  return viaIter || viaLoop;
}

const returnsInsideLoop = (body: string) => /\bfor\b[^{]*\{[^}]*\breturn\b/.test(body);
const addsWithoutMut = (body: string) => /\blet\s+(?!mut\b)(\w+)\s*(?::\s*\w+)?\s*=\s*0\s*;/.test(body) && /\+=/.test(body) && !/\blet\s+mut\b/.test(body);

function tailHasSemicolon(fn: RsFn): boolean {
  if (/\breturn\b/.test(fn.body)) return false;
  const t = tail(fn.body);
  return t.semicolon && /^(total|sum|\(.*\)|\w+\s*\.\s*iter.*)$/.test(t.text);
}

const SLOT_HELP =
  "the `{}` slots and the values don't line up. one `{}` for every value you pass after the text: `println!(\"{} {}\", a, b)`.";

const HELLO_LEFTOVER =
  "the hello world from before is still printing — the keypad only wants the codes. delete that line.";

// ══════════════════════════════════════════════════════════════
//  Shared scaffold lines
// ══════════════════════════════════════════════════════════════

function scaffoldPatterns(done: string): CodePattern[] {
  return [
    {
      match: (code) => /\bconsole\s*\.\s*log\b/.test(maskRs(code)),
      response: "`console.log` is javascript. rust prints with `println!(...)`.",
    },
    {
      match: (code) => /\b(fmt|System)\s*\./.test(maskRs(code)),
      response: "that's another language's print. rust prints with the `println!` macro — no import needed.",
    },
    {
      match: (code) => /\bprintln\s*\(/.test(maskRs(code)),
      response: "`println` is a macro, so it needs a bang before the bracket: `println!(\"Hello World\");`.",
    },
    {
      match: (code) => /(^|[^\w!])print\s*\(/.test(maskRs(code)),
      response: "that's python's print. in rust it's a macro: `println!(\"Hello World\");`.",
    },
    {
      match: (code) => /\b(func|def|function)\s+main\b/.test(maskRs(code)),
      response: "rust declares functions with `fn`: `fn main() { }`.",
    },
    {
      match: (code) => HELLO_RE.test(noComments(code)) && !hasMain(code),
      response:
        "the line's right, but rust doesn't run loose lines. it starts in `fn main` — wrap it: `fn main() { println!(\"Hello World\"); }`.",
    },
    {
      match: (code) => /\bfn\s+Main\s*\(/.test(maskRs(code)),
      response: "rust is case-sensitive — the entry point is `main`, all lowercase.",
    },
    { match: (code) => HELLO_RE.test(noComments(code)) && hasMain(code), response: done },
    {
      match: (code) => /\b(Println|PrintLn|printLn|PRINTLN)!?\s*\(/.test(maskRs(code)),
      response: "rust is case-sensitive. it's `println!`, all lowercase.",
    },
    {
      match: (code) => /\bprintln!\s*\(\s*Hello\b/i.test(noComments(code)),
      response: "text needs double quotes around it — without them rust thinks `Hello` is a name. `println!(\"Hello World\");`.",
    },
    {
      match: (code) => /\bprintln!\s*\(\s*'/.test(noComments(code)),
      response: "single quotes are for one character in rust. text goes in double quotes: `\"Hello World\"`.",
    },
    {
      match: (code) => printsSomething(code) && stringsOf(code).some((s) => /hello\W*world/i.test(s)),
      response: "close. the terminal matches exactly — capital H, capital W, one space: `Hello World`.",
    },
    {
      match: (code) => !printsSomething(code),
      response: "nothing's printing. inside `fn main() { }`, one line: `println!(\"Hello World\");`.",
    },
  ];
}

const SCAFFOLD_GENERIC = [
  "the terminal didn't get `Hello World`. `fn main() { println!(\"Hello World\"); }` — that's the whole program.",
  "not quite. a `fn main` with one `println!` inside it, text in double quotes.",
];

// ══════════════════════════════════════════════════════════════
//  Chapter 01
// ══════════════════════════════════════════════════════════════

const CH01_SCAFFOLD_DONE =
  "there it is — `Hello World` on the wire. the compiler checked it and the terminal accepted it. the channel's live.\n\n||COMPLETE||";

const ch01Scaffold: StepBank = {
  intro:
    "...signal received. you're in.\ni'm maya — they've locked me in a cell and this terminal is my only way to reach anyone. right now it's dead. make it print `Hello World` so i know the channel's actually live. it runs rust: everything starts inside `fn main`.",

  conceptFAQ: [
    {
      keywords: ["print", "output", "display", "show", "write"],
      response: "`println!(\"...\")` writes the text to the terminal, then moves to a new line.",
    },
    {
      keywords: ["bang", "exclamation", "macro", "why the"],
      response: "the bang means `println` is a macro, not a plain function — it gets expanded before the program compiles. you always call it as `println!(...)`.",
    },
    {
      keywords: ["main", "function", "entry", "fn", "start"],
      response: "`fn main() { }` is where every rust program starts. your code goes between the braces.",
    },
    {
      keywords: ["import", "package", "setup", "skeleton", "scaffold", "boilerplate", "use", "structure"],
      response: "no imports for printing — `println!` is always there. the only skeleton is `fn main() { }`.",
    },
    {
      keywords: ["string", "text", "quote"],
      response: "text goes in double quotes: `\"Hello World\"`. single quotes are for one character only.",
    },
    {
      keywords: ["semicolon", ";"],
      response: "end the statement with a semicolon: `println!(\"Hello World\");`.",
    },
    {
      keywords: ["capital", "uppercase", "lowercase", "case sensitive"],
      response: "rust is case-sensitive. `fn`, `main` and `println!` are all lowercase. the text inside is exact: `Hello World`.",
    },
    {
      keywords: ["run", "execute", "compile", "build", "compiler"],
      response: "hit transmit. the compiler checks the whole program first — if anything's wrong it refuses and tells you the line. then it runs.",
    },
    {
      keywords: ["rust", "language", "why rust"],
      response: "rust. strict compiler, fast programs. it catches mistakes before anything runs — down here that's worth a lot.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "what next", "where do i start"],
      response: "make it print `Hello World`: `fn main() { println!(\"Hello World\"); }`. transmit it.",
    },
    {
      keywords: ["error", "wrong", "not working", "doesn't work", "broken", "fail"],
      response: "check four things: `fn main() { }` around it, the bang in `println!`, double quotes around `Hello World`, and the semicolon.",
    },
  ],

  codePatterns: scaffoldPatterns(CH01_SCAFFOLD_DONE),
  correctResponse: CH01_SCAFFOLD_DONE,

  genericWrong: [...SCAFFOLD_GENERIC, "the channel's still dead. i need the exact words `Hello World` printed."],

  rushDialogue: [
    "the signal's degrading. just get `Hello World` printing.",
    "losing you. `fn main`, one `println!`. now.",
  ],

  stuckResponses: [
    "three lines, that's the whole program:\n```\nfn main() {\n    println!(\"Hello World\");\n}\n```",
    "`fn main()`, braces, and inside them `println!` with the text in double quotes and a semicolon at the end.",
  ],

  deflections: ["not now — i need the channel live first.", "focus. one small rust program and we can move on."],
};

const CH01_LOCATION_DONE = "...i see it. my cell. you actually got through.\n\n||COMPLETE||";

const MOD_DECL = /^\s*(pub\s+)?mod\s+cellblock\s*;/m;
const usesBoth = (code: string) => {
  const c = noComments(code).replace(/^\s*use\s[^\n]*/gm, "");
  return /\bcellblock::CELL\b/.test(c) && /\bcellblock::SUBLEVEL\b/.test(c);
};
const hasLocationLabels = (code: string) => {
  const text = stringsOf(code).join(" ");
  return /\bCELL\b/.test(text) && /\bSUBLEVEL\b/.test(text);
};

const ch01Location: StepBank = {
  intro:
    "good, the channel's live. now lock in where they're holding me — exactly, because a wrong location gets someone hurt. don't type it by hand: my real cell is in a file next to yours, `cellblock.rs`. declare it with `mod cellblock;` and print its `CELL` and `SUBLEVEL` as `CELL B-09 - SUBLEVEL 3`.",

  conceptFAQ: [
    {
      keywords: ["mod", "module", "cellblock", "another file", "import", "include"],
      response: "a sibling file becomes a module when you declare it: `mod cellblock;` at the top, above `fn main`. then its public values are yours to read.",
    },
    {
      keywords: ["access", "colon", "::", "path", "reach into", "read the value", "get the value", "dot"],
      response: "module name, two colons, then the value: `cellblock::CELL` is the cell, `cellblock::SUBLEVEL` is the number.",
    },
    {
      keywords: ["format", "placeholder", "braces", "{}", "mix", "combine", "together", "text and a number", "and a number", "same line", "slot"],
      response:
        "each `{}` in the text is a slot. the values follow in order, after commas: `println!(\"CELL {} - SUBLEVEL {}\", cellblock::CELL, cellblock::SUBLEVEL);`.",
    },
    {
      keywords: ["print", "output", "display", "show"],
      response: "`println!` sends it. don't put my cell in the quotes — leave a `{}` slot and pass `cellblock::CELL` after the text.",
    },
    {
      keywords: ["capital", "uppercase", "constant", "why caps", "pub"],
      response: "rust writes constants in capitals. `pub` means the file lets you read them from outside — without it they'd stay private.",
    },
    {
      keywords: ["use", "use cellblock", "shorter"],
      response: "`use` can shorten a path, but keep the full `cellblock::CELL` in your print line — i want to see where every value comes from.",
    },
    {
      keywords: ["dash", "hyphen", "minus", "separator", "special character", "between the cell"],
      response: "the separator is a plain dash with a space on each side: `CELL B-09 - SUBLEVEL 3`. nothing special to type.",
    },
    {
      keywords: ["variable", "assign", "store", "let", "name it"],
      response: "you can name a value first: `let cell = cellblock::CELL;`. but print the paths directly too — that's what i check for.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "`mod cellblock;` at the top, then in `fn main` print `cellblock::CELL` and `cellblock::SUBLEVEL` as `CELL B-09 - SUBLEVEL 3`. pull the values from the module — don't type them.",
    },
    {
      keywords: ["example", "show me", "sample", "template"],
      response:
        "here's the shape:\n```\nmod cellblock;\n\nfn main() {\n    println!(\"CELL {} - SUBLEVEL {}\", cellblock::CELL, cellblock::SUBLEVEL);\n}\n```",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /hello/i.test(out) && /world/i.test(out),
      response: "there's a hello world in the output. i don't need a greeting anymore — just my location: CELL B-09 - SUBLEVEL 3.",
    },
    {
      match: (out) => /b-?09/i.test(out) && !/sublevel/i.test(out),
      response: "close — i see the cell but not the sublevel. i need both: CELL B-09 - SUBLEVEL 3.",
    },
    {
      match: (out) => /B-09/.test(out) && /\b3\b/.test(out) && !/CELL/.test(out.replace(/SUBLEVEL/g, "")),
      response: "the values are right. now the words around them: `CELL B-09 - SUBLEVEL 3`.",
    },
    {
      match: (out) => /CELL\s*B-09\s*-?\s*SUBLEVEL\s*3/.test(out),
      response: "the pieces are all there but the spacing's off. exactly: `CELL B-09 - SUBLEVEL 3` — one space around the dash.",
    },
    {
      match: (out) => out.trim().length > 0 && !/b-?09/i.test(out),
      response: "you're printing something, but it's not my cell. i need CELL B-09 - SUBLEVEL 3.",
    },
  ],

  codePatterns: [
    {
      match: (code) => !hasMain(code),
      response: "rust doesn't run loose lines — keep your print inside `fn main() { }`.",
    },
    {
      match: (code) => !printsSomething(code),
      response: "nothing came through. `println!(...)` is how anything reaches the terminal.",
    },
    {
      match: (code) => !/\bcellblock\b/.test(maskRs(code)) && stringsOf(code).some((s) => /hello/i.test(s)),
      response: "that's a hello world. i don't need a greeting — i need my location, straight from the cellblock module.",
    },
    {
      match: (code) => /^\s*(import|#include|require)\b|\bimport\s+cellblock\b/m.test(maskRs(code)),
      response: "rust doesn't import a sibling file — it declares it as a module: `mod cellblock;` at the top.",
    },
    {
      match: (code) => /\bcellblock\s*\.\s*\w/.test(maskRs(code)),
      response: "in rust you reach into a module with two colons, not a dot: `cellblock::CELL`.",
    },
    {
      match: (code) => /\bcellblock::/.test(maskRs(code)) && !MOD_DECL.test(maskRs(code)),
      response: "rust can't see `cellblock` yet. declare the module first: `mod cellblock;` at the very top.",
    },
    {
      match: (code) => /\bcellblock::(?!CELL\b|SUBLEVEL\b|\{)\w+/.test(maskRs(code)),
      response: "names are case-sensitive. the module exports `CELL` and `SUBLEVEL` — both in capitals.",
    },
    {
      match: (code) => inlinePathSlot(code),
      response:
        "only a plain name can sit inside the braces — a path like `cellblock::CELL` can't. leave `{}` slots in the text and pass the values after it.",
    },
    {
      match: (code) => slotMismatch(code),
      response: SLOT_HELP,
    },
    {
      match: (code) => /^\s*use\s+cellblock::/m.test(maskRs(code)) && !usesBoth(code),
      response:
        "the `use` works, but write the full path in the print line so i can see where each value comes from: `cellblock::CELL` and `cellblock::SUBLEVEL`.",
    },
    {
      match: (code) => HELLO_RE.test(noComments(code)),
      response: "the hello world is still in there. i don't need a greeting anymore — just my location. delete that line.",
    },
    {
      match: (code) => MOD_DECL.test(maskRs(code)) && usesBoth(code) && hasLocationLabels(code),
      response: CH01_LOCATION_DONE,
    },
    {
      match: (code) => /\bcellblock::CELL\b/.test(noComments(code)) !== /\bcellblock::SUBLEVEL\b/.test(noComments(code)),
      response: "close — you're reaching into the module, but i need both: `cellblock::CELL` and `cellblock::SUBLEVEL`.",
    },
    {
      match: (code) => /b-?09/i.test(code) && !/\bcellblock::/.test(noComments(code)),
      response:
        "don't type my cell in by hand. `mod cellblock;` and print `cellblock::CELL` and `cellblock::SUBLEVEL` — pull the values from the module.",
    },
    {
      match: (code) => usesBoth(code) && !hasLocationLabels(code),
      response: "the values are right. the line needs its words too: `CELL B-09 - SUBLEVEL 3`.",
    },
  ],

  correctResponse: CH01_LOCATION_DONE,

  genericWrong: [
    "that's not right. i need CELL B-09 - SUBLEVEL 3. exactly.",
    "almost... but the output doesn't match. look at what you're printing.",
    "wrong signal. pull my cell from `cellblock` and print it: CELL B-09 - SUBLEVEL 3.",
  ],

  rushDialogue: ["hurry. the footsteps stopped right outside.", "no time — just get it done. CELL B-09 - SUBLEVEL 3."],

  stuckResponses: [
    "here's all of it:\n```\nmod cellblock;\n\nfn main() {\n    println!(\"CELL {} - SUBLEVEL {}\", cellblock::CELL, cellblock::SUBLEVEL);\n}\n```",
    "the values aren't yours to type — they're in the module. declare it with `mod cellblock;`, then read `cellblock::CELL` and `cellblock::SUBLEVEL`.",
  ],

  deflections: ["i don't have intel on that. focus on the mission.", "not now. i need my location confirmed first."],
};

// ══════════════════════════════════════════════════════════════
//  Chapter 02
// ══════════════════════════════════════════════════════════════

const CH02_SCAFFOLD_DONE = "terminal initialized. the keypad's listening.\n\nnow loop through codes 1-10.\n\n||COMPLETE||";

const ch02Scaffold: StepBank = {
  intro:
    "the keypad on my door runs rust. get it live by printing `Hello World` — `fn main` and one `println!`.\n\nonce it's live, we can start cracking the sequence.",

  conceptFAQ: [
    { keywords: ["print", "output"], response: "same as before: `println!(\"Hello World\");` inside `fn main`." },
    { keywords: ["main", "function", "entry", "fn"], response: "`fn main() { }` — your loop will live between those braces too." },
    { keywords: ["import", "package", "setup", "skeleton", "scaffold"], response: "nothing to import. `fn main` is the whole skeleton." },
    { keywords: ["loop", "codes", "keypad"], response: "the loop comes next. first get the terminal live." },
  ],

  codePatterns: scaffoldPatterns(CH02_SCAFFOLD_DONE),
  correctResponse: CH02_SCAFFOLD_DONE,
  genericWrong: SCAFFOLD_GENERIC,
  rushDialogue: [],
  stuckResponses: [
    "same as before:\n```\nfn main() {\n    println!(\"Hello World\");\n}\n```",
    "`fn main`, braces, `println!` with the text in double quotes, semicolon. transmit.",
  ],
  deflections: ["focus. get the terminal live with a hello world first, then we crack the codes."],
};

const CH02_LOOP_DONE = "loop confirmed. the keypad's cycling. now i need you to classify each code.\n\n||COMPLETE||";

const loopOutputPatterns: OutputPattern[] = [
  { match: (out) => /Hello World/i.test(out), response: HELLO_LEFTOVER },
  {
    match: (out) => out.trim() === "1\n2\n3\n4\n5\n6\n7\n8\n9",
    response: "it stops at 9. `1..10` leaves the 10 out — add the equals sign: `1..=10`.",
  },
  {
    match: (out) => out.trim().startsWith("0\n"),
    response: "it starts at 0. the keypad's codes begin at 1 — start the range there: `1..=10`.",
  },
  {
    match: (out) => /^i$/m.test(out),
    response: "that's the letter i, not the number. leave a slot and pass the variable: `println!(\"{}\", i);`.",
  },
  {
    match: (out) => /^1\s*2\s*3/.test(out.trim()) && out.trim().split("\n").length === 1,
    response: "all the numbers landed on one line. `print!` doesn't end the line — use `println!`.",
  },
];

const ch02Loop: StepBank = {
  intro:
    "good, you're still here.\n\nthe keypad on my door cycles codes 1 through 10. write a loop that prints each number on its own line — just the raw numbers. 1, 2, 3... up to 10. we'll classify them next.",

  conceptFAQ: [
    {
      keywords: ["loop", "for", "repeat", "iterate", "cycle"],
      response: "`for i in 1..=10 { }` runs the body once for each number, with `i` holding the current one.",
    },
    {
      keywords: ["range", "1..", "..=", "dots", "count", "1 to 10", "from 1"],
      response: "`1..=10` is a range from 1 up to and including 10. without the `=`, `1..10` stops at 9.",
    },
    {
      keywords: ["print", "output", "number", "show"],
      response: "`println!(\"{}\", i);` — the `{}` is the slot the number drops into. one per line.",
    },
    {
      keywords: ["while", "loop keyword"],
      response: "rust has `while` and `loop` too, but `for` over a range is the clean way to count. the keypad wants a `for`.",
    },
    {
      keywords: ["semicolon", ";", "braces", "{"],
      response: "the loop body goes in braces, no semicolon after the closing one. the `println!` inside ends with `;`.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "inside `fn main`: `for i in 1..=10 { println!(\"{}\", i); }`.",
    },
  ],

  outputPatterns: loopOutputPatterns,

  codePatterns: [
    {
      match: (code) => !hasMain(code),
      response: "the loop has to live inside `fn main() { }` — rust doesn't run loose lines.",
    },
    {
      match: (code) => /\bfor\s*\(|\bfor\s+\w+\s*:=|\bfor\s+\w+\s+in\s+range\s*\(/.test(maskRs(code)),
      response: "that's another language's loop. rust loops over a range: `for i in 1..=10 { }`.",
    },
    {
      match: (code) => !/\bfor\b/.test(maskRs(code)) && /\b(while|loop)\b/.test(maskRs(code)),
      response: "that can work, but the keypad wants a `for` over a range: `for i in 1..=10 { }`.",
    },
    {
      match: (code) => !/\bfor\b/.test(maskRs(code)) && (maskRs(code).match(/\bprintln!/g) ?? []).length >= 3,
      response: "don't print every number by hand. one loop does it: `for i in 1..=10 { println!(\"{}\", i); }`.",
    },
    {
      match: (code) => !/\bfor\b/.test(maskRs(code)),
      response: "i need a loop. `for i in 1..=10 { }` counts through the codes.",
    },
    {
      match: (code) => printsWithoutFormat(code),
      response: "`println!` needs the text first, even if it's just a slot: `println!(\"{}\", i);`.",
    },
    { match: (code) => slotMismatch(code), response: SLOT_HELP },
    {
      match: (code) => {
        const loop = rangeLoop(code);
        return !!loop && loop.values!.length === 9 && loop.values![0] === 1;
      },
      response: "`1..10` stops BEFORE 10. add the equals sign to include it: `1..=10`.",
    },
    {
      match: (code) => HELLO_RE.test(noComments(code)),
      response: HELLO_LEFTOVER,
    },
    {
      match: (code) => {
        const loop = rangeLoop(code);
        if (!loop) return false;
        const shift = printedShift(loop);
        if (shift === null) return false;
        const printed = loop.values!.map((v) => v + shift);
        return printed.length === 10 && printed.every((v, k) => v === k + 1);
      },
      response: CH02_LOOP_DONE,
    },
    {
      match: (code) => {
        const loop = rangeLoop(code);
        return !!loop && loop.values![0] === 0;
      },
      response: "your range starts at 0. the codes run 1 to 10: `1..=10`.",
    },
    {
      match: (code) => !!rangeLoop(code) && printedShift(rangeLoop(code)!) === null,
      response: "the loop's there, but print the number itself on each pass: `println!(\"{}\", i);`.",
    },
  ],

  correctResponse: CH02_LOOP_DONE,

  genericWrong: [
    "the keypad isn't cycling right. i need 1 to 10, one number per line.",
    "not quite. `for i in 1..=10`, and print `i` each time.",
  ],

  rushDialogue: ["the guard's coming back. loop. now.", "no time — `for i in 1..=10`, print `i`."],

  stuckResponses: [
    "inside `fn main`:\n```\nfor i in 1..=10 {\n    println!(\"{}\", i);\n}\n```",
    "the `=` in `1..=10` is what makes the 10 count. the `{}` is where `i` lands.",
  ],

  deflections: ["later. the keypad first.", "focus on the loop. one number per line."],
};

const CH02_CLASSIFY_DONE =
  "the keypad's responding. all 10 codes mapped. but the redundancy protocol just kicked in — one more step.\n\n||COMPLETE||";

const classifyOutputPatterns: OutputPattern[] = [
  { match: (out) => /Hello World/i.test(out), response: HELLO_LEFTOVER },
  {
    match: (out) => /\d {2,}(DENY|WARN|GRANT|OVERRIDE)/.test(out),
    response: "there are two spaces between the number and the label. exactly one: `println!(\"{} DENY\", i);`.",
  },
  {
    match: (out) => /^\d+(DENY|WARN|GRANT|OVERRIDE)/m.test(out),
    response: "the number and the label are glued together. put a space between them: `\"{} DENY\"`.",
  },
  {
    match: (out) => /^i\s+(DENY|WARN|GRANT|OVERRIDE)/m.test(out) || /^\{\}/m.test(out),
    response: "the number isn't filling in. leave a `{}` slot and pass `i` after the text: `println!(\"{} DENY\", i);`.",
  },
  {
    match: (out) => {
      const lines = out.trim().split("\n").filter(Boolean);
      return lines.length > 0 && lines.every((l) => /^(DENY|WARN|GRANT|OVERRIDE)$/i.test(l.trim()));
    },
    response: "you're printing labels but not the code numbers. each line needs both: `println!(\"{} DENY\", i);` gives `1 DENY`.",
  },
  {
    match: (out) => /\b(deny|warn|grant|override)\b/.test(out),
    response: "the labels need to be in capitals: DENY, WARN, GRANT, OVERRIDE.",
  },
  {
    match: (out) => out.trim().split("\n").length === 9 && /9 GRANT/.test(out) && !/OVERRIDE/.test(out),
    response: "code 10 never printed — your range stops at 9. `1..=10`.",
  },
  {
    match: (out) => LABELS.every((l) => out.includes(l)),
    response: "all four labels are there, but the mapping is off. check: 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
  },
  {
    match: (out) => /DENY|WARN|GRANT|OVERRIDE/i.test(out),
    response: "some labels are there but not all. i need DENY, WARN, GRANT, and OVERRIDE.",
  },
  {
    match: (out) => out.trim().length > 0,
    response: "you're printing numbers but not classifying. branch inside the loop with `if` / `else if` / `else`.",
  },
];

const ch02Classify: StepBank = {
  intro:
    "the keypad's cycling. now modify your loop — for each code, print the number and its access level separated by a space.\n\n1-3: DENY\n4-6: WARN\n7-9: GRANT\n10: OVERRIDE\n\nso line 1 is `1 DENY`, line 4 is `4 WARN`... you get it.",

  conceptFAQ: [
    {
      keywords: ["if", "else", "condition", "branch", "decide", "else if"],
      response: "`if i <= 3 { } else if i <= 6 { } else { }` — the first condition that's true wins. no brackets around the condition.",
    },
    {
      keywords: ["print", "number and", "label", "together", "format", "space"],
      response: "one slot for the number, the word as plain text: `println!(\"{} DENY\", i);` prints `1 DENY`.",
    },
    {
      keywords: ["10", "override", "last", "catch"],
      response: "a final `else { }` runs when nothing above matched — that's where 10 lands.",
    },
    {
      keywords: ["elif", "elseif", "else if"],
      response: "rust spells it `else if`, two words. each branch gets its own braces.",
    },
    {
      keywords: ["match", "switch"],
      response: "a `match` works too — but plain `if` / `else if` is enough here. you'll rebuild it as a match next.",
    },
    {
      keywords: ["and", "&&", "between", "range"],
      response: "you don't need `&&` — the chain checks top to bottom, so `else if i <= 6` already knows `i` is over 3.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "inside the loop, branch on `i`: DENY up to 3, WARN up to 6, GRANT up to 9, and `else` for OVERRIDE.",
    },
  ],

  outputPatterns: classifyOutputPatterns,

  codePatterns: [
    { match: (code) => !hasMain(code), response: "keep everything inside `fn main() { }`." },
    { match: (code) => !/\bfor\b/.test(maskRs(code)), response: "keep your loop — `for i in 1..=10` — and classify inside it." },
    {
      match: (code) => /\belif\b|\belseif\b/.test(maskRs(code)),
      response: "rust spells it `else if` — two words.",
    },
    {
      match: (code) => /\b(if|else)\b[^{\n]*:\s*$/m.test(maskRs(code)),
      response: "rust blocks use braces, not colons: `if i <= 3 { ... }`.",
    },
    { match: (code) => printsWithoutFormat(code), response: "`println!` needs the text first: `println!(\"{} DENY\", i);`." },
    { match: (code) => slotMismatch(code), response: SLOT_HELP },
    {
      match: (code) => LABELS.some((l) => stringsOf(code).some((s) => new RegExp(`\\b${l.toLowerCase()}\\b`).test(s))) && !allLabels(code),
      response: "the labels need to be in capitals: DENY, WARN, GRANT, OVERRIDE.",
    },
    {
      match: (code) => !allLabels(code),
      response: "i need all four levels in there: DENY, WARN, GRANT, and OVERRIDE.",
    },
    { match: (code) => HELLO_RE.test(noComments(code)), response: HELLO_LEFTOVER },
    { match: (code) => isCorrect(simulateClassify(code)), response: CH02_CLASSIFY_DONE },
    {
      match: (code) => simulateClassify(code) !== null,
      response: "every label's there, but some codes land in the wrong one. walk it through: 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
    },
    {
      match: (code) => !!rangeLoop(code) && allLabels(code) && printsSomething(code),
      response: CH02_CLASSIFY_DONE,
    },
  ],

  correctResponse: CH02_CLASSIFY_DONE,

  genericWrong: [
    "the keypad rejected it. check your boundaries: 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
    "not quite. each line is the number, a space, and its level.",
  ],

  rushDialogue: ["they're checking the cells. classify them. now.", "hurry — `if`, `else if`, `else`. four levels."],

  stuckResponses: [
    "inside the loop:\n```\nif i <= 3 {\n    println!(\"{} DENY\", i);\n} else if i <= 6 {\n    println!(\"{} WARN\", i);\n} else if i <= 9 {\n    println!(\"{} GRANT\", i);\n} else {\n    println!(\"{} OVERRIDE\", i);\n}\n```",
    "the chain checks top to bottom and stops at the first true condition. that's why `i <= 6` is enough for WARN.",
  ],

  deflections: ["later. the keypad first.", "focus. four levels, ten codes."],
};

const CH02_REWRITE_DONE = "redundancy check cleared. the door mechanism just clicked.\n\n||COMPLETE||";

const ch02Rewrite: StepBank = {
  intro:
    "redundancy protocol. the keypad wants the same classification built a second way — so if one breaks, the other still opens the door.\n\nrebuild it as a `match` on `i`: one arm per range, like `1..=3 => \"DENY\"`, and `_` catches the rest. same output. i'm putting +2:00 on the clock for this one.",

  conceptFAQ: [
    {
      keywords: ["match", "what is", "pattern"],
      response: "a `match` checks a value against patterns, top to bottom, and runs the first arm that fits: `match i { 1..=3 => ..., _ => ... }`.",
    },
    {
      keywords: ["_", "underscore", "default", "catch", "else", "rest", "10"],
      response: "`_` matches anything. rust makes a match cover every possible value, so `_` is the catch-all — 10 lands there.",
    },
    {
      keywords: ["range", "1..=3", "..=", "dots"],
      response: "an arm can match a whole range: `4..=6 => \"WARN\"`. the `=` includes the end.",
    },
    {
      keywords: ["value", "return", "let", "level", "give back"],
      response: "a match can hand back a value: `let level = match i { 1..=3 => \"DENY\", ... };` then `println!(\"{} {}\", i, level);`.",
    },
    {
      keywords: ["switch", "case"],
      response: "rust has no switch. `match` is the one — and the compiler checks you covered every case.",
    },
    {
      keywords: ["comma", "arrow", "=>", "syntax"],
      response: "each arm is `pattern => value,` — the fat arrow, then a comma after each arm.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "inside the loop: `let level = match i { ... };` with four arms, then print `i` and `level`.",
    },
  ],

  outputPatterns: classifyOutputPatterns,

  codePatterns: [
    { match: (code) => !hasMain(code), response: "keep everything inside `fn main() { }`." },
    { match: (code) => !/\bfor\b/.test(maskRs(code)), response: "keep the loop — `for i in 1..=10` — and put the match inside it." },
    {
      match: (code) => /\b(switch|case)\b/.test(maskRs(code)) && !/\bmatch\b/.test(maskRs(code)),
      response: "rust has no switch — its version is `match i { 1..=3 => \"DENY\", ... }`.",
    },
    {
      match: (code) => !/\bmatch\b/.test(maskRs(code)),
      response: "that's still the if chain. the redundancy protocol wants a `match`: `match i { 1..=3 => \"DENY\", ... }`.",
    },
    {
      match: (code) => {
        const parsed = matchArms(code);
        return !!parsed && parsed.arms.length === 0;
      },
      response: "match arms use a fat arrow: `1..=3 => \"DENY\",`.",
    },
    {
      match: (code) => (matchArms(code)?.arms ?? []).some((a) => /^\d+\s*-\s*\d+$/.test(a.pattern)),
      response: "`1-3` is subtraction. write the range with dots: `1..=3`.",
    },
    {
      match: (code) => (matchArms(code)?.arms ?? []).some((a) => /^\d+\s*\.\.\s*\d+$/.test(a.pattern)),
      response: "use `..=` in a pattern so the end is included: `1..=3`, not `1..3`.",
    },
    {
      match: (code) => {
        const parsed = matchArms(code);
        return !!parsed && parsed.arms.length > 0 && !parsed.arms.some((a) => /^(_|[a-z_]\w*)$/.test(a.pattern) || /\.\.$/.test(a.pattern));
      },
      response: "rust won't compile a match that misses a value — an integer could be anything. finish with a catch-all: `_ => \"OVERRIDE\",`.",
    },
    { match: (code) => printsWithoutFormat(code), response: "`println!` needs the text first: `println!(\"{} {}\", i, level);`." },
    { match: (code) => slotMismatch(code), response: SLOT_HELP },
    { match: (code) => !allLabels(code), response: "i need all four levels in the match: DENY, WARN, GRANT, and OVERRIDE." },
    { match: (code) => HELLO_RE.test(noComments(code)), response: HELLO_LEFTOVER },
    {
      match: (code) => {
        const loop = rangeLoop(code);
        return !!loop && isCorrect(simulateMatch(loop.body, loop.variable));
      },
      response: CH02_REWRITE_DONE,
    },
    {
      match: (code) => {
        const loop = rangeLoop(code);
        return !!loop && simulateMatch(loop.body, loop.variable) !== null;
      },
      response: "the match runs, but some codes land in the wrong arm. arms are checked top to bottom: 1-3 DENY, 4-6 WARN, 7-9 GRANT, then `_` for 10.",
    },
    {
      match: (code) => !!rangeLoop(code) && /\bmatch\b/.test(maskRs(code)) && allLabels(code),
      response: CH02_REWRITE_DONE,
    },
  ],

  correctResponse: CH02_REWRITE_DONE,

  genericWrong: [
    "the redundancy check failed. same output as before — just built with a `match`.",
    "not quite. one arm per range, `_` for the rest, and print the number with its level.",
  ],

  rushDialogue: ["+2:00 won't last. match it.", "hurry. four arms. `_` last."],

  stuckResponses: [
    "inside the loop:\n```\nlet level = match i {\n    1..=3 => \"DENY\",\n    4..=6 => \"WARN\",\n    7..=9 => \"GRANT\",\n    _ => \"OVERRIDE\",\n};\nprintln!(\"{} {}\", i, level);\n```",
    "the match decides, the print just reports. `level` holds whatever word the arm handed back.",
  ],

  deflections: ["after the door. match first.", "focus. same output, new shape."],
};

// ══════════════════════════════════════════════════════════════
//  Chapter 03
// ══════════════════════════════════════════════════════════════

const CH03_SCAFFOLD_DONE =
  "terminal initialized. the shaft panel recognizes the program.\n\nnow i need you to write a function.\n\n||COMPLETE||";

const ch03Scaffold: StepBank = {
  intro:
    "we're in the ventilation shaft now. the junction panels run rust — same as before.\n\nget the panel live by printing `Hello World`.",

  conceptFAQ: [
    { keywords: ["print", "output"], response: "`println!(\"Hello World\");` inside `fn main`." },
    { keywords: ["main", "function", "entry", "fn"], response: "`fn main() { }` is still where it starts. your own functions will sit beside it." },
    { keywords: ["bang", "macro", "exclamation"], response: "the bang marks a macro. `println` is one, so it's always `println!(...)`." },
    { keywords: ["junction", "shaft", "panel"], response: "the junction math comes next. first get the panel live." },
  ],

  codePatterns: scaffoldPatterns(CH03_SCAFFOLD_DONE),
  correctResponse: CH03_SCAFFOLD_DONE,
  genericWrong: SCAFFOLD_GENERIC,
  rushDialogue: [],
  stuckResponses: [
    "```\nfn main() {\n    println!(\"Hello World\");\n}\n```",
    "`fn main`, braces, one `println!`. same as the keypad.",
  ],
  deflections: ["focus. panel first."],
};

const CH03_SUM_DONE = "sum function works. 115 — checks out.\n\nnow i need validation.\n\n||COMPLETE||";

const ch03Sum: StepBank = {
  intro:
    "good. terminal's ready.\n\neach junction needs its codes added up before it'll open. write a function `sum_codes` that takes a slice of numbers — `codes: &[i32]` — and returns their sum as an `i32`.",

  conceptFAQ: [
    {
      keywords: ["slice", "&[i32]", "any number", "many", "list", "array", "variadic"],
      response: "rust has no \"any number of arguments\". pass a slice instead: `fn sum_codes(codes: &[i32]) -> i32`. callers write `sum_codes(&[1, 2, 3])`.",
    },
    {
      keywords: ["fn", "function", "define", "declare"],
      response: "`fn name(param: Type) -> ReturnType { }`. the `->` says what the function hands back.",
    },
    {
      keywords: ["loop", "for", "iterate", "each"],
      response: "`for c in codes { }` walks the slice one value at a time.",
    },
    {
      keywords: ["sum", "add", "total", "accumulate"],
      response: "`let mut total = 0;` before the loop, `total += c;` inside it, and `total` on its own as the last line.",
    },
    {
      keywords: ["mut", "mutable", "change", "immutable", "assign twice"],
      response: "rust variables are frozen unless you say otherwise. `let mut total = 0;` lets it grow as you add.",
    },
    {
      keywords: ["return", "give back", "hand back", "semicolon"],
      response: "the last line of a function, with no semicolon, is what it returns. `total` alone works. add a `;` and it returns nothing.",
    },
    {
      keywords: ["iter", "sum()", "shorter", "one line"],
      response: "there's a shortcut once the loop makes sense: `codes.iter().sum()` adds the whole slice.",
    },
    {
      keywords: ["snake", "snake_case", "sumcodes", "camel", "underscore", "name"],
      response: "rust names functions in snake_case — lowercase words joined by underscores. the junction calls `sum_codes`.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`fn sum_codes(codes: &[i32]) -> i32`, a `let mut total = 0;`, a `for` loop adding each code, and `total` as the last line.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => out.trim() === "Sum: 0\nSum: 0\nSum: 0",
      response: "every sum is 0. the loop never adds to `total` — `total += c;` inside it.",
    },
    {
      match: (out) => out.trim() === "Sum: 25\nSum: 1\nSum: 100",
      response: "it's handing back the first code and quitting. the `return` is inside the loop — move it after the loop.",
    },
    {
      match: (out) => out.trim() === "Sum: 10\nSum: 3\nSum: 100",
      response: "only the last code is left. `total = c` replaces it each time — `total += c` adds it.",
    },
    {
      match: (out) => /^Sum: -?\d+$/m.test(out),
      response: "the totals are off. every code needs to be added once: 25 + 30 + 50 + 10 is 115.",
    },
  ],

  codePatterns: [
    {
      match: (code) => /\b(def|func|function)\s+\w+\s*\(/.test(maskRs(code)),
      response: "rust declares functions with `fn`: `fn sum_codes(codes: &[i32]) -> i32 { }`.",
    },
    {
      match: (code) => /\bfn\s+sumCodes\b/.test(maskRs(code)),
      response: "rust names functions in snake_case — the junction calls `sum_codes`, with an underscore.",
    },
    { match: (code) => fnDef(code, "sum_codes") === null, response: "i need a function called `sum_codes`: `fn sum_codes(codes: &[i32]) -> i32 { }`." },
    {
      match: (code) => /\.\.\.|\*\w|\bcodes\s*\.\.\./.test(fnDef(code, "sum_codes")!.params),
      response: "rust has no variadic functions. take a slice instead: `codes: &[i32]`.",
    },
    {
      match: (code) => /\bVec\s*</.test(fnDef(code, "sum_codes")!.params),
      response: "take a slice, not a Vec: `codes: &[i32]`. the junction passes `&[25, 30, 50, 10]`.",
    },
    {
      match: (code) => /:\s*\[\s*\w+/.test(fnDef(code, "sum_codes")!.params),
      response: "borrow the slice — add a `&`: `codes: &[i32]`. the junction lends you the numbers, it doesn't hand them over.",
    },
    {
      match: (code) => !takesSlice(fnDef(code, "sum_codes")!),
      response: "the parameter needs a name and a type: `codes: &[i32]`.",
    },
    {
      match: (code) => fnDef(code, "sum_codes")!.ret === null,
      response: "your function doesn't say what it hands back. add `-> i32` after the brackets.",
    },
    {
      match: (code) => addsWithoutMut(fnDef(code, "sum_codes")!.body),
      response: "`total` can't change unless you say so. declare it `let mut total = 0;`.",
    },
    {
      match: (code) => returnsInsideLoop(fnDef(code, "sum_codes")!.body),
      response: "the `return` is inside the loop, so it quits after the first code. return after the loop ends.",
    },
    {
      match: (code) => tailHasSemicolon(fnDef(code, "sum_codes")!),
      response: "drop the semicolon after the last line. with it, the function returns nothing — without it, `total` is the answer.",
    },
    {
      match: (code) => /\bprintln!/.test(fnDef(code, "sum_codes")!.body) && !returnsValue(fnDef(code, "sum_codes")!),
      response: "printing isn't returning. the junction needs the number back — end the function with `total`.",
    },
    { match: (code) => sumCodesWorks(code), response: CH03_SUM_DONE },
  ],

  correctResponse: CH03_SUM_DONE,

  genericWrong: [
    "the junction didn't accept it. `sum_codes` should add every code in the slice and return the total.",
    "not quite. slice in, `i32` out, everything added once.",
  ],

  rushDialogue: ["the fans are spinning up. sum it.", "hurry — add them all and hand back the total."],

  stuckResponses: [
    "```\nfn sum_codes(codes: &[i32]) -> i32 {\n    let mut total = 0;\n    for c in codes {\n        total += c;\n    }\n    total\n}\n```",
    "`mut` lets total grow, the loop adds each code, and the last line — no semicolon — hands it back.",
  ],

  deflections: ["not now. the junction first.", "focus. one function."],
};

const CH03_VALIDATE_DONE =
  "junction codes accepted. sum checks out — over 100. the shaft gate is opening.\n\n||COMPLETE||";

function validateWorks(code: string): boolean {
  const fn = fnDef(code, "validate_code");
  if (!fn || !takesSlice(fn) || !fn.ret || !/^\(\s*\w+\s*,\s*bool\s*\)$/.test(fn.ret)) return false;
  if (!/>\s*100\b|100\s*</.test(fn.body)) return false;
  const t = tail(fn.body);
  const returnsTuple = /\breturn\s*\(/.test(fn.body) || (!t.semicolon && /^\(.*,.*\)$/.test(t.text));
  return returnsTuple && sumCodesWorks(code);
}

const ch03Validate: StepBank = {
  intro:
    "sum works. the gate only opens if the codes total more than 100 — so add `validate_code(codes: &[i32]) -> (i32, bool)`. reuse `sum_codes` inside it, then hand back both as a tuple: `(total, total > 100)`.",

  conceptFAQ: [
    {
      keywords: ["tuple", "two values", "both", "multiple", "pair"],
      response: "a tuple holds a few values together: the type `(i32, bool)`, the value `(total, total > 100)`. the caller unpacks it with `let (s, v) = ...`.",
    },
    {
      keywords: ["reuse", "sum_codes", "call", "inside"],
      response: "pass the slice straight through: `let total = sum_codes(codes);` — it's already a `&[i32]`.",
    },
    {
      keywords: ["bool", "true", "false", "valid", "compare", "greater"],
      response: "a comparison already is a bool: `total > 100` is `true` or `false`.",
    },
    {
      keywords: ["return", "give back", "semicolon"],
      response: "end the function with `(total, total > 100)` and no semicolon — the last expression is what comes back.",
    },
    {
      keywords: ["100", "boundary", "equal", ">="],
      response: "more than 100, not equal to it. `>`, not `>=`.",
    },
    {
      keywords: ["destructure", "unpack", "let (", "s, v"],
      response: "`let (s, v) = validate_code(&[25, 30, 50, 10]);` splits the tuple into two names in one go.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "keep `sum_codes`. add `fn validate_code(codes: &[i32]) -> (i32, bool)`, sum inside it, and end with `(total, total > 100)`.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /Result: 60, Valid: true/.test(out),
      response: "60 passed — it shouldn't. the gate needs more than 100: `total > 100`.",
    },
    {
      match: (out) => /Result: 115, Valid: false/.test(out),
      response: "115 failed — it should pass. check the comparison: `total > 100`.",
    },
    {
      match: (out) => /Result: (?!115)\d+/.test(out),
      response: "the total is wrong. reuse `sum_codes(codes)` so the sum comes out the same as before.",
    },
  ],

  codePatterns: [
    { match: (code) => fnDef(code, "sum_codes") === null, response: "keep `sum_codes` — the junction still calls it, and `validate_code` should reuse it." },
    {
      match: (code) => /\bfn\s+validateCode\b/.test(maskRs(code)),
      response: "snake_case again — the junction calls `validate_code`.",
    },
    {
      match: (code) => fnDef(code, "validate_code") === null,
      response: "i need a second function: `fn validate_code(codes: &[i32]) -> (i32, bool) { }`.",
    },
    {
      match: (code) => !takesSlice(fnDef(code, "validate_code")!),
      response: "`validate_code` takes the same slice as `sum_codes`: `codes: &[i32]`.",
    },
    {
      match: (code) => {
        const ret = fnDef(code, "validate_code")!.ret;
        return ret === null || !/^\(/.test(ret);
      },
      response: "it has to hand back two things. make the return type a tuple: `-> (i32, bool)`.",
    },
    {
      match: (code) => /\breturn\s+\w+\s*,/.test(fnDef(code, "validate_code")!.body),
      response: "rust returns two values as one tuple — wrap them in brackets: `(total, total > 100)`.",
    },
    {
      match: (code) => /\[\s*\w+\s*,\s*\w+\s*>/.test(fnDef(code, "validate_code")!.body),
      response: "square brackets make an array. a tuple uses round brackets: `(total, total > 100)`.",
    },
    {
      match: (code) => /\bsum_codes\s*\(\s*(\*|\.\.\.)/.test(maskRs(code)),
      response: "no spreading needed — pass the slice straight through: `sum_codes(codes)`.",
    },
    {
      match: (code) => />=\s*100\b/.test(fnDef(code, "validate_code")!.body),
      response: "more than 100 — not equal to it. use `>`, not `>=`.",
    },
    {
      match: (code) => !/>\s*100\b|100\s*</.test(fnDef(code, "validate_code")!.body),
      response: "the check is `total > 100`. put it in the tuple: `(total, total > 100)`.",
    },
    {
      match: (code) => tailHasSemicolon(fnDef(code, "validate_code")!),
      response: "drop the semicolon after the tuple on the last line — with it, the function returns nothing.",
    },
    {
      match: (code) => !sumCodesWorks(code),
      response: "`sum_codes` isn't adding up anymore. it still has to return the total of the slice.",
    },
    { match: (code) => validateWorks(code), response: CH03_VALIDATE_DONE },
  ],

  correctResponse: CH03_VALIDATE_DONE,

  genericWrong: [
    "the gate didn't move. `validate_code` should return the total and whether it's over 100.",
    "not quite. sum the slice, then hand back `(total, total > 100)`.",
  ],

  rushDialogue: ["the shaft's heating up. validate it.", "hurry — total, and is it over 100."],

  stuckResponses: [
    "```\nfn validate_code(codes: &[i32]) -> (i32, bool) {\n    let total = sum_codes(codes);\n    (total, total > 100)\n}\n```",
    "the return type `(i32, bool)` and the last line `(total, total > 100)` have the same shape. that's the whole trick.",
  ],

  deflections: ["after the gate.", "focus. two values back, then we move."],
};

// ── Registry ──

export const RUST_BANKS: Record<string, StepBank> = {
  "chapter-01:scaffold": ch01Scaffold,
  "chapter-01:location": ch01Location,
  "chapter-02:scaffold": ch02Scaffold,
  "chapter-02:loop": ch02Loop,
  "chapter-02:classify": ch02Classify,
  "chapter-02:rewrite": ch02Rewrite,
  "chapter-03:scaffold": ch03Scaffold,
  "chapter-03:sumfunc": ch03Sum,
  "chapter-03:validate": ch03Validate,
};
