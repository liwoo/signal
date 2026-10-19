import { describe, expect, it } from "vitest";
import { JAVASCRIPT_ZEN_RULES } from "./zen-javascript";
import { analyzeZen, type ZenRule } from "./zen";
import { SOLUTIONS } from "@/lib/lang/act1.fixtures";

const ALL = Object.values(JAVASCRIPT_ZEN_RULES).flat();

function rule(id: string): ZenRule {
  const r = ALL.find((x) => x.id === id);
  if (!r) throw new Error(`no rule ${id}`);
  return r;
}

/** Relevant and followed. */
function follows(id: string, code: string) {
  const r = rule(id);
  expect(r.isRelevant ? r.isRelevant(code) : true, `${id} relevant`).toBe(true);
  expect(r.check(code), `${id} followed`).toBe(true);
}

/** Relevant but not followed. */
function breaks(id: string, code: string) {
  const r = rule(id);
  expect(r.isRelevant ? r.isRelevant(code) : true, `${id} relevant`).toBe(true);
  expect(r.check(code), `${id} not followed`).toBe(false);
}

function irrelevant(id: string, code: string) {
  const r = rule(id);
  expect(r.isRelevant, `${id} has isRelevant`).toBeDefined();
  expect(r.isRelevant!(code), `${id} irrelevant`).toBe(false);
}

const SUM = `function sumCodes(...codes) {
  let total = 0;
  for (const c of codes) {
    total += c;
  }
  return total;
}`;

describe("javascript zen · reference solutions", () => {
  it("every relevant rule is followed by the reference solution", () => {
    for (const [stepId, rules] of Object.entries(JAVASCRIPT_ZEN_RULES)) {
      const code = SOLUTIONS.javascript[stepId];
      for (const r of rules) {
        if (r.isRelevant && !r.isRelevant(code)) continue;
        expect(r.check(code), `${stepId} · ${r.id}`).toBe(true);
      }
    }
  });

  it("awards XP and no suggestions on the reference solutions", () => {
    for (const stepId of Object.keys(JAVASCRIPT_ZEN_RULES)) {
      const result = analyzeZen(stepId, SOLUTIONS.javascript[stepId], undefined, "javascript");
      expect(result.suggestions, stepId).toEqual([]);
    }
  });
});

describe("chapter-01:scaffold", () => {
  it("js_semicolons", () => {
    follows("js_semicolons", `console.log("Hello World");`);
    follows("js_semicolons", `console.log("Hello World")`);
    follows("js_semicolons", `// greet\nconsole.log("a;b")\nconsole.log("c")`);
    follows("js_semicolons", `for (let i = 1; i <= 3; i++) {\n  console.log(i);\n}\nconsole.log("done");`);
    breaks("js_semicolons", `console.log("Hello");\nconsole.log("World")`);
    irrelevant("js_semicolons", `// nothing yet\n`);
  });
});

describe("chapter-02:scaffold", () => {
  it("js_top_level", () => {
    follows("js_top_level", `console.log("Hello World");`);
    follows("js_top_level", `// function main() {}\nconsole.log("function main() {")`);
    breaks("js_top_level", `function main() {\n  console.log("Hello World");\n}\nmain();`);
    breaks("js_top_level", `const main = () => {\n  console.log("Hello World");\n};\nmain();`);
  });
});

describe("chapter-03:scaffold", () => {
  it("js_consistent_quotes", () => {
    follows("js_consistent_quotes", `console.log("Hello World");`);
    follows("js_consistent_quotes", `console.log('Hello World');`);
    // a string holding the other quote doesn't count against the style
    follows("js_consistent_quotes", `console.log("Hello");\nconsole.log("it's");\nconsole.log('say "hi"');`);
    breaks("js_consistent_quotes", `console.log("Hello");\nconsole.log('World');`);
    irrelevant("js_consistent_quotes", "console.log(`Hello World`);");
  });
});

describe("chapter-01:location", () => {
  const IMPORT = `import { cell, sublevel } from "./cellblock.js";\n\n`;

  it("js_template_literal", () => {
    follows("js_template_literal", IMPORT + "console.log(`CELL ${cell} · SUBLEVEL ${sublevel}`);");
    breaks("js_template_literal", IMPORT + `console.log("CELL " + cell + " · SUBLEVEL " + sublevel);`);
    breaks("js_template_literal", IMPORT + "console.log(`CELL ${cell}` + \" · SUBLEVEL \" + sublevel);");
    irrelevant("js_template_literal", IMPORT + `console.log("CELL", cell, "· SUBLEVEL", sublevel);`);
    irrelevant("js_template_literal", IMPORT + `// "a" + b\nconsole.log(cell, sublevel);`);
  });

  it("js_named_imports", () => {
    follows("js_named_imports", IMPORT + "console.log(cell, sublevel);");
    breaks("js_named_imports", `import * as cellblock from "./cellblock.js";\nconsole.log(cellblock.cell);`);
    irrelevant("js_named_imports", `console.log("CELL B-09 · SUBLEVEL 3");`);
    irrelevant("js_named_imports", `// import { cell } from "./cellblock.js";\nconsole.log("import");`);
  });

  it("js_const_default", () => {
    follows("js_const_default", IMPORT + "const where = `CELL ${cell}`;\nconsole.log(where);");
    follows("js_const_default", IMPORT + "let level = sublevel;\nlevel += 0;\nconsole.log(cell, level);");
    breaks("js_const_default", IMPORT + "let where = `CELL ${cell}`;\nconsole.log(where);");
    breaks("js_const_default", IMPORT + "var where = cell;\nconsole.log(where);");
    expect(rule("js_const_default").getSuggestion!(IMPORT + "var where = cell;")).toMatch(/var/);
    irrelevant("js_const_default", IMPORT + "console.log(cell, sublevel);");
    irrelevant("js_const_default", `for (let i = 1; i <= 3; i++) {\n  console.log(i);\n}`);
  });
});

describe("chapter-02:loop", () => {
  it("js_let_counter", () => {
    follows("js_let_counter", `for (let i = 1; i <= 10; i++) {\n  console.log(i);\n}`);
    breaks("js_let_counter", `for (var i = 1; i <= 10; i++) {\n  console.log(i);\n}`);
    breaks("js_let_counter", `let i;\nfor (i = 1; i <= 10; i++) {\n  console.log(i);\n}`);
    expect(rule("js_let_counter").getSuggestion!(`for (var i = 1; i <= 10; i++) {}`)).toMatch(/var/);
    irrelevant("js_let_counter", `for (const c of [1, 2, 3]) {\n  console.log(c);\n}`);
    irrelevant("js_let_counter", `let i = 1;\nwhile (i <= 10) {\n  console.log(i);\n  i++;\n}`);
  });

  it("js_block_braces", () => {
    follows("js_block_braces", `for (let i = 1; i <= 10; i++) {\n  console.log(i);\n}`);
    follows("js_block_braces", `if (x) {\n  a();\n} else if (y) {\n  b();\n} else {\n  c();\n}`);
    irrelevant("js_block_braces", `console.log("for (x) y");`);
    breaks("js_block_braces", `for (let i = 1; i <= 10; i++)\n  console.log(i);`);
    breaks("js_block_braces", `for (let i = 1; i <= 10; i++) console.log(i);`);
    breaks("js_block_braces", `if (x) {\n  a();\n} else b();`);
    irrelevant("js_block_braces", `console.log(1);`);
  });
});

describe("chapter-02:classify", () => {
  const IF_CHAIN = SOLUTIONS.javascript["chapter-02:classify"];
  const SEPARATE_IFS = `for (let i = 1; i <= 10; i++) {
  if (i <= 3) {
    console.log(i, "DENY");
  }
  if (i > 3 && i <= 6) {
    console.log(i, "WARN");
  }
  if (i > 6 && i <= 9) {
    console.log(i, "GRANT");
  }
  if (i == 10) {
    console.log(i, "OVERRIDE");
  }
}`;

  it("js_exclusive_branches", () => {
    follows("js_exclusive_branches", IF_CHAIN);
    follows("js_exclusive_branches", SOLUTIONS.javascript["chapter-02:rewrite"]);
    breaks("js_exclusive_branches", SEPARATE_IFS);
    irrelevant("js_exclusive_branches", `for (let i = 1; i <= 10; i++) {\n  console.log(i);\n}`);
  });

  it("js_catch_all", () => {
    follows("js_catch_all", IF_CHAIN);
    follows("js_catch_all", SOLUTIONS.javascript["chapter-02:rewrite"]);
    breaks("js_catch_all", SEPARATE_IFS);
    breaks("js_catch_all", IF_CHAIN.replace("} else {", "} else if (i === 10) {"));
    irrelevant("js_catch_all", `for (let i = 1; i <= 10; i++) {\n  console.log(i);\n}`);
  });

  it("js_strict_equality", () => {
    follows("js_strict_equality", IF_CHAIN.replace("} else {", "} else if (i === 10) {"));
    follows("js_strict_equality", `if (i !== 10) {\n  console.log("==");\n}`);
    breaks("js_strict_equality", SEPARATE_IFS);
    breaks("js_strict_equality", `if (i != 10) {\n  console.log(i);\n}`);
    irrelevant("js_strict_equality", IF_CHAIN);
    irrelevant("js_strict_equality", `// i == 10\nconsole.log("a == b");`);
  });
});

describe("chapter-02:rewrite", () => {
  const SWITCH = SOLUTIONS.javascript["chapter-02:rewrite"];

  it("js_switch_break", () => {
    follows("js_switch_break", SWITCH);
    // grouped labels and a return also end a case cleanly
    follows("js_switch_break", `function level(n) {\n  switch (n) {\n    case 1:\n    case 2:\n      return "DENY";\n    default:\n      return "OVERRIDE";\n  }\n}`);
    follows("js_switch_break", `switch (true) {\n  case i <= 3: {\n    console.log(i, "DENY");\n    break;\n  }\n  default:\n    console.log(i, "OVERRIDE");\n}`);
    breaks("js_switch_break", SWITCH.replace(`console.log(i, "WARN");\n      break;`, `console.log(i, "WARN");`));
    breaks("js_switch_break", `switch (true) {\n  case i <= 3:\n    console.log(i, "DENY");\n  default:\n    console.log(i, "OVERRIDE");\n}`);
    irrelevant("js_switch_break", SOLUTIONS.javascript["chapter-02:classify"]);
    irrelevant("js_switch_break", `// switch (x) {}\nconsole.log("switch");`);
  });
});

describe("chapter-03:sumfunc", () => {
  it("js_rest_params", () => {
    follows("js_rest_params", SUM);
    follows("js_rest_params", `const sumCodes = (...codes) => codes.reduce((a, b) => a + b, 0);`);
    breaks("js_rest_params", `function sumCodes() {\n  let total = 0;\n  for (const c of arguments) {\n    total += c;\n  }\n  return total;\n}`);
    breaks("js_rest_params", `function sumCodes(codes) {\n  return codes.reduce((a, b) => a + b, 0);\n}`);
    irrelevant("js_rest_params", `function addUp(...codes) {\n  return 0;\n}`);
  });

  it("js_for_of", () => {
    follows("js_for_of", SUM);
    follows("js_for_of", `function sumCodes(...codes) {\n  return codes.reduce((sum, c) => sum + c, 0);\n}`);
    follows("js_for_of", `const sumCodes = (...codes) => codes.reduce((sum, c) => sum + c, 0);`);
    breaks("js_for_of", `function sumCodes(...codes) {\n  let total = 0;\n  for (let i = 0; i < codes.length; i++) {\n    total += codes[i];\n  }\n  return total;\n}`);
    const forIn = `function sumCodes(...codes) {\n  let total = 0;\n  for (const i in codes) {\n    total += codes[i];\n  }\n  return total;\n}`;
    breaks("js_for_of", forIn);
    expect(rule("js_for_of").getSuggestion!(forIn)).toMatch(/for\.\.\.in/);
    irrelevant("js_for_of", `function sumCodes(...codes) {\n  return codes[0] + codes[1];\n}`);
    irrelevant("js_for_of", `console.log("no function here");`);
  });

  it("js_pure_function", () => {
    follows("js_pure_function", SUM + `\n\nconsole.log("Sum:", sumCodes(1, 2));`);
    breaks("js_pure_function", `function sumCodes(...codes) {\n  let total = 0;\n  for (const c of codes) {\n    total += c;\n  }\n  console.log("Sum:", total);\n  return total;\n}`);
    irrelevant("js_pure_function", `console.log(1 + 2);`);
  });
});

describe("chapter-03:validate", () => {
  const VALIDATE = SOLUTIONS.javascript["chapter-03:validate"];
  const IF_ELSE = `${SUM}

function validateCode(...codes) {
  const total = sumCodes(...codes);
  if (total > 100) {
    return [total, true];
  } else {
    return [total, false];
  }
}`;
  const OWN_LOOP = `function validateCode(...codes) {
  let total = 0;
  for (const c of codes) {
    total += c;
  }
  return [total, total > 100];
}`;

  it("js_direct_bool", () => {
    follows("js_direct_bool", VALIDATE);
    follows("js_direct_bool", `${SUM}\nconst validateCode = (...codes) => [sumCodes(...codes), sumCodes(...codes) > 100];`);
    breaks("js_direct_bool", IF_ELSE);
    breaks("js_direct_bool", `function validateCode(...codes) {\n  const total = sumCodes(...codes);\n  return [total, total > 100 ? true : false];\n}`);
    irrelevant("js_direct_bool", SUM);
  });

  it("js_reuse_sum", () => {
    follows("js_reuse_sum", VALIDATE);
    breaks("js_reuse_sum", OWN_LOOP);
    irrelevant("js_reuse_sum", SUM);
  });

  it("js_destructure", () => {
    follows("js_destructure", VALIDATE);
    follows("js_destructure", `${OWN_LOOP}\nlet [total, ok] = validateCode(1, 2);`);
    breaks("js_destructure", `${OWN_LOOP}\nconst result = validateCode(1, 2);\nconsole.log(result[0], result[1]);`);
    irrelevant("js_destructure", OWN_LOOP);
  });
});

describe("javascript zen · registry", () => {
  it("every step has at least one rule except the rewrite", () => {
    for (const [stepId, rules] of Object.entries(JAVASCRIPT_ZEN_RULES)) {
      if (stepId === "chapter-02:rewrite") continue;
      expect(rules.length, stepId).toBeGreaterThanOrEqual(1);
    }
  });

  it("rule ids are unique and js_-prefixed", () => {
    const ids = ALL.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.startsWith("js_")).toBe(true);
  });
});
