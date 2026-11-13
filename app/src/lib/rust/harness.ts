// ── Rust harness injection + error explanations ──
// How Rust runs a step. The Rust Playground compiles exactly one file
// (src/main.rs), so:
//   • a test harness replaces the player's `fn main` (like Go);
//   • a shipped module (`cellblock.rs`) is inlined where the player declares
//     it — `mod cellblock;` becomes `mod cellblock { … }` on that same line, so
//     compiler line numbers still match what the player sees;
//   • raw rustc / panic output becomes one clear line for Maya to say.

import type { CompileModule } from "@/types/game";

/** Index just past the `}` that closes the `{` at `open`, skipping strings, chars and comments. */
function matchBrace(code: string, open: number): number {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    const ch = code[i];
    if (ch === "/" && code[i + 1] === "/") {
      const nl = code.indexOf("\n", i);
      if (nl === -1) return code.length;
      i = nl;
      continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      if (end === -1) return code.length;
      i = end + 1;
      continue;
    }
    if (ch === '"') {
      for (i++; i < code.length && code[i] !== '"'; i++) if (code[i] === "\\") i++;
      continue;
    }
    if (ch === "'") {
      // 'x' or '\n' is a char literal; 'a (no closing quote) is a lifetime.
      const close = code[i + 1] === "\\" ? code.indexOf("'", i + 2) : i + 2;
      if (code[close] === "'" && close - i <= 10) i = close;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return code.length;
}

/** Swap the player's `fn main() { … }` for the harness's own `fn main`. */
export function replaceRustMain(code: string, harness: string): string {
  const m = /(^|\n)[ \t]*(?:pub[ \t]+)?fn[ \t]+main[ \t]*\([ \t]*\)[^{]*\{/.exec(code);
  if (!m) return `${code.trimEnd()}\n\n${harness}\n`;
  const start = m.index + m[1].length;
  const open = m.index + m[0].length - 1;
  const end = matchBrace(code, open);
  // Blank the player's main out line-for-line and append the harness, so an
  // error in the player's own functions still reports the line they see.
  const blank = code.slice(start, end).replace(/[^\n]/g, "");
  return `${code.slice(0, start)}${blank}${code.slice(end).trimEnd()}\n\n${harness}\n`;
}

/** A module file squeezed onto one line (line comments dropped) so inlining it keeps line numbers. */
function oneLine(content: string): string {
  return content
    .split("\n")
    .map((l) => l.replace(/^\s*\/\/.*$/, "").trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * Inline each shipped `<name>.rs` where the player wrote `mod <name>;`. A
 * module the player never declared stays out — rustc's "unresolved" error is
 * the lesson.
 */
export function inlineModules(code: string, mod?: CompileModule): string {
  if (!mod) return code;
  let out = code;
  for (const f of mod.files) {
    if (!f.path.endsWith(".rs")) continue;
    const name = f.path.split("/").pop()!.replace(/\.rs$/, "");
    const decl = new RegExp(`^([ \\t]*(?:pub[ \\t]+)?)mod[ \\t]+${name}[ \\t]*;`, "m");
    out = out.replace(decl, (_all, lead: string) => `${lead}mod ${name} { ${oneLine(f.content)} }`);
  }
  return out;
}

/** The program the Playground actually compiles. */
export function buildRustSource(code: string, harness?: string, mod?: CompileModule): string {
  const withMain = harness ? replaceRustMain(code, harness) : code;
  return inlineModules(withMain, mod);
}

// ── Raw output → what happened ──

const CARGO_NOISE = /^\s*(Compiling|Finished|Running|Blocking|Updating|Downloaded|Downloading)\b|^error: could not compile|^For more information about this error|^warning: .* generated \d+ warnings?|^error: aborting due to/;

/** The first `error…` block of rustc's output, without cargo's chatter. */
export function firstRustError(stderr: string): string {
  const lines = stderr.split("\n");
  const start = lines.findIndex((l) => /^error(\[E\d+\])?:/.test(l));
  if (start === -1) return "";
  const out: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const l = lines[i];
    if (i > start && /^(error|warning)(\[E\d+\])?:/.test(l)) break;
    if (CARGO_NOISE.test(l)) continue;
    out.push(l);
  }
  return out.join("\n").trimEnd();
}

/** `thread 'main' panicked at src/main.rs:4:5:\nmessage` → the panic block. */
export function rustPanic(stderr: string): string {
  const i = stderr.indexOf("panicked at");
  if (i === -1) return "";
  const from = stderr.lastIndexOf("thread", i);
  return stderr
    .slice(from === -1 ? i : from)
    .split("\n")
    .filter((l) => !/^note: run with `RUST_BACKTRACE/.test(l))
    .join("\n")
    .trim();
}

export const RS_TIMEOUT_ERROR = "__RS_TIMEOUT__";

interface ParsedRustError {
  code: string;
  message: string;
  line: number;
  help: string;
}

function parseRustError(raw: string): ParsedRustError {
  const head = raw.match(/^error(?:\[(E\d+)\])?: ([^\n]*)/);
  const loc = raw.match(/-->\s*[^:\n]+:(\d+):(\d+)/);
  const help = raw.match(/^help: ([^\n]*)/m);
  return {
    code: head?.[1] ?? "",
    message: head?.[2] ?? raw.split("\n")[0],
    line: loc ? Number(loc[1]) : 0,
    help: help?.[1] ?? "",
  };
}

const tick = (s: string) => s.replace(/`/g, "");

function explainCompile(e: ParsedRustError): string {
  const m = e.message;
  if (e.code === "E0601" || /`main` function not found/.test(m)) {
    return "there's no `fn main()`. rust starts every program there — wrap your code in `fn main() { ... }`.";
  }
  const notFound = m.match(/cannot find (?:function|value|macro|type|struct) `([^`]+)` in this scope/);
  if (notFound) {
    const id = notFound[1];
    if (/macro/.test(m) || /^(println|print|format|vec)$/.test(id)) {
      if (e.code === "E0423" || /function/.test(m)) return `\`${id}\` is a macro — call it with a bang: \`${id}!(...)\`.`;
    }
    if (id === "fmt") return "`fmt` is go. in rust you print with `println!(...)`.";
    if (id === "console") return "`console.log` is javascript. in rust you print with `println!(...)`.";
    if (id === "print") return "that's python's print. in rust it's a macro: `println!(...)`.";
    if (id === "True" || id === "False") return `rust booleans are lowercase — \`${id.toLowerCase()}\`.`;
    return `\`${id}\` doesn't exist here — a typo, or did you forget to define it?`;
  }
  const noFile = m.match(/file not found for module `([^`]+)`/);
  if (e.code === "E0583" || noFile) {
    return `there's no \`${noFile?.[1] ?? "such"}\` file to load here. drop the \`mod ${noFile?.[1] ?? "name"};\` line — this step doesn't ship one.`;
  }
  const unresolved = m.match(/(?:failed to resolve|unresolved import|cannot find module or crate)[^`]*`([^`]+)`/);
  if (unresolved || e.code === "E0432" || e.code === "E0433") {
    const name = (unresolved?.[1] ?? "").split("::")[0];
    return name
      ? `rust can't find \`${name}\`. a module has to be declared first — put \`mod ${name};\` at the top of the file.`
      : "rust can't find that path. declare the module with `mod name;` at the top first.";
  }
  if (e.code === "E0384" || /cannot assign twice to immutable variable/.test(m)) {
    return "variables are frozen by default in rust. declare it with `let mut` if it has to change.";
  }
  if (e.code === "E0596" || /cannot borrow .* as mutable/.test(m)) {
    return "you're changing something that isn't mutable. add `mut` where it's declared.";
  }
  if (e.code === "E0308" || /mismatched types/.test(m)) {
    const help = e.help ? ` ${tick(e.help)}.` : "";
    return `the types don't line up — rust found one type where it expected another.${help}`.replace(/\.\.$/, ".");
  }
  if (e.code === "E0382" || /use of moved value|borrow of moved value/.test(m)) {
    return "that value was moved and can't be used again. borrow it with `&` instead of handing it over.";
  }
  if (e.code === "E0061" || /takes \d+ arguments? but \d+ arguments? (?:was|were) supplied/.test(m)) {
    return "this function was called with the wrong number of arguments.";
  }
  if (/expected `;`/.test(m)) return "a statement is missing its semicolon `;` at the end.";
  if (/argument never used|multiple unused formatting arguments/.test(m)) {
    return "you passed `println!` more values than `{}` placeholders — add a `{}` for each value.";
  }
  if (/\d+ positional arguments? in format string, but/.test(m)) {
    return "your format string has more `{}` placeholders than values — pass one value per `{}`.";
  }
  if (/unterminated double quote string/.test(m)) return "this string never closes — add the matching `\"`.";
  if (/unclosed delimiter|unexpected closing delimiter|mismatched closing delimiter/.test(m)) {
    return "a bracket or brace isn't closed properly — check that every `{` has its `}`.";
  }
  if (e.code === "E0369" || /cannot add .* to/.test(m)) {
    return "you can't use that operator between these types. to mix text and values, use `println!(\"... {}\", value)`.";
  }
  return `${m.charAt(0).toLowerCase()}${m.slice(1)}.`.replace(/\.\.$/, ".");
}

/** Turn a raw run error into one line Maya can say. */
export function explainRustError(raw: string, inRush: boolean): string {
  const prefix = inRush ? "no time for bugs. " : "";
  if (raw === RS_TIMEOUT_ERROR) return `${prefix}your program ran too long or printed too much, and i had to kill it. is there a loop that never ends?`;
  if (/panicked at/.test(raw)) {
    const msg = raw.split("\n").slice(1).join(" ").trim();
    if (/attempt to (add|subtract|multiply) with overflow/.test(msg)) return `${prefix}your program crashed: a number overflowed its type. use a bigger integer type.`;
    if (/index out of bounds/.test(msg)) return `${prefix}your program crashed: you reached past the end of a list.`;
    if (/divide by zero/.test(msg)) return `${prefix}your program crashed: division by zero. check your math.`;
    return `${prefix}your program crashed: ${msg || "it panicked."}`;
  }
  const e = parseRustError(raw);
  const where = e.line > 0 ? `line ${e.line}: ` : "";
  return `${prefix}${where}${explainCompile(e)}`;
}
