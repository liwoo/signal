// ── Python Diagnostics ──
// Instant local lint before anything runs. There's no Python parser on this
// side, so only checks that are certain live here — brackets, a missing `:`
// after a block opener, and other languages' print calls. Everything else is
// reported by the real interpreter, with real line numbers.

import type { Diagnostic, Token } from "@/lib/lang/types";
import { tokenize } from "./tokenizer";

const OPEN_TO_CLOSE: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const CLOSE_TO_OPEN: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

const BLOCK_OPENERS = new Set(["if", "elif", "else", "for", "while", "def", "class", "try", "except", "finally", "with"]);

export function diagnose(source: string): Diagnostic[] {
  const tokens = tokenize(source).filter((t) => t.type !== "comment");
  const brackets = checkBrackets(tokens);
  if (brackets.length > 0) return brackets;
  return [...checkMissingColon(tokens), ...checkForeignPrint(tokens)];
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

/** `if x > 3` with no colon. Only flags lines whose brackets balance and that don't continue. */
function checkMissingColon(tokens: Token[]): Diagnostic[] {
  const byLine = new Map<number, Token[]>();
  for (const t of tokens) {
    if (!byLine.has(t.line)) byLine.set(t.line, []);
    byLine.get(t.line)!.push(t);
  }
  const out: Diagnostic[] = [];
  for (const line of byLine.values()) {
    const first = line[0];
    if (first.type !== "keyword" || !BLOCK_OPENERS.has(first.value)) continue;
    // `x = a if b else c` style lines start with an identifier, so they never reach here.
    let depth = 0;
    let sawColonAtDepth0 = false;
    for (const t of line) {
      if (OPEN_TO_CLOSE[t.value]) depth++;
      else if (CLOSE_TO_OPEN[t.value]) depth--;
      else if (t.value === ":" && depth === 0) sawColonAtDepth0 = true;
    }
    const last = line[line.length - 1];
    if (depth !== 0 || last.value === "\\" || last.type === "string" && last.value.startsWith('"""')) continue;
    if (!sawColonAtDepth0) {
      out.push({ severity: "error", message: `\`${first.value}\` opens a block — end the line with a colon \`:\`.`, line: last.line, col: last.col + last.value.length, length: 1 });
    }
  }
  return out;
}

function defines(tokens: Token[], name: string): boolean {
  return tokens.some((t, i) =>
    t.value === name &&
    (tokens[i - 1]?.value === "def" || tokens[i - 1]?.value === "import" || tokens[i - 1]?.value === "as" || tokens[i + 1]?.value === "="),
  );
}

function checkForeignPrint(tokens: Token[]): Diagnostic[] {
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i];
    if (t.type !== "identifier" || tokens[i - 1]?.value === ".") continue;
    if (t.value === "fmt" && tokens[i + 1].value === "." && !defines(tokens, "fmt")) {
      return [err(t, "`fmt` is go. in python you print with `print(...)`.")];
    }
    if (t.value === "console" && tokens[i + 1].value === "." && !defines(tokens, "console")) {
      return [err(t, "`console.log` is javascript. in python you print with `print(...)`.")];
    }
  }
  return [];
}
