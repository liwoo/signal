import type { Challenge } from "@/types/game";

export const chapter03: Challenge = {
  id: "chapter-03",
  act: 1,
  chapter: 3,
  title: "SHAFT CODES",
  location: "VENTILATION SHAFT · SUBLEVEL 3",
  concepts: ["Functions", "Multiple Returns", "Variadic"],
  steps: [
    // ── Step 0: Scaffold ──
    {
      id: "chapter-03:scaffold",
      title: "SCAFFOLD",
      brief:
        "the ventilation shaft runs on go. set up the program skeleton — package, import, main function. the junction panel won't initialize until the terminal structure is right.",
      starterCode: `package main

// TODO: import the fmt package

// TODO: write func main()
// the shaft junctions need computed codes
// you'll write functions to process them
`,
      expectedBehavior:
        "valid go program with package main, import fmt, and func main",
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
          text: 'package main, then import "fmt", then func main() { fmt.Println("ready") }',
          energyCost: 12,
        },
      ],
      rushMode: null,
      xp: {
        base: 40,
        firstTryBonus: 20,
        parTimeSeconds: 30,
      },
      events: [],
    },
    // ── Step 1: Sum Function ──
    {
      id: "chapter-03:sumfunc",
      title: "SUM FUNCTION",
      brief:
        "each shaft junction needs computed codes. write a variadic function `sumCodes` that takes any number of ints and returns their sum. add it above main and call it from main.",
      starterCode: null, // carry forward from scaffold
      expectedBehavior: "Sum: 115",
      testHarness: `func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
    fmt.Println("Sum:", sumCodes(1, 2, 3))
    fmt.Println("Sum:", sumCodes(100))
}`,
      expectedOutput: "Sum: 115\nSum: 6\nSum: 100",
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
    // ── Step 2: Validate ──
    {
      id: "chapter-03:validate",
      title: "VALIDATE",
      brief:
        "now add `validateCode(codes ...int) (int, bool)` — it sums the codes and checks if the total is greater than 100. return both: the sum and `total > 100`. the junction won't open unless the total passes.",
      starterCode: null,
      expectedBehavior: "Sum: 115\nResult: 115, Valid: true",
      testHarness: `func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
    s, v := validateCode(25, 30, 50, 10)
    fmt.Printf("Result: %d, Valid: %v\\n", s, v)
    s2, v2 := validateCode(10, 20, 30)
    fmt.Printf("Result: %d, Valid: %v\\n", s2, v2)
}`,
      expectedOutput:
        "Sum: 115\nResult: 115, Valid: true\nResult: 60, Valid: false",
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
    timeLimitSeconds: 300,
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
