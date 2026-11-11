// ── JavaScript Zen ──
// Idiom coaching for Acts I–III in JavaScript, under the shared step ids. Same
// contract as the Go rules in zen.ts: `check` is a robust heuristic over the
// code's shape (comments and string contents scrubbed first), `isRelevant`
// keeps a rule quiet when the player's code has nothing for it to judge.
// Pure functions only.

import { tokenize } from "@/lib/javascript/tokenizer";
import type { Token } from "@/lib/lang/types";
import type { ZenRule } from "./zen";

// ══════════════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════════════

/** Tokens without comments. */
function codeTokens(code: string): Token[] {
  return tokenize(code).filter((t) => t.type !== "comment");
}

/**
 * The source with comments removed and every string literal emptied to its
 * quotes (`"…"` → `""`), so braces, keywords and `+` inside text can't fool a
 * structural check. Line breaks outside literals are preserved.
 */
function scrub(code: string): string {
  let out = "";
  let pos = 0;
  for (const t of tokenize(code)) {
    out += code.slice(pos, t.start);
    if (t.type === "comment") {
      out += t.value.startsWith("/*") ? t.value.replace(/[^\n]/g, " ") : "";
    } else if (t.type === "string") {
      out += t.value[0] + t.value[0];
    } else {
      out += t.value;
    }
    pos = t.end;
  }
  return out + code.slice(pos);
}

/** Index of the bracket closing the one at `open` (same kind), or -1. */
function matchBracket(src: string, open: number): number {
  const opener = src[open];
  const closer = opener === "(" ? ")" : opener === "{" ? "}" : "]";
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === opener) depth++;
    else if (src[i] === closer) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

interface FuncShape {
  params: string;
  body: string;
}

interface FuncSpan {
  paramsStart: number;
  paramsEnd: number;
  bodyStart: number;
  bodyEnd: number;
}

/**
 * Locate a function by name in `src` — `function name(...) {}`,
 * `const name = function (...) {}` or `const name = (...) => ...` — as offsets
 * of its parameter list and body. Expression-bodied arrows span the expression.
 */
function locateFunction(src: string, name: string): FuncSpan | null {
  const forms = [
    new RegExp(`\\bfunction\\s+${name}\\s*\\(`),
    new RegExp(`\\b(?:const|let|var)\\s+${name}\\s*=\\s*(?:async\\s+)?function\\b[^(]*\\(`),
    new RegExp(`\\b(?:const|let|var)\\s+${name}\\s*=\\s*(?:async\\s*)?\\(`),
  ];
  for (const form of forms) {
    const m = form.exec(src);
    if (!m) continue;
    const open = m.index + m[0].length - 1;
    const close = matchBracket(src, open);
    if (close === -1) return null;
    let at = close + 1;
    const arrow = src.slice(at).match(/^\s*=>\s*/);
    if (arrow) at += arrow[0].length;
    const lead = src.slice(at).match(/^\s*/)![0].length;
    if (src[at + lead] === "{") {
      const end = matchBracket(src, at + lead);
      return { paramsStart: open + 1, paramsEnd: close, bodyStart: at + lead + 1, bodyEnd: end === -1 ? src.length : end };
    }
    if (arrow) {
      const end = src.slice(at).search(/;|\n/);
      return { paramsStart: open + 1, paramsEnd: close, bodyStart: at, bodyEnd: end === -1 ? src.length : at + end };
    }
    return null;
  }
  return null;
}

/**
 * Find a function by name and return its parameter list and body (scrubbed).
 * Expression-bodied arrows return the expression as the body.
 */
function findFunction(code: string, name: string): FuncShape | null {
  const src = scrub(code);
  const span = locateFunction(src, name);
  if (!span) return null;
  return { params: src.slice(span.paramsStart, span.paramsEnd), body: src.slice(span.bodyStart, span.bodyEnd) };
}

/**
 * Like `scrub`, but position-preserving: comments and string contents become
 * spaces (line breaks kept), so offsets found here index the original code.
 */
function mask(code: string): string {
  let out = "";
  let pos = 0;
  for (const t of tokenize(code)) {
    out += code.slice(pos, t.start);
    if (t.type === "comment") {
      out += t.value.replace(/[^\n]/g, " ");
    } else if (t.type === "string") {
      const v = t.value;
      const closed = v.length > 1 && v[v.length - 1] === v[0];
      out += v[0] + v.slice(1, closed ? -1 : undefined).replace(/[^\n]/g, " ") + (closed ? v[0] : "");
    } else {
      out += t.value;
    }
    pos = t.end;
  }
  return out + code.slice(pos);
}

/** The (comment-free) tokens inside a named function's body, or null if there's no such function. */
function bodyTokens(code: string, name: string): Token[] | null {
  const span = locateFunction(mask(code), name);
  if (!span) return null;
  return codeTokens(code).filter((t) => t.start >= span.bodyStart && t.end <= span.bodyEnd);
}

const ASSIGN_OPS = new Set(["=", "+=", "-=", "*=", "/=", "%=", "**=", "??=", "++", "--"]);

/** Is `name` ever reassigned (outside the line that declares it)? */
function isReassigned(tokens: Token[], name: string): boolean {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.value !== name || t.type !== "identifier") continue;
    const prev = tokens[i - 1]?.value;
    if (prev === "let" || prev === "var" || prev === "const" || prev === "." || prev === "?.") continue;
    if (ASSIGN_OPS.has(tokens[i + 1]?.value ?? "")) return true;
    if (prev === "++" || prev === "--") return true;
  }
  return false;
}

interface Declaration {
  kind: "let" | "var" | "const";
  name: string;
}

/** Simple `let x` / `var x` / `const x` declarations, skipping for-loop headers. */
function declarations(tokens: Token[]): Declaration[] {
  const out: Declaration[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== "keyword" || (t.value !== "let" && t.value !== "var" && t.value !== "const")) continue;
    if (tokens[i - 1]?.value === "(" && tokens[i - 2]?.value === "for") continue;
    const next = tokens[i + 1];
    if (next?.type === "identifier") out.push({ kind: t.value, name: next.value });
  }
  return out;
}

/** The init clause of every C-style `for (init; cond; step)` loop. */
function cStyleForInits(code: string): string[] {
  const src = scrub(code);
  const inits: string[] = [];
  const re = /\bfor\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const open = m.index + m[0].length - 1;
    const close = matchBracket(src, open);
    if (close === -1) continue;
    const header = src.slice(open + 1, close);
    if (!header.includes(";")) continue; // for...of / for...in
    inits.push(header.slice(0, header.indexOf(";")).trim());
  }
  return inits;
}

/** Lines that end a statement — control headers, openers and continuations excluded. */
function statementLines(code: string): string[] {
  const CONTROL = /^(\}\s*)?(if|for|while|else|switch|function|case|default|do|try|catch|finally|class)\b/;
  return scrub(code)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (l.length === 0 || /^[})\]]+$/.test(l)) return false;
      if (l.endsWith(";")) return true;
      if (CONTROL.test(l)) return false;
      if (l.endsWith("++") || l.endsWith("--")) return true;
      if (l.endsWith("=>")) return false;
      return !/[{(\[,:=&|?+\-*/.]$/.test(l);
    });
}

/** True when a string literal sits next to a `+` (text glued with concatenation). */
function hasStringConcat(tokens: Token[]): boolean {
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== "operator" || (tokens[i].value !== "+" && tokens[i].value !== "+=")) continue;
    if (tokens[i - 1]?.type === "string" || tokens[i + 1]?.type === "string") return true;
  }
  return false;
}

const hasTemplateWithValues = (tokens: Token[]) =>
  tokens.some((t) => t.type === "string" && t.value.startsWith("`") && t.value.includes("${"));

const hasKeyword = (tokens: Token[], kw: string) => tokens.some((t) => t.type === "keyword" && t.value === kw);

/** Each `switch` body split into its case/default sections (token lists). */
function switchSections(tokens: Token[]): Token[][][] {
  const switches: Token[][][] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== "keyword" || tokens[i].value !== "switch") continue;
    // skip the discriminant (...)
    let j = i + 1;
    if (tokens[j]?.value !== "(") continue;
    let depth = 0;
    for (; j < tokens.length; j++) {
      if (tokens[j].value === "(") depth++;
      else if (tokens[j].value === ")" && --depth === 0) break;
    }
    j++;
    if (tokens[j]?.value !== "{") continue;
    const sections: Token[][] = [];
    let current: Token[] | null = null;
    depth = 0;
    for (let k = j; k < tokens.length; k++) {
      const v = tokens[k].value;
      if (v === "{") depth++;
      else if (v === "}") {
        depth--;
        if (depth === 0) break;
      }
      if (depth === 1 && tokens[k].type === "keyword" && (v === "case" || v === "default")) {
        current = [];
        sections.push(current);
      }
      if (current) current.push(tokens[k]);
    }
    switches.push(sections);
  }
  return switches;
}

/** Does this case section run code and then fall through into the next one? */
function fallsThrough(section: Token[]): boolean {
  // the label ends at the first ":" outside brackets and ternaries
  let depth = 0;
  let ternary = 0;
  let colon = -1;
  for (let i = 1; i < section.length; i++) {
    const v = section[i].value;
    if (v === "(" || v === "[" || v === "{") depth++;
    else if (v === ")" || v === "]" || v === "}") depth--;
    else if (v === "?") ternary++;
    else if (v === ":" && ternary > 0) ternary--;
    else if (v === ":" && depth === 0) {
      colon = i;
      break;
    }
  }
  const body = colon === -1 ? [] : section.slice(colon + 1);
  if (body.length === 0) return false; // grouped labels: `case 1: case 2:`
  return !body.some((t) => t.type === "keyword" && ["break", "return", "continue", "throw"].includes(t.value));
}

// ══════════════════════════════════════════════════════
//  Ch01 · Scaffold
// ══════════════════════════════════════════════════════

const jsSemicolons: ZenRule = {
  id: "js_semicolons",
  principle: "consistent semicolons",
  isRelevant: (code) => statementLines(code).length > 0,
  check: (code) => {
    const ls = statementLines(code);
    const withSemi = ls.filter((l) => l.endsWith(";")).length;
    return withSemi === 0 || withSemi === ls.length;
  },
  bonusXP: 5,
  jolt: "...wait. something's coming back.\n\nevery statement ends the same way. javascript will guess where a line stops if you leave the `;` off — and every so often it guesses wrong. picking one habit and keeping it everywhere means no surprises.\n\nmy professor called it \"boring code is safe code.\"",
  suggestion: "some of your lines end with `;` and some don't. javascript patches the gaps itself, but it's easy to trip over. pick one style — i'd end every statement with `;` — and keep it.",
};

// ══════════════════════════════════════════════════════
//  Ch02 · Scaffold
// ══════════════════════════════════════════════════════

const jsTopLevel: ZenRule = {
  id: "js_top_level",
  principle: "the file is the program",
  check: (code) => {
    const src = scrub(code);
    return !/\bfunction\s+main\s*\(/.test(src) && !/\b(?:const|let|var)\s+main\s*=/.test(src);
  },
  bonusXP: 5,
  jolt: "no `main` function, no wrapper you call at the bottom. you let the file be the program — javascript runs it top to bottom, so that's all it needs.\n\nwhy add ceremony the language never asked for.",
  suggestion: "you don't need a `main` function in javascript. the file already runs from the top — write the statements at the top level and drop the wrapper.",
};

// ══════════════════════════════════════════════════════
//  Ch03 · Scaffold
// ══════════════════════════════════════════════════════

/** Plain '…' / "…" literals (templates excluded), minus ones that hold the other quote. */
function quoteStyles(code: string): { double: number; single: number } {
  let double = 0;
  let single = 0;
  for (const t of codeTokens(code)) {
    if (t.type !== "string") continue;
    if (t.value[0] === '"' && !t.value.includes("'")) double++;
    else if (t.value[0] === "'" && !t.value.includes('"')) single++;
  }
  return { double, single };
}

const jsConsistentQuotes: ZenRule = {
  id: "js_consistent_quotes",
  principle: "one quote style",
  isRelevant: (code) => {
    const q = quoteStyles(code);
    return q.double + q.single > 0;
  },
  check: (code) => {
    const q = quoteStyles(code);
    return q.double === 0 || q.single === 0;
  },
  bonusXP: 5,
  jolt: "one quote style, all the way through. javascript doesn't care whether you pick double or single — but a reader's eye does. when every string looks the same, the odd one out is always a real difference.",
  suggestion: "you're mixing `\"double\"` and `'single'` quotes. both work, but pick one and use it everywhere — switch only when the text itself holds that quote.",
};

// ══════════════════════════════════════════════════════
//  Ch01 · Location
// ══════════════════════════════════════════════════════

const jsTemplateLiteral: ZenRule = {
  id: "js_template_literal",
  principle: "template literals over concatenation",
  isRelevant: (code) => {
    const tokens = codeTokens(code);
    return hasTemplateWithValues(tokens) || hasStringConcat(tokens);
  },
  check: (code) => {
    const tokens = codeTokens(code);
    return hasTemplateWithValues(tokens) && !hasStringConcat(tokens);
  },
  bonusXP: 15,
  jolt: "...my thesis notes. i can see them.\n\na template literal — backticks, values dropped in with `${...}`. the line in your code looks like the line on the screen. no `+` signs, no lost spaces between the pieces.\n\ni built every log message in my encryption library that way.",
  suggestion: "gluing text with `+` works, but the spaces are easy to lose. a template literal reads like the output: ``console.log(`CELL ${cell} - SUBLEVEL ${sublevel}`);``",
};

const jsNamedImports: ZenRule = {
  id: "js_named_imports",
  principle: "named imports",
  isRelevant: (code) => /\bimport\b/.test(scrub(code)),
  check: (code) => {
    const src = scrub(code);
    return /\bimport\s*\{[^}]*\}\s*from\b/.test(src) && !/\bimport\s*\*\s*as\b/.test(src);
  },
  bonusXP: 10,
  jolt: "`import { cell, sublevel }` — you named exactly what you need. anyone reading the top of the file knows this program depends on two values and nothing else.\n\nyou don't haul in the whole module when you only want two things from it.",
  suggestion: "name what you need in the import: `import { cell, sublevel } from \"./cellblock.js\";` — then the top of the file says exactly what this program depends on.",
};

const jsConstDefault: ZenRule = {
  id: "js_const_default",
  principle: "const by default",
  isRelevant: (code) => declarations(codeTokens(code)).length > 0,
  check: (code) => {
    const tokens = codeTokens(code);
    return declarations(tokens).every((d) => d.kind === "const" || (d.kind === "let" && isReassigned(tokens, d.name)));
  },
  getSuggestion: (code) => {
    const tokens = codeTokens(code);
    if (declarations(tokens).some((d) => d.kind === "var")) {
      return "skip `var` — it's the old way and its scope leaks. use `const` for a value that never changes, `let` only when you'll reassign it.";
    }
    return "you used `let` for a value you never change. make it `const` — then anyone reading knows it's fixed, and javascript stops you if you try to change it.";
  },
  bonusXP: 10,
  jolt: "...the gas is clearing.\n\n`const` for the values that never change. that's intent you can read — a name that's locked says \"this is fixed, stop worrying about it.\" save `let` for the things that actually move.",
  suggestion: "use `const` for a value you never reassign, and `let` only when it changes. it tells the reader which names are fixed.",
};

// ══════════════════════════════════════════════════════
//  Ch02 · Loop
// ══════════════════════════════════════════════════════

const jsLetCounter: ZenRule = {
  id: "js_let_counter",
  principle: "let for the loop counter",
  isRelevant: (code) => cStyleForInits(code).length > 0,
  check: (code) => cStyleForInits(code).every((init) => /^let\s/.test(init)),
  getSuggestion: (code) => {
    if (cStyleForInits(code).some((init) => /^var\s/.test(init))) {
      return "`var i` leaks the counter out of the loop — it's still alive after the last brace. `let i = 1` keeps it inside the loop where it belongs.";
    }
    return "declare the counter in the loop header with `let`: `for (let i = 1; i <= 10; i++)`. it changes every pass, and `let` keeps it inside the loop.";
  },
  bonusXP: 10,
  jolt: "`let i` — declared right in the loop header. it changes every pass, so not `const`. and it lives only inside the loop, so not `var`. the counter can't leak out and collide with anything.\n\nsmallest scope that works. i remember that one.",
  suggestion: "declare the counter in the loop header with `let`: `for (let i = 1; i <= 10; i++)`.",
};

/** Every `if (...)`, `for (...)`, `while (...)` and `else` is followed by a `{` block. */
function allBlocksBraced(code: string): boolean {
  const src = scrub(code);
  const headers = /\b(if|for|while)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = headers.exec(src)) !== null) {
    const close = matchBracket(src, m.index + m[0].length - 1);
    if (close === -1) return false;
    const next = src.slice(close + 1).trimStart()[0];
    // `do { } while (x);` — the trailing while has no body
    if (m[1] === "while" && next === ";") continue;
    if (next !== "{") return false;
  }
  const elses = /\belse\b/g;
  while ((m = elses.exec(src)) !== null) {
    const after = src.slice(m.index + 4).trimStart();
    if (!after.startsWith("{") && !/^if\b/.test(after)) return false;
  }
  return true;
}

const jsBlockBraces: ZenRule = {
  id: "js_block_braces",
  principle: "always brace the block",
  isRelevant: (code) => /\b(if|for|while)\s*\(|\belse\b/.test(scrub(code)),
  check: allBlocksBraced,
  bonusXP: 5,
  jolt: "braces around the loop body, even for one line. javascript lets you skip them — and then the second line you add quietly runs outside the loop.\n\nbraces mark exactly where the block starts and stops. no guessing.",
  suggestion: "wrap the loop body in braces, even when it's one line: `for (...) { console.log(i); }`. without them, the next line you add silently falls outside the loop.",
};

// ══════════════════════════════════════════════════════
//  Ch02 · Classify
// ══════════════════════════════════════════════════════

const jsExclusiveBranches: ZenRule = {
  id: "js_exclusive_branches",
  principle: "one chain, not separate ifs",
  isRelevant: (code) => {
    const tokens = codeTokens(code);
    return hasKeyword(tokens, "if") || hasKeyword(tokens, "switch");
  },
  check: (code) => {
    const tokens = codeTokens(code);
    if (hasKeyword(tokens, "switch")) return true;
    const standalone = tokens.filter(
      (t, i) => t.type === "keyword" && t.value === "if" && tokens[i - 1]?.value !== "else",
    ).length;
    return standalone <= 1;
  },
  bonusXP: 10,
  jolt: "...fragments coming back.\n\none chain — `if`, then `else if`, then `else`. the moment one condition matches, the rest are skipped. the code says what's true: every number lands in exactly one level.\n\nseparate `if`s would check all four every time, and two could fire at once.",
  suggestion: "chain the conditions with `else if` instead of separate `if`s. once a code matches, the rest are skipped — and it can never land in two levels at once.",
};

const jsCatchAll: ZenRule = {
  id: "js_catch_all",
  principle: "a catch-all for the rest",
  isRelevant: (code) => {
    const tokens = codeTokens(code);
    return hasKeyword(tokens, "if") || hasKeyword(tokens, "switch");
  },
  check: (code) => {
    const tokens = codeTokens(code);
    const plainElse = tokens.some((t, i) => t.type === "keyword" && t.value === "else" && tokens[i + 1]?.value !== "if");
    const switchDefault = hasKeyword(tokens, "switch") && hasKeyword(tokens, "default");
    return plainElse || switchDefault;
  },
  bonusXP: 5,
  jolt: "a plain `else` at the end — no condition, just \"everything else.\" 10 doesn't need its own test, it's simply what's left. and nothing can ever slip through unclassified.",
  suggestion: "end the chain with a plain `else` (or `default:` in a switch). whatever's left — code 10 — lands there, and nothing can slip through unclassified.",
};

const jsStrictEquality: ZenRule = {
  id: "js_strict_equality",
  principle: "=== over ==",
  isRelevant: (code) => codeTokens(code).some((t) => ["==", "!=", "===", "!=="].includes(t.value)),
  check: (code) => !codeTokens(code).some((t) => t.value === "==" || t.value === "!="),
  bonusXP: 10,
  jolt: "three equals — `===`. it compares without converting anything first, so `10 === \"10\"` is false, the way you'd expect. the two-equals version quietly converts types and lies to you.\n\nevery javascript reviewer i ever had checked for this first.",
  suggestion: "use `===` instead of `==` (and `!==` instead of `!=`). the short form converts types before comparing — `10 == \"10\"` is true. three equals means exactly equal.",
};

// ══════════════════════════════════════════════════════
//  Ch02 · Rewrite
// ══════════════════════════════════════════════════════

const jsSwitchBreak: ZenRule = {
  id: "js_switch_break",
  principle: "break every case",
  isRelevant: (code) => hasKeyword(codeTokens(code), "switch"),
  check: (code) =>
    switchSections(codeTokens(code)).every((sections) => sections.slice(0, -1).every((s) => !fallsThrough(s))),
  bonusXP: 10,
  jolt: "`break` at the end of every case. javascript's switch falls through — without it, a matched case keeps running into the next one. you closed every door behind you.\n\ndefaults that bite you are still defaults. you have to know them.",
  suggestion: "end every case with `break;`. javascript's switch falls through — a case without it runs straight into the next one.",
};

// ══════════════════════════════════════════════════════
//  Ch03 · Sum
// ══════════════════════════════════════════════════════

const jsRestParams: ZenRule = {
  id: "js_rest_params",
  principle: "rest parameters over arguments",
  isRelevant: (code) => findFunction(code, "sumCodes") !== null,
  check: (code) => {
    const fn = findFunction(code, "sumCodes")!;
    return /\.\.\.\s*[A-Za-z_$][\w$]*\s*$/.test(fn.params.trim()) && !/\barguments\b/.test(fn.body);
  },
  bonusXP: 10,
  jolt: "`...codes` — a rest parameter. the signature says it out loud: this takes any number of values, and they arrive as a real array with a real name.\n\nthe old `arguments` object hid all that. you didn't need it.",
  suggestion: "take the values with a rest parameter — `function sumCodes(...codes)` — instead of reaching for `arguments`. the signature then says what it accepts, and `codes` is a real array.",
};

const jsForOf: ZenRule = {
  id: "js_for_of",
  principle: "walk the values, not the indexes",
  isRelevant: (code) => {
    const fn = findFunction(code, "sumCodes");
    return fn !== null && /\b(for|while)\b|\.\s*(reduce|forEach)\s*\(/.test(fn.body);
  },
  check: (code) => {
    const body = findFunction(code, "sumCodes")!.body;
    if (/\bwhile\b/.test(body)) return false;
    if (/\bfor\s*\([^)]*\bin\b/.test(body)) return false;
    if (/\bfor\s*\([^)]*;/.test(body)) return false;
    return /\bfor\s*\(\s*(?:const|let)\s+[\w$]+\s+of\b/.test(body) || /\.\s*(reduce|forEach)\s*\(/.test(body);
  },
  getSuggestion: (code) => {
    const body = findFunction(code, "sumCodes")?.body ?? "";
    if (/\bfor\s*\([^)]*\bin\b/.test(body)) {
      return "`for...in` walks the indexes, as strings — not the values. `for (const c of codes)` gives you each code itself.";
    }
    return "you don't need the index to add things up. `for (const c of codes) { total += c; }` walks the values directly — or `codes.reduce((sum, c) => sum + c, 0)`.";
  },
  bonusXP: 10,
  jolt: "...short and direct.\n\nyou walked the values, not the positions. no `i`, no `codes.length`, no `codes[i]` — nothing to get off by one. the loop says \"for each code\" because that's what it means.",
  suggestion: "you don't need the index to add things up. `for (const c of codes)` walks the values directly.",
};

const jsPureFunction: ZenRule = {
  id: "js_pure_function",
  principle: "single-purpose function",
  isRelevant: (code) => findFunction(code, "sumCodes") !== null,
  check: (code) => !/\bconsole\s*\./.test(findFunction(code, "sumCodes")!.body),
  bonusXP: 10,
  jolt: "sumCodes does one thing — it sums. no printing, no checking. it hands back a number and lets the caller decide what to do with it.\n\ni remember now... my thesis had a function called `encrypt`. it only encrypted. everything else was someone else's job.",
  suggestion: "keep `sumCodes` to the math — no `console.log` inside. return the number and let the caller print it. one function, one job.",
};

// ══════════════════════════════════════════════════════
//  Ch03 · Validate
// ══════════════════════════════════════════════════════

const jsDirectBool: ZenRule = {
  id: "js_direct_bool",
  principle: "return the comparison directly",
  isRelevant: (code) => findFunction(code, "validateCode") !== null,
  check: (code) => !/\b(true|false)\b/.test(findFunction(code, "validateCode")!.body),
  bonusXP: 15,
  jolt: "...the fog is lifting.\n\n`total > 100` — you returned the comparison itself. no if/else handing back `true` or `false` when the expression already is one.\n\nmy advisor circled that pattern in red ink. \"the answer was already there,\" she said.",
  suggestion: "`total > 100` is already `true` or `false`. skip the if/else and return it directly: `return [total, total > 100];`.",
};

const jsReuseSum: ZenRule = {
  id: "js_reuse_sum",
  principle: "compose existing functions",
  isRelevant: (code) => findFunction(code, "validateCode") !== null,
  check: (code) => /\bsumCodes\s*\(\s*\.\.\./.test(findFunction(code, "validateCode")!.body),
  bonusXP: 10,
  jolt: "you called `sumCodes(...codes)` instead of writing the loop again. the spread hands every value straight through. one place does the adding — if it ever changes, it changes once.",
  suggestion: "don't repeat the loop — reuse what you built: `const total = sumCodes(...codes);`. the `...` spreads the array back into separate arguments.",
};

const jsDestructure: ZenRule = {
  id: "js_destructure",
  principle: "destructure the result",
  isRelevant: (code) => {
    const tokens = codeTokens(code);
    return tokens.some(
      (t, i) =>
        t.value === "validateCode" &&
        tokens[i + 1]?.value === "(" &&
        tokens[i - 1]?.value !== "function" &&
        tokens[i - 1]?.value !== ".",
    );
  },
  check: (code) => /\b(?:const|let)\s*\[[^\]]*\]\s*=\s*validateCode\s*\(/.test(scrub(code)),
  bonusXP: 5,
  jolt: "`const [s, v] = validateCode(...)` — destructuring. both values unpacked and named in one line, by position. no `result[0]`, no `result[1]` to keep straight.",
  suggestion: "unpack the pair when you call it: `const [total, valid] = validateCode(25, 30);`. names beat `result[0]` and `result[1]`.",
};

// ══════════════════════════════════════════════════════
//  Ch04 · Scaffold
// ══════════════════════════════════════════════════════

/** A backtick string with nothing dropped in and on one line — plain quotes would do. */
const isBareTemplate = (t: Token) =>
  t.type === "string" && t.value.startsWith("`") && !t.value.includes("${") && !t.value.includes("\n");

const jsPlainString: ZenRule = {
  id: "js_plain_string",
  principle: "backticks only when a value drops in",
  isRelevant: (code) => codeTokens(code).some((t) => t.type === "string"),
  check: (code) => !codeTokens(code).some(isBareTemplate),
  bonusXP: 5,
  jolt: "plain quotes for plain text. you saved the backticks for when a value drops in — and this chapter you'll drop in plenty. when every backtick means \"something gets filled in here,\" the reader knows where to look.",
  suggestion: "backticks are for template literals — text with a `${...}` value dropped in. plain text reads clearer in plain quotes: `console.log(\"Hello World\");`.",
};

// ══════════════════════════════════════════════════════
//  Ch04 · Guard roster
// ══════════════════════════════════════════════════════

/** `x.key = …` or `x[…] = …` — building an object one assignment at a time. */
const MEMBER_ASSIGN = /[\w$\])]\s*(?:\.\s*[A-Za-z_$][\w$]*|\[[^\]]*\])\s*=(?![=>])/;

const jsObjectLiteral: ZenRule = {
  id: "js_object_literal",
  principle: "build the object in one literal",
  isRelevant: (code) => findFunction(code, "buildRoster") !== null,
  check: (code) => {
    const body = findFunction(code, "buildRoster")!.body;
    return !MEMBER_ASSIGN.test(body) && !/\.\s*set\s*\(/.test(body);
  },
  bonusXP: 10,
  jolt: "...the camera feed flickers. something's coming back.\n\none object literal, every guard declared at once. the shape of the roster is the shape of the code — anyone reading it sees all five pairs in one glance, no assignments to follow line by line.",
  suggestion: "declare the whole roster in one object literal instead of adding guards one assignment at a time: `return { Chen: \"Floor 1\", Alvarez: \"Floor 2\", ... };`. the code then looks like the data.",
};

/** The inside of every multi-line `{ key: value }` object literal (scrubbed). */
function multiLineObjectLiterals(code: string): string[] {
  const src = scrub(code);
  const out: string[] = [];
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== "{") continue;
    const before = src.slice(0, i).trimEnd();
    const literal = /[=(,:[]$/.test(before) || /\breturn$/.test(before);
    if (!literal || before.endsWith("=>")) continue;
    const close = matchBracket(src, i);
    if (close === -1) continue;
    const inner = src.slice(i + 1, close);
    if (inner.includes("\n") && inner.includes(":")) out.push(inner);
  }
  return out;
}

const jsTrailingComma: ZenRule = {
  id: "js_trailing_comma",
  principle: "a trailing comma on multi-line literals",
  isRelevant: (code) => multiLineObjectLiterals(code).length > 0,
  check: (code) => multiLineObjectLiterals(code).every((inner) => inner.trimEnd().endsWith(",")),
  bonusXP: 5,
  jolt: "a comma after the last guard, too. javascript allows it, and it means every line looks the same. add a sixth guard tomorrow and you touch one line — not two.",
  suggestion: "put one pair per line and end the last one with a comma too — `Santos: \"Floor 1\",`. every line then has the same shape, and adding a guard never means editing the line above.",
};

// ══════════════════════════════════════════════════════
//  Ch04 · Clear floors
// ══════════════════════════════════════════════════════

const jsSetLookup: ZenRule = {
  id: "js_set_lookup",
  principle: "a real Set for membership",
  isRelevant: (code) => findFunction(code, "findClearFloor") !== null,
  check: (code) => {
    const body = findFunction(code, "findClearFloor")!.body;
    return /\bnew\s+Set\b/.test(body) && /\.\s*has\s*\(/.test(body) && !/\.\s*(includes|indexOf)\s*\(/.test(body);
  },
  getSuggestion: (code) => {
    const body = findFunction(code, "findClearFloor")?.body ?? "";
    if (/\.\s*(includes|indexOf)\s*\(/.test(body)) {
      return "`.includes` walks the whole array every time you ask. put the floors in a `Set` once — `new Set(Object.values(guards))` — and `.has(name)` answers straight away.";
    }
    return "an object full of `true` values is a set in disguise. javascript has the real thing: `const occupied = new Set(Object.values(guards));`, then `occupied.has(name)`.";
  },
  bonusXP: 15,
  jolt: "...the surveillance hum. i remember this.\n\na `Set`. it holds each floor once and answers `.has` straight away — no walking the list, no faking it with an object of `true` values. some languages make you build a set by hand. javascript ships one, and you used it.",
  suggestion: "collect the occupied floors in a real `Set` and ask it with `.has`: `const occupied = new Set(Object.values(guards));`.",
};

const jsObjectValues: ZenRule = {
  id: "js_object_values",
  principle: "Object.values when the keys don't matter",
  isRelevant: (code) => {
    const body = findFunction(code, "findClearFloor")?.body;
    return body !== undefined && /\bObject\s*\.\s*(values|keys|entries)\s*\(|\bfor\s*\(\s*(?:const|let|var)?\s*[\w$]+\s+in\b/.test(body);
  },
  check: (code) => {
    const body = findFunction(code, "findClearFloor")!.body;
    return (
      /\bObject\s*\.\s*values\s*\(/.test(body) &&
      !/\bObject\s*\.\s*(keys|entries)\s*\(/.test(body) &&
      !/\bfor\s*\(\s*(?:const|let|var)?\s*[\w$]+\s+in\b/.test(body)
    );
  },
  bonusXP: 10,
  jolt: "`Object.values(guards)` — straight to the floors. you never needed the names, so you never asked for them. no key you look up just to throw away.",
  suggestion: "you only need the floors, not the names. `Object.values(guards)` hands you the values directly — no walking the keys and looking each one back up.",
};

const jsFloorTemplate: ZenRule = {
  id: "js_floor_template",
  principle: "build the name with a template literal",
  isRelevant: (code) => {
    const tokens = bodyTokens(code, "findClearFloor");
    return tokens !== null && (hasTemplateWithValues(tokens) || hasStringConcat(tokens));
  },
  check: (code) => {
    const tokens = bodyTokens(code, "findClearFloor")!;
    return hasTemplateWithValues(tokens) && !hasStringConcat(tokens);
  },
  bonusXP: 5,
  jolt: "`` `Floor ${i}` `` — the name in the code looks exactly like the name on the roster. the space lives inside the template, where you can see it.",
  suggestion: "build the floor's name with a template literal instead of `+`: `` const name = `Floor ${i}`; `` — it reads like the name it makes, and the space can't go missing.",
};

// ══════════════════════════════════════════════════════
//  Ch04.2 · Scaffold
// ══════════════════════════════════════════════════════

const jsNoImportNeeded: ZenRule = {
  id: "js_no_import_needed",
  principle: "the toolkit is built in",
  isRelevant: (code) => /\bconsole\s*\.\s*log\s*\(/.test(scrub(code)),
  check: (code) => !/\bimport\b|\brequire\s*\(/.test(scrub(code)),
  bonusXP: 5,
  jolt: "no imports. splitting, joining, reversing, reading numbers — it's all built into javascript's strings and arrays. the relay runs on what the language already carries.",
  suggestion: "you don't need to import anything this chapter. `split`, `join`, `reverse` and `Number` come with every string and array — drop the import.",
};

// ══════════════════════════════════════════════════════
//  Ch04.2 · Reverse word
// ══════════════════════════════════════════════════════

const jsSpreadChars: ZenRule = {
  id: "js_spread_chars",
  principle: "spread into whole characters",
  isRelevant: (code) => {
    const body = findFunction(code, "reverseWord")?.body;
    return body !== undefined && /\.\s*split\s*\(|\[\s*\.\.\.|\bArray\s*\.\s*from\s*\(/.test(body);
  },
  check: (code) => {
    const body = findFunction(code, "reverseWord")!.body;
    return !/\.\s*split\s*\(/.test(body) && /\[\s*\.\.\.|\bArray\s*\.\s*from\s*\(/.test(body);
  },
  bonusXP: 15,
  jolt: "...a fragment of the cipher lab.\n\n`[...s]` — you split the word into whole characters, not pieces of them. `split(\"\")` cuts some characters, emoji among them, into two broken halves, and reversing those makes garbage. the spread keeps every character in one piece.\n\nthe scanners read anything. the cipher has to survive anything.",
  suggestion: "`s.split(\"\")` works on plain letters but cuts some characters — like emoji — in half. spread instead: `[...s].reverse().join(\"\")` keeps every character whole.",
};

const jsBuiltinReverse: ZenRule = {
  id: "js_builtin_reverse",
  principle: "let the array reverse itself",
  isRelevant: (code) => {
    const body = findFunction(code, "reverseWord")?.body;
    return body !== undefined && /\b(for|while)\b|\.\s*reverse\s*\(/.test(body);
  },
  check: (code) => {
    const body = findFunction(code, "reverseWord")!.body;
    return /\.\s*reverse\s*\(/.test(body) && !/\b(for|while)\b/.test(body);
  },
  bonusXP: 10,
  jolt: "`.reverse()` — you let the array do it. no index juggling, no swap loop to get off by one. spread, reverse, join reads like what it does.",
  suggestion: "arrays already know how to reverse. skip the loop: `return [...s].reverse().join(\"\");`.",
};

// ══════════════════════════════════════════════════════
//  Ch04.2 · Encode
// ══════════════════════════════════════════════════════

const jsMapTransform: ZenRule = {
  id: "js_map_transform",
  principle: "map, don't push",
  isRelevant: (code) => {
    const body = findFunction(code, "encode")?.body;
    return body !== undefined && /\.\s*(map|forEach|push)\s*\(|\b(for|while)\b/.test(body);
  },
  check: (code) => {
    const body = findFunction(code, "encode")!.body;
    return /\.\s*map\s*\(/.test(body) && !/\.\s*(push|forEach)\s*\(/.test(body) && !/\b(for|while)\b/.test(body);
  },
  bonusXP: 15,
  jolt: "`.map(reverseWord)` — every word in, every word out, a new array back. no empty array to set up, no push to forget. the line says what it means: reverse each word.\n\ni wrote my thesis cipher as a chain like that. split, map, join.",
  suggestion: "a loop that pushes into a new array is what `.map` does in one call: `msg.split(\" \").map(reverseWord).join(\" \")`.",
};

const jsReuseReverse: ZenRule = {
  id: "js_reuse_reverse",
  principle: "compose, don't copy",
  isRelevant: (code) => findFunction(code, "encode") !== null,
  check: (code) => {
    const body = findFunction(code, "encode")!.body;
    return /\breverseWord\b/.test(body) && !/\.\s*reverse\s*\(/.test(body);
  },
  bonusXP: 10,
  jolt: "encode calls `reverseWord` instead of reversing all over again. one place knows how to flip a word — fix it there and every message gets the fix.",
  suggestion: "don't reverse inside encode again — call the function you already wrote: `.map(reverseWord)`.",
};

// ══════════════════════════════════════════════════════
//  Ch04.2 · Relay header
// ══════════════════════════════════════════════════════

const jsNumberIsNaN: ZenRule = {
  id: "js_number_isnan",
  principle: "Number.isNaN, not isNaN or === NaN",
  isRelevant: (code) => {
    const body = findFunction(code, "relayHeader")?.body;
    return body !== undefined && /\bNaN\b|\bisNaN\b/.test(body);
  },
  check: (code) => {
    const body = findFunction(code, "relayHeader")!.body;
    return (
      /\bNumber\s*\.\s*isNaN\s*\(/.test(body) &&
      !/(^|[^.\w$])isNaN\s*\(/.test(body) &&
      !/[=!]==?\s*NaN\b|\bNaN\s*[=!]==?/.test(body)
    );
  },
  getSuggestion: (code) => {
    const body = findFunction(code, "relayHeader")?.body ?? "";
    if (/[=!]==?\s*NaN\b|\bNaN\s*[=!]==?/.test(body)) {
      return "`n === NaN` is always false — NaN isn't equal to anything, not even itself. ask `Number.isNaN(n)`.";
    }
    return "the global `isNaN` converts its argument first, so it says yes to things that were never a number value. `Number.isNaN(n)` only says yes to a real NaN.";
  },
  bonusXP: 15,
  jolt: "`Number.isNaN(n)` — the one check that can't be fooled. NaN isn't even equal to itself, and the old global `isNaN` converts before it looks. you asked the exact question.\n\njavascript doesn't throw on bad numbers. it hands you a poisoned value and walks away. you checked.",
  suggestion: "check for NaN with `Number.isNaN(n)` — not `n === NaN` (always false) and not the global `isNaN` (it converts first).",
};

const jsNumberOverParseInt: ZenRule = {
  id: "js_number_over_parseint",
  principle: "Number() rejects what parseInt lets through",
  isRelevant: (code) => {
    const body = findFunction(code, "relayHeader")?.body;
    return body !== undefined && /\b(Number|parseInt|parseFloat)\s*\(/.test(body);
  },
  check: (code) => !/\bparse(Int|Float)\s*\(/.test(findFunction(code, "relayHeader")!.body),
  bonusXP: 10,
  jolt: "`Number(code)` — all or nothing. `parseInt(\"12abc\")` would have read the 12, dropped the rest and stamped garbage as a real code. `Number` turns the whole bad string into NaN, and your check catches it.",
  suggestion: "`parseInt(\"12abc\")` quietly gives 12 — it reads digits until it hits something else. `Number(code)` turns the whole bad string into NaN, so garbage can't pass as a code.",
};

const jsHeaderTemplate: ZenRule = {
  id: "js_header_template",
  principle: "the header reads like a template",
  isRelevant: (code) => {
    const tokens = bodyTokens(code, "relayHeader");
    return tokens !== null && (hasTemplateWithValues(tokens) || hasStringConcat(tokens));
  },
  check: (code) => {
    const tokens = bodyTokens(code, "relayHeader")!;
    return hasTemplateWithValues(tokens) && !hasStringConcat(tokens);
  },
  bonusXP: 5,
  jolt: "`` `F${floor}-C${n * 2}` `` — the header in your code looks like the header on the wire. numbers drop in as text on their own, no converting by hand.",
  suggestion: "build the header with a template literal instead of `+`: `` return `F${floor}-C${n * 2}`; `` — it reads like the header it makes.",
};

// ══════════════════════════════════════════════════════
//  Act III helpers
// ══════════════════════════════════════════════════════

/** Every `{ … }` block that follows `keyword` (scrubbed source), e.g. each `finally { … }`. */
function blocksAfter(src: string, keyword: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`\\b${keyword}\\b[^{]*\\{`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const open = m.index + m[0].length - 1;
    const close = matchBracket(src, open);
    if (close !== -1) out.push(src.slice(open + 1, close));
  }
  return out;
}

/** Every loop body (`for`/`while`) in scrubbed source. */
function loopBodies(src: string): string[] {
  const out: string[] = [];
  const re = /\b(for|while)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const open = m.index + m[0].length - 1;
    const close = matchBracket(src, open);
    if (close === -1) continue;
    const rest = src.slice(close + 1);
    const lead = rest.match(/^\s*/)![0].length;
    if (rest[lead] === "{") {
      const end = matchBracket(src, close + 1 + lead);
      out.push(src.slice(close + 1 + lead + 1, end === -1 ? src.length : end));
    } else {
      const end = rest.search(/;|\n/);
      out.push(rest.slice(0, end === -1 ? rest.length : end));
    }
  }
  return out;
}

/** The parameter names of a named function. */
function paramNames(code: string, name: string): string[] {
  const fn = findFunction(code, name);
  if (!fn) return [];
  return fn.params
    .split(",")
    .map((p) => p.replace(/=.*$/, "").replace(/\.\.\./, "").trim())
    .filter(Boolean);
}

/** The argument list of every `callee(` call in scrubbed source. */
function callArgs(src: string, callee: RegExp): string[] {
  const out: string[] = [];
  const re = new RegExp(callee.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const open = m.index + m[0].length - 1;
    const close = matchBracket(src, open);
    if (close !== -1) out.push(src.slice(open + 1, close));
  }
  return out;
}

/** Split an argument list on its top-level commas. */
function topLevelArgs(args: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < args.length; i++) {
    const c = args[i];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === "," && depth === 0) {
      out.push(args.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last = args.slice(start).trim();
  if (last) out.push(last);
  return out;
}

/** The source with comments removed and string contents kept (templates hold `${e.message}`). */
function uncommented(code: string): string {
  let out = "";
  let pos = 0;
  for (const t of tokenize(code)) {
    out += code.slice(pos, t.start);
    if (t.type !== "comment") out += t.value;
    pos = t.end;
  }
  return out + code.slice(pos);
}

const SET_TIMEOUT = /\bsetTimeout\s*\(/;
const CONSOLE_LOG = /\bconsole\s*\.\s*log\s*\(/;

// ══════════════════════════════════════════════════════
//  Ch07 · Scaffold
// ══════════════════════════════════════════════════════

const jsLogForOutput: ZenRule = {
  id: "js_log_for_output",
  principle: "console.log for output, console.error for errors",
  isRelevant: (code) => /\bconsole\s*\.\s*\w+\s*\(/.test(scrub(code)),
  check: (code) => {
    const src = scrub(code);
    return CONSOLE_LOG.test(src) && !/\bconsole\s*\.\s*(error|warn|info|debug)\s*\(/.test(src);
  },
  bonusXP: 5,
  jolt: "`console.log` for the line the terminal reads. `console.error` exists too — it writes to a separate stream, the one meant for things going wrong. this chapter things will go wrong, and you'll want that stream to mean something.",
  suggestion: "print ordinary output with `console.log`. `console.error` and `console.warn` write to the error stream — save them for real errors, or a reader can't tell the two apart.",
};

// ══════════════════════════════════════════════════════
//  Ch07 · Scan
// ══════════════════════════════════════════════════════

const jsFinallyLog: ZenRule = {
  id: "js_finally_log",
  principle: "finally for the on-the-way-out work",
  isRelevant: (code) => findFunction(code, "scanArchive") !== null,
  check: (code) => blocksAfter(findFunction(code, "scanArchive")!.body, "finally").some((b) => CONSOLE_LOG.test(b)),
  bonusXP: 15,
  jolt: "...the archive hum. something's coming back.\n\nthe log sits in a `finally`. it runs when the walk is done — however the walk ends. a plain line after the loop runs only if nothing went wrong. a `finally` runs anyway, and the next step is all about things going wrong.",
  suggestion: "put the `scanned:` log in a `finally` around the walk: `try { …walk… } finally { console.log(\"scanned:\", dir); }`. a line after the loop is skipped the moment something throws — `finally` never is.",
};

const jsClosureCounter: ZenRule = {
  id: "js_closure_counter",
  principle: "the counter lives inside the function that owns it",
  isRelevant: (code) => findFunction(code, "scanArchive") !== null,
  check: (code) => {
    const body = findFunction(code, "scanArchive")!.body;
    return /\b(?:let|var)\s+[\w$]+\s*=\s*0\b/.test(body) || /\breturn\b[^;\n]*\bscan\s*\(/.test(body);
  },
  bonusXP: 10,
  jolt: "`let count = 0;` inside scanArchive, and an inner `scan` that reaches out and bumps it. that's a closure — the inner function remembers where it was made. every call to scanArchive gets a fresh counter, so the second tree starts from zero.",
  suggestion: "declare the counter inside scanArchive — `let count = 0;` — and let the inner scan bump it. a counter at the top of the file survives between calls and quietly adds the next scan onto the last.",
};

const jsEndsWith: ZenRule = {
  id: "js_ends_with",
  principle: "say what you mean: endsWith",
  isRelevant: (code) => {
    const body = findFunction(code, "scanArchive")?.body;
    return body !== undefined && /\.\s*(endsWith|includes|slice|at|charAt|indexOf)\s*\(|\.length\s*-\s*1\s*\]/.test(body);
  },
  check: (code) => {
    const body = findFunction(code, "scanArchive")!.body;
    return /\.\s*endsWith\s*\(/.test(body) && !/\.\s*includes\s*\(|\.\s*at\s*\(\s*-1|\.length\s*-\s*1\s*\]|\.\s*charAt\s*\(/.test(body);
  },
  bonusXP: 5,
  jolt: "`entry.endsWith(\"/\")` — the question you meant, in the words you meant. no index arithmetic, no `includes` that would also say yes to a slash in the middle of a name.",
  suggestion: "ask `entry.endsWith(\"/\")`. `includes(\"/\")` also says yes to a slash in the middle, and `entry[entry.length - 1]` makes the reader do arithmetic to see what you're asking.",
};

// ══════════════════════════════════════════════════════
//  Ch07 · Recover
// ══════════════════════════════════════════════════════

const jsThrowError: ZenRule = {
  id: "js_throw_error",
  principle: "throw Error objects, not strings",
  isRelevant: (code) => /\bthrow\b/.test(scrub(code)),
  check: (code) => {
    const src = scrub(code);
    const throws = src.match(/\bthrow\s+[^;\n]*/g) ?? [];
    return throws.every((t) => /^throw\s+new\s+(?:[A-Z]\w*)?Error\s*\(/.test(t));
  },
  bonusXP: 10,
  jolt: "`throw new Error(...)`. an Error carries its message and a stack trace — the trail of calls it fell through. throw a bare string and whoever catches it gets text with no `.message` and no trail.",
  suggestion: "throw an Error, not a string: `throw new Error(\"corrupted directory\");`. a string has no `.message` and no stack trace for whoever catches it.",
};

const jsErrorMessage: ZenRule = {
  id: "js_error_message",
  principle: "record e.message, not the whole error",
  isRelevant: (code) => /\bcatch\s*\(\s*[\w$]+\s*\)/.test(scrub(code)),
  check: (code) => {
    const src = uncommented(code);
    const name = src.match(/\bcatch\s*\(\s*([\w$]+)\s*\)/)![1];
    return blocksAfter(src, "catch").every((b) => new RegExp(`\\b${name}\\s*\\.\\s*message\\b`).test(b));
  },
  bonusXP: 10,
  jolt: "`e.message` — just the words. `e` on its own prints as `Error: corrupted directory`, the type stuck on the front. you logged what happened, not what kind of object told you.",
  suggestion: "record the error's text with `e.message`. the error object itself prints with its type in front — `Error: corrupted directory` — and that's noise in a log.",
};

const jsShorthandProps: ZenRule = {
  id: "js_shorthand_props",
  principle: "shorthand when the name is the key",
  isRelevant: (code) => {
    const body = findFunction(code, "safeScan")?.body;
    return body !== undefined && /\breturn\s*\{/.test(body);
  },
  check: (code) => !/\b([\w$]+)\s*:\s*\1\b\s*[,}]/.test(findFunction(code, "safeScan")!.body),
  bonusXP: 5,
  jolt: "`return { count, errors };` — when the variable already has the key's name, say it once. the object reads like a list of what you're handing back.",
  suggestion: "`{ count: count, errors: errors }` says every name twice. when the variable and the key match, write it once: `return { count, errors };`.",
};

// ══════════════════════════════════════════════════════
//  Ch08 · Scaffold
// ══════════════════════════════════════════════════════

const jsSyncInOrder: ZenRule = {
  id: "js_sync_in_order",
  principle: "plain code runs in order — no async until something waits",
  isRelevant: (code) => CONSOLE_LOG.test(scrub(code)),
  check: (code) => !/\b(async|await|setTimeout|setInterval|Promise)\b|\.\s*then\s*\(/.test(scrub(code)),
  bonusXP: 5,
  jolt: "one line, top to bottom, done. no timers, no promises — nothing here waits for anything, so nothing needs to. remember this shape. this chapter you'll break that order on purpose.",
  suggestion: "nothing in `Hello World` waits for anything — drop the `async`, the timer or the promise. plain code runs top to bottom in order. save the async tools for work that's actually late.",
};

// ══════════════════════════════════════════════════════
//  Ch08 · Schedule a breaker
// ══════════════════════════════════════════════════════

const jsReuseCut: ZenRule = {
  id: "js_reuse_cut",
  principle: "schedule the function you already wrote",
  isRelevant: (code) => findFunction(code, "cutAsync") !== null,
  check: (code) => {
    const body = findFunction(code, "cutAsync")!.body;
    return /\bcut\b/.test(body) && !CONSOLE_LOG.test(body);
  },
  bonusXP: 10,
  jolt: "cutAsync hands `cut` to the timer instead of logging all over again. one function knows how to throw a breaker. the other only decides when.",
  suggestion: "don't log inside cutAsync again — schedule the function you already wrote: `setTimeout(() => cut(name), 0);`. one place knows how to cut, the other decides when.",
};

const jsExplicitDelay: ZenRule = {
  id: "js_explicit_delay",
  principle: "say the 0 out loud",
  isRelevant: (code) => {
    const body = findFunction(code, "cutAsync")?.body;
    return body !== undefined && SET_TIMEOUT.test(body);
  },
  check: (code) => callArgs(findFunction(code, "cutAsync")!.body, SET_TIMEOUT).every((a) => topLevelArgs(a).length >= 2),
  bonusXP: 5,
  jolt: "`setTimeout(() => cut(name), 0)` — the 0 written out. it changes nothing for the machine and everything for the reader: zero means later, as soon as possible. never right now.",
  suggestion: "write the delay even when it's zero: `setTimeout(() => cut(name), 0);`. leaving it off means the same thing, but the 0 tells the reader you meant later on purpose.",
};

const jsNoNeedlessAsync: ZenRule = {
  id: "js_no_needless_async",
  principle: "async only where something awaits",
  isRelevant: (code) => findFunction(code, "cutAsync") !== null,
  check: (code) => {
    const src = scrub(code);
    const fn = findFunction(code, "cutAsync")!;
    return !/\basync\s+function\s+cutAsync\b|\bcutAsync\s*=\s*async\b/.test(src) && !/\bawait\b/.test(fn.body);
  },
  bonusXP: 10,
  jolt: "cutAsync isn't `async`, and it doesn't need to be. it books the cut and gets out of the way — no promise to hand back, nothing to wait on. the name says async. the code doesn't pretend.",
  suggestion: "cutAsync never awaits anything, so it doesn't need the `async` keyword — that only wraps its result in a promise nobody uses. a plain function that calls `setTimeout` already returns straight away.",
};

// ══════════════════════════════════════════════════════
//  Ch08 · Fan-out
// ══════════════════════════════════════════════════════

const jsPromiseAllConcurrent: ZenRule = {
  id: "js_promise_all_concurrent",
  principle: "start them all, then wait once",
  isRelevant: (code) => findFunction(code, "cutAll") !== null,
  check: (code) => {
    const body = findFunction(code, "cutAll")!.body;
    return /\bPromise\s*\.\s*all\s*\(/.test(body) && !loopBodies(body).some((b) => /\bawait\b/.test(b));
  },
  bonusXP: 15,
  jolt: "...the breaker hall. i remember the hum.\n\nevery job started before any of them is waited on, and one `Promise.all` waits for the lot. an `await` inside a loop would start one, wait, start the next. here that costs nothing. next step it costs the whole window.",
  suggestion: "an `await` inside the loop starts one job, waits, then starts the next. start them all first — `circuits.map(async ...)` — then wait once with `Promise.all`.",
};

const jsMapNotPush: ZenRule = {
  id: "js_map_not_push",
  principle: "map to promises, don't push them",
  isRelevant: (code) => {
    const body = findFunction(code, "cutAll")?.body;
    return body !== undefined && /\.\s*(map|push|forEach)\s*\(|\b(for|while)\b/.test(body);
  },
  check: (code) => {
    const body = findFunction(code, "cutAll")!.body;
    return /\.\s*map\s*\(/.test(body) && !/\.\s*(push|forEach)\s*\(/.test(body);
  },
  bonusXP: 10,
  jolt: "`circuits.map(async ...)` — one promise per circuit, in circuit order, in one call. no empty array to set up, no push to forget, and `Promise.all` hands the answers back in the same order.",
  suggestion: "build the promises with `map` instead of pushing them in a loop: `Promise.all(circuits.map(async (name) => ...))`. one call, and the order is guaranteed.",
};

// ══════════════════════════════════════════════════════
//  Ch08 · One cycle
// ══════════════════════════════════════════════════════

const jsPromisifiedSleep: ZenRule = {
  id: "js_promisified_sleep",
  principle: "wrap the timer once, await it everywhere",
  isRelevant: (code) => findFunction(code, "cutTimed") !== null && SET_TIMEOUT.test(scrub(code)),
  check: (code) => {
    const body = findFunction(code, "cutTimed")!.body;
    return !SET_TIMEOUT.test(body) && !/\bnew\s+Promise\b/.test(body);
  },
  bonusXP: 15,
  jolt: "`const sleep = (ms) => new Promise(...)` — you turned a timer into something you can `await`. built once, outside, used in one clean line inside each job. that's your first hand-made promise, and every async thing from here is built on the same move.",
  suggestion: "pull the timer out into a helper: `const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));`. then each job is just `await sleep(delays[i]);` — no promise built by hand in the middle of the fan-out.",
};

const jsMapIndex: ZenRule = {
  id: "js_map_index",
  principle: "map hands you the index",
  isRelevant: (code) => {
    const body = findFunction(code, "cutTimed")?.body;
    return body !== undefined && /\.\s*map\s*\(/.test(body) && /\bdelays\s*\[/.test(body);
  },
  check: (code) => {
    const body = findFunction(code, "cutTimed")!.body;
    return /\.\s*map\s*\(\s*(?:async\s*)?\(\s*[\w$]+\s*,\s*[\w$]+\s*\)/.test(body) && !/\.\s*indexOf\s*\(|\+\+|\+=\s*1\b/.test(body);
  },
  bonusXP: 10,
  jolt: "`(name, i)` — map passes the index for free. no counter to bump, no `indexOf` to search for a name that might appear twice. each job knows its own position from the start.",
  suggestion: "map already passes each item's index: `circuits.map(async (name, i) => ...)`. a counter you bump by hand can drift, and `indexOf` breaks the moment two circuits share a name.",
};

const jsNoVar: ZenRule = {
  id: "js_no_var",
  principle: "let and const, never var",
  isRelevant: (code) => /\b(var|let)\b/.test(scrub(code)) || cStyleForInits(code).length > 0,
  check: (code) => !/\bvar\b/.test(scrub(code)),
  bonusXP: 10,
  jolt: "no `var` anywhere. a `var` in a `for` loop is one variable shared by every pass — every callback reads its last value, and four breakers all report the fifth circuit. `let` gives each pass its own. you never gave the trap a chance.",
  suggestion: "swap `var` for `let` or `const`. a `var` in a loop is one variable shared by every pass, so a callback that runs later sees the final value — `let` gives each pass its own copy.",
};

// ══════════════════════════════════════════════════════
//  Ch09 · Scaffold
// ══════════════════════════════════════════════════════

const jsMinimalProgram: ZenRule = {
  id: "js_minimal_program",
  principle: "nothing but what the job needs",
  isRelevant: (code) => CONSOLE_LOG.test(scrub(code)),
  check: (code) => {
    const src = scrub(code);
    return !/\b(function|const|let|var|class)\b|=>/.test(src);
  },
  bonusXP: 5,
  jolt: "one call. no variable holding the text first, no function wrapped around it. kira's note in the margin says she charges by the line. you'd be cheap.",
  suggestion: "the whole job is one call: `console.log(\"Hello World\");`. a variable or a function around it is a line to read that does nothing.",
};

// ══════════════════════════════════════════════════════
//  Ch09 · Hail
// ══════════════════════════════════════════════════════

const jsDelayParam: ZenRule = {
  id: "js_delay_param",
  principle: "the timer reads the parameter",
  isRelevant: (code) => {
    const body = findFunction(code, "hail")?.body;
    return body !== undefined && SET_TIMEOUT.test(body);
  },
  check: (code) => {
    const delay = paramNames(code, "hail")[1];
    if (!delay) return false;
    const body = findFunction(code, "hail")!.body;
    return callArgs(body, SET_TIMEOUT).every((a) => new RegExp(`\\b${delay}\\b`).test(topLevelArgs(a)[1] ?? ""));
  },
  bonusXP: 10,
  jolt: "the timer waits `delayMs` — whatever the caller asked for. the terminal only tried 100. the teams won't be that polite, and your hail is ready for any of them.",
  suggestion: "the timer's delay should be the parameter, `delayMs`, not a number you picked. the terminal only tries 100 — the next team answers on its own time.",
};

const jsSyncExecutor: ZenRule = {
  id: "js_sync_executor",
  principle: "the promise executor is never async",
  isRelevant: (code) => /\bnew\s+Promise\s*\(/.test(scrub(code)),
  check: (code) => !/\bnew\s+Promise\s*\(\s*async\b/.test(scrub(code)),
  bonusXP: 10,
  jolt: "a plain function inside `new Promise(...)`. it starts the timer and returns — the timer calls `resolve` later. an `async` one there would swallow its own errors, and the promise would hang without a word.",
  suggestion: "the function you hand `new Promise` shouldn't be `async`. if it throws, the error vanishes and the promise never settles. start the timer and let it call `resolve`.",
};

const jsNoRedundantAsync: ZenRule = {
  id: "js_no_redundant_async",
  principle: "a function that returns a promise doesn't need async",
  isRelevant: (code) => findFunction(code, "hail") !== null,
  check: (code) => !/\basync\s+function\s+hail\b|\bhail\s*=\s*async\b/.test(scrub(code)),
  bonusXP: 5,
  jolt: "hail isn't `async` — it builds its promise and hands it straight back. `async` is for functions that `await` inside. this one never waits for anything. it just makes a promise and leaves.",
  suggestion: "hail already returns a promise, so `async` adds nothing — it just wraps your promise in another one. drop it: `function hail(team, delayMs) { return new Promise(...); }`.",
};

// ══════════════════════════════════════════════════════
//  Ch09 · First contact
// ══════════════════════════════════════════════════════

const jsRaceEveryTeam: ZenRule = {
  id: "js_race_every_team",
  principle: "race every runner you were handed",
  isRelevant: (code) => {
    const body = findFunction(code, "firstResponder")?.body;
    return body !== undefined && /\bPromise\s*\.\s*race\s*\(/.test(body);
  },
  check: (code) => {
    const body = findFunction(code, "firstResponder")!.body;
    return paramNames(code, "firstResponder").every((p) => new RegExp(`\\b${p}\\b`).test(body));
  },
  bonusXP: 10,
  jolt: "all three teams in the race. today bravo was fastest. tomorrow it's whoever it is — and your code doesn't care, because it never guessed.",
  suggestion: "put every team in the race: `Promise.race([alpha, bravo, charlie])`. racing only the one you expect to win is a guess, and it's wrong the day another team is faster.",
};

const jsNoThenChain: ZenRule = {
  id: "js_no_then_chain",
  principle: "return the promise — no .then that changes nothing",
  isRelevant: (code) => findFunction(code, "firstResponder") !== null,
  check: (code) => !/\.\s*then\s*\(/.test(findFunction(code, "firstResponder")!.body),
  bonusXP: 5,
  jolt: "`return Promise.race([...])` and nothing tacked on. the caller awaits it and gets the answer. no `.then((v) => v)` passing the value back to itself.",
  suggestion: "hand the race straight back: `return Promise.race([alpha, bravo, charlie]);`. a `.then` that only passes the value along is an extra hop the reader has to follow.",
};

// ══════════════════════════════════════════════════════
//  Ch09 · Timeout
// ══════════════════════════════════════════════════════

const jsDeadlineParam: ZenRule = {
  id: "js_deadline_param",
  principle: "the deadline comes from the caller",
  isRelevant: (code) => {
    const body = findFunction(code, "awaitContact")?.body;
    return body !== undefined && (SET_TIMEOUT.test(body) || /\bsleep\s*\(/.test(body));
  },
  check: (code) => {
    const timeout = paramNames(code, "awaitContact")[3];
    if (!timeout) return false;
    return new RegExp(`\\b${timeout}\\b`).test(findFunction(code, "awaitContact")!.body);
  },
  bonusXP: 10,
  jolt: "the deadline is `timeoutMs` — the caller's number, not yours. 600 when there's time, 200 when there isn't. one function, every stairwell.",
  suggestion: "build the deadline from `timeoutMs`, not a number you typed. the terminal happens to pass values your number survives — the next caller won't.",
};

const jsSweepNoWait: ZenRule = {
  id: "js_sweep_no_wait",
  principle: "a sweep never waits",
  isRelevant: (code) => findFunction(code, "sweep") !== null,
  check: (code) => !/\bawait\b|\bsetTimeout\s*\(|\bsleep\s*\(|\.\s*then\s*\(/.test(findFunction(code, "sweep")!.body),
  bonusXP: 10,
  jolt: "sweep looks and leaves. no `await`, no timer, no sleep — a settled promise beats the ready string, a pending one loses on the spot. a glance, not a wait.",
  suggestion: "sweep shouldn't await, sleep or start a timer — it should only look: `return Promise.race([p, \"channel silent\"]);`. a settled `p` wins, a pending one loses straight away.",
};

// ══════════════════════════════════════════════════════
//  Registry
// ══════════════════════════════════════════════════════

export const JAVASCRIPT_ZEN_RULES: Record<string, ZenRule[]> = {
  "chapter-01:scaffold": [jsSemicolons],
  "chapter-01:location": [jsTemplateLiteral, jsNamedImports, jsConstDefault],
  "chapter-02:scaffold": [jsTopLevel],
  "chapter-02:loop": [jsLetCounter, jsBlockBraces],
  "chapter-02:classify": [jsExclusiveBranches, jsCatchAll, jsStrictEquality],
  "chapter-02:rewrite": [jsSwitchBreak],
  "chapter-03:scaffold": [jsConsistentQuotes],
  "chapter-03:sumfunc": [jsRestParams, jsForOf, jsPureFunction],
  "chapter-03:validate": [jsDirectBool, jsReuseSum, jsDestructure],
  "chapter-04:scaffold": [jsPlainString],
  "chapter-04:guardmap": [jsObjectLiteral, jsTrailingComma],
  "chapter-04:clearfloors": [jsSetLookup, jsObjectValues, jsFloorTemplate],
  "chapter-04.2:scaffold": [jsNoImportNeeded],
  "chapter-04.2:reverseword": [jsSpreadChars, jsBuiltinReverse],
  "chapter-04.2:encode": [jsMapTransform, jsReuseReverse],
  "chapter-04.2:relayheader": [jsNumberIsNaN, jsNumberOverParseInt, jsHeaderTemplate],
  "chapter-07:scaffold": [jsLogForOutput],
  "chapter-07:scan": [jsFinallyLog, jsClosureCounter, jsEndsWith],
  "chapter-07:recover": [jsThrowError, jsErrorMessage, jsShorthandProps],
  "chapter-08:scaffold": [jsSyncInOrder],
  "chapter-08:goroutine": [jsReuseCut, jsExplicitDelay, jsNoNeedlessAsync],
  "chapter-08:fanout": [jsPromiseAllConcurrent, jsMapNotPush],
  "chapter-08:window": [jsPromisifiedSleep, jsMapIndex, jsNoVar],
  "chapter-09:scaffold": [jsMinimalProgram],
  "chapter-09:hail": [jsDelayParam, jsSyncExecutor, jsNoRedundantAsync],
  "chapter-09:first": [jsRaceEveryTeam, jsNoThenChain],
  "chapter-09:timeout": [jsDeadlineParam, jsSweepNoWait],
};
