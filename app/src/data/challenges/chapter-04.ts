import type { Challenge } from "@/types/game";

export const chapter04: Challenge = {
  id: "chapter-04",
  act: 2,
  chapter: 5,
  title: "GUARD ROSTER",
  location: "FLOOR 1-3 · SURVEILLANCE",
  concepts: ["Arrays", "Slices", "Maps", "Range"],
  steps: [
    // ── Step 0: Scaffold ──
    {
      id: "chapter-04:scaffold",
      title: "SCAFFOLD",
      brief:
        "every go program starts the same way. set up the skeleton — package, import, and a main function. print \"ready\" so the terminal initializes.",
      starterCode: `package main

// TODO: import the fmt package

// TODO: write func main()
// put fmt.Println("ready") inside so the import is used
// maya photographed the guard schedule
// you'll use maps to parse it
`,
      expectedBehavior: "valid-go-scaffold",
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
        parTimeSeconds: 25,
      },
      events: [],
    },
    // ── Step 1: Guard Map ──
    {
      id: "chapter-04:guardmap",
      title: "MAP",
      brief:
        'write a function `buildRoster() map[string]string` that returns a map with these key-value pairs:\n\n"Chen": "Floor 1"\n"Alvarez": "Floor 2"\n"Volkov": "Floor 2"\n"Park": "Floor 3"\n"Santos": "Floor 1"\n\nadd it above main. the terminal will test it automatically.',
      starterCode: null, // carry forward from scaffold
      expectedBehavior: "Floor 2\nFloor 1\n5",
      testHarness: `func main() {
\tr := buildRoster()
\tfmt.Println(r["Volkov"])
\tfmt.Println(r["Chen"])
\tfmt.Println(len(r))
}`,
      expectedOutput: "Floor 2\nFloor 1\n5",
      hints: [
        {
          level: 1,
          text: "`func buildRoster() map[string]string { }` — declare the function above main. return a map literal.",
          energyCost: 8,
        },
        {
          level: 2,
          text: 'inside the function: `return map[string]string{"Chen": "Floor 1", ...}` — one entry per line, trailing comma.',
          energyCost: 12,
        },
        {
          level: 3,
          text: 'return the full map with all 5 guards. the terminal tests multiple lookups — all entries must be correct.',
          energyCost: 20,
        },
      ],
      rushMode: null,
      xp: {
        base: 60,
        firstTryBonus: 30,
        parTimeSeconds: 45,
      },
      events: [],
    },
    // ── Step 2: Clear Floors ──
    {
      id: "chapter-04:clearfloors",
      title: "CLEAR",
      brief:
        'write a function `findClearFloor(guards map[string]string, maxFloor int) string` that:\n\n1. builds `occupied := map[string]bool{}` from the guard map values using `range`\n2. loops from 1 to `maxFloor` (the function receives this as a parameter — use it in your loop condition)\n3. returns the first floor name not in the occupied set\n\nuse `fmt.Sprintf("Floor %d", i)` to build floor names. the terminal will test it with different guard configs and floor counts.',
      starterCode: null, // carry forward
      expectedBehavior: "Floor 4\nFloor 2\nFloor 3",
      testHarness: `func main() {
\tr := buildRoster()
\tfmt.Println(findClearFloor(r, 4))
\tg2 := map[string]string{"A": "Floor 1", "B": "Floor 3"}
\tfmt.Println(findClearFloor(g2, 3))
\tg3 := map[string]string{"X": "Floor 1", "Y": "Floor 2"}
\tfmt.Println(findClearFloor(g3, 3))
}`,
      expectedOutput: "Floor 4\nFloor 2\nFloor 3",
      hints: [
        {
          level: 1,
          text: "`func findClearFloor(guards map[string]string, maxFloor int) string` — takes a guard map and floor count, returns the first clear floor.",
          energyCost: 8,
        },
        {
          level: 2,
          text: 'build `occupied := map[string]bool{}` then `for _, floor := range guards { occupied[floor] = true }`. loop 1 to maxFloor and check.',
          energyCost: 12,
        },
        {
          level: 3,
          text: '`for i := 1; i <= maxFloor; i++ { name := fmt.Sprintf("Floor %d", i); if !occupied[name] { return name } }` — return the first gap.',
          energyCost: 20,
        },
      ],
      rushMode: null,
      xp: {
        base: 100,
        firstTryBonus: 50,
        parTimeSeconds: 90,
      },
      events: [],
    },
  ],
  events: [
    {
      triggerAtSeconds: 15,
      type: "story",
      message:
        "a camera in the corner swivels toward the terminal. you've been spotted on surveillance.",
    },
    {
      triggerAtSeconds: 45,
      type: "story",
      message:
        "[GHOST] you have twelve hours. then the building burns.",
    },
    {
      triggerAtSeconds: 90,
      type: "system",
      message: "SURVEILLANCE SWEEP IN PROGRESS — STAY FOCUSED",
    },
  ],
  timer: {
    timeLimitSeconds: 330,
    gameOverOnExpiry: true,
  },
  isBoss: false,
  parTimeSeconds: 120,
};

export const chapter04Twist = {
  headline: "GHOST PROTOCOL",
  lines: [
    "> [GHOST]: you have twelve hours.",
    "> [GHOST]: then the building burns.",
    "> maya: ...who is this?",
    "> maya: reeves never mentioned a ghost protocol.",
  ],
};
