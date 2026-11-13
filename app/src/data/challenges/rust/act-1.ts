// ── Act I in Rust ──
// The same steps as the Go chapters (story, stakes, XP, events are shared);
// only the code-shaped half is realized here. Rust sits closest to Go — a
// program starts in `fn main`, and the compiler checks everything first — so
// the scaffold steps keep Go's "write the skeleton" shape. Divergences
// (docs/rust-act-1-plan.md):
//   • printing is a macro: `println!("{} {}", a, b)` — `{}` placeholders
//   • the shipped module is a sibling file declared with `mod cellblock;` and
//     read through a path: `cellblock::CELL`
//   • chapter-02:rewrite rebuilds the if/else chain as a `match` on ranges
//   • Rust has no variadic functions — Ch3 passes a slice, `&[i32]`, and
//     returns a tuple `(i32, bool)`

import type { ChallengeRealization } from "@/types/game";

const CLASSIFY_OUTPUT =
  "1 DENY\n2 DENY\n3 DENY\n4 WARN\n5 WARN\n6 WARN\n7 GRANT\n8 GRANT\n9 GRANT\n10 OVERRIDE";

export const RS_CHAPTER_01: ChallengeRealization = {
  concepts: ["fn main()", "println!", "Strings", "mod", "Constants", "Format strings"],
  steps: {
    "chapter-01:scaffold": {
      brief: "Make the program print `Hello World`.",
      expectedBehavior: "Hello World",
      expectedOutput: "Hello World",
      quickCheck: {
        prompt: "stuck getting hello world out? tap the question that's in your head.",
        items: [
          {
            question: "where does a rust program start?",
            answer: "inside `fn main() { }`. rust runs whatever is between those braces — that's the entry point.",
          },
          {
            question: "how do i print something?",
            answer: "`println!(\"...\")` prints a line. the `!` matters — println is a macro, not a plain function.",
          },
          {
            question: "do i need an import first?",
            answer: "no. `println!` is always there. no package line, no import — just `fn main`.",
          },
        ],
      },
      hints: [
        { level: 1, text: "every rust program starts in `fn main() { }` — your code goes between the braces.", energyCost: 8 },
        { level: 2, text: "print with `println!(\"...\")` — don't forget the `!`, and end the line with `;`.", energyCost: 12 },
        { level: 3, text: "`fn main() { println!(\"Hello World\"); }` — that's the whole program.", energyCost: 20 },
      ],
    },
    "chapter-01:location": {
      brief: "Declare `mod cellblock;` and print its `CELL` and `SUBLEVEL` as: CELL B-09 - SUBLEVEL 3",
      expectedBehavior: "CELL B-09 - SUBLEVEL 3",
      expectedOutput: "CELL B-09 - SUBLEVEL 3",
      requiredCode: ["cellblock::CELL", "cellblock::SUBLEVEL"],
      compileModule: {
        module: "terminal",
        files: [
          {
            path: "cellblock.rs",
            content: `// CELL is maya's holding cell.
pub const CELL: &str = "B-09";

// SUBLEVEL is how far underground the cell sits.
pub const SUBLEVEL: u8 = 3;
`,
          },
        ],
      },
      quickCheck: {
        prompt: "stuck reading the cell data? tap the question that's in your head.",
        items: [
          {
            question: "how do i use another file's values?",
            answer: "declare the file as a module at the top: `mod cellblock;`. then reach in with two colons: `cellblock::CELL`.",
          },
          {
            question: "how do i put values into a printed line?",
            answer: "each `{}` in the text is a slot. the values follow in order: `println!(\"CELL {}\", cellblock::CELL)`.",
          },
          {
            question: "why are the names in capitals?",
            answer: "rust writes constants in SCREAMING_CASE. `pub` means the file lets you read them from outside.",
          },
        ],
      },
      hints: [
        { level: 1, text: "the values live in a sibling file. put `mod cellblock;` at the top, above `fn main`.", energyCost: 8 },
        { level: 2, text: "reach in with `::` — `cellblock::CELL` is the cell, `cellblock::SUBLEVEL` is the sublevel.", energyCost: 12 },
        { level: 3, text: "`println!(\"CELL {} - SUBLEVEL {}\", cellblock::CELL, cellblock::SUBLEVEL);` — one `{}` per value.", energyCost: 20 },
      ],
    },
  },
};

export const RS_CHAPTER_02: ChallengeRealization = {
  concepts: ["for loops", "Ranges", "if / else if / else", "match"],
  steps: {
    "chapter-02:scaffold": {
      brief:
        "the keypad is wired to a rust program. get it live by printing `Hello World` — `fn main` and one `println!`. the keypad won't respond until the terminal's live.",
      expectedBehavior: "Hello World",
      expectedOutput: "Hello World",
      quickCheck: {
        prompt: "same skeleton as before — tap whatever you need a refresher on.",
        items: [
          { question: "where does the code go?", answer: "between the braces of `fn main() { }`." },
          { question: "how do i print again?", answer: "`println!(\"Hello World\");` — bang, quotes, semicolon." },
        ],
      },
      hints: [
        { level: 1, text: "same as before: `fn main() { }` is where it starts.", energyCost: 5 },
        { level: 2, text: "inside it, `println!(...)` prints a line.", energyCost: 8 },
        { level: 3, text: "`fn main() { println!(\"Hello World\"); }`", energyCost: 12 },
      ],
    },
    "chapter-02:loop": {
      brief:
        "the keypad cycles codes 1-10. write a for loop that prints each number on its own line. just the numbers — nothing else.\n\nexpected output:\n1\n2\n3\n...\n10",
      expectedBehavior: "loop-1-to-10",
      expectedOutput: "1\n2\n3\n4\n5\n6\n7\n8\n9\n10",
      requiredCode: ["for ", " in ", ".."],
      quickCheck: {
        prompt: "stuck on the loop? tap the question that's in your head.",
        items: [
          {
            question: "how do i count from 1 to 10?",
            answer: "`for i in 1..=10 { }` — `1..=10` is a range that includes the 10.",
          },
          {
            question: "why does my loop stop at 9?",
            answer: "`1..10` stops BEFORE 10. add the equals sign — `1..=10` — to include it.",
          },
          {
            question: "how do i print the number?",
            answer: "`println!(\"{}\", i);` — the `{}` is the slot the number drops into.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`for i in 1..=10 { }` — the `=` makes the range include 10.", energyCost: 8 },
        { level: 2, text: "inside the braces, print the number: `println!(\"{}\", i);`.", energyCost: 12 },
        { level: 3, text: "`for i in 1..=10 { println!(\"{}\", i); }` inside `fn main`. that's the whole thing.", energyCost: 20 },
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
            answer: "`if i <= 3 { } else if i <= 6 { } else { }` — the first condition that's true wins. no brackets around the condition.",
          },
          {
            question: "how do i print a number and a word together?",
            answer: "two slots: `println!(\"{} DENY\", i);` — the number fills the `{}`, the word is plain text.",
          },
          {
            question: "what catches code 10?",
            answer: "a final `else { }` runs when none of the earlier conditions matched.",
          },
        ],
      },
      hints: [
        { level: 1, text: "inside the loop, branch on `i`: `if i <= 3 { ... } else if i <= 6 { ... }`.", energyCost: 8 },
        { level: 2, text: "keep going: `else if i <= 9` for GRANT, then a plain `else` for 10.", energyCost: 12 },
        { level: 3, text: "each branch prints with `println!(\"{} DENY\", i);` — swap the word per branch.", energyCost: 20 },
      ],
    },
    "chapter-02:rewrite": {
      brief:
        "redundancy protocol. your classification carries over — rebuild it as a `match` on `i`. one arm per range: `1..=3 => \"DENY\"`, and `_` catches the rest. same output. +2:00 on the clock.",
      expectedBehavior: CLASSIFY_OUTPUT,
      expectedOutput: CLASSIFY_OUTPUT,
      requiredCode: ["match", "=>", "DENY", "WARN", "GRANT", "OVERRIDE"],
      quickCheck: {
        prompt: "stuck on the match? tap the question that's in your head.",
        items: [
          {
            question: "what's a match?",
            answer: "it checks a value against patterns, top to bottom, and runs the first arm that fits: `match i { 1..=3 => ..., _ => ... }`.",
          },
          {
            question: "what's the `_` for?",
            answer: "it matches anything. rust makes a match cover every possible value — `_` is the catch-all, so 10 lands there.",
          },
          {
            question: "can a match give back a value?",
            answer: "yes. `let level = match i { 1..=3 => \"DENY\", ... };` — then `println!(\"{} {}\", i, level);`.",
          },
        ],
      },
      hints: [
        { level: 1, text: "inside the loop: `let level = match i { ... };` — the match hands back the word.", energyCost: 5 },
        { level: 2, text: "one arm per range: `1..=3 => \"DENY\",` `4..=6 => \"WARN\",` `7..=9 => \"GRANT\",`.", energyCost: 8 },
        { level: 3, text: "finish with `_ => \"OVERRIDE\",` then print both: `println!(\"{} {}\", i, level);`.", energyCost: 12 },
      ],
    },
  },
};

export const RS_CHAPTER_03: ChallengeRealization = {
  concepts: ["Functions", "Slices (&[i32])", "Returning tuples", "Destructuring"],
  steps: {
    "chapter-03:scaffold": {
      brief:
        "the ventilation shaft runs on rust. get the junction panel live by printing `Hello World`. the panel won't initialize until the terminal's live.",
      expectedBehavior: "Hello World",
      expectedOutput: "Hello World",
      quickCheck: {
        prompt: "same skeleton, new shaft — tap whatever you need a refresher on.",
        items: [
          { question: "how do i start again?", answer: "`fn main() { println!(\"Hello World\"); }`" },
          { question: "why the `!` on println?", answer: "println is a macro. macros are called with a bang." },
        ],
      },
      hints: [
        { level: 1, text: "`fn main() { }` is the entry point.", energyCost: 5 },
        { level: 2, text: "`println!(...)` prints a line.", energyCost: 8 },
        { level: 3, text: "`fn main() { println!(\"Hello World\"); }`", energyCost: 12 },
      ],
    },
    "chapter-03:sumfunc": {
      brief:
        "each shaft junction needs computed codes. write a function `sum_codes` that takes a slice of numbers — `codes: &[i32]` — and returns their sum as an `i32`.",
      expectedBehavior: "Sum: 115",
      testHarness: `fn main() {
    println!("Sum: {}", sum_codes(&[25, 30, 50, 10]));
    println!("Sum: {}", sum_codes(&[1, 2, 3]));
    println!("Sum: {}", sum_codes(&[100]));
}`,
      expectedOutput: "Sum: 115\nSum: 6\nSum: 100",
      quickCheck: {
        prompt: "stuck on the function? tap the question that's in your head.",
        items: [
          {
            question: "how do i take any number of values?",
            answer: "rust has no \"any number of arguments\". pass a slice instead: `fn sum_codes(codes: &[i32]) -> i32`. callers write `sum_codes(&[1, 2, 3])`.",
          },
          {
            question: "how do i add them all up?",
            answer: "`let mut total = 0;` then `for c in codes { total += c; }` then end with `total` — no semicolon, so it's returned.",
          },
          {
            question: "why `let mut`?",
            answer: "rust variables can't change unless you say so. `mut` lets `total` grow as you add.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`fn sum_codes(codes: &[i32]) -> i32 { }` — the `-> i32` is what it gives back.", energyCost: 8 },
        { level: 2, text: "`let mut total = 0;` then `for c in codes { total += c; }` walks the slice.", energyCost: 12 },
        { level: 3, text: "end the function with `total` on its own line, no semicolon — the last expression is the return value.", energyCost: 20 },
      ],
    },
    "chapter-03:validate": {
      brief:
        "now add `validate_code(codes: &[i32]) -> (i32, bool)` — it sums the codes and checks if the total is greater than 100. return both as a tuple: `(total, total > 100)`. the junction won't open unless the total passes.",
      expectedBehavior: "Sum: 115\nResult: 115, Valid: true",
      testHarness: `fn main() {
    println!("Sum: {}", sum_codes(&[25, 30, 50, 10]));
    let (s, v) = validate_code(&[25, 30, 50, 10]);
    println!("Result: {}, Valid: {}", s, v);
    let (s2, v2) = validate_code(&[10, 20, 30]);
    println!("Result: {}, Valid: {}", s2, v2);
}`,
      expectedOutput: "Sum: 115\nResult: 115, Valid: true\nResult: 60, Valid: false",
      quickCheck: {
        prompt: "stuck on returning two values? tap the question that's in your head.",
        items: [
          {
            question: "how do i return two values?",
            answer: "return a tuple: the type is `(i32, bool)` and the value is `(total, total > 100)`. the caller unpacks it with `let (s, v) = ...`.",
          },
          {
            question: "how do i reuse sum_codes in here?",
            answer: "pass the slice straight through: `let total = sum_codes(codes);` — it's already a `&[i32]`.",
          },
          {
            question: "how do i get the true/false?",
            answer: "a comparison already is one: `total > 100` is a `bool`.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`fn validate_code(codes: &[i32]) -> (i32, bool)` — the return type is a pair.", energyCost: 8 },
        { level: 2, text: "reuse your function inside it: `let total = sum_codes(codes);`.", energyCost: 12 },
        { level: 3, text: "end with `(total, total > 100)` — no semicolon. the comparison gives you the bool directly.", energyCost: 20 },
      ],
    },
  },
};

export const RS_BOSS_01: ChallengeRealization = {
  concepts: ["let / let mut", "for loops", "slices", "functions", "println!"],
  steps: {},
};
