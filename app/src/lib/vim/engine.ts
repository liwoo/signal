// ── Pure Vim Engine ──
// All vim command logic as pure functions. No React, no DOM.
// The useVim hook is a thin wrapper around this.
//
// Normal-mode input is parsed as a real vim command grammar rather than a
// table of fixed strings, so counts and operators compose the way they do in
// vim:
//
//   [count] operator [count] (motion | text-object | operator)
//   [count] motion
//   [count] command
//
// e.g. `4dd`, `d4d`, `d3w`, `2d2j`, `ciw`, `ci{`, `da"`, `yi(`, `>2j`, `dt)`,
// `cf,`, `3x`, `5j`, `2p`, `.`. Visual (`v`) and visual-line (`V`) modes apply
// the same operators to a selection.

export type VimMode = "normal" | "insert" | "visual" | "visual-line";

/** The last f/F/t/T search, so `;` and `,` can repeat it. */
export interface FindSpec {
  kind: "f" | "F" | "t" | "T";
  ch: string;
}

/** The last change, so `.` can repeat it: the command keys plus any text typed in insert mode. */
export interface RecordedChange {
  keys: string;
  text: string | null;
}

/** An insert session opened by a change command — used to record what was typed for `.`. */
export interface InsertSession {
  keys: string;
  start: number;
  base: string;
}

export interface VimInput {
  code: string;
  pos: number;
  mode: VimMode;
  pending: string;
  yank: string;
  yankLinewise: boolean;
  undoStack: string[];
  key: string;
  redoStack?: string[];
  /** Visual-mode anchor (the end of the selection that doesn't move). */
  anchor?: number;
  /** Column j/k try to keep across shorter lines (vim's "curswant"). */
  wantCol?: number | null;
  lastFind?: FindSpec | null;
  lastChange?: RecordedChange | null;
  insertSession?: InsertSession | null;
}

export interface VimOutput {
  code: string;
  pos: number;
  mode: VimMode;
  pending: string;
  yank: string;
  yankLinewise: boolean;
  undoStack: string[];
  redoStack: string[];
  anchor: number;
  wantCol: number | null;
  lastFind: FindSpec | null;
  lastChange: RecordedChange | null;
  insertSession: InsertSession | null;
  handled: boolean;
  codeChanged: boolean;
}

/** Key tokens the hook sends for non-printing keys. */
export const KEY_ESCAPE = "Escape";
export const KEY_REDO = "<C-r>";

export function isVisualMode(mode: VimMode): boolean {
  return mode === "visual" || mode === "visual-line";
}

// ── Helpers (exported for unit testing) ──

export function lineStart(code: string, pos: number): number {
  return code.lastIndexOf("\n", pos - 1) + 1;
}

export function lineEnd(code: string, pos: number): number {
  const i = code.indexOf("\n", pos);
  return i === -1 ? code.length : i;
}

/** Last character position on the line (before the \n). Safe for empty lines. */
function lastCharOnLine(code: string, pos: number): number {
  const le = lineEnd(code, pos);
  const ls = lineStart(code, pos);
  return le > ls ? le - 1 : ls;
}

/** Clamp pos to a valid normal-mode position: on a character, never on a line's \n unless the line is empty. */
export function clampNormal(code: string, pos: number): number {
  if (code.length === 0) return 0;
  const p = Math.max(0, Math.min(pos, code.length));
  const ls = lineStart(code, p);
  const le = lineEnd(code, p);
  if (le === ls) return ls; // empty line
  return Math.min(p, le - 1);
}

export function firstNonBlank(code: string, from: number): number {
  const end = lineEnd(code, from);
  const slice = code.slice(from, end);
  const m = slice.search(/\S/);
  return m === -1 ? from : from + m;
}

function lineIndent(code: string, pos: number): string {
  const ls = lineStart(code, pos);
  return code.slice(ls, firstNonBlank(code, ls));
}

/** Zero-based line number of `pos`. */
function lineOf(code: string, pos: number): number {
  let n = 0;
  for (let i = 0; i < pos && i < code.length; i++) if (code[i] === "\n") n++;
  return n;
}

/** Start offset of zero-based line `n` (clamped to the last line). */
function lineStartOfLine(code: string, n: number): number {
  let pos = 0;
  for (let i = 0; i < n; i++) {
    const nl = code.indexOf("\n", pos);
    if (nl === -1) break;
    pos = nl + 1;
  }
  return pos;
}

function lineCount(code: string): number {
  return lineOf(code, code.length) + 1;
}

// ── Word motions ──

type CharClass = 0 | 1 | 2; // blank | word | punctuation
function charClass(ch: string | undefined, big = false): CharClass {
  if (ch === undefined || /\s/.test(ch)) return 0;
  if (big) return 1;
  return /\w/.test(ch) ? 1 : 2;
}

/** An empty line is a word of its own for w/b/e, like in vim. */
function isEmptyLineAt(code: string, i: number): boolean {
  return code[i] === "\n" && (i === 0 || code[i - 1] === "\n");
}

/** Start of the next word (may be code.length when there is none). */
function nextWordStart(code: string, pos: number, big: boolean): number {
  const n = code.length;
  let i = pos;
  const c = charClass(code[i], big);
  if (c !== 0) while (i < n && charClass(code[i], big) === c) i++;
  while (i < n && charClass(code[i], big) === 0) {
    if (i > pos && isEmptyLineAt(code, i)) return i;
    i++;
  }
  return i;
}

/** End of the current/next word. */
function nextWordEnd(code: string, pos: number, big: boolean): number {
  const n = code.length;
  let i = pos + 1;
  while (i < n && charClass(code[i], big) === 0) i++;
  if (i >= n) return Math.max(0, n - 1);
  const c = charClass(code[i], big);
  while (i + 1 < n && charClass(code[i + 1], big) === c) i++;
  return i;
}

/** Start of the current/previous word. */
function prevWordStart(code: string, pos: number, big: boolean): number {
  let i = pos - 1;
  while (i > 0 && charClass(code[i], big) === 0) {
    if (isEmptyLineAt(code, i)) return i;
    i--;
  }
  if (i <= 0) return 0;
  const c = charClass(code[i], big);
  while (i > 0 && charClass(code[i - 1], big) === c) i--;
  return i;
}

/** End of the previous word (ge). */
function prevWordEnd(code: string, pos: number, big: boolean): number {
  let i = pos;
  const c = charClass(code[i], big);
  if (c !== 0) while (i >= 0 && charClass(code[i], big) === c) i--;
  while (i >= 0 && charClass(code[i], big) === 0) {
    if (isEmptyLineAt(code, i)) return i;
    i--;
  }
  return Math.max(0, i);
}

export function wordEndPos(code: string, pos: number): number {
  return nextWordEnd(code, pos, false);
}

export function wordForwardPos(code: string, pos: number): number {
  if (pos >= code.length - 1) return pos;
  return Math.min(nextWordStart(code, pos, false), code.length - 1);
}

export function wordBackPos(code: string, pos: number): number {
  if (pos <= 0) return 0;
  return prevWordStart(code, pos, false);
}

export function deleteLine(code: string, pos: number): { newCode: string; newPos: number; deleted: string } {
  const r = deleteLines(code, lineStart(code, pos), lineEnd(code, pos));
  return { newCode: r.code, newPos: r.pos, deleted: r.deleted };
}

/** Remove whole lines spanning [ls, le) (le = end of the last line, before its \n). */
function deleteLines(code: string, ls: number, le: number): { code: string; pos: number; deleted: string } {
  const deleted = code.slice(ls, le);
  let next: string;
  let at: number;
  if (le < code.length) {
    next = code.slice(0, ls) + code.slice(le + 1);
    at = ls;
  } else if (ls > 0) {
    next = code.slice(0, ls - 1);
    at = lineStart(next, next.length);
  } else {
    next = "";
    at = 0;
  }
  return { code: next, pos: clampNormal(next, firstNonBlank(next, at)), deleted };
}

// ── Undo helper ──

function pushUndo(stack: string[], code: string): string[] {
  const next = [...stack];
  if (next.length === 0 || next[next.length - 1] !== code) {
    next.push(code);
    if (next.length > 100) next.shift();
  }
  return next;
}

/** Where vim puts the cursor after undo/redo: the first offset where the buffers differ. */
function firstDiff(from: string, to: string): number {
  const n = Math.min(from.length, to.length);
  let i = 0;
  while (i < n && from[i] === to[i]) i++;
  // Lines restored after the end of the buffer: land on the first restored line.
  if (i === from.length && to[i] === "\n" && i + 1 < to.length) return i + 1;
  return i;
}

// ── Text objects ──

const QUOTE_CHARS = new Set(['"', "'", "`"]);
const OPEN_OF: Record<string, string> = {
  "(": "(", ")": "(", b: "(",
  "{": "{", "}": "{", B: "{",
  "[": "[", "]": "[",
  "<": "<", ">": "<",
};
const CLOSE_OF: Record<string, string> = { "(": ")", "{": "}", "[": "]", "<": ">" };
const TEXT_OBJECTS = new Set(["w", "W", "p", '"', "'", "`", ...Object.keys(OPEN_OF)]);

/** Quote pairs on the cursor's line: the pair containing the cursor, else the first pair after it. */
function findQuotePair(code: string, pos: number, q: string): { open: number; close: number } | null {
  const ls = lineStart(code, pos);
  const le = lineEnd(code, pos);
  const quotes: number[] = [];
  for (let i = ls; i < le; i++) {
    if (code[i] === "\\") { i++; continue; }
    if (code[i] === q) quotes.push(i);
  }
  for (let k = 0; k + 1 < quotes.length; k += 2) {
    const open = quotes[k];
    const close = quotes[k + 1];
    if (pos >= open && pos <= close) return { open, close };
  }
  for (let k = 0; k + 1 < quotes.length; k += 2) {
    if (quotes[k] > pos) return { open: quotes[k], close: quotes[k + 1] };
  }
  return null;
}

/** The `count`-th enclosing bracket pair around `pos` (the cursor may sit on either bracket). */
function findBracketPair(code: string, pos: number, openChar: string, count = 1): { open: number; close: number } | null {
  const closeChar = CLOSE_OF[openChar];
  let from = pos;
  let found: { open: number; close: number } | null = null;
  for (let level = 0; level < count; level++) {
    let depth = 0;
    let open = -1;
    for (let i = from; i >= 0; i--) {
      if (code[i] === closeChar && !(level === 0 && i === pos)) depth++;
      else if (code[i] === openChar) {
        if (depth === 0) { open = i; break; }
        depth--;
      }
    }
    if (open === -1) return found;
    depth = 0;
    let close = -1;
    for (let i = open + 1; i < code.length; i++) {
      if (code[i] === openChar) depth++;
      else if (code[i] === closeChar) {
        if (depth === 0) { close = i; break; }
        depth--;
      }
    }
    if (close === -1) return found;
    found = { open, close };
    from = open - 1;
    if (from < 0) break;
  }
  return found;
}

/** Find the inner range for a text object (ci", di(, etc.) */
export function findInnerRange(code: string, pos: number, delim: string): { start: number; end: number } | null {
  if (QUOTE_CHARS.has(delim)) {
    const pair = findQuotePair(code, pos, delim);
    return pair ? { start: pair.open + 1, end: pair.close } : null;
  }
  const open = OPEN_OF[delim];
  if (!open) return null;
  const pair = findBracketPair(code, pos, open);
  return pair ? { start: pair.open + 1, end: pair.close } : null;
}

/** The `a` range for a delimiter text object (da(, ca" etc.) — inner plus the delimiters. */
export function findARange(code: string, pos: number, delim: string): { start: number; end: number } | null {
  if (QUOTE_CHARS.has(delim)) {
    const pair = findQuotePair(code, pos, delim);
    if (!pair) return null;
    // a" also takes trailing whitespace (or leading, if none trails)
    let start = pair.open;
    let end = pair.close + 1;
    const le = lineEnd(code, pos);
    const ls = lineStart(code, pos);
    if (end < le && /[ \t]/.test(code[end])) {
      while (end < le && /[ \t]/.test(code[end])) end++;
    } else {
      while (start > ls && /[ \t]/.test(code[start - 1])) start--;
    }
    return { start, end };
  }
  const inner = findInnerRange(code, pos, delim);
  if (!inner) return null;
  return { start: inner.start - 1, end: inner.end + 1 };
}

/** Inner word (iw): the run of same-class chars under the cursor, bounded to the line. */
export function innerWordRange(code: string, pos: number, big = false): { start: number; end: number } | null {
  if (code.length === 0) return null;
  const p = Math.min(Math.max(pos, 0), code.length - 1);
  if (code[p] === "\n") return null;
  const cls = charClass(code[p], big);
  let start = p;
  while (start > 0 && code[start - 1] !== "\n" && charClass(code[start - 1], big) === cls) start--;
  let end = p;
  while (end + 1 < code.length && code[end + 1] !== "\n" && charClass(code[end + 1], big) === cls) end++;
  return { start, end: end + 1 };
}

/** A word (aw): inner word plus trailing whitespace, or leading whitespace if none trails. */
export function aWordRange(code: string, pos: number, big = false): { start: number; end: number } | null {
  const inner = innerWordRange(code, pos, big);
  if (!inner) return null;
  let { start } = inner;
  const { end: innerEnd } = inner;
  let end = innerEnd;
  if (/\s/.test(code[inner.start])) {
    // on blanks: the blanks plus the following word
    while (end < code.length && code[end] !== "\n" && !/\s/.test(code[end])) end++;
    return { start, end };
  }
  while (end < code.length && code[end] !== "\n" && /\s/.test(code[end])) end++;
  if (end === innerEnd) {
    while (start > 0 && code[start - 1] !== "\n" && /\s/.test(code[start - 1])) start--;
  }
  return { start, end };
}

/** Paragraph (ip/ap): the run of non-blank lines (or blank lines) around the cursor, linewise. */
function paragraphRange(code: string, pos: number, around: boolean): { start: number; end: number } {
  const blank = (ls: number) => code.slice(ls, lineEnd(code, ls)).trim() === "";
  const kind = blank(lineStart(code, pos));
  let ls = lineStart(code, pos);
  while (ls > 0) {
    const prev = lineStart(code, ls - 1);
    if (blank(prev) !== kind) break;
    ls = prev;
  }
  let le = lineEnd(code, pos);
  while (le < code.length) {
    const nextLs = le + 1;
    if (blank(nextLs) !== kind) break;
    le = lineEnd(code, nextLs);
  }
  if (around && !kind) {
    while (le < code.length && blank(le + 1)) le = lineEnd(code, le + 1);
  }
  return { start: ls, end: le };
}

interface ObjectRange {
  start: number;
  end: number;
  linewise: boolean;
}

/**
 * Resolve a text object ("iw", "a(", "i{", ...) to a range. A brace block
 * whose contents sit on their own lines is linewise, like vim: `di{` on a Go
 * function body empties the body and keeps the braces on their lines.
 */
function resolveTextObject(code: string, pos: number, kind: "i" | "a", obj: string, count: number): ObjectRange | null {
  if (obj === "w" || obj === "W") {
    const r = kind === "i" ? innerWordRange(code, pos, obj === "W") : aWordRange(code, pos, obj === "W");
    return r ? { ...r, linewise: false } : null;
  }
  if (obj === "p") {
    const r = paragraphRange(code, pos, kind === "a");
    return { ...r, linewise: true };
  }
  if (QUOTE_CHARS.has(obj)) {
    const r = kind === "i" ? findInnerRange(code, pos, obj) : findARange(code, pos, obj);
    return r ? { ...r, linewise: false } : null;
  }
  const open = OPEN_OF[obj];
  if (!open) return null;
  const pair = findBracketPair(code, pos, open, count);
  if (!pair) return null;
  if (kind === "a") return { start: pair.open, end: pair.close + 1, linewise: false };
  const innerStart = pair.open + 1;
  const innerEnd = pair.close;
  const afterOpen = code.slice(innerStart, lineEnd(code, innerStart));
  const beforeClose = code.slice(lineStart(code, innerEnd), innerEnd);
  if (afterOpen.trim() === "" && beforeClose.trim() === "" && lineEnd(code, innerStart) < innerEnd) {
    // Block on its own lines → the lines strictly between the brackets.
    const firstLine = lineEnd(code, innerStart) + 1;
    const lastLineEnd = lineStart(code, innerEnd) - 1;
    if (firstLine > lastLineEnd) {
      // `{\n}` — nothing between; an empty, linewise "inside"
      return { start: firstLine, end: firstLine - 1, linewise: true };
    }
    return { start: firstLine, end: lastLineEnd, linewise: true };
  }
  return { start: innerStart, end: innerEnd, linewise: false };
}

// ── Command grammar ──

const OPERATORS = new Set(["d", "c", "y", ">", "<"]);
const SIMPLE_MOTIONS = new Set([
  "h", "j", "k", "l", "w", "W", "b", "B", "e", "E", "0", "^", "_", "$",
  "G", "%", "{", "}", ";", ",", "+", "-", " ",
]);
const FIND_MOTIONS = new Set(["f", "F", "t", "T"]);
const G_MOTIONS = new Set(["g", "e", "E", "_"]);
const NORMAL_COMMANDS = new Set([
  "x", "X", "s", "S", "C", "D", "Y", "p", "P", "J", "~", "u", ".",
  "i", "a", "A", "I", "o", "O", "v", "V",
]);
const VISUAL_COMMANDS = new Set([
  "d", "x", "X", "D", "c", "s", "C", "S", "R", "y", "Y", ">", "<", "~", "u", "U",
  "J", "p", "P", "o", "O", "v", "V",
]);

interface MotionSpec {
  motion: string; // "w", "gg", "f", ...
  arg?: string;
}

type Parsed =
  | { kind: "incomplete" }
  | { kind: "invalid" }
  | { kind: "motion"; count: number | null; m: MotionSpec }
  | { kind: "command"; count: number | null; cmd: string; arg?: string }
  | { kind: "operator"; count: number | null; op: string; target: OpTarget }
  | { kind: "object"; count: number | null; objKind: "i" | "a"; obj: string };

type OpTarget =
  | { type: "line"; count: number | null }
  | { type: "motion"; count: number | null; m: MotionSpec }
  | { type: "object"; count: number | null; objKind: "i" | "a"; obj: string };

function readCount(p: string, i: number): { count: number | null; i: number } {
  if (!/[1-9]/.test(p[i] ?? "")) return { count: null, i };
  let j = i;
  while (j < p.length && /[0-9]/.test(p[j])) j++;
  return { count: parseInt(p.slice(i, j), 10), i: j };
}

/** Parse a motion at p[i]; consumes the rest of the string or reports incomplete/invalid. */
function parseMotion(p: string, i: number): MotionSpec | "incomplete" | "invalid" {
  const c = p[i];
  if (c === undefined) return "incomplete";
  if (FIND_MOTIONS.has(c)) {
    if (i + 1 >= p.length) return "incomplete";
    return i + 2 === p.length ? { motion: c, arg: p[i + 1] } : "invalid";
  }
  if (c === "g") {
    if (i + 1 >= p.length) return "incomplete";
    const c2 = p[i + 1];
    if (!G_MOTIONS.has(c2) || i + 2 !== p.length) return "invalid";
    return { motion: "g" + c2 };
  }
  if (SIMPLE_MOTIONS.has(c) && i + 1 === p.length) return { motion: c };
  return "invalid";
}

function parseCommand(p: string, mode: VimMode): Parsed {
  const visual = isVisualMode(mode);
  const { count, i } = readCount(p, 0);
  if (i >= p.length) return { kind: "incomplete" };
  const c = p[i];

  if (visual) {
    // In visual mode `i`/`a` start a text object; operators act on the selection.
    if (c === "i" || c === "a") {
      if (i + 1 >= p.length) return { kind: "incomplete" };
      const obj = p[i + 1];
      return TEXT_OBJECTS.has(obj) && i + 2 === p.length
        ? { kind: "object", count, objKind: c, obj }
        : { kind: "invalid" };
    }
    if (c === "r") {
      if (i + 1 >= p.length) return { kind: "incomplete" };
      return { kind: "command", count, cmd: "r", arg: p[i + 1] };
    }
    if (VISUAL_COMMANDS.has(c) && i + 1 === p.length) return { kind: "command", count, cmd: c };
    const m = parseMotion(p, i);
    if (m === "incomplete") return { kind: "incomplete" };
    if (m === "invalid") return { kind: "invalid" };
    return { kind: "motion", count, m };
  }

  if (OPERATORS.has(c)) {
    const op = c;
    let j = i + 1;
    if (j >= p.length) return { kind: "incomplete" };
    const inner = readCount(p, j);
    j = inner.i;
    if (j >= p.length) return { kind: "incomplete" };
    const c2 = p[j];
    if (c2 === op) {
      return j + 1 === p.length
        ? { kind: "operator", count, op, target: { type: "line", count: inner.count } }
        : { kind: "invalid" };
    }
    if (c2 === "i" || c2 === "a") {
      if (j + 1 >= p.length) return { kind: "incomplete" };
      const obj = p[j + 1];
      return TEXT_OBJECTS.has(obj) && j + 2 === p.length
        ? { kind: "operator", count, op, target: { type: "object", count: inner.count, objKind: c2, obj } }
        : { kind: "invalid" };
    }
    const m = parseMotion(p, j);
    if (m === "incomplete") return { kind: "incomplete" };
    if (m === "invalid") return { kind: "invalid" };
    return { kind: "operator", count, op, target: { type: "motion", count: inner.count, m } };
  }

  if (c === "r") {
    if (i + 1 >= p.length) return { kind: "incomplete" };
    return i + 2 === p.length ? { kind: "command", count, cmd: "r", arg: p[i + 1] } : { kind: "invalid" };
  }
  if (NORMAL_COMMANDS.has(c) && i + 1 === p.length) return { kind: "command", count, cmd: c };

  const m = parseMotion(p, i);
  if (m === "incomplete") return { kind: "incomplete" };
  if (m === "invalid") return { kind: "invalid" };
  return { kind: "motion", count, m };
}

// ── Motions ──

interface MotionResult {
  pos: number;
  linewise: boolean;
  inclusive: boolean;
  /** For operators: false when the motion couldn't move at all (vim beeps). */
  ok: boolean;
  wantCol?: number | null;
  lastFind?: FindSpec | null;
}

function findOnLine(code: string, pos: number, spec: FindSpec, count: number, repeat: boolean): number | null {
  const ls = lineStart(code, pos);
  const le = lineEnd(code, pos);
  const forward = spec.kind === "f" || spec.kind === "t";
  let i = pos;
  // `;` after t/T would match the char right next to the cursor again — step past it.
  if (repeat && (spec.kind === "t" || spec.kind === "T")) i += forward ? 1 : -1;
  let found = -1;
  for (let k = 0; k < count; k++) {
    let j = forward ? i + 1 : i - 1;
    while (j >= ls && j < le && code[j] !== spec.ch) j += forward ? 1 : -1;
    if (j < ls || j >= le) return null;
    found = j;
    i = j;
  }
  if (spec.kind === "t") return found - 1;
  if (spec.kind === "T") return found + 1;
  return found;
}

function matchBracketPos(code: string, pos: number): number | null {
  const pairs: Record<string, string> = { "(": ")", ")": "(", "{": "}", "}": "{", "[": "]", "]": "[" };
  let p = pos;
  // vim: when not on a bracket, use the first one after the cursor on the line
  if (!(code[p] in pairs)) {
    const le = lineEnd(code, p);
    while (p < le && !(code[p] in pairs)) p++;
    if (p >= le) return null;
  }
  const ch = code[p];
  const target = pairs[ch];
  const forward = "({[".includes(ch);
  let depth = 0;
  for (let i = p; forward ? i < code.length : i >= 0; i += forward ? 1 : -1) {
    if (code[i] === ch) depth++;
    else if (code[i] === target) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return null;
}

function moveLines(code: string, pos: number, delta: number, wantCol: number | null | undefined): { pos: number; moved: number; wantCol: number } {
  const cur = lineOf(code, pos);
  const total = lineCount(code);
  const target = Math.max(0, Math.min(total - 1, cur + delta));
  const col = wantCol ?? pos - lineStart(code, pos);
  const ls = lineStartOfLine(code, target);
  const le = lineEnd(code, ls);
  const p = ls + Math.min(col, Math.max(0, le - ls - 1));
  return { pos: clampNormal(code, p), moved: Math.abs(target - cur), wantCol: col };
}

function computeMotion(
  code: string,
  pos: number,
  spec: MotionSpec,
  countArg: number | null,
  st: { wantCol: number | null; lastFind: FindSpec | null },
  forOp: boolean
): MotionResult {
  const count = countArg ?? 1;
  const fail: MotionResult = { pos, linewise: false, inclusive: false, ok: false };
  const ls = lineStart(code, pos);
  const le = lineEnd(code, pos);
  switch (spec.motion) {
    case "h": {
      const p = Math.max(ls, pos - count);
      return { pos: p, linewise: false, inclusive: false, ok: p !== pos };
    }
    case "l":
    case " ": {
      // Operators may reach one past the last char (`dl`/`x` at end of line).
      const limit = forOp ? le : lastCharOnLine(code, pos);
      const p = Math.min(limit, pos + count);
      return { pos: p, linewise: false, inclusive: false, ok: p !== pos };
    }
    case "j":
    case "+": {
      const r = moveLines(code, pos, count, spec.motion === "j" ? st.wantCol : 0);
      const p = spec.motion === "+" ? firstNonBlank(code, lineStart(code, r.pos)) : r.pos;
      return { pos: p, linewise: true, inclusive: false, ok: r.moved > 0, wantCol: spec.motion === "j" ? r.wantCol : null };
    }
    case "k":
    case "-": {
      const r = moveLines(code, pos, -count, spec.motion === "k" ? st.wantCol : 0);
      const p = spec.motion === "-" ? firstNonBlank(code, lineStart(code, r.pos)) : r.pos;
      return { pos: p, linewise: true, inclusive: false, ok: r.moved > 0, wantCol: spec.motion === "k" ? r.wantCol : null };
    }
    case "0":
      return { pos: ls, linewise: false, inclusive: false, ok: true };
    case "^":
      return { pos: firstNonBlank(code, ls), linewise: false, inclusive: false, ok: true };
    case "_": {
      const r = moveLines(code, pos, count - 1, 0);
      return { pos: firstNonBlank(code, lineStart(code, r.pos)), linewise: true, inclusive: false, ok: true };
    }
    case "$": {
      const r = moveLines(code, pos, count - 1, 0);
      const lineE = lineEnd(code, r.pos);
      const lineS = lineStart(code, r.pos);
      if (forOp) {
        // d$ on an empty line deletes nothing
        return { pos: Math.max(lineS, lineE - 1), linewise: false, inclusive: lineE > lineS, ok: true, wantCol: Infinity };
      }
      return { pos: lastCharOnLine(code, r.pos), linewise: false, inclusive: true, ok: true, wantCol: Infinity };
    }
    case "g_": {
      const r = moveLines(code, pos, count - 1, 0);
      const lineS = lineStart(code, r.pos);
      let p = lineEnd(code, r.pos) - 1;
      while (p > lineS && /\s/.test(code[p])) p--;
      return { pos: Math.max(lineS, p), linewise: false, inclusive: true, ok: true };
    }
    case "w":
    case "W": {
      const big = spec.motion === "W";
      let p = pos;
      for (let k = 0; k < count; k++) {
        if (p >= code.length) break;
        p = nextWordStart(code, p, big);
      }
      if (!forOp) p = clampNormal(code, p);
      return { pos: p, linewise: false, inclusive: false, ok: p !== pos };
    }
    case "b":
    case "B": {
      let p = pos;
      for (let k = 0; k < count; k++) p = prevWordStart(code, p, spec.motion === "B");
      return { pos: clampNormal(code, p), linewise: false, inclusive: false, ok: p !== pos };
    }
    case "e":
    case "E": {
      let p = pos;
      for (let k = 0; k < count; k++) p = nextWordEnd(code, p, spec.motion === "E");
      return { pos: clampNormal(code, p), linewise: false, inclusive: true, ok: p !== pos };
    }
    case "ge":
    case "gE": {
      let p = pos;
      for (let k = 0; k < count; k++) p = prevWordEnd(code, p, spec.motion === "gE");
      return { pos: clampNormal(code, p), linewise: false, inclusive: true, ok: p !== pos };
    }
    case "G":
    case "gg": {
      const total = lineCount(code);
      const line = countArg !== null ? Math.min(countArg, total) - 1 : spec.motion === "G" ? total - 1 : 0;
      const target = firstNonBlank(code, lineStartOfLine(code, line));
      return { pos: clampNormal(code, target), linewise: true, inclusive: false, ok: true };
    }
    case "%": {
      const p = matchBracketPos(code, pos);
      return p === null ? fail : { pos: p, linewise: false, inclusive: true, ok: true };
    }
    case "}": {
      let p = pos;
      for (let k = 0; k < count; k++) {
        let line = lineEnd(code, p);
        // skip blank lines, then find the next blank line
        while (line < code.length && code.slice(line + 1, lineEnd(code, line + 1)).trim() === "") line = lineEnd(code, line + 1);
        while (line < code.length && code.slice(line + 1, lineEnd(code, line + 1)).trim() !== "") line = lineEnd(code, line + 1);
        p = line < code.length ? line + 1 : code.length;
      }
      if (!forOp) p = clampNormal(code, p);
      return { pos: p, linewise: false, inclusive: false, ok: p !== pos };
    }
    case "{": {
      let p = pos;
      for (let k = 0; k < count; k++) {
        let start = lineStart(code, p);
        while (start > 0 && code.slice(lineStart(code, start - 1), start - 1).trim() === "") start = lineStart(code, start - 1);
        while (start > 0 && code.slice(lineStart(code, start - 1), start - 1).trim() !== "") start = lineStart(code, start - 1);
        p = start > 0 ? lineStart(code, start - 1) : 0;
      }
      return { pos: p, linewise: false, inclusive: false, ok: p !== pos };
    }
    case "f":
    case "F":
    case "t":
    case "T": {
      if (!spec.arg || spec.arg.length !== 1) return fail;
      const find: FindSpec = { kind: spec.motion, ch: spec.arg };
      const p = findOnLine(code, pos, find, count, false);
      if (p === null) return { ...fail, lastFind: find };
      return { pos: p, linewise: false, inclusive: find.kind === "f" || find.kind === "t", ok: true, lastFind: find };
    }
    case ";":
    case ",": {
      const last = st.lastFind;
      if (!last) return fail;
      const flip: Record<FindSpec["kind"], FindSpec["kind"]> = { f: "F", F: "f", t: "T", T: "t" };
      const spec2: FindSpec = spec.motion === "," ? { kind: flip[last.kind], ch: last.ch } : last;
      const p = findOnLine(code, pos, spec2, count, true);
      if (p === null) return fail;
      return { pos: p, linewise: false, inclusive: spec2.kind === "f" || spec2.kind === "t", ok: true, lastFind: last };
    }
  }
  return fail;
}

// ── Main command processor ──

interface State {
  code: string;
  pos: number;
  mode: VimMode;
  pending: string;
  yank: string;
  yankLinewise: boolean;
  undoStack: string[];
  redoStack: string[];
  anchor: number;
  wantCol: number | null;
  lastFind: FindSpec | null;
  lastChange: RecordedChange | null;
  insertSession: InsertSession | null;
}

function out(s: State, codeChanged: boolean, handled = true): VimOutput {
  return { ...s, handled, codeChanged };
}

/** Snapshot for undo before a change; any new change clears redo. */
function beginChange(s: State): State {
  return { ...s, undoStack: pushUndo(s.undoStack, s.code), redoStack: [] };
}

function enterInsert(s: State, code: string, pos: number, keys: string): State {
  return {
    ...s,
    code,
    pos,
    mode: "insert",
    pending: "",
    wantCol: null,
    insertSession: keys ? { keys, start: pos, base: code } : null,
  };
}

/** Remember a finished change for `.` — visual-mode changes (no keys) aren't repeatable. */
function recordChange(s: State, keys: string): State {
  return keys ? { ...s, lastChange: { keys, text: null } } : s;
}

/** Indent for a line opened below `pos` — copies the line's indent, one level deeper after an opener. */
function openIndent(code: string, pos: number): string {
  const indent = lineIndent(code, pos);
  const line = code.slice(lineStart(code, pos), lineEnd(code, pos)).trimEnd();
  return /[{([:]$/.test(line) ? indent + "    " : indent;
}

function indentLines(code: string, ls: number, le: number, dir: ">" | "<", times: number): string {
  const block = code.slice(ls, le);
  const shifted = block
    .split("\n")
    .map((line) => {
      if (dir === ">") return line.trim() === "" ? line : "    ".repeat(times) + line;
      let l = line;
      for (let t = 0; t < times; t++) {
        if (l.startsWith("\t")) l = l.slice(1);
        else l = l.replace(/^ {1,4}/, "");
      }
      return l;
    })
    .join("\n");
  return code.slice(0, ls) + shifted + code.slice(le);
}

/** Apply an operator to a resolved range. `keys` is the command, recorded for `.`. */
function applyOperator(
  s: State,
  op: string,
  range: { start: number; end: number; linewise: boolean },
  keys: string,
  opts: { cursorAfterYank?: number; times?: number } = {}
): VimOutput {
  const { code } = s;
  if (range.linewise) {
    const ls = lineStart(code, range.start);
    const le = range.end < range.start ? range.start - 1 : lineEnd(code, range.end);
    if (le < ls) {
      // empty linewise range (`ci{` on `{\n}`) — only `c` does anything
      if (op !== "c") return out({ ...s, pending: "" }, false);
      const indent = openIndent(code, Math.max(0, ls - 1));
      const next = code.slice(0, ls) + indent + "\n" + code.slice(ls);
      return out(enterInsert(beginChange(s), next, ls + indent.length, keys), true);
    }
    const text = code.slice(ls, le);
    switch (op) {
      case "y":
        return out({ ...s, pending: "", yank: text, yankLinewise: true, pos: opts.cursorAfterYank ?? s.pos }, false);
      case "d": {
        const r = deleteLines(code, ls, le);
        const st = recordChange(beginChange(s), keys);
        return out({ ...st, code: r.code, pos: r.pos, pending: "", yank: text, yankLinewise: true }, true);
      }
      case "c": {
        const indent = lineIndent(code, ls);
        const next = code.slice(0, ls) + indent + code.slice(le);
        const st = { ...beginChange(s), yank: text, yankLinewise: true };
        return out(enterInsert(st, next, ls + indent.length, keys), true);
      }
      case ">":
      case "<": {
        const next = indentLines(code, ls, le, op, opts.times ?? 1);
        if (next === code) return out({ ...s, pending: "" }, false);
        const st = recordChange(beginChange(s), keys);
        return out({ ...st, code: next, pos: clampNormal(next, firstNonBlank(next, ls)), pending: "" }, true);
      }
    }
    return out({ ...s, pending: "" }, false);
  }

  const start = Math.max(0, range.start);
  const end = Math.min(code.length, range.end);
  const text = code.slice(start, end);
  switch (op) {
    case "y":
      return out({ ...s, pending: "", yank: text, yankLinewise: false, pos: opts.cursorAfterYank ?? start }, false);
    case "d": {
      if (start === end) return out({ ...s, pending: "" }, false);
      const next = code.slice(0, start) + code.slice(end);
      const st = recordChange(beginChange(s), keys);
      return out({ ...st, code: next, pos: clampNormal(next, start), pending: "", yank: text, yankLinewise: false }, true);
    }
    case "c": {
      const next = code.slice(0, start) + code.slice(end);
      const st = { ...beginChange(s), yank: start === end ? s.yank : text, yankLinewise: start === end ? s.yankLinewise : false };
      return out(enterInsert(st, next, start, keys), true);
    }
    case ">":
    case "<": {
      const ls = lineStart(code, start);
      const le = lineEnd(code, Math.max(start, end - 1));
      return applyOperator(s, op, { start: ls, end: le, linewise: true }, keys, opts);
    }
  }
  return out({ ...s, pending: "" }, false);
}

/** Vim's exclusive-motion rule: an exclusive range ending at column 0 stops at the previous line's end. */
function adjustExclusive(code: string, start: number, end: number): number {
  if (end > start && end <= code.length && code[end - 1] === "\n" && lineOf(code, end) > lineOf(code, start)) {
    return end - 1;
  }
  return end;
}

/** `cw` acts like `ce` (no trailing space) when the cursor is on a word. */
function changeWordEnd(code: string, pos: number, count: number, big: boolean): number {
  let p = pos;
  const cls = charClass(code[p], big);
  // end of the current word
  if (charClass(code[p + 1], big) !== cls || code[p + 1] === "\n") {
    // already on the last char of the word
  } else {
    while (p + 1 < code.length && code[p + 1] !== "\n" && charClass(code[p + 1], big) === cls) p++;
  }
  for (let k = 1; k < count; k++) p = nextWordEnd(code, p, big);
  return p + 1;
}

function runOperator(s: State, parsed: Extract<Parsed, { kind: "operator" }>, keys: string): VimOutput {
  const { code, pos } = s;
  const { op, target } = parsed;
  const count = parsed.count !== null || target.count !== null ? (parsed.count ?? 1) * (target.count ?? 1) : null;
  const n = count ?? 1;

  if (target.type === "line") {
    // dd, cc, yy, >>, << — `count` lines from the cursor's line
    const startLine = lineOf(code, pos);
    const lastLine = Math.min(lineCount(code) - 1, startLine + n - 1);
    const ls = lineStart(code, pos);
    const le = lineEnd(code, lineStartOfLine(code, lastLine));
    return applyOperator(s, op, { start: ls, end: le, linewise: true }, keys, { cursorAfterYank: pos });
  }

  if (target.type === "object") {
    const r = resolveTextObject(code, pos, target.objKind, target.obj, n);
    if (!r) return out({ ...s, pending: "" }, false);
    if (r.linewise) {
      return applyOperator(s, op, { start: r.start, end: r.end, linewise: true }, keys, { cursorAfterYank: r.start });
    }
    return applyOperator(s, op, r, keys);
  }

  const m = target.m;
  // cw / cW on a word behave like ce / cE
  if (op === "c" && (m.motion === "w" || m.motion === "W") && !/\s/.test(code[pos] ?? " ")) {
    const end = changeWordEnd(code, pos, n, m.motion === "W");
    return applyOperator(s, op, { start: pos, end, linewise: false }, keys);
  }
  const r = computeMotion(code, pos, m, count, s, true);
  const withFind = r.lastFind !== undefined ? { ...s, lastFind: r.lastFind } : s;
  if (!r.ok) return out({ ...withFind, pending: "" }, false);
  if (r.linewise) {
    const a = Math.min(pos, r.pos);
    const b = Math.max(pos, r.pos);
    return applyOperator(withFind, op, { start: lineStart(code, a), end: lineEnd(code, b), linewise: true }, keys, {
      cursorAfterYank: r.pos < pos ? r.pos : pos,
    });
  }
  const a = Math.min(pos, r.pos);
  let b = Math.max(pos, r.pos);
  if (r.inclusive) b = Math.min(code.length, b + 1);
  else b = adjustExclusive(code, a, b);
  return applyOperator(withFind, op, { start: a, end: b, linewise: false }, keys);
}

/** Selection covered by visual mode as a [start, end) range. */
export function visualRange(code: string, anchor: number, pos: number, mode: VimMode): { start: number; end: number } {
  const a = Math.min(anchor, pos);
  const b = Math.max(anchor, pos);
  if (mode === "visual-line") {
    const le = lineEnd(code, b);
    return { start: lineStart(code, a), end: le };
  }
  return { start: a, end: Math.min(code.length, b + 1) };
}

function runVisualCommand(s: State, cmd: string, count: number | null, arg?: string): VimOutput {
  const { code } = s;
  const linewise = s.mode === "visual-line";
  const sel = visualRange(code, s.anchor, s.pos, s.mode);
  const toNormal = (st: State): State => ({ ...st, mode: "normal", pending: "" });

  switch (cmd) {
    case "v":
      return out(s.mode === "visual" ? toNormal(s) : { ...s, mode: "visual", pending: "" }, false);
    case "V":
      return out(s.mode === "visual-line" ? toNormal(s) : { ...s, mode: "visual-line", pending: "" }, false);
    case "o":
    case "O":
      return out({ ...s, anchor: s.pos, pos: s.anchor, pending: "" }, false);
    case "d":
    case "x":
      return applyOperator(toNormal(s), "d", { ...sel, linewise }, "");
    case "X":
    case "D":
      return applyOperator(toNormal(s), "d", { ...sel, linewise: true }, "");
    case "y":
      return applyOperator(toNormal(s), "y", { ...sel, linewise }, "", { cursorAfterYank: linewise ? lineStart(code, sel.start) : sel.start });
    case "Y":
      return applyOperator(toNormal(s), "y", { ...sel, linewise: true }, "", { cursorAfterYank: lineStart(code, sel.start) });
    case "c":
    case "s":
      return applyOperator(toNormal(s), "c", { ...sel, linewise }, "");
    case "C":
    case "S":
    case "R":
      return applyOperator(toNormal(s), "c", { ...sel, linewise: true }, "");
    case ">":
    case "<":
      return applyOperator(toNormal(s), cmd, { ...sel, linewise: true }, "", { times: count ?? 1 });
    case "~":
    case "u":
    case "U":
    case "r": {
      if (cmd === "r" && (!arg || arg.length !== 1)) return out(toNormal(s), false);
      const text = code.slice(sel.start, sel.end);
      const mapped = text.replace(/[^\n]/g, (ch) => {
        if (cmd === "r") return arg!;
        if (cmd === "u") return ch.toLowerCase();
        if (cmd === "U") return ch.toUpperCase();
        return ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase();
      });
      const next = code.slice(0, sel.start) + mapped + code.slice(sel.end);
      const st = next === code ? s : beginChange(s);
      return out({ ...toNormal(st), code: next, pos: clampNormal(next, sel.start) }, next !== code);
    }
    case "J": {
      const lines = Math.max(2, lineOf(code, sel.end) - lineOf(code, sel.start) + 1);
      return runNormalCommand({ ...toNormal(s), pos: sel.start }, "J", lines, undefined, "");
    }
    case "p":
    case "P": {
      if (!s.yank) return out(toNormal(s), false);
      const replaced = code.slice(sel.start, sel.end);
      const next = code.slice(0, sel.start) + s.yank + code.slice(sel.end);
      const at = s.yankLinewise || linewise
        ? clampNormal(next, firstNonBlank(next, lineStart(next, sel.start)))
        : clampNormal(next, sel.start + s.yank.length - 1);
      const st = beginChange(s);
      // `p` in visual swaps the register with what it replaced
      return out({ ...toNormal(st), code: next, pos: at, yank: replaced, yankLinewise: linewise }, true);
    }
  }
  return out({ ...s, pending: "" }, false);
}

function joinLines(code: string, pos: number, count: number): { code: string; pos: number } | null {
  let next = code;
  let at = pos;
  const joins = Math.max(1, count - 1);
  let joined = 0;
  for (let k = 0; k < joins; k++) {
    const le = lineEnd(next, at);
    if (le >= next.length) break;
    const following = next.slice(le + 1);
    const trimmed = following.replace(/^[ \t]+/, "");
    const left = next.slice(0, le).replace(/[ \t]+$/, "");
    const nextLineEmpty = trimmed.startsWith("\n") || trimmed === "";
    const sep = nextLineEmpty || trimmed.startsWith(")") || left.endsWith("\n") || left === "" ? "" : " ";
    next = left + sep + trimmed;
    at = left.length;
    joined++;
  }
  if (joined === 0) return null;
  return { code: next, pos: clampNormal(next, at) };
}

function runNormalCommand(s: State, cmd: string, count: number | null, arg: string | undefined, keys: string): VimOutput {
  const { code, pos } = s;
  const n = count ?? 1;
  const ls = lineStart(code, pos);
  const le = lineEnd(code, pos);
  const done = (st: State, changed: boolean) => out({ ...st, pending: "", wantCol: null }, changed);
  const record = (st: State): State => recordChange(st, keys);

  switch (cmd) {
    // ── Insert transitions ──
    case "i":
      return out(enterInsert(beginChange(s), code, pos, keys), false);
    case "a":
      return out(enterInsert(beginChange(s), code, Math.min(pos + 1, le), keys), false);
    case "A":
      return out(enterInsert(beginChange(s), code, le, keys), false);
    case "I":
      return out(enterInsert(beginChange(s), code, firstNonBlank(code, ls), keys), false);
    case "o": {
      const indent = openIndent(code, pos);
      const next = code.slice(0, le) + "\n" + indent + code.slice(le);
      return out(enterInsert(beginChange(s), next, le + 1 + indent.length, keys), true);
    }
    case "O": {
      const indent = lineIndent(code, pos);
      const next = code.slice(0, ls) + indent + "\n" + code.slice(ls);
      return out(enterInsert(beginChange(s), next, ls + indent.length, keys), true);
    }
    case "S":
      return runOperator(s, { kind: "operator", count, op: "c", target: { type: "line", count: null } }, keys);
    case "C":
      return runOperator(s, { kind: "operator", count, op: "c", target: { type: "motion", count: null, m: { motion: "$" } } }, keys);
    case "D":
      return runOperator(s, { kind: "operator", count, op: "d", target: { type: "motion", count: null, m: { motion: "$" } } }, keys);
    case "Y":
      return runOperator(s, { kind: "operator", count, op: "y", target: { type: "line", count: null } }, keys);
    case "s": {
      if (le === ls) return out(enterInsert(beginChange(s), code, pos, keys), false);
      const end = Math.min(le, pos + n);
      const st = { ...beginChange(s), yank: code.slice(pos, end), yankLinewise: false };
      return out(enterInsert(st, code.slice(0, pos) + code.slice(end), pos, keys), true);
    }

    // ── Editing ──
    case "x": {
      if (le === ls || pos >= le) return done(s, false);
      const end = Math.min(le, pos + n);
      const next = code.slice(0, pos) + code.slice(end);
      const st = record(beginChange(s));
      return done({ ...st, code: next, pos: clampNormal(next, pos), yank: code.slice(pos, end), yankLinewise: false }, true);
    }
    case "X": {
      if (pos === ls) return done(s, false);
      const start = Math.max(ls, pos - n);
      const next = code.slice(0, start) + code.slice(pos);
      const st = record(beginChange(s));
      return done({ ...st, code: next, pos: clampNormal(next, start), yank: code.slice(start, pos), yankLinewise: false }, true);
    }
    case "r": {
      if (!arg || arg.length !== 1 || pos + n > le) return done(s, false);
      const next = code.slice(0, pos) + arg.repeat(n) + code.slice(pos + n);
      const st = record(beginChange(s));
      return done({ ...st, code: next, pos: pos + n - 1 }, true);
    }
    case "~": {
      if (le === ls) return done(s, false);
      const end = Math.min(le, pos + n);
      const toggled = code
        .slice(pos, end)
        .replace(/./g, (ch) => (ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase()));
      const next = code.slice(0, pos) + toggled + code.slice(end);
      const st = next === code ? s : record(beginChange(s));
      return done({ ...st, code: next, pos: clampNormal(next, end) }, next !== code);
    }
    case "J": {
      const r = joinLines(code, pos, Math.max(2, n));
      if (!r) return done(s, false);
      const st = record(beginChange(s));
      return done({ ...st, code: r.code, pos: r.pos }, true);
    }
    case "p":
    case "P": {
      if (!s.yank) return done(s, false);
      const st = record(beginChange(s));
      if (s.yankLinewise) {
        const block = Array(n).fill(s.yank).join("\n");
        if (cmd === "p") {
          const next = code.slice(0, le) + "\n" + block + code.slice(le);
          return done({ ...st, code: next, pos: clampNormal(next, firstNonBlank(next, le + 1)) }, true);
        }
        const next = code.slice(0, ls) + block + "\n" + code.slice(ls);
        return done({ ...st, code: next, pos: clampNormal(next, firstNonBlank(next, ls)) }, true);
      }
      const text = s.yank.repeat(n);
      const at = cmd === "p" && le > ls ? Math.min(pos + 1, code.length) : pos;
      const next = code.slice(0, at) + text + code.slice(at);
      return done({ ...st, code: next, pos: clampNormal(next, at + text.length - 1) }, true);
    }

    // ── Undo / redo / repeat ──
    case "u": {
      let st = s;
      let changed = false;
      for (let k = 0; k < n && st.undoStack.length > 0; k++) {
        const undo = [...st.undoStack];
        const prev = undo.pop()!;
        st = { ...st, code: prev, undoStack: undo, redoStack: [...st.redoStack, st.code] };
        changed = true;
      }
      if (!changed) return done(s, false);
      return done({ ...st, pos: clampNormal(st.code, firstDiff(code, st.code)) }, st.code !== code);
    }
    case ".":
      return repeatLastChange(s, count);

    // ── Visual ──
    case "v":
      return out({ ...s, mode: "visual", anchor: pos, pending: "" }, false);
    case "V":
      return out({ ...s, mode: "visual-line", anchor: pos, pending: "" }, false);
  }
  return done(s, false);
}

function redo(s: State): VimOutput {
  if (s.redoStack.length === 0) return out({ ...s, pending: "" }, false);
  const redoStack = [...s.redoStack];
  const next = redoStack.pop()!;
  const undoStack = pushUndo(s.undoStack, s.code);
  return out(
    { ...s, code: next, pos: clampNormal(next, firstDiff(s.code, next)), undoStack, redoStack, pending: "" },
    next !== s.code
  );
}

function repeatLastChange(s: State, count: number | null): VimOutput {
  const last = s.lastChange;
  if (!last) return out({ ...s, pending: "" }, false);
  const keys = count !== null ? String(count) + last.keys.replace(/^[0-9]+/, "") : last.keys;
  let st: VimOutput = out({ ...s, pending: "", mode: "normal" }, false);
  let changed = false;
  for (const key of keys) {
    st = processKey({ ...st, key });
    changed = changed || st.codeChanged;
  }
  if (st.mode === "insert") {
    const text = last.text ?? "";
    const code = st.code.slice(0, st.pos) + text + st.code.slice(st.pos);
    st = processKey({ ...st, code, pos: st.pos + text.length, key: KEY_ESCAPE });
    changed = changed || text.length > 0;
  }
  return { ...st, codeChanged: changed || st.code !== s.code, lastChange: last };
}

function normalize(input: VimInput): State {
  return {
    code: input.code,
    pos: input.pos,
    mode: input.mode,
    pending: input.pending,
    yank: input.yank,
    yankLinewise: input.yankLinewise ?? false,
    undoStack: input.undoStack,
    redoStack: input.redoStack ?? [],
    anchor: input.anchor ?? input.pos,
    wantCol: input.wantCol ?? null,
    lastFind: input.lastFind ?? null,
    lastChange: input.lastChange ?? null,
    insertSession: input.insertSession ?? null,
  };
}

/** Leave insert mode: step the cursor back one (within the line) and record the typed text for `.`. */
function leaveInsert(s: State): VimOutput {
  const { code, pos } = s;
  const ls = lineStart(code, pos);
  const back = pos > ls ? pos - 1 : pos;
  let lastChange = s.lastChange;
  let undoStack = s.undoStack;
  const session = s.insertSession;
  if (session) {
    const { base, start, keys } = session;
    const grew = code.length - base.length;
    const linear =
      grew >= 0 &&
      code.slice(0, start) === base.slice(0, start) &&
      code.slice(start + grew) === base.slice(start);
    // Only a straight run of typing can be replayed by `.`.
    lastChange = linear ? { keys, text: code.slice(start, start + grew) } : null;
  }
  // An insert that changed nothing shouldn't leave an empty undo step behind.
  if (undoStack.length > 0 && undoStack[undoStack.length - 1] === code) undoStack = undoStack.slice(0, -1);
  return out(
    { ...s, mode: "normal", pos: clampNormal(code, back), pending: "", insertSession: null, lastChange, undoStack, wantCol: null },
    false
  );
}

export function processKey(input: VimInput): VimOutput {
  const s = normalize(input);
  const { key } = input;

  if (s.mode === "insert") {
    if (key === KEY_ESCAPE) return leaveInsert(s);
    return out(s, false, false);
  }

  if (key === KEY_ESCAPE) {
    return out({ ...s, mode: "normal", pending: "", pos: clampNormal(s.code, s.pos) }, false);
  }
  if (key === KEY_REDO) return redo(s);
  // Unknown named keys (Shift, F-keys...) must not break a half-typed command like `ci{`.
  if (key.length !== 1) return out(s, false);

  const pending = s.pending + key;
  const parsed = parseCommand(pending, s.mode);

  switch (parsed.kind) {
    case "incomplete":
      return out({ ...s, pending }, false);
    case "invalid":
      return out({ ...s, pending: "" }, false);
    case "motion": {
      const r = computeMotion(s.code, s.pos, parsed.m, parsed.count, s, false);
      const vertical = ["j", "k"].includes(parsed.m.motion);
      return out(
        {
          ...s,
          pos: r.pos,
          pending: "",
          wantCol: vertical || parsed.m.motion === "$" ? (r.wantCol ?? null) : null,
          lastFind: r.lastFind !== undefined ? r.lastFind : s.lastFind,
        },
        false
      );
    }
    case "object": {
      // visual-mode text object: select it
      const r = resolveTextObject(s.code, s.pos, parsed.objKind, parsed.obj, parsed.count ?? 1);
      if (!r) return out({ ...s, pending: "" }, false);
      if (r.linewise) {
        if (r.end < r.start) return out({ ...s, pending: "" }, false);
        return out({ ...s, mode: "visual-line", anchor: r.start, pos: clampNormal(s.code, r.end), pending: "" }, false);
      }
      if (r.end <= r.start) return out({ ...s, pending: "" }, false);
      return out({ ...s, anchor: r.start, pos: r.end - 1, pending: "" }, false);
    }
    case "command":
      if (isVisualMode(s.mode)) return runVisualCommand(s, parsed.cmd, parsed.count, parsed.arg);
      return runNormalCommand(s, parsed.cmd, parsed.count, parsed.arg, pending);
    case "operator":
      return runOperator(s, parsed, pending);
  }
}

// ── Keyboard → vim key ──

const MODIFIER_KEYS = new Set([
  "Shift", "Control", "Alt", "Meta", "CapsLock", "OS", "Fn", "FnLock", "Hyper", "Super", "AltGraph", "Dead", "Process", "Unidentified",
]);

/** Named keys that act like a vim key in normal/visual mode. */
const NAMED_KEYS: Record<string, string> = {
  ArrowLeft: "h",
  ArrowDown: "j",
  ArrowUp: "k",
  ArrowRight: "l",
  Backspace: "h",
  Enter: "+",
  Home: "0",
  End: "$",
  Delete: "x",
};

export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

/**
 * Translate a keyboard event into a vim key.
 *  - `null`  → not vim's business; let the editor/browser handle it
 *  - `""`    → swallow it, but don't touch vim state (Shift, Tab in normal mode...)
 *  - else    → feed it to processKey
 */
export function keyFromEvent(e: KeyLike, mode: VimMode, pending = ""): string | null {
  if (mode === "insert") {
    if (e.key === "Escape") return KEY_ESCAPE;
    if (e.ctrlKey && (e.key === "[" || e.key === "c")) return KEY_ESCAPE;
    return null;
  }
  if (e.metaKey) return null; // ⌘-shortcuts (copy, format, submit) stay with the editor
  if (e.ctrlKey) {
    if (e.key === "r") return KEY_REDO;
    if (e.key === "[" || e.key === "c") return KEY_ESCAPE;
    return null;
  }
  if (MODIFIER_KEYS.has(e.key)) return "";
  if (e.key === "Escape") return KEY_ESCAPE;
  // r/f/t/F/T wait for a literal character — a named key (Enter, arrows) can't be one
  if (/[rfFtT]$/.test(pending) && e.key.length !== 1) return "";
  if (e.key in NAMED_KEYS) return NAMED_KEYS[e.key];
  if (e.key === "Tab") return "";
  if (e.key.length === 1) return e.key;
  return null; // PageUp/PageDown/F-keys keep their native behavior
}
