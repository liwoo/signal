import { describe, expect, test } from "vitest";
import { indentUnit, smartEnter } from "./smart-enter";

/** Run smartEnter at the `|` marker and return the result with `|` at the caret. */
function enter(withCaret: string): string {
  const pos = withCaret.indexOf("|");
  const code = withCaret.slice(0, pos) + withCaret.slice(pos + 1);
  const r = smartEnter(code, pos);
  return r.code.slice(0, r.cursor) + "|" + r.code.slice(r.cursor);
}

describe("smartEnter", () => {
  test("splits {} so the closer lands on its own line", () => {
    expect(enter("func main() {|}")).toBe("func main() {\n    |\n}");
  });

  test("splits () and [] too", () => {
    expect(enter("fmt.Println(|)")).toBe("fmt.Println(\n    |\n)");
    expect(enter("x := []int{1, [|]}")).toBe("x := []int{1, [\n    |\n]}");
  });

  test("keeps the outer indent for the closer", () => {
    expect(enter("func main() {\n    if ok {|}\n}")).toBe(
      "func main() {\n    if ok {\n        |\n    }\n}",
    );
  });

  test("follows tab indentation once the file is gofmt'd", () => {
    expect(enter("func main() {\n\tif ok {|}\n}")).toBe("func main() {\n\tif ok {\n\t\t|\n\t}\n}");
  });

  test("indents after an opener even with nothing to close on the line", () => {
    expect(enter("func main() {|\n}")).toBe("func main() {\n    |\n}");
  });

  test("ignores stray spaces around the caret inside a pair", () => {
    expect(enter("func main() { | }")).toBe("func main() {\n    |\n}");
  });

  test("plain Enter keeps the current indentation", () => {
    expect(enter("func main() {\n    x := 1|\n}")).toBe("func main() {\n    x := 1\n    |\n}");
  });

  test("plain Enter at column 0 inserts a bare newline", () => {
    expect(enter("package main|")).toBe("package main\n|");
  });

  test("does not expand a mismatched pair", () => {
    expect(enter("f(|}")).toBe("f(\n    |}");
  });

  test("replaces a selection", () => {
    const code = "    abcdef";
    const r = smartEnter(code, 6, 8);
    expect(r.code).toBe("    ab\n    ef");
    expect(r.cursor).toBe(11);
  });
});

describe("indentUnit", () => {
  test("defaults to 4 spaces", () => {
    expect(indentUnit("package main")).toBe("    ");
  });
  test("detects tabs", () => {
    expect(indentUnit("func main() {\n\tx := 1\n}")).toBe("\t");
  });
  test("ignores whitespace-only lines", () => {
    expect(indentUnit("func main() {\n\t\n    x := 1\n}")).toBe("    ");
  });
});
