import { describe, it, expect } from "vitest";
import { formatCompileError } from "./harness";

describe("formatCompileError — unexported names", () => {
  it("explains `undefined: fmt.println` as a capital-letter problem", () => {
    const msg = formatCompileError("./prog.go:6:6: undefined: fmt.println", false);
    expect(msg).toContain("undefined: fmt.println");
    expect(msg).toContain("case-sensitive");
    expect(msg).toContain("`fmt.Println`");
  });

  it("explains `name x not exported by package y`", () => {
    const msg = formatCompileError("./prog.go:9:14: name cell not exported by package cellblock", false);
    expect(msg).toContain("`cellblock.Cell`");
  });

  it("leaves unrelated errors as they were", () => {
    expect(formatCompileError("./prog.go:3:1: syntax error: unexpected }", false)).toBe("3:1: syntax error: unexpected }");
  });
});
