import { describe, it, expect } from "vitest";
import {
  getCompletions,
  getSymbolCompletions,
  getImportedPackages,
  isPackageImported,
  extractUserSymbols,
} from "./completions";

// ── Package completions ──

describe("getCompletions", () => {
  it("returns methods for known packages", () => {
    const items = getCompletions("fmt");
    expect(items.length).toBeGreaterThan(0);
    expect(items.find((c) => c.label === "Println")).toBeTruthy();
  });

  it("returns empty for unknown packages", () => {
    expect(getCompletions("foobar")).toEqual([]);
  });
});

// ── Import detection ──

describe("isPackageImported", () => {
  it("detects single import", () => {
    expect(isPackageImported(`import "fmt"`, "fmt")).toBe(true);
  });

  it("detects grouped import", () => {
    const code = `import (\n\t"fmt"\n\t"strings"\n)`;
    expect(isPackageImported(code, "fmt")).toBe(true);
    expect(isPackageImported(code, "strings")).toBe(true);
  });

  it("returns false when not imported", () => {
    expect(isPackageImported(`import "os"`, "fmt")).toBe(false);
  });

  it("returns false for empty code", () => {
    expect(isPackageImported("", "fmt")).toBe(false);
  });
});

// ── Symbol completions — the core bug guard ──

describe("getSymbolCompletions", () => {
  const CODE_NO_IMPORT = `package main

func main() {
    pri
}`;

  const CODE_WITH_IMPORT = `package main

import "fmt"

func main() {
    fmt.
}`;

  it("does NOT suggest print/println as bare identifiers", () => {
    const pos = CODE_NO_IMPORT.indexOf("pri") + 3;
    const results = getSymbolCompletions(CODE_NO_IMPORT, pos, "pri");
    const labels = results.map((c) => c.label);
    expect(labels).not.toContain("print");
    expect(labels).not.toContain("println");
    expect(labels).not.toContain("Printf");
    expect(labels).not.toContain("Println");
    expect(labels).not.toContain("Print");
  });

  it("does NOT suggest any fmt method names as bare identifiers", () => {
    const fmtMethods = ["Print", "Println", "Printf", "Sprint", "Sprintf",
      "Sprintln", "Fprint", "Fprintf", "Fprintln", "Scan", "Scanf",
      "Scanln", "Sscan", "Sscanf", "Sscanln", "Errorf"];
    for (const method of fmtMethods) {
      const partial = method.slice(0, 3);
      const code = `package main\n\nfunc main() {\n    ${partial}\n}`;
      const pos = code.indexOf(partial) + partial.length;
      const results = getSymbolCompletions(code, pos, partial);
      const labels = results.map((c) => c.label);
      expect(labels).not.toContain(method);
    }
  });

  it("does NOT suggest strings/strconv/math/os method names as bare identifiers", () => {
    const pkgMethods = [
      "Contains", "HasPrefix", "Split", "ToLower",  // strings
      "Atoi", "Itoa", "FormatInt",                    // strconv
      "Abs", "Sqrt", "Pow",                           // math
      "Exit", "Getenv", "ReadFile",                    // os
    ];
    for (const method of pkgMethods) {
      const partial = method.slice(0, 3);
      const code = `package main\n\nfunc main() {\n    ${partial}\n}`;
      const pos = code.indexOf(partial) + partial.length;
      const results = getSymbolCompletions(code, pos, partial);
      const labels = results.map((c) => c.label);
      expect(labels).not.toContain(method);
    }
  });

  it("suggests Go keywords when partial matches", () => {
    const code = `package main\n\nfunc main() {\n    fo\n}`;
    const pos = code.indexOf("fo") + 2;
    const results = getSymbolCompletions(code, pos, "fo");
    const labels = results.map((c) => c.label);
    expect(labels).toContain("for");
  });

  it("suggests Go builtins when partial matches", () => {
    const code = `package main\n\nfunc main() {\n    app\n}`;
    const pos = code.indexOf("app") + 3;
    const results = getSymbolCompletions(code, pos, "app");
    const labels = results.map((c) => c.label);
    expect(labels).toContain("append");
  });

  it("suggests user-declared functions", () => {
    const code = `package main\n\nfunc greet() {}\n\nfunc main() {\n    gre\n}`;
    const pos = code.indexOf("gre\n") + 3;
    const results = getSymbolCompletions(code, pos, "gre");
    const labels = results.map((c) => c.label);
    expect(labels).toContain("greet");
  });

  it("suggests user-declared variables", () => {
    const code = `package main\n\nfunc main() {\n    total := 0\n    tot\n}`;
    const pos = code.lastIndexOf("tot") + 3;
    const results = getSymbolCompletions(code, pos, "tot");
    const labels = results.map((c) => c.label);
    expect(labels).toContain("total");
  });

  it("suggests imported package names as completions", () => {
    const code = `package main\n\nimport "fmt"\n\nfunc main() {\n    fm\n}`;
    const pos = code.indexOf("fm\n") + 2;
    const results = getSymbolCompletions(code, pos, "fm");
    const labels = results.map((c) => c.label);
    expect(labels).toContain("fmt");
  });

  it("suggests imported package from grouped import", () => {
    const code = `package main\n\nimport (\n\t"fmt"\n\t"strings"\n)\n\nfunc main() {\n    str\n}`;
    const pos = code.indexOf("str\n") + 3;
    const results = getSymbolCompletions(code, pos, "str");
    const labels = results.map((c) => c.label);
    expect(labels).toContain("strings");
    expect(labels).not.toContain("strconv");
  });

  it("does NOT suggest packages that are not imported", () => {
    const code = `package main\n\nimport "fmt"\n\nfunc main() {\n    os\n}`;
    const pos = code.indexOf("os\n") + 2;
    const results = getSymbolCompletions(code, pos, "os");
    const labels = results.map((c) => c.label);
    expect(labels).not.toContain("os");
  });

  it("shows package detail as 'package'", () => {
    const code = `package main\n\nimport "fmt"\n\nfunc main() {\n    fm\n}`;
    const pos = code.indexOf("fm\n") + 2;
    const results = getSymbolCompletions(code, pos, "fm");
    const fmtItem = results.find((c) => c.label === "fmt");
    expect(fmtItem).toBeTruthy();
    expect(fmtItem!.detail).toBe("package");
  });
});

// ── Imported package extraction ──

describe("getImportedPackages", () => {
  it("returns imported known packages", () => {
    const code = `import (\n\t"fmt"\n\t"strings"\n)`;
    const pkgs = getImportedPackages(code);
    const labels = pkgs.map((p) => p.label);
    expect(labels).toContain("fmt");
    expect(labels).toContain("strings");
    expect(labels).not.toContain("os");
  });

  it("returns empty when no known packages imported", () => {
    const code = `package main\n\nfunc main() {}`;
    expect(getImportedPackages(code)).toEqual([]);
  });
});

// ── User symbol extraction ──

describe("extractUserSymbols", () => {
  it("extracts func declarations (not main/init)", () => {
    const code = `func main() {}\nfunc helper() {}\nfunc init() {}`;
    const syms = extractUserSymbols(code, code.length);
    const labels = syms.map((s) => s.label);
    expect(labels).toContain("helper");
    expect(labels).not.toContain("main");
    expect(labels).not.toContain("init");
  });

  it("extracts short variable declarations", () => {
    const code = `name := "maya"\ncount := 5`;
    const syms = extractUserSymbols(code, code.length);
    const labels = syms.map((s) => s.label);
    expect(labels).toContain("name");
    expect(labels).toContain("count");
  });

  it("extracts for-range variables (min 2 chars)", () => {
    const code = `for idx, val := range items {`;
    const syms = extractUserSymbols(code, code.length);
    const labels = syms.map((s) => s.label);
    expect(labels).toContain("idx");
    expect(labels).toContain("val");
  });

  it("skips underscore and single-char names", () => {
    const code = `x := 1\n_ := 2`;
    const syms = extractUserSymbols(code, code.length);
    const labels = syms.map((s) => s.label);
    expect(labels).not.toContain("x");
    expect(labels).not.toContain("_");
  });

  it("extracts grouped const declarations", () => {
    const code = `const (\n\tdeny = "DENY"\n\twarn = "WARN"\n\tgrant = "GRANT"\n\toverride = "OVERRIDE"\n)`;
    const syms = extractUserSymbols(code, code.length);
    const labels = syms.map((s) => s.label);
    expect(labels).toContain("deny");
    expect(labels).toContain("warn");
    expect(labels).toContain("grant");
    expect(labels).toContain("override");
  });

  it("extracts grouped var declarations", () => {
    const code = `var (\n\ttotal int\n\tname string\n)`;
    const syms = extractUserSymbols(code, code.length);
    const labels = syms.map((s) => s.label);
    expect(labels).toContain("total");
    expect(labels).toContain("name");
  });

  it("extracts grouped const with iota", () => {
    const code = `const (\n\tread = iota\n\twrite\n\texecute\n)`;
    const syms = extractUserSymbols(code, code.length);
    const labels = syms.map((s) => s.label);
    expect(labels).toContain("read");
    expect(labels).toContain("write");
    expect(labels).toContain("execute");
  });
});
