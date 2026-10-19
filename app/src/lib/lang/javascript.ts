// ── JavaScript behind the LanguageService seam ──
// Runs entirely in the browser (a sandboxed Web Worker) — no server, no
// network, so it's never "offline". ES modules shipped with a step import as
// `./cellblock.js`.

import { tokenize, isInsideJsString } from "@/lib/javascript/tokenizer";
import { diagnose, friendlySyntax } from "@/lib/javascript/diagnostics";
import {
  extraPackagesFromModule,
  getCompletions,
  getKnownPackages,
  getSymbolCompletions,
  isPackageImported,
} from "@/lib/javascript/completions";
import { runJavaScript, TIMEOUT_ERROR } from "@/lib/javascript/run";
import { MAIN_FILE, parseJsError } from "@/lib/javascript/runtime";
import type { LanguageService, RunRequest, RunResult } from "./types";

async function run(req: RunRequest): Promise<RunResult> {
  const out = await runJavaScript({
    main: req.code,
    harness: req.harness,
    files: req.module?.files.map((f) => ({ path: f.path, content: f.content })),
  });
  return {
    status: out.error ? "error" : "ok",
    stdout: out.stdout,
    error: out.error,
    warning: "",
  };
}

function explainMessage(name: string, message: string): string {
  const undef = message.match(/^(\S+) is not defined$/);
  if (name === "ReferenceError" && undef) {
    const id = undef[1];
    if (id === "fmt") return "`fmt` is go. in javascript you print with `console.log(...)`.";
    if (id === "print") return "`print()` is python. in javascript you print with `console.log(...)`.";
    return `\`${id}\` doesn't exist here — a typo, or did you forget to declare or import it?`;
  }
  const tdz = message.match(/^Cannot access '(.+)' before initialization$/);
  if (tdz) return `\`${tdz[1]}\` is used before the line that declares it — move the declaration up.`;
  if (/^Assignment to constant variable/.test(message)) {
    return "you can't reassign a `const`. if the value needs to change, declare it with `let`.";
  }
  const notFn = message.match(/^(.+) is not a function$/);
  if (notFn) return `\`${notFn[1]}\` isn't a function — check the name and how you're calling it.`;
  const readUndef = message.match(/^Cannot read properties of (undefined|null) \(reading '(.+)'\)$/);
  if (readUndef) return `whatever comes before \`.${readUndef[2]}\` is ${readUndef[1]} — it doesn't hold a value yet.`;
  const missing = message.match(/^Cannot find module '(.+)'$/);
  if (missing) return `there's no module at \`${missing[1]}\`. check the import path — it starts with \`./\` and ends in \`.js\`.`;
  if (/Maximum call stack size exceeded/.test(message)) return "your function keeps calling itself and never stops.";
  if (name === "SyntaxError") return friendlySyntax(message);
  return `${name}: ${message}`;
}

function explainError(raw: string, inRush: boolean): string {
  const prefix = inRush ? "no time for bugs. " : "";
  if (raw === TIMEOUT_ERROR) return `${prefix}your program ran for too long and i had to kill it. is there a loop that never ends?`;
  const e = parseJsError(raw);
  const text = explainMessage(e.name, e.message);
  if (e.file === "harness") return `${prefix}your code crashed when i tested it: ${text}`;
  const where = e.line > 0 ? `line ${e.line}: ` : "";
  const file = e.file !== MAIN_FILE ? `${e.file} ` : "";
  return `${prefix}${file}${where}${text}`;
}

/** Drop import statements so naming a value in `import { … }` alone doesn't count as using it. */
function stripImports(code: string): string {
  return code
    .replace(/^\s*import\b[\s\S]*?\bfrom\s*["'][^"']*["'];?/gm, "")
    .replace(/^\s*import\s*["'][^"']*["'];?/gm, "");
}

export const javascriptService: LanguageService = {
  id: "javascript",
  label: "JavaScript",
  mainFile: MAIN_FILE,
  lineComment: "//",
  tokenize,
  isInsideString: isInsideJsString,
  getCompletions,
  getKnownPackages,
  isPackageImported,
  getSymbolCompletions,
  extraPackagesFromModule,
  diagnose,
  run,
  explainError,
  explainWarning: (raw, inRush) => `${inRush ? "hurry — " : ""}${raw}`,
  codeForRequiredCheck: stripImports,
};
