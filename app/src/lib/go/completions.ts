// ── Go Autocomplete ──
// Provides method completions for known stdlib packages.
// Powered by the same registry used in diagnostics.

import { KNOWN_PKG_METHODS } from "./diagnostics";
import type { CompileModule } from "@/types/game";

export interface Completion {
  label: string;
  detail: string;
}

/**
 * A non-stdlib package shipped with a step (via its compileModule) that the
 * player can import. Feeds autocomplete so `pkg.` lists the package's exported
 * members and a bare prefix suggests the package name once it's imported.
 */
export interface ExtraPackage {
  /** The name the player writes before the dot, e.g. "cellblock". */
  name: string;
  /** The full import path, e.g. "terminal/cellblock". */
  importPath: string;
  /** Exported members of the package. */
  members: Completion[];
}

/** Build the importable packages from a step's compileModule. */
export function extraPackagesFromModule(mod: CompileModule): ExtraPackage[] {
  const byPath = new Map<string, ExtraPackage>();
  for (const file of mod.files) {
    const pkgMatch = file.content.match(/\bpackage\s+(\w+)/);
    if (!pkgMatch) continue;
    const dir = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : "";
    const importPath = dir ? `${mod.module}/${dir}` : mod.module;
    const existing = byPath.get(importPath);
    const members = extractExportedSymbols(file.content);
    if (existing) {
      existing.members.push(...members);
    } else {
      byPath.set(importPath, { name: pkgMatch[1], importPath, members });
    }
  }
  return Array.from(byPath.values());
}

/** Extract exported (capitalized) top-level declarations from a Go package file. */
function extractExportedSymbols(content: string): Completion[] {
  const seen = new Set<string>();
  const out: Completion[] = [];
  const add = (name: string, detail: string) => {
    if (!/^[A-Z]/.test(name) || seen.has(name)) return;
    seen.add(name);
    out.push({ label: name, detail: detail.trim() });
  };

  // single const/var declarations: const Cell = "B-09"
  for (const m of content.matchAll(/\b(const|var)\s+([A-Za-z_]\w*)\b([^\n]*)/g)) {
    add(m[2], `${m[1]} ${m[2]}${m[3]}`);
  }
  // func Name(params) ret
  for (const m of content.matchAll(/\bfunc\s+([A-Za-z_]\w*)\s*\(([^)]*)\)([^\n{]*)/g)) {
    add(m[1], `func ${m[1]}(${m[2].trim()})${m[3].replace(/\{/g, "").trimEnd()}`);
  }
  // type Name ...
  for (const m of content.matchAll(/\btype\s+([A-Za-z_]\w*)\s+([^\n{]*)/g)) {
    add(m[1], `type ${m[1]} ${m[2].trim()}`);
  }
  // grouped const/var blocks
  for (const m of content.matchAll(/\b(const|var)\s*\(([\s\S]*?)\)/g)) {
    for (const line of m[2].split("\n")) {
      const t = line.trim();
      const idm = t.match(/^([A-Za-z_]\w*)/);
      if (idm) add(idm[1], `${m[1]} ${t}`);
    }
  }
  return out;
}

const METHOD_SIGNATURES: Record<string, Record<string, string>> = {
  fmt: {
    Print: "func Print(a ...any) (n int, err error)",
    Println: "func Println(a ...any) (n int, err error)",
    Printf: "func Printf(format string, a ...any) (n int, err error)",
    Sprint: "func Sprint(a ...any) string",
    Sprintf: "func Sprintf(format string, a ...any) string",
    Sprintln: "func Sprintln(a ...any) string",
    Fprint: "func Fprint(w io.Writer, a ...any) (n int, err error)",
    Fprintf: "func Fprintf(w io.Writer, format string, a ...any) (n int, err error)",
    Fprintln: "func Fprintln(w io.Writer, a ...any) (n int, err error)",
    Scan: "func Scan(a ...any) (n int, err error)",
    Scanf: "func Scanf(format string, a ...any) (n int, err error)",
    Scanln: "func Scanln(a ...any) (n int, err error)",
    Sscan: "func Sscan(str string, a ...any) (n int, err error)",
    Sscanf: "func Sscanf(str string, format string, a ...any) (n int, err error)",
    Sscanln: "func Sscanln(str string, a ...any) (n int, err error)",
    Errorf: "func Errorf(format string, a ...any) error",
  },
  strings: {
    Contains: "func Contains(s, substr string) bool",
    HasPrefix: "func HasPrefix(s, prefix string) bool",
    HasSuffix: "func HasSuffix(s, suffix string) bool",
    Index: "func Index(s, substr string) int",
    Join: "func Join(elems []string, sep string) string",
    Replace: "func Replace(s, old, new string, n int) string",
    ReplaceAll: "func ReplaceAll(s, old, new string) string",
    Split: "func Split(s, sep string) []string",
    ToLower: "func ToLower(s string) string",
    ToUpper: "func ToUpper(s string) string",
    TrimSpace: "func TrimSpace(s string) string",
    Count: "func Count(s, substr string) int",
    Repeat: "func Repeat(s string, count int) string",
    Fields: "func Fields(s string) []string",
    EqualFold: "func EqualFold(s, t string) bool",
  },
  strconv: {
    Atoi: "func Atoi(s string) (int, error)",
    Itoa: "func Itoa(i int) string",
    FormatInt: "func FormatInt(i int64, base int) string",
    FormatFloat: "func FormatFloat(f float64, fmt byte, prec, bitSize int) string",
    ParseInt: "func ParseInt(s string, base int, bitSize int) (int64, error)",
    ParseFloat: "func ParseFloat(s string, bitSize int) (float64, error)",
    ParseBool: "func ParseBool(str string) (bool, error)",
  },
  math: {
    Abs: "func Abs(x float64) float64",
    Max: "func Max(x, y float64) float64",
    Min: "func Min(x, y float64) float64",
    Sqrt: "func Sqrt(x float64) float64",
    Pow: "func Pow(x, y float64) float64",
    Floor: "func Floor(x float64) float64",
    Ceil: "func Ceil(x float64) float64",
    Round: "func Round(x float64) float64",
    Log: "func Log(x float64) float64",
  },
  os: {
    Exit: "func Exit(code int)",
    Getenv: "func Getenv(key string) string",
    Args: "var Args []string",
    Open: "func Open(name string) (*File, error)",
    Create: "func Create(name string) (*File, error)",
    ReadFile: "func ReadFile(name string) ([]byte, error)",
    WriteFile: "func WriteFile(name string, data []byte, perm FileMode) error",
  },
};

export function getCompletions(pkg: string, extra: ExtraPackage[] = []): Completion[] {
  const ep = extra.find((e) => e.name === pkg);
  if (ep) {
    return [...ep.members].sort((a, b) => a.label.localeCompare(b.label));
  }

  const methods = KNOWN_PKG_METHODS[pkg];
  if (!methods) return [];

  const sigs = METHOD_SIGNATURES[pkg] || {};
  return Array.from(methods)
    .sort()
    .map((m) => ({
      label: m,
      detail: sigs[m] || `${pkg}.${m}`,
    }));
}

export function getKnownPackages(extra: ExtraPackage[] = []): string[] {
  return [...Object.keys(KNOWN_PKG_METHODS), ...extra.map((e) => e.name)];
}

/** Check if a package is imported in the given Go source code. */
export function isPackageImported(code: string, pkg: string, extra: ExtraPackage[] = []): boolean {
  // Extra (shipped) packages import by their full path, e.g. "terminal/cellblock".
  const ep = extra.find((e) => e.name === pkg);
  const token = ep ? ep.importPath : pkg;
  // Single import: import "fmt"
  const singleImport = new RegExp(`\\bimport\\s+"${token}"`)
  if (singleImport.test(code)) return true;
  // Grouped import: import (\n\t"fmt"\n)
  const groupMatch = code.match(/\bimport\s*\(([\s\S]*?)\)/);
  if (groupMatch) {
    const body = groupMatch[1];
    return new RegExp(`"${token}"`).test(body);
  }
  return false;
}

// ── User-defined symbol extraction ──

const GO_KEYWORDS: Completion[] = [
  "break", "case", "const", "continue", "default", "defer", "else",
  "for", "func", "go", "if", "import", "interface", "map", "package",
  "range", "return", "select", "struct", "switch", "type", "var",
].map((k) => ({ label: k, detail: "keyword" }));

const GO_BUILTINS: Completion[] = [
  { label: "append", detail: "func append(slice []T, elems ...T) []T" },
  { label: "cap", detail: "func cap(v Type) int" },
  { label: "close", detail: "func close(c chan<- Type)" },
  { label: "copy", detail: "func copy(dst, src []Type) int" },
  { label: "delete", detail: "func delete(m map[Type]Type1, key Type)" },
  { label: "len", detail: "func len(v Type) int" },
  { label: "make", detail: "func make(t Type, size ...int) Type" },
  { label: "new", detail: "func new(Type) *Type" },
  { label: "panic", detail: "func panic(v any)" },
  { label: "recover", detail: "func recover() any" },
  { label: "true", detail: "bool constant" },
  { label: "false", detail: "bool constant" },
  { label: "nil", detail: "zero value" },
  { label: "string", detail: "type" },
  { label: "int", detail: "type" },
  { label: "float64", detail: "type" },
  { label: "bool", detail: "type" },
  { label: "byte", detail: "type (alias for uint8)" },
  { label: "error", detail: "interface" },
];

// Go entry-point / special names you'd never autocomplete
const UNCALLABLE_FUNCS = new Set(["main", "init"]);

// Names that shouldn't appear as user symbol completions
const RESERVED_NAMES = new Set([
  "main", "init", "package", "import", "func", "var", "const", "type",
  "if", "else", "for", "range", "return", "switch", "case", "default",
  "break", "continue", "go", "defer", "select", "chan", "struct",
  "interface", "map", "true", "false", "nil",
]);

/** Extract user-declared symbols from Go source code (before cursor position). */
export function extractUserSymbols(code: string, cursorPos: number): Completion[] {
  const before = code.slice(0, cursorPos);
  const seen = new Set<string>();
  const results: Completion[] = [];

  const add = (name: string, detail: string) => {
    if (name.length < 2 || seen.has(name) || RESERVED_NAMES.has(name)) return;
    seen.add(name);
    results.push({ label: name, detail });
  };

  // func name( — skip main/init since they're entry points, not callable
  for (const m of before.matchAll(/\bfunc\s+(\w+)\s*\(/g)) {
    if (!UNCALLABLE_FUNCS.has(m[1])) add(m[1], "func");
  }

  // type Name struct/interface/...
  for (const m of before.matchAll(/\btype\s+(\w+)\s+/g)) {
    add(m[1], "type");
  }

  // var name type  or  var name = ...  (single declaration)
  for (const m of before.matchAll(/\bvar\s+(\w+)/g)) {
    add(m[1], "var");
  }

  // var (...) grouped declaration
  for (const m of before.matchAll(/\bvar\s*\(([\s\S]*?)\)/g)) {
    for (const line of m[1].split("\n")) {
      const id = line.trim().match(/^(\w+)/);
      if (id) add(id[1], "var");
    }
  }

  // const name  (single declaration)
  for (const m of before.matchAll(/\bconst\s+(\w+)/g)) {
    add(m[1], "const");
  }

  // const (...) grouped declaration
  for (const m of before.matchAll(/\bconst\s*\(([\s\S]*?)\)/g)) {
    for (const line of m[1].split("\n")) {
      const id = line.trim().match(/^(\w+)/);
      if (id) add(id[1], "const");
    }
  }

  // short variable declaration: name :=  (also handles multiple: a, b :=)
  for (const m of before.matchAll(/\b(\w+(?:\s*,\s*\w+)*)\s*:=/g)) {
    for (const v of m[1].split(",")) {
      const name = v.trim();
      if (name && name !== "_") add(name, "var");
    }
  }

  // for-range variables: for k, v := range
  for (const m of before.matchAll(/\bfor\s+(\w+)\s*(?:,\s*(\w+))?\s*:=\s*range/g)) {
    if (m[1] && m[1] !== "_") add(m[1], "var");
    if (m[2] && m[2] !== "_") add(m[2], "var");
  }

  // func parameters: func name(a int, b string)
  for (const m of before.matchAll(/\bfunc\s+\w*\s*\(([^)]*)\)/g)) {
    for (const param of m[1].split(",")) {
      const parts = param.trim().split(/\s+/);
      if (parts[0] && parts[0] !== "_" && /^\w+$/.test(parts[0])) {
        add(parts[0], "param");
      }
    }
  }

  return results;
}

/** Extract imported package names that we know about. */
export function getImportedPackages(code: string, extra: ExtraPackage[] = []): Completion[] {
  const results: Completion[] = [];
  for (const pkg of Object.keys(KNOWN_PKG_METHODS)) {
    if (isPackageImported(code, pkg)) {
      results.push({ label: pkg, detail: "package" });
    }
  }
  for (const ep of extra) {
    if (isPackageImported(code, ep.name, extra)) {
      results.push({ label: ep.name, detail: `package "${ep.importPath}"` });
    }
  }
  return results;
}

/** Get all symbol completions for a bare identifier prefix. */
export function getSymbolCompletions(code: string, cursorPos: number, partial: string, extra: ExtraPackage[] = []): Completion[] {
  const userSymbols = extractUserSymbols(code, cursorPos);
  const importedPkgs = getImportedPackages(code, extra);
  const all = [...userSymbols, ...importedPkgs, ...GO_BUILTINS, ...GO_KEYWORDS];
  if (!partial) return all;
  const lower = partial.toLowerCase();
  return all.filter((c) => c.label.toLowerCase().startsWith(lower));
}
