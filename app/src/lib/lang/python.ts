// ── Python behind the LanguageService seam ──
// Real CPython compiled to WebAssembly (Pyodide), running in a browser worker.
// The first run downloads the interpreter; if that fails (no network) the run
// reports "offline" and the engine falls back to local pattern matching, just
// like Go does when the Playground is unreachable.

import { tokenize, isInsidePyString } from "@/lib/python/tokenizer";
import { diagnose } from "@/lib/python/diagnostics";
import {
  extraPackagesFromModule,
  getCompletions,
  getKnownPackages,
  getSymbolCompletions,
  isPackageImported,
} from "@/lib/python/completions";
import { runPython, warmPython, PY_TIMEOUT_ERROR } from "@/lib/python/run";
import type { LanguageService, RunRequest, RunResult } from "./types";

export const PY_MAIN_FILE = "main.py";

async function run(req: RunRequest): Promise<RunResult> {
  const out = await runPython({
    main: req.code,
    harness: req.harness,
    files: req.module?.files.map((f) => ({ path: f.path, content: f.content })),
  });
  if (out.offline) return { status: "offline", stdout: "", error: "", warning: "" };
  return { status: out.error ? "error" : "ok", stdout: out.stdout, error: out.error, warning: "" };
}

interface ParsedPyError {
  file: string;
  line: number;
  name: string;
  message: string;
}

export function parsePyError(raw: string): ParsedPyError {
  const m = raw.match(/^([^:\n]+):(\d+):(\d+): (\w+): ([\s\S]*)$/);
  if (!m) return { file: PY_MAIN_FILE, line: 0, name: "Error", message: raw.trim() };
  return { file: m[1], line: Number(m[2]), name: m[4], message: m[5].trim() };
}

function explainMessage(name: string, message: string): string {
  const undef = message.match(/^name '(.+)' is not defined/);
  if (name === "NameError" && undef) {
    const id = undef[1];
    if (id === "fmt") return "`fmt` is go. in python you print with `print(...)`.";
    if (id === "console") return "`console.log` is javascript. in python you print with `print(...)`.";
    if (id === "true" || id === "false") return `python capitalizes booleans — it's \`${id === "true" ? "True" : "False"}\`.`;
    return `\`${id}\` doesn't exist here — a typo, or did you forget to define or import it?`;
  }
  if (name === "IndentationError") {
    if (/expected an indented block/.test(message)) return "the line after a `:` has to be indented — four spaces in.";
    if (/unexpected indent/.test(message)) return "this line is indented but nothing opened a block — line it up with the code around it.";
    if (/unindent does not match/.test(message)) return "this line's indentation doesn't line up with any block above it.";
    return `indentation problem: ${message}.`;
  }
  if (name === "TabError") return "you've mixed tabs and spaces — use spaces only.";
  if (name === "SyntaxError") {
    if (/expected ':'/.test(message)) return "this line opens a block — end it with a colon `:`.";
    if (/unterminated string/.test(message)) return "this string never closes — add the matching quote.";
    if (/was never closed/.test(message)) return `${message} — add the matching bracket.`;
    if (/invalid syntax/.test(message)) return "python can't read this line — check for a missing comma, quote, or operator.";
    return message.charAt(0).toLowerCase() + message.slice(1) + ".";
  }
  const operand = message.match(/^unsupported operand type\(s\) for (.+): '(\w+)' and '(\w+)'/);
  if (operand) return `you can't use \`${operand[1]}\` between a ${operand[2]} and a ${operand[3]} — convert one first, or use an f-string to mix text and numbers.`;
  if (/can only concatenate str \(not "(\w+)"\) to str/.test(message)) {
    return "you can't add a number to a string with `+` — use an f-string like `f\"text {value}\"`, or wrap it in `str()`.";
  }
  const missingArg = message.match(/^(\w+)\(\) missing (\d+) required positional argument/);
  if (missingArg) return `\`${missingArg[1]}()\` needs more arguments than you passed.`;
  const noAttr = message.match(/^module '(\w+)' has no attribute '(\w+)'/);
  if (noAttr) return `\`${noAttr[1]}\` has no \`${noAttr[2]}\` — names are case-sensitive. check the spelling.`;
  const noModule = message.match(/^No module named '(.+)'/);
  if (noModule) return `there's no module called \`${noModule[1]}\` here. check the import name.`;
  if (name === "EOFError") return "this terminal can't take keyboard input — no `input()` here.";
  if (name === "ZeroDivisionError") return "division by zero. check your math.";
  if (name === "RecursionError") return "your function keeps calling itself and never stops.";
  return `${name}: ${message}`;
}

function explainError(raw: string, inRush: boolean): string {
  const prefix = inRush ? "no time for bugs. " : "";
  if (raw === PY_TIMEOUT_ERROR) return `${prefix}your program ran for too long and i had to kill it. is there a loop that never ends?`;
  const e = parsePyError(raw);
  const text = explainMessage(e.name, e.message);
  if (e.file === "harness") return `${prefix}your code crashed when i tested it: ${text}`;
  const where = e.line > 0 ? `line ${e.line}: ` : "";
  const file = e.file !== PY_MAIN_FILE ? `${e.file} ` : "";
  return `${prefix}${file}${where}${text}`;
}

/** Drop import lines so naming a value in `from x import y` alone doesn't count as using it. */
function stripImports(code: string): string {
  return code
    .replace(/^[ \t]*from[ \t]+[\w.]+[ \t]+import[ \t]*\([\s\S]*?\)/gm, "")
    .replace(/^[ \t]*(?:from[ \t]+[\w.]+[ \t]+)?import[ \t][^\n]*/gm, "");
}

export const pythonService: LanguageService = {
  id: "python",
  label: "Python",
  mainFile: PY_MAIN_FILE,
  lineComment: "#",
  tokenize,
  isInsideString: isInsidePyString,
  getCompletions,
  getKnownPackages,
  isPackageImported,
  getSymbolCompletions,
  extraPackagesFromModule,
  diagnose,
  run,
  warmup: warmPython,
  explainError,
  explainWarning: (raw, inRush) => `${inRush ? "hurry — " : ""}${raw}`,
  codeForRequiredCheck: stripImports,
};
