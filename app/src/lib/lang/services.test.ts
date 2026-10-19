import { describe, expect, it } from "vitest";
import { getLanguageService, isLanguageId } from "./registry";
import type { LanguageId } from "@/types/game";

describe("registry", () => {
  it("resolves every language and defaults to go", () => {
    expect(getLanguageService("go").id).toBe("go");
    expect(getLanguageService("javascript").label).toBe("JavaScript");
    expect(getLanguageService("python").mainFile).toBe("main.py");
    expect(getLanguageService(undefined).id).toBe("go");
    expect(isLanguageId("python")).toBe(true);
    expect(isLanguageId("rust")).toBe(false);
  });
});

const lint = (lang: LanguageId, src: string) => getLanguageService(lang).diagnose(src).filter((d) => d.severity === "error");

describe("javascript diagnostics", () => {
  it("passes clean code, including regex literals with brackets", () => {
    expect(lint("javascript", `const s = "a(b".replace(/[(]/g, "");\nconsole.log(s);`)).toEqual([]);
  });

  it("names the line an unclosed bracket opened on", () => {
    const [d] = lint("javascript", `for (let i = 1; i <= 10; i++) {\n  console.log(i);\n`);
    expect(d).toMatchObject({ line: 1 });
    expect(d.message).toMatch(/never closed/);
  });

  it("catches other languages' print calls", () => {
    expect(lint("javascript", `fmt.Println("hi")`)[0].message).toMatch(/console\.log/);
    expect(lint("javascript", `print("hi")`)[0].message).toMatch(/python/);
    expect(lint("javascript", `function print(x) {}\nprint("hi")`)).toEqual([]);
  });

  it("catches console typos and case", () => {
    expect(lint("javascript", `console.Log("x")`)[0].message).toMatch(/lowercase/);
    expect(lint("javascript", `Console.log("x")`)[0].message).toMatch(/case-sensitive/);
    expect(lint("javascript", `console.print("x")`)[0].message).toMatch(/console\.log/);
  });

  it("explains syntax errors in plain words", () => {
    expect(lint("javascript", `const a = "oops;`)[0].message).toMatch(/string never closes/);
    expect(lint("javascript", `let a = 1;\nlet a = 2;`)[0].message).toMatch(/already declared/);
  });
});

describe("python diagnostics", () => {
  it("passes clean code", () => {
    expect(lint("python", `for i in range(1, 11):\n    if i <= 3:\n        print(i, "DENY")\n    else:\n        print(i)`)).toEqual([]);
    expect(lint("python", `levels = {\n    1: "DENY",\n}\nx = 1 if True else 2`)).toEqual([]);
  });

  it("flags a missing colon on a block opener", () => {
    const [d] = lint("python", `for i in range(1, 11)\n    print(i)`);
    expect(d).toMatchObject({ line: 1 });
    expect(d.message).toMatch(/colon/);
  });

  it("doesn't flag a condition that spans lines", () => {
    expect(lint("python", `if (1 <\n        2):\n    print("ok")`)).toEqual([]);
  });

  it("catches other languages' print calls", () => {
    expect(lint("python", `console.log("hi")`)[0].message).toMatch(/javascript/);
    expect(lint("python", `fmt.Println("hi")`)[0].message).toMatch(/go/);
  });
});

describe("tokenizers share one shape", () => {
  it("javascript", () => {
    const toks = getLanguageService("javascript").tokenize("const x = `a ${b}`; // hi");
    expect(toks.map((t) => t.type)).toEqual(["keyword", "identifier", "operator", "string", "punctuation", "comment"]);
  });

  it("python", () => {
    const toks = getLanguageService("python").tokenize('def f(*a):\n    return f"x{a}"  # c');
    expect(toks.map((t) => t.type)).toEqual([
      "keyword", "identifier", "punctuation", "operator", "identifier", "punctuation", "punctuation",
      "keyword", "string", "comment",
    ]);
    expect(toks[7].line).toBe(2);
  });

  it("knows when the cursor is inside a string", () => {
    const js = getLanguageService("javascript");
    expect(js.isInsideString(`console.log("con`, 16)).toBe(true);
    expect(js.isInsideString(`console.log("x"); con`, 21)).toBe(false);
    const py = getLanguageService("python");
    expect(py.isInsideString(`x = """multi\nli`, 15)).toBe(true);
    expect(py.isInsideString(`# "comment\npri`, 14)).toBe(false);
  });
});

describe("required-code check ignores import lines", () => {
  it("javascript", () => {
    const js = getLanguageService("javascript");
    expect(js.codeForRequiredCheck(`import { cell } from "./cellblock.js";\nconsole.log("CELL B-09");`)).not.toContain("cell");
  });
  it("python", () => {
    const py = getLanguageService("python");
    expect(py.codeForRequiredCheck(`from cellblock import (\n    CELL,\n)\nprint("x")`)).not.toContain("CELL");
    expect(py.codeForRequiredCheck(`import cellblock\nprint(cellblock.CELL)`)).toContain("cellblock.CELL");
  });
});

describe("completions", () => {
  it("javascript: console members, shipped module exports, user symbols", () => {
    const js = getLanguageService("javascript");
    const extra = js.extraPackagesFromModule({ module: "terminal", files: [{ path: "cellblock.js", content: `export const cell = "B-09";\nexport let sublevel = 3;` }] });
    expect(extra[0]).toMatchObject({ name: "cellblock", importPath: "./cellblock.js" });
    expect(extra[0].members.map((m) => m.label)).toEqual(["cell", "sublevel"]);
    expect(js.getCompletions("console").map((c) => c.label)).toContain("log");
    expect(js.isPackageImported("", "console")).toBe(true);
    expect(js.isPackageImported("", "cellblock", extra)).toBe(false);
    expect(js.isPackageImported(`import * as cellblock from "./cellblock.js";`, "cellblock", extra)).toBe(true);
    expect(js.getSymbolCompletions("function sumCodes(...codes) {}\nsu", 33, "su").map((c) => c.label)).toContain("sumCodes");
    expect(js.getSymbolCompletions("", 0, "sub", extra).map((c) => c.label)).toContain("sublevel");
  });

  it("python: module members once imported", () => {
    const py = getLanguageService("python");
    const extra = py.extraPackagesFromModule({ module: "terminal", files: [{ path: "cellblock.py", content: `CELL = "B-09"\nSUBLEVEL = 3\n` }] });
    expect(extra[0].members.map((m) => m.label)).toEqual(["CELL", "SUBLEVEL"]);
    expect(py.isPackageImported("import cellblock\n", "cellblock", extra)).toBe(true);
    expect(py.isPackageImported("", "cellblock", extra)).toBe(false);
    expect(py.getCompletions("cellblock", extra).map((c) => c.label)).toEqual(["CELL", "SUBLEVEL"]);
    expect(py.getSymbolCompletions("def sum_codes(*codes):\n    pass\nsu", 33, "su").map((c) => c.label)).toContain("sum_codes");
  });
});

describe("error explanations", () => {
  it("javascript speaks maya", () => {
    const js = getLanguageService("javascript");
    expect(js.explainError("main.js:2:3: TypeError: Assignment to constant variable.", false)).toBe(
      "line 2: you can't reassign a `const`. if the value needs to change, declare it with `let`.",
    );
    expect(js.explainError("harness:0:0: TypeError: sumCodes is not a function", true)).toMatch(/^no time for bugs\. your code crashed when i tested it/);
  });

  it("python speaks maya", () => {
    const py = getLanguageService("python");
    expect(py.explainError("main.py:3:0: NameError: name 'true' is not defined", false)).toBe("line 3: python capitalizes booleans — it's `True`.");
    expect(py.explainError("main.py:2:0: IndentationError: expected an indented block after 'for' statement on line 1", false)).toMatch(/indented/);
  });
});
