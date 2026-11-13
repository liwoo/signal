// ── Rust Tokenizer ──
// Highlighting + light analysis for the Rust route. Same Token shape as every
// other language so the editor renders them identically. Macros (`println!`)
// are one builtin token including the bang; lifetimes (`'a`) are types.

import type { Token, TokenType } from "@/lib/lang/types";
import { regexTokenize } from "@/lib/lang/regex-tokenizer";

export const RS_KEYWORDS = new Set([
  "as", "async", "await", "break", "const", "continue", "crate", "dyn", "else",
  "enum", "extern", "fn", "for", "if", "impl", "in", "let", "loop", "match",
  "mod", "move", "mut", "pub", "ref", "return", "self", "Self", "static",
  "struct", "super", "trait", "type", "unsafe", "use", "where", "while",
]);

export const RS_LITERALS = new Set(["true", "false", "None", "Some", "Ok", "Err"]);

export const RS_TYPES = new Set([
  "i8", "i16", "i32", "i64", "i128", "isize",
  "u8", "u16", "u32", "u64", "u128", "usize",
  "f32", "f64", "bool", "char", "str", "String",
  "Vec", "Option", "Result", "Box", "HashMap", "HashSet",
]);

/** Macros a beginner meets — highlighted (and completed) as builtins. */
export const RS_MACROS = new Set([
  "println", "print", "eprintln", "format", "vec", "panic", "assert", "assert_eq", "todo",
]);

const TOKEN_REGEX =
  /\/\/[^\n]*|\/\*[\s\S]*?\*\/|b?r#*"[\s\S]*?"#*|b?"(?:[^"\\]|\\[\s\S])*"|b?'(?:[^'\\\n]|\\[^\n]{1,10}?)'|'[A-Za-z_]\w*|0[xX][0-9a-fA-F_]+(?:[iu]\d+|[iu]size)?|0[oO][0-7_]+|0[bB][01_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?(?:[iu]\d+|[iu]size|f32|f64)?|[A-Za-z_]\w*(?:!(?!=))?|::|->|=>|\.\.=|\.\.|==|!=|<=|>=|&&|\|\||\+=|-=|\*=|\/=|%=|\S/g;

const MULTI_OPS = new Set(["::", "->", "=>", "..=", "..", "==", "!=", "<=", ">=", "&&", "||", "+=", "-=", "*=", "/=", "%="]);

function classify(value: string): TokenType {
  if (value.startsWith("//") || value.startsWith("/*")) return "comment";
  if (/^b?r#*"/.test(value) || /^b?"/.test(value)) return "string";
  if (/^b?'(?:[^'\\]|\\.)/.test(value) && value.endsWith("'") && value.length > 2) return "string";
  if (value[0] === "'") return "type"; // lifetime
  if (/^\d/.test(value)) return "number";
  if (value.endsWith("!") && value.length > 1 && /^[A-Za-z_]/.test(value)) return "builtin";
  if (/^[A-Za-z_]\w*$/.test(value)) {
    if (RS_KEYWORDS.has(value)) return "keyword";
    if (RS_LITERALS.has(value)) return "type";
    if (RS_TYPES.has(value)) return "type";
    return "identifier";
  }
  if (MULTI_OPS.has(value)) return "operator";
  if ("+-*/%&|^~<>=!?:@".includes(value)) return "operator";
  if ("(){}[];,.#".includes(value)) return "punctuation";
  return "unknown";
}

export function tokenize(source: string): Token[] {
  return regexTokenize(source, TOKEN_REGEX, classify);
}

/** True when `pos` sits inside a "..." string literal (comments skipped). */
export function isInsideRustString(code: string, pos: number): boolean {
  let inString = false;
  for (let i = 0; i < pos; i++) {
    const ch = code[i];
    if (inString) {
      if (ch === "\\") { i++; continue; }
      if (ch === '"') inString = false;
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
    if (ch === "'" && code[i + 2] === "'") { i += 2; continue; } // 'x' char literal
    if (ch === '"') inString = true;
  }
  return inString;
}
