// ── Maya's answer banks · Python ──
// Same story beats and stakes as the Go banks in ../engine.ts, teaching Python
// and agreeing with src/data/challenges/python/act-1.ts, act-2.ts + act-3.ts. When the interpreter
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
    "good, the channel's live. now lock in where they're holding me — exactly, because a wrong location gets someone hurt. don't type it by hand: my real cell is in a module called `cellblock`. `import cellblock` and print its `CELL` and `SUBLEVEL` as `CELL B-09 - SUBLEVEL 3`.",

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
      keywords: ["f-string", "fstring", "format", "mix", "combine", "placeholder", "braces", "together", "text and a number", "and a number", "with a number", "same line"],
      response:
        "an f-string: put `f` before the quotes and drop values in braces — `f\"CELL {cellblock.CELL} - SUBLEVEL {cellblock.SUBLEVEL}\"`. or give print several things separated by commas: `print(\"SUBLEVEL\", cellblock.SUBLEVEL)` prints `SUBLEVEL 3`.",
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
      keywords: ["dash", "hyphen", "minus", "separator", "middle dot", "special character", "between the cell"],
      response: "the separator is a plain dash with a space on each side: `CELL B-09 - SUBLEVEL 3`. nothing special to type.",
    },
    {
      keywords: ["variable", "assign", "store", "name it"],
      response: "you can name a value first: `cell = cellblock.CELL`. then use `cell` wherever you need it.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "`import cellblock`, then print `cellblock.CELL` and `cellblock.SUBLEVEL` as `CELL B-09 - SUBLEVEL 3`. pull the values from the module — don't type them.",
    },
    {
      keywords: ["example", "show me", "sample", "template"],
      response:
        "here's the shape:\n```\nimport cellblock\n\nprint(f\"CELL {cellblock.CELL} - SUBLEVEL {cellblock.SUBLEVEL}\")\n```",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /hello/i.test(out) && /world/i.test(out),
      response: "there's a hello world in the output. i don't need a greeting anymore — just my location: CELL B-09 - SUBLEVEL 3.",
    },
    {
      match: (out) => /\{\s*cellblock\./.test(out),
      response:
        "the braces printed as-is — that string is missing its `f`. put `f` right before the opening quote and python fills the values in.",
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
      match: (out) => out.trim().length > 0 && !/b-?09/i.test(out),
      response: "you're printing something, but it's not my cell. i need CELL B-09 - SUBLEVEL 3.",
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
        "you've got braces in the text but no `f` before the quotes — without it python prints the braces literally. `f\"CELL {cellblock.CELL} - SUBLEVEL {cellblock.SUBLEVEL}\"`.",
    },
    {
      match: (code) => /\+\s*cellblock\.SUBLEVEL\b|\bcellblock\.SUBLEVEL\s*\+/.test(maskPy(code)),
      response:
        "`SUBLEVEL` is a number, and `+` can't join a number to text. use an f-string: `f\"CELL {cellblock.CELL} - SUBLEVEL {cellblock.SUBLEVEL}\"`.",
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
      response: "the values are right. the line needs its words too: `CELL B-09 - SUBLEVEL 3`.",
    },
  ],

  correctResponse: CH01_LOCATION_DONE,

  genericWrong: [
    "that's not right. i need CELL B-09 - SUBLEVEL 3. exactly.",
    "almost... but the output doesn't match. look at what you're printing.",
    "wrong signal. pull my cell from `cellblock` and print it: CELL B-09 - SUBLEVEL 3.",
  ],

  rushDialogue: [
    "hurry. the footsteps stopped right outside.",
    "no time — just get it done. CELL B-09 - SUBLEVEL 3.",
  ],

  stuckResponses: [
    "two lines:\n```\nimport cellblock\n\nprint(f\"CELL {cellblock.CELL} - SUBLEVEL {cellblock.SUBLEVEL}\")\n```",
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

// ══════════════════════════════════════════════════════════════
//  Act II shape helpers
// ══════════════════════════════════════════════════════════════

/** Body of `def name(...)` with strings kept (comments blanked), or null. Same lines as defBody. */
function rawDefBody(code: string, name: string): string | null {
  const masked = maskPy(code).split("\n");
  const re = new RegExp(`^\\s*def\\s+${name}\\s*\\(`);
  const at = masked.findIndex((l) => re.test(l));
  return at === -1 ? null : blockAt(noComments(code).split("\n"), at);
}

/** Parameter names of `def name(...)` (defaults and annotations dropped), or null when it isn't defined. */
function paramNames(code: string, name: string): string[] | null {
  const params = defParams(code, name);
  if (params === null) return null;
  return params.split(",").map((p) => p.replace(/[:=].*$/, "").trim()).filter(Boolean);
}

type Check<K extends string> = (code: string) => K | null;

/** One pattern per issue a step's check can find (first issue wins), then `done` when it finds none. */
function checkPatterns<K extends string>(check: Check<K>, messages: Record<K, string>, done: string): CodePattern[] {
  let last: { code: string; issue: K | null } | null = null;
  const run = (code: string) => {
    if (last?.code !== code) last = { code, issue: check(code) };
    return last.issue;
  };
  return [
    ...(Object.keys(messages) as K[]).map((k) => ({ match: (code: string) => run(code) === k, response: messages[k] })),
    { match: (code: string) => run(code) === null, response: done },
  ];
}

type StyleIssue = "otherDef" | "camel";

/** Another language's function keyword, or the camelCase name the brief doesn't use. */
function defStyle(code: string, camel: string): StyleIssue | null {
  const m = maskPy(code);
  if (/\b(function|func)\s+\w+\s*\(/.test(m)) return "otherDef";
  if (new RegExp(`^\\s*def\\s+${camel}\\s*\\(`, "m").test(m)) return "camel";
  return null;
}

type ShapeIssue = "byHand" | "noDef" | "arity" | "prints" | "noReturn";

/** The function exists, takes `arity` parameters, and returns something. */
function fnShape(code: string, name: string, arity: number, byHand: RegExp): ShapeIssue | null {
  const params = paramNames(code, name);
  if (params === null) {
    return printsSomething(code) && stringsOf(code).some((s) => byHand.test(literalText(s).trim())) ? "byHand" : "noDef";
  }
  if (params.length !== arity) return "arity";
  const body = defBody(code, name)!;
  if (!/\breturn\b/.test(body)) return /\bprint\s*\(/.test(body) ? "prints" : "noReturn";
  return null;
}

function styleMessages(name: string, signature: string): Record<StyleIssue, string> {
  return {
    otherDef: `that's another language's way to write a function. python uses \`def\`: \`def ${signature}:\`.`,
    camel: `python names functions in snake_case — the terminal calls \`${name}\`, with an underscore.`,
  };
}

function shapeMessages(name: string, signature: string, arity: string, noReturn: string): Record<ShapeIssue, string> {
  return {
    byHand: `you're printing the answers yourself. the terminal doesn't read your prints — it calls \`${name}\` itself and checks what comes back.`,
    noDef: `i need a function called \`${name}\`: \`def ${signature}:\`.`,
    arity,
    prints: `you're printing inside \`${name}\` instead of returning. the terminal calls it and uses what comes back — \`return\` it.`,
    noReturn,
  };
}

/** Lines of the block a `for ... in range(...)` opens in a masked body, or null. */
function rangeLoopIn(body: string): { v: string; args: string[]; block: string[] } | null {
  const lines = body.split("\n");
  const at = lines.findIndex((l) => /\bfor\s+\w+\s+in\s+range\s*\(/.test(l));
  if (at === -1) return null;
  const line = lines[at];
  const m = line.match(/\bfor\s+(\w+)\s+in\s+range\s*\(/)!;
  const args: string[] = [];
  let depth = 1;
  let start = m.index! + m[0].length;
  let i = start;
  for (; i < line.length; i++) {
    const ch = line[i];
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) {
      depth--;
      if (depth === 0) break;
    } else if (ch === "," && depth === 1) {
      args.push(line.slice(start, i));
      start = i + 1;
    }
  }
  args.push(line.slice(start, i));
  return { v: m[1], args: args.map((a) => a.replace(/\s+/g, "")).filter(Boolean), block: blockAt(lines, at).split("\n") };
}

// ══════════════════════════════════════════════════════════════
//  Chapter 04
// ══════════════════════════════════════════════════════════════

const CH04_SCAFFOLD_DONE =
  "terminal's awake. the schedule reeves photographed is coming through — five guards, four floors.\n\nnow build the roster.\n\n||COMPLETE||";

const ch04Scaffold: StepBank = {
  intro:
    "we're in surveillance. reeves photographed the guard schedule, and this terminal can read it — but it's asleep. wake it: print `Hello World`.",

  conceptFAQ: [
    {
      keywords: ["print", "output"],
      response: "`print(\"Hello World\")` — the same one-liner. it's always the first thing.",
    },
    {
      keywords: ["import", "package", "setup", "skeleton", "scaffold"],
      response: "nothing to import. dictionaries and sets are built into python — you'll use both in a minute.",
    },
    {
      keywords: ["dict", "dictionary", "map", "set", "roster", "guard"],
      response: "the roster comes next step. right now just wake the terminal.",
    },
    {
      keywords: ["main", "entry", "start"],
      response: "python starts at the top of the file and runs down. no main needed.",
    },
  ],

  codePatterns: scaffoldPatterns(CH04_SCAFFOLD_DONE),
  correctResponse: CH04_SCAFFOLD_DONE,
  genericWrong: SCAFFOLD_GENERIC,
  rushDialogue: [],
  stuckResponses: [
    "same as every time: `print(\"Hello World\")`.",
    "lowercase `print`, round brackets, the text in quotes. one line.",
  ],
  deflections: ["wake the terminal first. one line."],
};

// ── chapter-04:guardmap ──

const ROSTER: [string, string][] = [
  ["Chen", "Floor 1"],
  ["Alvarez", "Floor 2"],
  ["Volkov", "Floor 2"],
  ["Park", "Floor 3"],
  ["Santos", "Floor 1"],
];

/**
 * Every name → floor pair the roster is built from, repeats kept: a dict
 * literal, `roster["Chen"] = ...` lines, or `dict(Chen=...)`. Looks in
 * build_roster first, then the whole file (a module-level dict it returns).
 */
function rosterPairs(code: string): [string, string][] {
  const scan = (src: string) => {
    const found: [number, string, string][] = [];
    const collect = (re: RegExp, k: number, v: number) => {
      for (const m of src.matchAll(re)) found.push([m.index!, m[k], m[v]]);
    };
    collect(/(["'])([^"'\n]*)\1\s*:\s*(["'])([^"'\n]*)\3/g, 2, 4);
    collect(/\[\s*(["'])([^"'\n]*)\1\s*\]\s*=(?!=)\s*(["'])([^"'\n]*)\3/g, 2, 4);
    if (/\bdict\s*\(/.test(src)) collect(/[(,]\s*([A-Za-z_]\w*)\s*=(?!=)\s*(["'])([^"'\n]*)\2/g, 1, 3);
    return found.sort((a, b) => a[0] - b[0]).map(([, k, v]) => [k, v] as [string, string]);
  };
  const inBody = scan(rawDefBody(code, "build_roster") ?? "");
  return inBody.length > 0 ? inBody : scan(noComments(code));
}

type RosterIssue =
  | StyleIssue | ShapeIssue
  | "unquoted" | "comma" | "empty" | "case" | "missing" | "dup" | "spelling" | "floor" | "extra";

function rosterCheck(code: string): RosterIssue | null {
  const style = defStyle(code, "buildRoster");
  if (style) return style;
  const shape = fnShape(code, "build_roster", 0, /^Floor \d$/);
  if (shape) return shape;
  const body = defBody(code, "build_roster")!;
  if (/[{,]\s*[A-Z][a-z]+\s*:/.test(body)) return "unquoted";
  if (/["']\s+["'][^"'\n]*["']\s*:/.test(rawDefBody(code, "build_roster")!)) return "comma";
  const pairs = rosterPairs(code);
  if (pairs.length === 0) return "empty";
  const keys = pairs.map(([k]) => k);
  for (const [name, floor] of ROSTER) {
    const hits = pairs.filter(([k]) => k === name);
    if (hits.length === 0) return keys.some((k) => k.toLowerCase() === name.toLowerCase()) ? "case" : "missing";
    if (hits.length > 1) return "dup";
    const value = hits[0][1];
    if (value !== floor) {
      const loose = (s: string) => s.toLowerCase().replace(/\s+/g, "");
      return loose(value) === loose(floor) ? "spelling" : "floor";
    }
  }
  if (keys.some((k) => !ROSTER.some(([n]) => n === k))) return "extra";
  return null;
}

const ROSTER_MESSAGES: Record<RosterIssue, string> = {
  ...styleMessages("build_roster", "build_roster()"),
  ...shapeMessages(
    "build_roster",
    "build_roster()",
    "`build_roster` takes nothing — the terminal calls it with empty brackets: `def build_roster():`.",
    "the function never hands the roster back. put the dict after `return`: `return {\"Chen\": \"Floor 1\", ...}`.",
  ),
  unquoted:
    "the names need quotes: `\"Chen\": \"Floor 1\"`. without them python goes looking for a variable called `Chen` and stops.",
  comma: "a comma's missing between two pairs. every pair ends with one — `\"Chen\": \"Floor 1\",` — even the last is fine with it.",
  empty: "i don't see any pairs. each guard is a name, a colon, a floor: `\"Chen\": \"Floor 1\"`, all inside `{ }`.",
  case: "keys are case-sensitive. the terminal looks guards up by their exact names: `\"Chen\"`, `\"Alvarez\"`, `\"Volkov\"`, `\"Park\"`, `\"Santos\"`.",
  missing: "a guard's missing. the roster needs all five: `Chen`, `Alvarez`, `Volkov`, `Park`, `Santos`.",
  dup: "a name's in there twice. a dict keeps one value per key — the second silently replaces the first, and the count comes up short.",
  spelling: "the floors are spelled exactly — capital F, one space, the number: `\"Floor 1\"`.",
  floor:
    "someone's on the wrong floor. `Chen` and `Santos` are on `Floor 1`, `Alvarez` and `Volkov` on `Floor 2`, `Park` on `Floor 3`.",
  extra: "there's a name in there that isn't on the schedule. just the five guards — the terminal counts them.",
};

const CH04_ROSTER_DONE =
  "roster confirmed. i ask for volkov, i get floor 2. five guards, no searching.\n\nnow find me a floor nobody's watching.\n\n||COMPLETE||";

const ch04Guardmap: StepBank = {
  intro:
    "i need every guard and their floor in one place, so i can look anyone up in an instant. write `build_roster()` and have it return a dictionary — each name paired with a floor:\n\n`\"Chen\": \"Floor 1\"`, `\"Alvarez\": \"Floor 2\"`, `\"Volkov\": \"Floor 2\"`, `\"Park\": \"Floor 3\"`, `\"Santos\": \"Floor 1\"`.",

  conceptFAQ: [
    {
      keywords: ["dict", "dictionary", "what is a dict", "key", "value", "pair"],
      response: "a dict pairs keys with values: `{\"Chen\": \"Floor 1\"}`. the name is the key, the floor is the value. ask for a key, get its value back.",
    },
    {
      keywords: ["map", "object", "hash", "table"],
      response: "python calls it a dict. curly braces, `key: value` pairs, commas between them.",
    },
    {
      keywords: ["comma", "multiple", "more than one", "several", "each line", "format"],
      response: "commas between pairs. with five guards, one pair per line reads best — and end every line with a comma, even the last.",
    },
    {
      keywords: ["quote", "quotes"],
      response: "the names and floors are text, so both go in quotes: `\"Chen\": \"Floor 1\"`.",
    },
    {
      keywords: ["lookup", "look up", "access", "bracket", "keyerror", "get"],
      response: "`r[\"Volkov\"]` hands back `\"Floor 2\"`. ask for a name that isn't there and python raises a `KeyError` — `r.get(\"Nobody\")` gives `None` instead.",
    },
    {
      keywords: ["len", "count", "how many", "size", "five"],
      response: "`len(r)` counts the pairs. the terminal expects 5.",
    },
    {
      keywords: ["twice", "duplicate", "same key", "repeat"],
      response: "a key can only appear once. write it twice and python keeps the last value without a word — and you're a guard short.",
    },
    {
      keywords: ["return", "print"],
      response: "`return` the dict. the terminal calls `build_roster()` and does the lookups itself — printing it doesn't hand it over.",
    },
    {
      keywords: ["order"],
      response: "dicts keep the order you wrote them in. the terminal asks by name, though, so order doesn't matter here.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`def build_roster():`, then `return {` with the five pairs, then `}`. the terminal does the lookups.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => {
        const lines = out.trim().split("\n");
        return lines.length === 3 && /^\d+$/.test(lines[2]) && lines[2] !== "5";
      },
      response: "the count's off — the terminal expects 5 guards. one's missing, or a name is in there twice and the second copy replaced the first.",
    },
    {
      match: (out) => out.trim().split("\n")[0] !== "Floor 2",
      response: "the terminal asked for `Volkov` and didn't get `Floor 2`. check his pair — name and floor spelled exactly.",
    },
    {
      match: (out) => out.trim().split("\n")[1] !== "Floor 1",
      response: "the terminal asked for `Chen` and didn't get `Floor 1`. check her pair — name and floor spelled exactly.",
    },
  ],

  codePatterns: checkPatterns(rosterCheck, ROSTER_MESSAGES, CH04_ROSTER_DONE),
  correctResponse: CH04_ROSTER_DONE,

  genericWrong: [
    "not matching. `build_roster()` needs to return a dict with all five guards.",
    "the terminal looked guards up and didn't get the right floors. check every pair.",
  ],

  rushDialogue: [
    "we don't have long. build the roster.",
    "hurry — one dict, five guards, returned.",
  ],

  stuckResponses: [
    "```\ndef build_roster():\n    return {\n        \"Chen\": \"Floor 1\",\n        \"Alvarez\": \"Floor 2\",\n        \"Volkov\": \"Floor 2\",\n        \"Park\": \"Floor 3\",\n        \"Santos\": \"Floor 1\",\n    }\n```",
    "one function, one dict, five pairs. name in quotes, colon, floor in quotes, comma.",
  ],

  deflections: [
    "focus. the roster first.",
    "not now — i need to know where every guard is.",
  ],
};

// ── chapter-04:clearfloors ──

type ClearIssue =
  | StyleIssue | "roster" | ShapeIssue
  | "names" | "noValues" | "noLoop" | "fixedTop" | "offByOne" | "fromZero"
  | "noSpace" | "lowercase" | "noFloorName" | "inverted" | "noCheck" | "givesUp";

function clearCheck(code: string): ClearIssue | null {
  const style = defStyle(code, "findClearFloor");
  if (style) return style;
  if (rosterCheck(code) !== null) return "roster";
  const shape = fnShape(code, "find_clear_floor", 2, /^Floor \d$/);
  if (shape) return shape;
  const [g, top] = paramNames(code, "find_clear_floor")!;
  const body = defBody(code, "find_clear_floor")!;
  const raw = rawDefBody(code, "find_clear_floor")!;

  if (new RegExp(`\\bset\\s*\\(\\s*${g}\\s*\\)|\\b${g}\\s*\\.\\s*keys\\s*\\(`).test(body)) return "names";
  if (!new RegExp(`\\b${g}\\s*\\.\\s*(values|items)\\s*\\(|\\b${g}\\s*\\[`).test(body)) {
    return new RegExp(`\\bin\\s+${g}\\b`).test(body) ? "names" : "noValues";
  }

  const loop = rangeLoopIn(body);
  if (!loop || loop.args.length === 0 || loop.args.length > 3) return "noLoop";
  const [start, stop] = loop.args.length === 1 ? ["0", loop.args[0]] : loop.args;
  if (!new RegExp(`\\b${top}\\b`).test(stop)) return "fixedTop";
  const plusOne = stop === `${top}+1` || stop === `1+${top}`;
  if (start === "1") {
    if (!plusOne) return "offByOne";
  } else if (start === "0") {
    if (!new RegExp(`\\b${loop.v}\\s*\\+\\s*1\\b|\\b1\\s*\\+\\s*${loop.v}\\b`).test(body)) return "fromZero";
  } else {
    return "fromZero";
  }

  if (!/["']Floor /.test(raw)) {
    if (/["']Floor/.test(raw)) return "noSpace";
    return /["']floor/i.test(raw) ? "lowercase" : "noFloorName";
  }

  const okCheck = /^\s*if\b[^\n]*\bnot\b[^\n]*\bin\b/m.test(body) || /^\s*if\b[^\n]*\bin\b[^\n]*:\s*(\n\s*)?continue\b/m.test(body);
  if (!okCheck) return /^\s*if\b[^\n]*\bin\b/m.test(body) ? "inverted" : "noCheck";

  const block = loop.block;
  const givesUp = block.some((l, k) => /^\s*else\s*:/.test(l) && /\breturn\b/.test(blockAt(block, k)));
  if (givesUp) return "givesUp";
  return null;
}

const CLEAR_MESSAGES: Record<ClearIssue, string> = {
  ...styleMessages("find_clear_floor", "find_clear_floor(guards, max_floor)"),
  roster: "keep `build_roster` from the last step, all five guards right — the terminal still calls it to get the real roster.",
  ...shapeMessages(
    "find_clear_floor",
    "find_clear_floor(guards, max_floor)",
    "it takes two things — the roster and the top floor: `def find_clear_floor(guards, max_floor):`.",
    "the function never hands a floor back. when you find the gap, `return` its name.",
  ),
  names:
    "that's collecting the names, not the floors. looping over a dict, or `.keys()`, gives you keys. `guards.values()` gives the floors.",
  noValues: "get the floors out of the roster first: `set(guards.values())` — every floor that has a guard, each one once.",
  noLoop: "walk the floors one by one: `for i in range(1, max_floor + 1):`.",
  fixedTop:
    "loop up to `max_floor`, not a number you picked. the terminal tries a three-floor building too — the top floor has to come from the parameter.",
  offByOne: "range stops before its end, so `range(1, max_floor)` never checks the top floor. add one: `range(1, max_floor + 1)`.",
  fromZero: "the floors start at 1, and `range(max_floor)` starts at 0. give range both ends: `range(1, max_floor + 1)`.",
  noSpace: "the floor names need a space: `f\"Floor {i}\"`. the roster says `Floor 1`, not `Floor1`.",
  lowercase: "the roster spells it with a capital: `f\"Floor {i}\"`. `floor 1` won't match `Floor 1`.",
  noFloorName: "build each floor's name the way the roster writes it: `f\"Floor {i}\"`.",
  inverted:
    "that check is backwards — it returns the first floor that has a guard. you want the first one that doesn't: `if name not in occupied:`.",
  noCheck: "check each floor against the set: `if name not in occupied:` — then return it.",
  givesUp:
    "the `else: return` fires on the very first occupied floor, so you give up after one check. drop the else and let the loop keep going.",
};

const CH04_CLEAR_DONE = "floor 4 is clear. that's our window. forty minutes.\n\n||COMPLETE||";

const ch04Clearfloors: StepBank = {
  intro:
    "now find the one floor nobody is watching — that's where i move next. write `find_clear_floor(guards, max_floor)`: put every floor that has a guard into a set, then check `Floor 1` up to `Floor max_floor` and return the first one that isn't in it.",

  conceptFAQ: [
    {
      keywords: ["set", "what is a set", "why set"],
      response: "a set holds each thing once and answers `in` instantly. `set(guards.values())` is every floor that has a guard on it.",
    },
    {
      keywords: ["values", "floors", "just the floors", ".values"],
      response: "`guards.values()` hands you every value in the dict — the floors — without the names. `guards.keys()` would be the names.",
    },
    {
      keywords: ["list", "why not a list"],
      response: "a list works, but it checks every item one by one to answer `in`. a set jumps straight to the answer — and drops the repeats.",
    },
    {
      keywords: ["not in", "membership", "check", "contains", "in"],
      response: "`if name not in occupied:` — reads like english. true when nobody's on that floor.",
    },
    {
      keywords: ["range", "loop", "1 to", "max_floor", "+ 1", "+1"],
      response: "`for i in range(1, max_floor + 1):` — range stops before its end, so add one to reach the top floor.",
    },
    {
      keywords: ["f-string", "fstring", "name", "floor name", "build", "format"],
      response: "an f-string: `f\"Floor {i}\"`. it has to match the roster exactly — capital F, one space.",
    },
    {
      keywords: ["{}", "empty set", "empty"],
      response: "careful — `{}` is an empty dict, not a set. an empty set is `set()`. but `set(guards.values())` builds the full one in a single call.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`occupied = set(guards.values())`, then loop `range(1, max_floor + 1)`, build `f\"Floor {i}\"`, and return the first one `not in occupied`.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /^Floor 0$/m.test(out),
      response: "`Floor 0` — your loop starts at 0. the floors start at 1: `range(1, max_floor + 1)`.",
    },
    {
      match: (out) => out.trim() === "Floor 1\nFloor 1\nFloor 1",
      response:
        "`Floor 1` every time — the check never sees a guard. make sure the set holds the floors (`guards.values()`, not the names) and you return the floor that's `not in` it.",
    },
    {
      match: (out) => {
        const lines = out.trim().split("\n");
        return lines.length === 3 && lines[1] === "Floor 2" && /^(None|)$/.test(lines[0]) && /^(None|)$/.test(lines[2]);
      },
      response: "the top floor never gets checked — range stops before its end. `range(1, max_floor + 1)`.",
    },
    {
      match: (out) => /^None$/m.test(out),
      response: "`None` means the function finished without returning a floor. `return name` the moment you find one that's clear.",
    },
    {
      match: (out) => /^Floor\d/m.test(out),
      response: "the names need a space — `f\"Floor {i}\"`. `Floor1` doesn't match the roster's `Floor 1`, so every floor looks empty.",
    },
  ],

  codePatterns: checkPatterns(clearCheck, CLEAR_MESSAGES, CH04_CLEAR_DONE),
  correctResponse: CH04_CLEAR_DONE,

  genericWrong: [
    "not matching. build the set of occupied floors, walk 1 to `max_floor`, return the first gap.",
    "the terminal tries different rosters and floor counts. the logic has to work for any of them, not just ours.",
  ],

  rushDialogue: [
    "reeves is waiting. find the clear floor.",
    "the window is closing. finish the function.",
  ],

  stuckResponses: [
    "```\ndef find_clear_floor(guards, max_floor):\n    occupied = set(guards.values())\n    for i in range(1, max_floor + 1):\n        name = f\"Floor {i}\"\n        if name not in occupied:\n            return name\n```",
    "three moves: a set of the occupied floors, a loop from 1 to the top, return the first floor that's not in the set.",
  ],

  deflections: [
    "focus. i need the clear floor.",
    "not now — find me a floor nobody's watching.",
  ],
};

// ══════════════════════════════════════════════════════════════
//  Chapter 04.2
// ══════════════════════════════════════════════════════════════

const CH04_2_SCAFFOLD_DONE =
  "relay terminal online. nothing to import — python had it all along.\n\nnow build the cipher.\n\n||COMPLETE||";

const ch04_2Scaffold: StepBank = {
  intro:
    "the comms room. ghost's keyword sweep comes around every thirty seconds, and i need this terminal online before the next one. print `Hello World`.",

  conceptFAQ: [
    {
      keywords: ["print", "output"],
      response: "`print(\"Hello World\")`. one line.",
    },
    {
      keywords: ["import", "package", "strings", "setup", "skeleton", "scaffold"],
      response: "nothing to import. slicing, `split`, `join`, `int` and `str` are all built in.",
    },
    {
      keywords: ["cipher", "reverse", "encode", "scramble"],
      response: "the cipher comes next. get the terminal online first.",
    },
    {
      keywords: ["main", "entry", "start"],
      response: "no main. python runs the file from the top.",
    },
  ],

  codePatterns: scaffoldPatterns(CH04_2_SCAFFOLD_DONE),
  correctResponse: CH04_2_SCAFFOLD_DONE,
  genericWrong: SCAFFOLD_GENERIC,
  rushDialogue: [],
  stuckResponses: [
    "`print(\"Hello World\")` — that's all.",
    "lowercase `print`, round brackets, text in quotes.",
  ],
  deflections: ["terminal first. one line, before the sweep."],
};

// ── chapter-04.2:reverseword ──

type ReverseIssue =
  | StyleIssue | ShapeIssue
  | "jsSplit" | "strReverse" | "reverseNone" | "immutable" | "iterator" | "badSlice" | "unknown";

function reverseCheck(code: string): ReverseIssue | null {
  const style = defStyle(code, "reverseWord");
  if (style) return style;
  const shape = fnShape(code, "reverse_word", 1, /^(olleh|oG)$/);
  if (shape) return shape;
  const [p] = paramNames(code, "reverse_word")!;
  const body = defBody(code, "reverse_word")!;
  if (/\.\s*split\s*\(\s*(["'])\1\s*\)/.test(body)) return "jsSplit";
  if (new RegExp(`\\b${p}\\s*\\.\\s*reverse\\s*\\(`).test(body)) return "strReverse";
  if (/\breturn\b[^\n]*\.\s*reverse\s*\(|=\s*[^\n=]*\.\s*reverse\s*\(\s*\)/.test(body)) return "reverseNone";
  if (new RegExp(`\\b${p}\\s*\\[[^\\]\\n]*\\]\\s*(,[^=\\n]*)?=(?!=)`).test(body)) return "immutable";
  if (/\breversed\s*\(/.test(body) && !/\.\s*join\s*\(/.test(body)) return "iterator";

  const emptyJoin = /(["'])\1\s*\.\s*join\s*\(/.test(body);
  const sliceOnP = new RegExp(`\\b${p}\\s*\\[\\s*(-\\s*1|len\\s*\\(\\s*${p}\\s*\\)(\\s*-\\s*1)?)?\\s*:\\s*:\\s*-\\s*1\\s*\\]`).test(body);
  const anySlice = /\[\s*:\s*:\s*-\s*1\s*\]/.test(body);
  const loopVar = body.match(new RegExp(`\\bfor\\s+(\\w+)\\s+in\\s+${p}\\s*:`))?.[1];
  const prepends = !!loopVar && new RegExp(`\\b(\\w+)\\s*=\\s*${loopVar}\\s*\\+\\s*\\1\\b`).test(body);
  const backwardsIndex =
    new RegExp(`range\\s*\\(\\s*len\\s*\\(\\s*${p}\\s*\\)\\s*-\\s*1\\s*,\\s*-\\s*1\\s*,\\s*-\\s*1\\s*\\)`).test(body) && /\+=/.test(body);
  const listFlip = /\.\s*reverse\s*\(\s*\)/.test(body) && emptyJoin;
  const joinReversed = /\.\s*join\s*\(\s*reversed\s*\(/.test(body) && emptyJoin;
  if (sliceOnP || (anySlice && emptyJoin) || prepends || backwardsIndex || listFlip || joinReversed) return null;
  if (new RegExp(`\\breturn\\s+${p}\\s*\\[`).test(body)) return "badSlice";
  return "unknown";
}

const REVERSE_MESSAGES: Record<ReverseIssue, string> = {
  ...styleMessages("reverse_word", "reverse_word(s)"),
  ...shapeMessages(
    "reverse_word",
    "reverse_word(s)",
    "it takes one thing — the word: `def reverse_word(s):`.",
    "the function never hands the word back. end it with `return` and the reversed word.",
  ),
  jsSplit: "`split(\"\")` is how another language does it — python refuses an empty separator. a string is already a sequence of characters: `s[::-1]`.",
  strReverse: "strings don't have `.reverse()` — that's a list thing. slice it backwards instead: `s[::-1]`.",
  reverseNone:
    "`.reverse()` flips a list in place and returns `None` — so there's nothing to hand back. use the slice: `return s[::-1]`.",
  immutable: "strings can't be changed in place — python won't let you assign to `s[i]`. build a new string instead: `s[::-1]` does it in one go.",
  iterator: "`reversed(s)` hands back an iterator, not a string. glue it: `\"\".join(reversed(s))` — or just `s[::-1]`.",
  badSlice: "close — that slice isn't the whole word backwards. leave start and stop empty, step -1: `s[::-1]`.",
  unknown: "the word has to come back backwards. a slice with a step of -1 does it: `return s[::-1]`.",
};

const CH04_2_REVERSE_DONE = "`olleh`... `oG`... the cipher works. one word at a time.\n\n||COMPLETE||";

const ch04_2Reverseword: StepBank = {
  intro:
    "ghost's scanners read every word on this relay. scramble a word and they can't recognise it. write `reverse_word(s)` that returns the word backwards — `hello` comes back `olleh`.",

  conceptFAQ: [
    {
      keywords: ["slice", "slicing", "[::-1]", "colon", "step"],
      response: "`s[start:stop:step]`. leave start and stop empty to take the whole word; a step of -1 walks it from the end. `s[::-1]`.",
    },
    {
      keywords: ["change", "modify", "in place", "immutable", "assign"],
      response: "strings can't be changed in place. you don't flip the old one — you build a new one and return it.",
    },
    {
      keywords: ["index", "s[0]", "s[-1]", "character", "letter"],
      response: "`s[0]` is the first character, `s[-1]` the last. negative numbers count from the end.",
    },
    {
      keywords: ["reversed", "reverse()", ".reverse"],
      response: "`reversed(s)` gives an iterator you'd have to join back up. `.reverse()` only exists on lists. the slice `s[::-1]` is the short way.",
    },
    {
      keywords: ["unicode", "emoji", "bytes", "rune"],
      response: "a python string is a sequence of unicode characters, not raw bytes — slicing never cuts one in half.",
    },
    {
      keywords: ["return", "print"],
      response: "`return` the reversed word. the terminal calls `reverse_word` and prints what comes back.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`def reverse_word(s):` and `return s[::-1]`. two lines.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /^None$/m.test(out),
      response: "`None` means the function didn't hand anything back. `return s[::-1]`.",
    },
    {
      match: (out) => /<reversed object/.test(out),
      response: "that's the iterator itself, not a word. `reversed(s)` needs gluing: `\"\".join(reversed(s))` — or use `s[::-1]`.",
    },
    {
      match: (out) => /^\[/m.test(out),
      response: "you're handing back a list of letters. glue them into one string — `\"\".join(...)` — or use `s[::-1]`.",
    },
    {
      match: (out) => out.trim() === "hello\nGo\na",
      response: "that's the same word back. the step needs to be -1: `s[::-1]`.",
    },
    {
      match: (out) => out.trim() === "o\no\na",
      response: "that's just the last letter. two colons, then -1: `s[::-1]` takes the whole word.",
    },
  ],

  codePatterns: checkPatterns(reverseCheck, REVERSE_MESSAGES, CH04_2_REVERSE_DONE),
  correctResponse: CH04_2_REVERSE_DONE,

  genericWrong: [
    "not matching. `reverse_word` should return the word backwards — `hello` to `olleh`.",
    "the terminal tries more than one word. make sure every letter comes back, in reverse.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\ndef reverse_word(s):\n    return s[::-1]\n```",
    "a slice with an empty start, an empty stop, and a step of -1. that's the whole trick.",
  ],

  deflections: [
    "focus. one word, backwards.",
    "not now — i need the word cipher working before the sweep.",
  ],
};

// ── chapter-04.2:encode ──

type EncodeIssue =
  | StyleIssue | "reverse" | ShapeIssue
  | "splitEmpty" | "whole" | "noSplit" | "concat" | "noJoin" | "joinEmpty" | "joinSep" | "listReversed" | "noReverse";

function encodeCheck(code: string): EncodeIssue | null {
  const style = defStyle(code, "reverseWord");
  if (style) return style;
  if (reverseCheck(code) !== null) return "reverse";
  const shape = fnShape(code, "encode", 1, /^roolf si raelc$/);
  if (shape) return shape;
  const [p] = paramNames(code, "encode")!;
  const body = defBody(code, "encode")!;
  const raw = rawDefBody(code, "encode")!;
  if (/\.\s*split\s*\(\s*(["'])\1\s*\)/.test(body)) return "splitEmpty";
  if (!/\.\s*split\s*\(/.test(body)) {
    return new RegExp(`\\breverse_word\\s*\\(\\s*${p}\\s*\\)|\\b${p}\\s*\\[\\s*:\\s*:\\s*-\\s*1`).test(body) ? "whole" : "noSplit";
  }
  if (!/\.\s*join\s*\(/.test(body)) return /\+=/.test(body) ? "concat" : "noJoin";
  if (/(["'])\1\s*\.\s*join\s*\(/.test(body)) return "joinEmpty";
  if (!/(["']) \1\s*\.\s*join\s*\(/.test(raw)) return "joinSep";
  const words = body.match(/\b(\w+)\s*=\s*\w+\s*\.\s*split\s*\(/)?.[1];
  if (/\breverse_word\s*\(\s*\w+\s*\.\s*split\s*\(/.test(body)) return "listReversed";
  if (words && new RegExp(`\\breverse_word\\s*\\(\\s*${words}\\s*\\)|\\b${words}\\s*\\[\\s*:\\s*:\\s*-\\s*1`).test(body)) return "listReversed";
  if (!/\breverse_word\b/.test(body) && !/\[\s*:\s*:\s*-\s*1\s*\]/.test(body)) return "noReverse";
  return null;
}

const ENCODE_MESSAGES: Record<EncodeIssue, string> = {
  ...styleMessages("encode", "encode(msg)"),
  reverse: "keep `reverse_word` from the last step working — `encode` leans on it for every word.",
  ...shapeMessages(
    "encode",
    "encode(msg)",
    "it takes one thing — the message: `def encode(msg):`.",
    "the function never hands the message back. `return` the joined words.",
  ),
  splitEmpty: "`split(\"\")` raises an error — python won't split on nothing. `msg.split()` with empty brackets splits on spaces.",
  whole:
    "that reverses the whole message, so the words swap places too. split it into words first — `msg.split()` — and reverse each one on its own.",
  noSplit: "break the message into words first: `msg.split()` hands back a list of them.",
  concat:
    "building it with `+=` leaves a stray space on one end. `\" \".join(...)` puts spaces only between the words.",
  noJoin: "glue the reversed words back into one string: `\" \".join(...)`. returning the list isn't a message.",
  joinEmpty: "`\"\".join` glues them with nothing in between — the words run together. use a space: `\" \".join(...)`.",
  joinSep: "join the words with a single space: `\" \".join(...)`. the string before `.join` is what goes between them.",
  listReversed:
    "that reverses the list, not the words — they swap places but stay readable. reverse each word: `[reverse_word(w) for w in words]`.",
  noReverse: "every word needs reversing on its way through: `reverse_word(w)` for each `w`.",
};

const CH04_2_ENCODE_DONE =
  "`roolf si raelc`. and twice through, it comes back clean — reeves can decode on her end.\n\n||COMPLETE||";

const ch04_2Encode: StepBank = {
  intro:
    "one word isn't a message. scramble whole messages — and prove reeves can unscramble them on her end. write `encode(msg)`: split it into words, reverse each with `reverse_word`, join them back with spaces. run it twice and the original comes back.",

  conceptFAQ: [
    {
      keywords: ["split", "words", "break"],
      response: "`msg.split()` with empty brackets splits on any run of spaces and hands back a list of words.",
    },
    {
      keywords: ["join", "glue", "combine", "back together"],
      response: "`\" \".join(words)` — the string before `.join` goes between every word. a space here.",
    },
    {
      keywords: ["list", "what is a list"],
      response: "a list is an ordered row of values in square brackets: `[\"floor\", \"is\", \"clear\"]`. it's what `split` hands you.",
    },
    {
      keywords: ["comprehension", "for w in", "each word", "every word", "loop"],
      response: "loop and `append` each reversed word to a new list — or in one line: `[reverse_word(w) for w in words]`.",
    },
    {
      keywords: ["append", "add to list"],
      response: "`result.append(reverse_word(w))` adds one item to the end of the list. start with `result = []`.",
    },
    {
      keywords: ["round trip", "twice", "decode", "encode(encode"],
      response: "reverse a word twice and it's back where it started. so `encode(encode(x))` gives `x` — that's how reeves decodes.",
    },
    {
      keywords: ["+=", "concatenate", "plus"],
      response: "you can build it with `+=`, but you'll fight the spaces. `\" \".join` puts them only between words.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`def encode(msg):` and `return \" \".join(reverse_word(w) for w in msg.split())`. split, reverse each, join.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /^\[/m.test(out),
      response: "that's the list itself. glue it back into one line: `\" \".join(...)`.",
    },
    {
      match: (out) => out.trim().split("\n")[0] === "raelc si roolf",
      response: "the whole message got reversed — the words swapped places. reverse each word on its own and keep them in order.",
    },
    {
      match: (out) => out.trim().split("\n")[0] === "clear is floor",
      response: "the words swapped places but they're still readable. that's reversing the list — reverse each word instead.",
    },
    {
      match: (out) => out.trim().split("\n")[0] === "roolfsiraelc",
      response: "the words ran together. join them with a space: `\" \".join(...)`.",
    },
    {
      match: (out) => /^None$/m.test(out),
      response: "`None` — `encode` didn't hand anything back. `return` the joined string.",
    },
  ],

  codePatterns: checkPatterns(encodeCheck, ENCODE_MESSAGES, CH04_2_ENCODE_DONE),
  correctResponse: CH04_2_ENCODE_DONE,

  genericWrong: [
    "not matching. split the message, reverse each word, join with spaces.",
    "the round trip has to work — encoding twice should give the original back.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\ndef encode(msg):\n    words = msg.split()\n    return \" \".join(reverse_word(w) for w in words)\n```",
    "split, reverse each, join. `msg.split()`, `reverse_word(w)` for every word, `\" \".join(...)`.",
  ],

  deflections: [
    "focus. the whole message needs scrambling.",
    "not now — the intercept's live. encode first.",
  ],
};

// ── chapter-04.2:relayheader ──

type HeaderIssue =
  | StyleIssue | ShapeIssue
  | "repeat" | "float" | "noInt" | "noTry" | "noExcept" | "wrongExcept" | "excNoReturn" | "noErr" | "errNoFloor" | "noDouble" | "noC";

function headerCheck(code: string): HeaderIssue | null {
  const style = defStyle(code, "relayHeader");
  if (style) return style;
  const shape = fnShape(code, "relay_header", 2, /^F\d-(C\d+|ERR)$/);
  if (shape) return shape;
  const [f, c] = paramNames(code, "relay_header")!;
  const body = defBody(code, "relay_header")!;
  const raw = rawDefBody(code, "relay_header")!;

  if (!new RegExp(`\\bint\\s*\\(\\s*${c}\\b`).test(body)) {
    if (new RegExp(`\\b${c}\\s*\\*|\\*\\s*${c}\\b`).test(body)) return "repeat";
    return /\bfloat\s*\(/.test(body) ? "float" : "noInt";
  }

  if (!/^\s*try\s*:/m.test(body)) {
    const looksFirst = new RegExp(`\\bnot\\s+${c}\\s*\\.\\s*(isdigit|isdecimal|isnumeric)\\s*\\(`).test(body) && /ERR/.test(raw);
    if (!looksFirst) return "noTry";
  } else {
    const lines = body.split("\n");
    const rawLines = raw.split("\n");
    const handlers = lines.flatMap((l, i) => (/^\s*except\b/.test(l) ? [i] : []));
    if (handlers.length === 0) return "noExcept";
    const catches = handlers.some((i) => {
      const kind = lines[i].replace(/^\s*except\b/, "").replace(/\bas\s+\w+/, "").replace(/:.*$/, "").trim();
      return kind === "" || /\b(ValueError|Exception|BaseException)\b/.test(kind);
    });
    if (!catches) return "wrongExcept";
    const handled = handlers.map((i) => blockAt(rawLines, i)).join("\n");
    if (!/\breturn\b/.test(handled)) return "excNoReturn";
    if (!/ERR/.test(handled)) return "noErr";
    if (!new RegExp(`\\b${f}\\b`).test(handled)) return "errNoFloor";
  }

  if (!/\*\s*2\b|\b2\s*\*/.test(raw) && !/\b(\w+)\s*\+\s*\1\b/.test(raw)) return "noDouble";
  const headerLine = raw.split("\n").some((l) => /-C/.test(l) && new RegExp(`\\b${f}\\b`).test(l));
  if (!headerLine) return "noC";
  return null;
}

const HEADER_MESSAGES: Record<HeaderIssue, string> = {
  ...styleMessages("relay_header", "relay_header(floor, code)"),
  ...shapeMessages(
    "relay_header",
    "relay_header(floor, code)",
    "it takes two things — the floor and the code: `def relay_header(floor, code):`.",
    "the function never hands a header back. `return` it.",
  ),
  repeat:
    "`code` is still text, and text times 2 just repeats it — `\"50\" * 2` is `\"5050\"`. turn it into a number first: `int(code)`.",
  float: "`float` gives you `100.0` — the header wants a whole number. use `int(code)`.",
  noInt: "`code` arrives as text. turn it into a number with `int(code)` before you double it.",
  noTry:
    "`int(\"abc\")` raises a `ValueError` and the whole relay stops. put the conversion in a `try:` and catch it: `except ValueError:`.",
  noExcept: "a `try:` needs an `except ValueError:` underneath — that's where the bad code lands.",
  wrongExcept: "`int(\"abc\")` raises a `ValueError` — that's the one to catch: `except ValueError:`.",
  excNoReturn:
    "the except catches the bad code, then carries on with no number. hand back the error header right there: `return f\"F{floor}-ERR\"`.",
  noErr: "on a bad code the header ends in `-ERR`: `F3-ERR`. return that from the except.",
  errNoFloor: "the error header still needs the floor in front: `f\"F{floor}-ERR\"` gives `F3-ERR`.",
  noDouble: "the relay doubles the code as a checksum — `\"50\"` goes out as `C100`. multiply the number by 2.",
  noC: "the header reads `F2-C100`: `F`, the floor, `-C`, then the doubled code. `f\"F{floor}-C{n * 2}\"`.",
};

const CH04_2_HEADER_DONE =
  "`F2-C100`. `F3-ERR`. `F1-C50`. headers confirmed — bad codes bounce, good ones go through. the relay is live.\n\n||COMPLETE||";

const ch04_2Relayheader: StepBank = {
  intro:
    "last piece. every message gets stamped with where it's going, and the relay can't choke on garbage. write `relay_header(floor, code)`: floor 2 with code `\"50\"` becomes `F2-C100` — the code doubled. `code` arrives as text, so turn it into a number with `int()`. if it isn't a number, return `F3-ERR` for floor 3 instead of crashing.",

  conceptFAQ: [
    {
      keywords: ["int", "convert", "string to int", "number", "text to number"],
      response: "`int(\"50\")` gives you the number 50. `int(\"abc\")` can't, so it raises a `ValueError`.",
    },
    {
      keywords: ["str", "int to string", "to text"],
      response: "`str(2)` gives `\"2\"`. but an f-string converts for you: `f\"F{floor}\"`.",
    },
    {
      keywords: ["valueerror", "error", "crash", "exception", "raise"],
      response: "when `int` can't read the text it raises a `ValueError`. nothing catches it, the program stops — that's the crash.",
    },
    {
      keywords: ["try", "except", "catch", "handle"],
      response: "risky line under `try:`, fallback under `except ValueError:`. if the conversion fails, python jumps straight to the except.",
    },
    {
      keywords: ["eafp", "forgiveness", "permission", "check first", "isdigit"],
      response: "python's habit is to try it and handle the failure — easier to ask forgiveness than permission. checking `isdigit()` first works here, but `int` already knows what a number is.",
    },
    {
      keywords: ["bare except", "except:", "exception", "catch everything"],
      response: "catch the error you expect — `except ValueError:`. a bare `except:` swallows every mistake, typos included, and hides them as `ERR`.",
    },
    {
      keywords: ["*2", "* 2", "double", "multiply", "times two", "why"],
      response: "the relay doubles the code as a checksum. the scanner expects it.",
    },
    {
      keywords: ["f-string", "format", "header", "build"],
      response: "`f\"F{floor}-C{n * 2}\"` — the floor and the doubled code drop straight into the text.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`try:` then `n = int(code)`. under `except ValueError:` return `f\"F{floor}-ERR\"`. after that, return `f\"F{floor}-C{n * 2}\"`.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /-C5050\b|-Cabcabc\b/.test(out),
      response:
        "`5050` — the code is still text, and text times 2 repeats it. turn it into a number first: `int(code)`.",
    },
    {
      match: (out) => /^F\d-C\d+\.\d+$/m.test(out),
      response: "that's a decimal. the header wants a whole number — `int(code)`, not `float(code)`.",
    },
    {
      match: (out) => out.trim() === "F2-ERR\nF3-ERR\nF1-ERR",
      response:
        "every header came back `ERR`, even the good codes. something else in the `try` is failing and the except is hiding it. keep only `int(code)` inside, and catch `ValueError`, not everything.",
    },
    {
      match: (out) => /^F3-C0$/m.test(out),
      response: "a bad code came through as `C0`. it should bounce: return `f\"F{floor}-ERR\"` from the except.",
    },
    {
      match: (out) => /^None$/m.test(out),
      response: "`None` — one of the paths doesn't return anything. both the except and the happy path need a `return`.",
    },
    {
      match: (out) => /^F2-C50$/m.test(out),
      response: "`C50` — the code isn't doubled. the relay wants `n * 2`.",
    },
  ],

  codePatterns: checkPatterns(headerCheck, HEADER_MESSAGES, CH04_2_HEADER_DONE),
  correctResponse: CH04_2_HEADER_DONE,

  genericWrong: [
    "not matching. `int(code)` inside a `try`, `F<floor>-ERR` when it fails, `F<floor>-C<double>` when it doesn't.",
    "check the format: `F2-C100`, and `F3-ERR` for a bad code.",
  ],

  rushDialogue: [
    "scanner sweep in thirty seconds. finish the headers.",
    "no time — `int` inside a `try`, `except ValueError`, return the header.",
  ],

  stuckResponses: [
    "```\ndef relay_header(floor, code):\n    try:\n        n = int(code)\n    except ValueError:\n        return f\"F{floor}-ERR\"\n    return f\"F{floor}-C{n * 2}\"\n```",
    "convert inside `try`, bounce the bad ones in `except ValueError`, and build the header with an f-string.",
  ],

  deflections: [
    "focus. the headers, before the sweep.",
    "not now — i need those headers stamped.",
  ],
};

// ══════════════════════════════════════════════════════════════
//  Act III shape helpers
// ══════════════════════════════════════════════════════════════

interface PyFn {
  name: string;
  isAsync: boolean;
  params: string[];
  /** Masked body (strings blanked, comments gone). */
  body: string;
  /** Body with strings kept, comments blanked. Same lines as `body`. */
  raw: string;
}

const DEF_LINE = /^(\s*)(async\s+)?def\s+(\w+)\s*\(([^)]*)\)/;

const parseParams = (text: string) =>
  text.split(",").map((p) => p.replace(/[:=].*$/, "").replace(/^\*+/, "").trim()).filter(Boolean);

const indentWidth = (line: string) => (line.match(/^[ \t]*/) ?? [""])[0].length;

/** Index just past the block opened on `lines[at]`. */
function blockEnd(lines: string[], at: number): number {
  const base = indentWidth(lines[at]);
  let end = at + 1;
  for (let i = at + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    if (indentWidth(lines[i]) <= base) break;
    end = i + 1;
  }
  return end;
}

function fnAt(masked: string[], raw: string[], at: number): PyFn {
  const m = masked[at].match(DEF_LINE)!;
  return { name: m[3], isAsync: !!m[2], params: parseParams(m[4]), body: blockAt(masked, at), raw: blockAt(raw, at) };
}

/** `def name(...)` or `async def name(...)` anywhere in the program, or null. */
function pyFn(code: string, name: string): PyFn | null {
  const masked = maskPy(code).split("\n");
  const at = masked.findIndex((l) => l.match(DEF_LINE)?.[3] === name);
  return at === -1 ? null : fnAt(masked, noComments(code).split("\n"), at);
}

/** Functions defined inside `f`, and `f`'s own lines with those blocks cut out. */
function splitInner(f: PyFn): { inner: PyFn[]; outer: string } {
  const masked = f.body.split("\n");
  const raw = f.raw.split("\n");
  const inner: PyFn[] = [];
  const outer: string[] = [];
  for (let i = 0; i < masked.length; i++) {
    if (DEF_LINE.test(masked[i])) {
      inner.push(fnAt(masked, raw, i));
      i = blockEnd(masked, i) - 1;
      continue;
    }
    outer.push(masked[i]);
  }
  return { inner, outer: outer.join("\n") };
}

/** The inner function that calls itself, else the first inner function. */
function recursiveInner(f: PyFn): PyFn | null {
  const { inner } = splitInner(f);
  return inner.find((g) => new RegExp(`\\b${g.name}\\s*\\(`).test(g.body)) ?? inner[0] ?? null;
}

/** True when line `idx` sits inside the block opened on line `head`. */
function insideBlock(lines: string[], head: number, idx: number): boolean {
  return idx > head && idx < blockEnd(lines, head);
}

/** Lines of the first block whose opener matches `opener`, or null. */
function clause(body: string, opener: RegExp): string | null {
  const lines = body.split("\n");
  const at = lines.findIndex((l) => opener.test(l));
  return at === -1 ? null : blockAt(lines, at);
}

const hasAsyncioImport = (code: string) => /^\s*(import\s+asyncio\b|from\s+asyncio\s+import\b)/m.test(maskPy(code));

/** Every argument written to `asyncio.sleep(...)` in the program. */
const sleepArgs = (code: string) => [...maskPy(code).matchAll(/\basyncio\s*\.\s*sleep\s*\(([^)\n]*)\)/g)].map((m) => m[1]);

/** Milliseconds → seconds: divides by 1000 (not floor), or multiplies by a thousandth. */
const inSeconds = (arg: string) => /(?<!\/)\/\s*(1000|1e3|1_000)\b|\*\s*(0?\.001|1e-3)\b/.test(arg);
const floorsSeconds = (arg: string) => /\/\/\s*(1000|1e3|1_000)\b/.test(arg);

/** A `for` loop whose block awaits something — one at a time. */
function awaitsInLoop(body: string): boolean {
  const lines = body.split("\n");
  return lines.some((l, i) => /^\s*(async\s+)?for\b/.test(l) && /\bawait\b/.test(blockAt(lines, i)));
}

const usesTimeSleep = (code: string) => /\btime\s*\.\s*sleep\s*\(|^\s*from\s+time\s+import\s+[^\n]*\bsleep\b/m.test(maskPy(code));

const literals = (raw: string) => stringsOf(raw).map(literalText);

// ══════════════════════════════════════════════════════════════
//  Chapter 07
// ══════════════════════════════════════════════════════════════

const CH07_SCAFFOLD_DONE =
  "archive terminal's up. there's a whole directory tree behind it — logs, servers, and something labelled vault.\n\nnow count what's in it.\n\n||COMPLETE||";

const ch07Scaffold: StepBank = {
  intro:
    "the archive terminal locks the moment the server room's night cycle starts. wake it before then: print `Hello World`.",

  conceptFAQ: [
    {
      keywords: ["print", "output"],
      response: "`print(\"Hello World\")` — the same one-liner as every terminal so far.",
    },
    {
      keywords: ["import", "package", "setup", "skeleton", "scaffold"],
      response: "nothing to import. the archive scan is built from plain functions — no modules needed.",
    },
    {
      keywords: ["archive", "tree", "directory", "folder", "thesis"],
      response: "the archive comes next step. wake the terminal first.",
    },
    {
      keywords: ["main", "entry", "start"],
      response: "python starts at the top of the file and runs down. no main needed.",
    },
  ],

  codePatterns: scaffoldPatterns(CH07_SCAFFOLD_DONE),
  correctResponse: CH07_SCAFFOLD_DONE,
  genericWrong: SCAFFOLD_GENERIC,
  rushDialogue: [],
  stuckResponses: [
    "same as every time: `print(\"Hello World\")`.",
    "lowercase `print`, round brackets, the text in quotes. one line.",
  ],
  deflections: ["wake the terminal first. the night cycle won't wait."],
};

// ── chapter-07:scan ──

type ScanIssue =
  | StyleIssue | ShapeIssue
  | "noInner" | "global" | "listHack" | "noNonlocal" | "noRecursion" | "slash" | "noFinally" | "noLog" | "noCall";

/** Shared by scan and recover: an inner recursive walker with a nonlocal counter. */
function walkerIssue(f: PyFn): "noInner" | "global" | "listHack" | "noNonlocal" | "noRecursion" | "slash" | null {
  const inner = recursiveInner(f);
  if (!inner) return "noInner";
  if (/^\s*global\b/m.test(inner.body)) return "global";
  if (/\b\w+\s*\[\s*0\s*\]\s*\+=/.test(inner.body)) return "listHack";
  if (!/^\s*nonlocal\b/m.test(inner.body)) return "noNonlocal";
  const self = new RegExp(`\\b${inner.name}\\s*\\(([^)\\n]*)\\)`);
  const call = inner.body.match(self);
  if (!call) return "noRecursion";
  const loopVar = inner.body.match(/^\s*for\s+(\w+)\s+in\b/m)?.[1];
  if (loopVar && call[1].trim() === loopVar) return "slash";
  return null;
}

function scanCheck(code: string): ScanIssue | null {
  const style = defStyle(code, "scanArchive");
  if (style) return style;
  const shape = fnShape(code, "scan_archive", 2, /^(scanned:|total files:)/);
  if (shape && shape !== "noReturn" && shape !== "prints") return shape;
  const f = pyFn(code, "scan_archive")!;
  const walker = walkerIssue(f);
  if (walker) return walker;
  const inner = recursiveInner(f)!;
  if (!/^\s*finally\s*:/m.test(inner.body)) return "noFinally";
  if (!/\bprint\s*\(/.test(clause(inner.body, /^\s*finally\s*:/) ?? "")) return "noLog";
  const { outer } = splitInner(f);
  if (!new RegExp(`\\b${inner.name}\\s*\\(`).test(outer)) return "noCall";
  if (!/\breturn\b/.test(outer)) return "noReturn";
  return null;
}

const WALKER_MESSAGES = {
  noInner:
    "the counting happens in a function inside the function: `def scan(d):` written inside `scan_archive`, so it can see `archive` and `count` without passing them around.",
  global:
    "`global` reaches all the way out to the file, not to `scan_archive`. the counter lives one level up — `nonlocal count` is the word for that.",
  listHack:
    "a one-item list works, but that's the trick from before python had the real thing. keep `count = 0` and say `nonlocal count` inside `scan`.",
  noNonlocal:
    "`count += 1` inside `scan` makes python treat `count` as scan's own brand-new variable — that's an `UnboundLocalError`. put `nonlocal count` as scan's first line: i mean the one outside.",
  noRecursion:
    "the scan never goes deeper. when an entry ends in `/`, call `scan` again on it: `scan(entry[:-1])`. the function walks one level, then hands the next level to itself.",
  slash:
    "you're calling `scan` with the slash still on — `\"logs/\"` isn't a key in the archive, `\"logs\"` is. strip it: `scan(entry[:-1])`.",
} as const;

const SCAN_MESSAGES: Record<ScanIssue, string> = {
  ...styleMessages("scan_archive", "scan_archive(archive, root)"),
  ...shapeMessages(
    "scan_archive",
    "scan_archive(archive, root)",
    "it takes two things — the archive and where to start: `def scan_archive(archive, root):`.",
    "the function never hands the count back. last line of `scan_archive`: `return count`.",
  ),
  ...WALKER_MESSAGES,
  noFinally:
    "the log has to print as each directory finishes, even if something goes wrong inside. wrap the loop: `try:` … `finally: print(\"scanned:\", d)`.",
  noLog: "the `finally` is there but it doesn't log. put the line in it: `print(\"scanned:\", d)`.",
  noCall: "you built the walker but never set it off. after the inner function: `scan(root)`, then `return count`.",
};

const CH07_SCAN_DONE =
  "nine files. gamma holds three of them — and two have thesis in the name. that's my work in there.\n\nbut the vault entry is wrong. something's waiting in it.\n\n||COMPLETE||";

const ch07Scan: StepBank = {
  intro:
    "my thesis is on one of these servers. i need every file in the archive counted, however deep the folders go. write `scan_archive(archive, root)`: an inner `scan(d)` walks one directory, calls itself for every entry ending in `/`, and counts the rest. it changes `count`, so it needs `nonlocal count`. wrap its loop in `try:` … `finally: print(\"scanned:\", d)` so each directory logs as it finishes.",

  conceptFAQ: [
    {
      keywords: ["unboundlocalerror", "unbound", "referenced before assignment"],
      response: "assigning `count += 1` inside `scan` makes python decide `count` is scan's own variable — and it has no value yet. `nonlocal count` as scan's first line says: the one in scan_archive.",
    },
    {
      keywords: ["nonlocal", "closure", "inner function", "nested", "function inside"],
      response: "a function defined inside another one can read the outer one's names. to change one, it has to say so: `nonlocal count`. that's a closure — a function that remembers where it was made.",
    },
    {
      keywords: ["global"],
      response: "`global` jumps all the way out to the file. `count` lives in `scan_archive`, one level up — that's `nonlocal`.",
    },
    {
      keywords: ["recursion", "recursive", "call itself", "calls itself", "deeper", "nested folder"],
      response: "a function can call itself by name. `scan(\"servers\")` finds `alpha/` and calls `scan(\"alpha\")`, which finishes and hands control back. each call has its own `d`.",
    },
    {
      keywords: ["finally", "try", "defer", "log", "scanned"],
      response: "`finally` runs as the `try` block is left — normally or by an error. so `print(\"scanned:\", d)` in it logs each directory on its way out.",
    },
    {
      keywords: ["order", "root last", "why last", "backwards"],
      response: "root starts first but finishes last — everything inside it has to finish before it does. `finally` prints on the way out, so root's line is the last one.",
    },
    {
      keywords: ["slash", "endswith", "directory", "file or", "folder"],
      response: "`entry.endswith(\"/\")` tells you it's a directory. `entry[:-1]` is the name without the slash — that's the key in the archive.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`count = 0`, then `def scan(d):` inside with `nonlocal count`, a `try`/`finally` around `for entry in archive[d]:`, then `scan(root)` and `return count`.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /^scanned: \w+\/$/m.test(out),
      response: "the log has slashes in it — `scanned: logs/`. pass the name without the slash: `scan(entry[:-1])`.",
    },
    {
      match: (out) => out.trim().startsWith("scanned: root"),
      response: "root logged first — you're printing on the way in. the log belongs in `finally`, which runs as each directory finishes, so the deepest ones come out first.",
    },
    {
      match: (out) => /total files:/.test(out) && !/scanned:/.test(out),
      response: "the count's there but no directory logged. `finally: print(\"scanned:\", d)` inside `scan`.",
    },
    {
      match: (out) => /^total files: 14$/m.test(out),
      response: "14 — you're counting the directories too. an entry ending in `/` gets scanned, not counted.",
    },
    {
      match: (out) => /^total files: 1$/m.test(out),
      response: "1 file — the scan never went past root. call `scan` again for every entry that ends in `/`.",
    },
    {
      match: (out) => /^total files: 0$/m.test(out),
      response: "0 — the count never changed outside `scan`. make sure it's `nonlocal count`, and that `scan_archive` returns that same `count`.",
    },
    {
      match: (out) => /^total files: 9$/m.test(out) && /^total files: 11$/m.test(out),
      response: "the second tree says 11 — the count carried over from the first scan. keep `count = 0` inside `scan_archive`, so every call starts fresh.",
    },
  ],

  codePatterns: checkPatterns(scanCheck, SCAN_MESSAGES, CH07_SCAN_DONE),
  correctResponse: CH07_SCAN_DONE,

  genericWrong: [
    "not matching. every directory logs as it finishes, then the total — 9 for the archive, 2 for the test tree.",
    "check the order: the deepest directories log first, root last. that's `finally` doing its job.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\ndef scan_archive(archive, root):\n    count = 0\n\n    def scan(d):\n        nonlocal count\n        try:\n            for entry in archive[d]:\n                if entry.endswith(\"/\"):\n                    scan(entry[:-1])\n                else:\n                    count += 1\n        finally:\n            print(\"scanned:\", d)\n\n    scan(root)\n    return count\n```",
    "a counter outside, a walker inside that says `nonlocal count`, calls itself on directories, and logs in `finally`.",
  ],

  deflections: [
    "focus. count the archive.",
    "not now — my thesis is in there somewhere.",
  ],
};

// ── chapter-07:recover ──

type RecoverIssue =
  | StyleIssue | ShapeIssue
  | "noInner" | "global" | "listHack" | "noNonlocal" | "noRecursion" | "slash"
  | "noRaise" | "genericRaise" | "outerExcept" | "noExcept" | "raiseOutside" | "noAs" | "noRecord" | "noFinally" | "noCall" | "oneValue";

function recoverCheck(code: string): RecoverIssue | null {
  const style = defStyle(code, "safeScan");
  if (style) return style;
  const shape = fnShape(code, "safe_scan", 2, /^(scanned:|ERROR:|total files:)/);
  if (shape && shape !== "noReturn" && shape !== "prints") return shape;
  const f = pyFn(code, "safe_scan")!;
  const walker = walkerIssue(f);
  if (walker) return walker;
  const inner = recursiveInner(f)!;
  const { outer } = splitInner(f);
  if (!/^\s*raise\b/m.test(inner.body)) return "noRaise";
  if (!/^\s*raise\s+\w+\s*\(/m.test(inner.body)) return "genericRaise";
  if (!/^\s*except\b/m.test(inner.body)) return /^\s*except\b/m.test(outer) ? "outerExcept" : "noExcept";
  const lines = inner.body.split("\n");
  const raiseAt = lines.findIndex((l) => /^\s*raise\b/.test(l));
  const tryAt = lines.findIndex((l) => /^\s*try\s*:/.test(l));
  if (tryAt === -1 || !insideBlock(lines, tryAt, raiseAt)) return "raiseOutside";
  const handler = lines.find((l) => /^\s*except\b/.test(l))!;
  if (!/\bas\s+\w+/.test(handler)) return "noAs";
  if (!/\.\s*append\s*\(/.test(clause(inner.body, /^\s*except\b/) ?? "")) return "noRecord";
  if (!/\bprint\s*\(/.test(clause(inner.body, /^\s*finally\s*:/) ?? "")) return "noFinally";
  if (!new RegExp(`\\b${inner.name}\\s*\\(`).test(outer)) return "noCall";
  const ret = outer.match(/^\s*return\b([^\n]*)/m);
  if (!ret) return "noReturn";
  if (!/,/.test(ret[1])) return "oneValue";
  return null;
}

const RECOVER_MESSAGES: Record<RecoverIssue, string> = {
  ...styleMessages("safe_scan", "safe_scan(archive, root)"),
  ...shapeMessages(
    "safe_scan",
    "safe_scan(archive, root)",
    "it takes the same two things as before: `def safe_scan(archive, root):`.",
    "the function never hands anything back. last line: `return count, errors`.",
  ),
  ...WALKER_MESSAGES,
  noRaise:
    "the trap has to go off loudly. at the top of the walk: `if archive[d] is None: raise RuntimeError(\"corrupted directory\")`.",
  genericRaise: "raise an error object with the message: `raise RuntimeError(\"corrupted directory\")`.",
  outerExcept:
    "your `except` wraps the whole scan, so the first trap ends everything — root never finishes its other directories. catch inside `scan`, so each directory guards itself.",
  noExcept:
    "nothing catches the error, so the program dies at the vault. inside `scan`: `except Exception as e:` and record it.",
  raiseOutside:
    "the `raise` sits outside the `try`, so this directory's own `except` never sees it — the parent catches it instead and stops walking. move the `None` check inside the `try`.",
  noAs: "you need the error's message for the log. name it: `except Exception as e:`.",
  noRecord:
    "the error's caught but not recorded. in the `except`: `errors.append(f\"{d}: {e}\")`.",
  noFinally: "keep the log from last step — `finally: print(\"scanned:\", d)` — so even the trapped directory reports in.",
  noCall: "the walker never starts. after it: `scan(root)`, then `return count, errors`.",
  oneValue: "the terminal unpacks two things: `count, errors = safe_scan(...)`. return both: `return count, errors`.",
};

const CH07_RECOVER_DONE =
  "the vault went off in our hands and the scan kept walking. nine files, one error logged, no alarm.\n\nwhoever set that trap wanted us to stop at the first bad door.\n\n||COMPLETE||";

const ch07Recover: StepBank = {
  intro:
    "ghost booby-trapped part of the archive. if the scan dies on it, the alarm trips. write `safe_scan(archive, root)` returning `count, errors`: a directory whose entries are `None` is corrupted, so `raise RuntimeError(\"corrupted directory\")`. each `scan` call catches its own with `except Exception as e:`, appends `f\"{d}: {e}\"` to `errors`, and the walk keeps going. keep the `finally` log.",

  conceptFAQ: [
    {
      keywords: ["raise", "throw", "panic", "error"],
      response: "`raise RuntimeError(\"corrupted directory\")` stops the function on the spot and travels back up the calls until an `except` catches it. nothing catches it, the program dies.",
    },
    {
      keywords: ["except", "catch", "recover"],
      response: "`except Exception as e:` catches it, and `e` is the error — `str(e)` or `f\"{e}\"` is its message.",
    },
    {
      keywords: ["where", "boundary", "per directory", "inside scan", "keep going", "keep scanning"],
      response: "inside `scan`, around the walk. each call guards itself — vault's call catches vault's error and returns normally, so root's loop moves on.",
    },
    {
      keywords: ["none", "is none", "nil", "null", "corrupted"],
      response: "`if archive[d] is None:` — `is None` is how python checks for nothing. pep 8 prefers it over `== None`.",
    },
    {
      keywords: ["finally", "order", "scanned: vault"],
      response: "`finally` runs even when the `try` raised. so vault still logs `scanned: vault` — and the except has already recorded the error by then.",
    },
    {
      keywords: ["nonlocal", "errors list", "append"],
      response: "`count += 1` needs `nonlocal`. `errors.append(...)` doesn't — it changes the list, it never gives the name a new value.",
    },
    {
      keywords: ["tuple", "two values", "return both"],
      response: "`return count, errors` hands back both. the terminal unpacks them: `count, errors = safe_scan(...)`.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "copy the scan, add `errors = []`. inside `scan`: `try:` the `None` check and the loop, `except Exception as e: errors.append(f\"{d}: {e}\")`, `finally:` the log.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /NoneType/.test(out),
      response: "that's python tripping over the `None` by itself. check first and raise your own: `if archive[d] is None: raise RuntimeError(\"corrupted directory\")`.",
    },
    {
      match: (out) => /^scanned: servers$/m.test(out) && !/^scanned: vault$/m.test(out),
      response: "vault never logged. the `raise` is outside vault's own `try`, so its `finally` never ran and the parent caught the error instead. put the `None` check inside the `try`.",
    },
    {
      match: (out) => /^ERROR: (root|a): /m.test(out) || (/scanned:/.test(out) && !/^scanned: b$/m.test(out)),
      response: "the error ended the whole scan — `b` never got scanned. catch inside `scan`, per directory, so one trap only costs one directory.",
    },
    {
      match: (out) => /^ERROR: corrupted directory$/m.test(out),
      response: "the error needs the directory's name in front: `errors.append(f\"{d}: {e}\")`.",
    },
    {
      match: (out) => /^ERROR: vault: (?!corrupted directory$)/m.test(out),
      response: "the message has to be exactly `corrupted directory` — `raise RuntimeError(\"corrupted directory\")`.",
    },
    {
      match: (out) => /total files:/.test(out) && !/^ERROR:/m.test(out),
      response: "the scan survived but `errors` came back empty. the `except` has to record it: `errors.append(f\"{d}: {e}\")`.",
    },
  ],

  codePatterns: checkPatterns(recoverCheck, RECOVER_MESSAGES, CH07_RECOVER_DONE),
  correctResponse: CH07_RECOVER_DONE,

  genericWrong: [
    "not matching. every directory still logs — vault too — then `total files: 9` and one `ERROR: vault: corrupted directory`.",
    "check that the scan keeps going after the trap, and that the error names its directory.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\ndef safe_scan(archive, root):\n    count = 0\n    errors = []\n\n    def scan(d):\n        nonlocal count\n        try:\n            if archive[d] is None:\n                raise RuntimeError(\"corrupted directory\")\n            for entry in archive[d]:\n                if entry.endswith(\"/\"):\n                    scan(entry[:-1])\n                else:\n                    count += 1\n        except Exception as e:\n            errors.append(f\"{d}: {e}\")\n        finally:\n            print(\"scanned:\", d)\n\n    scan(root)\n    return count, errors\n```",
    "raise in the `try`, record in the `except`, log in the `finally`. every call, every directory.",
  ],

  deflections: [
    "focus. the trap first.",
    "not now — one bad directory and the alarm goes.",
  ],
};

// ══════════════════════════════════════════════════════════════
//  Chapter 08
// ══════════════════════════════════════════════════════════════

const CH08_SCAFFOLD_DONE =
  "breaker console's live. four circuits feed the alarm grid — north, south, east, west.\n\nnow throw one.\n\n||COMPLETE||";

const ch08Scaffold: StepBank = {
  intro:
    "the alarm grid runs on four circuits and this console holds the breakers. bring it online: print `Hello World`.",

  conceptFAQ: [
    {
      keywords: ["print", "output"],
      response: "`print(\"Hello World\")` — one line wakes it.",
    },
    {
      keywords: ["import", "asyncio", "package", "setup", "scaffold"],
      response: "not yet. `asyncio` joins the imports next step, when you first use it. import a thing when you need it.",
    },
    {
      keywords: ["async", "await", "concurrent", "parallel", "breaker", "circuit"],
      response: "the breakers come next. right now just wake the console.",
    },
    {
      keywords: ["main", "entry", "start"],
      response: "python starts at the top of the file and runs down. no main needed.",
    },
  ],

  codePatterns: scaffoldPatterns(CH08_SCAFFOLD_DONE),
  correctResponse: CH08_SCAFFOLD_DONE,
  genericWrong: SCAFFOLD_GENERIC,
  rushDialogue: [],
  stuckResponses: [
    "same as every time: `print(\"Hello World\")`.",
    "lowercase `print`, round brackets, the text in quotes. one line.",
  ],
  deflections: ["console first. then the grid."],
};

// ── chapter-08:goroutine ──

type CutIssue =
  | StyleIssue
  | "noCut" | "cutSync" | "cutSilent" | "noCutAsync" | "asyncCutAsync" | "runLoop" | "bareCoroutine" | "noTask" | "noImport";

function cutCheck(code: string): CutIssue | null {
  const style = defStyle(code, "cutAsync");
  if (style) return style;
  const cut = pyFn(code, "cut");
  if (!cut) return "noCut";
  if (!cut.isAsync) return "cutSync";
  if (!/\bprint\s*\(/.test(cut.body)) return "cutSilent";
  const launcher = pyFn(code, "cut_async");
  if (!launcher) return "noCutAsync";
  if (launcher.isAsync) return "asyncCutAsync";
  if (/\basyncio\s*\.\s*run\s*\(/.test(launcher.body)) return "runLoop";
  if (!/\b(create_task|ensure_future)\s*\(/.test(launcher.body)) {
    return /\bcut\s*\(/.test(launcher.body) ? "bareCoroutine" : "noTask";
  }
  if (!hasAsyncioImport(code)) return "noImport";
  return null;
}

const CUT_MESSAGES: Record<CutIssue, string> = {
  ...styleMessages("cut_async", "cut_async(name)"),
  noCut: "first the breaker itself: `async def cut(name):` that prints `f\"{name} circuit: DOWN\"`.",
  cutSync:
    "the terminal does `await cut(\"North\")`, and you can only await an async function. make it `async def cut(name):`.",
  cutSilent: "`cut` has to report: `print(f\"{name} circuit: DOWN\")`.",
  noCutAsync:
    "now the launcher: `def cut_async(name):` that starts `cut` running and comes straight back.",
  asyncCutAsync:
    "`cut_async` can't be `async def` — calling an async function doesn't run it, it just makes a coroutine, and the terminal never awaits it. keep it a plain `def` that returns `asyncio.create_task(cut(name))`.",
  runLoop:
    "`asyncio.run` starts a whole new event loop and waits for it to finish — the opposite of not waiting, and the terminal's already inside a loop. `asyncio.create_task(cut(name))` schedules it on the running one.",
  bareCoroutine:
    "calling `cut(name)` doesn't run it — it hands you a coroutine, a plan for the work, and nothing ever carries it out. `asyncio.create_task(cut(name))` is what puts it on the schedule.",
  noTask: "`cut_async` has to start `cut` as a task: `return asyncio.create_task(cut(name))`.",
  noImport: "`asyncio` isn't built into every file — `import asyncio` at the top.",
};

const CH08_GOROUTINE_DONE =
  "orders sent before south even dropped. the program didn't stand there watching — that's the only way i get four breakers down.\n\n||COMPLETE||";

const ch08Goroutine: StepBank = {
  intro:
    "i can only throw one breaker at a time by hand. the program has to throw them for me, without stopping to watch each one. `import asyncio`. write `async def cut(name)` that prints `<name> circuit: DOWN`, and a plain `def cut_async(name)` that returns `asyncio.create_task(cut(name))` — started, not waited on.",

  conceptFAQ: [
    {
      keywords: ["async def", "async", "coroutine", "what does async"],
      response: "`async def` changes what calling it means. `cut(\"North\")` doesn't print anything — it hands back a coroutine, a plan for the work. someone has to `await` it, or schedule it.",
    },
    {
      keywords: ["await"],
      response: "`await cut(\"North\")` runs it and waits for it to finish. you can only write `await` inside an `async def` — or at the top of the terminal, which is why the harness can.",
    },
    {
      keywords: ["create_task", "task", "schedule", "background"],
      response: "`asyncio.create_task(cut(name))` puts the coroutine on the schedule and hands back a task straight away. the caller carries on; the task runs the next time anyone pauses.",
    },
    {
      keywords: ["order", "orders sent", "why first", "south later"],
      response: "a task only gets its turn when the code that's running pauses. the terminal prints `orders sent`, then pauses at `await asyncio.sleep(0.1)` — that's when south drops.",
    },
    {
      keywords: ["never runs", "nothing happens", "missing south", "never awaited"],
      response: "a coroutine nobody schedules never runs, and python warns `coroutine was never awaited`. a task nobody waits for doesn't get finished either — the program ends first.",
    },
    {
      keywords: ["thread", "parallel", "same time", "concurrent"],
      response: "one thread, taking turns. while one task waits, another runs. that's how asyncio does many things at once without anything running at the exact same instant.",
    },
    {
      keywords: ["import", "asyncio"],
      response: "`import asyncio` at the top. then everything is `asyncio.something` — `create_task`, `sleep`, `gather`.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`async def cut(name):` with the print, then `def cut_async(name): return asyncio.create_task(cut(name))`. and `import asyncio` on top.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /orders sent/.test(out) && !/South circuit/.test(out),
      response: "south never dropped. the coroutine got made but nobody ran it — `cut(name)` alone is just a plan. `asyncio.create_task(cut(name))` puts it on the schedule.",
    },
    {
      match: (out) => out.indexOf("South circuit") !== -1 && out.indexOf("South circuit") < out.indexOf("orders sent"),
      response: "south dropped before `orders sent` — the caller waited for it. `cut_async` should only schedule the work and come straight back.",
    },
    {
      match: (out) => /circuit: down/i.test(out) && !/circuit: DOWN/.test(out),
      response: "capitals — the grid reads `circuit: DOWN`.",
    },
  ],

  codePatterns: checkPatterns(cutCheck, CUT_MESSAGES, CH08_GOROUTINE_DONE),
  correctResponse: CH08_GOROUTINE_DONE,

  genericWrong: [
    "not matching. north drops, `orders sent`, then south once the terminal pauses.",
    "`cut_async` should start the task and return at once. `asyncio.create_task(cut(name))`.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nimport asyncio\n\n\nasync def cut(name):\n    print(f\"{name} circuit: DOWN\")\n\n\ndef cut_async(name):\n    return asyncio.create_task(cut(name))\n```",
    "the breaker is an `async def`. the launcher is a plain `def` that wraps it in `asyncio.create_task`.",
  ],

  deflections: [
    "focus. one breaker, then four.",
    "not now — the grid's checking itself every few minutes.",
  ],
};

// ── chapter-08:fanout ──

type FanoutIssue =
  | StyleIssue | "noDef" | "sync" | "arity" | "loop" | "noGather" | "noStar" | "noAwait" | "printsLines" | "noReturn";

/** The function each gather call runs — `trip` in `gather(*(trip(n) for ...))`. */
function gatheredFn(body: string): string | null {
  return body.match(/\bgather\s*\(\s*\*\s*[([]\s*(\w+)\s*\(/)?.[1] ??
    body.match(/^\s*\w+\s*=\s*[[(]\s*(\w+)\s*\(/m)?.[1] ?? null;
}

function fanoutCheck(code: string): FanoutIssue | null {
  const style = defStyle(code, "cutAll");
  if (style) return style;
  const f = pyFn(code, "cut_all");
  if (!f) return "noDef";
  if (!f.isAsync) return "sync";
  if (f.params.length !== 1) return "arity";
  if (awaitsInLoop(f.body)) return "loop";
  if (!/\bgather\s*\(/.test(f.body)) return "noGather";
  if (!/\bgather\s*\(\s*\*/.test(f.body) && !/\bgather\s*\(\s*\w+\s*\(/.test(f.body)) return "noStar";
  if (!/\bawait\b/.test(f.body)) return "noAwait";
  const worker = gatheredFn(f.body);
  if (worker) {
    const w = pyFn(code, worker);
    if (w && /\bprint\s*\(/.test(w.body) && !/\breturn\b/.test(w.body)) return "printsLines";
  }
  if (!/\breturn\b/.test(f.body)) return "noReturn";
  return null;
}

const FANOUT_MESSAGES: Record<FanoutIssue, string> = {
  ...styleMessages("cut_all", "cut_all(circuits)"),
  noDef: "i need `async def cut_all(circuits):` — the terminal awaits it with the list of circuits.",
  sync: "the terminal does `await cut_all(...)`, so it has to be `async def cut_all(circuits):`.",
  arity: "it takes one thing — the list: `async def cut_all(circuits):`.",
  loop:
    "awaiting each breaker inside a loop throws them one after another — the caller waits for each before starting the next. `asyncio.gather` starts them all, then waits once.",
  noGather: "run them together with `asyncio.gather` — it waits for all of them and hands back their results in order.",
  noStar:
    "`gather` takes the coroutines as separate arguments, not one list. unpack with a star: `asyncio.gather(*(trip(n) for n in circuits))`.",
  noAwait: "`asyncio.gather(...)` on its own just makes the waiting — `await` it to get the results: `return await asyncio.gather(...)`.",
  printsLines:
    "the coroutine you gather prints and returns nothing, so the results come back as `None`. have it return the line: `return f\"{name} circuit: DOWN\"`.",
  noReturn: "`cut_all` has to hand the confirmations back: `return await asyncio.gather(...)`.",
};

const CH08_FANOUT_DONE =
  "all four confirmed, and in circuit order — north, south, east, west. the grid can't tell which one went first.\n\nbut they don't all take the same time to trip.\n\n||COMPLETE||";

const ch08Fanout: StepBank = {
  intro:
    "all four breakers have to drop together, and i can't call the grid blind until every one confirms. write `async def cut_all(circuits)`: one coroutine per circuit that returns `<name> circuit: DOWN`, all run with `asyncio.gather`, and return what it gives back.",

  conceptFAQ: [
    {
      keywords: ["gather", "what does gather", "wait for all", "all of them"],
      response: "`await asyncio.gather(a, b, c)` starts them all, waits until every one is done, and hands back a list of their results.",
    },
    {
      keywords: ["order", "which order", "results"],
      response: "the results come back in the order you passed them in — not the order they finished. so the confirmations line up with the circuits.",
    },
    {
      keywords: ["star", "*", "unpack", "list to gather", "whole list"],
      response: "gather wants separate arguments. a star spreads a sequence out: `asyncio.gather(*(trip(n) for n in circuits))`. same star as `*codes` back in chapter three, used the other way round.",
    },
    {
      keywords: ["loop", "for loop", "one at a time", "await each"],
      response: "`for n in circuits: await trip(n)` waits on each before starting the next. gather starts them all first.",
    },
    {
      keywords: ["helper", "trip", "coroutine per", "return the line"],
      response: "a small `async def trip(name): return f\"{name} circuit: DOWN\"` — one coroutine per breaker. gather collects what each returns.",
    },
    {
      keywords: ["waitgroup", "wait group", "counter"],
      response: "python doesn't need a counter of who's still running. gather is the waiting and the results list in one call.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`async def trip(name): return f\"{name} circuit: DOWN\"`, then `async def cut_all(circuits): return await asyncio.gather(*(trip(n) for n in circuits))`.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /<coroutine object/.test(out),
      response: "those are coroutines nobody ran — plans, not results. hand them to `asyncio.gather` and await it.",
    },
    {
      match: (out) => /^None$/m.test(out),
      response: "`None` — the coroutines print instead of returning. gather collects return values: `return f\"{name} circuit: DOWN\"`.",
    },
    {
      match: (out) => /_GatheringFuture|<Task|<Future/.test(out),
      response: "that's the waiting itself, not the answers. `await` the gather: `return await asyncio.gather(...)`.",
    },
    {
      match: (out) => /^[NSEW]\s*$/m.test(out),
      response: "single letters — you looped over a string instead of the list of circuits somewhere. `cut_all` gets the whole list; one coroutine per item.",
    },
  ],

  codePatterns: checkPatterns(fanoutCheck, FANOUT_MESSAGES, CH08_FANOUT_DONE),
  correctResponse: CH08_FANOUT_DONE,

  genericWrong: [
    "not matching. four confirmations in circuit order, then `ALL CIRCUITS DOWN`, then the aux circuit on its own.",
    "`cut_all` returns the list `gather` gives back — one line per circuit.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nasync def trip(name):\n    return f\"{name} circuit: DOWN\"\n\n\nasync def cut_all(circuits):\n    return await asyncio.gather(*(trip(n) for n in circuits))\n```",
    "one coroutine per circuit, all handed to `asyncio.gather` with a star, and the gather awaited and returned.",
  ],

  deflections: [
    "focus. all four, together.",
    "not now — confirm the breakers.",
  ],
};

// ── chapter-08:window ──

type WindowIssue =
  | StyleIssue | "noDef" | "sync" | "arity" | "timeSleep" | "noSleep" | "floorSeconds" | "seconds" | "loop" | "noGather" | "noAwait" | "noMs" | "noReturn";

function windowCheck(code: string): WindowIssue | null {
  const style = defStyle(code, "cutTimed");
  if (style) return style;
  const f = pyFn(code, "cut_timed");
  if (!f) return "noDef";
  if (!f.isAsync) return "sync";
  if (f.params.length !== 2) return "arity";
  if (usesTimeSleep(code)) return "timeSleep";
  const sleeps = sleepArgs(code);
  if (sleeps.length === 0) return "noSleep";
  if (sleeps.some(floorsSeconds)) return "floorSeconds";
  if (!sleeps.every(inSeconds)) return "seconds";
  if (awaitsInLoop(f.body)) return "loop";
  if (!/\bgather\s*\(/.test(f.body)) return "noGather";
  if (!/\bawait\b/.test(f.body)) return "noAwait";
  if (!literals(noComments(code)).some((s) => /ms\)/.test(s))) return "noMs";
  if (!/\breturn\b/.test(f.body)) return "noReturn";
  return null;
}

const WINDOW_MESSAGES: Record<WindowIssue, string> = {
  ...styleMessages("cut_timed", "cut_timed(circuits, delays)"),
  noDef: "i need `async def cut_timed(circuits, delays):` — the names and their delays, side by side.",
  sync: "the terminal awaits it, so it has to be `async def cut_timed(circuits, delays):`.",
  arity: "two lists go in: `async def cut_timed(circuits, delays):`.",
  timeSleep:
    "`time.sleep` freezes the whole program — no other breaker gets a turn while one waits. inside async code it's always `await asyncio.sleep(seconds)`.",
  noSleep: "each breaker has to wait its delay before it reports: `await asyncio.sleep(d / 1000)`.",
  floorSeconds:
    "`//` rounds down — `300 // 1000` is 0, so nothing waits at all. plain `/` keeps the fraction: `d / 1000`.",
  seconds: "`asyncio.sleep` counts seconds and the delays are milliseconds. `d / 1000`, or every breaker waits a thousand times too long.",
  loop:
    "awaiting each sleep inside a loop puts the breakers one after another — the window becomes the sum of the delays, 1100ms. two power cycles. alarm. give each breaker its own coroutine and `gather` them.",
  noGather: "same fan-out as last step: one coroutine per breaker, all run with `asyncio.gather`.",
  noAwait: "`await` the gather: `return await asyncio.gather(...)`.",
  noMs: "each line ends with its delay: `f\"{n} circuit: DOWN ({d}ms)\"`.",
  noReturn: "`cut_timed` has to hand the lines back: `return await asyncio.gather(...)`.",
};

const CH08_WINDOW_DONE =
  "450 milliseconds. the slowest breaker, not the sum. one power cycle, and the alarm grid never saw it happen.\n\n||COMPLETE||";

const ch08Window: StepBank = {
  intro:
    "each breaker takes its own time to trip, and i need all four down inside one power cycle or the grid seals the facility. write `async def cut_timed(circuits, delays)`: the same fan-out, but each breaker first does `await asyncio.sleep(d / 1000)`, then returns `<name> circuit: DOWN (<d>ms)`. pair names and delays with `zip`.",

  conceptFAQ: [
    {
      keywords: ["asyncio.sleep", "sleep", "wait without", "freeze", "time.sleep"],
      response: "`await asyncio.sleep(s)` pauses this coroutine and lets the others run. `time.sleep` stops the whole program — nobody else gets a turn.",
    },
    {
      keywords: ["seconds", "milliseconds", "ms", "1000", "units"],
      response: "asyncio counts in seconds. the delays are milliseconds, so `d / 1000` — and a plain `/`, because `//` would round 300 down to 0.",
    },
    {
      keywords: ["zip", "pair", "together", "both lists", "name and delay"],
      response: "`zip(circuits, delays)` walks both lists side by side: `for n, d in zip(circuits, delays)` hands you `\"North\", 300`, then `\"South\", 150`.",
    },
    {
      keywords: ["window", "sum", "slowest", "how long", "1100", "450"],
      response: "one at a time, you wait for every delay in a row: 300 + 150 + 450 + 200. all at once, they wait together, so it's only as long as the slowest: 450.",
    },
    {
      keywords: ["helper", "inner", "trip"],
      response: "a helper that takes both: `async def trip_timed(n, d):` — sleep, then return the line. it can live inside `cut_timed` or next to it.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`async def trip_timed(n, d): await asyncio.sleep(d / 1000); return f\"{n} circuit: DOWN ({d}ms)\"`, then gather one per pair from `zip(circuits, delays)`.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /MULTI CYCLE/.test(out),
      response:
        "two power cycles — the breakers took 1100ms or more. either they ran one after another (an `await` inside a loop — gather them instead) or the sleep got milliseconds when it wanted seconds (`d / 1000`).",
    },
    {
      match: (out) => /\(0\.\d+ms\)/.test(out),
      response: "the line shows seconds with `ms` on the end. print the original delay — `({d}ms)` — and only divide inside the sleep.",
    },
    {
      match: (out) => /circuit: DOWN$/m.test(out),
      response: "the lines need their delay on the end: `f\"{n} circuit: DOWN ({d}ms)\"`.",
    },
    {
      match: (out) => /<coroutine object|^None$/m.test(out),
      response: "the gather isn't getting the lines back. each coroutine returns its line, and `cut_timed` returns `await asyncio.gather(...)`.",
    },
  ],

  codePatterns: checkPatterns(windowCheck, WINDOW_MESSAGES, CH08_WINDOW_DONE),
  correctResponse: CH08_WINDOW_DONE,

  genericWrong: [
    "not matching. four lines with their delays, then `window: SINGLE CYCLE - alarm blind`.",
    "all four breakers wait at the same time — the window is the slowest, not the sum.",
  ],

  rushDialogue: [
    "the grid's self-check is coming. all four, one cycle.",
    "hurry — sleep inside each breaker, gather them, done.",
  ],

  stuckResponses: [
    "```\nasync def cut_timed(circuits, delays):\n    async def trip_timed(n, d):\n        await asyncio.sleep(d / 1000)\n        return f\"{n} circuit: DOWN ({d}ms)\"\n\n    return await asyncio.gather(*(trip_timed(n, d) for n, d in zip(circuits, delays)))\n```",
    "the sleep goes inside each breaker's coroutine, not in the loop that starts them.",
  ],

  deflections: [
    "focus. one power cycle.",
    "not now — the grid seals in seconds if we miss this.",
  ],
};

// ══════════════════════════════════════════════════════════════
//  Chapter 09
// ══════════════════════════════════════════════════════════════

const CH09_SCAFFOLD_DONE =
  "comms array's up. three extraction teams on three frequencies — alpha, bravo, charlie.\n\nnow call one.\n\n||COMPLETE||";

const ch09Scaffold: StepBank = {
  intro:
    "this comms array is how i call for a way out. power it up: print `Hello World`.",

  conceptFAQ: [
    {
      keywords: ["print", "output"],
      response: "`print(\"Hello World\")` — one line.",
    },
    {
      keywords: ["import", "asyncio", "package", "setup", "scaffold"],
      response: "`asyncio` comes back next step. nothing to import for the greeting.",
    },
    {
      keywords: ["team", "hail", "frequency", "extraction", "call"],
      response: "the teams come next. power the array first.",
    },
    {
      keywords: ["main", "entry", "start"],
      response: "python starts at the top of the file and runs down. no main needed.",
    },
  ],

  codePatterns: scaffoldPatterns(CH09_SCAFFOLD_DONE),
  correctResponse: CH09_SCAFFOLD_DONE,
  genericWrong: SCAFFOLD_GENERIC,
  rushDialogue: [],
  stuckResponses: [
    "same as every time: `print(\"Hello World\")`.",
    "lowercase `print`, round brackets, the text in quotes. one line.",
  ],
  deflections: ["power the array first."],
};

// ── chapter-09:hail ──

type HailIssue =
  | StyleIssue | "noDef" | "arity" | "asyncHail" | "noInner" | "innerSync" | "timeSleep" | "noSleep" | "floorSeconds" | "seconds"
  | "innerPrints" | "bareCoroutine" | "noTask" | "noImport";

function hailCheck(code: string): HailIssue | null {
  const style = defStyle(code, "hailTeam");
  if (style) return style;
  const f = pyFn(code, "hail");
  if (!f) return "noDef";
  if (f.params.length !== 2) return "arity";
  if (f.isAsync) return "asyncHail";
  const { inner, outer } = splitInner(f);
  const respond = inner[0];
  if (!respond) return "noInner";
  if (!respond.isAsync) return "innerSync";
  if (usesTimeSleep(code)) return "timeSleep";
  const sleeps = sleepArgs(respond.body);
  if (sleeps.length === 0) return "noSleep";
  if (sleeps.some(floorsSeconds)) return "floorSeconds";
  if (!sleeps.every(inSeconds)) return "seconds";
  if (/\bprint\s*\(/.test(respond.body) && !/\breturn\b/.test(respond.body)) return "innerPrints";
  if (!/\b(create_task|ensure_future)\s*\(/.test(outer)) {
    return new RegExp(`\\breturn\\s+${respond.name}\\s*\\(`).test(outer) ? "bareCoroutine" : "noTask";
  }
  if (!hasAsyncioImport(code)) return "noImport";
  return null;
}

const HAIL_MESSAGES: Record<HailIssue, string> = {
  ...styleMessages("hail", "hail(team, delay_ms)"),
  noDef: "i need `def hail(team, delay_ms):` — a call that comes straight back with something to wait on.",
  arity: "it takes the team and the delay: `def hail(team, delay_ms):`.",
  asyncHail:
    "`hail` stays a plain `def`. an `async def` doesn't run when you call it — `hail` has to hand back a task that's already on its way: `return asyncio.create_task(respond())`.",
  noInner: "inside `hail`, write the team's side: `async def respond():` that sleeps the delay and returns `f\"{team} responding\"`.",
  innerSync: "`respond` waits, so it has to be `async def respond():`.",
  timeSleep:
    "`time.sleep` freezes everything — the whole comms array stops while one team thinks. `await asyncio.sleep(delay_ms / 1000)`.",
  noSleep: "the team takes `delay_ms` to answer: `await asyncio.sleep(delay_ms / 1000)` before the return.",
  floorSeconds: "`//` rounds down — `100 // 1000` is 0, and every team answers at once. `delay_ms / 1000`.",
  seconds: "`asyncio.sleep` counts seconds. `delay_ms / 1000`.",
  innerPrints: "`respond` prints instead of answering. whoever awaits the task gets the return value: `return f\"{team} responding\"`.",
  bareCoroutine:
    "`respond()` alone is a coroutine that hasn't started — nobody hailed anyone yet. `return asyncio.create_task(respond())` starts the call and hands you something to wait on.",
  noTask: "`hail` hands back a task: `return asyncio.create_task(respond())`.",
  noImport: "`import asyncio` at the top.",
};

const CH09_HAIL_DONE =
  "bravo answered, and the terminal never froze while i waited. one hail, one answer, held until i asked for it.\n\nnow all three at once.\n\n||COMPLETE||";

const ch09Hail: StepBank = {
  intro:
    "i have to call an extraction team and hear back — without freezing the terminal while i wait. `import asyncio`. write a plain `def hail(team, delay_ms)`. inside it, `async def respond()` sleeps `delay_ms` milliseconds and returns `<team> responding`. `hail` returns `asyncio.create_task(respond())` straight away.",

  conceptFAQ: [
    {
      keywords: ["why task", "return a task", "instead of the answer", "why not return"],
      response: "so the call comes back at once and the team answers in the background. you can hail all three before waiting on any of them.",
    },
    {
      keywords: ["await t", "await the task", "get the answer", "result"],
      response: "`await t` gives you whatever `respond` returned, once it's ready. if it already finished, you get it straight away — the task holds its one answer until somebody asks.",
    },
    {
      keywords: ["inner", "inside", "nested", "closure", "team inside"],
      response: "`respond` is defined inside `hail`, so it can see `team` and `delay_ms` — the same closure idea as the archive scan.",
    },
    {
      keywords: ["plain def", "not async", "why def", "async hail"],
      response: "`hail` never waits for anything, so it doesn't need to be async. it schedules the work and returns. only `respond`, which sleeps, is `async def`.",
    },
    {
      keywords: ["channel", "mailbox", "buffer", "queue"],
      response: "a task is like a mailbox with room for one: the team drops its answer in when it's ready, and it sits there until you collect it.",
    },
    {
      keywords: ["seconds", "milliseconds", "1000"],
      response: "`asyncio.sleep(delay_ms / 1000)` — asyncio counts in seconds.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`def hail(team, delay_ms):`, inside it `async def respond():` with the sleep and the return, then `return asyncio.create_task(respond())`.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /^None$/m.test(out),
      response: "`None` — `respond` doesn't return the answer. `return f\"{team} responding\"`.",
    },
    {
      match: (out) => /responding/.test(out) && out.indexOf("responding") < out.indexOf("hailing"),
      response: "the team answered before we finished hailing — `hail` waited. it should schedule the task and return at once.",
    },
  ],

  codePatterns: checkPatterns(hailCheck, HAIL_MESSAGES, CH09_HAIL_DONE),
  correctResponse: CH09_HAIL_DONE,

  genericWrong: [
    "not matching. `hailing Bravo...`, then `Bravo responding` once the terminal awaits the task, then `channel confirmed`.",
    "`hail` returns a task at once. the answer comes out when someone awaits it.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nimport asyncio\n\n\ndef hail(team, delay_ms):\n    async def respond():\n        await asyncio.sleep(delay_ms / 1000)\n        return f\"{team} responding\"\n\n    return asyncio.create_task(respond())\n```",
    "a plain `def` on the outside, an `async def` on the inside, and `create_task` joining them.",
  ],

  deflections: [
    "focus. one team, one answer.",
    "not now — i need someone on the other end of this.",
  ],
};

// ── chapter-09:first ──

type FirstIssue =
  | StyleIssue | "hail" | "noDef" | "sync" | "arity" | "awaitsOne" | "gathers" | "noWait" | "notList" | "noFirst" | "noUnpack" | "returnsTask";

/** Names bound by `done, pending = await asyncio.wait(...)`, or null. */
function waitNames(body: string): [string, string] | null {
  const m = body.match(/\b(\w+)\s*,\s*(\w+)\s*=\s*(?:\(\s*)?await\s+asyncio\s*\.\s*wait\s*\(/);
  return m ? [m[1], m[2]] : null;
}

/** Shared by first and timeout: asyncio.wait over all three, first answer back. */
function raceIssue(f: PyFn): "awaitsOne" | "gathers" | "noWait" | "notList" | "noFirst" | "noUnpack" | "returnsTask" | null {
  const [a, b, c] = f.params;
  if (/\bgather\s*\(/.test(f.body)) return "gathers";
  if (!/\basyncio\s*\.\s*wait\s*\(/.test(f.body)) {
    return new RegExp(`\\bawait\\s+(${a}|${b}|${c})\\b`).test(f.body) ? "awaitsOne" : "noWait";
  }
  if (/\basyncio\s*\.\s*wait\s*\(\s*\w+\s*,\s*\w+\s*[,)]/.test(f.body)) return "notList";
  if (!/\bFIRST_COMPLETED\b/.test(f.body)) return "noFirst";
  const names = waitNames(f.body);
  if (!names) return "noUnpack";
  const done = names[0];
  const returns = [...f.body.matchAll(new RegExp(`^\\s*return\\b([^\\n]*\\b${done}\\b[^\\n]*)`, "gm"))].map((m) => m[1]);
  if (returns.some((r) => !/\.\s*result\s*\(\s*\)|\bawait\b/.test(r))) return "returnsTask";
  return null;
}

function firstCheck(code: string): FirstIssue | null {
  const style = defStyle(code, "firstResponder");
  if (style) return style;
  if (hailCheck(code) !== null) return "hail";
  const f = pyFn(code, "first_responder");
  if (!f) return "noDef";
  if (!f.isAsync) return "sync";
  if (f.params.length !== 3) return "arity";
  return raceIssue(f);
}

const RACE_MESSAGES = {
  awaitsOne:
    "`await alpha` waits for alpha — even though bravo answered sooner. listen to all three at once: `asyncio.wait([alpha, bravo, charlie], return_when=asyncio.FIRST_COMPLETED)`.",
  gathers: "`gather` waits for every team. we only need the first one — `asyncio.wait` with `return_when=asyncio.FIRST_COMPLETED`.",
  noWait: "wait on all three at once: `done, pending = await asyncio.wait([alpha, bravo, charlie], return_when=asyncio.FIRST_COMPLETED)`.",
  notList: "`asyncio.wait` takes one list of tasks, in square brackets: `asyncio.wait([alpha, bravo, charlie], ...)`.",
  noFirst:
    "on its own, `asyncio.wait` waits for all of them. tell it when to come back: `return_when=asyncio.FIRST_COMPLETED`.",
  noUnpack: "`asyncio.wait` gives back two sets — finished and still running. unpack them: `done, pending = await asyncio.wait(...)`.",
  returnsTask: "that's the task, not what it said. `done.pop().result()` — take the finished task, read its answer.",
} as const;

const FIRST_MESSAGES: Record<FirstIssue, string> = {
  ...styleMessages("first_responder", "first_responder(alpha, bravo, charlie)"),
  hail: "keep `hail` from the last step working — the terminal still uses it to call the three teams.",
  noDef: "i need `async def first_responder(alpha, bravo, charlie):` — three tasks in, the first answer out.",
  sync: "it waits, so it has to be `async def first_responder(alpha, bravo, charlie):`.",
  arity: "three tasks come in: `async def first_responder(alpha, bravo, charlie):`.",
  ...RACE_MESSAGES,
};

const CH09_FIRST_DONE =
  "bravo, first. we go with bravo, and nobody waits on the slow ones.\n\nbut if every frequency's jammed, i'm standing in a stairwell forever.\n\n||COMPLETE||";

const ch09First: StepBank = {
  intro:
    "three teams hailed at once — i go with whoever answers first and don't wait on the slow ones. write `async def first_responder(alpha, bravo, charlie)`: `done, pending = await asyncio.wait([...], return_when=asyncio.FIRST_COMPLETED)`, and return `done.pop().result()`.",

  conceptFAQ: [
    {
      keywords: ["asyncio.wait", "wait", "done", "pending", "two sets"],
      response: "`asyncio.wait` gives back two sets: `done` (finished) and `pending` (still running). with `FIRST_COMPLETED` it comes back as soon as one is done.",
    },
    {
      keywords: ["first_completed", "first", "whoever", "race", "select"],
      response: "`return_when=asyncio.FIRST_COMPLETED` — come back the moment any one finishes. without it, `wait` waits for all of them.",
    },
    {
      keywords: ["pop", "result", "get the answer", "out of done"],
      response: "`done.pop()` takes the finished task out of the set. `.result()` reads what it returned. together: `done.pop().result()`.",
    },
    {
      keywords: ["await alpha", "why not", "just await"],
      response: "`await alpha` waits on alpha no matter who's quicker. wait listens to all three at once.",
    },
    {
      keywords: ["cancel", "losers", "slow ones", "pending", "still running"],
      response: "the losers keep running unless you stop them. `for t in pending: t.cancel()` — a task you've stopped caring about shouldn't keep working.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`done, pending = await asyncio.wait([alpha, bravo, charlie], return_when=asyncio.FIRST_COMPLETED)`, cancel what's pending, `return done.pop().result()`.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /first contact: Alpha responding/.test(out),
      response: "alpha — but bravo answered first. you waited on alpha before anyone else. `asyncio.wait` with `FIRST_COMPLETED` listens to all three.",
    },
    {
      match: (out) => /first contact: Charlie responding/.test(out),
      response: "charlie's the slowest. something waited for everyone and took the last answer — `FIRST_COMPLETED` comes back on the first.",
    },
  ],

  codePatterns: checkPatterns(firstCheck, FIRST_MESSAGES, CH09_FIRST_DONE),
  correctResponse: CH09_FIRST_DONE,

  genericWrong: [
    "not matching. bravo answers in 100ms, alpha in 200, charlie in 300 — the terminal wants `first contact: Bravo responding`.",
    "wait on all three at once and take whoever lands first.",
  ],

  rushDialogue: [
    "the frequencies are degrading. take the first voice.",
    "hurry — `asyncio.wait`, `FIRST_COMPLETED`, done.",
  ],

  stuckResponses: [
    "```\nasync def first_responder(alpha, bravo, charlie):\n    done, pending = await asyncio.wait([alpha, bravo, charlie], return_when=asyncio.FIRST_COMPLETED)\n    for t in pending:\n        t.cancel()\n    return done.pop().result()\n```",
    "one `asyncio.wait` over the list, come back on the first, read its result.",
  ],

  deflections: [
    "focus. first voice wins.",
    "not now — whoever answers, we go.",
  ],
};

// ── chapter-09:timeout ──

type TimeoutIssue =
  | StyleIssue | "hail" | "noDef" | "sync" | "arity"
  | "awaitsOne" | "gathers" | "noWait" | "notList" | "noFirst" | "noUnpack" | "returnsTask"
  | "noTimeout" | "fixedTimeout" | "timeoutSeconds" | "noContact"
  | "noSweep" | "asyncSweep" | "sweepArity" | "sweepWaits" | "noDoneCheck" | "noSilent" | "noResult";

function timeoutCheck(code: string): TimeoutIssue | null {
  const style = defStyle(code, "awaitContact");
  if (style) return style;
  if (hailCheck(code) !== null) return "hail";
  const f = pyFn(code, "await_contact");
  if (!f) return "noDef";
  if (!f.isAsync) return "sync";
  if (f.params.length !== 4) return "arity";
  const race = raceIssue(f);
  if (race) return race;
  const t = f.body.match(/\btimeout\s*=\s*([^,)\n]+)/);
  if (!t) return "noTimeout";
  if (!new RegExp(`\\b${f.params[3]}\\b`).test(t[1])) return "fixedTimeout";
  if (!inSeconds(t[1])) return "timeoutSeconds";
  if (!literals(f.raw).includes("NO CONTACT")) return "noContact";
  const sweep = pyFn(code, "sweep");
  if (!sweep) return "noSweep";
  if (sweep.isAsync) return "asyncSweep";
  if (sweep.params.length !== 1) return "sweepArity";
  if (/\bawait\b|\basyncio\s*\.\s*(wait|sleep)\s*\(/.test(sweep.body)) return "sweepWaits";
  if (!/\.\s*done\s*\(\s*\)/.test(sweep.body)) return "noDoneCheck";
  if (!literals(sweep.raw).includes("channel silent")) return "noSilent";
  if (!/\.\s*result\s*\(\s*\)/.test(sweep.body)) return "noResult";
  return null;
}

const TIMEOUT_MESSAGES: Record<TimeoutIssue, string> = {
  ...styleMessages("await_contact", "await_contact(alpha, bravo, charlie, timeout_ms)"),
  hail: "keep `hail` from step one working — the terminal still hails the teams with it.",
  noDef: "i need `async def await_contact(alpha, bravo, charlie, timeout_ms):` — the race from last step, with a deadline.",
  sync: "it waits, so it's `async def await_contact(alpha, bravo, charlie, timeout_ms):`.",
  arity: "four things come in — three tasks and the deadline: `async def await_contact(alpha, bravo, charlie, timeout_ms):`.",
  ...RACE_MESSAGES,
  noTimeout:
    "with every frequency jammed, `asyncio.wait` waits forever — the terminal calls that a deadlock. give it a deadline: `timeout=timeout_ms / 1000`.",
  fixedTimeout:
    "the deadline is a number you picked. the terminal passes a different one each call — `timeout=timeout_ms / 1000`.",
  timeoutSeconds: "`timeout=` counts seconds. `timeout_ms / 1000`.",
  noContact: "if the deadline passes with nobody answering, `done` comes back empty. check it: `if not done: return \"NO CONTACT\"`.",
  noSweep: "now `def sweep(task):` — a quick look at one channel that never waits.",
  asyncSweep:
    "`sweep` can't be `async def`. an async function exists so it can pause, and sweep must never pause — and the terminal calls it without `await`. plain `def sweep(task):`.",
  sweepArity: "`sweep` looks at one task: `def sweep(task):`.",
  sweepWaits: "`sweep` mustn't wait at all. it only looks: `task.done()` is true or it isn't.",
  noDoneCheck: "`task.done()` tells you, without waiting, whether the answer's already in.",
  noSilent: "nothing there yet means `return \"channel silent\"`, straight away.",
  noResult: "when `task.done()` is true, hand back what it said: `return task.result()`.",
};

const CH09_TIMEOUT_DONE =
  "bravo holding at dock 4. and when the air was dead, the program gave up in time instead of leaving me standing there.\n\nextraction's locked. and kira just sent me something.\n\n||COMPLETE||";

const ch09Timeout: StepBank = {
  intro:
    "if every frequency is jammed i can't stand in a stairwell forever. two functions. `async def await_contact(alpha, bravo, charlie, timeout_ms)` — last step's wait, plus `timeout=timeout_ms / 1000`; an empty `done` means `NO CONTACT`. and `def sweep(task)`, not async: if `task.done()`, return its result, otherwise `channel silent` right away.",

  conceptFAQ: [
    {
      keywords: ["timeout", "deadline", "how does the timeout", "give up"],
      response: "`asyncio.wait(tasks, timeout=0.2, ...)` stops waiting after 0.2 seconds. if nobody finished by then, `done` comes back empty.",
    },
    {
      keywords: ["empty", "not done", "nothing finished", "no contact"],
      response: "an empty set is falsy, so `if not done: return \"NO CONTACT\"` reads exactly like it sounds.",
    },
    {
      keywords: ["sweep", "plain def", "why not async", "non-blocking", "without waiting"],
      response: "`sweep` must never wait. an `async def` exists so it can pause — sweep only looks. `task.done()` is true or it isn't, and either way you return at once.",
    },
    {
      keywords: [".done", "done()", "is it finished", "ready"],
      response: "`task.done()` is true once the task has its answer. then `task.result()` reads it. ask for `.result()` too early and python raises an error.",
    },
    {
      keywords: ["deadlock", "forever", "hang", "stuck waiting"],
      response: "a wait with no deadline on a task that never finishes waits forever. the terminal sees nothing can ever wake it and calls it a deadlock.",
    },
    {
      keywords: ["seconds", "milliseconds", "1000"],
      response: "`timeout=` is in seconds. `timeout_ms / 1000`.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "copy `first_responder` into `await_contact`, add `timeout=timeout_ms / 1000` to the wait, `if not done: return \"NO CONTACT\"`. then `def sweep(task):` with a `task.done()` check.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /waited \d+s for a 200ms deadline/.test(out),
      response:
        "you gave up eventually — after 200 seconds. asyncio counts in seconds, and `timeout_ms` is milliseconds. `timeout=timeout_ms / 1000`.",
    },
    {
      match: (out) => /^contact: NO CONTACT\ncontact: NO CONTACT$/m.test(out),
      response:
        "the last call should reach alpha in 300ms — the deadline's 500. your timeout doesn't come from `timeout_ms`. `timeout=timeout_ms / 1000`.",
    },
    {
      match: (out) => /^contact: Alpha responding\ncontact:/m.test(out) && !/^contact: Bravo/m.test(out),
      response: "alpha first — but bravo answered sooner. wait on all three with `FIRST_COMPLETED`.",
    },
    {
      match: (out) => /^sweep: channel silent\nsweep: channel silent$/m.test(out),
      response: "the first channel was already answered, and sweep still said silent. if `task.done()`, return `task.result()`.",
    },
  ],

  codePatterns: checkPatterns(timeoutCheck, TIMEOUT_MESSAGES, CH09_TIMEOUT_DONE),
  correctResponse: CH09_TIMEOUT_DONE,

  genericWrong: [
    "not matching. bravo, then `NO CONTACT` for the jammed call, then alpha — and the sweep finds bravo at dock 4, then silence.",
    "check the deadline comes from `timeout_ms`, and that `sweep` never waits.",
  ],

  rushDialogue: [
    "the extraction window's closing. finish the deadline.",
    "hurry — timeout on the wait, `task.done()` in the sweep.",
  ],

  stuckResponses: [
    "```\nasync def await_contact(alpha, bravo, charlie, timeout_ms):\n    done, pending = await asyncio.wait(\n        [alpha, bravo, charlie], timeout=timeout_ms / 1000, return_when=asyncio.FIRST_COMPLETED\n    )\n    for t in pending:\n        t.cancel()\n    if not done:\n        return \"NO CONTACT\"\n    return done.pop().result()\n\n\ndef sweep(task):\n    if task.done():\n        return task.result()\n    return \"channel silent\"\n```",
    "the wait gets a deadline and the sweep gets no wait at all. know which one the moment needs.",
  ],

  deflections: [
    "focus. a deadline, then a glance.",
    "not now — bravo won't hold the dock forever.",
  ],
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
  "chapter-04:scaffold": ch04Scaffold,
  "chapter-04:guardmap": ch04Guardmap,
  "chapter-04:clearfloors": ch04Clearfloors,
  "chapter-04.2:scaffold": ch04_2Scaffold,
  "chapter-04.2:reverseword": ch04_2Reverseword,
  "chapter-04.2:encode": ch04_2Encode,
  "chapter-04.2:relayheader": ch04_2Relayheader,
  "chapter-07:scaffold": ch07Scaffold,
  "chapter-07:scan": ch07Scan,
  "chapter-07:recover": ch07Recover,
  "chapter-08:scaffold": ch08Scaffold,
  "chapter-08:goroutine": ch08Goroutine,
  "chapter-08:fanout": ch08Fanout,
  "chapter-08:window": ch08Window,
  "chapter-09:scaffold": ch09Scaffold,
  "chapter-09:hail": ch09Hail,
  "chapter-09:first": ch09First,
  "chapter-09:timeout": ch09Timeout,
};
