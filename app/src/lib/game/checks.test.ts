import { describe, expect, it } from "vitest";
import { buildReport, diffOutput, firstFailure, outputsMatch, passedCount, usesCheck, usesLabel } from "./checks";

describe("diffOutput", () => {
  it("returns null when the output matches (ignoring surrounding whitespace)", () => {
    expect(diffOutput("CELL B-09 - SUBLEVEL 3", "  CELL B-09 - SUBLEVEL 3\n")).toBeNull();
  });

  it("reads an interpunct separator as the plain dash", () => {
    expect(outputsMatch("CELL B-09 · SUBLEVEL 3", "CELL B-09 - SUBLEVEL 3")).toBe(true);
    expect(diffOutput("CELL B-09 - SUBLEVEL 3", "CELL B-09 · SUBLEVEL 3")).toBeNull();
  });

  it("pinpoints a missing separator and names the word it comes before", () => {
    const diff = diffOutput("CELL B-09 - SUBLEVEL 3", "CELL B-09 SUBLEVEL 3")!;
    expect(diff.line).toBe(1);
    expect(diff.expected).toEqual({ before: "CELL B-09 ", mid: "- ", after: "SUBLEVEL 3" });
    expect(diff.actual).toEqual({ before: "CELL B-09 ", mid: "", after: "SUBLEVEL 3" });
    expect(diff.note).toBe('missing "- " before "SUBLEVEL"');
  });

  it("names a wrong value", () => {
    const diff = diffOutput("CELL B-09 - SUBLEVEL 3", "CELL B-10 - SUBLEVEL 3")!;
    expect(diff.expected.mid).toBe("09");
    expect(diff.actual?.mid).toBe("10");
    expect(diff.note).toBe('"10" should be "09"');
  });

  it("calls out capitalisation", () => {
    expect(diffOutput("Hello World", "hello World")!.note).toBe('check the capitals: "h" should be "H"');
  });

  it("calls out a missing space", () => {
    expect(diffOutput("Hello World", "HelloWorld")!.note).toBe('missing a space before "World"');
  });

  it("finds the first mismatching line in multi-line output", () => {
    const diff = diffOutput("1\n2\n3", "1\n2\n4")!;
    expect(diff.line).toBe(3);
    expect(diff.totalLines).toBe(3);
    expect(diff.note).toBe('line 3: "4" should be "3"');
  });

  it("reports missing lines", () => {
    const diff = diffOutput("1\n2\n3", "1\n2")!;
    expect(diff.actual).toBeNull();
    expect(diff.note).toBe('the last line is missing: "3"');
  });

  it("reports empty output", () => {
    expect(diffOutput("Hello World", "")!.note).toBe("nothing was printed");
  });

  it("reports extra lines", () => {
    expect(diffOutput("1\n2", "1\n2\n3")!.note).toBe('one extra line: "3"');
  });
});

describe("usesCheck", () => {
  it("passes when every required pattern appears", () => {
    const check = usesCheck(["cellblock.Cell", "cellblock.Sublevel"], "fmt.Println(cellblock.Cell, cellblock.Sublevel)");
    expect(check.status).toBe("pass");
    expect(check.label).toBe("Uses `cellblock.Cell`, `cellblock.Sublevel`");
  });

  it("names what's missing", () => {
    const check = usesCheck(["cellblock.Cell", "cellblock.Sublevel"], 'fmt.Println(cellblock.Cell, "SUBLEVEL 3")');
    expect(check.status).toBe("fail");
    expect(check.detail).toBe("missing `cellblock.Sublevel`");
  });

  it("uses a generic label for long lists", () => {
    expect(usesLabel(["for", "DENY", "WARN"])).toBe("Uses the required code");
  });
});

describe("buildReport", () => {
  it("passes only when every check passes", () => {
    const ok = buildReport([{ id: "runs", label: "r", status: "pass" }, { id: "output", label: "o", status: "pass" }]);
    expect(ok.passed).toBe(true);
    expect(passedCount(ok)).toBe("2/2");

    const pending = buildReport([{ id: "runs", label: "r", status: "fail", detail: "x" }, { id: "output", label: "o", status: "pending" }]);
    expect(pending.passed).toBe(false);
    expect(firstFailure(pending)?.id).toBe("runs");
  });
});
