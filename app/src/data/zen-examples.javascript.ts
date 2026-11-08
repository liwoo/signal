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
    before: 'console.log("CELL " + cell + " - SUBLEVEL " + sublevel);',
    after: "console.log(`CELL ${cell} - SUBLEVEL ${sublevel}`);",
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
  js_plain_string: {
    before: "console.log(`Hello World`);",
    after: 'console.log("Hello World");',
    change: "plain quotes for plain text — backticks only when a value drops in",
  },
  js_object_literal: {
    before: 'function buildRoster() {\n  const roster = {};\n  roster.Chen = "Floor 1";\n  roster.Alvarez = "Floor 2";\n  roster.Volkov = "Floor 2";\n  return roster;\n}',
    after: 'function buildRoster() {\n  return {\n    Chen: "Floor 1",\n    Alvarez: "Floor 2",\n    Volkov: "Floor 2",\n  };\n}',
    change: "one object literal — the code looks like the roster it builds",
  },
  js_trailing_comma: {
    before: 'return {\n  Park: "Floor 3",\n  Santos: "Floor 1"\n};',
    after: 'return {\n  Park: "Floor 3",\n  Santos: "Floor 1",\n};',
    change: "a comma after the last pair too — every line has the same shape",
  },
  js_set_lookup: {
    before: "const occupied = Object.values(guards);\nif (!occupied.includes(name)) return name;",
    after: "const occupied = new Set(Object.values(guards));\nif (!occupied.has(name)) return name;",
    change: "a real Set answers .has straight away — no walking the list",
  },
  js_object_values: {
    before: "const occupied = new Set();\nfor (const name of Object.keys(guards)) {\n  occupied.add(guards[name]);\n}",
    after: "const occupied = new Set(Object.values(guards));",
    change: "Object.values goes straight to the floors — no keys to look back up",
  },
  js_floor_template: {
    before: 'const name = "Floor " + i;',
    after: "const name = `Floor ${i}`;",
    change: "a template literal reads like the name it builds",
  },
  js_no_import_needed: {
    before: 'import { reverse } from "./strings.js";\n\nconsole.log("Hello World");',
    after: 'console.log("Hello World");',
    change: "split, join, reverse and Number are built in — nothing to import",
  },
  js_spread_chars: {
    before: 'return s.split("").reverse().join("");',
    after: 'return [...s].reverse().join("");',
    change: "spreading keeps every character whole — split(\"\") cuts emoji in half",
  },
  js_builtin_reverse: {
    before: 'let out = "";\nfor (let i = s.length - 1; i >= 0; i--) {\n  out += s[i];\n}\nreturn out;',
    after: 'return [...s].reverse().join("");',
    change: "let the array reverse itself — no index loop to get off by one",
  },
  js_map_transform: {
    before: 'const out = [];\nfor (const w of msg.split(" ")) {\n  out.push(reverseWord(w));\n}\nreturn out.join(" ");',
    after: 'return msg.split(" ").map(reverseWord).join(" ");',
    change: ".map is the whole push loop in one call",
  },
  js_reuse_reverse: {
    before: 'return msg.split(" ").map((w) => [...w].reverse().join("")).join(" ");',
    after: 'return msg.split(" ").map(reverseWord).join(" ");',
    change: "call reverseWord instead of reversing all over again",
  },
  js_number_isnan: {
    before: "const n = Number(code);\nif (n === NaN) return `F${floor}-ERR`;",
    after: "const n = Number(code);\nif (Number.isNaN(n)) return `F${floor}-ERR`;",
    change: "NaN never equals itself — Number.isNaN is the check that works",
  },
  js_number_over_parseint: {
    before: "const n = parseInt(code);",
    after: "const n = Number(code);",
    change: "Number rejects \"12abc\" outright — parseInt quietly reads the 12",
  },
  js_header_template: {
    before: 'return "F" + floor + "-C" + n * 2;',
    after: "return `F${floor}-C${n * 2}`;",
    change: "a template literal reads like the header on the wire",
  },
};
