// ── Act I in Python ──
// The same steps as the Go chapters (story, stakes, XP, events are shared);
// only the code-shaped half is realized here. Divergences from Go, decided in
// docs/cross-language-act-1-plan.md §9:
//   • no boilerplate — scaffold steps teach "one line runs" (§8, option A)
//   • chapter-02:rewrite rebuilds the if/elif chain as a dict lookup table
//   • booleans print as True/False, so expectedOutput is Python's own

import type { ChallengeRealization } from "@/types/game";

const CLASSIFY_OUTPUT =
  "1 DENY\n2 DENY\n3 DENY\n4 WARN\n5 WARN\n6 WARN\n7 GRANT\n8 GRANT\n9 GRANT\n10 OVERRIDE";

export const PY_CHAPTER_01: ChallengeRealization = {
  concepts: ["Programs", "print()", "Strings", "import", "Constants", "f-strings"],
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
            answer: "`print(...)` writes whatever you put in the brackets to the terminal, then a new line.",
          },
          {
            question: "do i need any setup first?",
            answer: "no. a python file runs top to bottom — no package, no main. one line is a whole program.",
          },
          {
            question: "how do i write text?",
            answer: "wrap it in quotes: `\"Hello World\"`. without quotes python thinks it's a variable name.",
          },
        ],
      },
      hints: [
        { level: 1, text: "python prints with `print(...)` — no setup, the file runs top to bottom.", energyCost: 8 },
        { level: 2, text: "text goes in quotes: `\"Hello World\"`. put it inside the brackets of print.", energyCost: 12 },
        { level: 3, text: "`print(\"Hello World\")` — that one line is the whole program.", energyCost: 20 },
      ],
    },
    "chapter-01:location": {
      brief: "Import `cellblock` and print its `CELL` and `SUBLEVEL` as: CELL B-09 · SUBLEVEL 3",
      expectedBehavior: "CELL B-09 · SUBLEVEL 3",
      expectedOutput: "CELL B-09 · SUBLEVEL 3",
      requiredCode: ["cellblock.CELL", "cellblock.SUBLEVEL"],
      compileModule: {
        module: "terminal",
        files: [
          {
            path: "cellblock.py",
            content: `# CELL is maya's holding cell.
CELL = "B-09"

# SUBLEVEL is how far underground the cell sits.
SUBLEVEL = 3
`,
          },
        ],
      },
      quickCheck: {
        prompt: "stuck importing the cell data? tap the question that's in your head.",
        items: [
          {
            question: "how do i use another file's values?",
            answer: "`import cellblock` at the top, then reach in with a dot: `cellblock.CELL`, `cellblock.SUBLEVEL`.",
          },
          {
            question: "how do i mix text and values in one line?",
            answer: "an f-string: put `f` before the quotes and the value in braces — `f\"CELL {cellblock.CELL}\"`.",
          },
          {
            question: "why are the names in capitals?",
            answer: "that's python's way of saying \"this is a constant — don't change it\". it's a convention, not a rule.",
          },
        ],
      },
      hints: [
        { level: 1, text: "the values live in a module. add `import cellblock` at the top.", energyCost: 8 },
        { level: 2, text: "reach in with a dot: `cellblock.CELL` is the cell, `cellblock.SUBLEVEL` is the sublevel.", energyCost: 12 },
        { level: 3, text: "`print(f\"CELL {cellblock.CELL} · SUBLEVEL {cellblock.SUBLEVEL}\")` — an f-string drops both values in.", energyCost: 20 },
      ],
    },
  },
};

export const PY_CHAPTER_02: ChallengeRealization = {
  concepts: ["for loops", "range()", "if / elif / else", "Dictionaries"],
  steps: {
    "chapter-02:scaffold": {
      brief:
        "the keypad is wired to a python program. get it live by printing `Hello World` — no skeleton needed, one line is a whole program. the keypad won't respond until the terminal's live.",
      expectedBehavior: "Hello World",
      expectedOutput: "Hello World",
      quickCheck: {
        prompt: "same one-liner as before — tap whatever you need a refresher on.",
        items: [
          { question: "how do i print again?", answer: "`print(\"Hello World\")` — text in quotes, inside the brackets." },
          { question: "do i need a main function?", answer: "no. python runs the file from the top. that's the whole program." },
        ],
      },
      hints: [
        { level: 1, text: "same as before: `print(...)` prints a line.", energyCost: 5 },
        { level: 2, text: "the text goes in quotes inside the brackets.", energyCost: 8 },
        { level: 3, text: "`print(\"Hello World\")`", energyCost: 12 },
      ],
    },
    "chapter-02:loop": {
      brief:
        "the keypad cycles codes 1-10. write a for loop that prints each number on its own line. just the numbers — nothing else.\n\nexpected output:\n1\n2\n3\n...\n10",
      expectedBehavior: "loop-1-to-10",
      expectedOutput: "1\n2\n3\n4\n5\n6\n7\n8\n9\n10",
      requiredCode: ["for", "range", "print(i"],
      quickCheck: {
        prompt: "stuck on the loop? tap the question that's in your head.",
        items: [
          {
            question: "how do i count from 1 to 10?",
            answer: "`for i in range(1, 11):` — range stops BEFORE its second number, so 11 gets you to 10.",
          },
          {
            question: "why does my loop stop at 9?",
            answer: "`range(1, 10)` never reaches 10 — the end is excluded. use `range(1, 11)`.",
          },
          {
            question: "how does python know what's inside the loop?",
            answer: "indentation. end the `for` line with `:` and indent the body four spaces.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`for i in range(1, 11):` — range's end is excluded, so 11 stops at 10.", energyCost: 8 },
        { level: 2, text: "indent the body under the `for` line: `    print(i)`.", energyCost: 12 },
        { level: 3, text: "`for i in range(1, 11):` then on the next line, indented, `print(i)`. that's the whole thing.", energyCost: 20 },
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
            answer: "`if i <= 3:` ... `elif i <= 6:` ... `else:` — the first condition that's true wins.",
          },
          {
            question: "how do i print a number and a word together?",
            answer: "give print both: `print(i, \"DENY\")` — it puts a space between them.",
          },
          {
            question: "what catches code 10?",
            answer: "a final `else:` runs when none of the earlier conditions matched.",
          },
        ],
      },
      hints: [
        { level: 1, text: "inside the loop, branch on `i`: `if i <= 3:` then `elif i <= 6:`.", energyCost: 8 },
        { level: 2, text: "keep going: `elif i <= 9:` for GRANT, then a plain `else:` for 10.", energyCost: 12 },
        { level: 3, text: "each branch prints with `print(i, \"DENY\")` — swap the word per branch, and indent each body.", energyCost: 20 },
      ],
    },
    "chapter-02:rewrite": {
      brief:
        "redundancy protocol. your classification carries over — rebuild it as a lookup table: a dict that maps every code to its level, then print `i` and `levels[i]` in the loop. same output. +2:00 on the clock.",
      expectedBehavior: CLASSIFY_OUTPUT,
      expectedOutput: CLASSIFY_OUTPUT,
      requiredCode: ["for", "DENY", "WARN", "GRANT", "OVERRIDE", "[i]"],
      quickCheck: {
        prompt: "stuck building the table? tap the question that's in your head.",
        items: [
          {
            question: "what's a dict?",
            answer: "a lookup table: `{1: \"DENY\", 4: \"WARN\"}` maps each key to a value. `levels[1]` gives back `\"DENY\"`.",
          },
          {
            question: "do i really list all ten codes?",
            answer: "yes — ten entries, one per code. data instead of branches: no conditions left to get wrong.",
          },
          {
            question: "do i still need the loop?",
            answer: "yes — keep `for i in range(1, 11):`. inside it, look the level up: `print(i, levels[i])`.",
          },
        ],
      },
      hints: [
        { level: 1, text: "build the table above the loop: `levels = {1: \"DENY\", 2: \"DENY\", 3: \"DENY\", 4: \"WARN\", ...}`.", energyCost: 5 },
        { level: 2, text: "finish all ten entries — 7, 8, 9 are GRANT and 10 is OVERRIDE.", energyCost: 8 },
        { level: 3, text: "the loop body becomes one line: `print(i, levels[i])` — the dict does the deciding.", energyCost: 12 },
      ],
    },
  },
};

export const PY_CHAPTER_03: ChallengeRealization = {
  concepts: ["Functions", "*args", "Returning tuples", "Unpacking"],
  steps: {
    "chapter-03:scaffold": {
      brief:
        "the ventilation shaft runs on python. get the junction panel live by printing `Hello World`. the panel won't initialize until the terminal's live.",
      expectedBehavior: "Hello World",
      expectedOutput: "Hello World",
      quickCheck: {
        prompt: "same one-liner, new shaft — tap whatever you need a refresher on.",
        items: [
          { question: "how do i print again?", answer: "`print(\"Hello World\")`" },
          { question: "where does the program start?", answer: "at the top of the file. python runs it line by line." },
        ],
      },
      hints: [
        { level: 1, text: "`print(...)` prints a line.", energyCost: 5 },
        { level: 2, text: "text in quotes inside the brackets.", energyCost: 8 },
        { level: 3, text: "`print(\"Hello World\")`", energyCost: 12 },
      ],
    },
    "chapter-03:sumfunc": {
      brief:
        "each shaft junction needs computed codes. write a function `sum_codes` that takes any number of numbers and returns their sum — use `*codes` to collect them.",
      expectedBehavior: "Sum: 115",
      testHarness: `print("Sum:", sum_codes(25, 30, 50, 10))
print("Sum:", sum_codes(1, 2, 3))
print("Sum:", sum_codes(100))`,
      expectedOutput: "Sum: 115\nSum: 6\nSum: 100",
      quickCheck: {
        prompt: "stuck on the function? tap the question that's in your head.",
        items: [
          {
            question: "how do i take any number of values?",
            answer: "put a star on the parameter: `def sum_codes(*codes):`. inside, `codes` is a tuple of everything passed in.",
          },
          {
            question: "how do i add them all up?",
            answer: "`total = 0`, then `for c in codes:` with `total += c` indented under it, then `return total`.",
          },
          {
            question: "why sum_codes and not sumCodes?",
            answer: "python names functions in snake_case — lowercase words joined by underscores.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`def sum_codes(*codes):` — the star gathers every argument into one tuple.", energyCost: 8 },
        { level: 2, text: "`for c in codes:` walks the tuple one value at a time.", energyCost: 12 },
        { level: 3, text: "`total = 0`, `for c in codes: total += c`, then `return total` — each body line indented.", energyCost: 20 },
      ],
    },
    "chapter-03:validate": {
      brief:
        "now add `validate_code(*codes)` — it sums the codes and checks if the total is greater than 100. return both: `return total, total > 100`. the junction won't open unless the total passes.",
      expectedBehavior: "Sum: 115\nResult: 115, Valid: True",
      testHarness: `print("Sum:", sum_codes(25, 30, 50, 10))
s, v = validate_code(25, 30, 50, 10)
print(f"Result: {s}, Valid: {v}")
s2, v2 = validate_code(10, 20, 30)
print(f"Result: {s2}, Valid: {v2}")`,
      expectedOutput: "Sum: 115\nResult: 115, Valid: True\nResult: 60, Valid: False",
      quickCheck: {
        prompt: "stuck on returning two values? tap the question that's in your head.",
        items: [
          {
            question: "how do i return two values?",
            answer: "separate them with a comma: `return total, ok`. the caller unpacks them with `s, v = validate_code(...)`.",
          },
          {
            question: "how do i reuse sum_codes in here?",
            answer: "unpack the tuple back out: `sum_codes(*codes)` — the star passes every value through.",
          },
          {
            question: "how do i get the True/False?",
            answer: "a comparison already is one: `total > 100` is `True` or `False`.",
          },
        ],
      },
      hints: [
        { level: 1, text: "to return two things, separate them with a comma: `return value, condition`.", energyCost: 8 },
        { level: 2, text: "reuse sum_codes inside validate_code: `total = sum_codes(*codes)`.", energyCost: 12 },
        { level: 3, text: "`return total, total > 100` — the comparison gives you the boolean directly.", energyCost: 20 },
      ],
    },
  },
};

export const PY_BOSS_01: ChallengeRealization = {
  concepts: ["variables", "for loops", "*args", "functions", "print()"],
  steps: {},
};
