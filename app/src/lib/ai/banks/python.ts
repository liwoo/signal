// ── Maya's answer banks · Python ──
// Same story beats and stakes as the Go banks in ../engine.ts, teaching Python
// and agreeing with src/data/challenges/python/act-1.ts. When the interpreter
// can't load (offline), the engine falls back to these codePatterns — so each
// step's ||COMPLETE|| pattern recognizes a genuinely correct program, and the
// patterns above it catch the classic mistakes first (first match wins).

import { tokenize } from "@/lib/python/tokenizer";
import { blockAt, defBody, maskPy } from "@/lib/game/zen-python";
import type { CodePattern, OutputPattern, StepBank } from "./types";

// ══════════════════════════════════════════════════════════════
//  Shape helpers
// ══════════════════════════════════════════════════════════════

/** The code with comments blanked (strings kept), offsets preserved. */
function noComments(code: string): string {
  let out = "";
  let prev = 0;
  for (const t of tokenize(code)) {
    out += code.slice(prev, t.start) + (t.type === "comment" ? " ".repeat(t.value.length) : t.value);
    prev = t.end;
  }
  return out + code.slice(prev);
}

/** Every string literal's raw text, quotes and prefix included. */
function stringsOf(code: string): string[] {
  return tokenize(code).filter((t) => t.type === "string").map((t) => t.value);
}

const isFString = (s: string) => /^[rRbB]?[fF][rRbB]?["']/.test(s);

/** Visible text of a string literal: the f-string's `{...}` fields removed. */
function literalText(s: string): string {
  const body = s.replace(/^[rRbBuUfF]{0,2}("""|'''|"|')/, "").replace(/("""|'''|"|')$/, "");
  return isFString(s) ? body.replace(/\{[^{}]*\}/g, " ") : body;
}

/** True when `code` has a `print(...)` call (outside strings and comments). */
const printsSomething = (code: string) => /\bprint\s*\(/.test(maskPy(code));

const LABELS = ["DENY", "WARN", "GRANT", "OVERRIDE"] as const;
type Label = (typeof LABELS)[number];

function expectedLabel(i: number): Label {
  if (i <= 3) return "DENY";
  if (i <= 6) return "WARN";
  if (i <= 9) return "GRANT";
  return "OVERRIDE";
}

function hasLabel(code: string, label: string): boolean {
  return stringsOf(code).some((s) => new RegExp(`\\b${label}\\b`).test(literalText(s)));
}

// ── loops ──

interface PyFor {
  /** 0-based line index. */
  at: number;
  name: string;
  iter: string;
  /** Masked body (strings blanked). */
  body: string;
  /** Body with strings kept, comments blanked. */
  rawBody: string;
}

function blockColonOf(line: string): number {
  let depth = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    else if (ch === ":" && depth === 0 && line[i + 1] !== "=") return i;
  }
  return -1;
}

function forLoops(code: string): PyFor[] {
  const masked = maskPy(code).split("\n");
  const raw = noComments(code).split("\n");
  const out: PyFor[] = [];
  masked.forEach((line, at) => {
    const m = line.match(/^(\s*)for\s+(\w+)\s+in\s+/);
    if (!m) return;
    const colon = blockColonOf(line);
    if (colon < 0) return;
    out.push({
      at,
      name: m[2],
      iter: line.slice(m[0].length, colon).trim(),
      body: blockAt(masked, at),
      rawBody: blockAt(raw, at),
    });
  });
  return out;
}

/** `range(a, b)` → [a, b]; `range(b)` → [0, b]; anything else → null. */
function rangeBounds(iter: string): [number, number] | null {
  const m = iter.match(/^range\s*\(\s*(-?\d+)\s*(?:,\s*(-?\d+)\s*)?\)$/);
  if (!m) return null;
  return m[2] === undefined ? [0, Number(m[1])] : [Number(m[1]), Number(m[2])];
}

/** The loop over `range(...)` the step is about, if any. */
const rangeLoop = (code: string) => forLoops(code).find((f) => /^range\s*\(/.test(f.iter));

const hasRange1to10 = (code: string) => {
  const loop = rangeLoop(code);
  const b = loop && rangeBounds(loop.iter);
  return !!b && b[0] === 1 && b[1] === 11;
};

// ── if / elif / else chains (simulated over codes 1..10) ──

type Pred = (i: number) => boolean;

function parseCompare(text: string): Pred | null {
  const ops: Record<string, (a: number, b: number) => boolean> = {
    "<=": (a, b) => a <= b, "<": (a, b) => a < b, ">=": (a, b) => a >= b,
    ">": (a, b) => a > b, "==": (a, b) => a === b, "!=": (a, b) => a !== b,
  };
  const t = text.trim().replace(/^\((.*)\)$/, "$1").trim();
  let m = t.match(/^(-?\d+)\s*(<=|<)\s*[a-z_]\w*\s*(<=|<)\s*(-?\d+)$/i);
  if (m) {
    const [lo, op1, op2, hi] = [Number(m[1]), m[2], m[3], Number(m[4])];
    return (i) => ops[op1](lo, i) && ops[op2](i, hi);
  }
  m = t.match(/^[a-z_]\w*\s*(<=|<|>=|>|==|!=)\s*(-?\d+)$/i);
  if (m) {
    const [op, n] = [m[1], Number(m[2])];
    return (i) => ops[op](i, n);
  }
  m = t.match(/^(-?\d+)\s*(<=|<|>=|>|==|!=)\s*[a-z_]\w*$/i);
  if (m) {
    const [n, op] = [Number(m[1]), m[2]];
    return (i) => ops[op](n, i);
  }
  m = t.match(/^[a-z_]\w*\s+in\s+(.+)$/i);
  if (m) {
    const r = rangeBounds(m[1].trim());
    if (r) return (i) => i >= r[0] && i < r[1];
    const list = m[1].trim().match(/^[([{]\s*([\d\s,]+)[)\]}]$/);
    if (list) {
      const set = new Set(list[1].split(",").map((s) => s.trim()).filter(Boolean).map(Number));
      return (i) => set.has(i);
    }
  }
  return null;
}

function parseCondition(text: string): Pred | null {
  const ors = text.split(/\s+or\s+/);
  const parsed = ors.map((part) => {
    const ands = part.split(/\s+and\s+/).map(parseCompare);
    return ands.some((p) => !p) ? null : (i: number) => ands.every((p) => p!(i));
  });
  return parsed.some((p) => !p) ? null : (i) => parsed.some((p) => p!(i));
}

/**
 * Run every if/elif/else chain against codes 1..10 and collect the label each
 * code prints. Returns null when a condition is too exotic to read offline.
 */
function simulateChains(code: string): Label[][] | null {
  const masked = maskPy(code).split("\n");
  const raw = noComments(code).split("\n");
  interface Clause { pred: Pred | "else"; label: Label | null }
  const chains: { indent: number; clauses: Clause[] }[] = [];
  for (let k = 0; k < masked.length; k++) {
    const m = masked[k].match(/^(\s*)(if|elif|else)\b/);
    if (!m) continue;
    const indent = m[1].length;
    const colon = blockColonOf(masked[k]);
    if (colon < 0) return null;
    const labelMatch = blockAt(raw, k).match(/["'][^"'\n]*?\b(DENY|WARN|GRANT|OVERRIDE)\b/);
    const label = (labelMatch?.[1] as Label | undefined) ?? null;
    let clause: Clause;
    if (m[2] === "else") clause = { pred: "else", label };
    else {
      const pred = parseCondition(masked[k].slice(m[0].length, colon));
      if (!pred) return null;
      clause = { pred, label };
    }
    if (m[2] === "if") chains.push({ indent, clauses: [clause] });
    else {
      const chain = [...chains].reverse().find((c) => c.indent === indent);
      if (!chain) return null;
      chain.clauses.push(clause);
    }
  }
  if (chains.length === 0) return null;
  const result: Label[][] = [];
  for (let i = 1; i <= 10; i++) {
    const got: Label[] = [];
    for (const chain of chains) {
      const hit = chain.clauses.find((c) => c.pred === "else" || c.pred(i));
      if (hit?.label) got.push(hit.label);
    }
    result.push(got);
  }
  return result;
}

const chainIsCorrect = (sim: Label[][]) =>
  sim.every((labels, k) => labels.length === 1 && labels[0] === expectedLabel(k + 1));

// ── dict lookup table ──

function dictEntries(code: string): Map<number, string> {
  const entries = new Map<number, string>();
  const re = /(?:^|[{,\s])(\d+)\s*:\s*["'](\w+)["']/g;
  const src = noComments(code);
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) entries.set(Number(m[1]), m[2]);
  return entries;
}

const hasDictLiteral = (code: string) => /\{[^{}]*?["']?\d+["']?\s*:/.test(noComments(code));

const tableIsComplete = (code: string) => {
  const e = dictEntries(code);
  for (let i = 1; i <= 10; i++) if (!e.has(i)) return false;
  return true;
};

const tableIsCorrect = (code: string) => {
  const e = dictEntries(code);
  for (let i = 1; i <= 10; i++) if (e.get(i) !== expectedLabel(i)) return false;
  return true;
};

/** A dict built some other way: `dict.fromkeys(...)`, a comprehension, `dict(...)`. */
const builtTableOtherwise = (code: string) =>
  /\bfromkeys\s*\(|\{[^{}]*\bfor\b[^{}]*\}|\bdict\s*\(/.test(maskPy(code));

// ── functions ──

function defParams(code: string, name: string): string | null {
  const m = maskPy(code).match(new RegExp(`^\\s*def\\s+${name}\\s*\\(([^)]*)\\)`, "m"));
  return m ? m[1].trim() : null;
}

/** The `*codes` name collected by `def name(*codes)`, or null. */
function starParam(code: string, name: string): string | null {
  const params = defParams(code, name);
  const m = params?.match(/^\*\s*(\w+)\s*(?::[^,]*)?$/);
  return m ? m[1] : null;
}

/** `return` sitting inside a `for` inside the body — quits after one pass. */
function returnsInsideLoop(body: string): boolean {
  const lines = body.split("\n");
  return lines.some((line, k) => {
    const m = line.match(/^(\s*)for\s/);
    if (!m) return false;
    const loop = blockAt(lines, k);
    return /(^|\n)\s*return\b/.test(loop) || /:\s*return\b/.test(line);
  });
}

/** `total += c` with no `total = ...` before it. */
function accumulatesUninitialised(body: string): boolean {
  const m = body.match(/\b(\w+)\s*\+=/);
  if (!m) return false;
  const before = body.slice(0, m.index);
  return !new RegExp(`\\b${m[1]}\\s*=(?!=)`).test(before);
}

/** sum_codes(*codes) adds its args up and returns the total. */
function sumCodesWorks(code: string): boolean {
  const name = starParam(code, "sum_codes");
  const body = defBody(code, "sum_codes");
  if (!name || body === null || !/\breturn\b/.test(body) || returnsInsideLoop(body)) return false;
  if (new RegExp(`\\breturn\\s+sum\\s*\\(\\s*${name}\\s*\\)`).test(body)) return true;
  const loops = new RegExp(`\\bfor\\s+\\w+\\s+in\\s+${name}\\s*:`).test(body);
  const adds = /\+=/.test(body) || /\b(\w+)\s*=\s*\1\s*\+/.test(body);
  const sumsInto = new RegExp(`\\b(\\w+)\\s*=\\s*sum\\s*\\(\\s*${name}\\s*\\)`).test(body);
  return (loops && adds && !accumulatesUninitialised(body)) || sumsInto;
}

/** Top-level comma in a `return` expression → it returns a tuple. */
function returnsTuple(body: string): boolean {
  return body.split("\n").some((line) => {
    const m = line.match(/\breturn\s+(.+)$/);
    if (!m) return false;
    let depth = 0;
    const expr = m[1].trim().replace(/^\((.*)\)$/, "$1");
    for (const ch of expr) {
      if ("([{".includes(ch)) depth++;
      else if (")]}".includes(ch)) depth--;
      else if (ch === "," && depth === 0) return true;
    }
    return false;
  });
}

const checksOver100 = (body: string) =>
  /[\w)\]]\s*>\s*100\b|\b100\s*<\s*[a-z_]|[\w)\]]\s*>=\s*101\b/i.test(body);

/** Offline fallback when a chain is too exotic to simulate: each boundary appears somewhere. */
function boundariesPresent(code: string): boolean {
  const m = maskPy(code);
  return [3, 6, 9].every((b) =>
    new RegExp(`[\\w)]\\s*(<=\\s*${b}|<\\s*${b + 1}|>\\s*${b}|>=\\s*${b + 1})\\b|\\b(${b}\\s*[<>]|${b + 1}\\s*[<>]=?)\\s*\\w|range\\s*\\([^)]*\\b${b + 1}\\s*\\)`).test(m),
  );
}

const HELLO_LEFTOVER =
  "the hello world from before is still printing — the keypad only wants the codes. delete that line.";

// ══════════════════════════════════════════════════════════════
//  Shared lines
// ══════════════════════════════════════════════════════════════

const HELLO_RE = /\bprint\s*\(\s*(?:(["'])Hello World\1|(["'])Hello\2\s*,\s*(["'])World\3)\s*\)/;

/** A function was defined but never called — python doesn't run main for you. */
function uncalledDef(code: string): boolean {
  const m = maskPy(code);
  const defs = [...m.matchAll(/^\s*def\s+(\w+)\s*\(/gm)].map((d) => d[1]);
  return defs.some((name) => (m.match(new RegExp(`\\b${name}\\s*\\(`, "g")) ?? []).length < 2);
}

function scaffoldPatterns(done: string): CodePattern[] {
  return [
    {
      match: (code) => /\bconsole\s*\.\s*log\b/.test(maskPy(code)),
      response: "`console.log` is javascript. python prints with `print(...)`.",
    },
    {
      match: (code) => /\b(fmt|System)\s*\./.test(maskPy(code)),
      response: "that's another language's print. python just has `print(...)` — no package, no import.",
    },
    {
      match: (code) => HELLO_RE.test(noComments(code)) && uncalledDef(code),
      response:
        "you wrapped it in a function but never called it — python won't run it for you. you don't need the `def` at all: one `print(\"Hello World\")` at the top is the whole program.",
    },
    { match: (code) => HELLO_RE.test(noComments(code)), response: done },
    {
      match: (code) => /\b(Print|PRINT|printf|println|echo)\s*\(/.test(maskPy(code)),
      response: "python is case-sensitive and spells it exactly one way: `print`, all lowercase.",
    },
    {
      match: (code) => /\bprint\s+["']/.test(noComments(code)),
      response: "print needs brackets in python 3: `print(\"Hello World\")`.",
    },
    {
      match: (code) => /\bprint\s*\(\s*Hello\b/i.test(noComments(code)),
      response: "text needs quotes around it — without them python thinks `Hello` is a variable name. `print(\"Hello World\")`.",
    },
    {
      match: (code) => printsSomething(code) && stringsOf(code).some((s) => /hello\W*world/i.test(literalText(s))),
      response: "close. the terminal matches exactly — capital H, capital W, one space: `Hello World`.",
    },
    {
      match: (code) => !printsSomething(code),
      response: "nothing's printing. `print(\"Hello World\")` — that one line is the whole program.",
    },
  ];
}

const SCAFFOLD_GENERIC = [
  "the terminal didn't get `Hello World`. one line: `print(\"Hello World\")`.",
  "not quite. text in quotes, inside the brackets of `print`. that's all.",
];

// ══════════════════════════════════════════════════════════════
//  Chapter 01
// ══════════════════════════════════════════════════════════════

const CH01_SCAFFOLD_DONE =
  "there it is — `Hello World` on the wire. the terminal accepted it. one line, and the channel's live.\n\n||COMPLETE||";

const ch01Scaffold: StepBank = {
  intro:
    "...signal received. you're in.\ni'm maya — they've locked me in a cell and this terminal is my only way to reach anyone. right now it's dead. make it print `Hello World` so i know the channel's actually live.",

  conceptFAQ: [
    {
      keywords: ["print", "output", "display", "show", "write"],
      response: "`print(...)` writes whatever's in the brackets to the terminal, then moves to a new line.",
    },
    {
      keywords: ["main", "function", "entry", "def"],
      response: "no main needed. python runs the file from the top, line by line. one `print` is a whole program.",
    },
    {
      keywords: ["import", "package", "setup", "skeleton", "scaffold", "boilerplate", "structure"],
      response: "there's no setup in python — no package line, no import for printing. `print` is built in.",
    },
    {
      keywords: ["string", "text", "quote"],
      response: "text goes in quotes: `\"Hello World\"`. single or double both work — just match them.",
    },
    {
      keywords: ["semicolon", ";"],
      response: "no semicolons. in python the end of the line is the end of the statement.",
    },
    {
      keywords: ["capital", "uppercase", "lowercase", "case sensitive"],
      response: "python is case-sensitive. `print` is all lowercase. the text inside is exact: `Hello World`.",
    },
    {
      keywords: ["run", "execute", "compile", "build"],
      response: "no compile step. hit transmit and the terminal runs your file top to bottom.",
    },
    {
      keywords: ["python", "language", "why python"],
      response: "python. readable, runs line by line, no ceremony. this terminal reads it as it goes.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "what next", "where do i start", "start"],
      response: "make it print `Hello World`. one line: `print(\"Hello World\")`. transmit it.",
    },
    {
      keywords: ["error", "wrong", "not working", "doesn't work", "broken", "fail"],
      response: "check three things: lowercase `print`, round brackets, and quotes around `Hello World`.",
    },
  ],

  codePatterns: scaffoldPatterns(CH01_SCAFFOLD_DONE),
  correctResponse: CH01_SCAFFOLD_DONE,

  genericWrong: [
    ...SCAFFOLD_GENERIC,
    "the channel's still dead. i need the exact words `Hello World` printed.",
  ],

  rushDialogue: [
    "the signal's degrading. just get `Hello World` printing.",
    "losing you. one line. `print(\"Hello World\")`. now.",
  ],

  stuckResponses: [
    "one line, that's the whole program:\n```\nprint(\"Hello World\")\n```",
    "lowercase `print`, round brackets, and the text in quotes inside them. nothing else.",
  ],

  deflections: [
    "not now — i need the channel live first.",
    "focus. one line of python and we can move on.",
  ],
};

const CH01_LOCATION_DONE = "...i see it. my cell. you actually got through.\n\n||COMPLETE||";

const usesBoth = (code: string) => {
  const c = noComments(code).replace(/^\s*(?:from\s+\S+\s+)?import\s[^\n]*/gm, "");
  return /\bcellblock\.CELL\b/.test(c) && /\bcellblock\.SUBLEVEL\b/.test(c);
};

const hasLocationLabels = (code: string) => {
  const text = stringsOf(code).map(literalText).join(" ");
  return /\bCELL\b/.test(text) && /\bSUBLEVEL\b/.test(text);
};

const ch01Location: StepBank = {
  intro:
    "good, the channel's live. now lock in where they're holding me — exactly, because a wrong location gets someone hurt. don't type it by hand: my real cell is in a module called `cellblock`. `import cellblock` and print its `CELL` and `SUBLEVEL` as `CELL B-09 · SUBLEVEL 3`.",

  conceptFAQ: [
    {
      keywords: ["import", "module", "cellblock", "another file"],
      response: "`import cellblock` at the top loads the module. after that its values are yours to read.",
    },
    {
      keywords: ["access", "dot", "reach into", "read the value", "get the value", "use cellblock"],
      response: "module name, a dot, then the value: `cellblock.CELL` is the cell, `cellblock.SUBLEVEL` is the number.",
    },
    {
      keywords: ["f-string", "fstring", "format", "mix", "combine", "placeholder", "braces"],
      response:
        "an f-string: put `f` before the quotes and drop values in braces — `f\"CELL {cellblock.CELL} · SUBLEVEL {cellblock.SUBLEVEL}\"`.",
    },
    {
      keywords: ["print", "output", "display", "show"],
      response:
        "`print(...)` sends it. don't put my cell in quotes — feed it the module values, or give print several things: `print(\"CELL\", cellblock.CELL, ...)` spaces them out for you.",
    },
    {
      keywords: ["capital", "uppercase", "constant", "why caps"],
      response: "capital names mean constant — a value nobody should change. it's python's convention, not a rule the language enforces.",
    },
    {
      keywords: ["concat", "concatenat", "plus", "+", "join", "str("],
      response:
        "`+` only joins text to text, and `SUBLEVEL` is a number. wrap it in `str()`, or skip the gluing with an f-string.",
    },
    {
      keywords: ["·", "middle dot", "special character", "separator", "period"],
      response: "the `·` is just decoration and it's hard to type — a regular `.` works. i read them the same.",
    },
    {
      keywords: ["variable", "assign", "store", "name it"],
      response: "you can name a value first: `cell = cellblock.CELL`. then use `cell` wherever you need it.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "`import cellblock`, then print `cellblock.CELL` and `cellblock.SUBLEVEL` as `CELL B-09 · SUBLEVEL 3`. pull the values from the module — don't type them.",
    },
    {
      keywords: ["example", "show me", "sample", "template"],
      response:
        "here's the shape:\n```\nimport cellblock\n\nprint(f\"CELL {cellblock.CELL} · SUBLEVEL {cellblock.SUBLEVEL}\")\n```",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /hello/i.test(out) && /world/i.test(out),
      response: "there's a hello world in the output. i don't need a greeting anymore — just my location: CELL B-09 · SUBLEVEL 3.",
    },
    {
      match: (out) => /\{\s*cellblock\./.test(out),
      response:
        "the braces printed as-is — that string is missing its `f`. put `f` right before the opening quote and python fills the values in.",
    },
    {
      match: (out) => /b-?09/i.test(out) && !/sublevel/i.test(out),
      response: "close — i see the cell but not the sublevel. i need both: CELL B-09 · SUBLEVEL 3.",
    },
    {
      match: (out) => /B-09/.test(out) && /\b3\b/.test(out) && !/CELL/.test(out.replace(/SUBLEVEL/g, "")),
      response: "the values are right. now the words around them: `CELL B-09 · SUBLEVEL 3`.",
    },
    {
      match: (out) => out.trim().length > 0 && !/b-?09/i.test(out),
      response: "you're printing something, but it's not my cell. i need CELL B-09 · SUBLEVEL 3.",
    },
  ],

  codePatterns: [
    {
      match: (code) => !printsSomething(code),
      response: "nothing came through. `print(...)` is how anything reaches the terminal.",
    },
    {
      match: (code) => !/\bcellblock\b/.test(maskPy(code)) && stringsOf(code).some((s) => /hello/i.test(s)),
      response: "that's a hello world. i don't need a greeting — i need my location, straight from the cellblock module.",
    },
    {
      match: (code) => /^\s*from\s+cellblock\s+import\b/m.test(maskPy(code)),
      response:
        "you pulled the names out of the module. keep them inside it instead: `import cellblock`, then `cellblock.CELL` and `cellblock.SUBLEVEL`.",
    },
    {
      match: (code) => /\bcellblock\s*\./.test(noComments(code)) && !/^\s*import\s+cellblock\b/m.test(maskPy(code)),
      response: "the module isn't loaded yet. add `import cellblock` at the very top.",
    },
    {
      match: (code) => /\bcellblock\.(?!CELL\b|SUBLEVEL\b)\w+/.test(noComments(code)),
      response: "names are case-sensitive. the module exports `CELL` and `SUBLEVEL` — both in capitals.",
    },
    {
      match: (code) => stringsOf(code).some((s) => !isFString(s) && /\{\s*cellblock\./.test(s)),
      response:
        "you've got braces in the text but no `f` before the quotes — without it python prints the braces literally. `f\"CELL {cellblock.CELL} · SUBLEVEL {cellblock.SUBLEVEL}\"`.",
    },
    {
      match: (code) => /\+\s*cellblock\.SUBLEVEL\b|\bcellblock\.SUBLEVEL\s*\+/.test(maskPy(code)),
      response:
        "`SUBLEVEL` is a number, and `+` can't join a number to text. use an f-string: `f\"CELL {cellblock.CELL} · SUBLEVEL {cellblock.SUBLEVEL}\"`.",
    },
    {
      match: (code) => HELLO_RE.test(noComments(code)),
      response: "the hello world is still in there. i don't need a greeting anymore — just my location. delete that line.",
    },
    {
      match: (code) => /^\s*import\s+cellblock\b/m.test(maskPy(code)) && usesBoth(code) && hasLocationLabels(code),
      response: CH01_LOCATION_DONE,
    },
    {
      match: (code) => /\bcellblock\.CELL\b/.test(noComments(code)) !== /\bcellblock\.SUBLEVEL\b/.test(noComments(code)),
      response: "close — you're reaching into the module, but i need both: `cellblock.CELL` and `cellblock.SUBLEVEL`.",
    },
    {
      match: (code) => /b-?09/i.test(code) && !/\bcellblock\./.test(noComments(code)),
      response:
        "don't type my cell in by hand. `import cellblock` and print `cellblock.CELL` and `cellblock.SUBLEVEL` — pull the values from the module.",
    },
    {
      match: (code) => usesBoth(code) && !hasLocationLabels(code),
      response: "the values are right. the line needs its words too: `CELL B-09 · SUBLEVEL 3`.",
    },
  ],

  correctResponse: CH01_LOCATION_DONE,

  genericWrong: [
    "that's not right. i need CELL B-09 · SUBLEVEL 3. exactly.",
    "almost... but the output doesn't match. look at what you're printing.",
    "wrong signal. pull my cell from `cellblock` and print it: CELL B-09 · SUBLEVEL 3.",
  ],

  rushDialogue: [
    "hurry. the footsteps stopped right outside.",
    "no time — just get it done. CELL B-09 · SUBLEVEL 3.",
  ],

  stuckResponses: [
    "two lines:\n```\nimport cellblock\n\nprint(f\"CELL {cellblock.CELL} · SUBLEVEL {cellblock.SUBLEVEL}\")\n```",
    "the values aren't yours to type — they're in the module. `cellblock.CELL` and `cellblock.SUBLEVEL`. import it and read them.",
  ],

  deflections: [
    "i don't have intel on that. focus on the mission.",
    "not now. i need my location confirmed first.",
  ],
};

// ══════════════════════════════════════════════════════════════
//  Chapter 02
// ══════════════════════════════════════════════════════════════

const CH02_SCAFFOLD_DONE = "terminal initialized. the keypad's listening.\n\nnow loop through codes 1-10.\n\n||COMPLETE||";

const ch02Scaffold: StepBank = {
  intro:
    "the keypad on my door runs python. get it live by printing `Hello World` — one line, no setup.\n\nonce it's live, we can start cracking the sequence.",

  conceptFAQ: [
    {
      keywords: ["print", "output"],
      response: "same as before: `print(\"Hello World\")`.",
    },
    {
      keywords: ["main", "function", "entry", "def"],
      response: "no main function. python starts at the top of the file. your loop will sit right there too.",
    },
    {
      keywords: ["import", "package", "setup", "skeleton", "scaffold"],
      response: "nothing to set up. `print` is built in — one line runs.",
    },
    {
      keywords: ["loop", "codes", "keypad"],
      response: "the loop comes next. first get the terminal live.",
    },
  ],

  codePatterns: scaffoldPatterns(CH02_SCAFFOLD_DONE),
  correctResponse: CH02_SCAFFOLD_DONE,
  genericWrong: SCAFFOLD_GENERIC,
  rushDialogue: [],
  stuckResponses: [
    "same one-liner as before: `print(\"Hello World\")`.",
    "lowercase `print`, brackets, the text in quotes. transmit.",
  ],
  deflections: ["focus. get the terminal live with a hello world first, then we crack the codes."],
};

const CH02_LOOP_DONE = "loop confirmed. the keypad's cycling. now i need you to classify each code.\n\n||COMPLETE||";

/** The loop body prints the loop variable itself (shifted by one when counting from 0). */
function printsLoopVar(loop: PyFor, shifted: boolean): boolean {
  const n = loop.name;
  const plain = new RegExp(`\\bprint\\s*\\(\\s*${n}\\s*\\)`);
  const plusOne = new RegExp(`\\bprint\\s*\\(\\s*${n}\\s*\\+\\s*1\\s*\\)`);
  return shifted ? plusOne.test(loop.body) : plain.test(loop.body);
}

const ch02Loop: StepBank = {
  intro:
    "good, you're still here.\n\nthe keypad on my door cycles codes 1 through 10. write a loop that prints each number on its own line — just the raw numbers. 1, 2, 3... up to 10. we'll classify them next.",

  conceptFAQ: [
    {
      keywords: ["for", "loop", "iterate", "repeat", "cycle"],
      response: "`for i in range(1, 11):` runs the indented lines under it once for each number.",
    },
    {
      keywords: ["range", "count", "1 to 10", "11"],
      response: "`range(1, 11)` counts 1, 2... 10. it stops before its second number — that's why it's 11, not 10.",
    },
    {
      keywords: ["stops at 9", "off by one", "missing 10", "only 9"],
      response: "`range(1, 10)` never reaches 10 — the end is excluded. use `range(1, 11)`.",
    },
    {
      keywords: ["zero", "starts at 0", "0"],
      response: "`range(10)` starts at 0. the keypad starts at 1, so give range both ends: `range(1, 11)`.",
    },
    {
      keywords: ["indent", "indentation", "spaces", "tab", "colon", ":"],
      response: "end the `for` line with `:` and indent the body four spaces. the indentation is how python knows what's inside the loop.",
    },
    {
      keywords: ["print", "output"],
      response: "inside the loop, `print(i)` prints the current number on its own line.",
    },
    {
      keywords: ["while", "until"],
      response: "a `while` loop could count too, but `for` with `range` does the counting for you — nothing to forget to increment.",
    },
    {
      keywords: ["++", "increment", "i++", "+= 1"],
      response: "no `i++` in python, and you don't need one — range hands the loop each next number.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`for i in range(1, 11):` then, indented on the next line, `print(i)`. two lines.",
    },
  ],

  outputPatterns: [
    { match: (out) => /Hello World/i.test(out), response: HELLO_LEFTOVER },
    {
      match: (out) => out.trim().split("\n").some((l) => /^\d+\s+\S/.test(l.trim())),
      response: "hold on — just the numbers for now, no labels. `print(i)` gives you the raw number. we classify next.",
    },
    {
      match: (out) => out.trim() === "0\n1\n2\n3\n4\n5\n6\n7\n8\n9",
      response: "it starts at 0 and stops at 9. `range(10)` counts from zero — give it both ends: `range(1, 11)`.",
    },
    {
      match: (out) => out.trim() === "1\n2\n3\n4\n5\n6\n7\n8\n9",
      response: "one short — it stops at 9. range never includes its end, so `range(1, 10)` misses 10. use `range(1, 11)`.",
    },
    {
      match: (out) => out.trim().startsWith("0\n1\n"),
      response: "a 0 snuck in at the top. the keypad starts at 1 — `range(1, 11)`.",
    },
    {
      match: (out) => out.trim().length === 0,
      response: "nothing came through. is `print(i)` indented inside the loop?",
    },
    {
      match: (out) => {
        const lines = out.trim().split("\n");
        return lines.length > 0 && lines.length < 10;
      },
      response: "you're printing, but not all 10. check your range — start at 1, stop at 11.",
    },
  ],

  codePatterns: [
    {
      match: (code) => !/\bfor\b/.test(maskPy(code)) && /\bwhile\b/.test(maskPy(code)),
      response: "a `while` loop gets there, but the keypad wants `for i in range(1, 11):` — range does the counting, nothing to forget.",
    },
    {
      match: (code) => !/\bfor\b/.test(maskPy(code)) && (maskPy(code).match(/\bprint\s*\(\s*\d+\s*\)/g) ?? []).length >= 3,
      response: "don't type the numbers out by hand — that won't scale past this door. loop: `for i in range(1, 11):`.",
    },
    {
      match: (code) => /\bfor\s*\(|\bfor\s+\w+\s*(?::=|=)/.test(maskPy(code)),
      response: "that's another language's loop. python counts with `for i in range(1, 11):` — no counter to manage.",
    },
    {
      match: (code) => !/\bfor\b/.test(maskPy(code)),
      response: "i need a loop. `for i in range(1, 11):` — then print inside it.",
    },
    {
      match: (code) => !rangeLoop(code),
      response: "let range do the counting: `for i in range(1, 11):`. no list to type out.",
    },
    {
      match: (code) => HELLO_RE.test(noComments(code)),
      response: HELLO_LEFTOVER,
    },
    {
      match: (code) => {
        const b = rangeBounds(rangeLoop(code)!.iter);
        return !!b && b[0] === 1 && b[1] === 10;
      },
      response: "one short — range stops before its end, so `range(1, 10)` stops at 9. use `range(1, 11)`.",
    },
    {
      match: (code) => {
        const loop = rangeLoop(code)!;
        return !loop.body.trim() && /^\s*print\s*\(/m.test(maskPy(code).split("\n").slice(loop.at + 1).join("\n"));
      },
      response: "`print(i)` has to be indented under the `for` — four spaces in — or python doesn't know it's the loop's body.",
    },
    {
      match: (code) => !/\bprint\s*\(/.test(rangeLoop(code)!.body),
      response: "the loop runs but prints nothing. inside it, indented: `print(i)`.",
    },
    {
      match: (code) => {
        const loop = rangeLoop(code)!;
        const b = rangeBounds(loop.iter);
        return !!b && b[0] === 0 && b[1] === 10 && loop.name === "i" && printsLoopVar(loop, true);
      },
      response: CH02_LOOP_DONE,
    },
    {
      match: (code) => {
        const b = rangeBounds(rangeLoop(code)!.iter);
        return !!b && b[0] === 0;
      },
      response: "range starts at 0 when you give it one number. the keypad starts at 1 — `range(1, 11)`.",
    },
    {
      match: (code) => !hasRange1to10(code),
      response: "check your range. `range(1, 11)` counts 1 through 10.",
    },
    {
      match: (code) => new RegExp(`\\bprint\\s*\\(\\s*${rangeLoop(code)!.name}\\s*,`).test(rangeLoop(code)!.body),
      response: "just the numbers for now — `print(i)`. the labels come in the next step.",
    },
    {
      match: (code) => !printsLoopVar(rangeLoop(code)!, false),
      response: "print the number itself, no quotes: `print(i)`.",
    },
    {
      match: (code) => rangeLoop(code)!.name !== "i",
      response: "the loop works, but the keypad listens for `i`. name the loop variable `i`: `for i in range(1, 11):`.",
    },
    { match: () => true, response: CH02_LOOP_DONE },
  ],

  correctResponse: CH02_LOOP_DONE,

  genericWrong: [
    "not quite. i need each number on its own line — just `1`, `2`, `3`... up to `10`.",
    "the output should be exactly 10 lines: 1 through 10. labels come next.",
  ],

  rushDialogue: [],
  stuckResponses: [
    "two lines:\n```\nfor i in range(1, 11):\n    print(i)\n```",
    "range stops before its end — `range(1, 11)` is 1 to 10. indent `print(i)` under the `for`.",
  ],
  deflections: ["focus. loop through 1-10 first, then we classify."],
};

const CH02_CLASSIFY_DONE =
  "the keypad's responding. all 10 codes mapped. but the redundancy protocol just kicked in — one more step.\n\n||COMPLETE||";

const classifyOutputPatterns: OutputPattern[] = [
  { match: (out) => /Hello World/i.test(out), response: HELLO_LEFTOVER },
  {
    match: (out) => /\d {2,}(DENY|WARN|GRANT|OVERRIDE)/.test(out),
    response:
      "there are two spaces between the number and the label. print already puts one space between its arguments — drop the space inside your string: `print(i, \"DENY\")`.",
  },
  {
    match: (out) => /^i\s+(DENY|WARN|GRANT|OVERRIDE)/m.test(out),
    response: "that's the letter i, not the number. keep `i` outside the quotes: `print(i, \"DENY\")`.",
  },
  {
    match: (out) => {
      const lines = out.trim().split("\n").filter(Boolean);
      return lines.length > 0 && lines.every((l) => /^(DENY|WARN|GRANT|OVERRIDE)$/i.test(l.trim()));
    },
    response: "you're printing labels but not the code numbers. each line needs both: `print(i, \"DENY\")` gives `1 DENY`.",
  },
  {
    match: (out) => /\b(deny|warn|grant|override)\b/.test(out),
    response: "the labels need to be in capitals: DENY, WARN, GRANT, OVERRIDE.",
  },
  {
    match: (out) => out.trim().split("\n").length === 9 && /9 GRANT/.test(out) && !/OVERRIDE/.test(out),
    response: "code 10 never printed — your range stops at 9. `range(1, 11)`.",
  },
  {
    match: (out) => ["DENY", "WARN", "GRANT", "OVERRIDE"].every((l) => out.includes(l)),
    response: "all four labels are there, but the mapping is off. check: 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
  },
  {
    match: (out) => /DENY|WARN|GRANT|OVERRIDE/i.test(out),
    response: "some labels are there but not all. i need DENY, WARN, GRANT, and OVERRIDE.",
  },
  {
    match: (out) => out.trim().length > 0,
    response: "you're printing numbers but not classifying. branch inside the loop with `if` / `elif` / `else`.",
  },
];

const ch02Classify: StepBank = {
  intro:
    "the keypad's cycling. now modify your loop — for each code, print the number and its access level separated by a space.\n\n1-3: DENY\n4-6: WARN\n7-9: GRANT\n10: OVERRIDE\n\nso line 1 is `1 DENY`, line 4 is `4 WARN`... you get it.",

  conceptFAQ: [
    {
      keywords: ["elif", "else if", "elseif"],
      response: "python spells it `elif` — one word. `if i <= 3:` then `elif i <= 6:`. the first true condition wins.",
    },
    {
      keywords: ["if", "else", "condition", "branch"],
      response: "`if i <= 3:` ... `elif i <= 6:` ... `elif i <= 9:` ... `else:` — each ends with a colon, each body indented.",
    },
    {
      keywords: ["override", "10", "last one"],
      response: "10 is special — OVERRIDE. a final `else:` catches whatever the earlier conditions didn't.",
    },
    {
      keywords: ["deny", "warn", "grant", "1-3", "4-6", "7-9", "which"],
      response: "1-3 is DENY, 4-6 is WARN, 7-9 is GRANT, 10 is OVERRIDE.",
    },
    {
      keywords: ["print both", "number and", "label", "format", "space"],
      response: "give print both: `print(i, \"DENY\")`. it puts the space between them for you.",
    },
    {
      keywords: ["switch", "case", "match"],
      response: "you don't need anything fancy. an `if` / `elif` / `else` ladder handles it cleanly.",
    },
    {
      keywords: ["and", "&&", "or", "||"],
      response: "python uses the words `and` and `or`, not symbols. but an elif ladder doesn't need them — order does the work.",
    },
    {
      keywords: ["indent", "indentation", "nested"],
      response: "the `if` lines sit inside the loop, so they're indented once. their bodies are indented twice.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "keep the loop. inside it, branch on `i` and print the number with its label. 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
    },
  ],

  outputPatterns: classifyOutputPatterns,

  codePatterns: [
    {
      match: (code) => /\belse\s+if\b/.test(maskPy(code)),
      response: "python spells it `elif` — one word: `elif i <= 6:`.",
    },
    {
      match: (code) => /&&|\|\|/.test(maskPy(code)),
      response: "python uses the words `and` / `or`, not `&&` / `||`.",
    },
    {
      match: (code) => !rangeLoop(code),
      response: "keep the loop from before — `for i in range(1, 11):` — and classify inside it.",
    },
    {
      match: (code) => {
        const b = rangeBounds(rangeLoop(code)!.iter);
        return !!b && b[0] === 1 && b[1] === 10;
      },
      response: "your loop stops at 9, so code 10 never gets its OVERRIDE. `range(1, 11)`.",
    },
    {
      match: (code) => !/\bif\b/.test(maskPy(code)),
      response: "you're looping but not classifying. branch with `if` / `elif` / `else`.",
    },
    {
      match: (code) => !LABELS.some((l) => hasLabel(code, l)) && stringsOf(code).some((s) => /\b(deny|warn|grant|override)\b/.test(s)),
      response: "the labels go in capitals: DENY, WARN, GRANT, OVERRIDE.",
    },
    {
      match: (code) => !hasLabel(code, "OVERRIDE"),
      response: "almost — but code 10 needs to print OVERRIDE. a final `else:` catches it.",
    },
    {
      match: (code) => hasLabel(code, "DENY") && !hasLabel(code, "WARN"),
      response: "i see DENY but not WARN. codes 4-6 should map to WARN.",
    },
    {
      match: (code) => !LABELS.every((l) => hasLabel(code, l)),
      response: "i need all four labels: DENY, WARN, GRANT, OVERRIDE.",
    },
    {
      match: (code) => /\bprint\s*\(\s*i\s*\+\s*["']|["']\s*\+\s*i\s*\)/.test(noComments(code)) && !/\bstr\s*\(/.test(maskPy(code)),
      response: "`+` can't join a number to text. give print both instead: `print(i, \"DENY\")`.",
    },
    {
      match: (code) => stringsOf(code).some((s) => !isFString(s) && /^["']i\s+(DENY|WARN|GRANT|OVERRIDE)/.test(s)),
      response: "that prints the letter i. keep `i` outside the quotes: `print(i, \"DENY\")`.",
    },
    {
      match: (code) => {
        const sim = simulateChains(code);
        return !!sim && !chainIsCorrect(sim);
      },
      response: "the branches don't line up. check the order and the boundaries: 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
    },
    {
      match: (code) => HELLO_RE.test(noComments(code)),
      response: HELLO_LEFTOVER,
    },
    {
      match: (code) =>
        hasRange1to10(code) &&
        printsSomething(rangeLoop(code)!.body) &&
        (!!simulateChains(code) || boundariesPresent(code)),
      response: CH02_CLASSIFY_DONE,
    },
  ],

  correctResponse: CH02_CLASSIFY_DONE,

  genericWrong: [
    "that's not matching. loop 1-10, classify each.",
    "wrong output. check: 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
  ],

  rushDialogue: [
    "the knocking from B-10 is getting louder. hurry.",
    "someone in B-10 needs help. finish the sequence.",
  ],

  stuckResponses: [
    "inside the loop:\n```\nif i <= 3:\n    print(i, \"DENY\")\nelif i <= 6:\n    print(i, \"WARN\")\nelif i <= 9:\n    print(i, \"GRANT\")\nelse:\n    print(i, \"OVERRIDE\")\n```",
    "an `if`, two `elif`s, and an `else`. each line ends with a colon, each body indented under it.",
  ],

  deflections: ["focus. the keypad sequence is all that matters."],
};

const CH02_REWRITE_DONE = "redundancy check cleared. the door mechanism just clicked.\n\n||COMPLETE||";

const ch02Rewrite: StepBank = {
  intro:
    "redundancy protocol. the keypad wants the same classification built a second way — as data instead of decisions.\n\nput every code in a dict that maps it to its level, then print `i` and `levels[i]` in the loop. same output. i'm putting +2:00 on the clock for this one.",

  conceptFAQ: [
    {
      keywords: ["dict", "dictionary", "lookup", "table", "map"],
      response: "a dict maps keys to values: `{1: \"DENY\", 4: \"WARN\"}`. `levels[1]` gives back `\"DENY\"`.",
    },
    {
      keywords: ["all ten", "every code", "how many", "entries", "list them"],
      response: "ten entries, one per code. data instead of branches — no conditions left to get wrong.",
    },
    {
      keywords: ["loop", "for", "still"],
      response: "keep `for i in range(1, 11):`. the body shrinks to one line: `print(i, levels[i])`.",
    },
    {
      keywords: ["square bracket", "brackets", "[i]", "look up", "access"],
      response: "look a key up with square brackets: `levels[i]`. round brackets are for calling functions.",
    },
    {
      keywords: ["if", "elif", "else", "branches"],
      response: "the `if` ladder goes away. the dict already knows every answer — the loop just asks it.",
    },
    {
      keywords: ["key", "quotes", "string key", "number key"],
      response: "the keys are numbers, no quotes: `{1: \"DENY\"}`. `i` is a number, so `\"1\"` would never match it.",
    },
    {
      keywords: ["keyerror", "key error", "crash"],
      response: "a `KeyError` means a code has no entry in your table. check every number from 1 to 10 is there.",
    },
    {
      keywords: ["list", "array"],
      response: "a list counts from 0, so `levels[1]` would be the second item. a dict lets code 1 be key 1.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "why rewrite"],
      response: "build `levels = {1: \"DENY\", 2: \"DENY\", ...}` with all ten codes above the loop, then `print(i, levels[i])` inside it.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /\bNone\b/.test(out),
      response: "`None` means a lookup found nothing — some code has no entry in your table. every code from 1 to 10 needs one.",
    },
    {
      match: (out) => /^\d+\s+\{/m.test(out),
      response: "you printed the whole table. look up just this code: `levels[i]`.",
    },
    ...classifyOutputPatterns,
  ],

  codePatterns: [
    {
      match: (code) => /\belse\s+if\b/.test(maskPy(code)),
      response: "python spells it `elif`. but this step doesn't need branches at all — build a dict.",
    },
    {
      match: (code) => /=\s*\[[^\]]*["'](DENY|WARN|GRANT|OVERRIDE)["']/.test(noComments(code)) && !hasDictLiteral(code),
      response:
        "that's a list — lists count from 0, so `levels[1]` is the second item. use a dict so code 1 is key 1: `{1: \"DENY\", 2: \"DENY\", ...}`.",
    },
    {
      match: (code) => !hasDictLiteral(code) && !builtTableOtherwise(code),
      response:
        "that's still the old chain. the protocol wants a lookup table — a dict mapping each code to its level: `levels = {1: \"DENY\", 2: \"DENY\", ...}`.",
    },
    {
      match: (code) => /["']\d+["']\s*:/.test(noComments(code)),
      response: "your keys are text — `\"1\"` — but `i` is a number, so `levels[i]` won't find them. drop the quotes around the keys.",
    },
    {
      match: (code) => /(["'])x*\1\s+\d+\s*:/.test(maskPy(code)),
      response: "there's a comma missing between two entries. every `key: value` pair is separated by a comma.",
    },
    {
      match: (code) => /\b\w+\s*\(\s*i\s*\)/.test(maskPy(code).replace(/\b(print|range|str|int|len)\s*\(/g, "")) && !/\[\s*i\s*\]/.test(maskPy(code)),
      response: "dicts look up with square brackets: `levels[i]`, not round ones.",
    },
    {
      match: (code) => /\.get\s*\(\s*i\b/.test(maskPy(code)) && !/\[i\]/.test(maskPy(code)),
      response: "`.get(i)` works, but this terminal wants the plain lookup — `levels[i]` — so a missing code fails loudly.",
    },
    {
      match: (code) => !/\[i\]/.test(maskPy(code)),
      response: "the table's built — now use it. inside the loop: `print(i, levels[i])`.",
    },
    {
      match: (code) => !builtTableOtherwise(code) && !tableIsComplete(code),
      response: "your table is missing codes. every code from 1 to 10 needs an entry, or the lookup crashes.",
    },
    {
      match: (code) => !builtTableOtherwise(code) && !tableIsCorrect(code),
      response: "some codes map to the wrong level. check the table: 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
    },
    {
      match: (code) => !hasRange1to10(code),
      response: "keep the loop at `for i in range(1, 11):` — every code from 1 to 10.",
    },
    {
      match: (code) => HELLO_RE.test(noComments(code)),
      response: HELLO_LEFTOVER,
    },
    {
      match: (code) => /\bprint\s*\([^)]*\[i\]/.test(rangeLoop(code)!.rawBody),
      response: CH02_REWRITE_DONE,
    },
  ],

  correctResponse: CH02_REWRITE_DONE,

  genericWrong: [
    "not matching. same output as before — this time the dict decides.",
    "wrong output. 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE — straight from `levels[i]`.",
  ],

  rushDialogue: [
    "redundancy check is ticking. build the table.",
    "clock's running. same output, data instead of branches.",
  ],

  stuckResponses: [
    "the table, then the loop:\n```\nlevels = {\n    1: \"DENY\", 2: \"DENY\", 3: \"DENY\",\n    4: \"WARN\", 5: \"WARN\", 6: \"WARN\",\n    7: \"GRANT\", 8: \"GRANT\", 9: \"GRANT\",\n    10: \"OVERRIDE\",\n}\n\nfor i in range(1, 11):\n    print(i, levels[i])\n```",
    "ten `code: \"LABEL\"` pairs inside braces, commas between them. then the loop body is one line: `print(i, levels[i])`.",
  ],

  deflections: ["focus. build the table and clear the redundancy check."],
};

// ══════════════════════════════════════════════════════════════
//  Chapter 03
// ══════════════════════════════════════════════════════════════

const CH03_SCAFFOLD_DONE =
  "terminal initialized. the shaft panel recognizes the program.\n\nnow i need you to write a function.\n\n||COMPLETE||";

const ch03Scaffold: StepBank = {
  intro:
    "we're in the ventilation shaft now. the junction panels run python — same as before.\n\nget the panel live by printing `Hello World`.",

  conceptFAQ: [
    {
      keywords: ["print", "output"],
      response: "`print(\"Hello World\")` — same one-liner.",
    },
    {
      keywords: ["main", "entry", "start"],
      response: "python starts at the top of the file and runs down. no main needed.",
    },
    {
      keywords: ["function", "def", "sum_codes", "validate"],
      response: "functions come next step. right now just get the panel live.",
    },
    {
      keywords: ["import", "setup", "skeleton", "scaffold"],
      response: "nothing to set up. one `print` line runs.",
    },
  ],

  codePatterns: scaffoldPatterns(CH03_SCAFFOLD_DONE),
  correctResponse: CH03_SCAFFOLD_DONE,
  genericWrong: SCAFFOLD_GENERIC,
  rushDialogue: [],
  stuckResponses: [
    "same as before: `print(\"Hello World\")`.",
    "lowercase `print`, round brackets, text in quotes.",
  ],
  deflections: ["just get a hello world on screen for now."],
};

const CH03_SUM_DONE = "sum function works. 115 — checks out.\n\nnow i need validation.\n\n||COMPLETE||";

const ch03Sum: StepBank = {
  intro:
    "good. terminal's ready.\n\neach junction needs its codes added up before it'll open. write a function `sum_codes` that takes any number of numbers — `*codes` collects them — and returns their sum.",

  conceptFAQ: [
    {
      keywords: ["*args", "star", "*codes", "any number", "variable number", "asterisk"],
      response: "a star on the parameter collects every argument: `def sum_codes(*codes):`. inside, `codes` is a tuple of them.",
    },
    {
      keywords: ["def", "function", "define"],
      response: "`def name(params):` then the body indented under it. `return` hands a value back to whoever called it.",
    },
    {
      keywords: ["loop", "for", "iterate", "each"],
      response: "`for c in codes:` walks the tuple one value at a time.",
    },
    {
      keywords: ["sum", "add", "total", "accumulate"],
      response: "start `total = 0` before the loop, `total += c` inside it, `return total` after it.",
    },
    {
      keywords: ["return", "give back", "hand back"],
      response: "`return total` sends the number back to the caller. printing it isn't the same — the junction needs the value.",
    },
    {
      keywords: ["+=", "plus equals"],
      response: "`total += c` adds c to total. same as `total = total + c`, shorter.",
    },
    {
      keywords: ["snake", "snake_case", "sumcodes", "camel", "underscore", "name"],
      response: "python names functions in snake_case — lowercase words joined by underscores. the junction calls `sum_codes`.",
    },
    {
      keywords: ["call", "test", "how do i use"],
      response: "call it with numbers: `sum_codes(25, 30, 50, 10)`. the junction tests it with its own codes too.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`def sum_codes(*codes):`, then `total = 0`, a `for` loop adding each code, and `return total`.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /Sum: None/.test(out),
      response: "`Sum: None` — your function doesn't return anything. end it with `return total`.",
    },
    {
      match: (out) => out.trim() === "Sum: 25\nSum: 1\nSum: 100",
      response:
        "it's handing back the first code and quitting. your `return` is inside the loop — dedent it so it runs after the loop finishes.",
    },
    {
      match: (out) => /^Sum: -?\d+$/m.test(out),
      response: "the totals are off. every code needs to be added once: 25 + 30 + 50 + 10 is 115.",
    },
  ],

  codePatterns: [
    {
      match: (code) => /\b(function|func)\s+\w+\s*\(/.test(maskPy(code)),
      response: "that's not how python defines a function. it's `def sum_codes(*codes):`.",
    },
    {
      match: (code) => /^\s*def\s+sumCodes\b/m.test(maskPy(code)),
      response: "python names functions in snake_case — the junction calls `sum_codes`, with an underscore.",
    },
    {
      match: (code) => defParams(code, "sum_codes") === null,
      response: "i need a function called `sum_codes`: `def sum_codes(*codes):`.",
    },
    {
      match: (code) => /^\.\.\./.test(defParams(code, "sum_codes")!),
      response: "three dots is another language's syntax. python collects arguments with a star: `def sum_codes(*codes):`.",
    },
    {
      match: (code) => !starParam(code, "sum_codes"),
      response: "without the star it takes exactly one argument. put a star on it — `*codes` — to collect any number of them.",
    },
    {
      match: (code) => {
        const body = defBody(code, "sum_codes") ?? "";
        return !/\breturn\b/.test(body) && /\bprint\s*\(/.test(body);
      },
      response: "you're printing the total instead of returning it. `return total` hands the number back to the junction.",
    },
    {
      match: (code) => !/\breturn\b/.test(defBody(code, "sum_codes") ?? ""),
      response: "the function never hands anything back. end it with `return total`.",
    },
    {
      match: (code) => returnsInsideLoop(defBody(code, "sum_codes") ?? ""),
      response: "your `return` is inside the loop, so it quits after the first code. dedent it so it runs after the loop.",
    },
    {
      match: (code) => accumulatesUninitialised(defBody(code, "sum_codes") ?? ""),
      response: "start the total before the loop — `total = 0` — or python has nothing to add to.",
    },
    { match: (code) => sumCodesWorks(code), response: CH03_SUM_DONE },
    {
      match: () => true,
      response: "the function needs to add up every code it gets: `for c in codes:` with `total += c`, then `return total`.",
    },
  ],

  correctResponse: CH03_SUM_DONE,

  genericWrong: [
    "not right. `sum_codes` needs a starred parameter and to return the total.",
    "the junction rejected it. check your function.",
  ],

  rushDialogue: [],
  stuckResponses: [
    "```\ndef sum_codes(*codes):\n    total = 0\n    for c in codes:\n        total += c\n    return total\n```",
    "star on the parameter, a loop that adds, `return` after the loop. three moving parts.",
  ],
  deflections: ["focus on `sum_codes`. a starred parameter, return the sum."],
};

const CH03_VALIDATE_DONE =
  "junction codes accepted. sum checks out — over 100. the shaft gate is opening.\n\n||COMPLETE||";

const ch03Validate: StepBank = {
  intro:
    "sum works. the gate only opens if the codes total more than 100 — so add `validate_code(*codes)`. reuse `sum_codes` inside it, then hand back both: `return total, total > 100`.",

  conceptFAQ: [
    {
      keywords: ["two values", "both", "multiple return", "return two", "tuple"],
      response: "separate them with a comma: `return total, ok`. python packs them into a tuple.",
    },
    {
      keywords: ["reuse", "call sum_codes", "use sum_codes"],
      response: "call the function you already have: `total = sum_codes(*codes)`. the star spreads the tuple back into separate numbers.",
    },
    {
      keywords: ["true", "false", "bool", "boolean"],
      response: "a comparison already is one: `total > 100` is `True` or `False`. python capitalizes them.",
    },
    {
      keywords: ["unpack", "s, v", "receive", "get both"],
      response: "the caller splits the tuple with a comma too: `s, v = validate_code(25, 30)`.",
    },
    {
      keywords: ["star", "*codes", "spread", "pass"],
      response: "`*codes` on the way in collects the numbers. `sum_codes(*codes)` on the way out spreads them again.",
    },
    {
      keywords: ["greater", ">", "100", "threshold", "why 100"],
      response: "the gate needs more than 100. `total > 100` — strictly greater, so exactly 100 doesn't pass.",
    },
    {
      keywords: ["if", "else"],
      response: "no `if` needed. `total > 100` is already the answer — return it directly.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`def validate_code(*codes):`, then `total = sum_codes(*codes)`, then `return total, total > 100`.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /Sum: None/.test(out),
      response: "`Sum: None` — `sum_codes` stopped returning its total. it needs `return total` at the end.",
    },
    {
      match: (out) => /Valid: (true|false)\b/.test(out),
      response:
        "`true` in lowercase means you're returning text. return the comparison itself — `total > 100` — and python prints `True`.",
    },
    {
      match: (out) => /Valid: None/.test(out),
      response: "the second value is `None`. return the comparison as the second value: `return total, total > 100`.",
    },
    {
      match: (out) => /Result: 115, Valid: False/.test(out) || /Result: 60, Valid: True/.test(out),
      response: "the check is backwards or off. 115 should pass and 60 shouldn't: `total > 100`.",
    },
    {
      match: (out) => /Result: (?!115\b)\d+, Valid/.test(out.split("\n")[1] ?? ""),
      response: "the total coming back from `validate_code` is wrong. reuse `sum_codes(*codes)` so it adds every code.",
    },
  ],

  codePatterns: [
    {
      match: (code) => /\b(true|false)\b/.test(maskPy(code)),
      response: "python capitalizes booleans: `True` and `False`. but you don't need either — `total > 100` already is one.",
    },
    {
      match: (code) => /^\s*def\s+validateCode\b/m.test(maskPy(code)),
      response: "snake_case in python — the junction calls `validate_code`, with an underscore.",
    },
    {
      match: (code) => defParams(code, "sum_codes") === null,
      response: "keep `sum_codes` from the last step — `validate_code` builds on it.",
    },
    {
      match: (code) => defParams(code, "validate_code") === null,
      response: "add `def validate_code(*codes):` below `sum_codes`.",
    },
    {
      match: (code) => !starParam(code, "validate_code"),
      response: "`validate_code` takes any number of codes too — put a star on the parameter: `*codes`.",
    },
    {
      match: (code) => !/\breturn\b/.test(defBody(code, "validate_code") ?? ""),
      response: "`validate_code` needs to hand back both values: `return total, total > 100`.",
    },
    {
      match: (code) => /\bsum_codes\s*\(\s*\w+\s*\)/.test(defBody(code, "validate_code") ?? ""),
      response: "without the star, `sum_codes` gets one tuple instead of the numbers. pass them through: `sum_codes(*codes)`.",
    },
    {
      match: (code) => !returnsTuple(defBody(code, "validate_code") ?? ""),
      response: "you're returning one value. return both, separated by a comma: `return total, total > 100`.",
    },
    {
      match: (code) => /[\w)\]]\s*>=\s*100\b/.test(defBody(code, "validate_code") ?? ""),
      response: "greater than 100 means `>`, not `>=` — exactly 100 shouldn't open the gate.",
    },
    {
      match: (code) => !checksOver100(defBody(code, "validate_code") ?? ""),
      response: "the gate's threshold is 100. the second value is `total > 100`.",
    },
    {
      match: (code) => !sumCodesWorks(code),
      response: "`sum_codes` isn't adding up anymore. it needs to loop over every code and `return total`.",
    },
    { match: () => true, response: CH03_VALIDATE_DONE },
  ],

  correctResponse: CH03_VALIDATE_DONE,

  genericWrong: [
    "not matching. `validate_code` needs to return two things: the total and whether it's over 100.",
    "the junction rejected it. check both functions.",
  ],

  rushDialogue: [
    "backup power is dropping. write the function. now.",
    "the lights are flickering. hurry.",
  ],

  stuckResponses: [
    "```\ndef validate_code(*codes):\n    total = sum_codes(*codes)\n    return total, total > 100\n```",
    "reuse `sum_codes(*codes)` for the total, then return it and the comparison, separated by a comma.",
  ],

  deflections: ["focus on `validate_code`. two return values: the sum and whether it's over 100."],
};

// ── Registry ──

export const PYTHON_BANKS: Record<string, StepBank> = {
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
