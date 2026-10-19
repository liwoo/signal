// ── Zen debrief examples · JavaScript ──
// Before → after for every js_* rule in src/lib/game/zen-javascript.ts.

import type { ZenExample } from "./zen-examples";

export const JAVASCRIPT_ZEN_EXAMPLES: Record<string, ZenExample> = {
  js_semicolons: {
    before: 'console.log("CELL");\nconsole.log("SUBLEVEL")',
    after: 'console.log("CELL");\nconsole.log("SUBLEVEL");',
    change: "one semicolon habit, kept on every statement",
  },
  js_top_level: {
    before: 'function main() {\n  console.log("Hello World");\n}\n\nmain();',
    after: 'console.log("Hello World");',
    change: "no main wrapper — the file itself is the program",
  },
  js_consistent_quotes: {
    before: "console.log(\"Hello\");\nconsole.log('World');",
    after: 'console.log("Hello");\nconsole.log("World");',
    change: "one quote style everywhere — switch only when the text holds that quote",
  },
  js_template_literal: {
    before: 'console.log("CELL " + cell + " · SUBLEVEL " + sublevel);',
    after: "console.log(`CELL ${cell} · SUBLEVEL ${sublevel}`);",
    change: "a template literal reads like the line it prints",
  },
  js_named_imports: {
    before: 'import * as cellblock from "./cellblock.js";\n\nconsole.log(cellblock.cell);',
    after: 'import { cell, sublevel } from "./cellblock.js";\n\nconsole.log(cell);',
    change: "name exactly what you import — the top of the file lists the dependencies",
  },
  js_const_default: {
    before: "let location = `CELL ${cell}`;\nconsole.log(location);",
    after: "const location = `CELL ${cell}`;\nconsole.log(location);",
    change: "const for values that never change, let only when they do",
  },
  js_let_counter: {
    before: "for (var i = 1; i <= 10; i++) {\n  console.log(i);\n}",
    after: "for (let i = 1; i <= 10; i++) {\n  console.log(i);\n}",
    change: "let keeps the counter inside the loop — var leaks it out",
  },
  js_block_braces: {
    before: "for (let i = 1; i <= 10; i++)\n  console.log(i);",
    after: "for (let i = 1; i <= 10; i++) {\n  console.log(i);\n}",
    change: "braces mark exactly where the loop body starts and stops",
  },
  js_exclusive_branches: {
    before: 'if (i <= 3) {\n  console.log(i, "DENY");\n}\nif (i > 3 && i <= 6) {\n  console.log(i, "WARN");\n}',
    after: 'if (i <= 3) {\n  console.log(i, "DENY");\n} else if (i <= 6) {\n  console.log(i, "WARN");\n}',
    change: "one else-if chain — the first match wins, the rest are skipped",
  },
  js_catch_all: {
    before: '} else if (i <= 9) {\n  console.log(i, "GRANT");\n} else if (i === 10) {\n  console.log(i, "OVERRIDE");\n}',
    after: '} else if (i <= 9) {\n  console.log(i, "GRANT");\n} else {\n  console.log(i, "OVERRIDE");\n}',
    change: "a plain else catches whatever's left — nothing slips through",
  },
  js_strict_equality: {
    before: 'if (i == 10) {\n  console.log(i, "OVERRIDE");\n}',
    after: 'if (i === 10) {\n  console.log(i, "OVERRIDE");\n}',
    change: "=== compares without converting types first",
  },
  js_switch_break: {
    before: 'switch (true) {\n  case i <= 3:\n    console.log(i, "DENY");\n  case i <= 6:\n    console.log(i, "WARN");\n}',
    after: 'switch (true) {\n  case i <= 3:\n    console.log(i, "DENY");\n    break;\n  case i <= 6:\n    console.log(i, "WARN");\n    break;\n}',
    change: "break ends each case — without it the switch falls through",
  },
  js_rest_params: {
    before: "function sumCodes() {\n  let total = 0;\n  for (const c of arguments) {\n    total += c;\n  }\n  return total;\n}",
    after: "function sumCodes(...codes) {\n  let total = 0;\n  for (const c of codes) {\n    total += c;\n  }\n  return total;\n}",
    change: "a rest parameter names the values and makes them a real array",
  },
  js_for_of: {
    before: "for (let i = 0; i < codes.length; i++) {\n  total += codes[i];\n}",
    after: "for (const c of codes) {\n  total += c;\n}",
    change: "walk the values, not the indexes — nothing to get off by one",
  },
  js_pure_function: {
    before: 'function sumCodes(...codes) {\n  const total = codes.reduce((sum, c) => sum + c, 0);\n  console.log("Sum:", total);\n  return total;\n}',
    after: "function sumCodes(...codes) {\n  return codes.reduce((sum, c) => sum + c, 0);\n}",
    change: "the function only sums — printing is the caller's job",
  },
  js_direct_bool: {
    before: "if (total > 100) {\n  return [total, true];\n} else {\n  return [total, false];\n}",
    after: "return [total, total > 100];",
    change: "the comparison already is the boolean — return it",
  },
  js_reuse_sum: {
    before: "function validateCode(...codes) {\n  let total = 0;\n  for (const c of codes) {\n    total += c;\n  }\n  return [total, total > 100];\n}",
    after: "function validateCode(...codes) {\n  const total = sumCodes(...codes);\n  return [total, total > 100];\n}",
    change: "reuse sumCodes — spread the codes straight through",
  },
  js_destructure: {
    before: "const result = validateCode(25, 30, 50, 10);\nconsole.log(result[0], result[1]);",
    after: "const [total, valid] = validateCode(25, 30, 50, 10);\nconsole.log(total, valid);",
    change: "destructure the pair — names beat result[0] and result[1]",
  },
};
