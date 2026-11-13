// ── Rust Diagnostics ──
// Instant local lint before anything compiles. Only checks that are certain
// live here — brackets, a macro called without its `!`, and other languages'
// print calls. Everything else comes from the real compiler (rustc's errors
// are the best teacher there is), with real line numbers.

import type { Diagnostic, Token } from "@/lib/lang/types";
import { RS_MACROS, tokenize } from "./tokenizer";

const OPEN_TO_CLOSE: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const CLOSE_TO_OPEN: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

export function diagnose(source: string): Diagnostic[] {
  const tokens = tokenize(source).filter((t) => t.type !== "comment" && t.type !== "whitespace");
  const brackets = checkBrackets(tokens);
  if (brackets.length > 0) return brackets;
  return [...checkMacroBang(tokens), ...checkForeignPrint(tokens)];
}

function err(t: Token, message: string): Diagnostic {
  return { severity: "error", message, line: t.line, col: t.col, length: t.value.length };
}

function checkBrackets(tokens: Token[]): Diagnostic[] {
  const stack: Token[] = [];
  for (const t of tokens) {
    if (t.type !== "punctuation") continue;
    if (OPEN_TO_CLOSE[t.value]) stack.push(t);
    else if (CLOSE_TO_OPEN[t.value]) {
      const top = stack[stack.length - 1];
      if (!top) return [err(t, `there's an extra \`${t.value}\` here with nothing to close.`)];
      if (OPEN_TO_CLOSE[top.value] !== t.value) {
        return [err(t, `expected \`${OPEN_TO_CLOSE[top.value]}\` to close the \`${top.value}\` from line ${top.line}, but found \`${t.value}\`.`)];
      }
      stack.pop();
    }
  }
  const unclosed = stack[stack.length - 1];
  return unclosed ? [err(unclosed, `this \`${unclosed.value}\` is never closed — add a matching \`${OPEN_TO_CLOSE[unclosed.value]}\`.`)] : [];
}

/** Names the player defined themselves (`fn print(...)`), which may be called without a bang. */
function ownFunctions(tokens: Token[]): Set<string> {
  const out = new Set<string>();
  tokens.forEach((t, i) => {
    if (t.value === "fn" && tokens[i + 1]?.type === "identifier") out.add(tokens[i + 1].value);
  });
  return out;
}

/** `println("hi")` — a macro called like a function. */
function checkMacroBang(tokens: Token[]): Diagnostic[] {
  const own = ownFunctions(tokens);
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i];
    if (t.type !== "identifier" || !RS_MACROS.has(t.value) || own.has(t.value)) continue;
    if (tokens[i - 1]?.value === "." || tokens[i - 1]?.value === "::" || tokens[i - 1]?.value === "fn") continue;
    if (tokens[i + 1].value === "(") {
      return [err(t, `\`${t.value}\` is a macro — call it with a bang: \`${t.value}!(...)\`.`)];
    }
  }
  return [];
}

function checkForeignPrint(tokens: Token[]): Diagnostic[] {
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i];
    if (t.type !== "identifier" || tokens[i + 1].value !== ".") continue;
    if (tokens[i - 1]?.value === "." || tokens[i - 1]?.value === "::") continue;
    if (t.value === "fmt") return [err(t, "`fmt` is go. in rust you print with `println!(...)`.")];
    if (t.value === "console") return [err(t, "`console.log` is javascript. in rust you print with `println!(...)`.")];
  }
  return [];
}
