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
        'create a map that stores each guard\'s floor assignment. the schedule is:\n\nChen → Floor 1\nAlvarez → Floor 2\nVolkov → Floor 2\nPark → Floor 3\nSantos → Floor 1\n\nuse map[string]string. once the map is built, print Volkov\'s floor to verify.\n\nexpected output:\nFloor 2',
      starterCode: null, // carry forward from scaffold
      expectedBehavior: "Floor 2",
      testHarness: `func main() {
	guards := map[string]string{
		"Chen": "Floor 1",
		"Alvarez": "Floor 2",
		"Volkov": "Floor 2",
		"Park": "Floor 3",
		"Santos": "Floor 1",
	}
	fmt.Println(guards["Volkov"])
}`,
      expectedOutput: "Floor 2",
      hints: [
        {
          level: 1,
          text: "declare a map with `guards := map[string]string{ }` and fill in the key-value pairs.",
          energyCost: 8,
        },
        {
          level: 2,
          text: 'inside the braces: `"Chen": "Floor 1",` — one entry per line. don\'t forget the trailing comma.',
          energyCost: 12,
        },
        {
          level: 3,
          text: 'build the full map, then `fmt.Println(guards["Volkov"])` to print the value.',
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
        'now find which floors have no guards during the current window. check floors 1 through 4 — if a floor isn\'t in any guard\'s assignment, print it.\n\nexpected output:\nFloor 4 is clear',
      starterCode: null, // carry forward
      expectedBehavior: "Floor 4 is clear",
      testHarness: `func main() {
	guards := map[string]string{
		"Chen": "Floor 1",
		"Alvarez": "Floor 2",
		"Volkov": "Floor 2",
		"Park": "Floor 3",
		"Santos": "Floor 1",
	}
	occupied := map[string]bool{}
	for _, floor := range guards {
		occupied[floor] = true
	}
	for i := 1; i <= 4; i++ {
		name := fmt.Sprintf("Floor %d", i)
		if !occupied[name] {
			fmt.Printf("%s is clear\\n", name)
		}
	}
}`,
      expectedOutput: "Floor 4 is clear",
      hints: [
        {
          level: 1,
          text: "use `for _, floor := range guards` to collect all occupied floors into a separate map or slice.",
          energyCost: 8,
        },
        {
          level: 2,
          text: 'build `occupied := map[string]bool{}` — set `occupied[floor] = true` for each guard\'s floor. then loop 1-4 and check.',
          energyCost: 12,
        },
        {
          level: 3,
          text: '`for i := 1; i <= 4; i++` — use `fmt.Sprintf("Floor %d", i)` to build the key, then `if !occupied[name]` to find the gap.',
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
    timeLimitSeconds: 300,
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
