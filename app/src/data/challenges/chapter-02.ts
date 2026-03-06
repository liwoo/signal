import type { Challenge } from "@/types/game";

export const chapter02: Challenge = {
  id: "chapter-02",
  act: 1,
  chapter: 2,
  title: "DOOR CODE",
  location: "CELL B-09 · KEYPAD",
  concepts: ["For Loops", "Switch/Case", "If/Else"],
  steps: [
    {
      id: "chapter-02:loop",
      title: "LOOP",
      brief:
        "The keypad cycles codes 1-10. Write a for loop that prints each code number.",
      starterCode: `package main

import "fmt"

func main() {
    // Loop through codes 1-10
    // Print each number
}
`,
      expectedBehavior: "loop-1-to-10",
      hints: [
        {
          level: 1,
          text: "`for i := 1; i <= 10; i++` — that's Go's only loop keyword.",
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
    },
    {
      id: "chapter-02:classify",
      title: "CLASSIFY",
      brief:
        "Now classify each code. For each number 1-10, print the action:\n1-3: DENY\n4-6: WARN\n7-9: GRANT\n10: OVERRIDE",
      starterCode: null,
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
    },
  ],
  events: [],
  timer: {
    timeLimitSeconds: 180,
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
