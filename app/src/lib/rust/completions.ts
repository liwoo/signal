// ── Rust Autocomplete ──
// Paths into a shipped module (`cellblock::`), a few std paths a beginner
// meets, the common macros, and the player's own definitions. Completion fires
// on `name::` (the editor treats `::` like a dot).

import type { CompileModule } from "@/types/game";
import type { Completion, ExtraPackage } from "@/lib/lang/types";
import { RS_KEYWORDS, RS_LITERALS, RS_MACROS, RS_TYPES } from "./tokenizer";

const STD_PATHS: Record<string, Record<string, string>> = {
  std: {
    collections: "std::collections",
    fmt: "std::fmt",
    io: "std::io",
    mem: "std::mem",
  },
  collections: {
    HashMap: "std::collections::HashMap<K, V>",
    HashSet: "std::collections::HashSet<T>",
    BTreeMap: "std::collections::BTreeMap<K, V>",
    VecDeque: "std::collections::VecDeque<T>",
  },
  i32: { MAX: "i32::MAX", MIN: "i32::MIN" },
  u32: { MAX: "u32::MAX", MIN: "u32::MIN" },
  String: { new: "String::new() -> String", from: "String::from(s: &str) -> String" },
  Vec: { new: "Vec::new() -> Vec<T>", with_capacity: "Vec::with_capacity(n) -> Vec<T>" },
};

const MACRO_DETAILS: Record<string, string> = {
  println: "println!(\"{}\", value) — print a line",
  print: "print!(\"{}\", value) — print, no newline",
  eprintln: "eprintln!(...) — print to stderr",
  format: "format!(\"{}\", value) -> String",
  vec: "vec![a, b, c] -> Vec<T>",
  panic: "panic!(\"msg\") — crash with a message",
  assert: "assert!(cond)",
  assert_eq: "assert_eq!(left, right)",
  todo: "todo!() — not written yet",
};

/** `pub const`/`pub static`/`pub fn` items of a module file. */
function publicItems(content: string): Completion[] {
  const out: Completion[] = [];
  const seen = new Set<string>();
  const add = (name: string, detail: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    out.push({ label: name, detail: detail.trim() });
  };
  for (const m of content.matchAll(/^\s*pub\s+(const|static)\s+([A-Za-z_]\w*)\s*:\s*([^=\n]+?)\s*=\s*([^;\n]+);/gm)) {
    add(m[2], `${m[1]} ${m[2]}: ${m[3]} = ${m[4]}`);
  }
  for (const m of content.matchAll(/^\s*pub\s+fn\s+([A-Za-z_]\w*)\s*(\([^)]*\)[^{\n]*)/gm)) add(m[1], `fn ${m[1]}${m[2]}`);
  for (const m of content.matchAll(/^\s*pub\s+(struct|enum)\s+([A-Za-z_]\w*)/gm)) add(m[2], `${m[1]} ${m[2]}`);
  return out;
}

/** "cellblock.rs" → a module the player declares with `mod cellblock;`. */
export function extraPackagesFromModule(mod: CompileModule): ExtraPackage[] {
  return mod.files
    .filter((f) => f.path.endsWith(".rs"))
    .map((f) => {
      const name = f.path.split("/").pop()!.replace(/\.rs$/, "");
      return { name, importPath: `mod ${name};`, members: publicItems(f.content) };
    });
}

export function getCompletions(pkg: string, extra: ExtraPackage[] = []): Completion[] {
  const ep = extra.find((e) => e.name === pkg);
  if (ep) return [...ep.members].sort((a, b) => a.label.localeCompare(b.label));
  const members = STD_PATHS[pkg];
  if (!members) return [];
  return Object.entries(members).sort(([a], [b]) => a.localeCompare(b)).map(([label, detail]) => ({ label, detail }));
}

export function getKnownPackages(extra: ExtraPackage[] = []): string[] {
  return [...Object.keys(STD_PATHS), ...extra.map((e) => e.name)];
}

/** A shipped module needs its `mod name;` line; std paths are always there. */
export function isPackageImported(code: string, pkg: string, extra: ExtraPackage[] = []): boolean {
  const ep = extra.find((e) => e.name === pkg);
  if (!ep) return pkg in STD_PATHS;
  return new RegExp(`^\\s*(?:pub\\s+)?mod\\s+${pkg}\\s*;`, "m").test(code);
}

const RESERVED = new Set([...RS_KEYWORDS, ...RS_LITERALS]);

export function extractUserSymbols(code: string, cursorPos: number): Completion[] {
  const before = code.slice(0, cursorPos);
  const seen = new Set<string>();
  const out: Completion[] = [];
  const add = (name: string, detail: string) => {
    if (name.length < 2 || seen.has(name) || RESERVED.has(name) || name.startsWith("_")) return;
    seen.add(name);
    out.push({ label: name, detail });
  };
  for (const m of before.matchAll(/\bfn\s+([A-Za-z_]\w*)\s*\(([^)]*)\)(\s*->\s*[^{\n]+)?/g)) {
    add(m[1], `fn ${m[1]}(${m[2].trim()})${m[3] ? m[3].trimEnd() : ""}`);
    for (const p of m[2].split(",")) {
      const name = p.trim().replace(/^mut\s+/, "").split(/\s*:/)[0];
      if (/^[A-Za-z_]\w*$/.test(name)) add(name, "param");
    }
  }
  for (const m of before.matchAll(/\blet\s+(?:mut\s+)?\(?\s*([A-Za-z_]\w*(?:\s*,\s*(?:mut\s+)?[A-Za-z_]\w*)*)\s*\)?/g)) {
    for (const v of m[1].split(",")) add(v.trim().replace(/^mut\s+/, ""), "variable");
  }
  for (const m of before.matchAll(/\bfor\s+([A-Za-z_]\w*)\s+in\b/g)) add(m[1], "variable");
  for (const m of before.matchAll(/\b(?:const|static)\s+([A-Za-z_]\w*)\s*:/g)) add(m[1], "constant");
  for (const m of before.matchAll(/\b(?:struct|enum)\s+([A-Za-z_]\w*)/g)) add(m[1], "type");
  return out;
}

export function getSymbolCompletions(code: string, cursorPos: number, partial: string, extra: ExtraPackage[] = []): Completion[] {
  const modules: Completion[] = extra.map((ep) => ({ label: ep.name, detail: "module" }));
  const macros: Completion[] = [...RS_MACROS].map((m) => ({ label: m, detail: MACRO_DETAILS[m] ?? "macro" }));
  const types: Completion[] = [...RS_TYPES].map((t) => ({ label: t, detail: "type" }));
  const keywords = [...RS_KEYWORDS, ...RS_LITERALS].map((k) => ({ label: k, detail: "keyword" }));
  const all = [...extractUserSymbols(code, cursorPos), ...modules, ...macros, ...types, ...keywords];
  const seen = new Set<string>();
  const unique = all.filter((c) => (seen.has(c.label) ? false : (seen.add(c.label), true)));
  if (!partial) return unique;
  const lower = partial.toLowerCase();
  return unique.filter((c) => c.label.toLowerCase().startsWith(lower));
}
