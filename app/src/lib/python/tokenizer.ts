// ── Python Tokenizer ──
// Highlighting + light analysis for the Python route. Same Token shape as the
// Go tokenizer so the editor renders every language identically.

import type { Token, TokenType } from "@/lib/lang/types";
import { regexTokenize } from "@/lib/lang/regex-tokenizer";

export const PY_KEYWORDS = new Set([
  "and", "as", "assert", "async", "await", "break", "case", "class", "continue",
  "def", "del", "elif", "else", "except", "finally", "for", "from", "global",
  "if", "import", "in", "is", "lambda", "match", "nonlocal", "not", "or",
  "pass", "raise", "return", "try", "while", "with", "yield",
]);

export const PY_CONSTANTS = new Set(["True", "False", "None"]);

export const PY_TYPES = new Set(["int", "str", "float", "bool", "list", "dict", "set", "tuple", "bytes", "object"]);

export const PY_BUILTINS = new Set([
  "print", "len", "range", "sum", "min", "max", "abs", "round", "sorted",
  "reversed", "enumerate", "zip", "map", "filter", "any", "all", "input",
  "isinstance", "type", "repr", "format", "iter", "next", "open", "divmod",
  "chr", "ord", "hex", "bin", "pow", "hash", "id", "super", "getattr",
  "setattr", "hasattr", "frozenset",
]);

const TOKEN_REGEX =
  /#[^\n]*|(?:[rRbBuUfF]{1,2})?(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?j?|\.\d+|[a-zA-Z_]\w*|\*\*=|\/\/=|>>=|<<=|->|:=|==|!=|<=|>=|\*\*|\/\/|<<|>>|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|\S/g;

const MULTI_OPS = new Set([
  "**=", "//=", ">>=", "<<=", "->", ":=", "==", "!=", "<=", ">=", "**", "//",
  "<<", ">>", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=",
]);

function classify(value: string): TokenType {
  if (value.startsWith("#")) return "comment";
  if (/^[rRbBuUfF]{0,2}["']/.test(value)) return "string";
  if (/^\.?\d/.test(value)) return "number";
  if (/^[a-zA-Z_]\w*$/.test(value)) {
    if (PY_KEYWORDS.has(value)) return "keyword";
    if (PY_CONSTANTS.has(value) || PY_TYPES.has(value)) return "type";
    if (PY_BUILTINS.has(value)) return "builtin";
    return "identifier";
  }
  if (MULTI_OPS.has(value)) return "operator";
  if ("+-*/%&|^~<>=!@".includes(value)) return "operator";
  if ("(){}[];,.:".includes(value)) return "punctuation";
  return "unknown";
}

export function tokenize(source: string): Token[] {
  const tokens = regexTokenize(source, TOKEN_REGEX, classify);
  // f-strings come back as one flat string token; split interpolations out so
  // the code inside { } is highlighted like code, not frozen inside the string.
  if (!source.includes("{")) return tokens;
  const out: Token[] = [];
  for (const t of tokens) {
    if (t.type === "string" && t.value.includes("{") && isFString(t.value)) {
      out.push(...expandFString(t, source));
    } else {
      out.push(t);
    }
  }
  return out;
}

/** True when the string literal's prefix carries an f/F (an f-string). */
function isFString(value: string): boolean {
  const m = /^[rRbBuUfF]{1,2}/.exec(value);
  return !!m && /[fF]/.test(m[0]);
}

function lineColAt(source: string, index: number): { line: number; col: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, col: index - lineStart + 1 };
}

/**
 * Walk a `{ ... }` replacement field, respecting nested brackets and quotes.
 * `open` points at the `{`. Returns the index of the matching `}` (or body end
 * if unterminated) and where the expression ends — i.e. the first top-level
 * format spec (`:`) or conversion (`!r`/`!s`/`!a`), whichever comes first.
 */
function scanInterpolation(v: string, open: number, bodyEnd: number): { closeIdx: number; exprEnd: number } {
  let depth = 0;
  let quote: string | null = null;
  let specAt = -1;
  let closeIdx = bodyEnd;
  for (let k = open; k < bodyEnd; k++) {
    const c = v[k];
    if (quote) {
      if (c === "\\") { k++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === "{" || c === "(" || c === "[") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) { closeIdx = k; break; }
    } else if (c === ")" || c === "]") {
      depth--;
    } else if (depth === 1 && specAt < 0) {
      if (c === ":") specAt = k;
      else if (c === "!" && /[rsa]/.test(v[k + 1] ?? "") && (v[k + 2] === "}" || v[k + 2] === ":")) specAt = k;
    }
  }
  return { closeIdx, exprEnd: specAt >= 0 ? specAt : closeIdx };
}

/**
 * Split one f-string token into sub-tokens: the literal text (and quotes/prefix)
 * stay `string`, each `{` / `}` is punctuation, and the expression between them
 * is tokenized as Python. Format specs (`:.2f`) and `{{`/`}}` escapes stay string.
 */
function expandFString(tok: Token, source: string): Token[] {
  const v = tok.value;
  const base = tok.start;
  const prefixLen = (/^[rRbBuUfF]{1,2}/.exec(v)?.[0].length) ?? 0;
  const quoteLen = /^("""|''')/.test(v.slice(prefixLen)) ? 3 : 1;
  const openEnd = prefixLen + quoteLen;
  const bodyEnd = v.length - quoteLen;
  if (bodyEnd <= openEnd) return [tok];

  const out: Token[] = [];
  const emit = (type: TokenType, s: number, e: number) => {
    if (e <= s) return;
    const abs = base + s;
    const { line, col } = lineColAt(source, abs);
    out.push({ type, value: v.slice(s, e), line, col, start: abs, end: base + e });
  };

  let litStart = 0; // the first chunk carries the prefix + opening quote
  let i = openEnd;
  while (i < bodyEnd) {
    const ch = v[i];
    if ((ch === "{" || ch === "}") && v[i + 1] === ch) { i += 2; continue; } // {{ or }} escape
    if (ch !== "{") { i++; continue; }

    emit("string", litStart, i); // literal text before the field
    const { closeIdx, exprEnd } = scanInterpolation(v, i, bodyEnd);
    emit("punctuation", i, i + 1); // "{"
    const exprStart = i + 1;
    for (const t of regexTokenize(v.slice(exprStart, exprEnd), TOKEN_REGEX, classify)) {
      const abs = base + exprStart + t.start;
      const { line, col } = lineColAt(source, abs);
      out.push({ ...t, start: abs, end: base + exprStart + t.end, line, col });
    }
    emit("string", exprEnd, closeIdx); // format spec / conversion, if any
    if (closeIdx < bodyEnd) emit("punctuation", closeIdx, closeIdx + 1); // "}"
    i = closeIdx < bodyEnd ? closeIdx + 1 : bodyEnd;
    litStart = i;
  }
  emit("string", litStart, v.length); // trailing text + closing quote
  return out;
}

/** True when `pos` sits inside a string literal (single, double, or triple quoted). */
export function isInsidePyString(code: string, pos: number): boolean {
  let quote: string | null = null;
  for (let i = 0; i < pos; i++) {
    const ch = code[i];
    if (quote) {
      if (ch === "\\") { i++; continue; }
      if (quote.length === 3) {
        if (code.startsWith(quote, i)) { i += 2; quote = null; }
      } else if (ch === quote || ch === "\n") {
        quote = null;
      }
      continue;
    }
    if (ch === "#") {
      const nl = code.indexOf("\n", i);
      if (nl === -1 || nl >= pos) return false;
      i = nl;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const triple = ch.repeat(3);
      if (code.startsWith(triple, i)) { quote = triple; i += 2; }
      else quote = ch;
    }
  }
  return quote !== null;
}
