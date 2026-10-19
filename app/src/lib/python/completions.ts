// ── Python Autocomplete ──
// Members of imported stdlib modules (`math.`), a shipped module's top-level
// names (`cellblock.`), builtins, and the player's own definitions.

import type { CompileModule } from "@/types/game";
import type { Completion, ExtraPackage } from "@/lib/lang/types";
import { PY_BUILTINS, PY_CONSTANTS, PY_KEYWORDS, PY_TYPES } from "./tokenizer";

const STDLIB_MEMBERS: Record<string, Record<string, string>> = {
  math: {
    sqrt: "math.sqrt(x)",
    floor: "math.floor(x)",
    ceil: "math.ceil(x)",
    pow: "math.pow(x, y)",
    pi: "math.pi",
    inf: "math.inf",
    isclose: "math.isclose(a, b)",
    prod: "math.prod(iterable)",
  },
  random: {
    randint: "random.randint(a, b)",
    choice: "random.choice(seq)",
    shuffle: "random.shuffle(list)",
    random: "random.random() → [0, 1)",
  },
  string: {
    ascii_lowercase: "string.ascii_lowercase",
    ascii_uppercase: "string.ascii_uppercase",
    digits: "string.digits",
  },
};

const BUILTIN_DETAILS: Record<string, string> = {
  print: "print(*values, sep=' ', end='\\n')",
  len: "len(obj) → int",
  range: "range(start, stop[, step])",
  sum: "sum(iterable, start=0)",
  min: "min(iterable)",
  max: "max(iterable)",
  enumerate: "enumerate(iterable, start=0)",
  sorted: "sorted(iterable, key=None, reverse=False)",
  zip: "zip(*iterables)",
  isinstance: "isinstance(obj, type)",
};

function topLevelNames(content: string): Completion[] {
  const seen = new Set<string>();
  const out: Completion[] = [];
  const add = (name: string, detail: string) => {
    if (name.startsWith("_") || seen.has(name)) return;
    seen.add(name);
    out.push({ label: name, detail: detail.trim() });
  };
  for (const m of content.matchAll(/^def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)([^:\n]*)/gm)) add(m[1], `def ${m[1]}(${m[2].trim()})${m[3]}`);
  for (const m of content.matchAll(/^class\s+([A-Za-z_]\w*)/gm)) add(m[1], `class ${m[1]}`);
  for (const m of content.matchAll(/^([A-Za-z_]\w*)\s*(?::\s*[^=\n]+)?=(?!=)\s*([^\n]*)/gm)) add(m[1], `${m[1]} = ${m[2]}`);
  return out;
}

/** "cellblock.py" → an importable `cellblock` module. */
export function extraPackagesFromModule(mod: CompileModule): ExtraPackage[] {
  return mod.files
    .filter((f) => f.path.endsWith(".py"))
    .map((f) => {
      const name = f.path.split("/").pop()!.replace(/\.py$/, "");
      return { name, importPath: name, members: topLevelNames(f.content) };
    });
}

function importedAs(code: string, module: string): string | null {
  const esc = module.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const alias = code.match(new RegExp(`^\\s*import\\s+${esc}\\s+as\\s+(\\w+)`, "m"));
  if (alias) return alias[1];
  const plain = new RegExp(`^\\s*import\\s+(?:[\\w.]+\\s*,\\s*)*${esc}\\b`, "m");
  return plain.test(code) ? module : null;
}

export function getCompletions(pkg: string, extra: ExtraPackage[] = []): Completion[] {
  const ep = extra.find((e) => e.name === pkg);
  if (ep) return [...ep.members].sort((a, b) => a.label.localeCompare(b.label));
  const members = STDLIB_MEMBERS[pkg];
  if (!members) return [];
  return Object.entries(members).sort(([a], [b]) => a.localeCompare(b)).map(([label, detail]) => ({ label, detail }));
}

export function getKnownPackages(extra: ExtraPackage[] = []): string[] {
  return [...Object.keys(STDLIB_MEMBERS), ...extra.map((e) => e.name)];
}

export function isPackageImported(code: string, pkg: string, extra: ExtraPackage[] = []): boolean {
  const ep = extra.find((e) => e.name === pkg);
  return importedAs(code, ep ? ep.importPath : pkg) === pkg;
}

const RESERVED = new Set([...PY_KEYWORDS, ...PY_CONSTANTS]);

export function extractUserSymbols(code: string, cursorPos: number): Completion[] {
  const before = code.slice(0, cursorPos);
  const seen = new Set<string>();
  const out: Completion[] = [];
  const add = (name: string, detail: string) => {
    if (name.length < 2 || seen.has(name) || RESERVED.has(name)) return;
    seen.add(name);
    out.push({ label: name, detail });
  };
  for (const m of before.matchAll(/\bdef\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/g)) {
    add(m[1], `def ${m[1]}(${m[2].trim()})`);
    for (const p of m[2].split(",")) {
      const name = p.trim().replace(/^\*{1,2}/, "").split(/[\s:=]/)[0];
      if (/^[A-Za-z_]\w*$/.test(name)) add(name, "param");
    }
  }
  for (const m of before.matchAll(/\bclass\s+([A-Za-z_]\w*)/g)) add(m[1], "class");
  for (const m of before.matchAll(/^\s*([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s*(?::[^=\n]+)?=(?!=)/gm)) {
    for (const v of m[1].split(",")) add(v.trim(), "variable");
  }
  for (const m of before.matchAll(/\bfor\s+([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s+in\b/g)) {
    for (const v of m[1].split(",")) add(v.trim(), "variable");
  }
  for (const m of before.matchAll(/^\s*from\s+[\w.]+\s+import\s+\(?([^)\n]+)\)?/gm)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && name !== "*") add(name, "import");
    }
  }
  return out;
}

export function getSymbolCompletions(code: string, cursorPos: number, partial: string, extra: ExtraPackage[] = []): Completion[] {
  const modules: Completion[] = [
    ...extra.map((ep) => ({ label: ep.name, detail: "module" })),
    ...Object.keys(STDLIB_MEMBERS).map((m) => ({ label: m, detail: "module" })),
  ];
  const builtins: Completion[] = [
    ...[...PY_BUILTINS].map((b) => ({ label: b, detail: BUILTIN_DETAILS[b] ?? "builtin" })),
    ...[...PY_TYPES].map((t) => ({ label: t, detail: "type" })),
    ...[...PY_CONSTANTS].map((c) => ({ label: c, detail: "constant" })),
  ];
  const keywords = [...PY_KEYWORDS].map((k) => ({ label: k, detail: "keyword" }));
  const all = [...extractUserSymbols(code, cursorPos), ...modules, ...builtins, ...keywords];
  const seen = new Set<string>();
  const unique = all.filter((c) => (seen.has(c.label) ? false : (seen.add(c.label), true)));
  if (!partial) return unique;
  const lower = partial.toLowerCase();
  return unique.filter((c) => c.label.toLowerCase().startsWith(lower));
}
