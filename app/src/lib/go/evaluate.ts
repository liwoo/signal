// ── Go Code Evaluator ──
// Evaluates Go code submissions against challenge acceptance criteria.
// Runs client-side — no backend compiler needed.

import { tokenize, type Token } from "./tokenizer";
import { diagnose, type Diagnostic } from "./diagnostics";
import type { ChallengeStep } from "@/types/game";

export interface EvalResult {
  pass: boolean;
  errors: Diagnostic[];
  warnings: Diagnostic[];
  feedback: string;
  predictedOutput: string | null;
}

// ── Public API ──

export function evaluateSubmission(
  code: string,
  step: ChallengeStep
): EvalResult {
  const diagnostics = diagnose(code);
  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");

  // If there are syntax errors, reject immediately
  if (errors.length > 0) {
    const firstError = errors[0];
    return {
      pass: false,
      errors,
      warnings,
      feedback: `syntax error (line ${firstError.line}): ${firstError.message}`,
      predictedOutput: null,
    };
  }

  // Predict output by analyzing print statements
  const tokens = tokenize(code);
  const predictedOutput = predictOutput(tokens, code);

  // Reject if code contains TODO markers (clearly unfinished)
  if (/\/\/\s*TODO/i.test(code)) {
    return {
      pass: false,
      errors,
      warnings,
      feedback: "code contains TODO comments — finish the implementation first",
      predictedOutput,
    };
  }

  // Compare predicted output to expected behavior
  const pass = matchesExpected(predictedOutput, step.expectedBehavior);

  const feedback = pass
    ? "output matches expected behavior"
    : buildMismatchFeedback(predictedOutput, step.expectedBehavior);

  return { pass, errors, warnings, feedback, predictedOutput };
}

// ── Output Prediction ──
// Extracts string literals from fmt.Println/Printf/Print calls
// to predict what the program would output.

function predictOutput(tokens: Token[], source: string): string {
  const lines: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    // Look for fmt.Println, fmt.Printf, fmt.Print
    if (t.type === "identifier" && t.value === "fmt" && tokens[i + 1]?.value === ".") {
      const method = tokens[i + 2];
      if (!method) continue;

      if (method.value === "Println") {
        const output = extractPrintlnArgs(tokens, i + 3, source);
        if (output !== null) lines.push(output);
      } else if (method.value === "Printf") {
        const output = extractPrintfArgs(tokens, i + 3, source);
        if (output !== null) lines.push(output);
      } else if (method.value === "Print") {
        const output = extractPrintArgs(tokens, i + 3, source);
        if (output !== null) lines.push(output);
      }
    }
  }

  return lines.join("\n");
}

function extractPrintlnArgs(tokens: Token[], startIdx: number, _source: string): string | null {
  // Expect ( after Println
  if (tokens[startIdx]?.value !== "(") return null;

  const args = extractArgs(tokens, startIdx);
  if (args === null) return null;

  // Println joins args with space and adds newline (newline handled by join later)
  return args.join(" ");
}

function extractPrintfArgs(tokens: Token[], startIdx: number, _source: string): string | null {
  if (tokens[startIdx]?.value !== "(") return null;

  const args = extractArgsRaw(tokens, startIdx);
  if (args === null || args.length === 0) return null;

  // First arg is the format string
  const format = args[0];
  if (!format.startsWith('"') && !format.startsWith("`")) return null;

  let formatStr = unquoteString(format);
  const valueArgs = args.slice(1);

  // Replace format verbs with arg values
  let argIdx = 0;
  formatStr = formatStr.replace(/%[sdtfvxXoObBeEgGqcp%]/g, (verb) => {
    if (verb === "%%") return "%";
    if (argIdx < valueArgs.length) {
      return resolveArgValue(valueArgs[argIdx++]);
    }
    return verb;
  });

  // Remove trailing \n for consistency (we rejoin with \n)
  if (formatStr.endsWith("\n")) {
    formatStr = formatStr.slice(0, -1);
  }

  return formatStr;
}

function extractPrintArgs(tokens: Token[], startIdx: number, _source: string): string | null {
  if (tokens[startIdx]?.value !== "(") return null;
  const args = extractArgs(tokens, startIdx);
  if (args === null) return null;
  return args.join("");
}

// ── Arg Extraction Helpers ──

function extractArgs(tokens: Token[], parenIdx: number): string[] | null {
  const raw = extractArgsRaw(tokens, parenIdx);
  if (raw === null) return null;
  return raw.map(resolveArgValue);
}

function extractArgsRaw(tokens: Token[], parenIdx: number): string[] | null {
  if (tokens[parenIdx]?.value !== "(") return null;

  const args: string[] = [];
  let depth = 0;
  let currentArg = "";

  for (let i = parenIdx; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.value === "(") {
      depth++;
      if (depth === 1) continue; // skip opening paren
    }
    if (t.value === ")") {
      depth--;
      if (depth === 0) {
        if (currentArg.trim()) args.push(currentArg.trim());
        break;
      }
    }
    if (t.value === "," && depth === 1) {
      if (currentArg.trim()) args.push(currentArg.trim());
      currentArg = "";
      continue;
    }
    if (depth >= 1) {
      currentArg += t.value;
    }
  }

  return args;
}

function resolveArgValue(arg: string): string {
  // String literal
  if (arg.startsWith('"') || arg.startsWith("`")) {
    return unquoteString(arg);
  }
  // Number literal
  if (/^\d+(\.\d+)?$/.test(arg)) {
    return arg;
  }
  // Boolean
  if (arg === "true" || arg === "false") {
    return arg;
  }
  // Identifier — we can't resolve variable values statically
  return `<${arg}>`;
}

function unquoteString(s: string): string {
  if (s.startsWith("`") && s.endsWith("`")) {
    return s.slice(1, -1);
  }
  if (s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  return s;
}

// ── Output Matching ──

function matchesExpected(predicted: string, expected: string): boolean {
  // Normalize whitespace and compare
  const normPredicted = normalizeOutput(predicted);
  const normExpected = normalizeOutput(expected);

  if (normPredicted === normExpected) return true;

  // Partial match — only if line count matches AND all literal fragments appear
  if (predicted.includes("<")) {
    const pLines = normPredicted.split("\n");
    const eLines = normExpected.split("\n");
    if (pLines.length !== eLines.length) return false;
    return checkFragmentMatch(normPredicted, normExpected);
  }

  return false;
}

function normalizeOutput(s: string): string {
  return s
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
}

function checkFragmentMatch(predicted: string, expected: string): boolean {
  // Extract all literal parts from the predicted output (non-placeholder segments)
  const parts = predicted.split(/<[^>]+>/).filter((p) => p.trim().length > 0);

  if (parts.length === 0) return false;

  // All literal parts must appear in the expected output
  if (!parts.every((part) => expected.includes(part.trim()))) return false;

  // The literal fragments must cover at least 50% of the expected output length
  // to avoid false positives from tiny fragments like "Sum:" matching
  const coveredChars = parts.reduce((sum, p) => sum + p.trim().length, 0);
  const expectedLength = expected.replace(/\s/g, "").length;

  return coveredChars / expectedLength >= 0.5;
}

function buildMismatchFeedback(predicted: string, expected: string): string {
  if (!predicted || predicted.trim() === "") {
    return "no output detected — make sure you're using fmt.Println or fmt.Printf";
  }
  if (predicted.includes("<")) {
    return "can't fully predict output — variables need values. check your logic matches the expected output";
  }
  // Show what we got vs expected
  const pLines = predicted.split("\n");
  const eLines = expected.split("\n");

  if (pLines.length !== eLines.length) {
    return `expected ${eLines.length} line${eLines.length !== 1 ? "s" : ""} of output, got ${pLines.length}`;
  }

  // Find first differing line
  for (let i = 0; i < pLines.length; i++) {
    if (pLines[i].trim() !== eLines[i].trim()) {
      return `line ${i + 1}: expected "${eLines[i].trim()}", got "${pLines[i].trim()}"`;
    }
  }

  return "output doesn't match expected behavior";
}
