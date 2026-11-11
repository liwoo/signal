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

  describe("asyncio on a virtual clock", () => {
    it("runs top-level await in the harness and measures concurrency exactly", async () => {
      const main = `import asyncio\n\nasync def cut(name, d):\n    await asyncio.sleep(d / 1000)\n    return f"{name} {d}"`;
      const harness = `loop = asyncio.get_running_loop()\nt0 = loop.time()\nprint(await asyncio.gather(cut("N", 300), cut("E", 450)))\nprint(round((loop.time() - t0) * 1000))`;
      expect((await runPython({ main, harness })).stdout).toBe("['N 300', 'E 450']\n450\n");
    }, 30000);

    it("never runs a task nobody waited for, like a goroutine when main returns", async () => {
      const main = `import asyncio\n\nasync def cut(name):\n    print(name)\n\ndef cut_async(name):\n    return asyncio.create_task(cut(name))`;
      expect((await runPython({ main, harness: `cut_async("South")\nprint("done")` })).stdout).toBe("done\n");
      expect((await runPython({ main, harness: `cut_async("South")\nawait asyncio.sleep(0.1)\nprint("done")` })).stdout).toBe("South\ndone\n");
    }, 30000);

    it("keeps tasks the player's own code started muted under a harness", async () => {
      const main = `import asyncio\n\nasync def noisy():\n    await asyncio.sleep(0.01)\n    print("leftover")\n\nasyncio.create_task(noisy())\nprint(await asyncio.sleep(0, "awaited"))`;
      const out = await runPython({ main, harness: `await asyncio.sleep(0.1)\nprint("f")` });
      expect(out.error).toBe("");
      expect(out.stdout).toBe("f\n");
    }, 30000);

    it("lets a blocking time.sleep block everything, as it really would", async () => {
      const main = `import asyncio, time\n\nasync def nap(d):\n    time.sleep(d)\n\nloop = asyncio.get_running_loop()\nt0 = loop.time()\nawait asyncio.gather(nap(0.3), nap(0.45))\nprint(round((loop.time() - t0) * 1000))`;
      expect((await runPython({ main })).stdout).toBe("750\n");
    }, 30000);

    it("reports a deadlock instead of hanging", async () => {
      const out = await runPython({ main: `import asyncio\nawait asyncio.get_running_loop().create_future()` });
      expect(out.error).toMatch(/deadlock/);
    }, 30000);

    it("blames the player's line for an error inside a coroutine", async () => {
      const out = await runPython({ main: `import asyncio\n\nasync def f():\n    await asyncio.sleep(0.1)\n    return 1 + "x"`, harness: `await f()` });
      expect(parsePyError(out.error)).toMatchObject({ file: "main.py", line: 5, name: "TypeError" });
    }, 30000);
  });
});
