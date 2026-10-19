import { describe, it, expect } from "vitest";
import { tokenize } from "./tokenizer";
import type { Token } from "@/lib/lang/types";

/** Tokens whose values, in order, reconstruct the source exactly (gaps = whitespace). */
function covers(source: string, toks: Token[]): boolean {
  let out = "";
  let cursor = 0;
  for (const t of toks) {
    if (t.start > cursor) out += source.slice(cursor, t.start);
    out += t.value;
    cursor = Math.max(cursor, t.end);
  }
  out += source.slice(cursor);
  return out === source;
}

const types = (src: string) => tokenize(src).map((t) => t.type);

describe("python f-string interpolation", () => {
  it("splits a simple {name} into code tokens", () => {
    const src = 'f"hello {name}"';
    expect(types(src)).toEqual(["string", "punctuation", "identifier", "punctuation", "string"]);
    expect(covers(src, tokenize(src))).toBe(true);
  });

  it("highlights keywords and operators inside the braces", () => {
    const src = 'f"{a + b if c else d}"';
    const t = types(src);
    expect(t).toContain("operator"); // +
    expect(t).toContain("keyword"); // if / else
    expect(covers(src, tokenize(src))).toBe(true);
  });

  it("keeps a format spec as part of the string", () => {
    const src = 'f"{total:.2f}"';
    const toks = tokenize(src);
    expect(toks.map((t) => t.type)).toEqual(["string", "punctuation", "identifier", "string", "punctuation", "string"]);
    // the ":.2f" spec and the trailing quote are string, not code
    const spec = toks.find((t) => t.value.includes(".2f"));
    expect(spec?.type).toBe("string");
    expect(covers(src, tokenize(src))).toBe(true);
  });

  it("treats {{ and }} as literal braces, not interpolation", () => {
    const src = 'f"{{literal}} {x}"';
    const toks = tokenize(src);
    // exactly one interpolation → one real identifier
    expect(toks.filter((t) => t.type === "identifier").map((t) => t.value)).toEqual(["x"]);
    expect(covers(src, tokenize(src))).toBe(true);
  });

  it("respects quotes and brackets inside the expression", () => {
    const src = `f"{d['a:b']}"`;
    const toks = tokenize(src);
    // the ':' lives inside a nested string, so it is not a format spec
    expect(toks.some((t) => t.type === "identifier" && t.value === "d")).toBe(true);
    expect(covers(src, tokenize(src))).toBe(true);
  });

  it("leaves non-f strings untouched", () => {
    expect(types('"plain {x}"')).toEqual(["string"]);
    expect(types('r"raw {x}"')).toEqual(["string"]);
  });

  it("reports correct line numbers for multi-line context", () => {
    const toks = tokenize('x = 1\nprint(f"v={x}")');
    const interp = toks.find((t) => t.type === "identifier" && t.value === "x" && t.line === 2);
    expect(interp).toBeDefined();
  });
});
