// ── JavaScript runtime ──
// Runs the player's program (plus any shipped modules) and captures what it
// prints. Pure: no DOM, no network. In the browser it runs inside a Web Worker
// (see ./run.ts) so a runaway loop can be killed; in tests it runs in-process.
//
// ES modules are rewritten into plain functions — `import { a } from "./m.js"`
// becomes `const { a } = __import("./m.js")` — keeping every statement on its
// original line, so error line numbers match what the player sees.

import { parse, type Node } from "acorn";

export interface JsFile {
  /** e.g. "cellblock.js" */
  path: string;
  content: string;
}

export interface JsRunInput {
  /** The player's main.js. */
  main: string;
  /** Driver code run after main, with main's own output muted. */
  harness?: string;
  /** Extra modules the player can import ("./cellblock.js"). */
  files?: JsFile[];
}

export interface JsRunOutput {
  stdout: string;
  stderr: string;
  /**
   * Empty when the program ran cleanly. Otherwise "file:line:col: Name: message"
   * (line/col may be 0 when unknown) — see `parseJsError`.
   */
  error: string;
}

export const MAIN_FILE = "main.js";
const HARNESS_LINE_MARK = "__signal_harness__";
const MAX_OUTPUT_LINES = 5000;
const WRAPPER_OPEN = `(function (__import, __exports, console, __mute) {"use strict";`;

// ── Console formatting (Node-style, so output reads like a real terminal) ──

function inspect(value: unknown, depth: number, seen: Set<unknown>): string {
  if (typeof value === "string") return depth === 0 ? value : `'${value.replace(/'/g, "\\'")}'`;
  if (typeof value === "number") return Object.is(value, -0) ? "-0" : String(value);
  if (typeof value === "bigint") return `${value}n`;
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "symbol") return String(value);
  if (typeof value === "function") return value.name ? `[Function: ${value.name}]` : "[Function (anonymous)]";
  if (seen.has(value)) return "[Circular]";
  if (depth > 3) return Array.isArray(value) ? "[Array]" : "[Object]";
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      if (value.length === 0) return "[]";
      return `[ ${value.map((v) => inspect(v, depth + 1, seen)).join(", ")} ]`;
    }
    if (value instanceof Map) {
      const parts = [...value.entries()].map(([k, v]) => `${inspect(k, depth + 1, seen)} => ${inspect(v, depth + 1, seen)}`);
      return `Map(${value.size}) {${parts.length ? ` ${parts.join(", ")} ` : ""}}`;
    }
    if (value instanceof Set) {
      const parts = [...value.values()].map((v) => inspect(v, depth + 1, seen));
      return `Set(${value.size}) {${parts.length ? ` ${parts.join(", ")} ` : ""}}`;
    }
    if (value instanceof Error) return value.stack ?? `${value.name}: ${value.message}`;
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    const body = entries
      .map(([k, v]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`}: ${inspect(v, depth + 1, seen)}`)
      .join(", ");
    return `{ ${body} }`;
  } finally {
    seen.delete(value);
  }
}

/** Format console.log arguments the way Node does (including %s/%d/%i/%f/%o/%j). */
export function formatConsoleArgs(args: unknown[]): string {
  if (args.length === 0) return "";
  const rest = [...args];
  let head = "";
  if (typeof rest[0] === "string" && /%[sdifoOjc%]/.test(rest[0] as string)) {
    const fmt = rest.shift() as string;
    head = fmt.replace(/%([sdifoOjc%])/g, (m, spec: string) => {
      if (spec === "%") return "%";
      if (rest.length === 0) return m;
      const v = rest.shift();
      switch (spec) {
        case "s": return typeof v === "string" ? v : inspect(v, 1, new Set());
        case "d":
        case "i": {
          const n = Number(v);
          return String(spec === "i" ? Math.trunc(n) : n);
        }
        case "f": return String(Number(v));
        case "j": return JSON.stringify(v);
        case "c": return "";
        default: return inspect(v, 1, new Set());
      }
    });
    if (rest.length === 0) return head;
    return `${head} ${rest.map((v) => inspect(v, 0, new Set())).join(" ")}`;
  }
  return rest.map((v) => inspect(v, 0, new Set())).join(" ");
}

// ── Module rewrite ──

interface Rewritten {
  body: string;
}

function blankKeepingNewlines(text: string): string {
  return text.replace(/[^\n]/g, " ");
}

/** Replace `src[start:end]` with `replacement`, padded so the line count is unchanged. */
function spliceSameLines(src: string, start: number, end: number, replacement: string): string {
  const original = src.slice(start, end);
  const newlines = (original.match(/\n/g) ?? []).length;
  return src.slice(0, start) + replacement + "\n".repeat(newlines) + src.slice(end);
}

type AnyNode = Node & Record<string, unknown>;

function declaredNames(decl: AnyNode): string[] {
  if (decl.type === "FunctionDeclaration" || decl.type === "ClassDeclaration") {
    const id = decl.id as AnyNode | null;
    return id ? [id.name as string] : [];
  }
  if (decl.type === "VariableDeclaration") {
    const names: string[] = [];
    for (const d of decl.declarations as AnyNode[]) collectPatternNames(d.id as AnyNode, names);
    return names;
  }
  return [];
}

function collectPatternNames(pattern: AnyNode, out: string[]) {
  switch (pattern.type) {
    case "Identifier": out.push(pattern.name as string); break;
    case "ObjectPattern":
      for (const p of pattern.properties as AnyNode[]) collectPatternNames((p.type === "RestElement" ? p.argument : p.value) as AnyNode, out);
      break;
    case "ArrayPattern":
      for (const el of pattern.elements as (AnyNode | null)[]) if (el) collectPatternNames(el, out);
      break;
    case "RestElement": collectPatternNames(pattern.argument as AnyNode, out); break;
    case "AssignmentPattern": collectPatternNames(pattern.left as AnyNode, out); break;
  }
}

function moduleName(node: AnyNode): string {
  const n = node as { name?: string; value?: string };
  return n.name ?? String(n.value);
}

/**
 * Rewrite ES module syntax into plain statements. Throws acorn's SyntaxError
 * (with `.loc`) when the source doesn't parse.
 */
export function rewriteModule(src: string): Rewritten {
  const ast = parse(src, { ecmaVersion: "latest", sourceType: "module", locations: true }) as unknown as { body: AnyNode[] };
  const exports: Array<{ exported: string; local: string }> = [];
  const edits: Array<{ start: number; end: number; text: string; keepLines: boolean }> = [];

  for (const node of ast.body) {
    if (node.type === "ImportDeclaration") {
      const source = JSON.stringify((node.source as AnyNode).value);
      const specs = node.specifiers as AnyNode[];
      const parts: string[] = [];
      const named: string[] = [];
      for (const s of specs) {
        const local = (s.local as AnyNode).name as string;
        if (s.type === "ImportNamespaceSpecifier") parts.push(`const ${local} = __import(${source});`);
        else if (s.type === "ImportDefaultSpecifier") parts.push(`const ${local} = __import(${source}).default;`);
        else {
          const imported = moduleName(s.imported as AnyNode);
          named.push(imported === local ? local : `${JSON.stringify(imported)}: ${local}`);
        }
      }
      if (named.length) parts.push(`const { ${named.join(", ")} } = __import(${source});`);
      if (parts.length === 0) parts.push(`__import(${source});`);
      edits.push({ start: node.start, end: node.end, text: parts.join(" "), keepLines: true });
    } else if (node.type === "ExportNamedDeclaration") {
      const decl = node.declaration as AnyNode | null;
      if (decl) {
        for (const name of declaredNames(decl)) exports.push({ exported: name, local: name });
        edits.push({ start: node.start, end: decl.start, text: blankKeepingNewlines(src.slice(node.start, decl.start)), keepLines: false });
      } else if (node.source) {
        const source = JSON.stringify((node.source as AnyNode).value);
        const lines: string[] = [];
        for (const s of node.specifiers as AnyNode[]) {
          const exported = moduleName(s.exported as AnyNode);
          const local = moduleName(s.local as AnyNode);
          lines.push(`Object.defineProperty(__exports, ${JSON.stringify(exported)}, { enumerable: true, get: () => __import(${source})[${JSON.stringify(local)}] });`);
        }
        edits.push({ start: node.start, end: node.end, text: lines.join(" "), keepLines: true });
      } else {
        for (const s of node.specifiers as AnyNode[]) {
          exports.push({ exported: moduleName(s.exported as AnyNode), local: moduleName(s.local as AnyNode) });
        }
        edits.push({ start: node.start, end: node.end, text: "", keepLines: true });
      }
    } else if (node.type === "ExportDefaultDeclaration") {
      const decl = node.declaration as AnyNode;
      const isNamedDecl = (decl.type === "FunctionDeclaration" || decl.type === "ClassDeclaration") && decl.id;
      if (isNamedDecl) {
        // `export default function f() {}` — keep `f` as a hoisted binding.
        const name = (decl.id as AnyNode).name as string;
        exports.push({ exported: "default", local: name });
        edits.push({ start: node.start, end: decl.start, text: blankKeepingNewlines(src.slice(node.start, decl.start)), keepLines: false });
      } else {
        // Anonymous `export default function () {}` becomes an expression — still valid.
        edits.push({ start: node.start, end: decl.start, text: "__exports.default = ", keepLines: true });
      }
    } else if (node.type === "ExportAllDeclaration") {
      const source = JSON.stringify((node.source as AnyNode).value);
      const exported = node.exported ? moduleName(node.exported as AnyNode) : null;
      const text = exported
        ? `Object.defineProperty(__exports, ${JSON.stringify(exported)}, { enumerable: true, get: () => __import(${source}) });`
        : `Object.assign(__exports, __import(${source}));`;
      edits.push({ start: node.start, end: node.end, text, keepLines: true });
    }
  }

  // Apply edits back-to-front so earlier offsets stay valid.
  let body = src;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) {
    body = e.keepLines
      ? spliceSameLines(body, e.start, e.end, e.text)
      : body.slice(0, e.start) + e.text + body.slice(e.end);
  }
  if (exports.length) {
    body += "\n" + exports
      .map((x) => `Object.defineProperty(__exports, ${JSON.stringify(x.exported)}, { enumerable: true, get: () => ${x.local} });`)
      .join(" ");
  }
  return { body };
}

// ── Execution ──

function normalizeSpecifier(spec: string): string {
  return spec.replace(/^\.\//, "").replace(/\.(m?js)$/, "");
}

class OutputLimitError extends Error {
  constructor() {
    super("too much output — is a loop running forever?");
    this.name = "RangeError";
  }
}

/** Pull "file:line:col" for the innermost frame inside one of our files. */
function locateInStack(stack: string, files: string[]): { file: string; line: number; col: number } | null {
  const names = files.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(${names}):(\\d+):(\\d+)`);
  const m = stack.match(re);
  if (!m) return null;
  const line = Number(m[2]);
  // Line 1 shares its row with the wrapper's opening, so shift the column back.
  const col = line === 1 ? Math.max(1, Number(m[3]) - WRAPPER_OPEN.length) : Number(m[3]);
  return { file: m[1], line, col };
}

function errorText(file: string, line: number, col: number, name: string, message: string): string {
  return `${file}:${line}:${col}: ${name}: ${message}`;
}

/** Run a program and capture its output. Never throws — failures come back in `error`. */
export function executeJs(input: JsRunInput): JsRunOutput {
  const stdout: string[] = [];
  const stderr: string[] = [];
  let muted = false;
  let lineCount = 0;

  const push = (buf: string[], args: unknown[]) => {
    if (muted) return;
    const text = formatConsoleArgs(args);
    lineCount += text.split("\n").length;
    if (lineCount > MAX_OUTPUT_LINES) throw new OutputLimitError();
    buf.push(text);
  };

  const counts = new Map<string, number>();
  const sandboxConsole = {
    log: (...a: unknown[]) => push(stdout, a),
    info: (...a: unknown[]) => push(stdout, a),
    debug: (...a: unknown[]) => push(stdout, a),
    table: (...a: unknown[]) => push(stdout, a),
    dir: (...a: unknown[]) => push(stdout, a),
    error: (...a: unknown[]) => push(stderr, a),
    warn: (...a: unknown[]) => push(stderr, a),
    trace: (...a: unknown[]) => push(stderr, a),
    assert: (cond: unknown, ...a: unknown[]) => { if (!cond) push(stderr, ["Assertion failed", ...a]); },
    count: (label = "default") => { const n = (counts.get(label) ?? 0) + 1; counts.set(label, n); push(stdout, [`${label}: ${n}`]); },
    countReset: (label = "default") => { counts.delete(label); },
    group: (...a: unknown[]) => { if (a.length) push(stdout, a); },
    groupEnd: () => {},
    time: () => {},
    timeEnd: () => {},
    timeLog: () => {},
    clear: () => {},
  };

  const files = input.files ?? [];
  const sources = new Map<string, { path: string; content: string }>();
  for (const f of files) sources.set(normalizeSpecifier(f.path), f);
  const fileNames = [MAIN_FILE, ...files.map((f) => f.path)];
  const cache = new Map<string, Record<string, unknown>>();

  const result = (error: string): JsRunOutput => ({
    stdout: stdout.length ? stdout.join("\n") + "\n" : "",
    stderr: stderr.length ? stderr.join("\n") + "\n" : "",
    error,
  });

  const compile = (path: string, src: string, extra = ""): ((...args: unknown[]) => void) => {
    let body: string;
    try {
      body = rewriteModule(src).body;
    } catch (e) {
      const err = e as SyntaxError & { loc?: { line: number; column: number } };
      const message = err.message.replace(/\s*\(\d+:\d+\)\s*$/, "");
      throw Object.assign(new Error(message), {
        __signal: errorText(path, err.loc?.line ?? 0, (err.loc?.column ?? 0) + 1, "SyntaxError", message),
      });
    }
    // Wrapper opens on line 1 so the player's line N stays line N.
    const wrapped = `${WRAPPER_OPEN}${body}${extra}\n})\n//# sourceURL=${path}`;
    try {
      return (0, eval)(wrapped) as (...args: unknown[]) => void;
    } catch (e) {
      const err = e as Error;
      throw Object.assign(new Error(err.message), {
        __signal: errorText(path, 0, 0, err.name || "SyntaxError", err.message),
      });
    }
  };

  const importModule = (spec: string): Record<string, unknown> => {
    const key = normalizeSpecifier(spec);
    const cached = cache.get(key);
    if (cached) return cached;
    const file = sources.get(key);
    if (!file) {
      const err = new Error(`Cannot find module '${spec}'`);
      err.name = "Error";
      throw err;
    }
    const exportsObj: Record<string, unknown> = {};
    cache.set(key, exportsObj);
    compile(file.path, file.content)(importModule, exportsObj, sandboxConsole, () => {});
    return exportsObj;
  };

  try {
    let harnessBlock = "";
    if (input.harness) {
      // Parse the harness on its own so an authoring slip can't masquerade as the player's bug.
      parse(input.harness, { ecmaVersion: "latest", sourceType: "script" });
      harnessBlock = `\n;__mute(false); /* ${HARNESS_LINE_MARK} */\n{\n${input.harness}\n}`;
    }
    const main = compile(MAIN_FILE, input.main, harnessBlock);
    muted = Boolean(input.harness);
    main(importModule, {}, sandboxConsole, (on: boolean) => { muted = on; });
    return result("");
  } catch (e) {
    const err = e as Error & { __signal?: string };
    if (err.__signal) return result(err.__signal);
    const mainLines = input.main.split("\n").length;
    const where = locateInStack(err.stack ?? "", fileNames);
    const name = err.name || "Error";
    const message = err.message ?? String(e);
    if (where && where.file === MAIN_FILE && where.line > mainLines) {
      // Thrown from inside the harness — the player's function misbehaved when called.
      return result(errorText("harness", 0, 0, name, message));
    }
    return result(errorText(where?.file ?? MAIN_FILE, where?.line ?? 0, where?.col ?? 0, name, message));
  }
}

export interface ParsedJsError {
  file: string;
  line: number;
  col: number;
  name: string;
  message: string;
}

/** Inverse of the "file:line:col: Name: message" error text. */
export function parseJsError(raw: string): ParsedJsError {
  const m = raw.match(/^([^:\n]+):(\d+):(\d+): ([A-Za-z]*Error): ([\s\S]*)$/);
  if (!m) return { file: MAIN_FILE, line: 0, col: 0, name: "Error", message: raw.trim() };
  return { file: m[1], line: Number(m[2]), col: Number(m[3]), name: m[4], message: m[5].trim() };
}
