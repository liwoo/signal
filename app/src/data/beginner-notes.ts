// ── Beginner Mode Notes ──
// Pre-level concept briefings shown to new players.
// Each challenge ID maps to an array of note blocks.
// Blocks are either "text" (prose) or "code" (Go snippet).
// Blocks with the same `section` number are revealed together.
// The player presses CONTINUE between sections.
// Code blocks can have `hotspots` — clickable regions with tooltips.

export interface Hotspot {
  text: string;     // exact substring in the code to highlight
  tip: string;      // tooltip shown on click
}

export interface NoteBlock {
  type: "text" | "code";
  content: string;
  section: number;
  hotspots?: Hotspot[]; // only for code blocks
}

export interface BeginnerNotes {
  title: string;
  subtitle: string;
  blocks: NoteBlock[];
}

const BEGINNER_NOTES: Record<string, BeginnerNotes> = {
  "chapter-01": {
    title: "GO BASICS",
    subtitle: "WHAT YOU NEED FOR THIS LEVEL",
    blocks: [
      // Section 0: The skeleton
      {
        type: "text",
        section: 0,
        content:
          "every go program starts with three things: a package declaration, an import, and a main function. this is the skeleton that makes everything else possible.",
      },
      {
        type: "code",
        section: 0,
        content: `package main

import "fmt"

func main() {
    fmt.Println("hello")
}`,
        hotspots: [
          { text: "package main", tip: "declares this file as an executable program. every .go file that runs on its own needs this." },
          { text: `import "fmt"`, tip: "brings in the fmt package — go's standard library for formatted I/O. you'll use it for printing." },
          { text: "func main()", tip: "the entry point. go starts executing here when you run the program." },
          { text: `fmt.Println("hello")`, tip: "prints \"hello\" followed by a newline. Println = Print Line." },
        ],
      },

      // Section 1: What each part does
      {
        type: "text",
        section: 1,
        content:
          "package main tells go this file is an executable program (not a library). import brings in packages you need — fmt gives you print functions.",
      },
      {
        type: "text",
        section: 1,
        content:
          "func main() is the entry point. when you run the program, go starts here. everything inside the curly braces runs top to bottom.",
      },

      // Section 2: Variables & constants
      {
        type: "text",
        section: 2,
        content: "variables and constants — two ways to store values:",
      },
      {
        type: "code",
        section: 2,
        content: `// short declaration (inside functions)
cell := "B-09"

// constant — value never changes
const sublevel = 3`,
        hotspots: [
          { text: `:=`, tip: "short variable declaration. go infers the type from the value on the right. only works inside functions." },
          { text: `"B-09"`, tip: "a string literal. strings in go are enclosed in double quotes." },
          { text: "const", tip: "declares a constant — a value that can never be reassigned. evaluated at compile time, zero runtime cost." },
          { text: "sublevel = 3", tip: "an integer constant. go automatically knows this is an int from the value." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "use := for quick variable declarations inside functions. use const for values that never change. go figures out the type automatically.",
      },

      // Section 3: Printing
      {
        type: "text",
        section: 3,
        content: "printing — two main ways to output text:",
      },
      {
        type: "code",
        section: 3,
        content: `// simple print with newline
fmt.Println("hello world")

// formatted print with placeholders
fmt.Printf("CELL %s · SUBLEVEL %d\\n", cell, sublevel)
// %s = string, %d = integer, \\n = newline`,
        hotspots: [
          { text: "fmt.Println", tip: "prints its arguments followed by a newline. simple and common for quick output." },
          { text: "fmt.Printf", tip: "formatted print. uses verbs like %s and %d as placeholders, then fills them with the values after the comma." },
          { text: "%s", tip: "format verb for strings. gets replaced by the next string argument (cell)." },
          { text: "%d", tip: "format verb for integers. gets replaced by the next integer argument (sublevel)." },
          { text: "\\\\n", tip: "newline character. Printf doesn't add one automatically like Println does — you have to include it yourself." },
        ],
      },
      {
        type: "text",
        section: 3,
        content:
          "Println adds a newline automatically. Printf lets you embed values using format verbs like %s (string) and %d (number). you control the exact output format.",
      },
    ],
  },
};

export function getBeginnerNotes(challengeId: string): BeginnerNotes | null {
  return BEGINNER_NOTES[challengeId] ?? null;
}

export function getSectionCount(notes: BeginnerNotes): number {
  let max = 0;
  for (const block of notes.blocks) {
    if (block.section > max) max = block.section;
  }
  return max + 1;
}
