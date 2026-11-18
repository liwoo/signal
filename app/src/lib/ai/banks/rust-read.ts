// ── Reading the player's Rust ──
// Shared by the Rust answer banks (rust.ts = Act I, rust-act2.ts, rust-act3.ts):
// comment/string masking, print-call parsing, fn lookup, the scaffold patterns.

import type { CodePattern } from "./types";

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
export function stringsOf(code: string): string[] {
  return [...noComments(code).matchAll(/"((?:[^"\\]|\\[\s\S])*)"/g)].map((m) => m[1]);
}

export const hasMain = (code: string) => /\bfn\s+main\s*\(\s*\)/.test(maskRs(code));
export const printsSomething = (code: string) => /\b(e?print(ln)?)!\s*\(/.test(maskRs(code));

/** Index just past the bracket matching the opener at `open` (strings respected). */
export function matchClose(code: string, open: number): number {
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
export function splitArgs(inner: string): string[] {
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

export interface PrintCall {
  /** The format string's contents, or null when the first argument isn't a string literal. */
  format: string | null;
  args: string[];
}

/** Every `println!(…)` / `print!(…)` call. */
export function printCalls(code: string): PrintCall[] {
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
export function positionalSlots(format: string): number {
  const f = format.replace(/\{\{|\}\}/g, "");
  return [...f.matchAll(/\{([^{}]*)\}/g)].filter((m) => !/^[A-Za-z_]/.test(m[1])).length;
}

/** A print call whose `{}` count and value count disagree — rustc refuses it. */
export function slotMismatch(code: string): boolean {
  return printCalls(code).some((c) => c.format !== null && positionalSlots(c.format) !== c.args.length);
}

/** `println!(i)` — the first argument has to be a string literal. */
export const printsWithoutFormat = (code: string) => printCalls(code).some((c) => c.format === null);

/** A `{path::to}` inline slot — only bare names can sit inside the braces. */
export const inlinePathSlot = (code: string) =>
  printCalls(code).some((c) => c.format !== null && /\{[A-Za-z_]\w*(::|\.)\w+[^}]*\}/.test(c.format));

export const HELLO_RE = /\bprintln!\s*\(\s*"Hello World"\s*\)|\bprintln!\s*\(\s*"\{\}"\s*,\s*"Hello World"\s*\)/;

export const LABELS = ["DENY", "WARN", "GRANT", "OVERRIDE"] as const;
export type Label = (typeof LABELS)[number];

export function expectedLabel(i: number): Label {
  if (i <= 3) return "DENY";
  if (i <= 6) return "WARN";
  if (i <= 9) return "GRANT";
  return "OVERRIDE";
}

export const hasLabel = (code: string, label: string) => stringsOf(code).some((s) => new RegExp(`\\b${label}\\b`).test(s));
export const allLabels = (code: string) => LABELS.every((l) => hasLabel(code, l));

// ── for loops over a range ──

export interface RsFor {
  variable: string;
  /** Values the loop visits, or null when the iterator isn't a plain integer range. */
  values: number[] | null;
  body: string;
}

export function forLoops(code: string): RsFor[] {
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

export const rangeLoop = (code: string) => forLoops(code).find((f) => f.values !== null);

/** What the loop body prints for each value: v itself, or v + 1 (counting from 0). */
export function printedShift(loop: RsFor): number | null {
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

export type Pred = (i: number) => boolean;

/** A tiny parser for `i <= 3`, `i >= 4 && i <= 6`, `(1..=3).contains(&i)`, `i == 10 || i > 9`. */
export function parseCondition(text: string, variable: string): Pred | null {
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

export const firstLabel = (text: string): Label | null => {
  for (const s of stringsOf(text)) {
    const m = s.match(/\b(DENY|WARN|GRANT|OVERRIDE)\b/);
    if (m) return m[1] as Label;
  }
  return null;
};

/** The labels an if / else if / else chain assigns to 1..=10, or null if it can't be read. */
export function simulateIfChain(body: string, variable: string): Label[] | null {
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
export function patternPred(pat: string, variable: string): Pred | null {
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

export interface MatchArm {
  pattern: string;
  label: Label | null;
}

/** The arms of the first `match <var> { … }`. */
export function matchArms(code: string): { variable: string; arms: MatchArm[] } | null {
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

export function simulateMatch(code: string, loopVar: string): Label[] | null {
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

export const isCorrect = (sim: Label[] | null) => sim !== null && sim.every((l, k) => l === expectedLabel(k + 1));

/** The classification the loop body produces, via a match or an if chain. */
export function simulateClassify(code: string): Label[] | null {
  const loop = rangeLoop(code);
  if (!loop) return null;
  const viaMatch = /\bmatch\b/.test(maskRs(loop.body)) ? simulateMatch(loop.body, loop.variable) : null;
  return viaMatch ?? simulateIfChain(loop.body, loop.variable);
}

// ── functions ──

export interface RsFn {
  params: string;
  ret: string | null;
  body: string;
}

export function fnDef(code: string, name: string): RsFn | null {
  const masked = maskRs(code);
  const m = masked.match(new RegExp(`\\bfn\\s+${name}\\s*\\(([^)]*)\\)\\s*(?:->\\s*([^{]+?))?\\s*\\{`));
  if (!m) return null;
  const open = m.index! + m[0].length - 1;
  return { params: m[1].trim(), ret: m[2]?.trim() ?? null, body: masked.slice(open + 1, matchClose(masked, open) - 1) };
}

/** The last statement of a body, and whether it ends with a semicolon. */
export function tail(body: string): { text: string; semicolon: boolean } {
  const trimmed = body.trim();
  const semicolon = trimmed.endsWith(";");
  const lines = trimmed.replace(/;$/, "").split(/;|\n/).map((l) => l.trim()).filter(Boolean);
  return { text: lines[lines.length - 1] ?? "", semicolon };
}

/** Does the function hand back `name` (or the expression) as its value? */
export function returnsValue(fn: RsFn): boolean {
  if (/\breturn\b/.test(fn.body) && !/\bfor\b[^{]*\{[^}]*\breturn\b/.test(fn.body)) return true;
  const t = tail(fn.body);
  return !t.semicolon && t.text !== "" && !t.text.endsWith("}");
}

export const takesSlice = (fn: RsFn) => /:\s*&\s*\[\s*\w+\s*\]/.test(fn.params);
export const intReturn = (fn: RsFn) => fn.ret !== null && /^(i|u)(8|16|32|64|128|size)$/.test(fn.ret);

export function sumCodesWorks(code: string): boolean {
  const fn = fnDef(code, "sum_codes");
  if (!fn || !takesSlice(fn) || !intReturn(fn) || !returnsValue(fn)) return false;
  const viaIter = /\.\s*(iter|into_iter)\s*\(\s*\)\s*\.\s*(sum|fold)\b/.test(fn.body) || /\.\s*(sum|fold)\b/.test(fn.body);
  const viaLoop = /\bfor\b/.test(fn.body) && /\+=|=\s*\w+\s*\+/.test(fn.body) && /\blet\s+mut\b/.test(fn.body);
  return viaIter || viaLoop;
}

export const returnsInsideLoop = (body: string) => /\bfor\b[^{]*\{[^}]*\breturn\b/.test(body);
export const addsWithoutMut = (body: string) => /\blet\s+(?!mut\b)(\w+)\s*(?::\s*\w+)?\s*=\s*0\s*;/.test(body) && /\+=/.test(body) && !/\blet\s+mut\b/.test(body);

export function tailHasSemicolon(fn: RsFn): boolean {
  if (/\breturn\b/.test(fn.body)) return false;
  const t = tail(fn.body);
  return t.semicolon && /^(total|sum|\(.*\)|\w+\s*\.\s*iter.*)$/.test(t.text);
}

export const SLOT_HELP =
  "the `{}` slots and the values don't line up. one `{}` for every value you pass after the text: `println!(\"{} {}\", a, b)`.";

export const HELLO_LEFTOVER =
  "the hello world from before is still printing — the keypad only wants the codes. delete that line.";

// ══════════════════════════════════════════════════════════════
//  Shared scaffold lines
// ══════════════════════════════════════════════════════════════

export function scaffoldPatterns(done: string): CodePattern[] {
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

export const SCAFFOLD_GENERIC = [
  "the terminal didn't get `Hello World`. `fn main() { println!(\"Hello World\"); }` — that's the whole program.",
  "not quite. a `fn main` with one `println!` inside it, text in double quotes.",
];

