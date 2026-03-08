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
        "the keypad is wired to a go program. set up the skeleton — package, import, and a main function. the keypad won't accept input until the terminal is initialized.",
      starterCode: `package main

// TODO: import the fmt package

// TODO: write func main()
// the keypad cycles codes 1 through 10
// you'll need to loop through them
`,
      expectedBehavior: "valid go program with package main, import fmt, and func main",
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
          text: "package main, then import \"fmt\", then func main() { fmt.Println(\"ready\") }",
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
        "the keypad cycles codes 1-10. write a for loop that prints each code number.",
      starterCode: null, // carry forward from scaffold
      expectedBehavior: "loop-1-to-10",
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
    },
    // ── Step 3: Classify ──
    {
      id: "chapter-02:classify",
      title: "CLASSIFY",
      brief:
        "now classify each code. the keypad assigns access levels based on the code number:\n\ncodes 1-3 → DENY (restricted zones)\ncodes 4-6 → WARN (caution zones)\ncodes 7-9 → GRANT (cleared zones)\ncode 10 → OVERRIDE (master key)\n\nprint each code followed by its label, e.g. `1 DENY`, `2 DENY`, ... `10 OVERRIDE`.",
      starterCode: null, // carry forward from loop
      expectedBehavior:
        "1 DENY\n2 DENY\n3 DENY\n4 WARN\n5 WARN\n6 WARN\n7 GRANT\n8 GRANT\n9 GRANT\n10 OVERRIDE",
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
    },
    // ── Step 4: Rewrite ──
    {
      id: "chapter-02:rewrite",
      title: "REWRITE",
      brief:
        "redundancy protocol. rewrite the classification using the other approach — if you used switch, use if/else chains. if you used if/else, use switch/case. same output required. +45s bonus time.",
      starterCode: `package main

import "fmt"

func main() {
\t// REDUNDANCY PROTOCOL
\t// Rewrite classification using the OTHER approach
\t// switch → if/else, or if/else → switch
\t//
\t// Access levels:
\t//   1-3  → DENY
\t//   4-6  → WARN
\t//   7-9  → GRANT
\t//   10   → OVERRIDE
\t//
\t// Print: code number then label (e.g. 1 DENY)
\tfor i := 1; i <= 10; i++ {
\t\t// classify here
\t}
}
`,
      expectedBehavior:
        "1 DENY\n2 DENY\n3 DENY\n4 WARN\n5 WARN\n6 WARN\n7 GRANT\n8 GRANT\n9 GRANT\n10 OVERRIDE",
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
        bonusTimeSeconds: 45,
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
    },
  ],
  events: [],
  timer: {
    timeLimitSeconds: 240,
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
