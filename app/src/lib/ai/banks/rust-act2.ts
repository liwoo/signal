// ── Maya's answer banks · Rust · Act II (Ch 4 GUARD ROSTER, Ch 4.2 CIPHER RELAY) ──
// Same story beats and stakes as the Python/JS banks, teaching Rust and agreeing
// with src/data/challenges/rust/act-2.ts. Offline, the engine grades by these
// codePatterns: the ||COMPLETE|| pattern must recognize a genuinely correct
// program and the patterns above it catch the classic mistakes first.
// Voice rule: every `!` (println!, macros) lives inside backticks.

import type { CodePattern, OutputPattern, StepBank } from "./types";
import { noComments, maskRs, stringsOf, matchClose, tail, scaffoldPatterns, SCAFFOLD_GENERIC } from "./rust-read";

// ══════════════════════════════════════════════════════════════
//  Reading the player's Rust (Act II)
// ══════════════════════════════════════════════════════════════

interface Param {
  name: string;
  /** Whitespace collapsed to single spaces. */
  type: string;
}

interface RsFnSrc {
  params: Param[];
  ret: string | null;
  /** Comments removed, strings blanked. */
  body: string;
  /** Comments removed, strings kept. */
  raw: string;
}

/** Split a parameter list on top-level commas (generics included). */
function splitParams(src: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of src) {
    if ("(<[".includes(ch)) depth++;
    if (")>]".includes(ch)) depth--;
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

/** A function's parameters, return type, and body (masked and raw). */
function fnSrc(code: string, name: string): RsFnSrc | null {
  const masked = maskRs(code);
  const m = masked.match(new RegExp(`\\bfn\\s+${name}\\s*(?:<[^>]*>)?\\s*\\(([^)]*)\\)\\s*(?:->\\s*([^{]+?))?\\s*\\{`));
  if (!m) return null;
  const open = m.index! + m[0].length - 1;
  const close = matchClose(masked, open);
  const params = splitParams(m[1]).map((p) => {
    const pm = p.match(/^(?:mut\s+)?(\w+)\s*:\s*([\s\S]+)$/);
    return pm ? { name: pm[1], type: pm[2].replace(/\s+/g, " ").trim() } : { name: p, type: "" };
  });
  return {
    params,
    ret: m[2]?.replace(/\s+/g, " ").trim() ?? null,
    body: masked.slice(open + 1, close - 1),
    raw: noComments(code).slice(open + 1, close - 1),
  };
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isStrRef = (t: string) => /^&\s?('\w+ )?str$/.test(t);
const isInt = (t: string) => /^(u|i)(8|16|32|64|128|size)$/.test(t);
const isString = (t: string | null) => t !== null && /^(std::string::)?String$/.test(t);

/** `fn` written another language's way. */
const otherDef = (code: string) => /\b(def|function|func)\s+\w+\s*\(/.test(maskRs(code));

/** The last expression ends in `;` and nothing in the body says `return`. */
function tailSemicolon(fn: RsFnSrc): boolean {
  return tail(fn.body).semicolon && !/\breturn\b/.test(fn.body);
}

/** `use std::collections::{HashMap, …}` (or the glob). */
function imported(code: string, name: string): boolean {
  return new RegExp(
    `\\buse\\s+std\\s*::\\s*collections\\s*::\\s*(?:${name}\\b|\\*|\\{[^}]*\\b${name}\\b[^}]*\\})`,
  ).test(maskRs(code));
}

/** The type is used by its short name but never brought in. */
function missingImport(code: string, name: string): boolean {
  const src = maskRs(code)
    .replace(/^\s*use\s[^;]*;/gm, "")
    .replace(new RegExp(`\\bstd\\s*::\\s*collections\\s*::\\s*${name}\\b`, "g"), "");
  return new RegExp(`\\b${name}\\b`).test(src) && !imported(code, name);
}

type StyleIssue = "otherDef" | "camel" | "noFn";

function styleIssue(code: string, name: string, camel: string): StyleIssue | null {
  if (fnSrc(code, name)) return null;
  if (otherDef(code)) return "otherDef";
  if (new RegExp(`\\bfn\\s+${camel}\\b`, "i").test(maskRs(code))) return "camel";
  return "noFn";
}

function styleMessages(name: string, signature: string): Record<StyleIssue, string> {
  return {
    otherDef: `rust declares functions with \`fn\`: \`${signature} { }\`.`,
    camel: `rust names functions in snake_case — lowercase words joined by underscores. the terminal calls \`${name}\`.`,
    noFn: `i need a function called \`${name}\`: \`${signature} { }\`.`,
  };
}

/** One pattern per issue, then the completion line when the check comes back clean. */
function checkPatterns<K extends string>(check: (code: string) => K | null, messages: Record<K, string>, done: string): CodePattern[] {
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

// ══════════════════════════════════════════════════════════════
//  Chapter 04
// ══════════════════════════════════════════════════════════════

const CH04_SCAFFOLD_DONE =
  "terminal's awake. the schedule reeves photographed is coming through — five guards, four floors.\n\nnow build the roster.\n\n||COMPLETE||";

const ch04Scaffold: StepBank = {
  intro:
    "we're in surveillance. reeves photographed the guard schedule, and this terminal can read it — but it's asleep. wake it: print `Hello World`. `fn main`, one `println!`.",

  conceptFAQ: [
    { keywords: ["print", "output"], response: "`println!(\"Hello World\");` inside `fn main`. it's always the first thing." },
    {
      keywords: ["import", "use", "package", "setup", "skeleton", "scaffold"],
      response: "nothing to bring in yet. `HashMap` joins with `use std::collections::HashMap;` in the next step — add a `use` line when you first need it.",
    },
    {
      keywords: ["hashmap", "map", "set", "roster", "guard"],
      response: "the roster comes next step. right now just wake the terminal.",
    },
    { keywords: ["main", "entry", "start", "fn"], response: "`fn main() { }` is still where it starts. the roster function will sit beside it." },
  ],

  codePatterns: scaffoldPatterns(CH04_SCAFFOLD_DONE),
  correctResponse: CH04_SCAFFOLD_DONE,
  genericWrong: SCAFFOLD_GENERIC,
  rushDialogue: [],
  stuckResponses: [
    "same as every time:\n```\nfn main() {\n    println!(\"Hello World\");\n}\n```",
    "`fn main`, braces, one `println!` with the text in double quotes and a semicolon.",
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

const PAIR_RE = /\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\)/g;

/**
 * Every name → floor pair the roster is built from, repeats kept: tuples in
 * `HashMap::from([...])` or `.insert("Chen", "Floor 1")` calls. Looks in
 * build_roster first, then the whole file (a const array it converts).
 */
function rosterPairs(code: string): [string, string][] {
  const scan = (src: string) => [...src.matchAll(PAIR_RE)].map((m) => [m[1], m[2]] as [string, string]);
  const fn = fnSrc(code, "build_roster");
  const inBody = fn ? scan(fn.raw) : [];
  return inBody.length > 0 ? inBody : scan(noComments(code));
}

/** `{"Chen": "Floor 1"}` — a dict / object literal. */
const dictLiteral = (code: string) => /[{(,[]\s*"[^"]*"\s*:(?!:)/.test(maskRs(code));

type RosterIssue =
  | "dict" | "macro" | StyleIssue | "noImport" | "params" | "noRet" | "notMap" | "lifetime" | "owned"
  | "noMut" | "empty" | "case" | "missing" | "dup" | "spelling" | "floor" | "extra" | "semicolon";

function rosterCheck(code: string): RosterIssue | null {
  if (dictLiteral(code)) return "dict";
  if (/\bhashmap!\s*[[({]/i.test(maskRs(code))) return "macro";
  const style = styleIssue(code, "build_roster", "buildRoster");
  if (style) return style;
  if (missingImport(code, "HashMap")) return "noImport";
  const fn = fnSrc(code, "build_roster")!;
  if (fn.params.length > 0) return "params";
  if (fn.ret === null) return "noRet";
  const ret = fn.ret.replace(/\s+/g, "");
  if (!/^(std::collections::)?HashMap</.test(ret)) return "notMap";
  if (/String/.test(ret)) return "owned";
  if (!/^(std::collections::)?HashMap<&'static str,&'static str>$/.test(fn.ret.replace(/\s*([<>,&])\s*/g, "$1"))) return "lifetime";
  if (/\.\s*insert\s*\(/.test(fn.body) && /\blet\s+(?!mut\b)\w+\s*(?::[^=]*)?=\s*HashMap\s*::\s*new\b/.test(fn.body)) return "noMut";
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
  if (tailSemicolon(fn)) return "semicolon";
  return null;
}

const RET_ROSTER = "-> HashMap<&'static str, &'static str>";

const ROSTER_MESSAGES: Record<RosterIssue, string> = {
  dict:
    "that's a dict literal from another language. rust builds a map from pairs: `HashMap::from([(\"Chen\", \"Floor 1\"), ...])` — round brackets around each pair, a comma between name and floor.",
  macro: "there's no `hashmap!` macro in the standard library. build it from pairs: `HashMap::from([(\"Chen\", \"Floor 1\"), ...])`.",
  ...styleMessages("build_roster", `fn build_roster() ${RET_ROSTER}`),
  noImport:
    "rust can't find `HashMap` — it lives in the standard library, not the prelude. put `use std::collections::HashMap;` at the top of the file.",
  params: "`build_roster` takes nothing — the terminal calls it with empty brackets: `fn build_roster()`.",
  noRet: `your function doesn't say what it hands back. add \`${RET_ROSTER}\` after the brackets.`,
  notMap: `the terminal looks guards up by name, so it needs a \`HashMap\`. return type: \`${RET_ROSTER}\`.`,
  lifetime:
    "`&str` in a return type needs a lifetime — the function takes nothing, so rust can't guess how long the text lives. string literals live forever: `HashMap<&'static str, &'static str>`.",
  owned:
    "`String` only works if you convert every literal — and the next terminal hands you a `HashMap<&str, &str>` anyway. keep the literals as they are: `HashMap<&'static str, &'static str>`.",
  noMut:
    "`insert` changes the map, and rust variables are frozen unless you say otherwise. `let mut roster = HashMap::new();` — or build it in one go with `HashMap::from([...])`.",
  empty:
    "i don't see any pairs. each guard is a tuple, name first, floor second: `(\"Chen\", \"Floor 1\")`, all inside `HashMap::from([ ])`.",
  case: "keys are case-sensitive. the terminal looks guards up by their exact names: `\"Chen\"`, `\"Alvarez\"`, `\"Volkov\"`, `\"Park\"`, `\"Santos\"`.",
  missing: "a guard's missing. the roster needs all five: `Chen`, `Alvarez`, `Volkov`, `Park`, `Santos`.",
  dup: "a name's in there twice. a map keeps one value per key — the second silently replaces the first, and the count comes up short.",
  spelling: "the floors are spelled exactly — capital F, one space, the number: `\"Floor 1\"`.",
  floor:
    "someone's on the wrong floor. `Chen` and `Santos` are on `Floor 1`, `Alvarez` and `Volkov` on `Floor 2`, `Park` on `Floor 3`.",
  extra: "there's a name in there that isn't on the schedule. just the five guards — the terminal counts them.",
  semicolon:
    "the roster never comes back. the last expression in a function, with no semicolon, is its value — drop the `;` after `HashMap::from(...)`, or end with the map's name on its own line.",
};

const CH04_ROSTER_DONE =
  "roster confirmed. i ask for volkov, i get floor 2. five guards, no searching.\n\nnow find me a floor nobody's watching.\n\n||COMPLETE||";

const ch04Guardmap: StepBank = {
  intro:
    "i need every guard and their floor in one place, so i can look anyone up in an instant. write `build_roster()` and have it return a `HashMap<&'static str, &'static str>` — each name paired with a floor:\n\n`\"Chen\"` → `\"Floor 1\"`, `\"Alvarez\"` → `\"Floor 2\"`, `\"Volkov\"` → `\"Floor 2\"`, `\"Park\"` → `\"Floor 3\"`, `\"Santos\"` → `\"Floor 1\"`.",

  conceptFAQ: [
    {
      keywords: ["hashmap", "what is a map", "key", "value", "pair", "map"],
      response: "a `HashMap` pairs keys with values. the name is the key, the floor is the value — ask for a key, get its value back.",
    },
    {
      keywords: ["build", "create", "make", "from", "tuple", "literal", "dict"],
      response: "`HashMap::from([(\"Chen\", \"Floor 1\"), (\"Alvarez\", \"Floor 2\")])` — an array of tuples, the name first, the floor second.",
    },
    {
      keywords: ["use", "import", "where does", "not found", "cannot find", "collections"],
      response: "`HashMap` isn't loaded by default. put `use std::collections::HashMap;` at the top of the file.",
    },
    {
      keywords: ["static", "lifetime", "'static", "&str", "str"],
      response: "`&'static str` is text that lives for the whole program — every string literal does. a function handing back borrowed text has to say how long it lives, and literals live forever.",
    },
    {
      keywords: ["insert", "new", "mut", "one at a time"],
      response: "that works too: `let mut roster = HashMap::new();`, then `roster.insert(\"Chen\", \"Floor 1\");` for each guard, and `roster` on the last line. `HashMap::from` does it in one go.",
    },
    {
      keywords: ["lookup", "look up", "access", "bracket", "get", "option", "panic"],
      response: "`r[\"Volkov\"]` hands back `\"Floor 2\"` — and panics if the name isn't there. `r.get(\"Nobody\")` gives an `Option` instead: `Some(floor)` or `None`.",
    },
    {
      keywords: ["len", "count", "how many", "size", "five"],
      response: "`r.len()` counts the pairs. the terminal expects 5.",
    },
    {
      keywords: ["twice", "duplicate", "same key", "repeat"],
      response: "a key can only appear once. write it twice and the map keeps the last value without a word — and you're a guard short.",
    },
    {
      keywords: ["return", "print", "semicolon"],
      response: "return the map — the last expression, no semicolon. the terminal calls `build_roster()` and does the lookups itself; printing it doesn't hand it over.",
    },
    {
      keywords: ["order"],
      response: "a `HashMap` doesn't keep any order. the terminal asks by name, so it doesn't matter here.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`use std::collections::HashMap;` at the top, then `fn build_roster() -> HashMap<&'static str, &'static str>` with `HashMap::from([...])` and the five pairs inside.",
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
    "not matching. `build_roster()` needs to return a `HashMap` with all five guards.",
    "the terminal looked guards up and didn't get the right floors. check every pair.",
  ],

  rushDialogue: ["we don't have long. build the roster.", "hurry — one map, five guards, returned."],

  stuckResponses: [
    "```\nuse std::collections::HashMap;\n\nfn build_roster() -> HashMap<&'static str, &'static str> {\n    HashMap::from([\n        (\"Chen\", \"Floor 1\"),\n        (\"Alvarez\", \"Floor 2\"),\n        (\"Volkov\", \"Floor 2\"),\n        (\"Park\", \"Floor 3\"),\n        (\"Santos\", \"Floor 1\"),\n    ])\n}\n```",
    "one `use` line, one function, five tuples. name in quotes, comma, floor in quotes — and no semicolon after `HashMap::from(...)`.",
  ],

  deflections: ["focus. the roster first.", "not now — i need to know where every guard is."],
};

// ── chapter-04:clearfloors ──

type ClearIssue =
  | "otherSet" | "roster" | StyleIssue | "params" | "ownedMap" | "mapType" | "topType" | "noRet" | "strRet" | "retType"
  | "vec" | "noSet" | "noImport" | "names" | "noValues" | "copied" | "untyped" | "noLoop" | "fixedTop" | "offByOne"
  | "fromZero" | "noSpace" | "lowercase" | "noFloorName" | "asString" | "inverted" | "noCheck" | "givesUp"
  | "noFallback" | "findOption" | "semicolon";

function clearCheck(code: string): ClearIssue | null {
  if (/(^|[^\w:])set\s*\(|\bnew\s+Set\s*\(/.test(maskRs(code))) return "otherSet";
  if (rosterCheck(code) !== null) return "roster";
  const style = styleIssue(code, "find_clear_floor", "findClearFloor");
  if (style) return style;
  const fn = fnSrc(code, "find_clear_floor")!;
  if (fn.params.length !== 2) return "params";
  const [g, top] = fn.params;
  const mapType = g.type.replace(/\s*([<>,&])\s*/g, "$1");
  if (/^(std::collections::)?HashMap</.test(mapType)) return "ownedMap";
  if (!/^&(std::collections::)?HashMap<&('\w+ )?str,&('\w+ )?str>$/.test(mapType)) return "mapType";
  if (!isInt(top.type)) return "topType";
  if (fn.ret === null) return "noRet";
  if (/^&/.test(fn.ret)) return "strRet";
  if (!isString(fn.ret)) return "retType";

  const body = fn.body;
  if (!/\bHashSet\b/.test(body)) return /\bVec\b|\.\s*contains\s*\(/.test(body) ? "vec" : "noSet";
  if (missingImport(code, "HashSet")) return "noImport";
  const gv = esc(g.name);
  if (new RegExp(`\\b${gv}\\s*\\.\\s*keys\\s*\\(`).test(body)) return "names";
  if (!/\.\s*values\s*\(/.test(body) && !/\.\s*insert\s*\(/.test(body)) return "noValues";
  if (/\.\s*values\s*\(\s*\)\s*\.\s*collect\b/.test(body) && /HashSet\s*<\s*&\s*('\w+\s+)?str\s*>/.test(body)) return "copied";
  if (/\blet\s+(?:mut\s+)?\w+\s*=\s*[^;]*\.\s*collect\s*\(\s*\)\s*;/.test(body)) return "untyped";

  const range = body.match(/\b(\d+)\s*\.\.\s*(=?)\s*([A-Za-z_]\w*|\d+)(\s*\+\s*1\b)?/);
  if (!range) return "noLoop";
  const [, start, inclusive, end, plusOne] = range;
  if (end !== top.name) return "fixedTop";
  if (start === "1") {
    if (!inclusive && !plusOne) return "offByOne";
  } else if (!(start === "0" && !inclusive && !plusOne && /\+\s*1\b/.test(body))) {
    return "fromZero";
  }

  const strs = stringsOf(fn.raw);
  if (!strs.some((s) => /^Floor /.test(s))) {
    if (strs.some((s) => /^Floor/.test(s))) return "noSpace";
    return strs.some((s) => /^floor/i.test(s)) ? "lowercase" : "noFloorName";
  }

  const asked = body.match(/\.\s*contains\s*\(\s*&\s*(\w+)\s*\)/);
  if (asked && !/HashSet\s*<\s*String\s*>/.test(body) && new RegExp(`\\blet\\s+(mut\\s+)?${asked[1]}\\s*(:\\s*String\\s*)?=\\s*format!`).test(body)) {
    return "asString";
  }
  const okCheck = /!\s*[\w.]+\s*\.\s*contains\s*\(/.test(body) || (/\.\s*contains\s*\(/.test(body) && /\bcontinue\b/.test(body));
  if (!okCheck) return /\.\s*contains\s*\(/.test(body) ? "inverted" : "noCheck";
  if (/\belse\s*\{\s*return\b/.test(body)) return "givesUp";

  if (/\.\s*find\s*\(/.test(body) && !/\.\s*(unwrap|unwrap_or|unwrap_or_default|unwrap_or_else|expect)\s*\(|\bmatch\b|\bif\s+let\b/.test(body)) {
    return "findOption";
  }
  if (/\bfor\b/.test(body) && /\breturn\b/.test(body) && body.trim().endsWith("}")) return "noFallback";
  const t = tail(body);
  if (t.semicolon && !/^return\b/.test(t.text) && /^String\s*::|^""|\.to_string\(\)$/.test(t.text)) return "semicolon";
  return null;
}

const CLEAR_SIG = "fn find_clear_floor(guards: &HashMap<&str, &str>, max_floor: u32) -> String";

const CLEAR_MESSAGES: Record<ClearIssue, string> = {
  otherSet: "`set(...)` and `new Set` belong to other languages. rust's set is `HashSet` — `use std::collections::HashSet;`, then collect the floors into one.",
  roster: "keep `build_roster` from the last step, all five guards right — the terminal still calls it to get the real roster.",
  ...styleMessages("find_clear_floor", CLEAR_SIG),
  params: "it takes two things — the roster and the top floor: `guards: &HashMap<&str, &str>, max_floor: u32`.",
  ownedMap: "borrow the roster — add a `&`: `guards: &HashMap<&str, &str>`. the terminal lends it to you, it doesn't hand it over.",
  mapType: "the roster comes in as `&HashMap<&str, &str>` — names to floors, both borrowed text.",
  topType: "`max_floor` is a whole number: `max_floor: u32`.",
  noRet: "your function doesn't say what it hands back. add `-> String` — the floor's name is text you build.",
  strRet:
    "`format!` builds a brand-new `String` inside the function. hand back a `&str` to it and it's gone the moment the function ends — rust refuses. return the `String` itself: `-> String`.",
  retType: "the floor's name comes back as text: `-> String`.",
  vec: "a `Vec` finds the gap too, but it checks every item one by one to answer `contains`. this step is the set: a `HashSet<&str>` holds each floor once and answers instantly.",
  noSet: "collect the occupied floors into a `HashSet`: `let occupied: HashSet<&str> = guards.values().copied().collect();`.",
  noImport: "rust can't find `HashSet`. bring it in beside the map: `use std::collections::HashSet;` — or `use std::collections::{HashMap, HashSet};`.",
  names: "`.keys()` gives you the names. the floors are the values: `guards.values()`.",
  noValues: "get the floors out of the roster first: `guards.values()` walks every floor without the names.",
  copied: "`values()` hands you `&&str` — a borrow of each floor. add `.copied()` before `.collect()` so the set holds plain `&str`s.",
  untyped: "`collect` can build a `Vec`, a set, a `String` — rust needs to know which. name the type: `let occupied: HashSet<&str> = ...`.",
  noLoop: "walk the floors one by one: `for i in 1..=max_floor { }`.",
  fixedTop:
    "loop up to `max_floor`, not a number you picked. the terminal tries a three-floor building too — the top floor has to come from the parameter.",
  offByOne: "`1..max_floor` stops before the top floor, so it never gets checked. add the equals sign: `1..=max_floor`.",
  fromZero: "the floors start at 1. start the range there: `1..=max_floor`.",
  noSpace: "the floor names need a space: `format!(\"Floor {}\", i)`. the roster says `Floor 1`, not `Floor1`.",
  lowercase: "the roster spells it with a capital: `format!(\"Floor {}\", i)`. `floor 1` won't match `Floor 1`.",
  noFloorName: "build each floor's name the way the roster writes it: `format!(\"Floor {}\", i)`.",
  asString: "`contains(&name)` asks with a `&String`, but the set holds `&str`. ask with the text inside: `occupied.contains(name.as_str())`.",
  inverted:
    "that check is backwards — it returns the first floor that has a guard. you want the first one that doesn't: `if !occupied.contains(name.as_str())`.",
  noCheck: "check each floor against the set: `if !occupied.contains(name.as_str()) { return name; }`.",
  givesUp:
    "the `else { return ... }` fires on the very first occupied floor, so you give up after one check. drop the else and let the loop keep going.",
  noFallback: "rust needs an answer for every path — what if every floor's taken? after the loop, end with `String::new()`.",
  findOption: "`find` hands back an `Option` — there might be no clear floor at all. give it a fallback: `.unwrap_or_default()`.",
  semicolon: "drop the semicolon on the last line. with it, the function hands back nothing — without it, that's the answer.",
};

const CH04_CLEAR_DONE = "floor 4 is clear. that's our window. forty minutes.\n\n||COMPLETE||";

const ch04Clearfloors: StepBank = {
  intro:
    "now find the one floor nobody is watching — that's where i move next. write `find_clear_floor(guards: &HashMap<&str, &str>, max_floor: u32) -> String`: put every floor that has a guard into a `HashSet`, then check `Floor 1` up to `Floor max_floor` and return the first one that isn't in it.",

  conceptFAQ: [
    {
      keywords: ["hashset", "set", "what is a set", "why set"],
      response: "a set holds each thing once and answers `contains` instantly. `use std::collections::HashSet;` brings it in.",
    },
    {
      keywords: ["values", "floors", "just the floors", ".values"],
      response: "`guards.values()` walks every value in the map — the floors — without the names. `guards.keys()` would be the names.",
    },
    {
      keywords: ["collect", "copied", "turn into", "&&str", "build the set"],
      response: "`let occupied: HashSet<&str> = guards.values().copied().collect();` — `copied` turns each `&&str` into a plain `&str`, `collect` builds whatever type you named.",
    },
    {
      keywords: ["vec", "list", "why not a vec"],
      response: "a `Vec` works, but it checks every item one by one to answer `contains`. a set jumps straight to the answer — and drops the repeats.",
    },
    {
      keywords: ["contains", "membership", "check", "not in", "as_str"],
      response: "`!occupied.contains(name.as_str())` — true when nobody's on that floor. `as_str` lends the set the text inside your `String`.",
    },
    {
      keywords: ["range", "loop", "1 to", "max_floor", "..="],
      response: "`for i in 1..=max_floor { }` — the `=` includes the top floor. `1..max_floor` stops one short.",
    },
    {
      keywords: ["format", "name", "floor name", "string"],
      response: "`format!(\"Floor {}\", i)` — like `println!`, but it hands the text back as a `String` instead of printing it. capital F, one space.",
    },
    {
      keywords: ["after the loop", "string::new", "every path", "fallback", "not all paths", "mismatched types"],
      response: "rust wants an answer for every path, even the one where every floor is taken. after the loop, `String::new()` — an empty string.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "build `occupied` from `guards.values()`, loop `1..=max_floor`, build `format!(\"Floor {}\", i)`, return the first one the set doesn't contain, and `String::new()` after the loop.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => /^Floor 0$/m.test(out),
      response: "`Floor 0` — your range starts at 0. the floors start at 1: `1..=max_floor`.",
    },
    {
      match: (out) => out.trim() === "Floor 1\nFloor 1\nFloor 1",
      response:
        "`Floor 1` every time — the check never sees a guard. make sure the set holds the floors (`guards.values()`, not the names) and you return the floor it doesn't contain.",
    },
    {
      match: (out) => out.trim() === "Floor 2",
      response: "the top floor never gets checked — `1..max_floor` stops one short. `1..=max_floor`.",
    },
    {
      match: (out) => /^Floor\d/m.test(out),
      response: "the names need a space — `format!(\"Floor {}\", i)`. `Floor1` doesn't match the roster's `Floor 1`, so every floor looks empty.",
    },
  ],

  codePatterns: checkPatterns(clearCheck, CLEAR_MESSAGES, CH04_CLEAR_DONE),
  correctResponse: CH04_CLEAR_DONE,

  genericWrong: [
    "not matching. build the set of occupied floors, walk 1 to `max_floor`, return the first gap.",
    "the terminal tries different rosters and floor counts. the logic has to work for any of them, not just ours.",
  ],

  rushDialogue: ["reeves is waiting. find the clear floor.", "the window is closing. finish the function."],

  stuckResponses: [
    "```\nuse std::collections::HashSet;\n\nfn find_clear_floor(guards: &HashMap<&str, &str>, max_floor: u32) -> String {\n    let occupied: HashSet<&str> = guards.values().copied().collect();\n    for i in 1..=max_floor {\n        let name = format!(\"Floor {}\", i);\n        if !occupied.contains(name.as_str()) {\n            return name;\n        }\n    }\n    String::new()\n}\n```",
    "three moves: a set of the occupied floors, a loop from 1 to the top, return the first floor the set doesn't contain. then `String::new()` for the path where none is clear.",
  ],

  deflections: ["focus. i need the clear floor.", "not now — find me a floor nobody's watching."],
};

// ══════════════════════════════════════════════════════════════
//  Chapter 04.2
// ══════════════════════════════════════════════════════════════

const CH04_2_SCAFFOLD_DONE =
  "relay terminal online. nothing to import — every string already knows `chars`, `split_whitespace` and `parse`.\n\nnow build the cipher.\n\n||COMPLETE||";

const ch04_2Scaffold: StepBank = {
  intro:
    "the comms room. ghost's keyword sweep comes around every thirty seconds, and i need this terminal online before the next one. print `Hello World`.",

  conceptFAQ: [
    { keywords: ["print", "output"], response: "`println!(\"Hello World\");` inside `fn main`. one line." },
    {
      keywords: ["import", "use", "package", "strings", "setup", "skeleton", "scaffold"],
      response: "nothing to import. `chars`, `split_whitespace`, `join` and `parse` are methods every string already has.",
    },
    { keywords: ["cipher", "reverse", "encode", "scramble"], response: "the cipher comes next. get the terminal online first." },
    { keywords: ["main", "entry", "start", "fn"], response: "`fn main() { }` — same as always." },
  ],

  codePatterns: scaffoldPatterns(CH04_2_SCAFFOLD_DONE),
  correctResponse: CH04_2_SCAFFOLD_DONE,
  genericWrong: SCAFFOLD_GENERIC,
  rushDialogue: [],
  stuckResponses: [
    "```\nfn main() {\n    println!(\"Hello World\");\n}\n```",
    "`fn main`, braces, `println!` with the text in double quotes. before the sweep.",
  ],
  deflections: ["terminal first. one line, before the sweep."],
};

// ── chapter-04.2:reverseword ──

type ReverseIssue =
  | "jsSplit" | "pySlice" | StyleIssue | "params" | "ownedParam" | "paramType" | "noRet" | "strRet" | "retType"
  | "revOnStr" | "strReverse" | "bytes" | "noChars" | "noRev" | "noCollect" | "prints" | "semicolon";

function reverseCheck(code: string): ReverseIssue | null {
  const src = noComments(code);
  if (/\.\s*split\s*\(\s*""\s*\)/.test(src)) return "jsSplit";
  if (/\[\s*::\s*-\s*1\s*\]/.test(maskRs(code))) return "pySlice";
  const style = styleIssue(code, "reverse_word", "reverseWord");
  if (style) return style;
  const fn = fnSrc(code, "reverse_word")!;
  if (fn.params.length !== 1) return "params";
  const [p] = fn.params;
  if (/^(&\s?)?String$/.test(p.type)) return "ownedParam";
  if (!isStrRef(p.type)) return "paramType";
  if (fn.ret === null) return "noRet";
  if (/^&/.test(fn.ret)) return "strRet";
  if (!isString(fn.ret)) return "retType";
  const body = fn.body;
  const pv = esc(p.name);
  if (new RegExp(`\\b${pv}\\s*\\.\\s*rev\\s*\\(`).test(body)) return "revOnStr";
  if (new RegExp(`\\b${pv}\\s*\\.\\s*reverse\\s*\\(`).test(body)) return "strReverse";
  if (/\.\s*(bytes|as_bytes)\s*\(/.test(body)) return "bytes";
  if (!/\.\s*chars\s*\(/.test(body)) return "noChars";
  if (!/\.\s*rev\s*\(|\.\s*reverse\s*\(|\.\s*insert\s*\(\s*0\b/.test(body)) return "noRev";
  if (!/\.\s*collect\b|\bfrom_iter\b|\.\s*push\s*\(|\.\s*insert\s*\(|\.\s*extend\s*\(/.test(body)) return "noCollect";
  if (/\bprintln!/.test(body) && tail(body).semicolon && !/\breturn\b/.test(body)) return "prints";
  if (tailSemicolon(fn)) return "semicolon";
  return null;
}

const REVERSE_MESSAGES: Record<ReverseIssue, string> = {
  jsSplit: "`split(\"\")` is javascript's way of getting letters. a rust string walks its own characters: `s.chars()`.",
  pySlice: "`[::-1]` is python's slice. rust has no step slicing — walk the characters backwards: `s.chars().rev()`.",
  ...styleMessages("reverse_word", "fn reverse_word(s: &str) -> String"),
  params: "it takes one thing — the word: `fn reverse_word(s: &str) -> String`.",
  ownedParam: "the terminal passes a string literal — that's a `&str`, borrowed text. take `s: &str`, not a `String`.",
  paramType: "the word comes in as borrowed text: `s: &str`.",
  noRet: "your function doesn't say what it hands back. add `-> String` — the reversed word is new text.",
  strRet:
    "the reversed word is brand-new text, built inside the function — you can't hand back a `&str` to it once the function ends. return the `String`: `-> String`.",
  retType: "the reversed word comes back as text: `-> String`.",
  revOnStr: "a `&str` can't be walked backwards on its own — `.rev()` needs an iterator. get one first: `s.chars().rev()`.",
  strReverse: "strings have no `.reverse()` — that's for a `Vec`, and it flips in place. walk the characters backwards instead: `s.chars().rev().collect()`.",
  bytes:
    "bytes aren't letters. rust strings are utf-8 — a letter like `é` takes two bytes, and flipping bytes splits it in half. `chars()` walks whole characters.",
  noChars: "walk the word one character at a time: `s.chars()`.",
  noRev: "`chars()` walks the word forwards. `.rev()` turns it around: `s.chars().rev()`.",
  noCollect: "`rev()` hands you an iterator, not a word. gather it up with `.collect()` — the `-> String` tells it what to build.",
  prints: "printing isn't returning. the terminal prints what comes back — end the function with `s.chars().rev().collect()`, no semicolon.",
  semicolon: "drop the semicolon after the last line. with it, the function hands back nothing — without it, the reversed word is the answer.",
};

const CH04_2_REVERSE_DONE = "`olleh`... `oG`... the cipher works. one word at a time.\n\n||COMPLETE||";

const ch04_2Reverseword: StepBank = {
  intro:
    "ghost's scanners read every word on this relay. scramble a word and they can't recognise it. write `reverse_word(s: &str) -> String` that returns the word backwards — `hello` comes back `olleh`.",

  conceptFAQ: [
    {
      keywords: ["chars", "character", "letter", "walk"],
      response: "`s.chars()` walks the word one character at a time.",
    },
    {
      keywords: ["rev", "backwards", "reverse", "flip"],
      response: "`.rev()` walks an iterator from the end instead. `s.chars().rev()` is the word, last letter first.",
    },
    {
      keywords: ["collect", "back into", "string", "turn into"],
      response: "`collect()` gathers the characters up. the return type `-> String` tells it what to build.",
    },
    {
      keywords: ["change", "modify", "in place", "immutable", "&str", "borrow"],
      response: "a `&str` is borrowed text you can only read. you don't flip it — you build a new `String` and return it.",
    },
    {
      keywords: ["bytes", "unicode", "utf", "emoji", "rune"],
      response: "rust strings are utf-8. a letter like `é` takes two bytes — flip bytes and you split it in half. `chars()` walks whole characters.",
    },
    {
      keywords: ["return", "print", "semicolon"],
      response: "the last expression, no semicolon, is what comes back. the terminal calls `reverse_word` and prints the result itself.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`fn reverse_word(s: &str) -> String { s.chars().rev().collect() }`. one line inside.",
    },
  ],

  outputPatterns: [
    {
      match: (out) => out.trim() === "hello\nGo\na",
      response: "that's the same word back. walk it from the end: `s.chars().rev()`.",
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
    "```\nfn reverse_word(s: &str) -> String {\n    s.chars().rev().collect()\n}\n```",
    "characters, reversed, collected. `chars`, `rev`, `collect` — and no semicolon, so it's the return value.",
  ],

  deflections: ["focus. one word, backwards.", "not now — i need the word cipher working before the sweep."],
};

// ── chapter-04.2:encode ──

type EncodeIssue =
  | "jsSplit" | "reverse" | StyleIssue | "params" | "ownedParam" | "paramType" | "noRet" | "strRet" | "retType"
  | "whole" | "noSplit" | "listReversed" | "noReverse" | "untyped" | "iterJoin" | "vecStr"
  | "collectString" | "concat" | "noJoin" | "joinChar" | "joinEmpty" | "joinSep" | "semicolon";

function encodeCheck(code: string): EncodeIssue | null {
  const enc = fnSrc(code, "encode");
  if (enc && /\.\s*split\s*\(\s*""\s*\)/.test(enc.raw)) return "jsSplit";
  if (reverseCheck(code) !== null) return "reverse";
  const style = styleIssue(code, "encode", "encode");
  if (style) return style;
  const fn = enc!;
  if (fn.params.length !== 1) return "params";
  const [p] = fn.params;
  if (/^(&\s?)?String$/.test(p.type)) return "ownedParam";
  if (!isStrRef(p.type)) return "paramType";
  if (fn.ret === null) return "noRet";
  if (/^&/.test(fn.ret)) return "strRet";
  if (!isString(fn.ret)) return "retType";

  const body = fn.body;
  const pv = esc(p.name);
  if (!/\.\s*split(_whitespace|_ascii_whitespace)?\s*\(/.test(body)) {
    return new RegExp(`\\breverse_word\\s*\\(\\s*&?\\s*${pv}\\s*\\)|\\b${pv}\\s*\\.\\s*chars\\s*\\(`).test(body) ? "whole" : "noSplit";
  }
  if (/\.\s*split\w*\s*\([^)]*\)\s*\.\s*rev\s*\(/.test(body)) return "listReversed";
  const words = body.match(/\blet\s+(?:mut\s+)?(\w+)[^=;]*=\s*[^;]*\.\s*split\w*\s*\(/)?.[1];
  if (words && new RegExp(`\\b${words}\\s*\\.\\s*reverse\\s*\\(`).test(body)) return "listReversed";
  if (!/\breverse_word\b/.test(body) && !/\.\s*chars\s*\(/.test(body)) return "noReverse";
  if (/\.\s*collect\s*\(\s*\)\s*\.\s*join\s*\(/.test(body)) return "untyped";
  if (/\.\s*map\s*\((?:[^()]|\([^()]*\))*\)\s*\.\s*join\s*\(/.test(body)) return "iterJoin";
  if (body.split(";").some((s) => /\breverse_word\b/.test(s) && /Vec\s*<\s*&\s*('\w+\s+)?str\s*>/.test(s))) return "vecStr";

  if (!/\.\s*join\s*\(/.test(body)) {
    if (/collect\s*::\s*<\s*String\s*>|:\s*String\s*=[^;]*\.\s*collect\b/.test(body)) return "collectString";
    if (/\.\s*push_str\s*\(/.test(body)) {
      return /\.\s*is_empty\s*\(|\.\s*trim(_end|_start)?\s*\(/.test(body) ? (tailSemicolon(fn) ? "semicolon" : null) : "concat";
    }
    return "noJoin";
  }
  const raw = fn.raw;
  if (/\.\s*join\s*\(\s*'/.test(raw)) return "joinChar";
  if (/\.\s*join\s*\(\s*""\s*\)/.test(raw)) return "joinEmpty";
  if (!/\.\s*join\s*\(\s*" "\s*\)/.test(raw)) return "joinSep";
  if (tailSemicolon(fn)) return "semicolon";
  return null;
}

const ENCODE_MESSAGES: Record<EncodeIssue, string> = {
  jsSplit: "`split(\"\")` breaks the message into letters, not words. words come from `msg.split_whitespace()`.",
  reverse: "keep `reverse_word` from the last step working — `encode` leans on it for every word.",
  ...styleMessages("encode", "fn encode(msg: &str) -> String"),
  params: "it takes one thing — the message: `fn encode(msg: &str) -> String`.",
  ownedParam: "take `msg: &str`, not a `String` — the terminal lends you borrowed text, and `encode(&encode(...))` lends it again.",
  paramType: "the message comes in as borrowed text: `msg: &str`.",
  noRet: "your function doesn't say what it hands back. add `-> String`.",
  strRet: "the encoded message is brand-new text, so it has to come back as a `String`: `-> String`.",
  retType: "the encoded message comes back as text: `-> String`.",
  whole:
    "that reverses the whole message, so the words swap places too. split it into words first — `msg.split_whitespace()` — and reverse each one on its own.",
  noSplit: "break the message into words first: `msg.split_whitespace()`.",
  listReversed:
    "that reverses the order of the words, not the words — they swap places but stay readable. reverse each word: `.map(reverse_word)`.",
  noReverse: "every word needs reversing on its way through: `.map(reverse_word)`.",
  untyped: "`collect()` can build many things, so `.join` doesn't know what it's joining. name it: `.collect::<Vec<String>>().join(\" \")`.",
  iterJoin: "`join` lives on a `Vec`, not on an iterator. collect first: `.map(reverse_word).collect::<Vec<String>>().join(\" \")`.",
  vecStr: "`reverse_word` hands back `String`s, not `&str`s — collect them into a `Vec<String>`.",
  collectString: "collecting straight into a `String` glues the words with nothing in between. collect into a `Vec<String>`, then `.join(\" \")`.",
  concat: "building it with `push_str` leaves a stray space on one end. collect the words and `.join(\" \")` — spaces only between them.",
  noJoin: "glue the reversed words back into one line: `.join(\" \")`.",
  joinChar: "`join` takes text, not a character — double quotes: `.join(\" \")`.",
  joinEmpty: "`.join(\"\")` glues them with nothing in between — the words run together. use a space: `.join(\" \")`.",
  joinSep: "join with a single space: `.join(\" \")`. whatever's in the quotes goes between every word.",
  semicolon: "drop the semicolon after the last line. with it, the function hands back nothing — without it, the joined message is the answer.",
};

const CH04_2_ENCODE_DONE =
  "`roolf si raelc`. and twice through, it comes back clean — reeves can decode on her end.\n\n||COMPLETE||";

const ch04_2Encode: StepBank = {
  intro:
    "one word isn't a message. scramble whole messages — and prove reeves can unscramble them on her end. write `encode(msg: &str) -> String`: split it into words, reverse each with `reverse_word`, join them back with spaces. run it twice and the original comes back.",

  conceptFAQ: [
    {
      keywords: ["split", "words", "break", "whitespace"],
      response: "`msg.split_whitespace()` walks the words, skipping any run of spaces between them.",
    },
    {
      keywords: ["map", "each word", "every word", "reverse each", "apply"],
      response: "`.map(reverse_word)` runs your function on each word — you can pass a function by name.",
    },
    {
      keywords: ["join", "glue", "combine", "back together"],
      response: "collect the words into a `Vec<String>`, then `.join(\" \")` puts a space between each.",
    },
    {
      keywords: ["collect", "vec", "turbofish", "::<", "type annotations"],
      response: "`collect` can build many things, so say which: `.collect::<Vec<String>>()`. the `::<...>` is how you name the type mid-chain.",
    },
    {
      keywords: ["loop", "for", "push"],
      response: "a loop works — push each reversed word into a `Vec`, then join. the chain `split_whitespace().map(reverse_word)` says the same thing in one line.",
    },
    {
      keywords: ["round trip", "twice", "decode", "encode(&encode"],
      response: "reverse a word twice and it's back where it started. so encoding twice gives the original — that's how reeves decodes.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`msg.split_whitespace().map(reverse_word).collect::<Vec<String>>().join(\" \")` — one chain, returned with no semicolon.",
    },
  ],

  outputPatterns: [
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
      response: "the words ran together. join them with a space: `.join(\" \")`.",
    },
    {
      match: (out) => {
        const first = out.split("\n")[0];
        return first.trim() === "roolf si raelc" && first !== first.trim();
      },
      response: "there's a stray space on one end. `.join(\" \")` puts spaces only between the words.",
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
    "```\nfn encode(msg: &str) -> String {\n    msg.split_whitespace()\n        .map(reverse_word)\n        .collect::<Vec<String>>()\n        .join(\" \")\n}\n```",
    "split, reverse each, join. `split_whitespace()`, `.map(reverse_word)`, collect into a `Vec<String>`, `.join(\" \")`.",
  ],

  deflections: ["focus. the whole message needs scrambling.", "not now — the intercept's live. encode first."],
};

// ── chapter-04.2:relayheader ──

type HeaderIssue =
  | "pyInt" | "jsParse" | "tryCatch" | StyleIssue | "params" | "ownedCode" | "codeType" | "noRet" | "strRet" | "retType"
  | "cast" | "repeat" | "noParse" | "float" | "unwrap" | "unwrapOr" | "question" | "untyped" | "resultMath"
  | "noErrArm" | "noHandle" | "noErr" | "errNoFloor" | "noDouble" | "noC" | "semicolon";

function headerCheck(code: string): HeaderIssue | null {
  const masked = maskRs(code);
  if (/(^|[^\w.:])int\s*\(/.test(masked)) return "pyInt";
  if (/\b(parseInt|Number)\s*\(/.test(masked)) return "jsParse";
  if (/\btry\s*[:{]|\bcatch\s*[({]|\bexcept\b/.test(masked)) return "tryCatch";
  const style = styleIssue(code, "relay_header", "relayHeader");
  if (style) return style;
  const fn = fnSrc(code, "relay_header")!;
  if (fn.params.length !== 2) return "params";
  const c = fn.params[1];
  if (/^(&\s?)?String$/.test(c.type)) return "ownedCode";
  if (!isStrRef(c.type)) return "codeType";
  if (fn.ret === null) return "noRet";
  if (/^&/.test(fn.ret)) return "strRet";
  if (!isString(fn.ret)) return "retType";

  const body = fn.body;
  const cv = esc(c.name);
  if (new RegExp(`\\b${cv}\\s+as\\s+[iuf]\\d`).test(body)) return "cast";
  if (!/\.\s*parse\b/.test(body)) {
    return new RegExp(`\\b${cv}\\s*\\*|\\*\\s*${cv}\\b`).test(body) ? "repeat" : "noParse";
  }
  if (/parse\s*::\s*<\s*f(32|64)\s*>|:\s*f(32|64)\b|Result\s*<\s*f(32|64)/.test(body)) return "float";
  if (/\.\s*(unwrap|expect)\s*\(/.test(body)) return "unwrap";
  if (/\.\s*(unwrap_or|unwrap_or_default)\s*\(/.test(body)) return "unwrapOr";
  if (/\)\s*\?/.test(body)) return "question";
  if (/\.\s*parse\s*\(\s*\)/.test(body) && !/\blet\s+(mut\s+)?\w+\s*:\s*[iu](8|16|32|64|128|size)\b|\bOk\s*::\s*<|Result\s*<\s*[iu](8|16|32|64|128|size)\b/.test(body)) {
    return "untyped";
  }
  if (/\.\s*parse\s*(::\s*<\s*\w+\s*>)?\s*\(\s*\)\s*\*/.test(body)) return "resultMath";
  const hasOk = /\bOk\s*\(/.test(body);
  if (/\bmatch\b/.test(body) && hasOk && !/\bErr\b/.test(body) && !/\b_\s*=>/.test(body)) return "noErrArm";
  const handled =
    (hasOk && (/\bErr\b/.test(body) || /\b_\s*=>/.test(body) || /\belse\b/.test(body))) ||
    /\.\s*(map_or|map_or_else|unwrap_or_else)\s*\(/.test(body) ||
    (/\bSome\s*\(/.test(body) && /\.\s*ok\s*\(/.test(body) && /\belse\b|\bNone\b|\b_\s*=>/.test(body));
  if (!handled) return "noHandle";

  const strs = stringsOf(fn.raw);
  const errs = strs.filter((s) => /ERR/.test(s));
  if (errs.length === 0) return "noErr";
  if (!errs.some((s) => /F\{[^}]*\}-ERR/.test(s))) return "errNoFloor";
  if (!/\*\s*2\b|\b2\s*\*|\b(\w+)\s*\+\s*\1\b/.test(body)) return "noDouble";
  if (!strs.some((s) => /F\{[^}]*\}-C\{/.test(s))) return "noC";
  if (tailSemicolon(fn)) return "semicolon";
  return null;
}

const HEADER_SIG = "fn relay_header(floor: u32, code: &str) -> String";
const MATCH_SHAPE = "`match code.parse::<i32>() { Ok(n) => ..., Err(_) => ... }`";

const HEADER_MESSAGES: Record<HeaderIssue, string> = {
  pyInt: "`int(code)` is python. rust turns text into a number with `code.parse::<i32>()`.",
  jsParse: "that's javascript's number parsing. rust: `code.parse::<i32>()` — and it tells you when it fails.",
  tryCatch: `rust has no try/catch. \`parse\` hands back a \`Result\` — open it with a match: ${MATCH_SHAPE}.`,
  ...styleMessages("relay_header", HEADER_SIG),
  params: "it takes two things — the floor and the code: `floor: u32, code: &str`.",
  ownedCode: "the terminal passes the code as a literal — a `&str`. take `code: &str`, not a `String`.",
  codeType: "the code arrives as text: `code: &str`.",
  noRet: "your function doesn't say what it hands back. add `-> String` — the header is text you build.",
  strRet: "`format!` builds a brand-new `String`, so the header has to come back as one: `-> String`.",
  retType: "the header comes back as text: `-> String`.",
  cast: "`as` converts between number types — it can't read text. parse it: `code.parse::<i32>()`.",
  repeat: "`code` is still text — rust won't multiply text. turn it into a number first: `code.parse::<i32>()`.",
  noParse: "`code` arrives as text. turn it into a number with `code.parse::<i32>()` before you double it.",
  float: "the code is a whole number — parse it as one: `code.parse::<i32>()`.",
  unwrap: `\`unwrap\` promises the parse can't fail — and on \`"abc"\` it panics and the relay goes down. match on the \`Result\` instead: ${MATCH_SHAPE}.`,
  unwrapOr: "`unwrap_or` turns a bad code into a number, so `\"abc\"` goes out as `C0`. it should bounce: `Err(_) => format!(\"F{}-ERR\", floor)`.",
  question:
    "`?` hands the error up to whoever called — but `relay_header` returns a `String`, not a `Result`, so there's nowhere to send it. handle it right here with a `match`.",
  untyped: "`parse` can make any number type, so rust needs to know which. say it: `code.parse::<i32>()`.",
  resultMath: `\`parse\` hands back a \`Result\`, not a number — you can't double a \`Result\`. look inside first: ${MATCH_SHAPE}.`,
  noErrArm: "the match only handles `Ok`. rust won't compile until every case is covered — add `Err(_) => format!(\"F{}-ERR\", floor),`.",
  noHandle: `\`parse\` gives you a \`Result\` — open it before you use the number: ${MATCH_SHAPE}.`,
  noErr: "on a bad code the header ends in `-ERR`: `F3-ERR`. that's the `Err` arm's answer.",
  errNoFloor: "the error header still needs the floor in front: `format!(\"F{}-ERR\", floor)` gives `F3-ERR`.",
  noDouble: "the relay doubles the code as a checksum — `\"50\"` goes out as `C100`. multiply the number by 2.",
  noC: "the header reads `F2-C100`: `F`, the floor, `-C`, then the doubled code. `format!(\"F{}-C{}\", floor, n * 2)`.",
  semicolon: "drop the semicolon after the `match` — the match is the answer, and with the `;` the function hands back nothing.",
};

const CH04_2_HEADER_DONE =
  "`F2-C100`. `F3-ERR`. `F1-C50`. headers confirmed — bad codes bounce, good ones go through. the relay is live.\n\n||COMPLETE||";

const headerOutputs: OutputPattern[] = [
  {
    match: (out) => out.trim() === "F2-ERR\nF3-ERR\nF1-ERR",
    response: "every header came back `ERR`, even the good codes. check the arms — `Ok(n)` builds the `-C` header, only `Err(_)` gives `-ERR`.",
  },
  {
    match: (out) => /^F3-C0$/m.test(out),
    response: "a bad code came through as `C0`. it should bounce: `Err(_) => format!(\"F{}-ERR\", floor)`.",
  },
  {
    match: (out) => /^F2-C50$/m.test(out),
    response: "`C50` — the code isn't doubled. the relay wants `n * 2`.",
  },
];

const ch04_2Relayheader: StepBank = {
  intro:
    "last piece. every message gets stamped with where it's going, and the relay can't choke on garbage. write `relay_header(floor: u32, code: &str) -> String`: floor 2 with code `\"50\"` becomes `F2-C100` — the code doubled. `code` is text, so turn it into a number with `code.parse::<i32>()`. it hands back a `Result` — if it isn't a number, return `F3-ERR` for floor 3 instead of crashing.",

  conceptFAQ: [
    {
      keywords: ["parse", "convert", "string to int", "number", "text to number", "i32"],
      response: "`code.parse::<i32>()` — the `::<i32>` says which number type you want back.",
    },
    {
      keywords: ["result", "what does parse give", "ok", "err"],
      response: "a `Result`: `Ok(50)` when it worked, `Err(...)` when the text isn't a number. you have to look inside before you can use the number.",
    },
    {
      keywords: ["match", "handle", "both cases", "arms", "error"],
      response: `${MATCH_SHAPE} — one arm each. rust won't let you forget the error arm.`,
    },
    {
      keywords: ["unwrap", "expect", "panic", "crash"],
      response: "unwrap means \"i promise it's fine\" — and on `\"abc\"` it panics and the relay goes down. the match keeps it running.",
    },
    {
      keywords: ["?", "question mark", "try", "catch", "exception"],
      response: "rust has no exceptions. errors are values — a `Result` — and you deal with them where they happen. `?` would pass it up, but this function returns a `String`, so match it here.",
    },
    {
      keywords: ["*2", "* 2", "double", "multiply", "times two", "why"],
      response: "the relay doubles the code as a checksum. the scanner expects it.",
    },
    {
      keywords: ["format", "header", "build", "string"],
      response: "`format!(\"F{}-C{}\", floor, n * 2)` — the floor and the doubled code drop into the slots, and you get a `String` back.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "`match code.parse::<i32>()`, with `Ok(n) => format!(\"F{}-C{}\", floor, n * 2),` and `Err(_) => format!(\"F{}-ERR\", floor),`. the match is the last expression — no semicolon.",
    },
  ],

  outputPatterns: headerOutputs,

  codePatterns: checkPatterns(headerCheck, HEADER_MESSAGES, CH04_2_HEADER_DONE),
  correctResponse: CH04_2_HEADER_DONE,

  genericWrong: [
    "not matching. parse the code, `F<floor>-ERR` when it fails, `F<floor>-C<double>` when it doesn't.",
    "check the format: `F2-C100`, and `F3-ERR` for a bad code.",
  ],

  rushDialogue: ["scanner sweep in thirty seconds. finish the headers.", "no time — parse it, match the `Result`, return the header."],

  stuckResponses: [
    "```\nfn relay_header(floor: u32, code: &str) -> String {\n    match code.parse::<i32>() {\n        Ok(n) => format!(\"F{}-C{}\", floor, n * 2),\n        Err(_) => format!(\"F{}-ERR\", floor),\n    }\n}\n```",
    "parse into a `Result`, one match arm for each side, and build the header with `format!`.",
  ],

  deflections: ["focus. the headers, before the sweep.", "not now — i need those headers stamped."],
};

// ── Registry ──

export const RUST_ACT2_BANKS: Record<string, StepBank> = {
  "chapter-04:scaffold": ch04Scaffold,
  "chapter-04:guardmap": ch04Guardmap,
  "chapter-04:clearfloors": ch04Clearfloors,
  "chapter-04.2:scaffold": ch04_2Scaffold,
  "chapter-04.2:reverseword": ch04_2Reverseword,
  "chapter-04.2:encode": ch04_2Encode,
  "chapter-04.2:relayheader": ch04_2Relayheader,
};
