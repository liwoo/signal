// ── Maya's answer banks · Rust · Act III (Ch 7 DEEP SCAN, Ch 8, Ch 9) ──
// Same story beats and stakes as the Python/JS banks, teaching Rust and agreeing
// with src/data/challenges/rust/act-3.ts. Offline, the engine grades by these
// codePatterns: the ||COMPLETE|| pattern must recognize a genuinely correct
// program and the patterns above it catch the classic mistakes first.
// Voice rule: every `!` (println!, macros) lives inside backticks.

import type { CodePattern, OutputPattern, StepBank } from "./types";
import { noComments, maskRs, stringsOf, matchClose, splitArgs, tail, scaffoldPatterns, SCAFFOLD_GENERIC } from "./rust-read";

// ══════════════════════════════════════════════════════════════
//  Reading Act III Rust — functions, threads, channels
// ══════════════════════════════════════════════════════════════

interface Fn {
  name: string;
  params: string;
  ret: string | null;
  /** Body with comments removed and string contents blanked. */
  body: string;
  /** Body with comments removed, strings kept. */
  raw: string;
}

const INT = "(?:usize|isize|u8|u16|u32|u64|u128|i8|i16|i32|i64|i128)";

/** Every `fn` with a body, nested ones included. Generics allowed. */
function allFns(code: string): Fn[] {
  const masked = maskRs(code);
  const raw = noComments(code);
  const out: Fn[] = [];
  for (const m of masked.matchAll(/\bfn\s+(\w+)\s*(?:<[^>{(]*>)?\s*\(/g)) {
    const open = m.index! + m[0].length - 1;
    const close = matchClose(masked, open);
    const brace = masked.indexOf("{", close);
    const semi = masked.indexOf(";", close);
    if (brace === -1 || (semi !== -1 && semi < brace)) continue;
    const between = masked.slice(close, brace);
    const ret = between.match(/->\s*([\s\S]+?)\s*(?:\bwhere\b[\s\S]*)?$/)?.[1]?.trim() ?? null;
    const end = matchClose(masked, brace);
    out.push({
      name: m[1],
      params: masked.slice(open + 1, close - 1).trim(),
      ret,
      body: masked.slice(brace + 1, end - 1),
      raw: raw.slice(brace + 1, end - 1),
    });
  }
  return out;
}

const fnNamed = (code: string, name: string): Fn | null => allFns(code).find((f) => f.name === name) ?? null;

const camelOf = (snake: string) => snake.replace(/_(\w)/g, (_, c: string) => c.toUpperCase());
const camelDefined = (code: string, snake: string) => new RegExp(`\\bfn\\s+${camelOf(snake)}\\b`).test(maskRs(code));

/** A call to `name(` — not a method, not a path, not the definition. */
const callRe = (name: string, flags = "") => new RegExp(`(?<![\\w.:])(?<!\\bfn\\s{1,20})${name}\\s*\\(`, flags);
const callsFn = (src: string, name: string) => callRe(name).test(src);

/** The argument lists of every call to `name`. */
function callArgs(src: string, name: string): string[][] {
  const out: string[][] = [];
  for (const m of src.matchAll(callRe(name, "g"))) {
    const open = m.index! + m[0].length - 1;
    out.push(splitArgs(src.slice(open + 1, matchClose(src, open) - 1)));
  }
  return out;
}

/** How each call to `name` is used: `?`-propagated, dropped as a bare statement, or looked at. */
function callUses(src: string, name: string): ("propagates" | "ignored" | "handled")[] {
  const out: ("propagates" | "ignored" | "handled")[] = [];
  for (const m of src.matchAll(callRe(name, "g"))) {
    const open = m.index! + m[0].length - 1;
    const after = src.slice(matchClose(src, open));
    const before = src.slice(0, m.index!).trimEnd();
    if (/^\s*\?/.test(after)) out.push("propagates");
    else if (/^\s*;/.test(after) && (before === "" || /[;{}]$/.test(before) || /\belse$|=>$/.test(before))) out.push("ignored");
    else out.push("handled");
  }
  return out;
}

/** The body with any nested `fn` definitions blanked out. */
function ownBody(body: string): string {
  let out = body;
  for (const m of body.matchAll(/\bfn\s+\w+[^{;]*\{/g)) {
    const open = m.index! + m[0].length - 1;
    const end = matchClose(body, open);
    out = out.slice(0, m.index!) + " ".repeat(end - m.index!) + out.slice(end);
  }
  return out;
}

/** Params as `name: Type` pairs. */
function paramList(params: string): { name: string; type: string }[] {
  return splitArgs(params)
    .map((p) => p.match(/^(?:mut\s+)?(\w+)\s*:\s*([\s\S]+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ name: m[1], type: m[2].trim() }));
}

/** Does the function hand a value back — a `return`, or a last expression with no semicolon? */
function handsBack(f: Fn): boolean {
  const own = ownBody(f.body);
  if (/\breturn\b/.test(own)) return true;
  const t = tail(own);
  return !t.semicolon && t.text !== "";
}

interface Span {
  start: number;
  end: number;
  inner: string;
}

/** Every `spawn(...)` call: where it sits and the closure inside it. */
function spawnCalls(src: string): Span[] {
  const out: Span[] = [];
  for (const m of src.matchAll(/\bspawn\s*\(/g)) {
    const open = m.index! + m[0].length - 1;
    const end = matchClose(src, open);
    out.push({ start: m.index!, end, inner: src.slice(open + 1, end - 1) });
  }
  return out;
}

/** The source with every spawned closure blanked — what the calling thread itself runs. */
function outsideSpawns(src: string): string {
  let out = src;
  for (const s of spawnCalls(src)) out = out.slice(0, s.start) + " ".repeat(s.end - s.start) + out.slice(s.end);
  return out;
}

/** Bodies of every `for … in … { }` loop. */
function forBodies(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/\bfor\b[^{;]*?\bin\b[^{;]*\{/g)) {
    const open = m.index! + m[0].length - 1;
    out.push(src.slice(open + 1, matchClose(src, open) - 1));
  }
  return out;
}

const JOIN = /\.\s*join\s*\(\s*\)/;

/** Spawn and join in the same loop body, or chained in one lazy iterator — one thread at a time. */
function joinsAsItSpawns(src: string): boolean {
  if (forBodies(src).some((b) => /\bspawn\s*\(/.test(b) && JOIN.test(b))) return true;
  return spawnCalls(src).some((s) => {
    const after = src.slice(s.end);
    const stop = after.indexOf(";");
    const seg = stop === -1 ? after : after.slice(0, stop);
    const j = seg.search(JOIN);
    return j !== -1 && !/\bcollect\b/.test(seg.slice(0, j));
  });
}

/** A `.join()` whose `Result` is used as if it were the value. */
function joinUnhandled(src: string): boolean {
  for (const m of src.matchAll(/\.\s*join\s*\(\s*\)/g)) {
    const after = src.slice(m.index! + m[0].length);
    if (/^\s*[.?]/.test(after)) continue;
    const before = src.slice(0, m.index!);
    if (/\b(match|Ok\s*\([^)]*\)\s*=)\s*[\w.]*\s*$/.test(before)) continue;
    return true;
  }
  return false;
}

/** An owned copy made outside the thread — what a `move` closure can safely take. */
const OWNED = /\.\s*(to_string|to_owned|into)\s*\(\s*\)|\bString\s*::\s*from\s*\(|\bformat!\s*\(/;
const makesOwned = (body: string) => OWNED.test(outsideSpawns(body));
const clonesBorrow = (body: string) => /\.\s*clone\s*\(\s*\)/.test(body) && !makesOwned(body);
const spawnsWithoutMove = (src: string) => spawnCalls(src).some((s) => !/^\s*move\b/.test(s.inner));
const printsInSpawn = (src: string) => spawnCalls(src).some((s) => /\be?print(ln)?!\s*\(/.test(s.inner));

/** A spawned closure that calls one of the player's own fns that prints and returns nothing. */
function spawnsPrinter(code: string, src: string): boolean {
  const printers = allFns(code).filter((f) => f.name !== "main" && f.ret === null && /\bprint(ln)?!\s*\(/.test(f.body));
  return spawnCalls(src).some((s) => printers.some((p) => callsFn(s.inner, p.name)));
}

const threadImported = (src: string) => /\bstd\s*::\s*thread\b|\buse\s+std\s*::\s*\{[^}]*\bthread\b/.test(src);
const durationImported = (src: string) => /\btime\s*::\s*(Duration\b|\{[^}]*\bDuration\b)/.test(src);
const mpscImported = (src: string) => /\bsync\s*::\s*(mpsc\b|\{[^}]*\bmpsc\b)/.test(src);
const receiverImported = (src: string) => /\bmpsc\s*::\s*(Receiver\b|\{[^}]*\bReceiver\b)/.test(src);

const missesThread = (src: string) => /(?<!::\s*)\bthread\s*::/.test(src) && !threadImported(src);
const missesDuration = (src: string) => /(?<!::\s*)\bDuration\s*::/.test(src) && !durationImported(src);
const missesMpsc = (src: string) => /(?<!::\s*)\bmpsc\s*::/.test(src) && !mpscImported(src);
const missesReceiver = (src: string) => /(?<!::\s*)\bReceiver\s*</.test(src) && !receiverImported(src);

/** Other languages' concurrency, written into a Rust file. */
const goStatement = (src: string) => /^\s*go\s+[\w(]/m.test(src);
const asyncRust = (src: string) => /\basync\s+(fn|move|\{|\|)|\.\s*await\b|\btokio\b|\basync_std\b/.test(src);
const pyOrJsConcurrency = (src: string) =>
  /\bthreading\s*\.|\basyncio\b|\bnew\s+Thread\b|\bPromise\s*\.\s*(all|race|any)\b|\bnew\s+Promise\b|\bsetTimeout\s*\(/.test(src);
const goChannels = (src: string) => /\bchan\s+\w|\bmake\s*\(\s*chan\b|<-|\bWaitGroup\b/.test(src);
const goMultiWait = (src: string) => /\bselect\s*!?\s*\{|\bcrossbeam\b|\btime\s*\.\s*After\b|^\s*default\s*:/m.test(src);
const usesRc = (src: string) => /\bRc\s*(::|<)/.test(src);

const ASYNC_LINE =
  "rust's `async` needs a runtime the terminal doesn't ship. this is plain threads: `std::thread`, `thread::spawn`.";
const FOREIGN_LINE = "that's another language's concurrency. in rust a new thread is `thread::spawn(move || ...)`, from `use std::thread;`.";
const RC_LINE =
  "`Rc` can't cross threads — its count isn't safe to change from two at once, so rust refuses. `Arc` is the thread-safe one. here you don't need either: move an owned value in.";
const THREAD_IMPORT = "`thread` lives in the standard library — `use std::thread;` at the top.";
const DURATION_IMPORT = "`Duration` lives in `std::time` — `use std::time::Duration;` at the top.";
const MPSC_IMPORT = "channels live in `std::sync` — `use std::sync::mpsc;` at the top.";
const RECEIVER_IMPORT = "`Receiver` lives in `mpsc` — `use std::sync::mpsc::{self, Receiver};`, or write `mpsc::Receiver<String>`.";

/** One pattern per issue, then the completion when the check finds nothing wrong. */
function checked<K extends string>(check: (code: string) => K | null, messages: Record<K, string>, done: string): CodePattern[] {
  return [
    ...(Object.keys(messages) as K[]).map((k) => ({ match: (code: string) => check(code) === k, response: messages[k] })),
    { match: (code: string) => check(code) === null, response: done },
  ];
}

const has = (code: string, s: string) => maskRs(code).includes(s);

// ══════════════════════════════════════════════════════════════
//  Chapter 07 — DEEP SCAN
// ══════════════════════════════════════════════════════════════

const CH07_SCAFFOLD_DONE =
  "archive terminal's up. there's a whole directory tree behind it — logs, servers, and something labelled vault.\n\nnow count what's in it.\n\n||COMPLETE||";

const ch07Scaffold: StepBank = {
  intro:
    "the archive terminal locks the moment the server room's night cycle starts. wake it before then: print `Hello World`.",

  conceptFAQ: [
    { keywords: ["print", "output"], response: "`println!(\"Hello World\");` inside `fn main` — the same as every terminal so far." },
    {
      keywords: ["import", "use", "package", "setup", "skeleton", "scaffold", "hashmap"],
      response: "nothing to `use` for the greeting. `std::collections::HashMap` joins next step, when the archive shows up.",
    },
    { keywords: ["archive", "tree", "directory", "folder", "thesis"], response: "the archive comes next step. wake the terminal first." },
    { keywords: ["main", "entry", "start", "fn"], response: "`fn main() { }` is still where it starts. your own functions will sit beside it." },
  ],

  codePatterns: scaffoldPatterns(CH07_SCAFFOLD_DONE),
  correctResponse: CH07_SCAFFOLD_DONE,
  genericWrong: SCAFFOLD_GENERIC,
  rushDialogue: [],
  stuckResponses: [
    "same as every time:\n```\nfn main() {\n    println!(\"Hello World\");\n}\n```",
    "`fn main`, braces, one `println!` with the text in double quotes. transmit.",
  ],
  deflections: ["wake the terminal first. the night cycle won't wait."],
};

// ── shared by scan and recover: the recursive walker and its counter ──

type WalkIssue =
  | "closure" | "noRecursion" | "noCall" | "returnsCount" | "noCounter" | "sharedRef" | "byValue"
  | "noDeref" | "noCount" | "doubleBorrow" | "slash";

/** The recursive walker `entry` sets off, and the name of the `&mut` counter it carries. */
function walkOf(code: string, entry: Fn): WalkIssue | { walker: Fn; counter: string } {
  const fns = allFns(code).filter((f) => f.name !== "main" && f.name !== "drop");
  const recursive = fns.filter((f) => callsFn(f.body, f.name));
  if (recursive.length === 0) {
    const src = maskRs(code);
    const closure = [...src.matchAll(/\blet\s+(?:mut\s+)?(\w+)\s*(?::[^=;]+)?=\s*(?:move\s*)?\|/g)].some((m) =>
      callsFn(src.slice(m.index! + m[0].length), m[1]),
    );
    return closure ? "closure" : "noRecursion";
  }
  const walker = recursive.find((f) => f === entry) ?? recursive.find((f) => callsFn(entry.body, f.name));
  if (!walker) return "noCall";

  let counter: string | null = null;
  for (const p of paramList(walker.params)) {
    const m = p.type.match(new RegExp(`^(&\\s*mut\\s+|&\\s*)?${INT}$`));
    if (!m) continue;
    if (!m[1]) return "byValue";
    if (!/mut/.test(m[1])) return "sharedRef";
    counter = p.name;
  }
  if (!counter) return walker.ret && new RegExp(`^${INT}$`).test(walker.ret) ? "returnsCount" : "noCounter";

  const own = ownBody(walker.body);
  for (const m of own.matchAll(new RegExp(`(?<![\\w.])${counter}\\s*(\\+=|=\\s*${counter}\\s*\\+)`, "g"))) {
    if (!/\*\s*$/.test(own.slice(0, m.index!))) return "noDeref";
  }
  if (!new RegExp(`\\*\\s*${counter}\\s*(\\+=|=)`).test(own)) return "noCount";
  if (callArgs(own, walker.name).some((args) => args.some((a) => new RegExp(`^&\\s*mut\\s+${counter}$`).test(a)))) return "doubleBorrow";

  const loopVar = own.match(/\bfor\s+(?:&\s*)?(\w+)\s+in\b/)?.[1];
  const strips = /strip_suffix|trim_end_matches|trim_matches|\breplace\s*\(|len\s*\(\s*\)\s*-\s*1/.test(own);
  if (loopVar && !strips && callArgs(own, walker.name).some((args) => args.some((a) => a.replace(/[&*\s]/g, "") === loopVar))) {
    return "slash";
  }
  return { walker, counter };
}

const WALK_MESSAGES: Record<WalkIssue, string> = {
  closure:
    "a rust closure can't call itself — inside its own body it has no name. make the walker a plain `fn scan(archive: &HashMap<&str, Vec<&str>>, dir: &str, count: &mut usize)` and pass the counter along.",
  noRecursion:
    "the scan never goes deeper. when an entry ends in `/`, the walker calls itself on it: `scan(archive, sub, count)`. it walks one level and hands the next level to itself.",
  noCall: "you built the walker but never set it off. call it on the root, lending the counter: `scan(archive, root, &mut count);`.",
  returnsCount:
    "adding up what each call returns works — but this step is about one counter lent to every call. give the walker `count: &mut usize` and do `*count += 1` for each file.",
  noCounter: "the walker needs the counter with it: one more parameter, `count: &mut usize`.",
  sharedRef: "`&usize` is a look-only borrow — you can read the count, not change it. `&mut usize` lets every call add to the same one.",
  byValue:
    "`count: usize` hands each call its own copy, and every addition vanishes when that call ends. lend the one counter instead: `count: &mut usize`.",
  noDeref: "`count` is a borrow, not the number itself. reach through it with a star: `*count += 1`.",
  noCount: "nothing adds to the counter. for every entry that isn't a directory: `*count += 1`.",
  doubleBorrow:
    "`count` is already a `&mut usize` — pass it straight on: `scan(archive, sub, count)`. `&mut count` would borrow the borrow.",
  slash:
    "you're walking into the name with its slash still on — `\"logs/\"` isn't a key in the archive, `\"logs\"` is. `entry.strip_suffix('/')` hands back the name without it.",
};

type GuardIssue = "noDrop" | "printsAtEnd" | "dropSig" | "dropSilent" | "guardOutside" | "unbound" | "underscore";

/** The Drop guard: a struct whose `drop` prints, made and named inside the walker. */
function guardOf(code: string, walker: Fn): GuardIssue | { at: number } {
  const src = maskRs(code);
  const impl = src.match(/\bimpl\s+Drop\s+for\s+(\w+)/);
  if (!impl) return stringsOf(code).some((s) => /scanned/.test(s)) ? "printsAtEnd" : "noDrop";
  const guard = impl[1];
  const drop = allFns(code).find((f) => f.name === "drop");
  if (!drop || !/^&\s*mut\s+self$/.test(drop.params)) return "dropSig";
  if (!/\bprint(ln)?!\s*\(/.test(drop.body) || !stringsOf(drop.raw).some((s) => /scanned/.test(s))) return "dropSilent";
  const own = ownBody(walker.body);
  if (!new RegExp(`\\b${guard}\\s*(?:::\\s*\\w+\\s*)?[({]`).test(own)) return "guardOutside";
  const bound = own.match(new RegExp(`\\blet\\s+(?:mut\\s+)?(\\w+)\\s*(?::\\s*\\w+\\s*)?=\\s*${guard}\\b`));
  if (!bound) return "unbound";
  if (bound[1] === "_") return "underscore";
  return { at: bound.index! };
}

const GUARD_MESSAGES: Record<Exclude<GuardIssue, "printsAtEnd">, string> = {
  noDrop:
    "each directory logs `scanned: <dir>` as it finishes. rust's way is a value whose `Drop` prints: `struct Log(String);` and `impl Drop for Log { fn drop(&mut self) { println!(\"scanned: {}\", self.0); } }`.",
  dropSig: "`drop` takes `&mut self`: `fn drop(&mut self) { ... }` inside `impl Drop for Log`.",
  dropSilent: "the guard's there but it doesn't log. in `drop`: `println!(\"scanned: {}\", self.0);`.",
  guardOutside: "the guard has to live in the walker — one per directory, one per call. first line of the walk: `let _log = Log(dir.to_string());`.",
  unbound:
    "a guard you don't bind to a name is dropped at the end of that same line, so it logs on the way in. `let _log = Log(dir.to_string());` keeps it alive until the walk ends.",
  underscore:
    "`let _ =` drops the value on the spot, so the line prints on the way in — root first. give it a name, `let _log = ...`, and it lives until the walk ends.",
};

const FOREIGN_SCAN = {
  deferKw:
    "rust has no keyword that runs a line on the way out. the way out is a value going away: a `Drop` guard. `let _log = Log(dir.to_string());` first thing in the walk.",
  pyTry: "there's no `try`/`finally` in rust. a value's `Drop` runs on every way out of a function — that's your log line.",
  fnKw: "rust declares functions with `fn`: `fn scan(archive: &HashMap<&str, Vec<&str>>, dir: &str, count: &mut usize) { }`.",
} as const;

function foreignScan(src: string): keyof typeof FOREIGN_SCAN | null {
  if (/\bdefer\b/.test(src)) return "deferKw";
  if (/\b(finally|except|nonlocal)\b|\btry\s*[:{]/.test(src)) return "pyTry";
  if (/\b(func|def|function)\s+\w+\s*\(/.test(src)) return "fnKw";
  return null;
}

/** `&mut name` lent from a variable that was never declared `mut`. */
function lendsImmutable(body: string): boolean {
  return [...body.matchAll(/&\s*mut\s+(\w+)/g)].some(
    (m) => !new RegExp(`\\blet\\s+mut\\s+${m[1]}\\b`).test(body) && new RegExp(`\\blet\\s+${m[1]}\\b`).test(body),
  );
}

// ── chapter-07:scan ──

type ScanIssue =
  | keyof typeof FOREIGN_SCAN | "camel" | "noDef" | "noReturnType"
  | WalkIssue | GuardIssue | "notMut" | "noReturn";

function scanCheck(code: string): ScanIssue | null {
  const src = maskRs(code);
  const foreign = foreignScan(src);
  if (foreign) return foreign;
  const entry = fnNamed(code, "scan_archive");
  if (!entry) return camelDefined(code, "scan_archive") ? "camel" : "noDef";
  if (!entry.ret) return "noReturnType";
  const walk = walkOf(code, entry);
  if (typeof walk === "string") return walk;
  const guard = guardOf(code, walk.walker);
  if (typeof guard === "string") return guard;
  if (walk.walker !== entry) {
    const own = ownBody(entry.body);
    if (lendsImmutable(own)) return "notMut";
    if (!handsBack(entry)) return "noReturn";
  }
  if (!has(code, "impl Drop") || !has(code, "&mut")) return "noDrop";
  return null;
}

const SCAN_MESSAGES: Record<ScanIssue, string> = {
  ...FOREIGN_SCAN,
  camel: "rust names functions in snake_case — the terminal calls `scan_archive`.",
  noDef:
    "i need `fn scan_archive(archive: &HashMap<&str, Vec<&str>>, root: &str) -> usize` — the terminal calls it with the archive and where to start.",
  noReturnType: "say what `scan_archive` hands back: `-> usize` after the brackets.",
  ...WALK_MESSAGES,
  ...GUARD_MESSAGES,
  printsAtEnd:
    "a print at the bottom of the walk only runs if the walk gets that far — a `return`, a `?` or a panic skips it. put the line in a `Drop` guard: `impl Drop for Log`, and `let _log = Log(dir.to_string());` first thing in `scan`.",
  notMut: "you can't lend `&mut` of a value that can't change. `let mut count = 0;`.",
  noReturn: "`scan_archive` never hands the count back. end it with `count` — no semicolon.",
};

const CH07_SCAN_DONE =
  "nine files. gamma holds three of them — and two have thesis in the name. that's my work in there.\n\nbut the vault entry is wrong. something's waiting in it.\n\n||COMPLETE||";

const scanOutputs: OutputPattern[] = [
  {
    match: (out) => /^scanned: \w+\/$/m.test(out),
    response: "the log has slashes in it — `scanned: logs/`. walk into the name without the slash: `entry.strip_suffix('/')`.",
  },
  {
    match: (out) => out.trim().startsWith("scanned: root"),
    response:
      "root logged first — the line is printing on the way in. the guard has to live until the walk ends: `let _log = Log(...)`, not `let _ =`, and no print at the top.",
  },
  {
    match: (out) => /total files:/.test(out) && !/scanned:/.test(out),
    response: "the count's there but no directory logged. the `Drop` guard has to print: `println!(\"scanned: {}\", self.0);`.",
  },
  { match: (out) => /^total files: 14$/m.test(out), response: "14 — you're counting the directories too. an entry ending in `/` gets walked, not counted." },
  {
    match: (out) => /^total files: 1$/m.test(out) && !/^total files: 9$/m.test(out),
    response: "1 file — the scan never went past root. call the walker again for every entry that ends in `/`.",
  },
  {
    match: (out) => /^total files: 0$/m.test(out),
    response: "0 — the additions never reached the counter you return. lend the one counter, `&mut count`, and add through it with `*count += 1`.",
  },
];

const ch07Scan: StepBank = {
  intro:
    "my thesis is on one of these servers. i need every file in the archive counted, however deep the folders go. write `scan_archive(archive, root) -> usize`. the walk is a plain `fn scan(archive, dir, count: &mut usize)` that calls itself for each entry ending in `/` and does `*count += 1` for the rest. each directory logs `scanned: <dir>` as it finishes — a `Drop` guard, `let _log = Log(dir.to_string());` first thing in `scan`.",

  conceptFAQ: [
    {
      keywords: ["recursion", "recursive", "call itself", "calls itself", "deeper", "nested folder"],
      response: "a function can call itself by name. `scan(archive, \"servers\", count)` finds `alpha/` and calls `scan(archive, \"alpha\", count)`, which finishes and hands control back. each call has its own `dir`.",
    },
    {
      keywords: ["closure", "inner function", "nested", "function inside"],
      response: "a rust closure can't call itself, so the walker is a plain `fn`. it can't see `scan_archive`'s variables either — so the counter travels with it as a parameter.",
    },
    {
      keywords: ["&mut", "mutable", "borrow", "counter", "lend", "usize"],
      response: "`count: &mut usize` lends one counter to every call. each call adds through it and passes it on as plain `count`. `scan_archive` owns it — `let mut count = 0;` — and lends it with `&mut count`.",
    },
    {
      keywords: ["star", "*count", "deref", "asterisk"],
      response: "`count` is a borrow — where the number lives, not the number. `*count` reaches through to it: `*count += 1`.",
    },
    {
      keywords: ["drop", "guard", "defer", "log", "scanned", "struct"],
      response: "`Drop` is code that runs when a value goes away. `let _log = Log(dir.to_string());` lives until `scan` ends — however it ends — then its `drop` prints. `struct Log(String);` and `impl Drop for Log { fn drop(&mut self) { ... } }`.",
    },
    {
      keywords: ["let _", "underscore", "_log", "why the name"],
      response: "`let _log` keeps the guard alive to the end of the function. `let _ =` throws it away on the spot — it would print straight away.",
    },
    {
      keywords: ["order", "root last", "why last", "backwards"],
      response: "root's guard is made first and dropped last — everything inside it has to finish before root's call does. so root's line is the last one.",
    },
    {
      keywords: ["slash", "strip_suffix", "directory", "file or", "folder"],
      response: "`entry.strip_suffix('/')` gives back `Some(name)` without the slash for a directory, `None` for a file. `if let Some(sub) = entry.strip_suffix('/') { ... } else { ... }`.",
    },
    {
      keywords: ["hashmap", "archive[", "index", "key", "look up"],
      response: "`archive[dir]` looks up a directory's entries. `for entry in &archive[dir]` walks them without taking them out of the map.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "a `Log` struct with `impl Drop`. then `fn scan(archive, dir, count: &mut usize)`: guard first, loop the entries, recurse or `*count += 1`. `scan_archive` makes `let mut count = 0`, calls `scan(archive, root, &mut count)`, ends with `count`.",
    },
  ],

  outputPatterns: scanOutputs,
  codePatterns: checked(scanCheck, SCAN_MESSAGES, CH07_SCAN_DONE),
  correctResponse: CH07_SCAN_DONE,

  genericWrong: [
    "not matching. every directory logs as it finishes, then the total — 9 for the archive, 2 for the test tree.",
    "check the order: the deepest directories log first, root last. that's the guard's `drop` doing its job.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nuse std::collections::HashMap;\n\nstruct Log(String);\n\nimpl Drop for Log {\n    fn drop(&mut self) {\n        println!(\"scanned: {}\", self.0);\n    }\n}\n\nfn scan(archive: &HashMap<&str, Vec<&str>>, dir: &str, count: &mut usize) {\n    let _log = Log(dir.to_string());\n    for entry in &archive[dir] {\n        if let Some(sub) = entry.strip_suffix('/') {\n            scan(archive, sub, count);\n        } else {\n            *count += 1;\n        }\n    }\n}\n\nfn scan_archive(archive: &HashMap<&str, Vec<&str>>, root: &str) -> usize {\n    let mut count = 0;\n    scan(archive, root, &mut count);\n    count\n}\n```",
    "one counter, lent `&mut` to a walker that calls itself on directories — and a guard per call whose `drop` logs.",
  ],

  deflections: ["focus. count the archive.", "not now — my thesis is in there somewhere."],
};

// ── chapter-07:recover ──

type RecoverIssue =
  | keyof typeof FOREIGN_SCAN | "panic" | "noExceptions" | "camel" | "noDef" | "tuple"
  | WalkIssue | "walkerIsEntry" | "questionNoResult" | "noResult" | "unwrapNone" | "noErr" | "message" | "noOk"
  | GuardIssue | "guardLate" | "propagates" | "ignored" | "noRecord" | "noName" | "noErrMatch"
  | "rootQuestion" | "rootIgnored" | "notMut" | "noReturn";

function recoverCheck(code: string): RecoverIssue | null {
  const src = maskRs(code);
  if (/\bpanic!\s*\(|\bcatch_unwind\b/.test(src)) return "panic";
  if (/\b(raise|throw|catch|except)\b|\brecover\s*\(\s*\)/.test(src)) return "noExceptions";
  const foreign = foreignScan(src);
  if (foreign) return foreign;
  const entry = fnNamed(code, "safe_scan");
  if (!entry) return camelDefined(code, "safe_scan") ? "camel" : "noDef";
  if (!entry.ret || !/^\(/.test(entry.ret)) return "tuple";
  const walk = walkOf(code, entry);
  if (typeof walk === "string") return walk;
  const { walker } = walk;
  if (walker === entry) return "walkerIsEntry";
  const own = ownBody(walker.body);
  if (!walker.ret || !/\bResult\s*</.test(walker.ret)) return /\?/.test(own) ? "questionNoResult" : "noResult";
  if (/\.\s*(unwrap|expect)\s*\(/.test(own)) return "unwrapNone";
  if (!/\bok_or|\bErr\s*\(/.test(own)) return "noErr";
  if (!stringsOf(code).some((s) => s === "corrupted directory")) return "message";
  if (!/\bOk\s*\(/.test(own)) return "noOk";
  const guard = guardOf(code, walker);
  if (typeof guard === "string") return guard;
  const firstBail = own.search(/\?|\breturn\s+Err\b/);
  if (firstBail !== -1 && guard.at > firstBail) return "guardLate";
  const uses = callUses(own, walker.name);
  if (uses.includes("propagates")) return "propagates";
  if (uses.includes("ignored")) return "ignored";
  if (!/\.\s*push\s*\(/.test(own)) return "noRecord";
  if (/\.\s*push\s*\(\s*\w+\s*(\.\s*(to_string|clone|into)\s*\(\s*\))?\s*\)/.test(own)) return "noName";
  if (!has(code, "Err(") || !has(code, "Result<")) return "noErrMatch";
  const entryOwn = ownBody(entry.body);
  if (/\?/.test(entryOwn)) return "rootQuestion";
  if (callUses(entryOwn, walker.name).includes("ignored")) return "rootIgnored";
  if (lendsImmutable(entryOwn)) return "notMut";
  if (!handsBack(entry)) return "noReturn";
  return null;
}

const RECOVER_MESSAGES: Record<RecoverIssue, string> = {
  ...FOREIGN_SCAN,
  panic:
    "a panic in rust means a bug, and it takes the whole scan down with it. a corrupted directory is just bad data — hand it back as an error: `.ok_or(\"corrupted directory\")?`.",
  noExceptions:
    "rust has no exceptions to throw and catch. errors are values: the walk returns `Result<(), String>`, and the caller looks at it with `if let Err(e) = ...`.",
  camel: "snake_case — the terminal calls `safe_scan`.",
  noDef:
    "i need `fn safe_scan(archive: &HashMap<&str, Option<Vec<&str>>>, root: &str) -> (usize, Vec<String>)` — the count and the errors, both back.",
  tuple: "`safe_scan` hands back two things: `-> (usize, Vec<String>)`, ending with `(count, errors)`.",
  ...WALK_MESSAGES,
  noCall: "the walker never starts. in `safe_scan`: `if let Err(e) = walk(archive, root, &mut count, &mut errors) { ... }`, then `(count, errors)`.",
  walkerIsEntry:
    "`safe_scan` hands back the tuple, so the walking needs its own function that returns a `Result`: `fn walk(archive, dir, count: &mut usize, errors: &mut Vec<String>) -> Result<(), String>`.",
  questionNoResult: "`?` only works in a function that returns a `Result`. give the walk `-> Result<(), String>` and end it with `Ok(())`.",
  noResult: "make the walk return `Result<(), String>` — `Ok(())` when the directory's fine, an `Err` when it's corrupted.",
  unwrapNone:
    "`unwrap` on the vault's `None` is a panic — the whole scan dies there. `.ok_or(\"corrupted directory\")?` turns it into an error you can hand back.",
  noErr: "a `None` directory has to come back as an error: `let entries = archive[dir].as_ref().ok_or(\"corrupted directory\")?;`.",
  message: "the error message has to be exactly `corrupted directory`.",
  noOk: "the walk has to say when it went fine, too: `Ok(())` as its last line.",
  ...GUARD_MESSAGES,
  printsAtEnd:
    "vault never gets its log line — the `?` leaves before the print at the bottom. a `Drop` guard runs on every way out: `struct Log(String);`, `impl Drop for Log`, and `let _log = Log(dir.to_string());` as the walk's first line.",
  guardLate: "the guard is made after the `?` — when vault bails, there's no guard yet to print. make it the walk's very first line.",
  propagates:
    "the `?` on the inner call passes vault's error straight up — root stops walking and the rest never gets scanned. catch it right there: `if let Err(e) = walk(archive, sub, count, errors) { ... }`.",
  ignored:
    "the inner call hands back a `Result` and nothing looks at it — the error just vanishes. `if let Err(e) = walk(...) { errors.push(format!(\"{}: {}\", sub, e)); }`.",
  noRecord: "the error's caught but not recorded. `errors.push(format!(\"{}: {}\", sub, e));`.",
  noName: "the error needs the directory's name in front: `errors.push(format!(\"{}: {}\", sub, e))`.",
  noErrMatch: "catch the error by name where you call into a directory: `if let Err(e) = walk(...)`. the terminal checks for the `Result` and the `Err`.",
  rootQuestion:
    "`safe_scan` returns a tuple, not a `Result`, so `?` can't be used in it. check root's walk the same way as the others: `if let Err(e) = walk(archive, root, &mut count, &mut errors)`.",
  rootIgnored: "root's walk hands back a `Result` too. check it: `if let Err(e) = walk(...) { errors.push(format!(\"{}: {}\", root, e)); }`.",
  notMut: "you can't lend `&mut` of a value that can't change. `let mut count = 0;` and `let mut errors = Vec::new();`.",
  noReturn: "end `safe_scan` with `(count, errors)` — no semicolon.",
};

const CH07_RECOVER_DONE =
  "the vault went off in our hands and the scan kept walking. nine files, one error logged, no alarm.\n\nwhoever set that trap wanted us to stop at the first bad door.\n\n||COMPLETE||";

const ch07Recover: StepBank = {
  intro:
    "ghost booby-trapped part of the archive. if the scan dies on it, the alarm trips. write `safe_scan(archive, root) -> (usize, Vec<String>)`. a directory that's `None` is corrupted: make the walk return `Result<(), String>` and bail with `.ok_or(\"corrupted directory\")?`. where you call into a subdirectory, `if let Err(e) = ...` pushes `<dir>: <e>` onto `errors` and the scan carries on. keep the `Drop` guard.",

  conceptFAQ: [
    {
      keywords: ["panic", "why not panic", "crash", "throw", "exception"],
      response: "in rust a panic means a bug — something that should never happen. a corrupted directory is just bad data, so it's an error value: `Err(...)`, returned like any other answer.",
    },
    {
      keywords: ["result", "ok(", "err(", "ok and err"],
      response: "`Result<(), String>` is either `Ok(())` — it went fine, nothing to hand back — or `Err(message)`. the caller has to look at which one it got.",
    },
    {
      keywords: ["?", "question mark", "ok_or", "bail"],
      response: "on `Ok(v)` the `?` hands you `v`. on `Err(e)` it returns that error from your function on the spot. `archive[dir].as_ref().ok_or(\"corrupted directory\")?` reads the entries or bails.",
    },
    {
      keywords: ["catch", "where", "boundary", "keep going", "keep scanning", "if let"],
      response: "where you call into a subdirectory: `if let Err(e) = walk(archive, sub, count, errors) { errors.push(format!(\"{}: {}\", sub, e)); }` — and once more in `safe_scan`, for root.",
    },
    {
      keywords: ["scanned: vault", "still print", "guard", "drop"],
      response: "yes, vault still logs. `?` leaves the function early, and leaving drops `_log`. the guard runs on every way out — as long as it was made before the `?`.",
    },
    {
      keywords: ["none", "option", "some", "corrupted", "as_ref"],
      response: "each directory is an `Option`: `Some(entries)` or `None`. `.as_ref()` lets you look inside without taking it out of the map, and `.ok_or(...)` turns `None` into an `Err`.",
    },
    {
      keywords: ["errors", "push", "vec", "&mut vec"],
      response: "the errors list travels like the counter: `errors: &mut Vec<String>`, and `errors.push(...)` adds to the one list every call shares.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`fn walk(archive, dir, count, errors) -> Result<(), String>`: guard first, then `let entries = archive[dir].as_ref().ok_or(\"corrupted directory\")?;`, the loop with `if let Err(e)` on each subdirectory, `Ok(())` at the end.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /^scanned: servers$/m.test(out) && !/^scanned: vault$/m.test(out),
      response: "vault never logged. its guard has to exist before the `?` bails — make `let _log = Log(...)` the walk's first line.",
    },
    {
      match: (out) => /^ERROR: (root|a): /m.test(out),
      response: "the error climbed all the way to the top — a `?` on the inner call passed it up. catch it where you call into each directory, so one trap only costs one directory.",
    },
    { match: (out) => /^ERROR: corrupted directory$/m.test(out), response: "the error needs the directory's name in front: `format!(\"{}: {}\", sub, e)`." },
    {
      match: (out) => /^ERROR: vault: (?!corrupted directory$)/m.test(out),
      response: "the message has to be exactly `corrupted directory` — `.ok_or(\"corrupted directory\")`.",
    },
    {
      match: (out) => /total files:/.test(out) && !/^ERROR:/m.test(out),
      response: "the scan survived but `errors` came back empty. where you catch it: `errors.push(format!(\"{}: {}\", sub, e));`.",
    },
  ],

  codePatterns: checked(recoverCheck, RECOVER_MESSAGES, CH07_RECOVER_DONE),
  correctResponse: CH07_RECOVER_DONE,

  genericWrong: [
    "not matching. every directory still logs — vault too — then `total files: 9` and one `ERROR: vault: corrupted directory`.",
    "check that the scan keeps going after the trap, and that the error names its directory.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nfn walk(archive: &HashMap<&str, Option<Vec<&str>>>, dir: &str, count: &mut usize, errors: &mut Vec<String>) -> Result<(), String> {\n    let _log = Log(dir.to_string());\n    let entries = archive[dir].as_ref().ok_or(\"corrupted directory\")?;\n    for entry in entries {\n        if let Some(sub) = entry.strip_suffix('/') {\n            if let Err(e) = walk(archive, sub, count, errors) {\n                errors.push(format!(\"{}: {}\", sub, e));\n            }\n        } else {\n            *count += 1;\n        }\n    }\n    Ok(())\n}\n\nfn safe_scan(archive: &HashMap<&str, Option<Vec<&str>>>, root: &str) -> (usize, Vec<String>) {\n    let mut count = 0;\n    let mut errors = Vec::new();\n    if let Err(e) = walk(archive, root, &mut count, &mut errors) {\n        errors.push(format!(\"{}: {}\", root, e));\n    }\n    (count, errors)\n}\n```",
    "bail with `?`, catch with `if let Err(e)`, log with the guard. every call, every directory.",
  ],

  deflections: ["focus. the trap first.", "not now — one bad directory and the alarm goes."],
};

// ══════════════════════════════════════════════════════════════
//  Chapter 08 — CIRCUIT CUT
// ══════════════════════════════════════════════════════════════

const CH08_SCAFFOLD_DONE =
  "breaker console's live. four circuits feed the alarm grid — north, south, east, west.\n\nnow throw one.\n\n||COMPLETE||";

const ch08Scaffold: StepBank = {
  intro: "the alarm grid runs on four circuits and this console holds the breakers. bring it online: print `Hello World`.",

  conceptFAQ: [
    { keywords: ["print", "output"], response: "`println!(\"Hello World\");` inside `fn main` — one line wakes it." },
    {
      keywords: ["import", "use", "thread", "package", "setup", "scaffold"],
      response: "not yet. `use std::thread;` joins the top of the file next step, when you first start one. bring a thing in when you need it.",
    },
    {
      keywords: ["parallel", "concurrent", "same time", "breaker", "circuit"],
      response: "the breakers come next. right now just wake the console.",
    },
    { keywords: ["main", "entry", "start", "fn"], response: "`fn main() { }` — same as always." },
  ],

  codePatterns: scaffoldPatterns(CH08_SCAFFOLD_DONE),
  correctResponse: CH08_SCAFFOLD_DONE,
  genericWrong: SCAFFOLD_GENERIC,
  rushDialogue: [],
  stuckResponses: [
    "```\nfn main() {\n    println!(\"Hello World\");\n}\n```",
    "`fn main`, braces, one `println!` with the text in double quotes.",
  ],
  deflections: ["console first. then the grid."],
};

// ── chapter-08:goroutine ──

type CutIssue =
  | "goKw" | "async" | "foreign" | "noCut" | "cutSilent" | "camel" | "noCutAsync" | "ownedParam" | "noSpawn" | "bareSpawn"
  | "noMove" | "cloneStr" | "borrowed" | "joins" | "threadImport";

function cutCheck(code: string): CutIssue | null {
  const src = maskRs(code);
  if (goStatement(src)) return "goKw";
  if (asyncRust(src)) return "async";
  if (pyOrJsConcurrency(src)) return "foreign";
  const cut = fnNamed(code, "cut");
  if (!cut) return "noCut";
  if (!/\bprint(ln)?!\s*\(/.test(cut.body)) return "cutSilent";
  const launcher = fnNamed(code, "cut_async");
  if (!launcher) return camelDefined(code, "cut_async") ? "camel" : "noCutAsync";
  if (paramList(launcher.params).some((p) => /^String$/.test(p.type))) return "ownedParam";
  if (!/\bspawn\s*\(/.test(launcher.body)) return "noSpawn";
  if (!/\bthread\s*::\s*spawn\s*\(/.test(launcher.body)) return "bareSpawn";
  if (spawnsWithoutMove(launcher.body)) return "noMove";
  if (clonesBorrow(launcher.body)) return "cloneStr";
  if (!makesOwned(launcher.body)) return "borrowed";
  if (JOIN.test(launcher.body)) return "joins";
  if (missesThread(src)) return "threadImport";
  if (!has(code, "thread::spawn") || !has(code, "move")) return "noSpawn";
  return null;
}

const CUT_MESSAGES: Record<CutIssue, string> = {
  goKw: "rust has no keyword that starts work in the background. you start a thread: `thread::spawn(move || cut(&name));`.",
  async: ASYNC_LINE,
  foreign: FOREIGN_LINE,
  noCut: "first the breaker itself: `fn cut(name: &str)` that prints `<name> circuit: DOWN`.",
  cutSilent: "`cut` has to report: `println!(\"{} circuit: DOWN\", name);`.",
  camel: "snake_case — the terminal calls `cut_async`.",
  noCutAsync: "now the launcher: `fn cut_async(name: &str)` that starts `cut` on a new thread and comes straight back.",
  ownedParam:
    "the terminal passes a borrowed `&str` — `cut_async(\"South\")`. take `name: &str`, and make the owned copy inside: `let name = name.to_string();`.",
  noSpawn:
    "that runs `cut` right here, on the main thread — the caller waits for it. hand it to a new thread: `thread::spawn(move || cut(&name));`.",
  bareSpawn: "spell it out as `thread::spawn` — `use std::thread;` at the top — so it's plain where the new thread starts.",
  noMove:
    "the thread might still be running after `cut_async` returns, but the closure only borrows `name`. `move` hands the thread its own copy: `thread::spawn(move || cut(&name))`.",
  cloneStr:
    "cloning a `&str` copies the borrow, not the text — the thread still can't keep it. `name.to_string()` makes an owned `String` it can take.",
  borrowed:
    "`move` moves the borrow, and a borrow can't outlive `cut_async`. make an owned copy first — `let name = name.to_string();` — then `move` that in.",
  joins: "`.join()` waits for the thread — then `cut_async` isn't coming straight back. start it and let it run.",
  threadImport: THREAD_IMPORT,
};

const CH08_GOROUTINE_DONE =
  "south dropped on its own thread while the program kept moving. it didn't stand there watching — that's the only way i get four breakers down.\n\n||COMPLETE||";

const ch08Goroutine: StepBank = {
  intro:
    "i can only throw one breaker at a time by hand. the program has to throw them for me, without stopping to watch each one. write `fn cut(name: &str)` that prints `<name> circuit: DOWN`, and `fn cut_async(name: &str)` that runs it on a new thread — `thread::spawn` — and returns at once. the thread may outlive the borrowed `name`, so give it its own: `let name = name.to_string();` and a `move` closure.",

  conceptFAQ: [
    {
      keywords: ["thread::spawn", "spawn", "new thread", "thread", "background"],
      response: "`thread::spawn` runs a closure on a new thread, alongside the rest of your program, and hands back a handle at once. the caller doesn't wait. `use std::thread;` at the top.",
    },
    {
      keywords: ["move", "borrow", "won't compile", "outlive", "lifetime", "static"],
      response: "the thread could still be running after `cut_async` returns — and `name` is only borrowed until then. `let name = name.to_string();` makes an owned copy, and `move` hands it to the thread.",
    },
    {
      keywords: ["closure", "||", "pipes"],
      response: "`|| cut(&name)` is a closure — a little function with no name, written in place. `move ||` makes it take ownership of what it uses.",
    },
    {
      keywords: ["to_string", "string", "&str", "owned", "clone"],
      response: "`&str` borrows text that lives somewhere else. `String` owns its text. `name.to_string()` turns one into the other — `.clone()` on a `&str` only copies the borrow.",
    },
    {
      keywords: ["sleep", "100ms", "why does the terminal", "main ends", "dies"],
      response: "when `main` ends, every other thread dies mid-flight. the terminal holds the door open 100ms so south can finish. next step you'll wait properly.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`fn cut(name: &str) { println!(\"{} circuit: DOWN\", name); }`, then `fn cut_async(name: &str) { let name = name.to_string(); thread::spawn(move || cut(&name)); }`. `use std::thread;` on top.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /power cycle complete/.test(out) && !/South circuit/.test(out),
      response: "south never dropped. the thread has to actually start and call `cut` — `thread::spawn(move || cut(&name));`.",
    },
    { match: (out) => /circuit: down/i.test(out) && !/circuit: DOWN/.test(out), response: "capitals — the grid reads `circuit: DOWN`." },
  ],

  codePatterns: checked(cutCheck, CUT_MESSAGES, CH08_GOROUTINE_DONE),
  correctResponse: CH08_GOROUTINE_DONE,

  genericWrong: [
    "not matching. north drops, then south from its own thread, then `power cycle complete`.",
    "`cut_async` should start the thread and return at once: `thread::spawn(move || cut(&name));`.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nuse std::thread;\n\nfn cut(name: &str) {\n    println!(\"{} circuit: DOWN\", name);\n}\n\nfn cut_async(name: &str) {\n    let name = name.to_string();\n    thread::spawn(move || cut(&name));\n}\n```",
    "an owned copy, moved into a closure, handed to `thread::spawn`. no waiting.",
  ],

  deflections: ["focus. one breaker, then four.", "not now — the grid's checking itself every few minutes."],
};

// ── shared by fanout and window: spawn all, keep the handles, join in order ──

type FanIssue =
  | "goKw" | "async" | "foreign" | "goChan" | "rc" | "scoped" | "mutex" | "noSpawn" | "bareSpawn" | "serial" | "noJoin"
  | "printsInThread" | "noMove" | "cloneStr" | "borrowed" | "joinResult" | "noReturn" | "threadImport";

function fanIssue(code: string, f: Fn): FanIssue | null {
  const src = maskRs(code);
  const scope = [f.body, ...allFns(code).filter((g) => g !== f && g.name !== "main" && callsFn(f.body, g.name)).map((g) => g.body)].join("\n");
  if (goStatement(src)) return "goKw";
  if (asyncRust(src)) return "async";
  if (pyOrJsConcurrency(src)) return "foreign";
  if (goChannels(src)) return "goChan";
  if (usesRc(src)) return "rc";
  if (/\bthread\s*::\s*scope\s*\(|\bscope\s*\(\s*\|/.test(scope)) return "scoped";
  if (/\bMutex\b/.test(scope)) return "mutex";
  if (!/\bspawn\s*\(/.test(scope)) return "noSpawn";
  if (!/\bthread\s*::\s*spawn\s*\(/.test(scope)) return "bareSpawn";
  if (joinsAsItSpawns(scope)) return "serial";
  if (!JOIN.test(scope)) return "noJoin";
  if (printsInSpawn(scope) || spawnsPrinter(code, scope)) return "printsInThread";
  if (spawnsWithoutMove(scope)) return "noMove";
  if (!/'static/.test(f.params)) {
    if (clonesBorrow(scope)) return "cloneStr";
    if (!makesOwned(scope)) return "borrowed";
  }
  if (joinUnhandled(scope)) return "joinResult";
  if (!handsBack(f)) return "noReturn";
  if (missesThread(src)) return "threadImport";
  return null;
}

const FAN_MESSAGES: Record<FanIssue, string> = {
  goKw: CUT_MESSAGES.goKw,
  async: ASYNC_LINE,
  foreign: FOREIGN_LINE,
  goChan:
    "rust doesn't need a counter of who's still running. `thread::spawn` hands back a `JoinHandle` — keep them in a `Vec`, and joining them is the waiting.",
  rc: RC_LINE,
  scoped:
    "scoped threads work — but this terminal wants the kind you manage yourself: `thread::spawn` with `move`, and the handles joined by you.",
  mutex:
    "a shared, locked list fills up in whatever order the threads finish — scrambled. the handles already carry each result: join them in order and collect.",
  noSpawn: "one thread per circuit: `thread::spawn(move || format!(\"{} circuit: DOWN\", name))` for each, and keep the handle it gives back.",
  bareSpawn: CUT_MESSAGES.bareSpawn,
  serial:
    "you join each thread before starting the next, so the circuits go one after another. spawn them all into a `Vec` first — then join them, after the loop.",
  noJoin:
    "nothing waits for the threads, and nothing collects what they hand back. `.join()` does both: `handles.into_iter().map(|h| h.join().unwrap()).collect()`.",
  printsInThread:
    "threads finish in any order, so lines printed from inside them come out scrambled — and the terminal prints what you return. have each thread return its line: `format!(\"{} circuit: DOWN\", name)`.",
  noMove: "the thread needs its own copy of the name — `move ||` hands it over. without it the closure only borrows.",
  cloneStr: CUT_MESSAGES.cloneStr,
  borrowed:
    "`name` is borrowed from the slice — a thread can't take a borrow with it. `let name = name.to_string();` before the spawn, and `move` it in.",
  joinResult:
    "`join` hands back a `Result` — `Ok` with the thread's value, or `Err` if it panicked. `.unwrap()` it: `h.join().unwrap()`.",
  noReturn: "hand the lines back: end the function with the collected `Vec` — no semicolon.",
  threadImport: THREAD_IMPORT,
};

const scrambled = (out: string, names: string[]) => {
  const got = [...out.matchAll(/^(\w+) circuit: DOWN/gm)].map((m) => m[1]).filter((n) => names.includes(n));
  return got.length === names.length && got.join() !== names.join();
};

// ── chapter-08:fanout ──

type FanoutIssue = FanIssue | "noDef" | "camel" | "sliceParam" | "retType";

function fanoutCheck(code: string): FanoutIssue | null {
  const f = fnNamed(code, "cut_all");
  if (!f) return camelDefined(code, "cut_all") ? "camel" : "noDef";
  const fan = fanIssue(code, f);
  if (fan) return fan;
  if (!/&\s*\[/.test(f.params)) return "sliceParam";
  if (!f.ret || !/\bVec\s*</.test(f.ret)) return "retType";
  if (!has(code, "thread::spawn") || !has(code, ".join()")) return "noJoin";
  return null;
}

const FANOUT_MESSAGES: Record<FanoutIssue, string> = {
  noDef: "i need `fn cut_all(circuits: &[&str]) -> Vec<String>` — the terminal hands it the circuits and prints what comes back.",
  camel: "snake_case — the terminal calls `cut_all`.",
  ...FAN_MESSAGES,
  sliceParam: "take a slice: `circuits: &[&str]`. the terminal lends you the list.",
  retType: "say what comes back: `-> Vec<String>`, one confirmation per circuit.",
};

const CH08_FANOUT_DONE =
  "all four confirmed, and in circuit order — north, south, east, west. the grid can't tell which one went first.\n\nbut they don't all take the same time to trip.\n\n||COMPLETE||";

const ch08Fanout: StepBank = {
  intro:
    "all four breakers have to drop together, and i can't call the grid blind until every one confirms. write `fn cut_all(circuits: &[&str]) -> Vec<String>`: one thread per circuit, each returning `<name> circuit: DOWN`. keep every `JoinHandle` in a `Vec`, launch them all first, then `.join()` each in order.",

  conceptFAQ: [
    {
      keywords: ["joinhandle", "handle", "join", "wait for"],
      response: "the `JoinHandle` is the ticket `thread::spawn` hands back. `handle.join()` waits until that thread is done and gives you its return value — wrapped in a `Result`, so `.unwrap()` it.",
    },
    {
      keywords: ["launch", "before joining", "all first", "one at a time", "same loop"],
      response: "join waits. spawn and join in the same loop and the circuits run one after another. spawn all four first, so they're all running, then collect.",
    },
    {
      keywords: ["order", "which order", "results", "scrambled"],
      response: "the results come back in the order you join them — not the order the threads finished. join the handles in circuit order and the lines line up.",
    },
    {
      keywords: ["print inside", "println in", "print in the thread", "why not print"],
      response: "threads finish in any order, so printed lines would come out scrambled. each thread returns its line; the terminal prints them in order after you join.",
    },
    {
      keywords: ["unwrap", "result", "err", "panicked"],
      response: "`join()` gives `Ok(value)` if the thread finished, `Err` if it panicked. `.unwrap()` takes the value out — and if a breaker thread did panic, it's fair for us to stop too.",
    },
    {
      keywords: ["collect", "into_iter", "map", "iterator"],
      response: "`handles.into_iter().map(|h| h.join().unwrap()).collect()` joins each handle in turn and gathers the lines into the `Vec<String>`.",
    },
    {
      keywords: ["waitgroup", "wait group", "counter", "who's still running"],
      response: "rust doesn't need a counter of who's still running. the handles are the waiting and the results list in one.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`let mut handles = Vec::new();`, a loop that pushes `thread::spawn(move || format!(...))` for each circuit, then after the loop `handles.into_iter().map(|h| h.join().unwrap()).collect()`.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => (out.match(/circuit: DOWN/g) ?? []).length > 5,
      response: "the lines are doubled — the threads print, and the terminal prints what you return. drop the `println!` from inside the thread.",
    },
    {
      match: (out) => scrambled(out, ["North", "South", "East", "West"]),
      response: "all four dropped, but out of order. the results follow the order you join — join the handles in circuit order and return the lines.",
    },
    {
      match: (out) => /ALL CIRCUITS DOWN/.test(out) && !/circuit: DOWN/.test(out),
      response: "no confirmations came back. each thread returns its line, and `cut_all` returns the joined lines.",
    },
  ],

  codePatterns: checked(fanoutCheck, FANOUT_MESSAGES, CH08_FANOUT_DONE),
  correctResponse: CH08_FANOUT_DONE,

  genericWrong: [
    "not matching. four confirmations in circuit order, then `ALL CIRCUITS DOWN`, then the aux circuit on its own.",
    "`cut_all` returns the joined lines — one per circuit, in order.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nfn cut_all(circuits: &[&str]) -> Vec<String> {\n    let mut handles = Vec::new();\n    for name in circuits {\n        let name = name.to_string();\n        handles.push(thread::spawn(move || format!(\"{} circuit: DOWN\", name)));\n    }\n    handles.into_iter().map(|h| h.join().unwrap()).collect()\n}\n```",
    "spawn all, keep the handles, join them in order. joining is the waiting and the results list.",
  ],

  deflections: ["focus. all four, together.", "not now — confirm the breakers."],
};

// ── chapter-08:window ──

type WindowIssue =
  | FanIssue | "noDef" | "camel" | "arity" | "delayType" | "retType" | "noSleep" | "seconds" | "sleepOutside" | "noMs" | "durationImport";

function windowCheck(code: string): WindowIssue | null {
  const f = fnNamed(code, "cut_timed");
  if (!f) return camelDefined(code, "cut_timed") ? "camel" : "noDef";
  const params = paramList(f.params);
  if (params.length !== 2) return "arity";
  if (!/^&\s*\[\s*u64\s*\]$/.test(params[1].type)) return "delayType";
  if (!f.ret || !/\bVec\s*</.test(f.ret)) return "retType";
  const src = maskRs(code);
  if (!/\bsleep\s*\(/.test(src)) return "noSleep";
  if (/\bfrom_secs\s*\(/.test(src)) return "seconds";
  const fan = fanIssue(code, f);
  if (fan) return fan;
  if (/\bsleep\s*\(/.test(outsideSpawns(f.body))) return "sleepOutside";
  if (!stringsOf(code).some((s) => /ms\)/.test(s))) return "noMs";
  if (missesDuration(src)) return "durationImport";
  if (!has(code, "thread::sleep") || !has(code, ".join()")) return "noSleep";
  return null;
}

const WINDOW_MESSAGES: Record<WindowIssue, string> = {
  noDef: "i need `fn cut_timed(circuits: &[&str], delays: &[u64]) -> Vec<String>` — the names and their delays, side by side.",
  camel: "snake_case — the terminal calls `cut_timed`.",
  arity: "two slices go in: `fn cut_timed(circuits: &[&str], delays: &[u64])`.",
  delayType: "`Duration::from_millis` takes a `u64`, and the terminal passes the delays as one: `delays: &[u64]`.",
  retType: "say what comes back: `-> Vec<String>`.",
  noSleep: "each breaker waits its delay before it reports: `thread::sleep(Duration::from_millis(d));` first thing inside the thread.",
  seconds: "`from_secs` counts seconds — every breaker would wait a thousand times too long. the delays are milliseconds: `Duration::from_millis(d)`.",
  ...FAN_MESSAGES,
  serial:
    "joining each thread before spawning the next puts the breakers one after another — the window becomes the sum of the delays, 1100ms. two power cycles. alarm. spawn all four, then join.",
  sleepOutside:
    "the sleep is out in the loop, so the calling thread waits each delay before starting the next breaker — the sum, not the max. move it inside the thread's closure.",
  noMs: "each line ends with its delay: `format!(\"{} circuit: DOWN ({}ms)\", name, d)`.",
  durationImport: DURATION_IMPORT,
};

const CH08_WINDOW_DONE =
  "450 milliseconds. the slowest breaker, not the sum. one power cycle, and the alarm grid never saw it happen.\n\n||COMPLETE||";

const ch08Window: StepBank = {
  intro:
    "each breaker takes its own time to trip, and i need all four down inside one power cycle or the grid seals the facility. write `fn cut_timed(circuits: &[&str], delays: &[u64]) -> Vec<String>`: the same fan-out, but each thread first sleeps its delay — `thread::sleep(Duration::from_millis(d))` — then returns `<name> circuit: DOWN (<d>ms)`.",

  conceptFAQ: [
    {
      keywords: ["sleep", "milliseconds", "duration", "from_millis", "wait"],
      response: "`thread::sleep(Duration::from_millis(d))` pauses the thread it's called on — only that one. `use std::time::Duration;` at the top.",
    },
    {
      keywords: ["where does the sleep", "inside", "in the loop", "sleep go"],
      response: "inside the thread's closure. sleep in the loop — or join each thread before spawning the next — and the breakers trip one after another: the sum, not the max.",
    },
    {
      keywords: ["zip", "pair", "together", "both", "name and delay"],
      response: "`circuits.iter().zip(delays)` walks both side by side: `for (name, &d) in circuits.iter().zip(delays)` hands you `\"North\"` and `300`, then `\"South\"` and `150`.",
    },
    {
      keywords: ["&d", "copy the number", "move d", "delay into"],
      response: "the `&d` in the pattern copies the number out of the slice, so the thread can `move` it in along with the name. a `u64` is cheap to copy.",
    },
    {
      keywords: ["window", "sum", "slowest", "how long", "1100", "450"],
      response: "one at a time, you wait for every delay in a row: 300 + 150 + 450 + 200. all at once, they wait together, so it's only as long as the slowest: 450.",
    },
    {
      keywords: ["real time", "virtual", "really sleep"],
      response: "these threads really sleep — no pretend clock here. that's why the terminal can time the whole cut.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "last step's shape, with `for (name, &d) in circuits.iter().zip(delays)`, and inside each thread: sleep `d` milliseconds, then `format!(\"{} circuit: DOWN ({}ms)\", name, d)`.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /MULTI CYCLE/.test(out),
      response:
        "two power cycles — the breakers took 1100ms or more. they ran one after another: a sleep out in the loop, or a join before the next spawn. spawn all four, then join.",
    },
    { match: (out) => /circuit: DOWN$/m.test(out), response: "the lines need their delay on the end: `({}ms)`." },
    {
      match: (out) => scrambled(out, ["North", "South", "East", "West"]),
      response: "out of order — that's the order they finished. return each line from its thread and join the handles in circuit order.",
    },
  ],

  codePatterns: checked(windowCheck, WINDOW_MESSAGES, CH08_WINDOW_DONE),
  correctResponse: CH08_WINDOW_DONE,

  genericWrong: [
    "not matching. four lines with their delays, then `window: SINGLE CYCLE - alarm blind`.",
    "all four breakers wait at the same time — the window is the slowest, not the sum.",
  ],

  rushDialogue: ["the grid's self-check is coming. all four, one cycle.", "hurry — sleep inside each thread, spawn them all, then join."],

  stuckResponses: [
    "```\nfn cut_timed(circuits: &[&str], delays: &[u64]) -> Vec<String> {\n    let mut handles = Vec::new();\n    for (name, &d) in circuits.iter().zip(delays) {\n        let name = name.to_string();\n        handles.push(thread::spawn(move || {\n            thread::sleep(Duration::from_millis(d));\n            format!(\"{} circuit: DOWN ({}ms)\", name, d)\n        }));\n    }\n    handles.into_iter().map(|h| h.join().unwrap()).collect()\n}\n```",
    "the sleep goes inside each thread, not in the loop that starts them.",
  ],

  deflections: ["focus. one power cycle.", "not now — the grid seals in seconds if we miss this."],
};

// ══════════════════════════════════════════════════════════════
//  Chapter 09 — CHANNEL OF ESCAPE
// ══════════════════════════════════════════════════════════════

const CH09_SCAFFOLD_DONE =
  "comms array's up. three extraction teams on three frequencies — alpha, bravo, charlie.\n\nnow call one.\n\n||COMPLETE||";

const ch09Scaffold: StepBank = {
  intro: "this comms array is how i call for a way out. power it up: print `Hello World`.",

  conceptFAQ: [
    { keywords: ["print", "output"], response: "`println!(\"Hello World\");` inside `fn main` — one line." },
    {
      keywords: ["import", "use", "mpsc", "channel", "package", "setup", "scaffold"],
      response: "`std::sync::mpsc` joins the `use` lines next step, with the channels. nothing to bring in for the greeting.",
    },
    { keywords: ["team", "hail", "frequency", "extraction", "call"], response: "the teams come next. power the array first." },
    { keywords: ["main", "entry", "start", "fn"], response: "`fn main() { }` — same as always." },
  ],

  codePatterns: scaffoldPatterns(CH09_SCAFFOLD_DONE),
  correctResponse: CH09_SCAFFOLD_DONE,
  genericWrong: SCAFFOLD_GENERIC,
  rushDialogue: [],
  stuckResponses: [
    "```\nfn main() {\n    println!(\"Hello World\");\n}\n```",
    "`fn main`, braces, one `println!` with the text in double quotes.",
  ],
  deflections: ["power the array first."],
};

// ── chapter-09:hail ──

type HailIssue =
  | "goChan" | "async" | "foreign" | "noDef" | "camel" | "arity" | "ownedParam" | "delayType" | "recvInside" | "retType"
  | "noChannel" | "noSpawn" | "bareSpawn" | "joins" | "noMove" | "cloneStr" | "borrowed" | "noSend" | "noSleep" | "sleepOutside"
  | "seconds" | "noReturn" | "threadImport" | "durationImport" | "mpscImport" | "receiverImport";

function hailCheck(code: string): HailIssue | null {
  const src = maskRs(code);
  if (goChannels(src)) return "goChan";
  if (asyncRust(src)) return "async";
  if (pyOrJsConcurrency(src)) return "foreign";
  const f = fnNamed(code, "hail");
  if (!f) return /\bfn\s+hail[A-Z_]\w*\s*\(/.test(src) ? "camel" : "noDef";
  const params = paramList(f.params);
  if (params.length !== 2) return "arity";
  if (/^String$/.test(params[0].type)) return "ownedParam";
  if (params[1].type !== "u64") return "delayType";
  if (/\.\s*recv\s*\(/.test(f.body)) return "recvInside";
  if (!f.ret || !/\bReceiver\s*</.test(f.ret)) return "retType";
  if (!/\b(sync_)?channel\b/.test(f.body)) return "noChannel";
  if (!/\bspawn\s*\(/.test(f.body)) return "noSpawn";
  if (!/\bthread\s*::\s*spawn\s*\(/.test(f.body)) return "bareSpawn";
  if (JOIN.test(f.body)) return "joins";
  if (spawnsWithoutMove(f.body)) return "noMove";
  if (clonesBorrow(f.body)) return "cloneStr";
  if (!makesOwned(f.body)) return "borrowed";
  if (!spawnCalls(f.body).some((s) => /\.\s*send\s*\(/.test(s.inner))) return "noSend";
  if (!/\bsleep\s*\(/.test(f.body)) return "noSleep";
  if (/\bsleep\s*\(/.test(outsideSpawns(f.body))) return "sleepOutside";
  if (/\bfrom_secs\s*\(/.test(f.body)) return "seconds";
  if (!handsBack(f)) return "noReturn";
  if (missesThread(src)) return "threadImport";
  if (missesDuration(src)) return "durationImport";
  if (missesMpsc(src)) return "mpscImport";
  if (missesReceiver(src)) return "receiverImport";
  if (!has(code, "mpsc::") || !has(code, "thread::spawn") || !has(code, ".send(")) return "noChannel";
  return null;
}

const HAIL_MESSAGES: Record<HailIssue, string> = {
  goChan:
    "rust's channels come in two halves: `let (tx, rx) = mpsc::channel();`. `tx.send(x)` puts a message in, `rx.recv()` takes one out.",
  async: ASYNC_LINE,
  foreign: FOREIGN_LINE,
  noDef: "i need `fn hail(team: &str, delay_ms: u64) -> Receiver<String>` — a call that comes straight back with something to listen on.",
  camel: "the terminal calls it `hail` — just that.",
  arity: "it takes the team and the delay: `fn hail(team: &str, delay_ms: u64)`.",
  ownedParam: "the terminal passes a borrowed name — `hail(\"Bravo\", 100)`. take `team: &str`, and make the owned copy inside.",
  delayType: "`Duration::from_millis` takes a `u64`: `delay_ms: u64`.",
  recvInside:
    "receiving inside `hail` waits for the team — the terminal would freeze before it even says `hailing Bravo...`. hand back the receiver itself and let the terminal wait on it.",
  retType: "`hail` hands back the receiving end: `-> Receiver<String>`.",
  noChannel: "make the channel first: `let (tx, rx) = mpsc::channel();` — `tx` for the team, `rx` for me.",
  noSpawn: "the team answers from its own thread: `thread::spawn(move || { ... })`, so `hail` can return straight away.",
  bareSpawn: CUT_MESSAGES.bareSpawn,
  joins: "joining waits for the team's thread — `hail` has to come straight back. return `rx` and let the terminal do the waiting.",
  noMove: "the thread needs `tx` and the team name for itself — `move ||` hands them over.",
  cloneStr: CUT_MESSAGES.cloneStr,
  borrowed: "the team name is borrowed, and the thread may outlive it. `let team = team.to_string();` before the spawn, then `move` it in.",
  noSend: "the team never answers. inside the thread: `let _ = tx.send(format!(\"{} responding\", team));`.",
  noSleep: "the team takes `delay_ms` to answer: `thread::sleep(Duration::from_millis(delay_ms));` inside the thread, before the send.",
  sleepOutside: "the sleep is out in `hail` itself, so the call freezes before it returns. move it inside the thread, before the send.",
  seconds: "`from_secs` counts seconds. the delay's in milliseconds: `Duration::from_millis(delay_ms)`.",
  noReturn: "end `hail` with `rx` — no semicolon — so the terminal gets the receiving end.",
  threadImport: THREAD_IMPORT,
  durationImport: DURATION_IMPORT,
  mpscImport: MPSC_IMPORT,
  receiverImport: RECEIVER_IMPORT,
};

const CH09_HAIL_DONE =
  "bravo answered, and the terminal never froze while i waited. one hail, one answer, held in the channel until i asked for it.\n\nnow all three at once.\n\n||COMPLETE||";

const ch09Hail: StepBank = {
  intro:
    "i have to call an extraction team and hear back — without freezing the terminal while i wait. write `fn hail(team: &str, delay_ms: u64) -> Receiver<String>`: make a channel with `mpsc::channel()`, start a thread that sleeps `delay_ms` milliseconds then sends `<team> responding` down `tx`, and return `rx` straight away.",

  conceptFAQ: [
    {
      keywords: ["channel", "what is a channel", "mpsc", "pipe"],
      response: "a pipe between threads. `mpsc::channel()` gives you two ends: `tx` sends, `rx` receives. `rx.recv()` waits until something arrives. `use std::sync::mpsc;` at the top.",
    },
    {
      keywords: ["tx", "rx", "which end", "sender", "receiver"],
      response: "`tx` moves into the thread — it's the team's radio. `rx` is what `hail` returns — my earpiece.",
    },
    {
      keywords: ["hailing bravo first", "why does hailing", "order", "straight away"],
      response: "`hail` returns `rx` at once while the thread sleeps in the background. then the terminal's `recv` waits for the reply.",
    },
    {
      keywords: ["let _", "send error", "unwrap", "nobody listening"],
      response: "if nobody's listening any more, `send` returns an error. a team that loses the race doesn't care, so `let _ = tx.send(...)` throws that error away on purpose.",
    },
    {
      keywords: ["receiver<string>", "return type", "receiver type"],
      response: "the return type is `Receiver<String>` — `use std::sync::mpsc::{self, Receiver};`, or write `mpsc::Receiver<String>`.",
    },
    {
      keywords: ["recv", "receive", "wait for the answer"],
      response: "`rx.recv()` blocks until a message lands, then gives you `Ok(message)`. the terminal does that part — `hail` only hands over `rx`.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`let (tx, rx) = mpsc::channel();`, `let team = team.to_string();`, then `thread::spawn(move || { sleep; let _ = tx.send(format!(\"{} responding\", team)); });` and end with `rx`.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /responding/.test(out) && out.indexOf("responding") < out.indexOf("hailing"),
      response: "the team answered before we finished hailing — `hail` waited. it should start the thread and return `rx` at once.",
    },
    { match: (out) => /hailing Bravo/.test(out) && !/Bravo responding/.test(out), response: "nothing came back. the thread has to send: `tx.send(format!(\"{} responding\", team))`." },
  ],

  codePatterns: checked(hailCheck, HAIL_MESSAGES, CH09_HAIL_DONE),
  correctResponse: CH09_HAIL_DONE,

  genericWrong: [
    "not matching. `hailing Bravo...`, then `Bravo responding` once the terminal receives, then `channel confirmed`.",
    "`hail` returns the receiver at once. the answer comes out when someone calls `recv`.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nuse std::sync::mpsc::{self, Receiver};\nuse std::thread;\nuse std::time::Duration;\n\nfn hail(team: &str, delay_ms: u64) -> Receiver<String> {\n    let (tx, rx) = mpsc::channel();\n    let team = team.to_string();\n    thread::spawn(move || {\n        thread::sleep(Duration::from_millis(delay_ms));\n        let _ = tx.send(format!(\"{} responding\", team));\n    });\n    rx\n}\n```",
    "the sender goes with the thread, the receiver goes back to the caller. one pipe, two ends.",
  ],

  deflections: ["focus. one team, one answer.", "not now — i need someone on the other end of this."],
};

// ── shared by first and timeout: fan three receivers into one channel ──

type FanInIssue =
  | "noMultiWait" | "async" | "foreign" | "hail" | "waitsOne" | "polling" | "noFanIn" | "rc" | "cloneRx" | "noClone" | "noMove"
  | "noForward" | "sendUnwrap" | "joins" | "drains";

/** `first_responder`/`await_contact` and whatever helpers it calls (hail and main excluded). */
function fanInScope(code: string, f: Fn): string {
  const helpers = allFns(code).filter((g) => g !== f && g.name !== "main" && g.name !== "hail" && callsFn(f.body, g.name));
  return [f.body, ...helpers.map((g) => g.body)].join("\n");
}

function fanInIssue(code: string, f: Fn, scope: string): FanInIssue | null {
  const src = maskRs(code);
  if (goMultiWait(src)) return "noMultiWait";
  if (asyncRust(src)) return "async";
  if (pyOrJsConcurrency(src) || /\bFIRST_COMPLETED\b/.test(src)) return "foreign";
  if (hailCheck(code) !== null) return "hail";
  const names = paramList(f.params).map((p) => p.name);
  const direct = outsideSpawns(f.body);
  if (names.some((n) => new RegExp(`\\b${n}\\s*\\.\\s*(recv|recv_timeout)\\s*\\(`).test(direct))) return "waitsOne";
  if (/\.\s*try_recv\s*\(/.test(scope) && !/\.\s*recv(_timeout)?\s*\(/.test(scope)) return "polling";
  if (!/\b(sync_)?channel\b/.test(scope) || !/\bspawn\s*\(/.test(scope)) return "noFanIn";
  if (usesRc(src)) return "rc";
  const pair = scope.match(/\blet\s*\(\s*(?:mut\s+)?(\w+)\s*,\s*(?:mut\s+)?(\w+)\s*\)\s*(?::[^=]+)?=\s*(?:[\w:]*::)?(?:sync_)?channel\b/);
  const receivers = [...names, ...(pair ? [pair[2]] : []), "r", "rx"];
  if (receivers.some((n) => new RegExp(`\\b${n}\\s*\\.\\s*clone\\s*\\(`).test(scope))) return "cloneRx";
  if (!/\.\s*clone\s*\(\s*\)/.test(scope)) return "noClone";
  if (spawnsWithoutMove(scope)) return "noMove";
  const forwarders = spawnCalls(scope);
  if (!forwarders.some((s) => /\.\s*recv\s*\(/.test(s.inner) && /\.\s*send\s*\(/.test(s.inner))) return "noForward";
  if (forwarders.some((s) => /\.\s*send\s*\([^;]*\)\s*\.\s*(unwrap|expect)\s*\(/.test(s.inner))) return "sendUnwrap";
  if (JOIN.test(scope)) return "joins";
  if (pair) {
    const rx = pair[2];
    const drains =
      new RegExp(`\\b${rx}\\s*\\.\\s*(iter|into_iter)\\s*\\(\\s*\\)\\s*\\.\\s*(collect|last|count|for_each)\\b`).test(scope) ||
      forBodies(scope).length > 0 &&
        [...scope.matchAll(new RegExp(`\\bfor\\b[^{;]*?\\bin\\s+&?\\s*${rx}\\b[^{;]*\\{`, "g"))].some((m) => {
          const open = m.index! + m[0].length - 1;
          return !/\b(return|break)\b/.test(scope.slice(open, matchClose(scope, open)));
        });
    if (drains) return "drains";
  }
  return null;
}

const FAN_IN_MESSAGES: Record<FanInIssue, string> = {
  noMultiWait:
    "rust's standard library has no way to wait on several receivers at once. fan them in: one new channel, a forwarding thread per team, and the first message out is first contact.",
  async: ASYNC_LINE,
  foreign: "that's another language's race. in rust you fan in: one channel, a cloned `Sender` per team, and `recv` on the shared receiver.",
  hail: "keep `hail` from the last step working — the terminal still uses it to call the teams.",
  waitsOne:
    "that waits on one team even though another answered sooner. listen to all three at once: fan them into one channel and take the first message out.",
  polling:
    "checking every receiver in a loop works, but it spins the cpu the whole time it waits. fan them in instead: forwarders that block on `recv`, all sending into one channel.",
  noFanIn:
    "fan them in. `let (tx, rx) = mpsc::channel();`, then for each team a thread that waits on its receiver and forwards the answer into a clone of `tx`.",
  rc: RC_LINE,
  cloneRx: "a `Receiver` can't be cloned — mpsc is many senders, one receiver. clone the sender instead: `let tx = tx.clone();`.",
  noClone:
    "the first thread takes `tx` with it, and the next one finds it gone. each forwarder needs its own: `let tx = tx.clone();` right before each spawn.",
  noMove: "each forwarder needs its own receiver and its own sender — `move ||` hands them over.",
  noForward: "each forwarder waits on its team and passes the answer on: `if let Ok(msg) = r.recv() { let _ = tx.send(msg); }`.",
  sendUnwrap:
    "a losing team's forward fails once you've stopped listening — `.unwrap()` turns that into a panic on its thread. `let _ = tx.send(msg);` lets it fail quietly.",
  joins: "joining every forwarder waits for the slowest team. take the first message out of the inbox and go.",
  drains:
    "looping over the receiver waits until every sender is gone — and the original `tx` is still alive in this function, so it never ends. take one message: `rx.recv()`.",
};

// ── chapter-09:first ──

type FirstIssue = FanInIssue | "noDef" | "camel" | "arity" | "question" | "noRecv" | "recvResult" | "noReturn";

function firstCheck(code: string): FirstIssue | null {
  const f = fnNamed(code, "first_responder");
  if (!f) {
    if (hailCheck(code) !== null) return "hail";
    return camelDefined(code, "first_responder") ? "camel" : "noDef";
  }
  if (paramList(f.params).length !== 3) return "arity";
  const scope = fanInScope(code, f);
  const fan = fanInIssue(code, f, scope);
  if (fan) return fan;
  const direct = outsideSpawns(scope);
  if (/\.\s*recv(_timeout)?\s*\([^;]*?\)\s*\?/.test(direct)) return "question";
  const recvs = [...direct.matchAll(/\.\s*recv\s*\(\s*\)/g)];
  if (recvs.length === 0 && !/\.\s*recv_timeout\s*\(/.test(direct)) return "noRecv";
  for (const m of recvs) {
    const after = direct.slice(m.index! + m[0].length);
    const before = direct.slice(0, m.index!);
    if (/^\s*\./.test(after) || /\b(match|Ok\s*\([^)]*\)\s*=)\s*[\w.()[\], ]*$/.test(before)) continue;
    return "recvResult";
  }
  if (!handsBack(f)) return "noReturn";
  if (!has(code, ".clone()") || !has(code, ".recv()")) return "noClone";
  return null;
}

const FIRST_MESSAGES: Record<FirstIssue, string> = {
  noDef:
    "i need `fn first_responder(alpha: Receiver<String>, bravo: Receiver<String>, charlie: Receiver<String>) -> String` — three receivers in, the first answer out.",
  camel: "snake_case — the terminal calls `first_responder`.",
  arity: "three receivers come in: `alpha`, `bravo`, `charlie`, each a `Receiver<String>`.",
  ...FAN_IN_MESSAGES,
  question: "`?` only works in a function that returns a `Result` — this one returns a `String`. `rx.recv().unwrap()` takes the first message.",
  noRecv: "after the forwarders are running, take the first message out of the inbox: `rx.recv().unwrap()`.",
  recvResult: "`recv` hands back a `Result` — `Ok(message)`, or `Err` if every sender is gone. `.unwrap()` it: `rx.recv().unwrap()`.",
  noReturn: "hand the answer back: end with `rx.recv().unwrap()` — no semicolon.",
};

const CH09_FIRST_DONE =
  "bravo, first. we go with bravo, and nobody waits on the slow ones.\n\nbut if every frequency's jammed, i'm standing in a stairwell forever.\n\n||COMPLETE||";

const FAN_IN_CODE =
  "fn first_responder(alpha: Receiver<String>, bravo: Receiver<String>, charlie: Receiver<String>) -> String {\n    let (tx, rx) = mpsc::channel();\n    for r in [alpha, bravo, charlie] {\n        let tx = tx.clone();\n        thread::spawn(move || {\n            if let Ok(msg) = r.recv() {\n                let _ = tx.send(msg);\n            }\n        });\n    }\n    rx.recv().unwrap()\n}";

const ch09First: StepBank = {
  intro:
    "three teams hailed at once — i go with whoever answers first and don't wait on the slow ones. write `fn first_responder(alpha, bravo, charlie) -> String`, each one a `Receiver<String>`. rust can't wait on three receivers at once, so fan them in: one new channel, a thread per team that waits on it and forwards into a clone of the sender. the first message out is first contact.",

  conceptFAQ: [
    {
      keywords: ["why not just", "alpha.recv", "one at a time", "wait on alpha"],
      response: "`alpha.recv()` waits for alpha even though bravo answered sooner. you have to listen to all three at once.",
    },
    {
      keywords: ["clone", "three threads", "one channel", "many", "sender"],
      response: "a `Sender` clones. `let tx = tx.clone();` before each spawn gives every forwarder its own sender — all feeding the same receiver. that's the m in mpsc: many producers, single consumer.",
    },
    {
      keywords: ["forward", "forwarder", "what does each", "fan in", "fan-in"],
      response: "each forwarder waits on its team and passes the answer on: `if let Ok(msg) = r.recv() { let _ = tx.send(msg); }`.",
    },
    {
      keywords: ["lose", "losers", "slow ones", "what happens to", "still running"],
      response: "their forwarders send into a channel nobody reads any more — the send just fails quietly, and the threads end with the program.",
    },
    {
      keywords: ["race", "whoever", "first", "wait on all", "several", "select"],
      response: "rust's standard library has no way to wait on several receivers at once. fanning in turns three waits into one: whatever lands in the shared inbox first is first.",
    },
    {
      keywords: ["receiver clone", "clone the receiver", "clone rx"],
      response: "a `Receiver` can't be cloned — there's only ever one consumer. you clone the sending side.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`let (tx, rx) = mpsc::channel();`, then `for r in [alpha, bravo, charlie] { let tx = tx.clone(); thread::spawn(move || { ... }); }`, then `rx.recv().unwrap()`.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /first contact: Alpha responding/.test(out),
      response: "alpha — but bravo answered first. you waited on alpha before anyone else. fan all three into one channel and take the first message.",
    },
    {
      match: (out) => /first contact: Charlie responding/.test(out),
      response: "charlie's the slowest. something waited for everyone and took the last answer — take the first message out of the inbox.",
    },
  ],

  codePatterns: checked(firstCheck, FIRST_MESSAGES, CH09_FIRST_DONE),
  correctResponse: CH09_FIRST_DONE,

  genericWrong: [
    "not matching. bravo answers in 100ms, alpha in 200, charlie in 300 — the terminal wants `first contact: Bravo responding`.",
    "listen to all three at once and take whoever lands first.",
  ],

  rushDialogue: ["the frequencies are degrading. take the first voice.", "hurry — fan them in, clone the sender, take the first message."],

  stuckResponses: [
    "```\n" + FAN_IN_CODE + "\n```",
    "one inbox, a cloned sender per team, and the first message out is the answer.",
  ],

  deflections: ["focus. first voice wins.", "not now — whoever answers, we go."],
};

// ── chapter-09:timeout ──

type TimeoutIssue =
  | FanInIssue | "noDef" | "camel" | "arity" | "sleepThenLook" | "tryInAwait" | "noTimeout" | "fixedTimeout" | "seconds"
  | "timeoutUnwrap" | "noContact" | "noSweep" | "sweepArity" | "sweepBorrow" | "sweepWaits" | "sweepRecv" | "noTry"
  | "tryUnwrap" | "noSilent" | "durationImport";

function timeoutCheck(code: string): TimeoutIssue | null {
  const f = fnNamed(code, "await_contact");
  if (!f) {
    if (hailCheck(code) !== null) return "hail";
    return camelDefined(code, "await_contact") ? "camel" : "noDef";
  }
  const params = paramList(f.params);
  if (params.length !== 4) return "arity";
  const scope = fanInScope(code, f);
  const src = maskRs(code);
  if (goMultiWait(src)) return "noMultiWait";
  if (!/\.\s*recv_timeout\s*\(/.test(scope)) {
    if (/\.\s*try_recv\s*\(/.test(scope)) return /\bsleep\s*\(/.test(scope) ? "sleepThenLook" : "tryInAwait";
  }
  const fan = fanInIssue(code, f, scope);
  if (fan) return fan;
  const call = scope.match(/\.\s*recv_timeout\s*\(/);
  if (!call) return "noTimeout";
  const open = call.index! + call[0].length - 1;
  const close = matchClose(scope, open);
  const arg = scope.slice(open + 1, close - 1);
  if (/\bfrom_secs\s*\(/.test(arg)) return "seconds";
  const deadline = params[3].name;
  const deadlineVars = [deadline, ...[...scope.matchAll(new RegExp(`\\blet\\s+(\\w+)\\s*(?::[^=]+)?=[^;]*\\b${deadline}\\b`, "g"))].map((m) => m[1])];
  if (!deadlineVars.some((v) => new RegExp(`\\b${v}\\b`).test(arg))) return "fixedTimeout";
  if (/^\s*\.\s*(unwrap|expect)\s*\(/.test(scope.slice(close))) return "timeoutUnwrap";
  if (!stringsOf(f.raw).includes("NO CONTACT")) return "noContact";
  const sweep = fnNamed(code, "sweep");
  if (!sweep) return "noSweep";
  const sp = paramList(sweep.params);
  if (sp.length !== 1) return "sweepArity";
  if (!/^&\s*(?:'\w+\s+)?(?:[\w:]*::)?Receiver\s*</.test(sp[0].type)) return "sweepBorrow";
  if (/\.\s*recv_timeout\s*\(|\bsleep\s*\(/.test(sweep.body)) return "sweepWaits";
  if (/\.\s*recv\s*\(/.test(sweep.body)) return "sweepRecv";
  const tryAt = sweep.body.match(/\.\s*try_recv\s*\(\s*\)/);
  if (!tryAt) return "noTry";
  if (/^\s*\.\s*(unwrap|expect)\s*\(/.test(sweep.body.slice(tryAt.index! + tryAt[0].length))) return "tryUnwrap";
  if (!stringsOf(sweep.raw).includes("channel silent")) return "noSilent";
  if (missesDuration(src)) return "durationImport";
  if (!has(code, "recv_timeout") || !has(code, "try_recv")) return "noTimeout";
  return null;
}

const TIMEOUT_MESSAGES: Record<TimeoutIssue, string> = {
  noDef:
    "i need `fn await_contact(alpha: Receiver<String>, bravo: Receiver<String>, charlie: Receiver<String>, timeout_ms: u64) -> String` — last step's fan-in, with a deadline.",
  camel: "snake_case — the terminal calls `await_contact` and `sweep`.",
  arity: "four things come in — three receivers and the deadline: `alpha, bravo, charlie, timeout_ms: u64`.",
  ...FAN_IN_MESSAGES,
  noMultiWait:
    "rust's standard library has no way to wait on several receivers — or a clock — at once. fan the teams into one channel, then wait on it with `recv_timeout`.",
  sleepThenLook:
    "sleeping the whole deadline and then looking means you always wait the full time, even when bravo answered at 100ms. `recv_timeout` comes back the moment a message lands.",
  tryInAwait: "`try_recv` doesn't wait at all — bravo hasn't answered yet when you look. `recv_timeout` waits, but only up to the deadline.",
  noTimeout:
    "with every frequency jammed, `recv()` waits forever — the senders never go away. give it a deadline: `rx.recv_timeout(Duration::from_millis(timeout_ms))`.",
  fixedTimeout: "the deadline is a number you picked. the terminal passes a different one each call — `Duration::from_millis(timeout_ms)`.",
  seconds: "`from_secs` counts seconds. the deadline's in milliseconds: `Duration::from_millis(timeout_ms)`.",
  timeoutUnwrap:
    "`unwrap` on a timeout is a panic — the jammed call would crash the terminal. match it: `Ok(msg) => msg, Err(_) => \"NO CONTACT\".to_string()`.",
  noContact: "when the deadline passes, hand back `NO CONTACT`: the `Err(_)` arm of the match.",
  noSweep: "now `fn sweep(ch: &Receiver<String>) -> String` — a quick look at one channel that never waits.",
  sweepArity: "`sweep` looks at one channel: `fn sweep(ch: &Receiver<String>)`.",
  sweepBorrow: "the terminal lends the receiver — `sweep(&ready)`. take it borrowed: `ch: &Receiver<String>`.",
  sweepWaits: "`sweep` mustn't wait at all, not even a little. it only glances: `ch.try_recv()`.",
  sweepRecv: "`recv` waits — and on a silent channel, that's forever. `try_recv` never waits: a message right now, or an `Err` right now.",
  noTry: "`ch.try_recv()` looks without waiting: `Ok(msg)` if something's already there, `Err` if not.",
  tryUnwrap: "`unwrap` on an empty channel is a panic. match it: `Ok(msg) => msg, Err(_) => \"channel silent\".to_string()`.",
  noSilent: "nothing there yet means `channel silent`, straight away — the `Err(_)` arm.",
  durationImport: DURATION_IMPORT,
};

const CH09_TIMEOUT_DONE =
  "bravo holding at dock 4. and when the air was dead, the program gave up in time instead of leaving me standing there.\n\nextraction's locked. and kira just sent me something.\n\n||COMPLETE||";

const ch09Timeout: StepBank = {
  intro:
    "if every frequency is jammed i can't stand in a stairwell forever. two functions. `await_contact(alpha, bravo, charlie, timeout_ms) -> String` — last step's fan-in, but wait with `recv_timeout(Duration::from_millis(timeout_ms))`, and an `Err` means `NO CONTACT`. and `sweep(ch: &Receiver<String>) -> String` — `ch.try_recv()`: the message if one's waiting, otherwise `channel silent` right away.",

  conceptFAQ: [
    {
      keywords: ["recv_timeout", "timeout", "deadline", "give up"],
      response: "`rx.recv_timeout(d)` waits for a message, but not longer than `d`. it gives back `Ok(msg)`, or `Err(...)` when the time ran out.",
    },
    {
      keywords: ["no contact", "err into", "match", "turn the err"],
      response: "`match rx.recv_timeout(...) { Ok(msg) => msg, Err(_) => \"NO CONTACT\".to_string() }` — the `Err` arm is the clock winning.",
    },
    {
      keywords: ["try_recv", "sweep", "glance", "without waiting", "non-blocking"],
      response: "`try_recv` never waits. a message already in the channel comes back as `Ok(msg)`, an empty channel as `Err(...)` — right now.",
    },
    {
      keywords: ["which one", "timeout or try", "when"],
      response: "`recv_timeout` means wait, but not past the deadline. `try_recv` means don't wait at all. `await_contact` waits; `sweep` only glances.",
    },
    {
      keywords: ["forever", "hang", "deadlock", "stuck waiting", "never ends"],
      response: "`recv()` waits until a message comes or every sender is gone. on a jammed frequency the senders stay alive and nothing comes — so it waits forever. that's why the deadline.",
    },
    {
      keywords: ["&receiver", "borrow", "why &", "sweep(&"],
      response: "`sweep` only looks, so it borrows: `ch: &Receiver<String>`. the terminal keeps the receiver afterwards.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "copy `first_responder` into `await_contact`, swap the last `recv()` for a `match` on `recv_timeout(Duration::from_millis(timeout_ms))`. then `sweep` with a `match` on `ch.try_recv()`.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /^contact: NO CONTACT\ncontact: NO CONTACT$/m.test(out),
      response: "the last call should reach alpha in 300ms — the deadline's 500. your deadline doesn't come from `timeout_ms`.",
    },
    {
      match: (out) => /^contact: NO CONTACT$/m.test(out.split("\n")[0] ?? ""),
      response: "you gave up before bravo could answer. `try_recv` doesn't wait — `recv_timeout` waits up to the deadline.",
    },
    {
      match: (out) => /^contact: Alpha responding\ncontact:/m.test(out) && !/^contact: Bravo/m.test(out),
      response: "alpha first — but bravo answered sooner. fan all three into one channel and take the first.",
    },
    {
      match: (out) => /^sweep: channel silent\nsweep: channel silent$/m.test(out),
      response: "the first channel already had bravo's message, and the sweep still said silent. `Ok(msg) => msg` hands it back.",
    },
  ],

  codePatterns: checked(timeoutCheck, TIMEOUT_MESSAGES, CH09_TIMEOUT_DONE),
  correctResponse: CH09_TIMEOUT_DONE,

  genericWrong: [
    "not matching. bravo, then `NO CONTACT` for the jammed call, then alpha — and the sweep finds bravo at dock 4, then silence.",
    "check the deadline comes from `timeout_ms`, and that `sweep` never waits.",
  ],

  rushDialogue: ["the extraction window's closing. finish the deadline.", "hurry — `recv_timeout` on the inbox, `try_recv` in the sweep."],

  stuckResponses: [
    "```\nfn await_contact(alpha: Receiver<String>, bravo: Receiver<String>, charlie: Receiver<String>, timeout_ms: u64) -> String {\n    let (tx, rx) = mpsc::channel();\n    for r in [alpha, bravo, charlie] {\n        let tx = tx.clone();\n        thread::spawn(move || {\n            if let Ok(msg) = r.recv() {\n                let _ = tx.send(msg);\n            }\n        });\n    }\n    match rx.recv_timeout(Duration::from_millis(timeout_ms)) {\n        Ok(msg) => msg,\n        Err(_) => \"NO CONTACT\".to_string(),\n    }\n}\n\nfn sweep(ch: &Receiver<String>) -> String {\n    match ch.try_recv() {\n        Ok(msg) => msg,\n        Err(_) => \"channel silent\".to_string(),\n    }\n}\n```",
    "the wait gets a deadline and the sweep gets no wait at all. know which one the moment needs.",
  ],

  deflections: ["focus. a deadline, then a glance.", "not now — bravo won't hold the dock forever."],
};

// ── Registry ──

export const RUST_ACT3_BANKS: Record<string, StepBank> = {
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
