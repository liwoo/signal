import { describe, test, expect } from "vitest";
import { checkWarmup } from "./warmup";

const ok = (r: ReturnType<typeof checkWarmup>) => r.ok;
const err = (r: ReturnType<typeof checkWarmup>) => (r.ok ? "" : r.error);

describe("warm-up grading · go", () => {
  // Playtest 2 Nov 2026: `fmt.println` showed no error and the drill moved on.
  test("lowercase fmt.println is rejected with a case-sensitivity reason", () => {
    const r = checkWarmup("go", 1, `fmt.println("i'm in")`);
    expect(ok(r)).toBe(false);
    expect(err(r)).toContain("case-sensitive");
    expect(err(r)).toContain("fmt.Println");
  });

  test("lowercase println is caught in every go drill, including the skeleton", () => {
    expect(ok(checkWarmup("go", 2, `cell := "B-09"\nfmt.println(cell)`))).toBe(false);
    expect(ok(checkWarmup("go", 3, `fmt.printf("CELL %s\\n", cell)`))).toBe(false);
    const skeleton = `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.println("i'm in")\n}`;
    expect(err(checkWarmup("go", 4, skeleton))).toContain("capital P");
  });

  test("the exact targets pass", () => {
    expect(ok(checkWarmup("go", 1, `fmt.Println("i'm in")`))).toBe(true);
    expect(ok(checkWarmup("go", 2, `cell := "B-09"\nfmt.Println(cell)`))).toBe(true);
    expect(ok(checkWarmup("go", 3, `fmt.Printf("CELL %s\\n", cell)`))).toBe(true);
    expect(ok(checkWarmup("go", 4, `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("i'm in")\n}`))).toBe(true);
  });

  test("insignificant spacing is fine; text inside quotes is not", () => {
    expect(ok(checkWarmup("go", 1, `  fmt.Println( "i'm in" )  `))).toBe(true);
    expect(ok(checkWarmup("go", 1, `fmt.Println("im in")`))).toBe(false);
  });

  test("near-misses are rejected with a specific reason", () => {
    expect(err(checkWarmup("go", 1, `Fmt.Println("i'm in")`))).toContain("lowercase");
    expect(err(checkWarmup("go", 2, `cell = "B-09"\nfmt.Println(cell)`))).toContain(":=");
    expect(err(checkWarmup("go", 3, `fmt.Printf("CELL %s/n", cell)`))).toContain("backslash");
    expect(err(checkWarmup("go", 4, `package main\n\nimport "fmt"\n\nfunc main()\n{\n    fmt.Println("i'm in")\n}`))).toContain("same line");
  });

  test("only the drill's line passes — extra statements don't sneak through", () => {
    expect(ok(checkWarmup("go", 1, `fmt.Println("i'm in")\nfmt.println("x")`))).toBe(false);
  });

  test("empty input never advances", () => {
    expect(ok(checkWarmup("go", 1, "   "))).toBe(false);
  });
});

describe("warm-up grading · javascript & python", () => {
  test("case slips are rejected with a reason", () => {
    expect(err(checkWarmup("javascript", 1, `console.Log("i'm in");`))).toContain("case-sensitive");
    expect(err(checkWarmup("python", 1, `Print("i'm in")`))).toContain("case-sensitive");
  });

  test("the exact targets pass", () => {
    expect(ok(checkWarmup("javascript", 1, `console.log("i'm in");`))).toBe(true);
    expect(ok(checkWarmup("javascript", 2, `const cell = "B-09";\nconsole.log(cell);`))).toBe(true);
    expect(ok(checkWarmup("javascript", 3, "console.log(`CELL ${cell}`);"))).toBe(true);
    expect(ok(checkWarmup("javascript", 4, `import { cell } from "./cellblock.js";\nconsole.log(cell);`))).toBe(true);
    expect(ok(checkWarmup("python", 1, `print("i'm in")`))).toBe(true);
    expect(ok(checkWarmup("python", 2, `cell = "B-09"\nprint(cell)`))).toBe(true);
    expect(ok(checkWarmup("python", 3, `print(f"CELL {cell}")`))).toBe(true);
    expect(ok(checkWarmup("python", 4, `import cellblock\nprint(cellblock.CELL)`))).toBe(true);
  });
});

describe("warm-up grading · rust", () => {
  test("the exact targets pass", () => {
    expect(ok(checkWarmup("rust", 1, `println!("i'm in");`))).toBe(true);
    expect(ok(checkWarmup("rust", 2, `let cell = "B-09";\nprintln!("{}", cell);`))).toBe(true);
    expect(ok(checkWarmup("rust", 2, `let cell = "B-09";\nprintln!("{cell}");`))).toBe(true);
    expect(ok(checkWarmup("rust", 3, `println!("CELL {}", cell);`))).toBe(true);
    expect(ok(checkWarmup("rust", 4, `fn main() {\n    println!("i'm in");\n}`))).toBe(true);
  });

  test("the classic slips are rejected with a reason", () => {
    expect(err(checkWarmup("rust", 1, `println("i'm in");`))).toContain("bang");
    expect(err(checkWarmup("rust", 1, `println!("i'm in")`))).toContain("semicolon");
    expect(err(checkWarmup("rust", 1, `Println!("i'm in");`))).toContain("case-sensitive");
    expect(err(checkWarmup("rust", 2, `cell = "B-09";\nprintln!("{}", cell);`))).toContain("let");
    expect(err(checkWarmup("rust", 2, `let cell = "B-09";\nprintln!(cell);`))).toContain("format string");
    expect(err(checkWarmup("rust", 4, `func main() {\n    println!("i'm in");\n}`))).toContain("fn main");
  });
});
