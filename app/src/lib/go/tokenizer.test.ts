import { describe, it, expect } from "vitest";
import {
  tokenize,
  isGoKeyword,
  isGoBuiltin,
  isGoType,
  GO_KEYWORDS,
  GO_BUILTINS,
  GO_TYPES,
} from "./tokenizer";

// ═══════════════════════════════════════════════
//  CLASSIFICATION HELPERS
// ═══════════════════════════════════════════════

describe("isGoKeyword", () => {
  it("recognizes all Go keywords", () => {
    const keywords = [
      "break", "case", "chan", "const", "continue", "default", "defer",
      "else", "fallthrough", "for", "func", "go", "goto", "if", "import",
      "interface", "map", "package", "range", "return", "select", "struct",
      "switch", "type", "var",
    ];
    for (const kw of keywords) {
      expect(isGoKeyword(kw)).toBe(true);
    }
  });

  it("rejects non-keywords", () => {
    expect(isGoKeyword("fmt")).toBe(false);
    expect(isGoKeyword("main")).toBe(false);
    expect(isGoKeyword("println")).toBe(false);
    expect(isGoKeyword("Func")).toBe(false); // case-sensitive
  });
});

describe("isGoBuiltin", () => {
  it("recognizes all Go builtins", () => {
    const builtins = [
      "make", "append", "len", "cap", "close", "delete", "copy", "new",
      "panic", "recover", "print", "println",
    ];
    for (const b of builtins) {
      expect(isGoBuiltin(b)).toBe(true);
    }
  });

  it("rejects non-builtins", () => {
    expect(isGoBuiltin("fmt")).toBe(false);
    expect(isGoBuiltin("Println")).toBe(false); // capital P
  });
});

describe("isGoType", () => {
  it("recognizes all Go types", () => {
    const types = [
      "int", "int8", "int16", "int32", "int64",
      "uint", "uint8", "uint16", "uint32", "uint64",
      "float32", "float64", "string", "bool", "byte", "rune", "error",
      "any", "comparable",
    ];
    for (const t of types) {
      expect(isGoType(t)).toBe(true);
    }
  });

  it("rejects non-types", () => {
    expect(isGoType("Int")).toBe(false);
    expect(isGoType("integer")).toBe(false);
  });
});

// ═══════════════════════════════════════════════
//  TOKENIZER
// ═══════════════════════════════════════════════

describe("tokenize — keywords", () => {
  it("tokenizes 'func' as keyword", () => {
    const tokens = tokenize("func");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe("keyword");
    expect(tokens[0].value).toBe("func");
  });

  it("tokenizes all Go keywords", () => {
    for (const kw of GO_KEYWORDS) {
      const tokens = tokenize(kw);
      expect(tokens[0].type).toBe("keyword");
    }
  });

  it("does not tokenize 'funcMain' as keyword (longer identifier)", () => {
    const tokens = tokenize("funcMain");
    expect(tokens[0].type).toBe("identifier");
  });
});

describe("tokenize — builtins", () => {
  it("tokenizes 'println' as builtin", () => {
    const tokens = tokenize("println");
    expect(tokens[0].type).toBe("builtin");
  });

  it("tokenizes 'append' as builtin", () => {
    const tokens = tokenize("append");
    expect(tokens[0].type).toBe("builtin");
  });
});

describe("tokenize — types", () => {
  it("tokenizes 'int' as type", () => {
    const tokens = tokenize("int");
    expect(tokens[0].type).toBe("type");
  });

  it("tokenizes 'string' as type", () => {
    const tokens = tokenize("string");
    expect(tokens[0].type).toBe("type");
  });

  it("tokenizes 'float64' as type", () => {
    const tokens = tokenize("float64");
    expect(tokens[0].type).toBe("type");
  });
});

describe("tokenize — identifiers", () => {
  it("tokenizes user identifiers", () => {
    const tokens = tokenize("myVar");
    expect(tokens[0].type).toBe("identifier");
    expect(tokens[0].value).toBe("myVar");
  });

  it("tokenizes underscore-prefixed identifiers", () => {
    const tokens = tokenize("_private");
    expect(tokens[0].type).toBe("identifier");
  });

  it("tokenizes 'fmt' as identifier (not a keyword)", () => {
    const tokens = tokenize("fmt");
    expect(tokens[0].type).toBe("identifier");
  });

  it("tokenizes 'main' as identifier", () => {
    const tokens = tokenize("main");
    expect(tokens[0].type).toBe("identifier");
  });
});

describe("tokenize — strings", () => {
  it("tokenizes double-quoted strings", () => {
    const tokens = tokenize('"hello world"');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe("string");
    expect(tokens[0].value).toBe('"hello world"');
  });

  it("tokenizes strings with escape sequences", () => {
    const tokens = tokenize('"line1\\nline2"');
    expect(tokens[0].type).toBe("string");
    expect(tokens[0].value).toBe('"line1\\nline2"');
  });

  it("tokenizes strings with escaped quotes", () => {
    const tokens = tokenize('"say \\"hi\\""');
    expect(tokens[0].type).toBe("string");
  });

  it("tokenizes raw strings (backtick)", () => {
    const tokens = tokenize("`raw string`");
    expect(tokens[0].type).toBe("string");
    expect(tokens[0].value).toBe("`raw string`");
  });

  it("tokenizes char literals", () => {
    const tokens = tokenize("'a'");
    expect(tokens[0].type).toBe("string");
  });

  it("tokenizes empty string", () => {
    const tokens = tokenize('""');
    expect(tokens[0].type).toBe("string");
  });
});

describe("tokenize — numbers", () => {
  it("tokenizes integers", () => {
    const tokens = tokenize("42");
    expect(tokens[0].type).toBe("number");
    expect(tokens[0].value).toBe("42");
  });

  it("tokenizes floats", () => {
    const tokens = tokenize("3.14");
    expect(tokens[0].type).toBe("number");
  });

  it("tokenizes hex numbers", () => {
    const tokens = tokenize("0xFF");
    expect(tokens[0].type).toBe("number");
  });

  it("tokenizes binary numbers", () => {
    const tokens = tokenize("0b1010");
    expect(tokens[0].type).toBe("number");
  });

  it("tokenizes octal numbers", () => {
    const tokens = tokenize("0o777");
    expect(tokens[0].type).toBe("number");
  });

  it("tokenizes scientific notation", () => {
    const tokens = tokenize("1e10");
    expect(tokens[0].type).toBe("number");
  });
});

describe("tokenize — comments", () => {
  it("tokenizes line comments", () => {
    const tokens = tokenize("// this is a comment");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe("comment");
  });

  it("tokenizes block comments", () => {
    const tokens = tokenize("/* block */");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe("comment");
  });

  it("tokenizes multi-line block comments", () => {
    const tokens = tokenize("/* line1\nline2 */");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe("comment");
  });

  it("does not include comment content in other tokens", () => {
    const tokens = tokenize("x := 1 // comment with func keyword");
    const commentTokens = tokens.filter((t) => t.type === "comment");
    expect(commentTokens).toHaveLength(1);
    // "func" inside comment should NOT be a keyword token
    const funcTokens = tokens.filter((t) => t.value === "func");
    expect(funcTokens).toHaveLength(0);
  });
});

describe("tokenize — operators", () => {
  it("tokenizes :=", () => {
    const tokens = tokenize(":=");
    expect(tokens[0].type).toBe("operator");
    expect(tokens[0].value).toBe(":=");
  });

  it("tokenizes ==", () => {
    const tokens = tokenize("==");
    expect(tokens[0].type).toBe("operator");
  });

  it("tokenizes !=", () => {
    const tokens = tokenize("!=");
    expect(tokens[0].type).toBe("operator");
  });

  it("tokenizes &&", () => {
    const tokens = tokenize("&&");
    expect(tokens[0].type).toBe("operator");
  });

  it("tokenizes ||", () => {
    const tokens = tokenize("||");
    expect(tokens[0].type).toBe("operator");
  });

  it("tokenizes <-", () => {
    const tokens = tokenize("<-");
    expect(tokens[0].type).toBe("operator");
  });

  it("tokenizes ...", () => {
    const tokens = tokenize("...");
    expect(tokens[0].type).toBe("operator");
  });

  it("tokenizes single char operators", () => {
    for (const op of ["+", "-", "*", "/", "%", "<", ">", "=", "!"]) {
      const tokens = tokenize(op);
      expect(tokens[0].type).toBe("operator");
    }
  });
});

describe("tokenize — punctuation", () => {
  it("tokenizes brackets and delimiters", () => {
    for (const p of ["(", ")", "{", "}", "[", "]", ";", ",", "."]) {
      const tokens = tokenize(p);
      expect(tokens[0].type).toBe("punctuation");
    }
  });
});

describe("tokenize — line/col tracking", () => {
  it("tracks position on single line", () => {
    const tokens = tokenize("func main");
    expect(tokens[0].line).toBe(1);
    expect(tokens[0].col).toBe(1);
    expect(tokens[1].line).toBe(1);
    expect(tokens[1].col).toBe(6);
  });

  it("tracks position across lines", () => {
    const tokens = tokenize("func\nmain");
    expect(tokens[0].line).toBe(1);
    expect(tokens[1].line).toBe(2);
    expect(tokens[1].col).toBe(1);
  });

  it("tracks start/end offsets", () => {
    const tokens = tokenize("abc def");
    expect(tokens[0].start).toBe(0);
    expect(tokens[0].end).toBe(3);
    expect(tokens[1].start).toBe(4);
    expect(tokens[1].end).toBe(7);
  });
});

describe("tokenize — full programs", () => {
  it("tokenizes hello world", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("Hello")
}`;
    const tokens = tokenize(code);
    const types = tokens.map((t) => t.type);

    expect(types).toContain("keyword"); // package, import, func
    expect(types).toContain("identifier"); // main, fmt
    expect(types).toContain("string"); // "fmt", "Hello"
    expect(types).toContain("punctuation"); // (, ), {, }
  });

  it("tokenizes code with all token types", () => {
    const code = `package main // comment
import "fmt"
func main() {
    x := 42
    fmt.Println(x)
}`;
    const tokens = tokenize(code);
    const typeSet = new Set(tokens.map((t) => t.type));
    expect(typeSet.has("keyword")).toBe(true);
    expect(typeSet.has("identifier")).toBe(true);
    expect(typeSet.has("string")).toBe(true);
    expect(typeSet.has("number")).toBe(true);
    expect(typeSet.has("comment")).toBe(true);
    expect(typeSet.has("operator")).toBe(true);
    expect(typeSet.has("punctuation")).toBe(true);
  });

  it("handles empty input", () => {
    const tokens = tokenize("");
    expect(tokens).toHaveLength(0);
  });

  it("handles whitespace-only input", () => {
    const tokens = tokenize("   \n\n   ");
    expect(tokens).toHaveLength(0);
  });
});
