import type { Challenge } from "@/types/game";

export const chapter01: Challenge = {
  id: "chapter-01",
  act: 1,
  chapter: 1,
  title: "HANDSHAKE",
  location: "CELL B-09",
  concepts: ["package main", "import", "func main()", "Variables", "Constants", "fmt.Println"],
  steps: [
    // ── Step 1: Scaffold ──
    {
      id: "chapter-01:scaffold",
      title: "SCAFFOLD",
      brief:
        "Every Go program starts the same way. Set up the skeleton: package declaration, import, and main function. Maya's terminal needs a valid Go program before it can run anything.",
      starterCode: `// write a valid Go program skeleton
// every .go file needs four things:
// 1. package declaration
// 2. import statement (we need "fmt")
// 3. func main() { }
// 4. fmt.Println("I'm in") inside main
`,
      expectedBehavior: "valid-go-scaffold",
      hints: [
        {
          level: 1,
          text: "line 1: `package main` — every executable Go file starts here.",
          energyCost: 8,
        },
        {
          level: 2,
          text: "after package, add `import \"fmt\"` — that gives you print functions.",
          energyCost: 12,
        },
        {
          level: 3,
          text: "then `func main() { fmt.Println(\"I'm in\") }` — the entry point. go won't compile if you import fmt but don't use it.",
          energyCost: 20,
        },
      ],
      rushMode: {
        durationSeconds: 30,
        label: "SIGNAL DEGRADING",
        onExpiry: "energy_drain",
        bonusTimeSeconds: 20,
      },
      xp: {
        base: 40,
        firstTryBonus: 20,
        parTimeSeconds: 30,
      },
      events: [
        {
          triggerAtSeconds: 10,
          type: "system",
          message: "SIGNAL INTEGRITY DROPPING — SUBMIT SCAFFOLD TO STABILIZE",
        },
        {
          triggerAtSeconds: 12,
          type: "rush",
          message: "SIGNAL DEGRADING",
        },
      ],
    },

    // ── Step 2: Print Location ──
    {
      id: "chapter-01:location",
      title: "TRANSMIT",
      brief:
        "Now use your program to print Maya's exact location. Use constants and variables to output: CELL B-09 · SUBLEVEL 3",
      starterCode: null, // carry forward from scaffold
      expectedBehavior: "CELL B-09 · SUBLEVEL 3",
      hints: [
        {
          level: 1,
          text: "inside main(), use `fmt.Println(\"your text\")` to print to the terminal.",
          energyCost: 8,
        },
        {
          level: 2,
          text: "`const sublevel = 3` for things that don't change. `cell := \"B-09\"` for quick variables.",
          energyCost: 12,
        },
        {
          level: 3,
          text: "`fmt.Printf(\"CELL %s · SUBLEVEL %d\\n\", cell, sublevel)` — fill in the values.",
          energyCost: 20,
        },
      ],
      rushMode: null,
      xp: {
        base: 60,
        firstTryBonus: 30,
        parTimeSeconds: 60,
      },
      events: [
        {
          triggerAtSeconds: 18,
          type: "story",
          message: "wait.\n\n...footsteps. right outside my door.",
        },
        {
          triggerAtSeconds: 20,
          type: "rush",
          message: "GUARD APPROACHING",
        },
      ],
    },
  ],
  events: [], // level-wide events (none for ch1 — steps handle their own)
  timer: {
    timeLimitSeconds: 150,
    gameOverOnExpiry: true,
  },
  isBoss: false,
  parTimeSeconds: 90,
};

export const chapter01Twist = {
  headline: "SHE KNOWS WHY",
  lines: [
    "> intercepted guard comms...",
    '> "...the encryption thesis... her laptop..."',
    "> maya: they didn't take me at random.",
    "> maya: they want my research.",
  ],
};
