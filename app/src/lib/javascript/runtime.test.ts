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
  it("turns imports into same-line statements", async () => {
    const src = `import { a, b as c } from "./m.js";\nimport * as ns from "./m.js";\nconsole.log(a);`;
    const out = rewriteModule(src).body;
    expect(out.split("\n").length).toBe(src.split("\n").length);
    expect(out.split("\n")[2]).toBe("console.log(a);");
  });

  it("keeps multi-line imports on their lines", async () => {
    const src = `import {\n  a,\n  b,\n} from "./m.js";\nfoo();`;
    expect(rewriteModule(src).body.split("\n")[4]).toBe("foo();");
  });
});

describe("executeJs", () => {
  it("runs a program and captures stdout", async () => {
    expect((await executeJs({ main: `console.log("Hello World");` }))).toEqual({ stdout: "Hello World\n", stderr: "", error: "" });
  });

  it("resolves shipped modules with live exports", async () => {
    const out = (await executeJs({
      main: `import { cell, sublevel } from "./cellblock.js";\nimport def from "./d.js";\nconsole.log(cell, sublevel, def());`,
      files: [
        { path: "cellblock.js", content: `export const cell = "B-09";\nexport let sublevel = 3;` },
        { path: "d.js", content: `export default function d() { return "ok"; }` },
      ],
    }));
    expect(out.error).toBe("");
    expect(out.stdout).toBe("B-09 3 ok\n");
  });

  it("mutes the player's own output while a harness runs", async () => {
    const out = (await executeJs({
      main: `function f(x) { return x * 2; }\nconsole.log("noise");`,
      harness: `console.log("f:", f(21));`,
    }));
    expect(out.stdout).toBe("f: 42\n");
  });

  it("lets the harness reuse names the player declared", async () => {
    const out = (await executeJs({ main: `const s = 1;\nfunction g() { return [s, true]; }`, harness: `const [s, v] = g();\nconsole.log(s, v);` }));
    expect(out.error).toBe("");
    expect(out.stdout).toBe("1 true\n");
  });

  it("reports runtime errors on the player's line", async () => {
    expect(parseJsError((await executeJs({ main: `const a = 1;\n\nfoo();` })).error)).toMatchObject({ file: "main.js", line: 3, name: "ReferenceError" });
    expect(parseJsError((await executeJs({ main: `const a = 1;\na = 2;` })).error)).toMatchObject({ line: 2, name: "TypeError" });
  });

  it("reports syntax errors with a line", async () => {
    expect(parseJsError((await executeJs({ main: `const a = 1\nfunction f( {` })).error)).toMatchObject({ line: 2, name: "SyntaxError" });
  });

  it("blames the harness when the player's function crashes under test", async () => {
    const out = (await executeJs({ main: `function f() { return undefined; }`, harness: `console.log(f().x);` }));
    expect(parseJsError(out.error).file).toBe("harness");
  });

  it("is strict mode, so stray globals are errors", async () => {
    expect(parseJsError((await executeJs({ main: `total = 5;` })).error).name).toBe("ReferenceError");
  });

  it("caps runaway output", async () => {
    expect((await executeJs({ main: `for (let i = 0; i < 100000; i++) console.log(i);` })).error).toMatch(/too much output/);
  });

  it("reports a missing module", async () => {
    expect((await executeJs({ main: `import { x } from "./nope.js";` })).error).toMatch(/Cannot find module/);
  });

  describe("virtual clock", () => {
    it("runs timers and top-level await, measuring concurrency exactly", async () => {
      const main = `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));\nasync function cut(n, d) { await sleep(d); return \`\${n} \${d}\`; }`;
      const harness = `const t0 = performance.now();\nconsole.log(await Promise.all([cut("N", 300), cut("E", 450)]));\nconsole.log(performance.now() - t0, Date.now() - Date.now());`;
      const out = await executeJs({ main, harness });
      expect(out.error).toBe("");
      expect(out.stdout).toBe("[ 'N 300', 'E 450' ]\n450 0\n");
    });

    it("finishes scheduled work after main, in order", async () => {
      const out = await executeJs({ main: `setTimeout(() => console.log("late"), 50);\nsetTimeout(() => console.log("soon"), 0);\nconsole.log("now");` });
      expect(out.stdout).toBe("now\nsoon\nlate\n");
    });

    it("keeps the player's own scheduled work muted under a harness, even after a top-level await", async () => {
      const main = `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));\nsetTimeout(() => console.log("leftover"), 5);\nconsole.log(await sleep(1).then(() => "awaited"));\nfunction f() { return "f"; }`;
      const out = await executeJs({ main, harness: `await sleep(10);\nconsole.log(f());` });
      expect(out.error).toBe("");
      expect(out.stdout).toBe("f\n");
    });

    it("prints a promise as a promise (the missing-await mistake)", async () => {
      const out = await executeJs({ main: `async function f() { return 1; }\nconsole.log(f());` });
      expect(out.stdout).toBe("Promise { <pending> }\n");
    });

    it("reports a top-level await that can never settle", async () => {
      const out = await executeJs({ main: `await new Promise(() => {});` });
      expect(out.error).toMatch(/unsettled top-level await/);
    });

    it("stops an interval that never clears", async () => {
      const out = await executeJs({ main: `setInterval(() => {}, 1000);` });
      expect(out.error).toMatch(/over an hour/);
    });

    it("blames the player's line for an error thrown in a timer or a rejected await", async () => {
      expect(parseJsError((await executeJs({ main: `setTimeout(() => {\n  null.x;\n}, 10);` })).error)).toMatchObject({ line: 2, name: "TypeError" });
      const out = await executeJs({ main: `async function f() {\n  await null;\n  throw new Error("boom");\n}`, harness: `await f();` });
      expect(parseJsError(out.error)).toMatchObject({ line: 3, message: "boom" });
    });
  });
});
