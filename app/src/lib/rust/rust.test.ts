// The Rust route's local half: tokenizer, lint, harness/module injection and
// error explanations — plus a few real compiles through a local rustc when one
// is installed (the Playground is never hit from tests).

import { beforeAll, describe, expect, it } from "vitest";
import { getLanguageService } from "@/lib/lang/registry";
import { tokenize, isInsideRustString } from "./tokenizer";
import { diagnose } from "./diagnostics";
import { buildRustSource, explainRustError, firstRustError, inlineModules, replaceRustMain, rustPanic } from "./harness";
import { extraPackagesFromModule, getCompletions, isPackageImported } from "./completions";
import { installLocalRustc } from "./node-backend";
import type { CompileModule } from "@/types/game";

const CELLBLOCK: CompileModule = {
  module: "terminal",
  files: [{ path: "cellblock.rs", content: `// CELL is maya's holding cell.\npub const CELL: &str = "B-09";\n\n// how deep.\npub const SUBLEVEL: u8 = 3;\n` }],
};

describe("rust tokenizer", () => {
  it("reads macros, ranges, paths and lifetimes", () => {
    const toks = tokenize(`fn main() { for i in 1..=10 { println!("{}", cellblock::CELL); } let s: &'static str = "x"; }`);
    const by = (v: string) => toks.find((t) => t.value === v)!;
    expect(by("fn").type).toBe("keyword");
    expect(by("println!").type).toBe("builtin");
    expect(by("..=").type).toBe("operator");
    expect(by("::").type).toBe("operator");
    expect(by("'static").type).toBe("type");
    expect(by("str").type).toBe("type");
    expect(by('"{}"').type).toBe("string");
  });

  it("does not glue `!=` onto an identifier", () => {
    const values = tokenize("if a!=b {}").map((t) => t.value);
    expect(values).toContain("a");
    expect(values).toContain("!=");
  });

  it("knows when the cursor is inside a string", () => {
    expect(isInsideRustString(`println!("cell`, 13)).toBe(true);
    expect(isInsideRustString(`let c = '"'; cellblock::`, 22)).toBe(false);
  });
});

describe("rust diagnostics", () => {
  const errs = (src: string) => diagnose(src).filter((d) => d.severity === "error");

  it("passes clean code", () => {
    expect(errs(`fn main() {\n    for i in 1..=10 {\n        println!("{} {}", i, if i > 3 { "a" } else { "b" });\n    }\n}`)).toEqual([]);
  });

  it("names the line an unclosed brace opened on", () => {
    const [d] = errs(`fn main() {\n    println!("hi");\n`);
    expect(d).toMatchObject({ line: 1 });
    expect(d.message).toMatch(/never closed/);
  });

  it("catches a macro called without its bang", () => {
    expect(errs(`fn main() { println("hi"); }`)[0].message).toMatch(/println!/);
    expect(errs(`fn print(x: i32) {}\nfn main() { print(1); }`)).toEqual([]);
  });

  it("catches other languages' print calls", () => {
    expect(errs(`fn main() { fmt.Println("hi"); }`)[0].message).toMatch(/go/);
    expect(errs(`fn main() { console.log("hi"); }`)[0].message).toMatch(/javascript/);
  });
});

describe("rust harness", () => {
  it("swaps the player's main for the harness, keeping line numbers above and below", () => {
    const code = `fn add(a: i32) -> i32 {\n    a + 1\n}\n\nfn main() {\n    let s = "{";\n    println!("{}", add(1));\n}\n\nfn later() {}`;
    const out = replaceRustMain(code, `fn main() {\n    println!("H");\n}`);
    expect(out).not.toContain("add(1)");
    expect(out.split("\n").indexOf("fn later() {}")).toBe(code.split("\n").indexOf("fn later() {}"));
    expect(out).toContain('println!("H");');
    expect(out.match(/fn main/g)).toHaveLength(1);
  });

  it("inlines a shipped module on the line that declares it", () => {
    const code = `mod cellblock;\n\nfn main() {\n    println!("{}", cellblock::CELL);\n}`;
    const out = inlineModules(code, CELLBLOCK);
    expect(out.split("\n")).toHaveLength(code.split("\n").length);
    expect(out.split("\n")[0]).toBe(`mod cellblock { pub const CELL: &str = "B-09"; pub const SUBLEVEL: u8 = 3; }`);
  });

  it("leaves an undeclared module out", () => {
    expect(inlineModules(`fn main() {}`, CELLBLOCK)).toBe(`fn main() {}`);
  });

  it("builds harness + module together", () => {
    const out = buildRustSource(`mod cellblock;\nfn main() {}`, `fn main() { println!("{}", cellblock::SUBLEVEL); }`, CELLBLOCK);
    expect(out).toContain("mod cellblock {");
    expect(out).toContain("cellblock::SUBLEVEL");
  });
});

describe("rust errors", () => {
  const stderr = `   Compiling playground v0.0.1 (/playground)
warning: unused variable: \`x\`
 --> src/main.rs:1:17
  |

error[E0423]: cannot find function \`println\` in this scope
 --> src/main.rs:3:5
  |
3 |     println("hi");
  |     ^^^^^^^ not found in this scope

For more information about this error, try \`rustc --explain E0423\`.
error: could not compile \`playground\` (bin "playground") due to 1 previous error
`;

  it("keeps the first error block without cargo chatter or warnings", () => {
    const e = firstRustError(stderr);
    expect(e.startsWith("error[E0423]")).toBe(true);
    expect(e).not.toMatch(/Compiling|could not compile|warning/);
  });

  it("explains compile errors in maya's words with the line", () => {
    expect(explainRustError(firstRustError(stderr), false)).toBe("line 3: `println` is a macro — call it with a bang: `println!(...)`.");
    expect(explainRustError("error[E0384]: cannot assign twice to immutable variable `total`\n --> src/main.rs:4:9", false)).toMatch(/^line 4: .*let mut/);
    expect(explainRustError("error[E0433]: failed to resolve: use of undeclared crate or module `cellblock`\n --> src/main.rs:2:20", false)).toMatch(/mod cellblock;/);
    expect(explainRustError("error[E0433]: cannot find module or crate `cellblock` in this scope\n --> src/main.rs:2:20", false)).toMatch(/^line 2: .*mod cellblock;/);
    expect(explainRustError("error[E0583]: file not found for module `cellblock`\n --> src/main.rs:1:1", false)).toMatch(/^line 1: .*drop the `mod cellblock;`/);
    expect(explainRustError("error[E0601]: `main` function not found in crate `playground`", true)).toMatch(/^no time for bugs\. .*fn main/);
  });

  it("explains a panic", () => {
    const panic = rustPanic("thread 'main' panicked at src/main.rs:2:13:\nindex out of bounds: the len is 3 but the index is 5\nnote: run with `RUST_BACKTRACE=1` environment variable to display a backtrace\n");
    expect(panic).not.toMatch(/RUST_BACKTRACE/);
    expect(explainRustError(panic, false)).toMatch(/past the end/);
  });
});

describe("rust completions", () => {
  const extra = extraPackagesFromModule(CELLBLOCK);

  it("parses a shipped module's public items", () => {
    expect(extra[0].name).toBe("cellblock");
    expect(getCompletions("cellblock", extra).map((c) => c.label)).toEqual(["CELL", "SUBLEVEL"]);
  });

  it("only completes a shipped module once it's declared", () => {
    expect(isPackageImported(`fn main() {}`, "cellblock", extra)).toBe(false);
    expect(isPackageImported(`mod cellblock;\nfn main() {}`, "cellblock", extra)).toBe(true);
  });
});

describe("rust runs (local rustc)", () => {
  let hasRustc = false;
  beforeAll(() => {
    hasRustc = installLocalRustc();
  });
  const rs = getLanguageService("rust");

  it("runs a program, a module, and reports compile errors and panics", async () => {
    if (!hasRustc) return;
    const ok = await rs.run({ code: `mod cellblock;\nfn main() {\n    println!("CELL {} - SUBLEVEL {}", cellblock::CELL, cellblock::SUBLEVEL);\n}`, module: CELLBLOCK });
    expect(ok).toMatchObject({ status: "ok", stdout: "CELL B-09 - SUBLEVEL 3\n" });

    const missingMod = await rs.run({ code: `fn main() {\n    println!("{}", cellblock::CELL);\n}`, module: CELLBLOCK });
    expect(missingMod.status).toBe("error");
    expect(rs.explainError(missingMod.error, false)).toMatch(/^line 2: .*mod cellblock;/);

    const immut = await rs.run({ code: `fn main() {\n    let total = 0;\n    total += 1;\n    println!("{}", total);\n}` });
    expect(rs.explainError(immut.error, false)).toMatch(/^line 3: .*let mut/);

    const panic = await rs.run({ code: `fn main() {\n    let v = vec![1, 2, 3];\n    let i = v.len() + 2;\n    println!("{}", v[i]);\n}` });
    expect(panic.status).toBe("error");
    expect(rs.explainError(panic.error, false)).toMatch(/crashed/);
  }, 30000);
});

describe("runaway programs", () => {
  it("are a failed run with a clear reason, never 'offline'", async () => {
    const { setRustBackend } = await import("./playground");
    const rs = getLanguageService("rust");
    setRustBackend(async () => ({ success: false, stdout: "", stderr: "The operation timed out: deadline has elapsed", exitDetail: "playground error" }));
    try {
      const res = await rs.run({ code: "fn main() { loop {} }" });
      expect(res.status).toBe("error");
      expect(rs.explainError(res.error, false)).toMatch(/loop that never ends/);
    } finally {
      if (!installLocalRustc()) setRustBackend(null);
    }
  });
});
