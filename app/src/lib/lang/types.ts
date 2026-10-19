// ── Language Service ──
// The one seam every teachable language implements. The editor, the grading
// engine, and the debriefs resolve a service from the registry instead of
// importing a language directly — the story never knows which one is running.

import type { CompileModule, LanguageId } from "@/types/game";

export type { LanguageId };

// ── Editor shapes (shared by every tokenizer / linter / completer) ──

export type TokenType =
  | "keyword"
  | "builtin"
  | "type"
  | "string"
  | "number"
  | "comment"
  | "operator"
  | "punctuation"
  | "identifier"
  | "whitespace"
  | "unknown";

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
  start: number;
  end: number;
}

export type Severity = "error" | "warning" | "info";

export interface Diagnostic {
  severity: Severity;
  message: string;
  line: number;
  col: number;
  length: number;
}

export interface Completion {
  label: string;
  detail: string;
}

/**
 * A non-stdlib package/module shipped with a step (via its compileModule) that
 * the player can import. Feeds autocomplete so `name.` lists the module's
 * exported members and a bare prefix suggests the name once it's imported.
 */
export interface ExtraPackage {
  /** The name the player writes before the dot, e.g. "cellblock". */
  name: string;
  /** The full import path, e.g. "terminal/cellblock" or "./cellblock.js". */
  importPath: string;
  /** Exported members of the package. */
  members: Completion[];
}

export interface FormatResult {
  success: boolean;
  body: string;
  error: string;
}

// ── Execution ──

export interface RunRequest {
  /** The player's source, exactly as typed. */
  code: string;
  /**
   * Code that exercises the player's functions with fixed inputs. Each language
   * injects it its own way (Go swaps `func main`, JS/Python run it after the
   * player's code with the player's own output muted).
   */
  harness?: string;
  /** Extra files shipped alongside the player's code (an importable module). */
  module?: CompileModule;
}

export interface RunResult {
  /** "ok" ran cleanly; "error" failed to build or crashed; "offline" couldn't reach the backend. */
  status: "ok" | "error" | "offline";
  stdout: string;
  /** Raw compiler/runtime error text (empty when ok). Turn into Maya-speak with `explainError`. */
  error: string;
  /** Non-fatal analyzer warning (e.g. go vet). Blocks completion like an error. */
  warning: string;
}

export interface LanguageService {
  id: LanguageId;
  /** Display name: "Go" | "Python" | "JavaScript". */
  label: string;
  /** "main.go" | "main.py" | "main.js" — the file the player is editing. */
  mainFile: string;
  /** Line-comment prefix, e.g. "//" or "#". */
  lineComment: string;

  // Editor
  tokenize(source: string): Token[];
  /** True when `pos` sits inside a string literal (no autocomplete there). */
  isInsideString(code: string, pos: number): boolean;
  /** Members offered after `pkg.` */
  getCompletions(pkg: string, extra?: ExtraPackage[]): Completion[];
  /** Names that can appear before a dot (stdlib packages, globals, shipped modules). */
  getKnownPackages(extra?: ExtraPackage[]): string[];
  /** Only complete `pkg.` once the player has actually imported it (globals always count). */
  isPackageImported(code: string, pkg: string, extra?: ExtraPackage[]): boolean;
  /** Bare-identifier completions: the player's own symbols, keywords, imported names. */
  getSymbolCompletions(code: string, cursorPos: number, partial: string, extra?: ExtraPackage[]): Completion[];
  /** Parse a step's shipped module into importable packages for autocomplete. */
  extraPackagesFromModule(mod: CompileModule): ExtraPackage[];
  /** Instant local lint, before anything runs. Errors block submission. */
  diagnose(source: string): Diagnostic[];
  /** Cmd/Ctrl+S formatter, when the language has a canonical one. */
  format?(source: string): Promise<FormatResult>;

  // Execution
  run(req: RunRequest): Promise<RunResult>;
  /** Start loading a heavy backend early (Python's interpreter) so the first run is quick. */
  warmup?(): void;
  /** Turn a raw `RunResult.error` into one clear line for Maya to say. */
  explainError(raw: string, inRush: boolean): string;
  /** Turn a raw `RunResult.warning` into Maya-speak. */
  explainWarning(raw: string, inRush: boolean): string;
  /**
   * The part of the player's code that anti-hardcoding `requiredCode` checks
   * against. JS/Python strip import lines so naming a value in the import alone
   * doesn't count as using it.
   */
  codeForRequiredCheck(code: string): string;
}
