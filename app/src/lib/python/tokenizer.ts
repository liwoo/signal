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
  return regexTokenize(source, TOKEN_REGEX, classify);
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
