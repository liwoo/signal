// ── JavaScript Diagnostics ──
// Instant local lint before anything runs. Errors block submission, so every
// check here must be certain — when in doubt, leave it to the runtime, which
// reports real errors with real line numbers anyway.

import { parse } from "acorn";
import type { Diagnostic } from "@/lib/lang/types";
import { tokenize } from "./tokenizer";
import type { Token } from "@/lib/lang/types";

export const CONSOLE_METHODS = new Set([
  "log", "error", "warn", "info", "debug", "table", "dir", "trace", "assert",
  "count", "countReset", "group", "groupEnd", "time", "timeEnd", "timeLog", "clear",
]);

const OPEN_TO_CLOSE: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const CLOSE_TO_OPEN: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

export function diagnose(source: string): Diagnostic[] {
  const tokens = tokenize(source).filter((t) => t.type !== "comment");
  const out: Diagnostic[] = [];

  // The parser is the authority on syntax. Only when it fails do we look for an
  // unbalanced bracket, which can name the line the bracket OPENED on (the
  // parser can only point at where it gave up).
  const syntax = checkSyntax(source);
  if (syntax) {
    const brackets = checkBrackets(tokens);
    out.push(brackets.length > 0 ? brackets[0] : syntax);
  }
  out.push(...checkForeignPrint(tokens));
  out.push(...checkConsole(tokens));
  return out;
}

// ── Brackets: name the line the unclosed one OPENED on ──

function checkBrackets(tokens: Token[]): Diagnostic[] {
  const stack: Token[] = [];
  for (const t of tokens) {
    if (t.type !== "punctuation") continue;
    if (OPEN_TO_CLOSE[t.value]) {
      stack.push(t);
    } else if (CLOSE_TO_OPEN[t.value]) {
      const top = stack[stack.length - 1];
      if (!top) {
        return [err(t, `there's an extra \`${t.value}\` here with nothing to close.`)];
      }
      if (OPEN_TO_CLOSE[top.value] !== t.value) {
        return [err(t, `expected \`${OPEN_TO_CLOSE[top.value]}\` to close the \`${top.value}\` from line ${top.line}, but found \`${t.value}\`.`)];
      }
      stack.pop();
    }
  }
  const unclosed = stack[stack.length - 1];
  if (unclosed) {
    return [err(unclosed, `this \`${unclosed.value}\` is never closed — add a matching \`${OPEN_TO_CLOSE[unclosed.value]}\`.`)];
  }
  return [];
}

// ── Syntax (acorn) in plain words ──

export function friendlySyntax(message: string): string {
  const m = message.replace(/\s*\(\d+:\d+\)\s*$/, "");
  if (/^Unterminated string constant/.test(m)) return "this string never closes — add the matching quote.";
  if (/^Unterminated template/.test(m)) return "this template string never closes — add the closing backtick `.";
  const dup = m.match(/^Identifier '(.+)' has already been declared/);
  if (dup) return `\`${dup[1]}\` is already declared — declare it once, then reuse it without let/const.`;
  if (/^'return' outside of function/.test(m)) return "`return` only works inside a function.";
  if (/^Assigning to rvalue/.test(m)) return "the left side of `=` has to be a variable.";
  if (/^Unexpected keyword '(.+)'/.test(m)) return `${m.toLowerCase()} — check the line above for something left unfinished.`;
  if (/^Unexpected token/.test(m)) return "something's out of place here — a missing comma, quote, or operator?";
  if (/^Unexpected character/.test(m)) return `${m.toLowerCase()} — that symbol doesn't belong in javascript.`;
  return m.charAt(0).toLowerCase() + m.slice(1);
}

function checkSyntax(source: string): Diagnostic | null {
  try {
    parse(source, { ecmaVersion: "latest", sourceType: "module", locations: true });
    return null;
  } catch (e) {
    const error = e as SyntaxError & { loc?: { line: number; column: number } };
    if (!error.loc) return null;
    return { severity: "error", message: friendlySyntax(error.message), line: error.loc.line, col: error.loc.column + 1, length: 1 };
  }
}

// ── Cross-language slips: Go's fmt.Println, Python's print() ──

function declares(tokens: Token[], name: string): boolean {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.value !== name || t.type !== "identifier") continue;
    const prev = tokens[i - 1]?.value;
    if (prev === "const" || prev === "let" || prev === "var" || prev === "function" || prev === "class") return true;
    // import { name } / import * as name / function f(name)
    if (prev === "as" || prev === "{" || prev === ",") {
      const before = tokens.slice(0, i).map((x) => x.value);
      if (before.includes("import")) return true;
    }
  }
  return false;
}

function checkForeignPrint(tokens: Token[]): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== "identifier") continue;
    const next = tokens[i + 1];
    const prev = tokens[i - 1];
    if (prev?.value === ".") continue;
    if (t.value === "fmt" && next?.value === "." && !declares(tokens, "fmt")) {
      out.push(err(t, "`fmt` is go. in javascript you print with `console.log(...)`."));
      break;
    }
    if (t.value === "print" && next?.value === "(" && !declares(tokens, "print")) {
      out.push(err(t, "`print()` is python. in javascript you print with `console.log(...)`."));
      break;
    }
  }
  return out;
}

// ── console.<method> typos ──

function checkConsole(tokens: Token[]): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (let i = 0; i < tokens.length - 2; i++) {
    const t = tokens[i];
    if (tokens[i + 1].value !== "." || tokens[i - 1]?.value === ".") continue;
    const member = tokens[i + 2];
    if (t.value === "Console" && !declares(tokens, "Console")) {
      out.push(err(t, "javascript is case-sensitive — it's lowercase `console`."));
      continue;
    }
    if (t.value !== "console" || member.type !== "identifier" && member.type !== "keyword") continue;
    if (CONSOLE_METHODS.has(member.value)) continue;
    const lower = member.value.toLowerCase();
    const hint = lower === "log" ? "it's lowercase: `console.log`." :
      lower.startsWith("print") || lower.startsWith("write") ? "javascript prints with `console.log(...)`." :
      "did you mean `console.log`?";
    out.push(err(member, `console has no \`${member.value}\` — ${hint}`));
  }
  return out;
}

function err(t: Token, message: string): Diagnostic {
  return { severity: "error", message, line: t.line, col: t.col, length: t.value.length };
}
