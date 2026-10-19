// ── JavaScript Autocomplete ──
// `console.` / `Math.` / `JSON.` members, a shipped module's exports, and the
// player's own declarations. No type inference — we only complete what we know.

import type { CompileModule } from "@/types/game";
import type { Completion, ExtraPackage } from "@/lib/lang/types";
import { JS_KEYWORDS } from "./tokenizer";

const GLOBAL_MEMBERS: Record<string, Record<string, string>> = {
  console: {
    log: "console.log(...data)",
    error: "console.error(...data)",
    warn: "console.warn(...data)",
    info: "console.info(...data)",
    table: "console.table(data)",
  },
  Math: {
    abs: "Math.abs(x)",
    ceil: "Math.ceil(x)",
    floor: "Math.floor(x)",
    max: "Math.max(...values)",
    min: "Math.min(...values)",
    pow: "Math.pow(x, y)",
    random: "Math.random() → [0, 1)",
    round: "Math.round(x)",
    sqrt: "Math.sqrt(x)",
    trunc: "Math.trunc(x)",
    PI: "Math.PI",
  },
  JSON: {
    parse: "JSON.parse(text)",
    stringify: "JSON.stringify(value)",
  },
  Object: {
    entries: "Object.entries(obj) → [key, value][]",
    keys: "Object.keys(obj) → string[]",
    values: "Object.values(obj)",
    assign: "Object.assign(target, ...sources)",
    freeze: "Object.freeze(obj)",
  },
  Array: {
    from: "Array.from(iterable)",
    isArray: "Array.isArray(value)",
    of: "Array.of(...items)",
  },
  Number: {
    isInteger: "Number.isInteger(value)",
    parseInt: "Number.parseInt(text, radix)",
    parseFloat: "Number.parseFloat(text)",
  },
  String: {
    fromCharCode: "String.fromCharCode(...codes)",
  },
};

const GLOBAL_FUNCS: Completion[] = [
  { label: "console", detail: "global" },
  { label: "Math", detail: "global" },
  { label: "JSON", detail: "global" },
  { label: "Object", detail: "global" },
  { label: "Array", detail: "global" },
  { label: "Number", detail: "global" },
  { label: "String", detail: "global" },
  { label: "parseInt", detail: "parseInt(text, radix)" },
  { label: "parseFloat", detail: "parseFloat(text)" },
  { label: "true", detail: "boolean" },
  { label: "false", detail: "boolean" },
  { label: "null", detail: "value" },
  { label: "undefined", detail: "value" },
];

const KEYWORDS: Completion[] = [...JS_KEYWORDS].map((k) => ({ label: k, detail: "keyword" }));

// ── Shipped modules ──

/** Exported names from an ES module file. */
function extractExports(content: string): Completion[] {
  const seen = new Set<string>();
  const out: Completion[] = [];
  const add = (name: string, detail: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    out.push({ label: name, detail: detail.trim() });
  };
  for (const m of content.matchAll(/\bexport\s+(const|let|var)\s+([A-Za-z_$][\w$]*)([^\n;]*)/g)) {
    add(m[2], `${m[1]} ${m[2]}${m[3]}`);
  }
  for (const m of content.matchAll(/\bexport\s+(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)) {
    add(m[1], `function ${m[1]}(${m[2].trim()})`);
  }
  for (const m of content.matchAll(/\bexport\s+class\s+([A-Za-z_$][\w$]*)/g)) {
    add(m[1], `class ${m[1]}`);
  }
  for (const m of content.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) add(name, "export");
    }
  }
  return out;
}

/** Build the importable modules from a step's compileModule ("cellblock.js" → `./cellblock.js`). */
export function extraPackagesFromModule(mod: CompileModule): ExtraPackage[] {
  return mod.files
    .filter((f) => /\.m?js$/.test(f.path))
    .map((f) => {
      const base = f.path.split("/").pop()!.replace(/\.m?js$/, "");
      return { name: base, importPath: `./${f.path}`, members: extractExports(f.content) };
    });
}

function namespaceImportName(code: string, ep: ExtraPackage): string | null {
  const path = ep.importPath.replace(/^\.\//, "").replace(/\.m?js$/, "");
  const re = new RegExp(`import\\s*\\*\\s*as\\s+([A-Za-z_$][\\w$]*)\\s+from\\s*["'](?:\\./)?${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\.m?js)?["']`);
  return code.match(re)?.[1] ?? null;
}

// ── Public API (LanguageService shape) ──

export function getCompletions(pkg: string, extra: ExtraPackage[] = []): Completion[] {
  const ep = extra.find((e) => e.name === pkg);
  if (ep) return [...ep.members].sort((a, b) => a.label.localeCompare(b.label));
  const members = GLOBAL_MEMBERS[pkg];
  if (!members) return [];
  return Object.entries(members)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, detail]) => ({ label, detail }));
}

export function getKnownPackages(extra: ExtraPackage[] = []): string[] {
  return [...Object.keys(GLOBAL_MEMBERS), ...extra.map((e) => e.name)];
}

/** Globals are always in scope; a shipped module counts once it's namespace-imported under that name. */
export function isPackageImported(code: string, pkg: string, extra: ExtraPackage[] = []): boolean {
  if (GLOBAL_MEMBERS[pkg]) return true;
  const ep = extra.find((e) => e.name === pkg);
  return ep ? namespaceImportName(code, ep) === pkg : false;
}

const RESERVED = new Set([...JS_KEYWORDS, "true", "false", "null", "undefined"]);

/** The player's own declarations before the cursor. */
export function extractUserSymbols(code: string, cursorPos: number): Completion[] {
  const before = code.slice(0, cursorPos);
  const seen = new Set<string>();
  const out: Completion[] = [];
  const add = (name: string, detail: string) => {
    if (name.length < 2 || seen.has(name) || RESERVED.has(name)) return;
    seen.add(name);
    out.push({ label: name, detail });
  };
  for (const m of before.matchAll(/\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)) {
    add(m[1], `function ${m[1]}(${m[2].trim()})`);
    for (const p of m[2].split(",")) {
      const name = p.trim().replace(/^\.\.\./, "").split(/[\s=]/)[0];
      if (/^[A-Za-z_$][\w$]*$/.test(name)) add(name, "param");
    }
  }
  for (const m of before.matchAll(/\b(const|let|var)\s+([A-Za-z_$][\w$]*)/g)) add(m[2], m[1]);
  for (const m of before.matchAll(/\b(?:const|let|var)\s*[{[]([^}\]=]*)[}\]]/g)) {
    for (const part of m[1].split(",")) {
      const name = part.split(":").pop()!.trim().replace(/^\.\.\./, "");
      if (/^[A-Za-z_$][\w$]*$/.test(name)) add(name, "const");
    }
  }
  for (const m of before.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g)) add(m[1], "class");
  for (const m of before.matchAll(/\bimport\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) add(name, "import");
    }
  }
  for (const m of before.matchAll(/\bimport\s*\*\s*as\s+([A-Za-z_$][\w$]*)/g)) add(m[1], "module");
  for (const m of before.matchAll(/\(([^()]*)\)\s*=>/g)) {
    for (const p of m[1].split(",")) {
      const name = p.trim().replace(/^\.\.\./, "").split(/[\s=]/)[0];
      if (/^[A-Za-z_$][\w$]*$/.test(name)) add(name, "param");
    }
  }
  return out;
}

export function getSymbolCompletions(code: string, cursorPos: number, partial: string, extra: ExtraPackage[] = []): Completion[] {
  const fromModules: Completion[] = extra.flatMap((ep) =>
    ep.members.map((m) => ({ label: m.label, detail: `${m.detail} · from "${ep.importPath}"` })),
  );
  const all = [...extractUserSymbols(code, cursorPos), ...fromModules, ...GLOBAL_FUNCS, ...KEYWORDS];
  const seen = new Set<string>();
  const unique = all.filter((c) => (seen.has(c.label) ? false : (seen.add(c.label), true)));
  if (!partial) return unique;
  const lower = partial.toLowerCase();
  return unique.filter((c) => c.label.toLowerCase().startsWith(lower));
}
