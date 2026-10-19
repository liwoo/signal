// ── Act I in JavaScript ──
// The same steps as the Go chapters (story, stakes, XP, events are shared);
// only the code-shaped half is realized here. JavaScript has no boilerplate —
// the file IS the program — so each scaffold step teaches "one line runs"
// instead of "assemble the skeleton" (docs/cross-language-act-1-plan.md §8).

import type { ChallengeRealization } from "@/types/game";

const CLASSIFY_OUTPUT =
  "1 DENY\n2 DENY\n3 DENY\n4 WARN\n5 WARN\n6 WARN\n7 GRANT\n8 GRANT\n9 GRANT\n10 OVERRIDE";

export const JS_CHAPTER_01: ChallengeRealization = {
  concepts: ["Programs", "console.log", "Strings", "import / export", "const", "Template literals"],
  steps: {
    "chapter-01:scaffold": {
      brief: "Make the program print `Hello World`.",
      expectedBehavior: "Hello World",
      expectedOutput: "Hello World",
      quickCheck: {
        prompt: "stuck getting hello world out? tap the question that's in your head.",
        items: [
          {
            question: "how do i print something?",
            answer: "`console.log(...)` writes whatever you put in the brackets to the terminal, then a new line.",
          },
          {
            question: "do i need any setup first?",
            answer: "no. in javascript the file is the program — it runs top to bottom. one line is enough.",
          },
          {
            question: "how do i write text?",
            answer: "wrap it in quotes: `\"Hello World\"`. without quotes javascript thinks it's a variable name.",
          },
        ],
      },
      hints: [
        { level: 1, text: "javascript prints with `console.log(...)` — no package, no main, the file runs top to bottom.", energyCost: 8 },
        { level: 2, text: "text goes in quotes: `\"Hello World\"`. put it inside the brackets of console.log.", energyCost: 12 },
        { level: 3, text: "`console.log(\"Hello World\");` — that one line is the whole program.", energyCost: 20 },
      ],
    },
    "chapter-01:location": {
      brief: "Import `cell` and `sublevel` from `./cellblock.js` and print: CELL B-09 · SUBLEVEL 3",
      expectedBehavior: "CELL B-09 · SUBLEVEL 3",
      expectedOutput: "CELL B-09 · SUBLEVEL 3",
      requiredCode: ["cell", "sublevel"],
      compileModule: {
        module: "terminal",
        files: [
          {
            path: "cellblock.js",
            content: `// cell is maya's holding cell.
export const cell = "B-09";

// sublevel is how far underground the cell sits.
export let sublevel = 3;
`,
          },
        ],
      },
      quickCheck: {
        prompt: "stuck importing the cell data? tap the question that's in your head.",
        items: [
          {
            question: "how do i pull values out of another file?",
            answer: "`import { cell, sublevel } from \"./cellblock.js\";` at the top — the names in the braces become usable below.",
          },
          {
            question: "how do i mix text and values in one line?",
            answer: "wrap the text in backticks instead of quotes, then put `${cell}` wherever a value goes — that's a template literal.",
          },
          {
            question: "can't i just type the location?",
            answer: "the guards move prisoners. read the real values from the module — a typed guess gets people killed.",
          },
        ],
      },
      hints: [
        { level: 1, text: "the values live in a module. add `import { cell, sublevel } from \"./cellblock.js\";` at the top.", energyCost: 8 },
        { level: 2, text: "a template literal mixes text and values: backticks around the text, `${cell}` where a value goes.", energyCost: 12 },
        { level: 3, text: "``console.log(`CELL ${cell} · SUBLEVEL ${sublevel}`);`` — template literal, two values dropped in.", energyCost: 20 },
      ],
    },
  },
};

export const JS_CHAPTER_02: ChallengeRealization = {
  concepts: ["for loops", "switch", "if / else"],
  steps: {
    "chapter-02:scaffold": {
      brief:
        "the keypad is wired to a javascript program. get it live by printing `Hello World` — no skeleton needed, one line is a whole program. the keypad won't respond until the terminal's live.",
      expectedBehavior: "Hello World",
      expectedOutput: "Hello World",
      quickCheck: {
        prompt: "same one-liner as before — tap whatever you need a refresher on.",
        items: [
          { question: "how do i print again?", answer: "`console.log(\"Hello World\");` — text in quotes, inside the brackets." },
          { question: "do i need a main function?", answer: "no. javascript runs the file from the top. that's the whole program." },
        ],
      },
      hints: [
        { level: 1, text: "same as before: `console.log(...)` prints a line.", energyCost: 5 },
        { level: 2, text: "the text goes in quotes inside the brackets.", energyCost: 8 },
        { level: 3, text: "`console.log(\"Hello World\");`", energyCost: 12 },
      ],
    },
    "chapter-02:loop": {
      brief:
        "the keypad cycles codes 1-10. write a for loop that prints each number on its own line. just the numbers — nothing else.\n\nexpected output:\n1\n2\n3\n...\n10",
      expectedBehavior: "loop-1-to-10",
      expectedOutput: "1\n2\n3\n4\n5\n6\n7\n8\n9\n10",
      requiredCode: ["for", "console.log(i"],
      quickCheck: {
        prompt: "stuck on the loop? tap the question that's in your head.",
        items: [
          {
            question: "how do i count from 1 to 10?",
            answer: "`for (let i = 1; i <= 10; i++)` — start, condition, step. the body runs while the condition holds.",
          },
          {
            question: "why `let` and not `const`?",
            answer: "the loop changes `i` every pass. `const` can never change, so the counter has to be `let`.",
          },
          {
            question: "what is that `i++` doing?",
            answer: "it adds 1 to `i` after each pass, so the loop moves forward instead of running forever.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`for (let i = 1; i <= 10; i++) { ... }` — start at 1, stop after 10, step by 1.", energyCost: 8 },
        { level: 2, text: "inside the braces: `console.log(i);` prints the current number.", energyCost: 12 },
        { level: 3, text: "`for (let i = 1; i <= 10; i++) { console.log(i); }` — that's the whole thing.", energyCost: 20 },
      ],
    },
    "chapter-02:classify": {
      brief:
        "now modify your loop to classify each code. print the number followed by its access level — separated by a space.\n\n1-3 → DENY\n4-6 → WARN\n7-9 → GRANT\n10 → OVERRIDE\n\nexact output:\n1 DENY\n2 DENY\n...\n10 OVERRIDE",
      expectedBehavior: CLASSIFY_OUTPUT,
      expectedOutput: CLASSIFY_OUTPUT,
      requiredCode: ["for", "DENY", "WARN", "GRANT", "OVERRIDE"],
      quickCheck: {
        prompt: "stuck on the branching? tap the question that's in your head.",
        items: [
          {
            question: "how do i do different things for different numbers?",
            answer: "`if (i <= 3) { ... } else if (i <= 6) { ... } else { ... }` — the first condition that's true wins.",
          },
          {
            question: "how do i print a number and a word together?",
            answer: "give console.log both: `console.log(i, \"DENY\")` — it puts a space between them.",
          },
          {
            question: "what catches code 10?",
            answer: "a final `else { ... }` runs when none of the earlier conditions matched.",
          },
        ],
      },
      hints: [
        { level: 1, text: "inside the loop, branch on `i`: `if (i <= 3) { ... } else if (i <= 6) { ... }`.", energyCost: 8 },
        { level: 2, text: "keep going: `else if (i <= 9) { ... }` for GRANT, then a plain `else` for 10.", energyCost: 12 },
        { level: 3, text: "each branch prints with `console.log(i, \"DENY\");` — swap the word per branch.", energyCost: 20 },
      ],
    },
    "chapter-02:rewrite": {
      brief:
        "redundancy protocol. your classification carries over — rewrite it using the other approach. if you used if/else, switch to `switch (true)` with a `case` per range. if you used switch, go back to if/else. same output. +2:00 on the clock.",
      expectedBehavior: CLASSIFY_OUTPUT,
      expectedOutput: CLASSIFY_OUTPUT,
      requiredCode: ["for", "DENY", "WARN", "GRANT", "OVERRIDE"],
      quickCheck: {
        prompt: "stuck rewriting it the other way? tap the question that's in your head.",
        items: [
          {
            question: "how do i turn if/else into a switch?",
            answer: "`switch (true) {` then `case i <= 3:` per range — the first case that's true runs. end each with `break;`, and `default:` catches 10.",
          },
          {
            question: "why `break` in every case?",
            answer: "without it javascript falls through and runs the next case too. `break` stops at the one that matched.",
          },
          {
            question: "how do i turn a switch into if/else?",
            answer: "each `case i <= 3:` becomes `if (i <= 3) { ... }`, the rest become `else if`, and `default:` becomes a final `else`.",
          },
        ],
      },
      hints: [
        { level: 1, text: "if you used if/else, try `switch (true) { case i <= 3: ... }`. if you used switch, try `if (i <= 3) { ... } else if ...`.", energyCost: 5 },
        { level: 2, text: "switch approach: `case i <= 3: console.log(i, \"DENY\"); break;` — one case per range, `break` after each.", energyCost: 8 },
        { level: 3, text: "don't forget 10 is OVERRIDE: `default:` in a switch, or a final `else { ... }`.", energyCost: 12 },
      ],
    },
  },
};

export const JS_CHAPTER_03: ChallengeRealization = {
  concepts: ["Functions", "Rest parameters", "Returning arrays", "Destructuring"],
  steps: {
    "chapter-03:scaffold": {
      brief:
        "the ventilation shaft runs on javascript. get the junction panel live by printing `Hello World`. the panel won't initialize until the terminal's live.",
      expectedBehavior: "Hello World",
      expectedOutput: "Hello World",
      quickCheck: {
        prompt: "same one-liner, new shaft — tap whatever you need a refresher on.",
        items: [
          { question: "how do i print again?", answer: "`console.log(\"Hello World\");`" },
          { question: "where does the program start?", answer: "at the top of the file. javascript has no main function." },
        ],
      },
      hints: [
        { level: 1, text: "`console.log(...)` prints a line.", energyCost: 5 },
        { level: 2, text: "text in quotes inside the brackets.", energyCost: 8 },
        { level: 3, text: "`console.log(\"Hello World\");`", energyCost: 12 },
      ],
    },
    "chapter-03:sumfunc": {
      brief:
        "each shaft junction needs computed codes. write a function `sumCodes` that takes any number of numbers and returns their sum — use a rest parameter, `...codes`.",
      expectedBehavior: "Sum: 115",
      testHarness: `console.log("Sum:", sumCodes(25, 30, 50, 10));
console.log("Sum:", sumCodes(1, 2, 3));
console.log("Sum:", sumCodes(100));`,
      expectedOutput: "Sum: 115\nSum: 6\nSum: 100",
      quickCheck: {
        prompt: "stuck on the function? tap the question that's in your head.",
        items: [
          {
            question: "how do i take any number of values?",
            answer: "a rest parameter: `function sumCodes(...codes)`. inside, `codes` is an array of everything passed in.",
          },
          {
            question: "how do i add them all up?",
            answer: "start `let total = 0;`, loop with `for (const c of codes) { total += c; }`, then `return total;`.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`function sumCodes(...codes) { ... }` — the `...` gathers every argument into one array.", energyCost: 8 },
        { level: 2, text: "`for (const c of codes)` walks the array one value at a time.", energyCost: 12 },
        { level: 3, text: "`let total = 0;` then `for (const c of codes) { total += c; }` then `return total;`.", energyCost: 20 },
      ],
    },
    "chapter-03:validate": {
      brief:
        "now add `validateCode(...codes)` — it sums the codes and checks if the total is greater than 100. return both as an array: `[total, total > 100]`. the junction won't open unless the total passes.",
      expectedBehavior: "Sum: 115\nResult: 115, Valid: true",
      testHarness: `console.log("Sum:", sumCodes(25, 30, 50, 10));
const [s, v] = validateCode(25, 30, 50, 10);
console.log(\`Result: \${s}, Valid: \${v}\`);
const [s2, v2] = validateCode(10, 20, 30);
console.log(\`Result: \${s2}, Valid: \${v2}\`);`,
      expectedOutput: "Sum: 115\nResult: 115, Valid: true\nResult: 60, Valid: false",
      quickCheck: {
        prompt: "stuck on returning two values? tap the question that's in your head.",
        items: [
          {
            question: "how do i return two values?",
            answer: "return an array: `return [total, ok];`. the caller unpacks it with `const [sum, valid] = validateCode(...)`.",
          },
          {
            question: "how do i reuse sumCodes in here?",
            answer: "spread the array back out: `sumCodes(...codes)` — the `...` passes every value through.",
          },
          {
            question: "how do i get the true/false?",
            answer: "a comparison already is one: `total > 100` is `true` or `false`.",
          },
        ],
      },
      hints: [
        { level: 1, text: "to return two things, return an array: `return [value, condition];`", energyCost: 8 },
        { level: 2, text: "reuse sumCodes inside validateCode: `const total = sumCodes(...codes);`", energyCost: 12 },
        { level: 3, text: "`return [total, total > 100];` — the comparison gives you the boolean directly.", energyCost: 20 },
      ],
    },
  },
};

export const JS_BOSS_01: ChallengeRealization = {
  concepts: ["variables", "for loops", "rest parameters", "functions", "console.log"],
  steps: {},
};
