// ── JavaScript Tokenizer ──
// Highlighting + light analysis for the JavaScript route. Same Token shape as
// the Go tokenizer so the editor renders every language identically.

import type { Token, TokenType } from "@/lib/lang/types";
import { regexTokenize } from "@/lib/lang/regex-tokenizer";

export const JS_KEYWORDS = new Set([
  "async", "await", "break", "case", "catch", "class", "const", "continue",
  "debugger", "default", "delete", "do", "else", "export", "extends",
  "finally", "for", "from", "function", "if", "import", "in", "instanceof",
  "let", "new", "of", "return", "static", "super", "switch", "this", "throw",
  "try", "typeof", "var", "void", "while", "with", "yield",
]);

export const JS_LITERALS = new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]);

export const JS_GLOBALS = new Set([
  "console", "Math", "JSON", "Object", "Array", "String", "Number", "Boolean",
  "Map", "Set", "Date", "Promise", "Symbol", "Error", "RegExp", "BigInt",
  "parseInt", "parseFloat", "isNaN", "isFinite", "globalThis", "structuredClone",
]);

const TOKEN_REGEX =
  /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\[\s\S])*`|0[xX][0-9a-fA-F_]+n?|0[oO][0-7_]+n?|0[bB][01_]+n?|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?n?|\.\d+|[a-zA-Z_$][\w$]*|===|!==|\*\*=|\?\?=|\.\.\.|=>|==|!=|<=|>=|&&|\|\||\?\?|\?\.|\+\+|--|\+=|-=|\*=|\/=|%=|\*\*|\S/g;

const MULTI_OPS = new Set([
  "===", "!==", "**=", "??=", "...", "=>", "==", "!=", "<=", ">=", "&&", "||",
  "??", "?.", "++", "--", "+=", "-=", "*=", "/=", "%=", "**",
]);

function classify(value: string): TokenType {
  if (value.startsWith("//") || value.startsWith("/*")) return "comment";
  if (value[0] === '"' || value[0] === "'" || value[0] === "`") return "string";
  if (/^\.?\d/.test(value)) return "number";
  if (/^[a-zA-Z_$][\w$]*$/.test(value)) {
    if (JS_KEYWORDS.has(value)) return "keyword";
    if (JS_LITERALS.has(value)) return "type";
    if (JS_GLOBALS.has(value)) return "builtin";
    return "identifier";
  }
  if (MULTI_OPS.has(value)) return "operator";
  if ("+-*/%&|^~<>=!?:".includes(value)) return "operator";
  if ("(){}[];,.".includes(value)) return "punctuation";
  return "unknown";
}

export function tokenize(source: string): Token[] {
  return regexTokenize(source, TOKEN_REGEX, classify);
}

/** True when `pos` is inside a '...', "..." or `...` literal (comments skipped). */
export function isInsideJsString(code: string, pos: number): boolean {
  let quote: string | null = null;
  for (let i = 0; i < pos; i++) {
    const ch = code[i];
    if (quote) {
      if (ch === "\\") { i++; continue; }
      if (ch === quote || (ch === "\n" && quote !== "`")) quote = null;
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      const nl = code.indexOf("\n", i);
      if (nl === -1 || nl >= pos) return false;
      i = nl;
      continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      if (end === -1 || end + 2 > pos) return false;
      i = end + 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
  }
  return quote !== null;
}
