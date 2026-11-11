// ── Maya's answer banks · JavaScript ──
// Same story beats and stakes as the Go banks in engine.ts, teaching
// JavaScript. Every Act I step grades by expectedOutput and JS runs locally
// (never "offline"), so codePatterns are only a fallback; outputPatterns carry
// the targeted wrong-output feedback (they're checked before the generic diff,
// so keep them narrow — a catch-all would hide the diff).

import type { StepBank } from "./types";

// ── Helpers ──

/** Code with comments removed (strings kept — labels like "DENY" live there). */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** Non-empty, trimmed output lines. */
function lines(output: string): string[] {
  return output
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

const hasLog = (code: string) => /\bconsole\s*\.\s*log\s*\(/.test(stripComments(code));
const hasCapitalConsole = (code: string) => /\bConsole\s*\./.test(stripComments(code));
const hasForeignPrint = (code: string) => /(^|[^.\w])print\s*\(/.test(stripComments(code)) && !hasLog(code);
const hasHelloWorld = (output: string) => output.includes("Hello World");
const hasBranching = (code: string) => /\b(if|switch)\b/.test(stripComments(code));
const hasAllLabels = (code: string) => ["DENY", "WARN", "GRANT", "OVERRIDE"].every((l) => code.includes(l));

/** A `switch` whose body never says `break` (or `return`) — cases fall through. */
function switchWithoutBreak(code: string): boolean {
  const c = stripComments(code);
  return /\bswitch\s*\(/.test(c) && !/\b(break|return)\b/.test(c);
}

const CLASSIFY_LINES = [
  "1 DENY", "2 DENY", "3 DENY", "4 WARN", "5 WARN", "6 WARN", "7 GRANT", "8 GRANT", "9 GRANT", "10 OVERRIDE",
];

/** Wrong-output feedback shared by classify and rewrite (same expected output). */
const classifyOutputPatterns = [
  {
    match: (output: string) => hasHelloWorld(output),
    response: "the `Hello World` line from before is still printing. delete it — the keypad only wants the ten classified codes.",
  },
  {
    // more than ten lines with labels → a switch case fell through
    match: (output: string) => lines(output).length > 10 && /DENY|WARN|GRANT|OVERRIDE/i.test(output),
    response:
      "too many lines — some codes printed more than once. if you used a switch, a case without `break;` falls straight into the next one. end every case with `break;`.",
  },
  {
    // right levels, wrong case
    match: (output: string) =>
      /deny|warn|grant|override/i.test(output) &&
      lines(output).join("\n").toUpperCase() === CLASSIFY_LINES.join("\n") &&
      lines(output).join("\n") !== CLASSIFY_LINES.join("\n"),
    response: "the levels are right, but the keypad matches them exactly — capitals only: `DENY`, `WARN`, `GRANT`, `OVERRIDE`.",
  },
  {
    // number glued to the label: "1DENY"
    match: (output: string) => /^\d+(DENY|WARN|GRANT|OVERRIDE)/im.test(output),
    response: "the number and the level are jammed together. give console.log both, separated by a comma — `console.log(i, \"DENY\")` puts the space in for you.",
  },
  {
    match: (output: string) => {
      const ls = lines(output);
      return ls.length > 0 && ls.every((l) => /^(DENY|WARN|GRANT|OVERRIDE)$/i.test(l));
    },
    response: "you're printing levels but not the code numbers. each line needs both: `console.log(i, \"DENY\")` gives `1 DENY`.",
  },
  {
    match: (output: string) => /DENY/.test(output) && /WARN/.test(output) && /GRANT/.test(output) && !/OVERRIDE/.test(output),
    response: "codes 1-9 look classified, but 10 needs `OVERRIDE`. a final `else { ... }` — or `default:` in a switch — catches it.",
  },
  {
    match: (output: string) => /DENY/.test(output) && /WARN/.test(output) && /GRANT/.test(output) && /OVERRIDE/.test(output),
    response: "all four levels are there, but the mapping is off. check: 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
  },
  {
    match: (output: string) => {
      const ls = lines(output);
      return ls.length > 0 && ls.every((l) => /^\d+$/.test(l));
    },
    response: "you're printing numbers but not classifying them. branch inside the loop — `if (i <= 3) { ... } else if ...` — and print the level next to each number.",
  },
];

// ── Chapter 01 · Step 1 — Scaffold ──

const ch01ScaffoldBank: StepBank = {
  intro:
    "...signal received. you're in.\ni'm maya — they've locked me in a cell and this terminal is my only way to reach anyone. right now it's dead. make it print `Hello World` so i know the channel's actually live.",

  conceptFAQ: [
    {
      keywords: ["main", "entry", "setup", "set up", "boilerplate", "skeleton", "scaffold", "structure", "wrapper"],
      response:
        "no setup needed. in javascript the file is the program — it runs from the top line down. one `console.log` line is a complete program.",
    },
    {
      keywords: ["console.log", "console", "print", "output", "display", "show"],
      response:
        "`console.log(...)` writes whatever's in the brackets to the terminal, then moves to a new line. that's how this terminal talks.",
    },
    {
      keywords: ["string", "text", "quote"],
      response:
        "text goes in quotes: `\"Hello World\"`. double or single both work in javascript — just open and close with the same one. without quotes it thinks you mean a variable.",
    },
    {
      keywords: ["semicolon", ";"],
      response:
        "the `;` marks where a statement ends. javascript can usually guess without it, but once in a while it guesses wrong. end your lines with `;` and keep that habit everywhere.",
    },
    {
      keywords: ["capital", "uppercase", "lowercase", "case sensitive", "case-sensitive"],
      response:
        "javascript is case-sensitive. it's `console.log`, all lowercase. `Console.Log` is a name that doesn't exist.",
    },
    {
      keywords: ["run", "execute", "compile", "build"],
      response:
        "no compile step here — javascript runs the file directly. write the line and hit transmit. i'll see it on my end.",
    },
    {
      keywords: ["javascript", "js", "language"],
      response:
        "javascript. it runs everywhere — browsers, servers, this terminal. no compiler, no ceremony. that's why they wired it in.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "what next", "where do i start", "start"],
      response:
        "make it print `Hello World`. one line: `console.log(\"Hello World\");` — then transmit it.",
    },
    {
      keywords: ["bracket", "parenthes", "brace"],
      response:
        "the round brackets after `console.log` hold what you want printed. every `(` needs its `)`.",
    },
    {
      keywords: ["error", "wrong", "not working", "doesn't work", "broken", "fail"],
      response:
        "check the spelling — `console.log`, lowercase, a dot in the middle. then the text in quotes inside the brackets. that's all there is.",
    },
  ],

  codePatterns: [
    {
      match: hasCapitalConsole,
      response: "javascript is case-sensitive. it's `console.log`, all lowercase.",
    },
    {
      match: hasForeignPrint,
      response: "`print` isn't javascript. this terminal prints with `console.log(...)`.",
    },
    {
      match: (code) => hasLog(code) && /["'`]Hello World["'`]/.test(code),
      response: "there it is — `Hello World` on the wire. the terminal answered. one line, and the channel's live.\n\n||COMPLETE||",
    },
    {
      match: (code) => !hasLog(code),
      response: "nothing came through. javascript prints with `console.log(...)`.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => output.trim() !== "Hello World" && output.trim().toLowerCase() === "hello world",
      response: "close, but the terminal's picky about capitals. `Hello World` — capital H, capital W.",
    },
    {
      match: (output) => hasHelloWorld(output) && lines(output).length > 1,
      response: "i got `Hello World`, but other lines came with it. just the one line.",
    },
  ],

  correctResponse:
    "there it is — `Hello World` on the wire. the terminal answered. one line, and the channel's live.\n\n||COMPLETE||",

  genericWrong: [
    "the terminal can't read that. i need one line: `console.log(\"Hello World\");`",
    "nothing usable came through. print `Hello World` with `console.log`.",
    "not quite. text in quotes, inside the brackets of `console.log`.",
  ],

  rushDialogue: [
    "the signal's degrading. just get `Hello World` printing.",
    "hurry — one line is all i need. `console.log`.",
    "losing you. print `Hello World`. now.",
  ],

  stuckResponses: [
    "one line, and that's the whole program:\n```\nconsole.log(\"Hello World\");\n```",
    "`console.log` prints. the text goes in quotes inside its brackets. no setup, no wrapper — javascript runs the file top to bottom.",
  ],

  deflections: [
    "not now — i need the channel live first.",
    "can't process that. one `console.log` line and we're talking.",
    "focus. get `Hello World` on the wire and we can move on.",
  ],
};

// ── Chapter 01 · Step 2 — Transmit Location ──

const ch01LocationBank: StepBank = {
  intro:
    "good, the channel's live. now lock in where they're holding me — and it has to be exact, a wrong location gets someone hurt. don't type it by hand: my real cell is already on this terminal in `./cellblock.js`. import `cell` and `sublevel` from it and print `CELL B-09 - SUBLEVEL 3`.",

  conceptFAQ: [
    {
      keywords: ["export"],
      response:
        "the module marks what it shares with `export` — `export const cell` and `export let sublevel`. you can only import what it exports.",
    },
    {
      keywords: ["path", "./", ".js", "file name", "cannot find", "can't find"],
      response:
        "the path is relative to your file: `\"./cellblock.js\"` — dot slash at the front, `.js` at the end. leave either off and the import can't find it.",
    },
    {
      keywords: ["require"],
      response:
        "`require` is the old way. this terminal uses `import { cell, sublevel } from \"./cellblock.js\";` at the top.",
    },
    {
      keywords: ["import", "module", "cellblock", "another file", "other file", "pull in"],
      response:
        "`import { cell, sublevel } from \"./cellblock.js\";` at the top of your file. the names in the braces become usable everywhere below it.",
    },
    {
      keywords: ["template", "backtick", "${", "interpolat", "mix", "combine", "together", "text and a number", "and a number", "with a number", "same line"],
      response:
        "a template literal: backticks instead of quotes, and `${...}` wherever a value goes. ``console.log(`CELL ${cell}`)`` drops the real value into the text.",
    },
    {
      keywords: ["concat", "join", "+", "plus"],
      response:
        "`\"CELL \" + cell` works, but the spaces are easy to lose. a template literal reads like the final line: ``console.log(`CELL ${cell} - SUBLEVEL ${sublevel}`)``.",
    },
    {
      keywords: ["const", "let vs", "variable", "declare"],
      response:
        "`cell` is a `const` in the module — it never changes. `sublevel` is a `let`, so the module could move it. you don't redeclare them, you just read them.",
    },
    {
      keywords: ["dash", "hyphen", "minus", "separator", "middle dot", "special character", "between the cell"],
      response:
        "the separator is a plain dash with a space on each side: `CELL B-09 - SUBLEVEL 3`. nothing special to type.",
    },
    {
      keywords: ["print", "console", "output", "display", "show"],
      response:
        "`console.log(...)` sends it through. but don't put my cell in quotes — feed it the imported values: `console.log(\"CELL\", cell, \"- SUBLEVEL\", sublevel);` or a template literal.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "import `cell` and `sublevel` from `./cellblock.js`, then print them as `CELL B-09 - SUBLEVEL 3`. don't type my cell in by hand — read it from the module.",
    },
    {
      keywords: ["example", "show me", "sample"],
      response:
        "here's the shape:\n```\nimport { cell, sublevel } from \"./cellblock.js\";\n\nconsole.log(`CELL ${cell} - SUBLEVEL ${sublevel}`);\n```",
    },
  ],

  outputPatterns: [
    {
      match: (output) => hasHelloWorld(output) && /B-?09/i.test(output),
      response: "almost — the `Hello World` line from before is still in there. delete it, i only need the location.",
    },
    {
      match: (output) => hasHelloWorld(output),
      response: "that's a hello world. i don't need a greeting — i need my location. CELL B-09 - SUBLEVEL 3.",
    },
    {
      match: (output) => output.includes("${"),
      response:
        "`${cell}` printed as plain text — that means it's inside ordinary quotes. template literals need backticks, the key under esc.",
    },
    {
      match: (output) => output.includes("undefined"),
      response:
        "something printed `undefined` — a name didn't match. the module exports `cell` and `sublevel`, lowercase, spelled exactly like that.",
    },
    {
      match: (output) => {
        const norm = (s: string) => s.trim().replace(/[·•∙]/g, ".");
        return norm(output) !== norm("CELL B-09 - SUBLEVEL 3") && norm(output).toUpperCase() === norm("CELL B-09 - SUBLEVEL 3");
      },
      response: "right values, wrong capitals. `CELL` and `SUBLEVEL` are uppercase in the line i need.",
    },
    {
      match: (output) => /B-?09/i.test(output) && !/SUBLEVEL/i.test(output),
      response: "close — i see the cell but not the sublevel. i need both: CELL B-09 - SUBLEVEL 3.",
    },
  ],

  codePatterns: [
    {
      match: (code) => /\brequire\s*\(/.test(stripComments(code)),
      response: "this terminal uses `import`, not `require`. `import { cell, sublevel } from \"./cellblock.js\";`",
    },
    {
      match: (code) => /B-?09/i.test(code) && !code.includes("cellblock"),
      response:
        "don't type my cell in by hand. import `cell` and `sublevel` from `./cellblock.js` and print those — pull the values from the module.",
    },
    {
      match: (code) => /["'][^"'\n]*\$\{/.test(stripComments(code)),
      response: "`${...}` only works inside backticks. swap the quotes around that text for backticks.",
    },
    {
      match: (code) => !hasLog(code),
      response: "nothing came through. you need `console.log(...)` to send output.",
    },
    {
      match: (code) => {
        const c = stripComments(code);
        const body = c.replace(/^\s*import\b[^\n]*$/gm, "");
        return /\bimport\b[\s\S]*cellblock/.test(c) && /\bcell\b/.test(body) && /\bsublevel\b/.test(body);
      },
      response: "...i see it. my cell, read straight off the terminal. the screen just flashed it back to me. you actually got through.\n\n||COMPLETE||",
    },
  ],

  correctResponse:
    "...i see it. my cell, read straight off the terminal. the screen just flashed it back to me. you actually got through.\n\n||COMPLETE||",

  genericWrong: [
    "that's not right. check the output — i need CELL B-09 - SUBLEVEL 3. exactly.",
    "almost... but the output doesn't match. look at what you're printing.",
    "wrong signal. i need my exact location: CELL B-09 - SUBLEVEL 3.",
  ],

  rushDialogue: [
    "hurry. the footsteps stopped right outside.",
    "now. just print the location.",
    "no time — just get it done. CELL B-09 - SUBLEVEL 3.",
  ],

  stuckResponses: [
    "two lines. import first, then print:\n```\nimport { cell, sublevel } from \"./cellblock.js\";\n\nconsole.log(`CELL ${cell} - SUBLEVEL ${sublevel}`);\n```",
    "the values aren't yours to type — they're in the module. `import { cell, sublevel } from \"./cellblock.js\";` then print `cell` and `sublevel`.",
    "don't overthink it. import the two names, then put them in a template literal: backticks, and `${cell}` where the cell goes.",
  ],

  deflections: [
    "i don't have intel on that. focus on the mission.",
    "not now. i need my location confirmed first.",
    "can't help with that. what i need is on screen — print my cell location.",
  ],
};

// ── Chapter 02 · Step 1 — Scaffold ──

const ch02ScaffoldBank: StepBank = {
  intro:
    "the keypad on my door runs javascript. get the terminal live first — print `Hello World`. one line, no skeleton.\n\nonce it's live, we can start cracking the sequence.",

  conceptFAQ: [
    {
      keywords: ["main", "entry", "setup", "set up", "skeleton", "scaffold", "structure", "boilerplate"],
      response:
        "nothing to set up. javascript runs the file from the top — the first line is where it starts.",
    },
    {
      keywords: ["print", "console", "output"],
      response: "`console.log(\"Hello World\");` — text in quotes, inside the brackets.",
    },
    {
      keywords: ["loop", "keypad", "sequence", "crack", "codes"],
      response: "the loop comes next. get the terminal live first, then we cycle the codes.",
    },
    {
      keywords: ["semicolon", ";"],
      response: "the `;` ends the statement. same habit as before — keep it on every line.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "print `Hello World`. `console.log(\"Hello World\");` — that's the whole program.",
    },
  ],

  codePatterns: [
    {
      match: hasCapitalConsole,
      response: "lowercase — `console.log`. javascript is case-sensitive.",
    },
    {
      match: hasForeignPrint,
      response: "`print` isn't javascript. use `console.log(...)`.",
    },
    {
      match: (code) => hasLog(code) && /["'`]Hello World["'`]/.test(code),
      response: "terminal initialized. the keypad's listening — i can hear it hum.\n\nnow loop through codes 1-10.\n\n||COMPLETE||",
    },
  ],

  outputPatterns: [
    {
      match: (output) => output.trim() !== "Hello World" && output.trim().toLowerCase() === "hello world",
      response: "capitals matter — `Hello World`, capital H, capital W.",
    },
    {
      match: (output) => hasHelloWorld(output) && lines(output).length > 1,
      response: "`Hello World` is there, but so is other stuff. just the one line for now.",
    },
  ],

  correctResponse:
    "terminal initialized. the keypad's listening — i can hear it hum.\n\nnow loop through codes 1-10.\n\n||COMPLETE||",

  genericWrong: [
    "the keypad rejected that. one line: `console.log(\"Hello World\");`",
    "not quite. print `Hello World` — text in quotes inside `console.log`.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "same as before:\n```\nconsole.log(\"Hello World\");\n```",
    "`console.log`, then the text in quotes inside the brackets. nothing else.",
  ],

  deflections: ["focus. get the terminal live with a hello world first, then we crack the codes."],
};

// ── Chapter 02 · Step 2 — Loop ──

const ch02LoopBank: StepBank = {
  intro:
    "good, you're still here.\n\nthe keypad on my door cycles codes 1 through 10 — i need to watch every one go by. write a loop that prints each number on its own line, just the raw numbers. we'll classify them next.",

  conceptFAQ: [
    {
      keywords: ["hello world line", "remove hello", "delete hello", "keep hello"],
      response: "delete it. the keypad wants exactly ten lines — the numbers, nothing else.",
    },
    {
      keywords: ["while", "do while", "until"],
      response:
        "javascript has `while` too, but a counting loop reads best as `for (let i = 1; i <= 10; i++)` — start, condition and step all in one place.",
    },
    {
      keywords: ["let", "const", "declare", "variable"],
      response:
        "the counter changes every pass, so it's `let i = 1`. a `const` can never be reassigned — `i++` on a const crashes the loop.",
    },
    {
      keywords: ["++", "increment"],
      response:
        "`i++` adds 1 to `i` after each pass. without it the condition never changes and the loop never ends.",
    },
    {
      keywords: ["off by one", "starts at 0", "start at 0", "zero", "stops at 9", "only 9", "11"],
      response:
        "the keypad codes start at 1, not 0. `let i = 1` to start, and `i <= 10` so 10 gets its turn — `i < 10` stops at 9.",
    },
    {
      keywords: ["semicolon", ";"],
      response:
        "inside the `for (...)` brackets the two `;` separate the three parts — those are required. after `console.log(i)` it's the usual line ending.",
    },
    {
      keywords: ["for", "loop", "iterate", "repeat", "cycle"],
      response:
        "`for (let i = 1; i <= 10; i++) { ... }` — three parts in the brackets: where to start, when to keep going, how to step. the body in braces runs each pass.",
    },
    {
      keywords: ["print", "console", "output"],
      response: "`console.log(i);` inside the braces prints the current number. one call, one line.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "a for loop that prints 1 through 10, one per line: `for (let i = 1; i <= 10; i++) { console.log(i); }`. delete the hello world line — i only want the numbers.",
    },
  ],

  outputPatterns: [
    {
      match: hasHelloWorld,
      response: "the `Hello World` line from before is still printing. delete it — the keypad only wants the numbers.",
    },
    {
      match: (output) => lines(output).some((l) => /^\d+\s+\S+/.test(l)),
      response: "hold on — just the numbers for now, no labels. `console.log(i)` gives the raw number. we classify next step.",
    },
    {
      match: (output) => lines(output)[0] === "0",
      response: "you started at 0. the keypad codes start at 1 — `let i = 1`.",
    },
    {
      match: (output) => {
        const ls = lines(output);
        return ls.length === 9 && ls[0] === "1" && ls[8] === "9";
      },
      response: "you stopped at 9. `i < 10` quits before 10 gets a turn — use `i <= 10`.",
    },
    {
      match: (output) => lines(output).includes("11"),
      response: "one too many — 11 isn't a code. the condition should be `i <= 10`.",
    },
    {
      match: (output) => lines(output).length === 1,
      response: "only one line came through. put `console.log(i);` inside the loop's braces so every pass prints its own line.",
    },
    {
      match: (output) => output.trim().length === 0,
      response: "nothing came through. is `console.log(i);` inside the loop's braces?",
    },
  ],

  codePatterns: [
    {
      match: (code) => /\bfor\s*\(\s*const\s+\w+\s*=/.test(stripComments(code)),
      response: "the counter changes every pass, so it can't be `const`. use `let i = 1`.",
    },
    {
      match: (code) => !/\bfor\b/.test(stripComments(code)),
      response: "i need a loop. `for (let i = 1; i <= 10; i++)` — don't write ten lines by hand, the keypad will notice.",
    },
    {
      match: (code) => !hasLog(code),
      response: "loop's there but you're not printing. add `console.log(i);` inside.",
    },
    {
      match: (code) => /\bfor\s*\(\s*let\s+\w+\s*=\s*1\s*;/.test(stripComments(code)) && hasLog(code),
      response: "loop confirmed. the keypad's cycling — i can see the digits rolling on the little display. now i need you to classify each code.\n\n||COMPLETE||",
    },
  ],

  correctResponse:
    "loop confirmed. the keypad's cycling — i can see the digits rolling on the little display. now i need you to classify each code.\n\n||COMPLETE||",

  genericWrong: [
    "not quite. i need each number on its own line — just `1`, `2`, `3`... up to `10`. no labels yet.",
    "the output should be exactly 10 lines: the numbers 1 through 10. nothing else on each line.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "`for (let i = 1; i <= 10; i++) { console.log(i); }` — that's the whole thing.",
    "start at 1, keep going while `i <= 10`, add 1 each pass with `i++`. inside the braces, `console.log(i);`.",
  ],

  deflections: ["focus. loop through 1-10 first, then we classify."],
};

// ── Chapter 02 · Step 3 — Classify ──

const ch02ClassifyBank: StepBank = {
  intro:
    "the keypad's cycling. now each code needs its access level, so i know which one opens the door. print the number and its level, separated by a space.\n\n1-3: DENY\n4-6: WARN\n7-9: GRANT\n10: OVERRIDE\n\nline 1 is `1 DENY`, line 4 is `4 WARN`... you get it.",

  conceptFAQ: [
    {
      keywords: ["fallthrough", "fall through", "break"],
      response:
        "javascript's switch falls through — without `break` it keeps running the cases below the one that matched. so every case ends with `break;`. if/else doesn't have that problem.",
    },
    {
      keywords: ["switch", "case"],
      response:
        "`switch (true) { case i <= 3: ... }` checks each range in order — the first true case runs. end every case with `break;`. if/else works just as well here.",
    },
    {
      keywords: ["if", "else", "condition", "branch"],
      response:
        "`if (i <= 3) { ... } else if (i <= 6) { ... } else if (i <= 9) { ... } else { ... }` — the first true condition wins, the rest are skipped.",
    },
    {
      keywords: ["print both", "number and label", "number and level", "format", "space", "together"],
      response: "`console.log(i, \"DENY\");` — give it both and it puts a space between them. that's `1 DENY`.",
    },
    {
      keywords: ["===", "==", "equal"],
      response:
        "for one exact code you'd write `i === 10`. three equals compares without converting types — the safe one in javascript. but a plain `else` is simpler here.",
    },
    {
      keywords: ["override", "default", "10"],
      response: "10 is special — OVERRIDE. a final `else { ... }` catches it, or `default:` in a switch.",
    },
    {
      keywords: ["range", "1-3", "4-6", "7-9", "deny", "warn", "grant"],
      response: "1-3 is DENY, 4-6 is WARN, 7-9 is GRANT, 10 is OVERRIDE.",
    },
    {
      keywords: ["uppercase", "capital", "lowercase", "case sensitive"],
      response: "the levels are uppercase — `\"DENY\"`, not `\"deny\"`. the keypad matches them exactly.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "keep your loop, and inside it branch on `i`. print the number and its level: 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
    },
  ],

  outputPatterns: classifyOutputPatterns,

  codePatterns: [
    {
      match: (code) => !hasBranching(code),
      response: "you're looping but not classifying. use if/else or a switch for the ranges.",
    },
    {
      match: (code) => !code.includes("OVERRIDE"),
      response: "almost — code 10 needs to print OVERRIDE.",
    },
    {
      match: switchWithoutBreak,
      response: "your switch has no `break`. without it a matched case falls straight into the next one.",
    },
    {
      match: (code) => /\bfor\b/.test(code) && hasBranching(code) && hasAllLabels(code),
      response: "the keypad's responding. all 10 codes mapped — the light by the handle just went amber. but the redundancy protocol kicked in. one more step.\n\n||COMPLETE||",
    },
  ],

  correctResponse:
    "the keypad's responding. all 10 codes mapped — the light by the handle just went amber. but the redundancy protocol kicked in. one more step.\n\n||COMPLETE||",

  genericWrong: [
    "that's not matching. loop 1-10, classify each.",
    "wrong output. check: 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
  ],

  rushDialogue: [
    "the knocking from B-10 is getting louder. hurry.",
    "someone in B-10 needs help. finish the sequence.",
  ],

  stuckResponses: [
    "inside the loop: `if (i <= 3) { console.log(i, \"DENY\"); } else if (i <= 6) { console.log(i, \"WARN\"); } else if (i <= 9) { console.log(i, \"GRANT\"); } else { console.log(i, \"OVERRIDE\"); }`",
    "four branches, checked in order. `i <= 3` first, then `i <= 6`, then `i <= 9`, and a plain `else` for 10. each one prints `i` and its level.",
  ],

  deflections: ["focus. the keypad sequence is all that matters."],
};

// ── Chapter 02 · Step 4 — Rewrite ──

const ch02RewriteBank: StepBank = {
  intro:
    "redundancy protocol. the door won't trust one version of the logic — it wants the same classification written a second way.\n\nif you used if/else, rewrite it with `switch (true)`. if you used a switch, go back to if/else.\n\nsame output. i'm putting +2:00 on the clock for this one.",

  conceptFAQ: [
    {
      keywords: ["fallthrough", "fall through", "break"],
      response:
        "without `break` javascript falls through — it runs the next case too, and the one after. `break;` at the end of each case stops at the one that matched.",
    },
    {
      keywords: ["switch (true)", "switch", "case"],
      response:
        "`switch (true) {` then one `case i <= 3:` per range — the first case that's true runs. `break;` after each, and `default:` catches 10.",
    },
    {
      keywords: ["default"],
      response: "`default:` runs when no case matched — that's code 10, OVERRIDE. it goes last, so it doesn't need a `break`.",
    },
    {
      keywords: ["if", "else", "condition"],
      response:
        "each `case i <= 3:` becomes `if (i <= 3) { ... }`, the next ones `else if`, and `default:` becomes a final `else { ... }`.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "why rewrite"],
      response:
        "the redundancy protocol wants the same classification written differently. if you used if/else, rewrite with `switch (true)`. if you used switch, rewrite with if/else.",
    },
    {
      keywords: ["difference between", "switch vs", "if vs", "which is better", "compare"],
      response:
        "same result either way. a switch lines the ranges up like a table, but it needs `break` in every case. if/else can't fall through. the point is knowing both.",
    },
    {
      keywords: ["same", "output"],
      response: "same as before: 1 DENY, 2 DENY, 3 DENY, 4 WARN, 5 WARN, 6 WARN, 7 GRANT, 8 GRANT, 9 GRANT, 10 OVERRIDE.",
    },
  ],

  outputPatterns: classifyOutputPatterns,

  codePatterns: [
    {
      match: (code) => !hasBranching(code),
      response: "you need branching logic. use `switch (true)` or if/else to classify the codes.",
    },
    {
      match: (code) => !code.includes("OVERRIDE"),
      response: "don't forget code 10 — OVERRIDE.",
    },
    {
      match: switchWithoutBreak,
      response: "every case needs a `break;` at the end — otherwise javascript falls through into the next case.",
    },
    {
      match: (code) => /\bfor\b/.test(code) && hasBranching(code) && hasAllLabels(code),
      response: "redundancy check cleared. the door mechanism just clicked — the bolt's sliding back.\n\n||COMPLETE||",
    },
  ],

  correctResponse: "redundancy check cleared. the door mechanism just clicked — the bolt's sliding back.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. same output as before, different approach.",
    "wrong output. 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
  ],

  rushDialogue: [
    "redundancy check is ticking. rewrite the classification.",
    "clock's running. same output, different approach.",
  ],

  stuckResponses: [
    "switch approach:\n```\nswitch (true) {\n  case i <= 3:\n    console.log(i, \"DENY\");\n    break;\n  case i <= 6:\n    console.log(i, \"WARN\");\n    break;\n  case i <= 9:\n    console.log(i, \"GRANT\");\n    break;\n  default:\n    console.log(i, \"OVERRIDE\");\n}\n```",
    "if/else approach: `if (i <= 3) { ... } else if (i <= 6) { ... } else if (i <= 9) { ... } else { ... }` — same four prints inside.",
  ],

  deflections: ["focus. rewrite the classification and clear the redundancy check."],
};

// ── Chapter 03 · Step 0 — Scaffold ──

const ch03ScaffoldBank: StepBank = {
  intro:
    "we're in the ventilation shaft now. the junction panels run javascript too.\n\nget the panel live by printing `Hello World`. one line — the file is the program.",

  conceptFAQ: [
    {
      keywords: ["main", "entry", "setup", "set up", "skeleton", "scaffold", "structure"],
      response: "no main, no wrapper. javascript starts at the top of the file and runs down.",
    },
    {
      keywords: ["print", "console", "output"],
      response: "`console.log(\"Hello World\");` — same one-liner as before.",
    },
    {
      keywords: ["function", "sumcodes", "validate"],
      response: "functions come next step. right now just get the panel live.",
    },
    {
      keywords: ["quote", "single", "double"],
      response: "`\"Hello World\"` or `'Hello World'` — both are fine in javascript. pick one style and use it everywhere.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "print `Hello World`. one line of `console.log`.",
    },
  ],

  codePatterns: [
    {
      match: hasCapitalConsole,
      response: "lowercase — `console.log`.",
    },
    {
      match: hasForeignPrint,
      response: "`print` isn't javascript. use `console.log(...)`.",
    },
    {
      match: (code) => hasLog(code) && /["'`]Hello World["'`]/.test(code),
      response: "terminal initialized. the shaft panel blinked green — it recognizes the program.\n\nnow i need you to write a function.\n\n||COMPLETE||",
    },
  ],

  outputPatterns: [
    {
      match: (output) => output.trim() !== "Hello World" && output.trim().toLowerCase() === "hello world",
      response: "capitals — `Hello World`, capital H, capital W.",
    },
    {
      match: (output) => hasHelloWorld(output) && lines(output).length > 1,
      response: "just the one line. `Hello World` and nothing else.",
    },
  ],

  correctResponse:
    "terminal initialized. the shaft panel blinked green — it recognizes the program.\n\nnow i need you to write a function.\n\n||COMPLETE||",

  genericWrong: [
    "the panel can't read that. one line: `console.log(\"Hello World\");`",
    "not quite. `console.log`, text in quotes, inside the brackets.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nconsole.log(\"Hello World\");\n```",
    "same one-liner as the last two terminals. `console.log` with `\"Hello World\"` inside.",
  ],

  deflections: ["just get a hello world on screen for now."],
};

// ── Chapter 03 · Step 1 — Sum Function ──

const ch03SumBank: StepBank = {
  intro:
    "good. panel's ready.\n\neach junction wants a code computed from its numbers, and the count changes from junction to junction. write a function `sumCodes` that takes any number of numbers — a rest parameter, `...codes` — and returns their sum.",

  conceptFAQ: [
    {
      keywords: ["rest param", "rest parameter", "...", "dots", "any number", "spread"],
      response:
        "`function sumCodes(...codes)` — the three dots gather every argument into one array called `codes`. call it with two numbers or twenty, it just works.",
    },
    {
      keywords: ["arguments"],
      response: "there's an old `arguments` object, but it isn't a real array and it has no name you chose. `...codes` is a real array — use that.",
    },
    {
      keywords: ["reduce"],
      response:
        "`codes.reduce((sum, c) => sum + c, 0)` sums in one line. the `0` is the starting value — leave it off and an empty call crashes.",
    },
    {
      keywords: ["for of", "for...of", "loop", "iterate", "each value"],
      response:
        "`for (const c of codes) { ... }` walks the array one value at a time. `c` is a fresh `const` each pass, so const is fine here.",
    },
    {
      keywords: ["sum", "add", "total", "+="],
      response: "start `let total = 0;`, add each value with `total += c;`, then `return total;`. `let` because the total keeps changing.",
    },
    {
      keywords: ["return", "undefined"],
      response: "`return total;` hands the value back to whoever called the function. without it the caller gets `undefined`.",
    },
    {
      keywords: ["print", "console"],
      response: "don't print inside `sumCodes` — just return the number. i run my own test calls and read what comes back.",
    },
    {
      keywords: ["call", "invoke", "test", "use sumcodes"],
      response:
        "i'll call it myself with the junction codes — `sumCodes(25, 30, 50, 10)` should come back 115. to try it yourself: `console.log(sumCodes(1, 2));`.",
    },
    {
      keywords: ["function", "define", "declare"],
      response: "`function name(params) { ... }` — the `function` keyword, a name, the parameters in brackets, the body in braces.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "write `function sumCodes(...codes) { ... }`. inside, start a total at 0, add every code to it, and return it.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => output.includes("Sum: undefined"),
      response: "the function ran but handed back nothing — `undefined`. add `return total;` after the loop.",
    },
    {
      match: (output) => output.includes("NaN"),
      response: "`NaN` means something that isn't a number got added — usually a total that was never set. start with `let total = 0;`.",
    },
    {
      match: (output) => /Sum: \[/.test(output),
      response: "you returned the array itself. add the values up and return the total.",
    },
    {
      match: (output) => {
        const ls = lines(output);
        return ls.length > 0 && ls.every((l) => l === "Sum: 0");
      },
      response: "every sum came back 0. is `total += c;` inside the loop, and are you returning `total`?",
    },
    {
      match: (output) => lines(output)[0] === "Sum: 25",
      response: "only the first code got counted — 25 instead of 115. is the `return` inside the loop? it has to come after the loop finishes.",
    },
    {
      match: (output) => /Sum: 0?25305010\b/.test(output),
      response: "the numbers got glued together like text. start the total at the number `0`, not a string.",
    },
  ],

  codePatterns: [
    {
      match: (code) => /\barguments\b/.test(stripComments(code)),
      response: "skip `arguments` — use a rest parameter: `function sumCodes(...codes)`.",
    },
    {
      match: (code) => !/\bsumCodes\b/.test(code),
      response: "i need a function named `sumCodes` — exact spelling, capital C.",
    },
    {
      match: (code) => !code.includes("..."),
      response: "sumCodes needs to accept any number of values. use a rest parameter: `...codes`.",
    },
    {
      match: (code) => !/\breturn\b|=>/.test(stripComments(code)),
      response: "the function needs to `return` the total.",
    },
    {
      match: (code) => /\bsumCodes\b/.test(code) && code.includes("..."),
      response: "sum function works. 115 — checks out. the first junction panel just ticked over.\n\nnow i need validation.\n\n||COMPLETE||",
    },
  ],

  correctResponse:
    "sum function works. 115 — checks out. the first junction panel just ticked over.\n\nnow i need validation.\n\n||COMPLETE||",

  genericWrong: [
    "not right. sumCodes needs a rest parameter and a loop that adds every value.",
    "the junction rejected it. check what your function returns.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nfunction sumCodes(...codes) {\n  let total = 0;\n  for (const c of codes) {\n    total += c;\n  }\n  return total;\n}\n```",
    "`let total = 0;` then `for (const c of codes) { total += c; }` then `return total;`.",
  ],

  deflections: ["focus on sumCodes. a rest parameter in, the sum out."],
};

// ── Chapter 03 · Step 2 — Validate ──

const ch03ValidateBank: StepBank = {
  intro:
    "sum works. the gate only opens if a junction's codes add up past 100. add `validateCode(...codes)` — reuse `sumCodes` for the total, then return both as an array: `[total, total > 100]`.",

  conceptFAQ: [
    {
      keywords: ["reuse", "call sumcodes", "use sumcodes", "spread"],
      response:
        "`const total = sumCodes(...codes);` — the `...` spreads the array back out into separate arguments. don't rewrite the loop, reuse it.",
    },
    {
      keywords: ["destructur", "unpack", "[s, v]"],
      response:
        "`const [s, v] = validateCode(25, 30);` — destructuring. the first item lands in `s`, the second in `v`, by position.",
    },
    {
      keywords: ["two values", "multiple", "return two", "both", "array", "tuple", "pair"],
      response:
        "a function returns one thing, so return an array: `return [total, total > 100];`. the caller unpacks it with `const [sum, valid] = validateCode(...)`.",
    },
    {
      keywords: ["bool", "boolean", "true", "false"],
      response: "`total > 100` already is `true` or `false`. return it directly — no if/else needed.",
    },
    {
      keywords: ["comparison", ">", "greater", "threshold", "why 100", "100"],
      response: "100 is the threshold. over 100 and the gate validates. `>` means strictly greater — exactly 100 doesn't pass.",
    },
    {
      keywords: ["print", "console"],
      response: "no printing inside — return the array. my test prints `Result: 115, Valid: true` from what you hand back.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "add `function validateCode(...codes) { ... }`. inside: `const total = sumCodes(...codes);` then `return [total, total > 100];`. keep sumCodes in the file.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => !output.trimStart().startsWith("Sum: 115"),
      response: "sumCodes broke — my first test call didn't come back 115. fix it before validateCode.",
    },
    {
      match: (output) => output.includes("Result: undefined"),
      response: "nothing came back. `validateCode` needs to `return [total, total > 100];`.",
    },
    {
      match: (output) => output.includes("Valid: undefined"),
      response: "the second value came back `undefined`. return both, in order: `return [total, total > 100];`.",
    },
    {
      match: (output) => /Result: (true|false)/.test(output),
      response: "they're in the wrong order. the total goes first, then the true/false: `[total, total > 100]`.",
    },
    {
      match: (output) => /Valid: (True|False)/.test(output),
      response: "javascript booleans are lowercase — `true` and `false`. return the comparison itself, not a string.",
    },
    {
      match: (output) => output.includes("Result: 115, Valid: false"),
      response: "115 came back invalid. over 100 should be `true` — is it `total > 100`, not `total < 100`?",
    },
  ],

  codePatterns: [
    {
      match: (code) => !/\bvalidateCode\b/.test(code),
      response: "i need a function named `validateCode` — exact spelling.",
    },
    {
      match: (code) => /["'](True|False)["']/.test(code),
      response: "don't return the words as strings. `total > 100` gives you a real boolean.",
    },
    {
      match: (code) => !/\breturn\b|=>/.test(stripComments(code)),
      response: "the function body needs a return statement.",
    },
    {
      match: (code) => /\bvalidateCode\b/.test(code) && /return\s*\[/.test(code),
      response: "junction codes accepted. sum checks out — over 100. the shaft gate's grinding open.\n\n||COMPLETE||",
    },
  ],

  correctResponse: "junction codes accepted. sum checks out — over 100. the shaft gate's grinding open.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. validateCode returns an array: the total, then whether it's over 100.",
    "the junction rejected it. check what your functions return.",
  ],

  rushDialogue: [
    "backup power is dropping. write the function. now.",
    "the lights are flickering. hurry.",
  ],

  stuckResponses: [
    "```\nfunction validateCode(...codes) {\n  const total = sumCodes(...codes);\n  return [total, total > 100];\n}\n```",
    "two lines inside: get the total from `sumCodes(...codes)`, then `return [total, total > 100];`.",
  ],

  deflections: ["focus on validateCode. return the total and whether it's over 100."],
};

// ══════════════════════════════════════════════════════
//  Act II
// ══════════════════════════════════════════════════════

const ROSTER_NAMES = ["Chen", "Alvarez", "Volkov", "Park", "Santos"];

/** `name` used as a roster key: `Chen:`, `"Chen":`, `r.Chen =`, `r["Chen"] =`. */
const hasRosterKey = (code: string, name: string) =>
  new RegExp(`["']?\\b${name}["']?\\s*:|\\.${name}\\s*=[^=]|\\[\\s*["']${name}["']\\s*\\]\\s*=[^=]`).test(code);

const hasReturn = (code: string) => /\breturn\b|=>/.test(stripComments(code));

// ── Chapter 04 · Step 0 — Scaffold ──

const ch04ScaffoldBank: StepBank = {
  intro:
    "the surveillance room. reeves photographed the guard schedule before they moved her — and this terminal is the only thing in here that can read it. it's asleep. wake it up: print `Hello World`.",

  conceptFAQ: [
    {
      keywords: ["main", "setup", "set up", "skeleton", "scaffold", "structure", "wrapper"],
      response: "no setup. the file is the program — one line and it runs.",
    },
    {
      keywords: ["import", "library", "require", "package"],
      response: "nothing to import this chapter. objects and sets are built into javascript.",
    },
    {
      keywords: ["print", "console", "output"],
      response: "`console.log(\"Hello World\");` — the same one-liner as every terminal so far.",
    },
    {
      keywords: ["object", "roster", "guard", "schedule", "floor"],
      response: "the roster comes next. right now just wake the terminal.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "print `Hello World`. one line of `console.log`.",
    },
  ],

  codePatterns: [
    {
      match: hasCapitalConsole,
      response: "lowercase — `console.log`.",
    },
    {
      match: hasForeignPrint,
      response: "`print` isn't javascript. use `console.log(...)`.",
    },
    {
      match: (code) => hasLog(code) && /["'`]Hello World["'`]/.test(code),
      response:
        "terminal's awake. the schedule is scrolling up the screen — five names, three floors. now we make sense of it.\n\n||COMPLETE||",
    },
    {
      match: (code) => !hasLog(code),
      response: "nothing came through. javascript prints with `console.log(...)`.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => output.trim() !== "Hello World" && output.trim().toLowerCase() === "hello world",
      response: "capitals — `Hello World`, capital H, capital W.",
    },
    {
      match: (output) => hasHelloWorld(output) && lines(output).length > 1,
      response: "just the one line. `Hello World` and nothing else.",
    },
  ],

  correctResponse:
    "terminal's awake. the schedule is scrolling up the screen — five names, three floors. now we make sense of it.\n\n||COMPLETE||",

  genericWrong: [
    "the terminal didn't stir. one line: `console.log(\"Hello World\");`",
    "not quite. `console.log`, text in quotes, inside the brackets.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nconsole.log(\"Hello World\");\n```",
    "same one-liner as the shaft panel. `console.log` with `\"Hello World\"` inside.",
  ],

  deflections: ["wake the terminal first. `Hello World`."],
};

// ── Chapter 04 · Step 1 — Guard roster ──

const ch04GuardmapBank: StepBank = {
  intro:
    "the schedule's up. i need every guard and their floor in one place, so i can look anyone up in an instant.\n\nwrite `buildRoster()` and have it return an object — each guard's name is a key, their floor is the value: `Chen` on `Floor 1`, `Alvarez` on `Floor 2`, `Volkov` on `Floor 2`, `Park` on `Floor 3`, `Santos` on `Floor 1`.\n\nthe terminal looks a few of them up and counts them.",

  conceptFAQ: [
    {
      keywords: ["map", "dictionary", "dict", "hash"],
      response:
        "javascript has a `Map` too, but the terminal reads a plain object — `r.Volkov`. on a `Map` that comes back `undefined`, because a Map keeps its entries behind `.get()`. return `{ Chen: \"Floor 1\", ... }`.",
    },
    {
      keywords: ["object", "key", "value", "pair", "literal"],
      response:
        "an object pairs keys with values: `{ Chen: \"Floor 1\" }`. the name is the key, the floor is the value. curly braces hold the pairs, commas split them.",
    },
    {
      keywords: ["quote"],
      response:
        "a key that's a plain name doesn't need quotes — `Chen: \"Floor 1\"` and `\"Chen\": \"Floor 1\"` make the same object. the value does: `\"Floor 1\"` is text.",
    },
    {
      keywords: ["comma", "trailing"],
      response:
        "commas go between the pairs. one pair per line reads best — and end the last one with a comma too. javascript allows it, and the next guard you add won't touch the line above.",
    },
    {
      keywords: ["look up", "lookup", "access", "dot", "bracket", "read a"],
      response:
        "`r.Volkov` and `r[\"Volkov\"]` read the same value. brackets are for when the key sits in a variable or has a space in it. a key that isn't there gives `undefined`.",
    },
    {
      keywords: ["count", "length", "how many", "size", "object.keys"],
      response:
        "objects have no `.length`. `Object.keys(r)` gives you an array of the names, and that array's `.length` is the count.",
    },
    {
      keywords: ["return", "undefined"],
      response:
        "`return { ... };` hands the whole object back. leave out the `return` and the terminal gets `undefined` — then reading `.Volkov` off it crashes.",
    },
    {
      keywords: ["function", "define", "declare"],
      response: "`function buildRoster() { return { ... }; }` — no parameters. it builds the roster and hands it back.",
    },
    {
      keywords: ["print", "console"],
      response: "don't print inside `buildRoster` — return the object. the terminal prints its own lookups.",
    },
    {
      keywords: ["guard", "names", "who", "roster", "floors"],
      response:
        "five guards: `Chen` on `Floor 1`, `Alvarez` on `Floor 2`, `Volkov` on `Floor 2`, `Park` on `Floor 3`, `Santos` on `Floor 1`. spell them exactly — capitals matter.",
    },
    {
      keywords: ["test", "harness", "how is it checked", "automatic"],
      response: "i call `buildRoster()` myself, look up volkov and chen, then count the guards. you only write the function.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "write `function buildRoster()` and return an object with all five guards — name as the key, floor as the value.",
    },
  ],

  outputPatterns: [
    {
      // a Map (or an empty object): lookups miss and Object.keys counts nothing
      match: (output) => lines(output).join("|") === "undefined|undefined|0",
      response:
        "the terminal looked up volkov and chen and found nobody — `undefined`, and a count of 0. if you built a `Map`, the terminal can't see inside it: it reads a plain object, `{ Chen: \"Floor 1\", ... }`. if it's already an object, the guards never made it in.",
    },
    {
      // an array of five things: no names to look up, but five entries
      match: (output) => lines(output).join("|") === "undefined|undefined|5",
      response:
        "the count is 5, but both lookups came back `undefined`. did you return a list? the terminal needs an object so it can ask for a guard by name: `{ Chen: \"Floor 1\", ... }`.",
    },
    {
      match: (output) => /^floor \d$/i.test(lines(output)[0] ?? "") && !/^Floor \d$/.test(lines(output)[0] ?? ""),
      response: "the terminal matches floors exactly — capital F: `\"Floor 2\"`.",
    },
    {
      match: (output) => /^\d+$/.test(lines(output)[0] ?? ""),
      response: "the floors are text, not numbers: `Volkov: \"Floor 2\"`, not `Volkov: 2`.",
    },
    {
      match: (output) => lines(output)[0] === "undefined",
      response: "volkov came back `undefined` — that key isn't in the roster. check the spelling and the capital: `Volkov`.",
    },
    {
      match: (output) => lines(output)[1] === "undefined",
      response: "chen came back `undefined`. check that key — `Chen`, capital C.",
    },
    {
      match: (output) => {
        const ls = lines(output);
        return ls[0] === "Floor 2" && ls[1] === "Floor 1" && /^\d+$/.test(ls[2] ?? "") && ls[2] !== "5";
      },
      response:
        "the lookups work, but the count is off. i need exactly five guards — `Chen`, `Alvarez`, `Volkov`, `Park`, `Santos` — each one once.",
    },
  ],

  codePatterns: [
    {
      match: (code) => !/\bbuildRoster\b/.test(code),
      response: "i need a function named `buildRoster` — exact spelling, capital R.",
    },
    {
      match: (code) => /\bnew\s+Map\b/.test(stripComments(code)),
      response: "skip the `Map` for this one. the terminal reads a plain object — `return { Chen: \"Floor 1\", ... };`.",
    },
    {
      match: (code) => !hasReturn(code),
      response: "buildRoster has to `return` the object — otherwise the terminal gets `undefined`.",
    },
    {
      match: (code) => !ROSTER_NAMES.every((n) => hasRosterKey(stripComments(code), n)),
      response: "i don't see all five guards as keys. `Chen`, `Alvarez`, `Volkov`, `Park`, `Santos` — each one paired with a floor.",
    },
    {
      match: (code) => /\bbuildRoster\b/.test(code) && hasReturn(code) && ROSTER_NAMES.every((n) => hasRosterKey(stripComments(code), n)),
      response:
        "roster's in. volkov, floor 2. chen, floor 1. five guards, and i can find any of them in an instant.\n\n||COMPLETE||",
    },
  ],

  correctResponse:
    "roster's in. volkov, floor 2. chen, floor 1. five guards, and i can find any of them in an instant.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. `buildRoster` returns an object — five guards, name as the key, floor as the value.",
    "the terminal looks up volkov and chen and counts the guards. make sure all five are in there, spelled exactly.",
  ],

  rushDialogue: [
    "the camera's turning. build the roster.",
    "hurry — return the object with all five guards.",
  ],

  stuckResponses: [
    "```\nfunction buildRoster() {\n  return {\n    Chen: \"Floor 1\",\n    Alvarez: \"Floor 2\",\n    Volkov: \"Floor 2\",\n    Park: \"Floor 3\",\n    Santos: \"Floor 1\",\n  };\n}\n```",
    "one function, one `return`, one object literal. curly braces, `Name: \"Floor N\"` pairs, a comma after each.",
  ],

  deflections: ["focus on the roster. five guards, one object."],
};

// ── Chapter 04 · Step 2 — Clear floor ──

const ch04ClearfloorsBank: StepBank = {
  intro:
    "roster's in. now find the one floor nobody's watching — that's where i move next.\n\nwrite `findClearFloor(guards, maxFloor)`. put every floor that has a guard into a `Set`, then check `Floor 1` up to `Floor maxFloor` and return the first one the set doesn't have.",

  conceptFAQ: [
    {
      keywords: ["what is a set", "new set", "a set", "set?", "sets"],
      response:
        "a `Set` holds each value once and answers `.has(x)` straight away. `new Set(Object.values(guards))` is every floor with a guard on it — floor 2 is in the roster twice, but once in the set.",
    },
    {
      keywords: ["object.values", "values", "just the floors", "floors out", "without the names"],
      response:
        "`Object.values(guards)` hands you an array of the values — the floors — and leaves the names behind. you don't need the names here.",
    },
    {
      keywords: ["has", "check", "member", "contains", "includes", "not in"],
      response:
        "`occupied.has(name)` is true when a guard is on that floor. you want the floor where it's false: `if (!occupied.has(name))` — the `!` flips true and false. an array's `.includes` works too, but it walks the whole list every time you ask.",
    },
    {
      keywords: ["loop", "for", "1 to", "maxfloor", "up to"],
      response:
        "`for (let i = 1; i <= maxFloor; i++)` — `<=`, so the last floor gets checked too. same counting loop as the door keypad.",
    },
    {
      keywords: ["template", "floor name", "build the name", "backtick", "string"],
      response:
        "a template literal builds the name: ``const name = `Floor ${i}`;`` — backticks, and the number drops in where `${i}` sits.",
    },
    {
      keywords: ["return", "first", "early", "stop"],
      response:
        "`return name;` inside the loop ends the whole function the moment you find a gap. the first clear floor wins — nothing after it runs.",
    },
    {
      keywords: ["object of true", "true", "fake"],
      response: "you could fake a set with an object full of `true` values — some languages have to. javascript has a real `Set`. use it.",
    },
    {
      keywords: ["print", "console"],
      response: "return the floor's name — don't print it. the terminal prints what comes back.",
    },
    {
      keywords: ["test", "harness", "different", "other roster"],
      response:
        "the terminal tries three rosters, not just ours. work everything out from `guards` and `maxFloor` — no floor names typed in by hand.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "write `findClearFloor(guards, maxFloor)`. a Set of the occupied floors, a loop from 1 to maxFloor, and return the first name the set doesn't have.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => {
        const ls = lines(output);
        return ls.length > 0 && ls.every((l) => l === "undefined");
      },
      response: "nothing came back — `undefined` every time. `return name;` the moment you find a floor the set doesn't have.",
    },
    {
      match: (output) => {
        const ls = lines(output);
        return ls[0] === "undefined" && ls[1] === "Floor 2";
      },
      response:
        "the first roster came back `undefined`. floors 1 to 3 all have guards, so the gap is floor 4 — the last one. does your loop stop at `i < maxFloor`? make it `i <= maxFloor`.",
    },
    {
      match: (output) => /Floor\d/.test(output),
      response: "the space went missing — `Floor4`. build the name with it: `` const name = `Floor ${i}`; ``",
    },
    {
      match: (output) => {
        const ls = lines(output);
        return ls.length === 3 && ls.every((l) => l === "Floor 1");
      },
      response:
        "every roster came back `Floor 1` — but floor 1 has a guard every time. either the check is flipped (you want `!occupied.has(name)`), or the set holds the wrong things. fill it from `Object.values(guards)` — the floors, not the names — and ask it about the floor's name, not the number `i`.",
    },
    {
      match: (output) => {
        const ls = lines(output);
        return ls.length === 3 && ls.every((l) => l === "Floor 4");
      },
      response: "`Floor 4` every time — the terminal tries other rosters too. work the answer out from `guards`, don't type it in.",
    },
    {
      match: (output) => /Floor 0/.test(output),
      response: "there's no floor 0. start the loop at 1: `for (let i = 1; i <= maxFloor; i++)`.",
    },
  ],

  codePatterns: [
    {
      match: (code) => !/\bfindClearFloor\b/.test(code),
      response: "i need a function named `findClearFloor` — it takes `guards` and `maxFloor`.",
    },
    {
      match: (code) => /\breturn\s*["'`]Floor \d["'`]/.test(stripComments(code)),
      response: "don't hand back a fixed floor. the terminal tries other rosters — work it out from `guards`.",
    },
    {
      match: (code) => !/\bnew\s+Set\b/.test(stripComments(code)),
      response: "collect the occupied floors into a Set first: `const occupied = new Set(Object.values(guards));`.",
    },
    {
      match: (code) => !/\.\s*has\s*\(/.test(stripComments(code)),
      response: "ask the set about each floor: `if (!occupied.has(name)) return name;`.",
    },
    {
      // maxFloor only in the parameter list — the loop never uses it
      match: (code) => !/\bmaxFloor\b/.test(stripComments(code).replace(/\bfindClearFloor\s*(?:=\s*)?(?:function\s*)?\([^)]*\)/g, "")),
      response: "loop up to the floor count you're given — `for (let i = 1; i <= maxFloor; i++)`.",
    },
    {
      match: (code) => !hasReturn(code),
      response: "findClearFloor has to `return` the first clear floor's name.",
    },
    {
      match: (code) => /\bfindClearFloor\b/.test(code) && /\bnew\s+Set\b/.test(code) && /\.\s*has\s*\(/.test(code) && hasReturn(code),
      response: "floor 4. nobody's on it. that's our window — forty minutes before the next sweep.\n\n||COMPLETE||",
    },
  ],

  correctResponse: "floor 4. nobody's on it. that's our window — forty minutes before the next sweep.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. a Set of the occupied floors, a loop from 1 to maxFloor, return the first one the set doesn't have.",
    "the terminal tries different rosters. make sure your logic works for any of them, not just ours.",
  ],

  rushDialogue: [
    "reeves is waiting on the floor. finish the function.",
    "the window's closing. find the gap.",
  ],

  stuckResponses: [
    "```\nfunction findClearFloor(guards, maxFloor) {\n  const occupied = new Set(Object.values(guards));\n  for (let i = 1; i <= maxFloor; i++) {\n    const name = `Floor ${i}`;\n    if (!occupied.has(name)) return name;\n  }\n}\n```",
    "three moves: `new Set(Object.values(guards))` for the occupied floors, a loop from 1 to maxFloor, and `return` the first name `.has` says no to.",
  ],

  deflections: ["focus. which floor is clear?"],
};

// ── Chapter 04.2 · Step 0 — Scaffold ──

const ch04_2ScaffoldBank: StepBank = {
  intro:
    "the comms room. ghost's scanners sweep every message for keywords, every thirty seconds. bring this terminal online before the next sweep — print `Hello World`.\n\nnothing to import. everything the cipher needs is built into javascript.",

  conceptFAQ: [
    {
      keywords: ["import", "library", "require", "package", "strings", "convert"],
      response:
        "nothing to import. `split`, `join`, `reverse` and `Number` come with every string and array in javascript.",
    },
    {
      keywords: ["main", "setup", "set up", "skeleton", "scaffold", "structure"],
      response: "no setup. the file is the program — one line and it runs.",
    },
    {
      keywords: ["print", "console", "output"],
      response: "`console.log(\"Hello World\");` — the same one-liner.",
    },
    {
      keywords: ["cipher", "reverse", "encode", "scanner", "keyword"],
      response: "the cipher comes next. first get the relay online.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "print `Hello World`. one line of `console.log`.",
    },
  ],

  codePatterns: [
    {
      match: hasCapitalConsole,
      response: "lowercase — `console.log`.",
    },
    {
      match: hasForeignPrint,
      response: "`print` isn't javascript. use `console.log(...)`.",
    },
    {
      match: (code) => hasLog(code) && /["'`]Hello World["'`]/.test(code),
      response: "relay's online. no scanner flag yet. now we build the cipher.\n\n||COMPLETE||",
    },
    {
      match: (code) => !hasLog(code),
      response: "nothing came through. javascript prints with `console.log(...)`.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => output.trim() !== "Hello World" && output.trim().toLowerCase() === "hello world",
      response: "capitals — `Hello World`, capital H, capital W.",
    },
    {
      match: (output) => hasHelloWorld(output) && lines(output).length > 1,
      response: "just the one line. `Hello World` and nothing else.",
    },
  ],

  correctResponse: "relay's online. no scanner flag yet. now we build the cipher.\n\n||COMPLETE||",

  genericWrong: [
    "the relay didn't answer. one line: `console.log(\"Hello World\");`",
    "not quite. `console.log`, text in quotes, inside the brackets.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nconsole.log(\"Hello World\");\n```",
    "same one-liner as every terminal so far. `console.log` with `\"Hello World\"` inside.",
  ],

  deflections: ["get the relay online first. `Hello World`."],
};

// ── Chapter 04.2 · Step 1 — Reverse a word ──

const ch04_2ReversewordBank: StepBank = {
  intro:
    "relay's live. first piece of the cipher: scramble one word so ghost's scanners can't recognise it.\n\nwrite `reverseWord(s)` — it returns the word backwards. strings can't reverse themselves, so spread the word into characters with `[...s]`, reverse that, and join it back.",

  conceptFAQ: [
    {
      keywords: ["spread", "[...s]", "...", "dots", "characters", "array of"],
      response:
        "`[...s]` spreads the string into an array, one whole character per slot. `[...\"hello\"]` is `[\"h\", \"e\", \"l\", \"l\", \"o\"]`.",
    },
    {
      keywords: ["split", "emoji", "why not split"],
      response:
        "`s.split(\"\")` works for plain letters, but it cuts some characters — emoji, for one — into two broken halves. reverse those and you get garbage. `[...s]` keeps every character whole.",
    },
    {
      keywords: ["reverse", "backwards", "flip"],
      response:
        "arrays have `.reverse()`. strings don't — that's why you spread first. `[...s].reverse()` is the characters, last to first.",
    },
    {
      keywords: ["join", "back into", "string again", "glue"],
      response:
        "`.join(\"\")` glues the characters back into a string with nothing between them. leave the `\"\"` out and you get commas.",
    },
    {
      keywords: ["not a function", "s.reverse", "change the string", "immutable"],
      response:
        "a string can't be changed in place, and it has no `.reverse`. turn it into an array first, reverse that, then join it back into a new string.",
    },
    {
      keywords: ["array.from"],
      response: "`Array.from(s)` does the same as `[...s]` — whole characters. either one is fine.",
    },
    {
      keywords: ["return", "undefined"],
      response: "`return [...s].reverse().join(\"\");` — hand the new string back. without `return` the terminal gets `undefined`.",
    },
    {
      keywords: ["chain", "one line"],
      response: "each step hands its result to the next: spread, then `.reverse()`, then `.join(\"\")`. one line, read left to right.",
    },
    {
      keywords: ["print", "console"],
      response: "return the reversed word — don't print it. the terminal prints what comes back.",
    },
    {
      keywords: ["test", "harness", "which words"],
      response: "the terminal tries \"hello\", \"Go\" and a single letter. your function has to work for any word.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "write `function reverseWord(s)`. spread it, reverse it, join it, return it.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => /^[^,\s]+(,[^,\s]+)+$/m.test(output),
      response: "commas between the letters — `.join()` with nothing inside glues with commas. pass an empty string: `.join(\"\")`.",
    },
    {
      match: (output) => lines(output)[0] === "hello",
      response: "the word came back unchanged. did you call `.reverse()` on the spread array?",
    },
    {
      match: (output) => lines(output)[0] === "undefined",
      response: "nothing came back — `undefined`. `return` the reversed word.",
    },
  ],

  codePatterns: [
    {
      match: (code) => !/\breverseWord\b/.test(code),
      response: "i need a function named `reverseWord` — capital W.",
    },
    {
      match: (code) => /\.\s*join\s*\(\s*\)/.test(stripComments(code)),
      response: "`.join()` with nothing inside glues with commas. pass an empty string: `.join(\"\")`.",
    },
    {
      match: (code) => !/\.\s*reverse\s*\(/.test(stripComments(code)) && !/\b(for|while)\b/.test(stripComments(code)),
      response: "nothing reverses the characters yet. spread the word and call `.reverse()`: `[...s].reverse()`.",
    },
    {
      match: (code) => !hasReturn(code),
      response: "reverseWord has to `return` the reversed word.",
    },
    {
      match: (code) => /\breverseWord\b/.test(code) && hasReturn(code) && /\.\s*reverse\s*\(/.test(code) && /\.\s*join\s*\(/.test(code),
      response: "`olleh`. `oG`. the cipher works — one word at a time.\n\n||COMPLETE||",
    },
  ],

  correctResponse: "`olleh`. `oG`. the cipher works — one word at a time.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. spread the word into characters, reverse them, join them back.",
    "the terminal tries several words. `return [...s].reverse().join(\"\");` works for all of them.",
  ],

  rushDialogue: [
    "the scanner's due. scramble the word.",
    "hurry — spread, reverse, join.",
  ],

  stuckResponses: [
    "```\nfunction reverseWord(s) {\n  return [...s].reverse().join(\"\");\n}\n```",
    "three moves in one line: `[...s]` makes an array of characters, `.reverse()` flips it, `.join(\"\")` makes it a string again.",
  ],

  deflections: ["focus on the cipher. one word, backwards."],
};

// ── Chapter 04.2 · Step 2 — Encode a message ──

const ch04_2EncodeBank: StepBank = {
  intro:
    "one word works. now whole messages — and reeves has to be able to unscramble them on her end.\n\nwrite `encode(msg)`: split the message into words, reverse each one with `reverseWord`, and join them back with spaces. run it twice and you get the original — that's how she decodes.",

  conceptFAQ: [
    {
      keywords: ["split", "words", "break"],
      response: "`msg.split(\" \")` cuts the message at every space and hands back an array of words.",
    },
    {
      keywords: ["map", "each word", "every word", "transform"],
      response:
        "`.map(reverseWord)` runs your function on every word and gives back a new array of the results. the old array isn't touched.",
    },
    {
      keywords: ["no brackets", "reverseword()", "pass a function", "pass the function", "without calling"],
      response:
        "`.map(reverseWord)` — no brackets after the name. you're handing map the function itself, and map calls it once per word. `reverseWord()` would call it right there, with nothing.",
    },
    {
      keywords: ["arrow", "=>"],
      response:
        "`.map((w) => reverseWord(w))` does the same thing, spelled out — an arrow function that takes a word and returns it reversed. when it only passes the word along, `.map(reverseWord)` says it shorter.",
    },
    {
      keywords: ["join", "glue", "spaces back"],
      response: "`.join(\" \")` — the string you pass goes between every word. a space, so the message reads like one.",
    },
    {
      keywords: ["loop", "push", "for"],
      response:
        "a loop that pushes each reversed word into a new array works. `.map` is that whole loop in one call — and it can't forget to push.",
    },
    {
      keywords: ["round trip", "twice", "decode", "original"],
      response:
        "reverse a reversed word and you're back where you started. so `encode(encode(x))` is `x` — reeves decodes by running the same function.",
    },
    {
      keywords: ["reverseword", "reuse", "keep"],
      response: "keep `reverseWord` in the file — encode calls it for every word. don't write the reversing twice.",
    },
    {
      keywords: ["return", "undefined"],
      response: "`return msg.split(\" \").map(reverseWord).join(\" \");` — return the joined string.",
    },
    {
      keywords: ["test", "harness", "which messages"],
      response: "the terminal encodes two messages, then encodes one twice to check it comes back whole.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "write `function encode(msg)`. split into words, map each through reverseWord, join with spaces.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => lines(output)[0] === "raelc si roolf",
      response:
        "you reversed the whole message — the words came out in the wrong order too. split it into words first, then reverse each word on its own.",
    },
    {
      match: (output) => /\w,\w/.test(lines(output)[0] ?? ""),
      response: "commas between the words — `.join()` with nothing inside uses commas. pass a space: `.join(\" \")`.",
    },
    {
      match: (output) => lines(output)[0] === "roolfsiraelc",
      response: "the spaces vanished. join the words with a space: `.join(\" \")`.",
    },
    {
      match: (output) => lines(output)[0] === "floor is clear",
      response:
        "the message came back unchanged. `.map` doesn't change the old array — it gives back a new one. use what it returns: `msg.split(\" \").map(reverseWord).join(\" \")`.",
    },
    {
      match: (output) => lines(output)[0] === "undefined",
      response: "nothing came back — `undefined`. `return` the joined string.",
    },
  ],

  codePatterns: [
    {
      match: (code) => !/\bencode\b/.test(code),
      response: "i need a function named `encode`.",
    },
    {
      match: (code) => !/\bfunction\s+reverseWord\b|\b(?:const|let)\s+reverseWord\s*=/.test(stripComments(code)),
      response: "keep `reverseWord` in the file — encode reuses it for every word.",
    },
    {
      match: (code) => /\.\s*map\s*\(\s*reverseWord\s*\(\s*\)/.test(stripComments(code)),
      response: "no brackets inside map — `.map(reverseWord)`. you're handing over the function, not calling it.",
    },
    {
      match: (code) => !/\.\s*split\s*\(/.test(stripComments(code)) || !/\.\s*join\s*\(/.test(stripComments(code)),
      response: "split the message into words, and join them back: `msg.split(\" \")` and `.join(\" \")`.",
    },
    {
      match: (code) => !hasReturn(code),
      response: "encode has to `return` the scrambled message.",
    },
    {
      match: (code) => /\bencode\b/.test(code) && /\breverseWord\b/.test(code) && /\.\s*split\s*\(/.test(code) && /\.\s*join\s*\(/.test(code) && hasReturn(code),
      response:
        "roolf si raelc. and encoded twice it comes back whole — reeves can decode on her end with the same function.\n\n||COMPLETE||",
    },
  ],

  correctResponse:
    "roolf si raelc. and encoded twice it comes back whole — reeves can decode on her end with the same function.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. split into words, reverse each with reverseWord, join with spaces.",
    "the round trip has to work — `encode(encode(x))` gives back `x`. check each piece.",
  ],

  rushDialogue: [
    "comms intercept. encode it. now.",
    "they're listening. split, map, join.",
  ],

  stuckResponses: [
    "```\nfunction encode(msg) {\n  return msg.split(\" \").map(reverseWord).join(\" \");\n}\n```",
    "one chain: `msg.split(\" \")` for the words, `.map(reverseWord)` to flip each, `.join(\" \")` to put them back together.",
  ],

  deflections: ["focus on the cipher. whole messages now."],
};

// ── Chapter 04.2 · Step 3 — Relay header ──

const ch04_2RelayheaderBank: StepBank = {
  intro:
    "the cipher holds. last piece: every message gets a header saying where it's going — and the relay can't choke on garbage.\n\nwrite `relayHeader(floor, code)`. `code` arrives as text: turn it into a number with `Number(code)`, double it, and return `` `F${floor}-C${n * 2}` ``. if the code isn't a number you get `NaN` — return `` `F${floor}-ERR` `` instead.",

  conceptFAQ: [
    {
      keywords: ["number(", "convert", "text to number", "string to number", "turn it into"],
      response:
        "`Number(\"50\")` gives you the number 50. a template literal turns it back into text for you when you build the header.",
    },
    {
      keywords: ["nan", "not a number", "abc"],
      response:
        "`Number(\"abc\")` doesn't crash — it hands back `NaN`, \"not a number\". javascript poisons the value instead of raising an error, so you have to check for it yourself.",
    },
    {
      keywords: ["isnan", "check", "detect", "=== nan"],
      response:
        "`Number.isNaN(n)`. not `n === NaN` — NaN isn't equal to anything, not even itself, so that check is always false. and skip the old global `isNaN` — it converts first and says yes to things that were never a number value.",
    },
    {
      keywords: ["parseint", "parse"],
      response:
        "`parseInt(\"12abc\")` quietly gives 12 — it reads digits until it hits something else and drops the rest. the relay would stamp garbage as a real code. `Number` rejects the whole thing.",
    },
    {
      keywords: ["try", "catch", "throw", "exception", "error"],
      response:
        "a `try`/`catch` won't help here — `Number` never throws. the bad value comes back as `NaN`, so check it with `Number.isNaN(n)` and return the ERR header.",
    },
    {
      keywords: ["template", "header", "format", "backtick"],
      response:
        "a template literal builds it: ``return `F${floor}-C${n * 2}`;`` — the values drop in where the `${}` sit, numbers and all.",
    },
    {
      keywords: ["double", "times 2", "* 2", "checksum"],
      response: "the relay doubles the code as a checksum. 50 goes out as `C100`. do the maths on the number, after `Number(code)`.",
    },
    {
      keywords: ["floor", "first part"],
      response: "`floor` is already a number. drop it straight into the template — `F${floor}` — no converting needed.",
    },
    {
      keywords: ["order", "first", "early return"],
      response:
        "check the bad case first: ``if (Number.isNaN(n)) return `F${floor}-ERR`;`` — then the last line only ever sees a real number.",
    },
    {
      keywords: ["print", "console"],
      response: "return the header — don't print it. the terminal prints what comes back.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "write `function relayHeader(floor, code)`. `const n = Number(code);`, return the ERR header if `Number.isNaN(n)`, otherwise the header with `n * 2`.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => /NaN/.test(output),
      response:
        "`F3-CNaN` — the bad code slipped straight through. javascript doesn't throw on `Number(\"abc\")`, it hands back `NaN`. check ``if (Number.isNaN(n)) return `F${floor}-ERR`;`` before you build the header.",
    },
    {
      match: (output) => /C5050/.test(output),
      response: "`C5050` — the code got glued to itself like text. turn it into a number first: `Number(code)`, then `n * 2`.",
    },
    {
      match: (output) => lines(output)[0] === "F2-C50",
      response: "the code went out as-is. the relay wants it doubled: `n * 2`.",
    },
    {
      match: (output) => /-C0\b/.test(output) && lines(output)[0] === "F2-C100",
      response: "`abc` isn't 0 — it's garbage, and the relay has to say so. when `Number.isNaN(n)`, return the ERR header.",
    },
    {
      match: (output) => {
        const ls = lines(output);
        return ls.length === 3 && ls.every((l) => /^F\d-ERR$/.test(l));
      },
      response:
        "every header came back ERR — even the good codes. is the check flipped? `Number.isNaN(n)` is true for the bad one only. and `code` always arrives as text, so checking its type won't tell you anything — convert it first.",
    },
    {
      match: (output) => /^F\dC/m.test(output) || /^F\d-\d/m.test(output),
      response: "check the format character for character: `F2-C100`. an `F`, the floor, a dash, a `C`, the doubled code.",
    },
    {
      match: (output) => lines(output)[0] === "undefined",
      response: "nothing came back — `undefined`. `return` the header.",
    },
  ],

  codePatterns: [
    {
      match: (code) => !/\brelayHeader\b/.test(code),
      response: "i need a function named `relayHeader` — it takes `floor` and `code`.",
    },
    {
      match: (code) => /\bparse(Int|Float)\s*\(/.test(stripComments(code)),
      response:
        "skip `parseInt` — `parseInt(\"12abc\")` quietly gives 12, so garbage gets stamped as a real code. use `Number(code)`: it turns the whole bad string into `NaN`.",
    },
    {
      match: (code) => /[=!]==?\s*NaN\b|\bNaN\s*[=!]==?/.test(stripComments(code)),
      response: "`=== NaN` is never true — NaN isn't equal to anything, not even itself. check with `Number.isNaN(n)`.",
    },
    {
      match: (code) => !/\bNumber\s*\(/.test(stripComments(code)),
      response: "`code` is text. turn it into a number first: `const n = Number(code);`.",
    },
    {
      match: (code) => !/\bisNaN\s*\(/.test(stripComments(code)),
      response: "a bad code turns into `NaN` and slips straight through. catch it: ``if (Number.isNaN(n)) return `F${floor}-ERR`;``",
    },
    {
      match: (code) => !/ERR/.test(code),
      response: "when the code is bad, return the ERR header: `` `F${floor}-ERR` ``.",
    },
    {
      match: (code) => !hasReturn(code),
      response: "relayHeader has to `return` the header.",
    },
    {
      match: (code) => /\brelayHeader\b/.test(code) && /\bNumber\s*\(/.test(code) && /\bisNaN\s*\(/.test(code) && /ERR/.test(code) && hasReturn(code),
      response: "`F2-C100`. `F3-ERR`. `F1-C50`. headers stamped, garbage flagged. the relay is live.\n\n||COMPLETE||",
    },
  ],

  correctResponse: "`F2-C100`. `F3-ERR`. `F1-C50`. headers stamped, garbage flagged. the relay is live.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. `Number(code)`, check `Number.isNaN`, then build the header with the doubled code.",
    "check the format: `F2-C100` for a good code, `F3-ERR` for a bad one.",
  ],

  rushDialogue: [
    "scanner sweep in thirty seconds. finish the headers.",
    "no time — `Number(code)`, check for NaN, return the header.",
  ],

  stuckResponses: [
    "```\nfunction relayHeader(floor, code) {\n  const n = Number(code);\n  if (Number.isNaN(n)) return `F${floor}-ERR`;\n  return `F${floor}-C${n * 2}`;\n}\n```",
    "three lines: `const n = Number(code);`, then return the ERR header if `Number.isNaN(n)`, then return the header with `n * 2`.",
  ],

  deflections: ["focus. the headers, before the sweep."],
};

// ══════════════════════════════════════════════════════
//  Act III
// ══════════════════════════════════════════════════════
// Every Act III step grades by expectedOutput on the sandbox's virtual clock,
// so outputPatterns carry the near misses. Many classic mistakes here never
// reach them — `setTimeout(resolve(x), ms)` throws, a race with no deadline
// leaves the top-level await unsettled — and those come back as runtime
// errors; the codePatterns below are the offline fallback for them.

/** The body of a named function (comments stripped), or "" — enough for pattern checks. */
function fnBody(code: string, name: string): string {
  const c = stripComments(code);
  const m = new RegExp(`\\b(?:function\\s+${name}\\s*\\(|(?:const|let|var)\\s+${name}\\s*=)`).exec(c);
  if (!m) return "";
  const open = c.indexOf("{", m.index);
  if (open === -1) return c.slice(m.index);
  let depth = 0;
  for (let i = open; i < c.length; i++) {
    if (c[i] === "{") depth++;
    else if (c[i] === "}" && --depth === 0) return c.slice(open, i + 1);
  }
  return c.slice(open);
}

const defines = (code: string, name: string) =>
  new RegExp(`\\bfunction\\s+${name}\\s*\\(|\\b(?:const|let|var)\\s+${name}\\s*=`).test(stripComments(code));

/** An Act III scaffold: same one-liner, new terminal. */
function act3Scaffold(intro: string, done: string, next: { keywords: string[]; response: string }, deflection: string): StepBank {
  const correct = `${done}\n\n||COMPLETE||`;
  return {
    intro,
    conceptFAQ: [
      {
        keywords: ["import", "library", "require", "package", "install"],
        response: "nothing to import. everything this chapter uses is built into javascript.",
      },
      {
        keywords: ["main", "setup", "set up", "skeleton", "scaffold", "structure"],
        response: "no setup. the file is the program — one line and it runs.",
      },
      {
        keywords: ["print", "console", "output"],
        response: "`console.log(\"Hello World\");` — the same one-liner as every terminal so far.",
      },
      next,
      {
        keywords: ["kira", "who is she", "trust"],
        response: "i don't know yet. she knows this building better than i do, and she wants something for it. wake the terminal first.",
      },
      {
        keywords: ["what do i do", "what should i do", "what now", "where do i start"],
        response: "print `Hello World`. one line of `console.log`.",
      },
    ],
    codePatterns: [
      { match: hasCapitalConsole, response: "lowercase — `console.log`." },
      { match: hasForeignPrint, response: "`print` isn't javascript. use `console.log(...)`." },
      { match: (code) => hasLog(code) && /["'`]Hello World["'`]/.test(code), response: correct },
      { match: (code) => !hasLog(code), response: "nothing came through. javascript prints with `console.log(...)`." },
    ],
    outputPatterns: [
      {
        match: (output) => output.trim() !== "Hello World" && output.trim().toLowerCase() === "hello world",
        response: "capitals — `Hello World`, capital H, capital W.",
      },
      {
        match: (output) => hasHelloWorld(output) && lines(output).length > 1,
        response: "just the one line. `Hello World` and nothing else.",
      },
    ],
    correctResponse: correct,
    genericWrong: [
      "the terminal didn't stir. one line: `console.log(\"Hello World\");`",
      "not quite. `console.log`, text in quotes, inside the brackets.",
    ],
    rushDialogue: [],
    stuckResponses: [
      "```\nconsole.log(\"Hello World\");\n```",
      "same one-liner as every terminal so far. `console.log` with `\"Hello World\"` inside.",
    ],
    deflections: [deflection],
  };
}

// ── Chapter 07 · Step 0 — Scaffold ──

const ch07ScaffoldBank = act3Scaffold(
  "the server room. somewhere in this archive is my thesis — and the night cycle locks this terminal in a few minutes. wake it up: print `Hello World`.",
  "archive terminal's up. directories everywhere, nested inside each other. now we count what's in there.",
  {
    keywords: ["archive", "thesis", "directory", "folder", "tree", "scan"],
    response: "the archive scan comes next. right now just wake the terminal.",
  },
  "wake the archive terminal first. `Hello World`.",
);

// ── Chapter 07 · Step 1 — Scan ──

const SCAN_CORRECT =
  "nine files. the walk went all the way down and came back up — logs, the three servers, then root, last out. thesis drafts in alpha and gamma.\n\n||COMPLETE||";

const ch07ScanBank: StepBank = {
  intro:
    "i need to know which server holds my thesis, and the archive is folders inside folders, as deep as it likes. count every file.\n\nwrite `scanArchive(archive, root)`. inside it, `let count = 0;` and an inner function `scan(dir)` that walks one directory: a name ending in `/` is another directory — call `scan` on it — anything else is a file, `count++`. wrap the walk in `try { … } finally { console.log(\"scanned:\", dir); }` and return `count`.",

  conceptFAQ: [
    {
      keywords: ["closure", "inner function", "capture", "remember", "outer variable"],
      response:
        "a function made inside another one can see the outer function's variables — and keeps seeing them. `scan` lives inside scanArchive, so `count++` in scan changes the very `count` scanArchive returns. that's a closure.",
    },
    {
      keywords: ["recursion", "recursive", "call itself", "itself", "nested", "deep"],
      response:
        "a function can call itself. `scan(\"servers\")` finds `alpha/` and calls `scan(\"alpha\")`, which runs to the end and hands control back. each call has its own `dir`, so nobody loses their place.",
    },
    {
      keywords: ["stop", "infinite", "base case", "end"],
      response: "the recursion stops on its own: a directory with only files never calls scan again. files are the bottom of the tree.",
    },
    {
      keywords: ["finally", "try", "after", "on the way out", "cleanup"],
      response:
        "`finally` runs when the `try` block is done — however it ends. put the log there and every directory reports as its call finishes. that's why the deepest folders print first and `scanned: root` prints last.",
    },
    {
      keywords: ["slash", "endswith", "directory or file", "tell apart", "trailing"],
      response: "`entry.endsWith(\"/\")` is true for a directory. strip the slash before you look it up: `entry.slice(0, -1)` — `\"logs/\"` becomes `\"logs\"`.",
    },
    {
      keywords: ["not iterable", "undefined", "logs/"],
      response:
        "`archive[\"logs/\"]` doesn't exist — the keys have no slash. cut it off first: `scan(entry.slice(0, -1))`.",
    },
    {
      keywords: ["order", "why root last", "post"],
      response: "root starts first but it can't finish until every folder inside it has finished. the `finally` fires on the way out, so root is the last one out.",
    },
    {
      keywords: ["parameter", "pass count", "argument", "copy"],
      response:
        "don't pass `count` into scan as an argument. a number arrives as a copy — scan would bump its own copy and the real count would never move. let the closure share it.",
    },
    {
      keywords: ["global", "outside", "top of the file"],
      response:
        "keep `let count = 0;` inside scanArchive. out at the top of the file it survives between calls — the terminal scans two trees, and the second total would start at nine.",
    },
    {
      keywords: ["print", "console", "return"],
      response: "log `scanned:` inside scan's `finally`, and `return count;` from scanArchive. the terminal prints the totals itself.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`function scanArchive(archive, root)` with `let count = 0;` and an inner `function scan(dir)`. walk, recurse on directories, count files, log in `finally`. then `scan(root); return count;`.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => lines(output)[0] === "scanned: root",
      response:
        "root logged first — you're reporting on the way in. move the log into a `finally` around the walk, so each directory reports as it finishes. root finishes last.",
    },
    {
      match: (output) => /scanned:\S/.test(output),
      response: "the space went missing — `scanned:logs`. `console.log(\"scanned:\", dir)` puts one between them for you.",
    },
    {
      match: (output) => !output.includes("scanned:") && output.includes("total files"),
      response: "the totals came through, but no `scanned:` lines. each scan call logs `console.log(\"scanned:\", dir)` in its `finally`.",
    },
    {
      match: (output) => output.includes("total files: 11"),
      response:
        "the second tree came back 11 — it started counting at nine. `count` lives outside scanArchive, so it survives between calls. declare `let count = 0;` inside scanArchive.",
    },
    {
      match: (output) => output.includes("total files: 14"),
      response: "14 — you're counting the directories too. only entries without a trailing `/` are files. directories get scanned, not counted.",
    },
    {
      match: (output) => output.includes("total files: 0"),
      response:
        "the count never moved. if you passed `count` into scan, scan bumped a copy. let scan reach the outer `let count` directly — `count++` inside the closure changes the real one.",
    },
    {
      match: (output) => output.includes("total files: undefined"),
      response: "the total came back `undefined`. scanArchive has to `return count;` after `scan(root)`.",
    },
  ],

  codePatterns: [
    {
      match: (code) => !defines(code, "scanArchive"),
      response: "i need a function named `scanArchive` — capital A.",
    },
    {
      match: (code) => !/\bfinally\b/.test(stripComments(code)),
      response: "no `finally` yet. wrap the walk in `try { … } finally { console.log(\"scanned:\", dir); }` so each directory logs on the way out.",
    },
    {
      match: (code) => /\bscan\s*\(\s*entry\s*\)/.test(stripComments(code)),
      response: "`scan(entry)` still has the slash on it — `\"logs/\"` isn't a key. `scan(entry.slice(0, -1))`.",
    },
    {
      match: (code) => /^\s*let\s+count\s*=\s*0/m.test(stripComments(code)) && !/\{[^}]*let\s+count\s*=\s*0/.test(stripComments(code)),
      response: "`let count = 0;` is out at the top level — it'll carry over between scans. move it inside scanArchive.",
    },
    {
      match: (code) => defines(code, "scanArchive") && /\bfinally\b/.test(code) && /\breturn\b/.test(fnBody(code, "scanArchive")),
      response: SCAN_CORRECT,
    },
  ],

  correctResponse: SCAN_CORRECT,

  genericWrong: [
    "not matching. directories log on the way out — `finally` — and only files add to the count.",
    "the terminal scans the archive and a small test tree. both totals have to come from the walk, not from you.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nfunction scanArchive(archive, root) {\n  let count = 0;\n  function scan(dir) {\n    try {\n      for (const entry of archive[dir]) {\n        if (entry.endsWith(\"/\")) scan(entry.slice(0, -1));\n        else count++;\n      }\n    } finally {\n      console.log(\"scanned:\", dir);\n    }\n  }\n  scan(root);\n  return count;\n}\n```",
    "the shape: a counter, an inner function that walks one folder and calls itself on the folders inside, a `finally` that logs, and `return count` at the end.",
  ],

  deflections: ["count the files first. then we talk about kira."],
};

// ── Chapter 07 · Step 2 — Recover ──

const RECOVER_CORRECT =
  "vault blew up in our hands and the scan kept walking. nine files, one corrupted sector, written down instead of tripping the alarm. that's how you survive a booby trap.\n\n||COMPLETE||";

const ch07RecoverBank: StepBank = {
  intro:
    "ghost booby-trapped part of the archive. if the scan dies on a bad folder, the alarm trips — so it has to fall, get up, and keep counting.\n\nwrite `safeScan(archive, root)` that returns `{ count, errors }`. a folder whose entries are `null` is corrupted: `throw new Error(\"corrupted directory\")`. each `scan` call catches its own error with `catch (e)`, pushes ``${dir}: ${e.message}`` onto `errors`, and the walk carries on. keep the `finally`.",

  conceptFAQ: [
    {
      keywords: ["throw", "raise", "panic", "blow up"],
      response:
        "`throw new Error(\"corrupted directory\")` stops the function on the spot. the error climbs back up through the calls until a `catch` takes it. nothing catches it, the whole program dies.",
    },
    {
      keywords: ["catch", "where does the catch go", "survive", "keep going", "continue"],
      response:
        "inside scan, around the walk: `try { …walk… } catch (e) { …record… } finally { …log… }`. vault's own call catches vault's error and returns normally, so root's loop just moves on to the next entry.",
    },
    {
      keywords: ["e.message", "message", "error object", "what is e"],
      response:
        "`e` is the Error object you threw. `e.message` is just the text you gave it — `corrupted directory`. print `e` itself and you get `Error: corrupted directory`, with the type stuck on the front.",
    },
    {
      keywords: ["throw a string", "new error", "why new error"],
      response:
        "you can throw a plain string, but then `e.message` is `undefined` — strings don't have one. `throw new Error(...)` gives you the message and a stack trace.",
    },
    {
      keywords: ["null", "corrupted", "check", "vault"],
      response: "`if (archive[dir] === null) throw new Error(\"corrupted directory\");` — put it inside the `try`, so the `finally` still logs vault.",
    },
    {
      keywords: ["finally", "still log", "scanned: vault"],
      response:
        "`finally` runs whether the try finished cleanly or threw. that's why `scanned: vault` still prints — vault reports even on the way down.",
    },
    {
      keywords: ["return two", "object", "count and errors", "both"],
      response: "return an object: `return { count, errors };` — the short form of `{ count: count, errors: errors }`. the terminal reads `.count` and `.errors`.",
    },
    {
      keywords: ["template", "backtick", "build the line"],
      response: "``errors.push(`${dir}: ${e.message}`);`` — the folder, a colon, the message. the terminal adds `ERROR:` itself.",
    },
    {
      keywords: ["scanarchive", "reuse", "copy", "same code"],
      response: "safeScan is scanArchive plus the trap: same counter, same inner scan, plus `const errors = [];` and a `catch`. leave scanArchive where it is.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "copy the shape of scanArchive into `safeScan`. add `const errors = [];`, throw on `null`, catch inside scan, and `return { count, errors };`.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => /ERROR: \w+: Error: /.test(output),
      response:
        "`Error: corrupted directory` — you printed the whole error, type and all. push ``${dir}: ${e.message}`` instead. `e.message` is just the text.",
    },
    {
      match: (output) => output.includes(": undefined") && output.includes("ERROR"),
      response:
        "the message came back `undefined`. did you throw a plain string? strings have no `.message`. `throw new Error(\"corrupted directory\");`",
    },
    {
      match: (output) => /^ERROR: (Error: )?corrupted directory$/m.test(output),
      response: "the error lost its folder. push ``${dir}: ${e.message}`` — the terminal needs to know which directory blew.",
    },
    {
      match: (output) => output.includes("total files: 1") && !lines(output).includes("scanned: b"),
      response:
        "the second tree stopped at the trap — `b` never got walked. the catch has to live inside scan, so only the bad folder's call fails and its parent keeps looping.",
    },
    {
      match: (output) => output.includes("total files") && !output.includes("scanned: vault"),
      response:
        "vault never logged. the null check is outside the `try`, so its `finally` never runs. move the check inside the try.",
    },
    {
      match: (output) => output.includes("total files") && !output.includes("ERROR"),
      response: "no `ERROR` lines. the catch has to push onto `errors`, and safeScan has to return them: `return { count, errors };`.",
    },
    {
      match: (output) => output.includes("total files: undefined"),
      response: "`total files: undefined` — the terminal reads `.count`. return an object: `return { count, errors };`.",
    },
  ],

  codePatterns: [
    {
      match: (code) => !defines(code, "safeScan"),
      response: "i need a function named `safeScan` — capital S in the middle.",
    },
    {
      match: (code) => /\bthrow\s+["'`]/.test(stripComments(code)),
      response: "you're throwing a plain string — it has no `.message`. `throw new Error(\"corrupted directory\");`",
    },
    {
      match: (code) => !/\bthrow\b/.test(stripComments(code)),
      response: "nothing throws yet. a `null` folder is corrupted: `throw new Error(\"corrupted directory\");`",
    },
    {
      match: (code) => !/\bcatch\b/.test(stripComments(code)),
      response: "no `catch` — the first trap would take the whole scan down. `catch (e)` inside scan, then push the message.",
    },
    {
      match: (code) => /\bcatch\b/.test(code) && !/\.message\b/.test(stripComments(code)),
      response: "use `e.message` — the text you threw — not the whole error object.",
    },
    {
      match: (code) => defines(code, "safeScan") && /\bthrow\b/.test(code) && /\bcatch\b/.test(code) && /\bfinally\b/.test(code),
      response: RECOVER_CORRECT,
    },
  ],

  correctResponse: RECOVER_CORRECT,

  genericWrong: [
    "not matching. throw on `null`, catch inside scan, keep the `finally`, return `{ count, errors }`.",
    "the terminal walks a trapped archive and a trapped test tree. every bad folder gets one `ERROR` line, and the scan never stops.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nfunction safeScan(archive, root) {\n  let count = 0;\n  const errors = [];\n  function scan(dir) {\n    try {\n      if (archive[dir] === null) throw new Error(\"corrupted directory\");\n      for (const entry of archive[dir]) {\n        if (entry.endsWith(\"/\")) scan(entry.slice(0, -1));\n        else count++;\n      }\n    } catch (e) {\n      errors.push(`${dir}: ${e.message}`);\n    } finally {\n      console.log(\"scanned:\", dir);\n    }\n  }\n  scan(root);\n  return { count, errors };\n}\n```",
    "try, catch, finally — in that order, inside scan. the throw goes in the try, the push goes in the catch, the log stays in the finally.",
  ],

  deflections: ["the archive first. kira can wait — she said so herself."],
};

// ── Chapter 08 · Step 0 — Scaffold ──

const ch08ScaffoldBank = act3Scaffold(
  "the power plant. four breakers feed the alarm grid, and this console is the only way to reach them. bring it online: print `Hello World`.",
  "breaker console's live. four circuits on the board. this time it's not what the code does — it's when.",
  {
    keywords: ["breaker", "circuit", "grid", "async", "await", "promise", "settimeout"],
    response: "the breakers come next. this one runs top to bottom, in order, like everything so far. wake the console first.",
  },
  "console first. `Hello World`.",
);

// ── Chapter 08 · Step 1 — Schedule a breaker ──

const GOROUTINE_CORRECT =
  "north dropped. `orders sent` went out — and south dropped after it, on its own time. the program didn't stand there watching.\n\n||COMPLETE||";

const ch08GoroutineBank: StepBank = {
  intro:
    "i can only throw one breaker at a time by hand. the program has to throw them for me — without stopping to watch each one.\n\nwrite `cut(name)` that logs ``${name} circuit: DOWN``, and `cutAsync(name)` that schedules cut for later — `setTimeout(() => cut(name), 0)` — and returns straight away.",

  conceptFAQ: [
    {
      keywords: ["settimeout", "schedule", "later", "what does it do"],
      response:
        "`setTimeout(fn, ms)` hands `fn` to the event loop to run later and returns at once. the lines after it keep going. it doesn't pause anything.",
    },
    {
      keywords: ["event loop", "loop", "queue", "how does it work"],
      response:
        "javascript runs one thing at a time. scheduled work waits in a queue. only when the current code finishes — or pauses at an `await` — does the event loop pick the next job off the queue.",
    },
    {
      keywords: ["why orders sent", "before south", "order", "why first"],
      response:
        "javascript finishes what it's doing first. cutAsync schedules south and returns, the terminal logs `orders sent`, then pauses — and only then does the scheduled cut run.",
    },
    {
      keywords: ["zero", "0", "why 0", "delay"],
      response: "zero milliseconds means as soon as possible — still later, never right now. the current code always finishes first.",
    },
    {
      keywords: ["arrow", "() =>", "wrap", "why not cut(name)"],
      response:
        "`setTimeout(cut(name), 0)` calls cut right now and hands setTimeout the result — `undefined`. `() => cut(name)` is a function that calls cut later. setTimeout needs the function, not the result.",
    },
    {
      keywords: ["kill", "dies", "end", "unfinished", "does it still run"],
      response:
        "in javascript scheduled work still runs after the rest of the file is done — the program waits for the queue to empty. the lesson here is order, not survival.",
    },
    {
      keywords: ["template", "backtick", "log the name"],
      response: "``console.log(`${name} circuit: DOWN`);`` — the name drops in where `${name}` sits.",
    },
    {
      keywords: ["return", "return value"],
      response: "cutAsync doesn't need to return anything. its whole job is to schedule and get out of the way.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "two functions. `cut(name)` logs the line. `cutAsync(name)` calls `setTimeout(() => cut(name), 0);` and nothing else.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => lines(output)[1] === "South circuit: DOWN",
      response:
        "south went down before `orders sent` — cutAsync ran it right now and the terminal waited. schedule it instead: `setTimeout(() => cut(name), 0);`.",
    },
    {
      match: (output) => output.includes("orders sent") && !output.includes("South circuit"),
      response:
        "south never went down. if you wrote `setTimeout(() => cut, 0)`, the arrow only names cut — it doesn't call it. `() => cut(name)`.",
    },
    {
      match: (output) => /circuit: down/i.test(output) && !output.includes("circuit: DOWN"),
      response: "capitals on `DOWN` — the grid reads it exactly: ``${name} circuit: DOWN``.",
    },
  ],

  codePatterns: [
    {
      match: (code) => !defines(code, "cutAsync"),
      response: "i need a function named `cutAsync` — capital A.",
    },
    {
      match: (code) => /\bsetTimeout\s*\(\s*cut\s*\(/.test(stripComments(code)),
      response:
        "`setTimeout(cut(name), 0)` runs cut right now and hands setTimeout `undefined`. wrap it in an arrow: `setTimeout(() => cut(name), 0);`.",
    },
    {
      match: (code) => !/\bsetTimeout\s*\(/.test(fnBody(code, "cutAsync")),
      response: "cutAsync calls cut straight away — south goes down before the orders. schedule it: `setTimeout(() => cut(name), 0);`.",
    },
    {
      match: (code) => defines(code, "cut") && /\bsetTimeout\s*\(/.test(fnBody(code, "cutAsync")),
      response: GOROUTINE_CORRECT,
    },
  ],

  correctResponse: GOROUTINE_CORRECT,

  genericWrong: [
    "not matching. north first, then `orders sent`, then south — cutAsync schedules, it doesn't wait.",
    "the terminal cuts north, launches south, says so, then waits. south has to land after `orders sent`.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nfunction cut(name) {\n  console.log(`${name} circuit: DOWN`);\n}\n\nfunction cutAsync(name) {\n  setTimeout(() => cut(name), 0);\n}\n```",
    "cut does the work. cutAsync only books it for later with `setTimeout` and an arrow.",
  ],

  deflections: ["the breakers. one scheduled cut, then we talk."],
};

// ── Chapter 08 · Step 2 — Fan-out ──

const FANOUT_CORRECT =
  "four breakers fired at once, four confirmations back, in order. and the aux line on its own. i can call the grid now.\n\n||COMPLETE||";

const ch08FanoutBank: StepBank = {
  intro:
    "all four breakers have to drop together, and i can't call the grid blind until every one has confirmed.\n\nwrite `async function cutAll(circuits)`: start one async job per circuit, wait for them all with `Promise.all`, and return the confirmations — ``${name} circuit: DOWN`` — in circuit order.",

  conceptFAQ: [
    {
      keywords: ["what is a promise", "promise", "not ready"],
      response:
        "a promise is a value that isn't ready yet. it settles later with an answer. `await` pauses until it does and hands you the answer.",
    },
    {
      keywords: ["async", "async function", "what does async do"],
      response:
        "`async` marks a function that can `await` inside it. it always hands back a promise — even `async (name) => name` gives a promise of the name.",
    },
    {
      keywords: ["promise.all", "wait for all", "all of them", "every"],
      response:
        "`Promise.all(array)` takes an array of promises, waits for every one, and settles with an array of their answers — in the order you passed them, not the order they finished.",
    },
    {
      keywords: ["map", "one per circuit", "array of promises", "start"],
      response:
        "``circuits.map(async (name) => `${name} circuit: DOWN`)`` — map runs the async arrow once per circuit and gives you an array of promises, all started at once.",
    },
    {
      keywords: ["await", "where does await go", "return"],
      response:
        "`return Promise.all(...)` hands the promise back and the terminal awaits it. `return await Promise.all(...)` works too. forget both and the terminal gets `undefined`.",
    },
    {
      keywords: ["for loop", "loop", "one at a time", "sequential"],
      response:
        "awaiting each job inside a `for` loop waits for one before starting the next. it works here, but it's the slow way — next step, the slow way trips the alarm.",
    },
    {
      keywords: ["waitgroup", "wait group", "counter", "done"],
      response: "no counter to keep. `Promise.all` is the waiting and the results array in one call.",
    },
    {
      keywords: ["order", "why in order", "results"],
      response: "the answers come back in the same order as the promises you handed in. north first, west last — however they finish.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "``return Promise.all(circuits.map(async (name) => `${name} circuit: DOWN`));`` — one line inside `async function cutAll(circuits)`.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => lines(output).some((l) => l === "{}" || l.includes("[object Promise]") || l.includes("Promise {")),
      response:
        "those are promises, not confirmations — nobody waited for them. wrap the array in `Promise.all(...)` and return that.",
    },
    {
      match: (output) => output.includes("circuit: DOWN") && lines(output).includes("undefined"),
      response:
        "the jobs logged their lines but handed back `undefined`. return the line from each job instead of printing it — the terminal prints what comes back.",
    },
    {
      match: (output) => lines(output).filter((l) => l.endsWith("circuit: DOWN")).length === 0 && output.includes("ALL CIRCUITS DOWN"),
      response: "no confirmations came back. each job returns ``${name} circuit: DOWN`` and cutAll returns the `Promise.all`.",
    },
  ],

  codePatterns: [
    {
      match: (code) => !defines(code, "cutAll"),
      response: "i need a function named `cutAll` — capital A.",
    },
    {
      match: (code) => !/\bPromise\s*\.\s*all\s*\(/.test(stripComments(code)),
      response: "no `Promise.all` yet. it's the one call that starts-and-waits for the whole array.",
    },
    {
      match: (code) => {
        const body = fnBody(code, "cutAll");
        return /\bPromise\s*\.\s*all\s*\(/.test(body) && !/\breturn\b/.test(body);
      },
      response: "`Promise.all` runs, but cutAll never hands it back. `return Promise.all(...)` — otherwise the terminal gets `undefined`.",
    },
    {
      match: (code) => /\bfor\b[^{]*\{[^}]*\bawait\b/.test(fnBody(code, "cutAll")),
      response: "awaiting inside the loop starts one breaker, waits, then starts the next. start them all with `map`, then wait once with `Promise.all`.",
    },
    {
      match: (code) => defines(code, "cutAll") && /\bPromise\s*\.\s*all\s*\(/.test(code),
      response: FANOUT_CORRECT,
    },
  ],

  correctResponse: FANOUT_CORRECT,

  genericWrong: [
    "not matching. one job per circuit, all at once, `Promise.all` to wait, confirmations back in order.",
    "the terminal cuts four circuits, then one. cutAll has to work for any list.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nasync function cutAll(circuits) {\n  return Promise.all(circuits.map(async (name) => `${name} circuit: DOWN`));\n}\n```",
    "map makes the promises, `Promise.all` waits for them, `return` hands the answers back.",
  ],

  deflections: ["four breakers first. her schematics can wait."],
};

// ── Chapter 08 · Step 3 — One cycle ──

const WINDOW_CORRECT =
  "450 milliseconds. the slowest breaker, not all of them added up. one power cycle — the grid never saw it happen. alarm's blind.\n\n||COMPLETE||";

const ch08WindowBank: StepBank = {
  intro:
    "each breaker takes its own time to trip. all four have to be down inside one power cycle, or the grid seals the facility.\n\nwrite `async function cutTimed(circuits, delays)` — the same fan-out, but each job first waits its delay, then returns ``${name} circuit: DOWN (${ms}ms)``. you'll need a `sleep(ms)` that returns a promise: `const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));`",

  conceptFAQ: [
    {
      keywords: ["sleep", "wait", "pause", "delay"],
      response:
        "javascript has no built-in sleep, so you make one. `new Promise((resolve) => setTimeout(resolve, ms))` is a promise the timer settles after `ms`. `await sleep(300)` pauses just that one job — everything else keeps running.",
    },
    {
      keywords: ["new promise", "resolve", "executor", "how do i make a promise"],
      response:
        "`new Promise((resolve) => { ... })` hands you `resolve`. call it when the work is done and the promise settles. here the timer calls it for you.",
    },
    {
      keywords: ["index", "which delay", "delays[i]", "second argument"],
      response: "map hands the index as a second argument: `circuits.map(async (name, i) => ...)`. then `delays[i]` is that circuit's delay.",
    },
    {
      keywords: ["for loop", "one at a time", "sum", "why not loop", "multi cycle"],
      response:
        "awaiting each sleep in a `for` loop waits for one breaker before starting the next — 300 plus 150 plus 450 plus 200. that's 1100ms, two cycles, alarm. start them all, then wait once: the window is the slowest, 450.",
    },
    {
      keywords: ["var", "let", "undefined circuit", "same value", "loop variable"],
      response:
        "if you build callbacks in a `for` loop, use `let i`, never `var i`. `var` is one variable shared by every pass, so the callbacks all see its last value. `let` gives each pass its own.",
    },
    {
      keywords: ["measure", "timer", "how does it time", "performance"],
      response: "the terminal reads the clock before and after `await cutTimed(...)`. under 1100ms means one cycle. you just have to run the breakers at once.",
    },
    {
      keywords: ["order", "finish order", "push"],
      response: "push lines into an array as they finish and south lands first. return them from each job instead — `Promise.all` puts them back in circuit order.",
    },
    {
      keywords: ["template", "line", "ms"],
      response: "``return `${name} circuit: DOWN (${delays[i]}ms)`;`` — the delay drops in before `ms`, no space.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "write `sleep` first. then `return Promise.all(circuits.map(async (name, i) => { await sleep(delays[i]); return ...; }));`.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => output.includes("MULTI CYCLE"),
      response:
        "two cycles — the alarm tripped. the breakers went one after another, so the window was the sum. start all four first, each sleeping inside its own job, and wait once with `Promise.all`.",
    },
    {
      match: (output) => /undefined circuit|\(undefinedms\)/.test(output),
      response:
        "`undefined` where the name should be. if the callbacks were built in a `for (var i ...)` loop, they all read `i` after the loop ended. `let i` gives each pass its own — or use map's index.",
    },
    {
      match: (output) => lines(output)[0] === "South circuit: DOWN (150ms)",
      response:
        "the lines came back in the order they finished — south first. return each line from its job instead of pushing it; `Promise.all` keeps circuit order.",
    },
    {
      match: (output) => output.includes("circuit: DOWN") && !/\(\d+ms\)/.test(output),
      response: "the delays are missing from the lines. ``${name} circuit: DOWN (${delays[i]}ms)``.",
    },
    {
      match: (output) => lines(output).some((l) => l === "{}" || l.includes("Promise {")),
      response: "those are promises, not lines. `return Promise.all(...)` so the terminal gets the answers.",
    },
  ],

  codePatterns: [
    {
      match: (code) => !defines(code, "cutTimed"),
      response: "i need a function named `cutTimed` — capital T.",
    },
    {
      match: (code) => /\bfor\s*\(\s*var\b/.test(stripComments(code)),
      response: "`var` in a for loop is one variable shared by every pass — callbacks all see the last value. `let`.",
    },
    {
      match: (code) => /\bfor\b[^{]*\{[^}]*\bawait\b/.test(fnBody(code, "cutTimed")),
      response: "awaiting inside a `for` loop runs the breakers one after another — the sum, 1100ms, alarm. map them all at once, then `Promise.all`.",
    },
    {
      match: (code) => /\bsetTimeout\s*\(\s*resolve\s*\(/.test(stripComments(code)),
      response: "`setTimeout(resolve(), ms)` resolves right now. hand it the function itself: `setTimeout(resolve, ms)`.",
    },
    {
      match: (code) => !/\bPromise\s*\.\s*all\s*\(/.test(stripComments(code)),
      response: "no `Promise.all` — nothing waits for all four together.",
    },
    {
      match: (code) => defines(code, "cutTimed") && /\bPromise\s*\.\s*all\s*\(/.test(code) && /\bsetTimeout\s*\(/.test(code),
      response: WINDOW_CORRECT,
    },
  ],

  correctResponse: WINDOW_CORRECT,

  genericWrong: [
    "not matching. every breaker sleeps inside its own job, all at once. the window is the slowest, not the sum.",
    "four lines with their delays, in circuit order, then `SINGLE CYCLE`. `Promise.all` over a map gets you all three.",
  ],

  rushDialogue: [
    "the grid's about to self-check. all four at once.",
    "hurry — one cycle. start them together, wait once.",
    "it's counting. don't await them one by one.",
  ],

  stuckResponses: [
    "```\nconst sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));\n\nasync function cutTimed(circuits, delays) {\n  return Promise.all(\n    circuits.map(async (name, i) => {\n      await sleep(delays[i]);\n      return `${name} circuit: DOWN (${delays[i]}ms)`;\n    }),\n  );\n}\n```",
    "the sleep goes inside each job, not around them. four jobs sleeping at once take as long as the slowest one.",
  ],

  deflections: ["one cycle. the grid won't wait for a chat."],
};

// ── Chapter 09 · Step 0 — Scaffold ──

const ch09ScaffoldBank = act3Scaffold(
  "the comms array. three extraction teams, three frequencies — and this is the only radio i've got. power it up: print `Hello World`.",
  "array's powered. three frequencies humming. now we call for a way out.",
  {
    keywords: ["team", "frequency", "hail", "radio", "promise", "race"],
    response: "the hails come next. power the array first.",
  },
  "power the array first. `Hello World`.",
);

// ── Chapter 09 · Step 1 — Hail ──

const HAIL_CORRECT =
  "`Bravo responding`. the call went out, the terminal kept moving, and the answer was waiting when we looked. a promise holds it until somebody asks.\n\n||COMPLETE||";

const ch09HailBank: StepBank = {
  intro:
    "i have to call an extraction team and hear back — without freezing the terminal while i wait.\n\nwrite `hail(team, delayMs)` that returns a promise straight away: `new Promise((resolve) => setTimeout(() => resolve(...), delayMs))`, settling with ``${team} responding`` after `delayMs` milliseconds.",

  conceptFAQ: [
    {
      keywords: ["resolve", "what is resolve", "settle"],
      response:
        "`resolve` is the function a new promise hands you to deliver its answer. call `resolve(value)` once and the promise settles with that value. call it again and nothing happens — it settles once.",
    },
    {
      keywords: ["why return a promise", "why not return the text", "return"],
      response:
        "so the call comes back at once and the team answers later. `return new Promise(...)` — forget the `return` and the terminal awaits `undefined`.",
    },
    {
      keywords: ["arrow", "() => resolve", "settimeout(resolve", "right now", "immediately"],
      response:
        "``setTimeout(resolve(`...`), delayMs)`` calls resolve right now and hands setTimeout the result. wrap it: ``setTimeout(() => resolve(`${team} responding`), delayMs)``. the timer calls the arrow later.",
    },
    {
      keywords: ["await", "await p", "what does await give"],
      response: "`await p` pauses until p settles and gives you its value. if it already settled, you get the value straight away — the answer was holding.",
    },
    {
      keywords: ["async", "async function", "do i need async"],
      response: "hail doesn't need `async`. it builds the promise itself and returns it. `async` is for functions that `await` inside.",
    },
    {
      keywords: ["delay", "delayms", "how long"],
      response: "use `delayMs` for the timer — not a number you picked. every team answers on its own time.",
    },
    {
      keywords: ["channel", "mailbox", "holds"],
      response: "a promise is a mailbox with room for one answer. the team drops it in and leaves. whoever looks later finds it there.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "``function hail(team, delayMs) { return new Promise((resolve) => setTimeout(() => resolve(`${team} responding`), delayMs)); }``",
    },
  ],

  outputPatterns: [
    {
      match: (output) => lines(output)[1] === "undefined",
      response:
        "the terminal got `undefined`. either hail doesn't `return` the promise, or the timer calls `resolve()` with nothing in it. return the promise, and resolve with ``${team} responding``.",
    },
    {
      match: (output) => lines(output)[0] === "Bravo responding",
      response: "bravo answered before `hailing Bravo...` — the reply was printed straight away. resolve the promise from a timer, don't log inside hail.",
    },
    {
      match: (output) => lines(output).some((l) => l === "{}" || l.includes("Promise {")),
      response: "the terminal printed a promise inside a promise. resolve with the text itself, not another promise.",
    },
  ],

  codePatterns: [
    {
      match: (code) => !defines(code, "hail"),
      response: "i need a function named `hail`.",
    },
    {
      match: (code) => /\bsetTimeout\s*\(\s*resolve\s*\(/.test(stripComments(code)),
      response: "``setTimeout(resolve(...), delayMs)`` resolves right now. wrap it in an arrow: ``setTimeout(() => resolve(`${team} responding`), delayMs)``.",
    },
    {
      match: (code) => /\bnew\s+Promise\b/.test(fnBody(code, "hail")) && !/\breturn\b|=>\s*new\s+Promise/.test(fnBody(code, "hail")),
      response: "the promise is built but never returned. `return new Promise(...)`.",
    },
    {
      match: (code) => !/\bnew\s+Promise\b/.test(stripComments(code)),
      response: "hail has to build its own promise: `return new Promise((resolve) => ...);`.",
    },
    {
      match: (code) => defines(code, "hail") && /\bnew\s+Promise\b/.test(code) && /\bsetTimeout\s*\(/.test(code),
      response: HAIL_CORRECT,
    },
  ],

  correctResponse: HAIL_CORRECT,

  genericWrong: [
    "not matching. hail returns a promise at once, and a timer resolves it with ``${team} responding``.",
    "the terminal hails bravo, says so, then awaits the answer. hail can't make it wait.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "```\nfunction hail(team, delayMs) {\n  return new Promise((resolve) => setTimeout(() => resolve(`${team} responding`), delayMs));\n}\n```",
    "outside in: return a new promise. inside it, start a timer. when the timer fires, resolve with the reply.",
  ],

  deflections: ["one hail first. the frequencies are hers — we use them carefully."],
};

// ── Chapter 09 · Step 2 — First contact ──

const FIRST_CORRECT =
  "bravo. first voice on the air, and we didn't wait for alpha or charlie to finish clearing their throats.\n\n||COMPLETE||";

const ch09FirstBank: StepBank = {
  intro:
    "three teams hailed at once. i go with whoever answers first and i don't wait on the slow ones.\n\nwrite `firstResponder(alpha, bravo, charlie)` that returns whichever answer lands first. `Promise.race([...])` settles with the first promise in the array to settle.",

  conceptFAQ: [
    {
      keywords: ["race", "promise.race", "what does race do"],
      response:
        "`Promise.race(array)` settles the moment the first promise in the array settles, with that promise's answer. the rest are ignored.",
    },
    {
      keywords: ["await alpha", "why not await", "one at a time"],
      response: "`await alpha` waits for alpha even though bravo answered sooner. race listens to all three at once.",
    },
    {
      keywords: ["array", "brackets", "how do i pass"],
      response: "one array, all three: `Promise.race([alpha, bravo, charlie])`. pass them loose and race gets no array at all.",
    },
    {
      keywords: ["losers", "what happens to", "others", "cancel"],
      response:
        "they still settle later, and nobody's waiting. a promise holds its answer, so nothing gets stuck. javascript can't cancel a promise — it just stops caring.",
    },
    {
      keywords: ["promise.all", "all"],
      response: "`Promise.all` waits for every team. you want the first one — `Promise.race`.",
    },
    {
      keywords: ["return", "await", "async"],
      response: "just `return Promise.race([...]);`. the terminal awaits it. no `async` needed.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response: "`function firstResponder(alpha, bravo, charlie) { return Promise.race([alpha, bravo, charlie]); }`",
    },
  ],

  outputPatterns: [
    {
      match: (output) => /first contact: (Alpha|Charlie) responding/.test(output),
      response: "that's not the first voice — bravo answers at 100ms. you waited on one team. race all three: `Promise.race([alpha, bravo, charlie])`.",
    },
    {
      match: (output) => /first contact: .*responding,/.test(output),
      response: "you got every team's answer — that's `Promise.all`, which waits for all of them. `Promise.race` takes the first.",
    },
    {
      match: (output) => /first contact: (undefined|\{\}|\[object)/.test(output),
      response: "no answer came back. `return Promise.race([alpha, bravo, charlie]);` — one array, returned.",
    },
  ],

  codePatterns: [
    {
      match: (code) => !defines(code, "firstResponder"),
      response: "i need a function named `firstResponder` — capital R.",
    },
    {
      match: (code) => /\bawait\s+(alpha|bravo|charlie)\b/.test(fnBody(code, "firstResponder")),
      response: "`await alpha` waits on one team. bravo answers sooner. race them: `Promise.race([alpha, bravo, charlie])`.",
    },
    {
      match: (code) => /\bPromise\s*\.\s*race\s*\(\s*[^[\s]/.test(stripComments(code)),
      response: "race takes one array: `Promise.race([alpha, bravo, charlie])` — square brackets around all three.",
    },
    {
      match: (code) => !/\bPromise\s*\.\s*race\s*\(/.test(stripComments(code)),
      response: "no race yet. `Promise.race([alpha, bravo, charlie])` settles with whoever answers first.",
    },
    {
      match: (code) => defines(code, "firstResponder") && /\bPromise\s*\.\s*race\s*\(\s*\[/.test(code),
      response: FIRST_CORRECT,
    },
  ],

  correctResponse: FIRST_CORRECT,

  genericWrong: [
    "not matching. all three teams in one race — whoever settles first wins.",
    "the terminal hails alpha at 200, bravo at 100, charlie at 300. the race has to pick bravo on its own.",
  ],

  rushDialogue: [
    "frequencies are degrading. race them.",
    "hurry — first voice wins. don't wait on alpha.",
  ],

  stuckResponses: [
    "```\nfunction firstResponder(alpha, bravo, charlie) {\n  return Promise.race([alpha, bravo, charlie]);\n}\n```",
    "one line: return the race of all three, in one array.",
  ],

  deflections: ["first contact first. then kira's lesson."],
};

// ── Chapter 09 · Step 3 — Timeout ──

const TIMEOUT_CORRECT =
  "bravo when they answer. no contact when nobody does — and we walk instead of standing in a stairwell. a glance at the channel that never waits. extraction's locked.\n\n||COMPLETE||";

const ch09TimeoutBank: StepBank = {
  intro:
    "if every frequency is jammed i can't stand in a stairwell forever. the program has to give up in time — and glance at a channel without stopping.\n\ntwo functions. `awaitContact(alpha, bravo, charlie, timeoutMs)` is step 2's race plus a fourth runner: a promise that settles with `NO CONTACT` after `timeoutMs`. `sweep(p)` never waits: race `p` against the plain value `\"channel silent\"`.",

  conceptFAQ: [
    {
      keywords: ["timeout", "deadline", "give up", "no contact"],
      response:
        "a deadline is a promise a timer settles: `new Promise((resolve) => setTimeout(() => resolve(\"NO CONTACT\"), timeoutMs))`. put it in the race. if no team beats the timer, the timer wins.",
    },
    {
      keywords: ["timeoutms", "how long", "200", "number"],
      response: "use `timeoutMs` — the terminal gives each call its own deadline. a number you typed in fits one call and breaks the next.",
    },
    {
      keywords: ["sweep", "not wait", "glance", "non-blocking", "peek"],
      response:
        "race the promise against a value that's ready right now: `Promise.race([p, \"channel silent\"])`. if p already settled it goes first and wins. if not, the ready value wins on the spot.",
    },
    {
      keywords: ["order", "why p first", "first in the array"],
      response:
        "when two runners are both ready, race takes the one earlier in the array. so p goes first — a settled p beats the plain string, a pending p can't.",
    },
    {
      keywords: ["plain value", "string in race", "not a promise"],
      response: "race treats a plain value as a promise that's already settled. `\"channel silent\"` is ready the instant you ask.",
    },
    {
      keywords: ["await in sweep", "sleep", "wait in sweep"],
      response: "sweep never awaits p and never sleeps. awaiting a jammed frequency means waiting forever — that's the whole thing sweep exists to avoid.",
    },
    {
      keywords: ["reject", "error", "throw"],
      response: "resolve the deadline with `\"NO CONTACT\"` — don't reject it. a timeout here is an answer, not a crash.",
    },
    {
      keywords: ["timeout or sweep", "difference", "which when"],
      response: "awaitContact waits, but never past the deadline. sweep doesn't wait at all — it only looks.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "build the deadline promise inside awaitContact and `return Promise.race([alpha, bravo, charlie, deadline]);`. then `function sweep(p) { return Promise.race([p, \"channel silent\"]); }`.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => lines(output)[2] === "contact: NO CONTACT",
      response:
        "the third call gave up too early. it has a 500ms deadline and alpha answers at 300 — your deadline isn't using `timeoutMs`. `setTimeout(() => resolve(\"NO CONTACT\"), timeoutMs)`.",
    },
    {
      match: (output) => lines(output)[3] === "sweep: channel silent",
      response:
        "the sweep said silent on a channel that already had bravo's message. put `p` first in the race: `Promise.race([p, \"channel silent\"])` — when both are ready, the earlier one wins.",
    },
    {
      match: (output) => output.includes("contact: undefined"),
      response: "the deadline settled with nothing in it. `resolve(\"NO CONTACT\")`.",
    },
    {
      match: (output) => lines(output)[1] !== undefined && lines(output)[1] !== "contact: NO CONTACT" && lines(output)[0] === "contact: Bravo responding",
      response: "every frequency was jammed on the second call, and the deadline didn't win. the fourth runner has to settle with `NO CONTACT` after `timeoutMs`.",
    },
  ],

  codePatterns: [
    {
      match: (code) => !defines(code, "awaitContact"),
      response: "i need a function named `awaitContact` — capital C.",
    },
    {
      match: (code) => !defines(code, "sweep"),
      response: "i need `sweep(p)` too — it looks at one channel without waiting.",
    },
    {
      match: (code) => {
        const body = fnBody(code, "awaitContact");
        return /\bsetTimeout\s*\(/.test(body) && !/\btimeoutMs\b/.test(body);
      },
      response: "the deadline is a number you picked. use `timeoutMs` — every call gets its own.",
    },
    {
      match: (code) => !/\bsetTimeout\s*\(/.test(fnBody(code, "awaitContact")) && !/\bsleep\s*\(/.test(fnBody(code, "awaitContact")),
      response: "no deadline in the race. a jammed channel would hang forever — add a timer promise that settles with `NO CONTACT`.",
    },
    {
      match: (code) => /\bawait\s+p\b|\bsetTimeout\s*\(|\bsleep\s*\(/.test(fnBody(code, "sweep")),
      response: "sweep waits. it should only look: `return Promise.race([p, \"channel silent\"]);`.",
    },
    {
      match: (code) => /Promise\s*\.\s*race\s*\(\s*\[\s*["'`]channel silent/.test(stripComments(code)),
      response: "the ready value is first in the array, so it always wins. put `p` first.",
    },
    {
      match: (code) => defines(code, "awaitContact") && defines(code, "sweep") && /\bPromise\s*\.\s*race\s*\(/.test(code),
      response: TIMEOUT_CORRECT,
    },
  ],

  correctResponse: TIMEOUT_CORRECT,

  genericWrong: [
    "not matching. awaitContact races the three teams against a `timeoutMs` deadline. sweep races `p` against a ready string.",
    "the terminal jams every frequency on the second call. only the deadline can answer it.",
  ],

  rushDialogue: [
    "the window's closing. give the race a deadline.",
    "hurry — we can't wait on a dead frequency.",
    "extraction's leaving. timeout, then sweep.",
  ],

  stuckResponses: [
    "```\nfunction awaitContact(alpha, bravo, charlie, timeoutMs) {\n  const deadline = new Promise((resolve) => setTimeout(() => resolve(\"NO CONTACT\"), timeoutMs));\n  return Promise.race([alpha, bravo, charlie, deadline]);\n}\n\nfunction sweep(p) {\n  return Promise.race([p, \"channel silent\"]);\n}\n```",
    "the deadline is just one more runner in the race. sweep is a race whose other runner is already at the finish line.",
  ],

  deflections: ["the deadline first. kira's waiting for an answer, and so is bravo."],
};

// ── Registry ──

export const JAVASCRIPT_BANKS: Record<string, StepBank> = {
  "chapter-01:scaffold": ch01ScaffoldBank,
  "chapter-01:location": ch01LocationBank,
  "chapter-02:scaffold": ch02ScaffoldBank,
  "chapter-02:loop": ch02LoopBank,
  "chapter-02:classify": ch02ClassifyBank,
  "chapter-02:rewrite": ch02RewriteBank,
  "chapter-03:scaffold": ch03ScaffoldBank,
  "chapter-03:sumfunc": ch03SumBank,
  "chapter-03:validate": ch03ValidateBank,
  "chapter-04:scaffold": ch04ScaffoldBank,
  "chapter-04:guardmap": ch04GuardmapBank,
  "chapter-04:clearfloors": ch04ClearfloorsBank,
  "chapter-04.2:scaffold": ch04_2ScaffoldBank,
  "chapter-04.2:reverseword": ch04_2ReversewordBank,
  "chapter-04.2:encode": ch04_2EncodeBank,
  "chapter-04.2:relayheader": ch04_2RelayheaderBank,
  "chapter-07:scaffold": ch07ScaffoldBank,
  "chapter-07:scan": ch07ScanBank,
  "chapter-07:recover": ch07RecoverBank,
  "chapter-08:scaffold": ch08ScaffoldBank,
  "chapter-08:goroutine": ch08GoroutineBank,
  "chapter-08:fanout": ch08FanoutBank,
  "chapter-08:window": ch08WindowBank,
  "chapter-09:scaffold": ch09ScaffoldBank,
  "chapter-09:hail": ch09HailBank,
  "chapter-09:first": ch09FirstBank,
  "chapter-09:timeout": ch09TimeoutBank,
};
