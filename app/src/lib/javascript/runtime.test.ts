import { describe, expect, it } from "vitest";
import { executeJs, formatConsoleArgs, parseJsError, rewriteModule } from "./runtime";

describe("console formatting matches node", () => {
  it.each([
    [[1, "DENY"], "1 DENY"],
    [["Sum:", 115], "Sum: 115"],
    [[[1, 2, 3]], "[ 1, 2, 3 ]"],
    [[[]], "[]"],
    [[{ a: 1, b: "x" }], "{ a: 1, b: 'x' }"],
    [[true, null, undefined], "true null undefined"],
    [["%s is %d", "x", 4], "x is 4"],
    [["100%"], "100%"],
  ])("%j → %s", (args, out) => {
    expect(formatConsoleArgs(args as unknown[])).toBe(out);
  });
});

describe("module rewrite keeps line numbers", () => {
  it("turns imports into same-line statements", () => {
    const src = `import { a, b as c } from "./m.js";\nimport * as ns from "./m.js";\nconsole.log(a);`;
    const out = rewriteModule(src).body;
    expect(out.split("\n").length).toBe(src.split("\n").length);
    expect(out.split("\n")[2]).toBe("console.log(a);");
  });

  it("keeps multi-line imports on their lines", () => {
    const src = `import {\n  a,\n  b,\n} from "./m.js";\nfoo();`;
    expect(rewriteModule(src).body.split("\n")[4]).toBe("foo();");
  });
});

describe("executeJs", () => {
  it("runs a program and captures stdout", () => {
    expect(executeJs({ main: `console.log("Hello World");` })).toEqual({ stdout: "Hello World\n", stderr: "", error: "" });
  });

  it("resolves shipped modules with live exports", () => {
    const out = executeJs({
      main: `import { cell, sublevel } from "./cellblock.js";\nimport def from "./d.js";\nconsole.log(cell, sublevel, def());`,
      files: [
        { path: "cellblock.js", content: `export const cell = "B-09";\nexport let sublevel = 3;` },
        { path: "d.js", content: `export default function d() { return "ok"; }` },
      ],
    });
    expect(out.error).toBe("");
    expect(out.stdout).toBe("B-09 3 ok\n");
  });

  it("mutes the player's own output while a harness runs", () => {
    const out = executeJs({
      main: `function f(x) { return x * 2; }\nconsole.log("noise");`,
      harness: `console.log("f:", f(21));`,
    });
    expect(out.stdout).toBe("f: 42\n");
  });

  it("lets the harness reuse names the player declared", () => {
    const out = executeJs({ main: `const s = 1;\nfunction g() { return [s, true]; }`, harness: `const [s, v] = g();\nconsole.log(s, v);` });
    expect(out.error).toBe("");
    expect(out.stdout).toBe("1 true\n");
  });

  it("reports runtime errors on the player's line", () => {
    expect(parseJsError(executeJs({ main: `const a = 1;\n\nfoo();` }).error)).toMatchObject({ file: "main.js", line: 3, name: "ReferenceError" });
    expect(parseJsError(executeJs({ main: `const a = 1;\na = 2;` }).error)).toMatchObject({ line: 2, name: "TypeError" });
  });

  it("reports syntax errors with a line", () => {
    expect(parseJsError(executeJs({ main: `const a = 1\nfunction f( {` }).error)).toMatchObject({ line: 2, name: "SyntaxError" });
  });

  it("blames the harness when the player's function crashes under test", () => {
    const out = executeJs({ main: `function f() { return undefined; }`, harness: `console.log(f().x);` });
    expect(parseJsError(out.error).file).toBe("harness");
  });

  it("is strict mode, so stray globals are errors", () => {
    expect(parseJsError(executeJs({ main: `total = 5;` }).error).name).toBe("ReferenceError");
  });

  it("caps runaway output", () => {
    expect(executeJs({ main: `for (let i = 0; i < 100000; i++) console.log(i);` }).error).toMatch(/too much output/);
  });

  it("reports a missing module", () => {
    expect(executeJs({ main: `import { x } from "./nope.js";` }).error).toMatch(/Cannot find module/);
  });
});
