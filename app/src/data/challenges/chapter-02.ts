import type { Challenge } from "@/types/game";

export const chapter02: Challenge = {
  id: "chapter-02",
  act: 1,
  chapter: 2,
  title: "DOOR CODE",
  location: "CELL B-09 · KEYPAD",
  concepts: ["For Loops", "Switch/Case", "If/Else"],
  steps: [
    // ── Step 1: Scaffold ──
    {
      id: "chapter-02:scaffold",
      title: "SCAFFOLD",
      brief:
        "the keypad is wired to a go program. get it live by printing `Hello World` — that one line pulls in the whole skeleton: package, import, and a main function. the keypad won't respond until the terminal's live.",
      starterCode: ``,
      expectedBehavior: "valid go program with package main, import fmt, and func main",
      quickCheck: {
        prompt: "same skeleton as before — tap whatever you need a refresher on.",
        items: [
          {
            question: "which line makes it runnable again?",
            answer: "`package main` on the first line. no main package, nothing runs.",
          },
          {
            question: "how do i pull in fmt?",
            answer: "`import \"fmt\"` right after the package line, quotes included.",
          },
          {
            question: "where does the code that runs go?",
            answer: "inside `func main()` — that's the entry point go looks for.",
          },
        ],
      },
      hints: [
        {
          level: 1,
          text: "same skeleton as before: package main, import \"fmt\", func main() { }.",
          energyCost: 5,
        },
        {
          level: 2,
          text: "add import \"fmt\" after the package line. then write func main() { } at the bottom.",
          energyCost: 8,
        },
        {
          level: 3,
          text: "package main, then import \"fmt\", then func main() { fmt.Println(\"Hello World\") }",
          energyCost: 12,
        },
      ],
      rushMode: null,
      xp: {
        base: 50,
        firstTryBonus: 25,
        parTimeSeconds: 30,
      },
      events: [],
    },
    // ── Step 2: Loop ──
    {
      id: "chapter-02:loop",
      title: "LOOP",
      brief:
        "the keypad cycles codes 1-10. write a for loop that prints each number on its own line. just the numbers — nothing else.\n\nexpected output:\n1\n2\n3\n...\n10",
      starterCode: null, // carry forward from scaffold
      expectedBehavior: "loop-1-to-10",
      quickCheck: {
        prompt: "stuck on the loop? tap the question that's in your head.",
        items: [
          {
            question: "which keyword do i loop with?",
            answer: "go only has one: `for`. there's no while or repeat — `for` covers all of them.",
          },
          {
            question: "how do i count from 1 to 10?",
            answer: "`for i := 1; i <= 10; i++` — start, condition, step. the body runs while the condition holds.",
          },
          {
            question: "what is that `i++` doing?",
            answer: "it adds 1 to `i` after each pass, so the loop moves forward instead of running forever.",
          },
        ],
      },
      hints: [
        {
          level: 1,
          text: "`for i := 1; i <= 10; i++` — that's go's only loop keyword.",
          energyCost: 8,
        },
        {
          level: 2,
          text: "inside the loop: `fmt.Println(i)` prints the current number.",
          energyCost: 12,
        },
        {
          level: 3,
          text: "`for i := 1; i <= 10; i++ { fmt.Println(i) }` — that's the whole thing.",
          energyCost: 20,
        },
      ],
      rushMode: null,
      xp: {
        base: 50,
        firstTryBonus: 25,
        parTimeSeconds: 45,
      },
      events: [],
      expectedOutput: "1\n2\n3\n4\n5\n6\n7\n8\n9\n10",
      requiredCode: ["for", "Println(i"],
    },
    // ── Step 3: Classify ──
    {
      id: "chapter-02:classify",
      title: "CLASSIFY",
      brief:
        "now modify your loop to classify each code. print the number followed by its access level — separated by a space.\n\n1-3 → DENY\n4-6 → WARN\n7-9 → GRANT\n10 → OVERRIDE\n\nexact output:\n1 DENY\n2 DENY\n...\n10 OVERRIDE",
      starterCode: null, // carry forward from loop
      expectedBehavior:
        "1 DENY\n2 DENY\n3 DENY\n4 WARN\n5 WARN\n6 WARN\n7 GRANT\n8 GRANT\n9 GRANT\n10 OVERRIDE",
      quickCheck: {
        prompt: "stuck on the switch? tap the question that's in your head.",
        items: [
          {
            question: "how do i test a value against several cases?",
            answer: "use `switch` with a `case` for each value you want to match — cleaner than stacking if/else.",
          },
          {
            question: "what catches a value none of my cases match?",
            answer: "add a `default:` branch. it's the fallback that runs when no earlier case matched.",
          },
        ],
      },
      hints: [
        {
          level: 1,
          text: "`switch { case i <= 3: ... }` — no variable after switch for range checking.",
          energyCost: 8,
        },
        {
          level: 2,
          text: "each case is a condition: `case i <= 3:` then `case i <= 6:` then `case i <= 9:`.",
          energyCost: 12,
        },
        {
          level: 3,
          text: "use `default:` for code 10 (OVERRIDE). print with `fmt.Println(i, \"DENY\")`.",
          energyCost: 20,
        },
      ],
      rushMode: {
        durationSeconds: 40,
        label: "CELL B-10 IN DANGER",
        onExpiry: "energy_drain",
        bonusTimeSeconds: 30,
      },
      xp: {
        base: 100,
        firstTryBonus: 50,
        parTimeSeconds: 90,
      },
      events: [
        {
          triggerAtSeconds: 12,
          type: "story",
          message: "two slow knocks from cell B-10.\n\n...someone's in there.",
        },
        {
          triggerAtSeconds: 28,
          type: "story",
          message: "three knocks now. a distress signal.",
        },
        {
          triggerAtSeconds: 30,
          type: "rush",
          message: "CELL B-10 IN DANGER",
        },
      ],
      expectedOutput:
        "1 DENY\n2 DENY\n3 DENY\n4 WARN\n5 WARN\n6 WARN\n7 GRANT\n8 GRANT\n9 GRANT\n10 OVERRIDE",
      requiredCode: ["for", "DENY", "WARN", "GRANT", "OVERRIDE"],
    },
    // ── Step 4: Rewrite ──
    {
      id: "chapter-02:rewrite",
      title: "REWRITE",
      brief:
        "redundancy protocol. your classification carries over — rewrite it using the other approach. if you used switch, switch to if/else chains. if you used if/else, use switch/case. same output. +2:00 on the clock.",
      starterCode: null, // carry the player's classification forward — they rewrite it in place
      expectedBehavior:
        "1 DENY\n2 DENY\n3 DENY\n4 WARN\n5 WARN\n6 WARN\n7 GRANT\n8 GRANT\n9 GRANT\n10 OVERRIDE",
      quickCheck: {
        prompt: "stuck rewriting it the other way? tap the question that's in your head.",
        items: [
          {
            question: "how do i turn a switch into if/else?",
            answer: "each `case i <= 3:` becomes `if i <= 3 { ... }`, the next becomes `else if i <= 6 { ... }`, and `default:` becomes a final `else { ... }`.",
          },
          {
            question: "how do i turn if/else into a switch?",
            answer: "open `switch {` with no value after it, then one `case i <= 3:` per condition, and `default:` for the last one (code 10).",
          },
          {
            question: "do i still need the loop?",
            answer: "yes — keep the `for i := 1; i <= 10; i++` loop. only the branching style inside it changes.",
          },
        ],
      },
      hints: [
        {
          level: 1,
          text: "if you used switch before, try `if i <= 3 { ... } else if i <= 6 { ... }`. if you used if/else, try `switch { case i <= 3: ... }`.",
          energyCost: 5,
        },
        {
          level: 2,
          text: "switch approach: `switch { case i <= 3: fmt.Println(i, \"DENY\") case i <= 6: ... }`. if/else approach: `if i <= 3 { fmt.Println(i, \"DENY\") } else if i <= 6 { ... }`.",
          energyCost: 8,
        },
        {
          level: 3,
          text: "don't forget the last case: 10 is OVERRIDE. use `default:` in switch or a final `else { ... }` in if/else.",
          energyCost: 12,
        },
      ],
      rushMode: {
        durationSeconds: 120,
        label: "REDUNDANCY CHECK",
        onExpiry: "energy_drain",
        bonusTimeSeconds: 120,
      },
      xp: {
        base: 75,
        firstTryBonus: 25,
        parTimeSeconds: 60,
      },
      events: [
        {
          triggerAtSeconds: 3,
          type: "rush",
          message: "REDUNDANCY CHECK",
        },
      ],
      expectedOutput:
        "1 DENY\n2 DENY\n3 DENY\n4 WARN\n5 WARN\n6 WARN\n7 GRANT\n8 GRANT\n9 GRANT\n10 OVERRIDE",
      requiredCode: ["for", "DENY", "WARN", "GRANT", "OVERRIDE"],
    },
  ],
  events: [],
  timer: {
    timeLimitSeconds: 330,
    gameOverOnExpiry: true,
  },
  isBoss: false,
  parTimeSeconds: 90,
};

export const chapter02Twist = {
  headline: "SOMEONE KNOWS HER NAME",
  lines: [
    "> ...",
    '> "Maya? Maya Chen?"',
    "> maya: ...someone knows my name.",
    "> maya: i need to get to B-10.",
  ],
};
