// ── Act II in Rust ──
// The same steps as the Go chapters (story, stakes, XP, events are shared);
// only the code-shaped half is realized here. Divergences
// (spec/infrastructure/languages.md §Divergences):
//   • the roster is a `HashMap`, built in one expression with `HashMap::from`
//   • Go fakes a set with map[string]bool — Rust has a real `HashSet`
//   • a function that returns string literals says so: `&'static str`
//   • reversal walks characters: `s.chars().rev().collect()` — never bytes
//   • `parse::<i32>()` returns a `Result` — the closest twin of Go's (value, err)
// Harnesses name std paths in full (`std::collections::HashMap`) so they never
// collide with the player's own `use` lines.

import type { ChallengeRealization, StepRealization } from "@/types/game";

const helloScaffold = (brief: string, extra: { question: string; answer: string }): StepRealization => ({
  brief,
  expectedBehavior: "Hello World",
  expectedOutput: "Hello World",
  quickCheck: {
    prompt: "same skeleton, new terminal — tap whatever you need a refresher on.",
    items: [
      { question: "how do i print again?", answer: "`fn main() { println!(\"Hello World\"); }` — the bang, the quotes, the semicolon." },
      extra,
    ],
  },
  hints: [
    { level: 1, text: "`fn main() { }` is where it starts.", energyCost: 5 },
    { level: 2, text: "inside it, `println!(...)` prints a line.", energyCost: 8 },
    { level: 3, text: "`fn main() { println!(\"Hello World\"); }`", energyCost: 12 },
  ],
});

export const RS_CHAPTER_04: ChallengeRealization = {
  concepts: ["HashMap", "HashSet", ".values()", ".len()", "&'static str"],
  steps: {
    "chapter-04:scaffold": helloScaffold("Wake the terminal: print `Hello World`.", {
      question: "do i need a `use` line yet?",
      answer: "not for this. `HashMap` joins with `use std::collections::HashMap;` in the next step — add a `use` when you first need it.",
    }),
    "chapter-04:guardmap": {
      brief:
        'Write `build_roster() -> HashMap<&\'static str, &\'static str>` that returns guard → floor:\n\n"Chen" → "Floor 1"\n"Alvarez" → "Floor 2"\n"Volkov" → "Floor 2"\n"Park" → "Floor 3"\n"Santos" → "Floor 1"\n\nThe terminal looks up Volkov, then Chen, then counts the guards:\n\nFloor 2\nFloor 1\n5',
      expectedBehavior: "Floor 2\nFloor 1\n5",
      testHarness: `fn main() {
    let r = build_roster();
    println!("{}", r["Volkov"]);
    println!("{}", r["Chen"]);
    println!("{}", r.len());
}`,
      expectedOutput: "Floor 2\nFloor 1\n5",
      quickCheck: {
        prompt: "stuck on the roster? tap the question that's in your head.",
        items: [
          {
            question: "how does a hashmap hold a guard and their floor?",
            answer: "it pairs keys with values. `HashMap::from([(\"Chen\", \"Floor 1\")])` — each pair is a tuple, the name first, the floor second.",
          },
          {
            question: "where does HashMap come from?",
            answer: "the standard library. put `use std::collections::HashMap;` at the top of the file.",
          },
          {
            question: "what's `&'static str`?",
            answer: "text that lives for the whole program — every string literal does. a function handing back borrowed text has to say how long it lives, and literals live forever.",
          },
          {
            question: "how does the terminal read it?",
            answer: "`r[\"Volkov\"]` looks a guard up by name, and `r.len()` counts the pairs.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`use std::collections::HashMap;` at the top, then `fn build_roster() -> HashMap<&'static str, &'static str> { }`.", energyCost: 8 },
        { level: 2, text: "inside: `HashMap::from([(\"Chen\", \"Floor 1\"), (\"Alvarez\", \"Floor 2\"), ...])` — one tuple per guard, commas between.", energyCost: 12 },
        { level: 3, text: "all five guards, spelled exactly: Chen, Alvarez, Volkov, Park, Santos. no semicolon after the `HashMap::from(...)` — it's the return value.", energyCost: 20 },
      ],
    },
    "chapter-04:clearfloors": {
      brief:
        "Write `find_clear_floor(guards: &HashMap<&str, &str>, max_floor: u32) -> String`: collect the floors that have a guard into a `HashSet`, then return the first of `Floor 1` … `Floor max_floor` that isn't in it.\n\nThe terminal tries three rosters:\n\nFloor 4\nFloor 2\nFloor 3",
      expectedBehavior: "Floor 4\nFloor 2\nFloor 3",
      testHarness: `fn main() {
    let r = build_roster();
    println!("{}", find_clear_floor(&r, 4));
    println!("{}", find_clear_floor(&std::collections::HashMap::from([("A", "Floor 1"), ("B", "Floor 3")]), 3));
    println!("{}", find_clear_floor(&std::collections::HashMap::from([("X", "Floor 1"), ("Y", "Floor 2")]), 3));
}`,
      expectedOutput: "Floor 4\nFloor 2\nFloor 3",
      requiredCode: ["HashSet"],
      quickCheck: {
        prompt: "stuck finding the gap? tap the question that's in your head.",
        items: [
          {
            question: "how do i get just the floors out of the roster?",
            answer: "`guards.values()` walks every value — the floors — without the names.",
          },
          {
            question: "what's a HashSet and why use one?",
            answer: "a set holds each thing once and answers `contains` instantly. `use std::collections::HashSet;` brings it in.",
          },
          {
            question: "how do i turn the values into a set?",
            answer: "`let occupied: HashSet<&str> = guards.values().copied().collect();` — `copied` turns each `&&str` into a plain `&str`, `collect` builds whatever type you named.",
          },
          {
            question: "how do i build the floor's name?",
            answer: "`format!(\"Floor {}\", i)` — like `println!`, but it hands the text back as a `String` instead of printing it.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`let occupied: HashSet<&str> = guards.values().copied().collect();` — every floor that has a guard, each once.", energyCost: 8 },
        { level: 2, text: "`for i in 1..=max_floor { let name = format!(\"Floor {}\", i); ... }` — the `=` includes the top floor.", energyCost: 12 },
        { level: 3, text: "inside the loop: `if !occupied.contains(name.as_str()) { return name; }`. after the loop, `String::new()` — rust needs an answer for every path.", energyCost: 20 },
      ],
    },
  },
};

export const RS_CHAPTER_04_2: ChallengeRealization = {
  concepts: ["chars()", "rev() & collect()", "split_whitespace() & join()", "parse() & Result"],
  steps: {
    "chapter-04.2:scaffold": helloScaffold("Bring the relay online: print `Hello World`.", {
      question: "what do i need to import for the cipher?",
      answer: "nothing. `chars`, `split_whitespace`, `join` and `parse` are methods every string already has.",
    }),
    "chapter-04.2:reverseword": {
      brief:
        "Write `reverse_word(s: &str) -> String` that returns the word backwards. The terminal tries three words:\n\nolleh\noG\na",
      expectedBehavior: "olleh\noG\na",
      testHarness: `fn main() {
    println!("{}", reverse_word("hello"));
    println!("{}", reverse_word("Go"));
    println!("{}", reverse_word("a"));
}`,
      expectedOutput: "olleh\noG\na",
      quickCheck: {
        prompt: "stuck reversing the word? tap the question that's in your head.",
        items: [
          {
            question: "can i change the letters inside a `&str`?",
            answer: "no — a `&str` is borrowed text you can only read. you build a new `String` and return it.",
          },
          {
            question: "why not just flip the bytes?",
            answer: "rust strings are utf-8. a letter like `é` takes two bytes — flip bytes and you split it in half. `chars()` walks whole characters.",
          },
          {
            question: "how do i turn reversed chars back into a String?",
            answer: "`collect()` gathers them up. the return type `-> String` tells it what to build.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`s.chars()` walks the word one character at a time.", energyCost: 5 },
        { level: 2, text: "`.rev()` walks it from the end instead.", energyCost: 8 },
        { level: 3, text: "`s.chars().rev().collect()` — no semicolon, so it's the return value.", energyCost: 12 },
      ],
    },
    "chapter-04.2:encode": {
      brief:
        "Write `encode(msg: &str) -> String`: split the message into words, reverse each with `reverse_word`, join them back with spaces. Encoding twice must give the original back:\n\nroolf si raelc\nevom ot tfahs 3\nround trip",
      expectedBehavior: "roolf si raelc\nevom ot tfahs 3\nround trip",
      testHarness: `fn main() {
    println!("{}", encode("floor is clear"));
    println!("{}", encode("move to shaft 3"));
    println!("{}", encode(&encode("round trip")));
}`,
      expectedOutput: "roolf si raelc\nevom ot tfahs 3\nround trip",
      quickCheck: {
        prompt: "stuck encoding the message? tap the question that's in your head.",
        items: [
          {
            question: "how do i break a message into words?",
            answer: "`msg.split_whitespace()` walks the words, skipping any run of spaces between them.",
          },
          {
            question: "how do i reverse every word?",
            answer: "`.map(reverse_word)` runs your function on each one — you can pass a function by name.",
          },
          {
            question: "how do i glue words back together?",
            answer: "collect them into a `Vec<String>`, then `.join(\" \")` puts a space between each.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`msg.split_whitespace()` gives you the words one by one.", energyCost: 5 },
        { level: 2, text: "`.map(reverse_word)` turns each word around, then `.collect::<Vec<String>>()` gathers them.", energyCost: 8 },
        { level: 3, text: "finish with `.join(\" \")` — the whole thing is one chain, returned with no semicolon.", energyCost: 12 },
      ],
    },
    "chapter-04.2:relayheader": {
      brief:
        'Write `relay_header(floor: u32, code: &str) -> String` that returns `"F<floor>-C<code × 2>"`. `code` is text — turn it into a number with `code.parse::<i32>()`. It hands back a `Result`: on `Err`, return `"F<floor>-ERR"` instead of crashing:\n\nF2-C100\nF3-ERR\nF1-C50',
      expectedBehavior: "F2-C100\nF3-ERR\nF1-C50",
      testHarness: `fn main() {
    println!("{}", relay_header(2, "50"));
    println!("{}", relay_header(3, "abc"));
    println!("{}", relay_header(1, "25"));
}`,
      expectedOutput: "F2-C100\nF3-ERR\nF1-C50",
      quickCheck: {
        prompt: "stuck on the header? tap the question that's in your head.",
        items: [
          {
            question: "how do i turn \"50\" into the number 50?",
            answer: "`code.parse::<i32>()` — the `::<i32>` says which number type you want back.",
          },
          {
            question: "what does parse give me?",
            answer: "a `Result`: `Ok(50)` when it worked, `Err(...)` when the text isn't a number. you have to look inside before you can use the number.",
          },
          {
            question: "how do i handle both cases?",
            answer: "`match code.parse::<i32>() { Ok(n) => ..., Err(_) => ... }` — one arm each. rust won't let you forget the error arm.",
          },
          {
            question: "why not `.unwrap()`?",
            answer: "unwrap means \"i promise it's fine\" — and on \"abc\" it panics and the relay goes down. the match keeps it running.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`code.parse::<i32>()` returns `Ok(number)` or `Err(reason)`.", energyCost: 5 },
        { level: 2, text: "`match code.parse::<i32>() { Ok(n) => ..., Err(_) => ... }` — one arm for each.", energyCost: 8 },
        { level: 3, text: "`Ok(n) => format!(\"F{}-C{}\", floor, n * 2),` and `Err(_) => format!(\"F{}-ERR\", floor),`.", energyCost: 12 },
      ],
    },
  },
};
