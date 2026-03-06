import type { Challenge } from "@/types/game";

export const chapter03: Challenge = {
  id: "chapter-03",
  act: 1,
  chapter: 3,
  title: "SHAFT CODES",
  location: "VENTILATION SHAFT · SUBLEVEL 3",
  concepts: ["Functions", "Multiple Returns", "Variadic"],
  steps: [
    {
      id: "chapter-03:sumfunc",
      title: "SUM FUNCTION",
      brief:
        "Each shaft junction needs computed codes. Write a variadic function `sumCodes` that takes any number of ints and returns their sum.",
      starterCode: `package main

import "fmt"

// sumCodes takes any number of ints and returns their sum
func sumCodes(codes ...int) int {
    // TODO
}

func main() {
    sum := sumCodes(25, 30, 50, 10)
    fmt.Println("Sum:", sum)
}
`,
      expectedBehavior: "Sum: 115",
      hints: [
        {
          level: 1,
          text: "variadic means `func name(args ...int)` — it takes any number of ints.",
          energyCost: 8,
        },
        {
          level: 2,
          text: "`for _, c := range codes` — loop through the variadic parameter like a slice.",
          energyCost: 12,
        },
        {
          level: 3,
          text: "`total := 0` then `for _, c := range codes { total += c }` then `return total`.",
          energyCost: 20,
        },
      ],
      rushMode: null,
      xp: {
        base: 75,
        firstTryBonus: 35,
        parTimeSeconds: 60,
      },
      events: [
        {
          triggerAtSeconds: 8,
          type: "powercut",
          message: "POWER FAILURE DETECTED",
        },
        {
          triggerAtSeconds: 10,
          type: "system",
          message: "BACKUP POWER · 90 SECONDS",
        },
      ],
    },
    {
      id: "chapter-03:validate",
      title: "VALIDATE",
      brief:
        "Now add `validateCode` — it returns two values: the sum and whether it's valid (> 100). The junction won't open unless the total passes.",
      starterCode: null,
      expectedBehavior: "Sum: 115\nResult: 115, Valid: true",
      hints: [
        {
          level: 1,
          text: "to return two things: `func f() (int, bool) { return val, cond }`",
          energyCost: 8,
        },
        {
          level: 2,
          text: "reuse sumCodes inside validateCode: `total := sumCodes(codes...)`",
          energyCost: 12,
        },
        {
          level: 3,
          text: "`return total, total > 100` — the comparison gives you the bool directly.",
          energyCost: 20,
        },
      ],
      rushMode: {
        durationSeconds: 90,
        label: "BACKUP POWER FAILING",
        onExpiry: "power_reduced",
        bonusTimeSeconds: 45,
      },
      xp: {
        base: 125,
        firstTryBonus: 65,
        parTimeSeconds: 120,
      },
      events: [
        {
          triggerAtSeconds: 5,
          type: "rush",
          message: "BACKUP POWER FAILING",
        },
      ],
    },
  ],
  events: [],
  timer: {
    timeLimitSeconds: 240,
    gameOverOnExpiry: false,
  },
  isBoss: false,
  parTimeSeconds: 120,
};

export const chapter03Twist = {
  headline: "DR. REEVES",
  lines: [
    "> maya reached cell B-10.",
    "> the door opens.",
    "> ...",
    '> "Maya — I know exactly why they took us."',
    "> dr. eleanor reeves. alive.",
  ],
};
