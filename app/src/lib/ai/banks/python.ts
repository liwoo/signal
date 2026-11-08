// ── Maya's answer banks · Python ──
// Same story beats and stakes as the Go banks in ../engine.ts, teaching Python
// and agreeing with src/data/challenges/python/act-1.ts + act-2.ts. When the interpreter
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
};
