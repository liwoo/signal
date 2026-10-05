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
      title: "HELLO WORLD",
      stake:
        "Maya's locked in a cell and this terminal is your only line to her — right now it's dead. Get it to say one thing back so you know you're actually connected.",
      brief: "Make the program print `Hello World`.",
      starterCode: ``,
      expectedBehavior: "valid-go-scaffold",
      quickCheck: {
        prompt: "stuck getting hello world out? tap the question that's in your head.",
        items: [
          {
            question: "how do i make this a program go can run?",
            answer: "the first line has to be `package main`. that package name is what makes it runnable instead of just a library.",
          },
          {
            question: "how do i get access to printing?",
            answer: "add `import \"fmt\"` under the package line, quotes included. fmt is the standard package for printing.",
          },
          {
            question: "where does the program actually start?",
            answer: "inside `func main()`. go runs whatever is in main first — that's the entry point.",
          },
        ],
      },
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
          text: "then `func main() { fmt.Println(\"Hello World\") }` — the entry point. go won't compile if you import fmt but don't use it.",
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
          message: "SIGNAL INTEGRITY DROPPING — TRANSMIT PROGRAM TO STABILIZE",
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
      stake:
        "To send help you need to know exactly where Maya is held — and a guessed location gets people killed. Pull her real cell straight from the terminal instead of typing it by hand.",
      brief:
        "Import `terminal/cellblock` and print its `Cell` and `Sublevel` as: CELL B-09 · SUBLEVEL 3",
      starterCode: null, // carry the player's own code forward — guidance lives in the chat, not the editor

      expectedBehavior: "CELL B-09 · SUBLEVEL 3",
      expectedOutput: "CELL B-09 · SUBLEVEL 3",
      requiredCode: ["cellblock.Cell", "cellblock.Sublevel"],
      compileModule: {
        module: "terminal",
        files: [
          {
            path: "cellblock/cellblock.go",
            content: `package cellblock

// Cell is maya's holding cell.
const Cell = "B-09"

// Sublevel is how far underground the cell sits.
var Sublevel = 3
`,
          },
        ],
      },
      quickCheck: {
        prompt: "stuck importing the cell data? tap the question that's in your head.",
        items: [
          {
            question: "how do i import more than one package?",
            answer: "group them: `import (` then one path per line — `\"fmt\"` and `\"terminal/cellblock\"` — then `)`.",
          },
          {
            question: "how do i read a value out of the package?",
            answer: "use the package name and a dot: `cellblock.Cell` for the const, `cellblock.Sublevel` for the variable.",
          },
          {
            question: "how do i print text and a number together?",
            answer: "`fmt.Printf` with placeholders — `%s` for the cell string, `%d` for the sublevel number.",
          },
        ],
      },
      hints: [
        {
          level: 1,
          text: "the values live in a package. add `\"terminal/cellblock\"` to your import block — group it with fmt inside `import ( ... )`.",
          energyCost: 8,
        },
        {
          level: 2,
          text: "reach into the package with a dot: `cellblock.Cell` is the cell string, `cellblock.Sublevel` is the sublevel number.",
          energyCost: 12,
        },
        {
          level: 3,
          text: "`fmt.Printf(\"CELL %s · SUBLEVEL %d\\n\", cellblock.Cell, cellblock.Sublevel)` — %s for the cell, %d for the sublevel.",
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
    timeLimitSeconds: 210,
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
