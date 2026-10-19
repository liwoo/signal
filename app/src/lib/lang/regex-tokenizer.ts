// ── Regex tokenizer core ──
// Single-pass tokenizer shared by the JavaScript and Python services (Go keeps
// its own, older copy). Each language supplies one global regex whose
// alternatives match a whole token, plus a classifier.

import type { Token, TokenType } from "./types";

export function regexTokenize(
  source: string,
  regex: RegExp,
  classify: (value: string) => TokenType,
): Token[] {
  const tokens: Token[] = [];
  let line = 1;
  let lineStart = 0;
  let prevEnd = 0;

  regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    const value = match[0];
    if (value.length === 0) {
      regex.lastIndex++;
      continue;
    }
    const start = match.index;

    // Newlines between the previous token and this one
    for (let i = prevEnd; i < start; i++) {
      if (source[i] === "\n") {
        line++;
        lineStart = i + 1;
      }
    }

    tokens.push({ type: classify(value), value, line, col: start - lineStart + 1, start, end: start + value.length });

    // Newlines inside the token (block comments, multi-line strings)
    for (let i = 0; i < value.length; i++) {
      if (value[i] === "\n") {
        line++;
        lineStart = start + i + 1;
      }
    }
    prevEnd = start + value.length;
  }
  return tokens;
}
