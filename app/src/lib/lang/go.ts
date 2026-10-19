// ── Go behind the LanguageService seam ──
// A thin wrapper over the existing lib/go/* modules — no behavior change. Go
// compiles remotely on the Go Playground; "offline" lets the engine fall back
// to its local pattern matching.

import { tokenize } from "@/lib/go/tokenizer";
import { diagnose } from "@/lib/go/diagnostics";
import {
  extraPackagesFromModule,
  getCompletions,
  getKnownPackages,
  getSymbolCompletions,
  isPackageImported,
} from "@/lib/go/completions";
import { compileGo, formatGo } from "@/lib/go/playground";
import { buildModuleSource, formatCompileError, formatVetError, replaceMain } from "@/lib/go/harness";
import type { LanguageService, RunRequest, RunResult } from "./types";

function isInsideGoString(code: string, pos: number): boolean {
  let inDouble = false;
  let inBack = false;
  for (let i = 0; i < pos; i++) {
    const ch = code[i];
    if (ch === "\\" && (inDouble || inBack)) { i++; continue; }
    if (ch === '"' && !inBack) inDouble = !inDouble;
    else if (ch === "`" && !inDouble) inBack = !inBack;
  }
  return inDouble || inBack;
}

async function runGo(req: RunRequest): Promise<RunResult> {
  // A test harness replaces the player's func main; a shipped package wraps
  // everything in a txtar module so the import resolves against real code.
  const base = req.harness ? replaceMain(req.code, req.harness) : req.code;
  const source = req.module ? buildModuleSource(base, req.module) : base;

  const compiled = await compileGo(source);
  if (compiled.errors === "__OFFLINE__") {
    return { status: "offline", stdout: "", error: "", warning: "" };
  }
  return {
    status: compiled.success ? "ok" : "error",
    stdout: compiled.output,
    error: compiled.success ? "" : compiled.errors,
    warning: compiled.vetErrors,
  };
}

export const goService: LanguageService = {
  id: "go",
  label: "Go",
  mainFile: "main.go",
  lineComment: "//",
  tokenize,
  isInsideString: isInsideGoString,
  getCompletions,
  getKnownPackages,
  isPackageImported,
  getSymbolCompletions,
  extraPackagesFromModule,
  diagnose,
  format: formatGo,
  run: runGo,
  explainError: formatCompileError,
  explainWarning: formatVetError,
  // Go has to qualify the name (`cellblock.Cell`), so the import line alone can't satisfy it.
  codeForRequiredCheck: (code) => code,
};
