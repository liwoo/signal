// ── Rust behind the LanguageService seam ──
// Rust compiles remotely on the Rust Playground (through /api/rust), the way Go
// compiles on go.dev. The Playground takes one file, so a test harness swaps
// the player's `fn main` and a shipped module is inlined where the player
// declares `mod name;`. Unreachable → "offline", and the engine falls back to
// local pattern matching.

import { isInsideRustString, tokenize } from "@/lib/rust/tokenizer";
import { diagnose } from "@/lib/rust/diagnostics";
import {
  extraPackagesFromModule,
  getCompletions,
  getKnownPackages,
  getSymbolCompletions,
  isPackageImported,
} from "@/lib/rust/completions";
import { executeRust, formatRust } from "@/lib/rust/playground";
import { buildRustSource, explainRustError, firstRustError, rustPanic, RS_TIMEOUT_ERROR } from "@/lib/rust/harness";
import type { LanguageService, RunRequest, RunResult } from "./types";

async function run(req: RunRequest): Promise<RunResult> {
  const source = buildRustSource(req.code, req.harness, req.module);
  const out = await executeRust(source);
  if (!out) return { status: "offline", stdout: "", error: "", warning: "" };
  if (out.success) return { status: "ok", stdout: out.stdout, error: "", warning: "" };

  const compileError = firstRustError(out.stderr);
  if (compileError) return { status: "error", stdout: "", error: compileError, warning: "" };
  const panic = rustPanic(out.stderr);
  if (panic) return { status: "error", stdout: out.stdout, error: panic, warning: "" };
  if (/signal 9|timed out|timeout|deadline has elapsed|bytes of output/i.test(`${out.exitDetail} ${out.stderr}`)) {
    return { status: "error", stdout: out.stdout, error: RS_TIMEOUT_ERROR, warning: "" };
  }
  return { status: "error", stdout: out.stdout, error: out.stderr.trim() || out.exitDetail || "the program crashed.", warning: "" };
}

export const rustService: LanguageService = {
  id: "rust",
  label: "Rust",
  mainFile: "main.rs",
  lineComment: "//",
  tokenize,
  isInsideString: isInsideRustString,
  getCompletions,
  getKnownPackages,
  isPackageImported,
  getSymbolCompletions,
  extraPackagesFromModule,
  diagnose,
  format: formatRust,
  run,
  explainError: explainRustError,
  explainWarning: (raw, inRush) => `${inRush ? "hurry — " : ""}${raw}`,
  // Like Go, Rust qualifies the name (`cellblock::CELL`), so a hardcoded string can't satisfy it.
  codeForRequiredCheck: (code) => code,
};
