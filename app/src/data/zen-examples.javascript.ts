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
  js_log_for_output: {
    before: 'console.error("Hello World");',
    after: 'console.log("Hello World");',
    change: "console.log for output — console.error is the stream for things going wrong",
  },
  js_finally_log: {
    before: 'for (const entry of archive[dir]) {\n  // …walk…\n}\nconsole.log("scanned:", dir);',
    after: 'try {\n  for (const entry of archive[dir]) {\n    // …walk…\n  }\n} finally {\n  console.log("scanned:", dir);\n}',
    change: "finally runs however the walk ends — a line after the loop is skipped on a throw",
  },
  js_closure_counter: {
    before: "let count = 0;\n\nfunction scanArchive(archive, root) {\n  function scan(dir) { /* …count++… */ }\n  scan(root);\n  return count;\n}",
    after: "function scanArchive(archive, root) {\n  let count = 0;\n  function scan(dir) { /* …count++… */ }\n  scan(root);\n  return count;\n}",
    change: "the counter lives inside scanArchive — every scan starts from zero",
  },
  js_ends_with: {
    before: 'if (entry[entry.length - 1] === "/") scan(entry.slice(0, -1));',
    after: 'if (entry.endsWith("/")) scan(entry.slice(0, -1));',
    change: "endsWith asks the question you mean — no index arithmetic",
  },
  js_throw_error: {
    before: 'throw "corrupted directory";',
    after: 'throw new Error("corrupted directory");',
    change: "an Error carries a .message and a stack trace — a string carries neither",
  },
  js_error_message: {
    before: "} catch (e) {\n  errors.push(`${dir}: ${e}`);\n}",
    after: "} catch (e) {\n  errors.push(`${dir}: ${e.message}`);\n}",
    change: "e.message is just the words — e prints with its type stuck on the front",
  },
  js_shorthand_props: {
    before: "return { count: count, errors: errors };",
    after: "return { count, errors };",
    change: "when the variable already has the key's name, say it once",
  },
  js_sync_in_order: {
    before: 'setTimeout(() => console.log("Hello World"), 0);',
    after: 'console.log("Hello World");',
    change: "nothing here waits — plain code runs top to bottom",
  },
  js_reuse_cut: {
    before: "function cutAsync(name) {\n  setTimeout(() => console.log(`${name} circuit: DOWN`), 0);\n}",
    after: "function cutAsync(name) {\n  setTimeout(() => cut(name), 0);\n}",
    change: "schedule the cut you already wrote — one place knows how, the other decides when",
  },
  js_explicit_delay: {
    before: "setTimeout(() => cut(name));",
    after: "setTimeout(() => cut(name), 0);",
    change: "the 0 says later-on-purpose out loud",
  },
  js_no_needless_async: {
    before: "async function cutAsync(name) {\n  setTimeout(() => cut(name), 0);\n}",
    after: "function cutAsync(name) {\n  setTimeout(() => cut(name), 0);\n}",
    change: "nothing awaits inside — the async keyword only wraps a promise nobody uses",
  },
  js_promise_all_concurrent: {
    before: "const lines = [];\nfor (const name of circuits) {\n  lines.push(await trip(name));\n}\nreturn lines;",
    after: "return Promise.all(circuits.map(trip));",
    change: "start every job, then wait once — not one at a time",
  },
  js_map_not_push: {
    before: "const jobs = [];\nfor (const name of circuits) {\n  jobs.push(trip(name));\n}\nreturn Promise.all(jobs);",
    after: "return Promise.all(circuits.map(trip));",
    change: "map builds the promises in one call, in order",
  },
  js_promisified_sleep: {
    before: "circuits.map(async (name, i) => {\n  await new Promise((resolve) => setTimeout(resolve, delays[i]));\n  // …\n});",
    after: "const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));\n\ncircuits.map(async (name, i) => {\n  await sleep(delays[i]);\n  // …\n});",
    change: "wrap the timer once as sleep, then await it in one clean line",
  },
  js_map_index: {
    before: "circuits.map(async (name) => {\n  const d = delays[circuits.indexOf(name)];\n  // …\n});",
    after: "circuits.map(async (name, i) => {\n  const d = delays[i];\n  // …\n});",
    change: "map passes the index — no indexOf, no counter to drift",
  },
  js_no_var: {
    before: "for (var i = 0; i < circuits.length; i++) {\n  jobs.push(sleep(delays[i]).then(() => circuits[i]));\n}",
    after: "for (let i = 0; i < circuits.length; i++) {\n  jobs.push(sleep(delays[i]).then(() => circuits[i]));\n}",
    change: "let gives each pass its own i — with var every callback sees the last one",
  },
  js_minimal_program: {
    before: 'const greeting = "Hello World";\nconsole.log(greeting);',
    after: 'console.log("Hello World");',
    change: "one call — no variable that does nothing but hold the text",
  },
  js_delay_param: {
    before: "return new Promise((resolve) => setTimeout(() => resolve(`${team} responding`), 100));",
    after: "return new Promise((resolve) => setTimeout(() => resolve(`${team} responding`), delayMs));",
    change: "the timer waits as long as the caller asked",
  },
  js_sync_executor: {
    before: "return new Promise(async (resolve) => {\n  await sleep(delayMs);\n  resolve(`${team} responding`);\n});",
    after: "return new Promise((resolve) => setTimeout(() => resolve(`${team} responding`), delayMs));",
    change: "a plain executor — an async one swallows its own errors and can hang",
  },
  js_no_redundant_async: {
    before: "async function hail(team, delayMs) {\n  return new Promise(/* … */);\n}",
    after: "function hail(team, delayMs) {\n  return new Promise(/* … */);\n}",
    change: "hail already returns a promise — async only wraps it in another",
  },
  js_race_every_team: {
    before: "return Promise.race([bravo]);",
    after: "return Promise.race([alpha, bravo, charlie]);",
    change: "race every team — racing the one you expect to win is a guess",
  },
  js_no_then_chain: {
    before: "return Promise.race([alpha, bravo, charlie]).then((reply) => reply);",
    after: "return Promise.race([alpha, bravo, charlie]);",
    change: "hand the race back — a .then that passes the value along is an extra hop",
  },
  js_deadline_param: {
    before: 'const deadline = new Promise((resolve) => setTimeout(() => resolve("NO CONTACT"), 200));',
    after: 'const deadline = new Promise((resolve) => setTimeout(() => resolve("NO CONTACT"), timeoutMs));',
    change: "the deadline is the caller's number, not yours",
  },
  js_sweep_no_wait: {
    before: 'async function sweep(p) {\n  await sleep(0);\n  return Promise.race([p, "channel silent"]);\n}',
    after: 'function sweep(p) {\n  return Promise.race([p, "channel silent"]);\n}',
    change: "a sweep looks and leaves — no await, no timer",
  },
};
