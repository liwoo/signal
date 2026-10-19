import { beforeAll, describe, expect, it } from "vitest";
import { runPython } from "./run";
import { usePyodideInNode } from "./node-backend";
import { parsePyError } from "@/lib/lang/python";

beforeAll(() => {
  usePyodideInNode();
});

describe("python via pyodide", () => {
  it("runs a program and captures stdout", async () => {
    expect(await runPython({ main: `print("Hello World")` })).toEqual({ stdout: "Hello World\n", stderr: "", error: "" });
  }, 30000);

  it("imports a shipped module, and picks up a changed one on the next run", async () => {
    const files = (cell: string) => [{ path: "cellblock.py", content: `CELL = "${cell}"\n` }];
    const main = `import cellblock\nprint(cellblock.CELL)`;
    expect((await runPython({ main, files: files("B-09") })).stdout).toBe("B-09\n");
    expect((await runPython({ main, files: files("B-10") })).stdout).toBe("B-10\n");
  }, 30000);

  it("starts every run with fresh globals", async () => {
    await runPython({ main: `leftover = 1` });
    const out = await runPython({ main: `print(leftover)` });
    expect(parsePyError(out.error)).toMatchObject({ line: 1, name: "NameError" });
  }, 30000);

  it("mutes the player's own output while a harness runs", async () => {
    const out = await runPython({ main: `def f(x):\n    return x * 2\n\nprint("noise")`, harness: `print("f:", f(21))` });
    expect(out.stdout).toBe("f: 42\n");
  }, 30000);

  it("reports syntax and indentation errors with lines", async () => {
    expect(parsePyError((await runPython({ main: `x = 1\nif x > 0\n    print(x)` })).error)).toMatchObject({ line: 2, name: "SyntaxError" });
    expect(parsePyError((await runPython({ main: `for i in range(3):\nprint(i)` })).error)).toMatchObject({ line: 2, name: "IndentationError" });
  }, 30000);

  it("reports runtime errors on the player's line, or blames the harness", async () => {
    expect(parsePyError((await runPython({ main: `a = 1\nb = "x" + a` })).error)).toMatchObject({ line: 2, name: "TypeError" });
    const harnessed = await runPython({ main: `def f():\n    return None`, harness: `print(f() + 1)` });
    expect(parsePyError(harnessed.error).file).toBe("harness");
  }, 30000);

  it("has no keyboard input", async () => {
    expect(parsePyError((await runPython({ main: `x = input()` })).error).name).toBe("EOFError");
  }, 30000);

  it("caps runaway output", async () => {
    expect((await runPython({ main: `for i in range(10**6):\n    print(i)` })).error).toMatch(/too much output/);
  }, 30000);
});
