import type { CheckReport, CompileModule, LanguageId, MissionCheck } from "@/types/game";
import { buildReport, CHECK_LABELS, diffOutput, usesCheck } from "@/lib/game/checks";
import { getLanguageService } from "@/lib/lang/registry";
import type { LanguageService } from "@/lib/lang/types";
import type { CodePattern, ConceptEntry, StepBank } from "./banks/types";
import { JAVASCRIPT_BANKS } from "./banks/javascript";
import { PYTHON_BANKS } from "./banks/python";
import { RUST_BANKS } from "./banks/rust";

export type { StepBank };

// ── Types ──

export interface MayaResponse {
  reply: string;
  isComplete: boolean;
  /** Code submissions: the mission checks, one by one, as of this run. */
  report?: CheckReport;
}

// ── Keyword Matching ──

function matchesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((raw) => {
    // Keywords match case-insensitively — "Println" in a bank must still catch
    // a player typing "println".
    const kw = raw.toLowerCase();
    if (kw.length <= 3 && /^[a-z]+$/.test(kw)) {
      return new RegExp(`\\b${kw}\\b`).test(lower);
    }
    return lower.includes(kw);
  });
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Scaffold Validator ──
// Minify the code (strip whitespace, comments, lowercase) and check
// that the Go skeleton is present. Two valid forms:
//   packagemainimport"fmt"funcmain(){...}
//   packagemainimport("fmt")funcmain(){...}

function minify(code: string): string {
  return code
    .replace(/\/\/[^\n]*/g, "")   // strip line comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // strip block comments
    .replace(/\s+/g, "")         // strip all whitespace
    .toLowerCase();
}

/** Returns true if code is a valid Go scaffold (package + import fmt + func main + uses fmt). */
export function isValidScaffold(code: string): boolean {
  const m = minify(code);
  const hasPackage = m.includes("packagemain");
  const hasImport = m.includes('import"fmt"') || m.includes('import("fmt")');
  const hasMain = m.includes("funcmain(){");
  const usesFmt = m.includes("fmt.print") || m.includes("fmt.sprint") || m.includes("fmt.fprint");
  return hasPackage && hasImport && hasMain && usesFmt;
}

// ── Step Banks ──

// Chapter 01: Step 1 — Scaffold
const ch01ScaffoldBank: StepBank = {
  intro:
    "...signal received. you're in.\ni'm maya — they've locked me in a cell and this terminal is my only way to reach anyone. right now it's dead. make it print `Hello World` so i know the channel's actually live.",

  conceptFAQ: [
    {
      keywords: ["together", "text and a number", "number and text", "text and number", "and a number", "with a number", "mix", "same line"],
      response:
        "pass them to `fmt.Println` separated by commas — it puts a space between each one. `fmt.Println(\"sublevel\", 3)` prints `sublevel 3`. for this step i just need `Hello World` though.",
    },
    {
      keywords: ["func", "function", "entry"],
      response:
        "`func main() { }` — the entry point. when the program runs, it starts here. all your code goes inside those braces.",
    },
    {
      keywords: ["package", "package main"],
      response:
        "`package main` — first line of every executable go file. it tells the compiler this is a runnable program, not a library.",
    },
    {
      keywords: ["import", "fmt"],
      response:
        "`import \"fmt\"` goes after the package line. fmt gives you print functions. you'll need it for the next step.",
    },
    {
      keywords: ["mod", "module", "go.mod"],
      response:
        "normally you'd run `go mod init` to create a module. this terminal handles that — just focus on the code file.",
    },
    {
      keywords: ["run", "execute", "compile", "build"],
      response:
        "just write the skeleton and hit transmit. i'll verify it on my end.",
    },
    {
      keywords: ["go", "golang", "language", "why go"],
      response:
        "go. fast, simple, compiles to a single binary. that's why this terminal runs it. no dependencies to trace.",
    },
    {
      keywords: ["skeleton", "scaffold", "structure", "setup"],
      response:
        "four parts: `package main` at the top, `import \"fmt\"`, `func main() { }`, and `fmt.Println(\"Hello World\")` inside main — go won't compile if you import something and don't use it.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "what next", "where do i start", "start"],
      response:
        "make it print `Hello World`. five lines: `package main`, `import \"fmt\"`, `func main() {`, `fmt.Println(\"Hello World\")`, then `}`. transmit it.",
    },
    {
      keywords: ["curly brace", "curly bracket", "opening brace", "closing brace", "where does the {"],
      response:
        "opening brace `{` must be on the same line as `func main()`. go is strict about that. closing `}` goes on its own line.",
    },
    {
      keywords: ["error", "wrong", "not working", "doesn't work", "broken", "fail"],
      response:
        "check the order: `package main` first, then `import \"fmt\"`, then `func main() { }` with a `fmt.Println` inside. every piece matters.",
    },
    {
      keywords: ["semicolon", ";"],
      response:
        "go doesn't use semicolons at the end of lines. the compiler adds them automatically. just write the code without them.",
    },
    {
      keywords: ["capital", "uppercase", "lowercase", "case sensitive", "case-sensitive", "fmt.println"],
      response:
        "go is case-sensitive. it's `fmt.Println` with a capital P — `fmt.println` won't compile. go only lets you use names from another package that start with a capital letter.",
    },
  ],

  codePatterns: [
    {
      match: (code) => isValidScaffold(code),
      response:
        "there it is — `Hello World` on the wire. the terminal accepted it. package, import, main — the skeleton's all there.\n\n||COMPLETE||",
    },
    {
      match: (code) => !minify(code).includes("packagemain"),
      response:
        "the terminal rejected it. every go file starts with `package main`. first line.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("packagemain") && !m.includes('import"fmt"') && !m.includes('import("fmt")');
      },
      response:
        "package is good. but you need `import \"fmt\"` — we'll need print functions next.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("packagemain") && (m.includes('import"fmt"') || m.includes('import("fmt")')) && !m.includes("funcmain(){");
      },
      response:
        "package and import are set. now add `func main() { }` — the entry point.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("packagemain") && (m.includes('import"fmt"') || m.includes('import("fmt")')) && m.includes("funcmain(){") && !m.includes("fmt.print") && !m.includes("fmt.sprint");
      },
      response:
        "almost. go won't compile if you import fmt but don't use it. add `fmt.Println(\"Hello World\")` inside main.",
    },
  ],

  correctResponse:
    "there it is — `Hello World` on the wire. the terminal accepted it. package, import, main — the skeleton's all there.\n\n||COMPLETE||",

  genericWrong: [
    "the terminal can't parse that. i need: package main, import, func main(), and use fmt inside.",
    "not a valid go program. start with `package main` on the first line.",
    "missing pieces. a go program needs package, import, func main(), and a fmt.Println inside.",
  ],

  rushDialogue: [
    "the signal's degrading. just get `Hello World` printing. package, import, main, println.",
    "hurry — five lines is all i need. package main, import fmt, func main, fmt.Println.",
    "losing you. print `Hello World`. now.",
  ],

  stuckResponses: [
    "five lines, in order:\n1. `package main`\n2. `import \"fmt\"`\n3. `func main() {`\n4. `fmt.Println(\"Hello World\")`\n5. `}`",
    "every go program has the same shape. package at top, imports, then func main with a print inside. go won't compile if you import something unused.",
    "just write:\n```\npackage main\nimport \"fmt\"\nfunc main() {\n  fmt.Println(\"Hello World\")\n}\n```",
  ],

  deflections: [
    "not now — i need the program skeleton first.",
    "can't process that. set up the go program: package, import, main.",
    "focus. three lines of boilerplate and we can move on.",
  ],
};

// Chapter 01: Step 2 — Transmit Location
const ch01LocationBank: StepBank = {
  intro:
    "good, the channel's live. now i need you to lock in where they're holding me — and it has to be exact, a wrong location gets someone hurt. don't type it by hand: my real cell is already on this terminal in a package called `cellblock`. import `terminal/cellblock` and print its `Cell` and `Sublevel` as `CELL B-09 - SUBLEVEL 3`.",

  conceptFAQ: [
    {
      // "how do i print text and a number together?" — the step's own hint
      // question. Must win over the generic "print" entry below.
      keywords: ["together", "text and a number", "number and text", "text and number", "and a number", "with a number", "mix", "same line"],
      response:
        "pass the pieces to `fmt.Println` separated by commas — it puts a space between each one. `fmt.Println(\"SUBLEVEL\", cellblock.Sublevel)` prints `SUBLEVEL 3`. the whole line is `fmt.Println(\"CELL\", cellblock.Cell, \"-\", \"SUBLEVEL\", cellblock.Sublevel)`.",
    },
    {
      // before "print" — "sprintf" contains it
      keywords: ["sprint"],
      response:
        "`fmt.Sprintf` builds a string without printing. `fmt.Printf` prints directly. either works — just make sure the output has B-09 and SUBLEVEL 3.",
    },
    {
      keywords: ["print", "println", "output", "display", "show", "write"],
      response:
        "`fmt.Println` sends a line through the terminal. but don't put my cell in quotes — feed it the package values, separated by commas: `fmt.Println(\"CELL\", cellblock.Cell, \"-\", \"SUBLEVEL\", cellblock.Sublevel)`.",
    },
    {
      keywords: ["import", "package", "cellblock", "another package"],
      response:
        "add the package to your import block: `import (` then `\"fmt\"` and `\"terminal/cellblock\"` on their own lines, then `)`. that pulls the cell data onto this terminal.",
    },
    {
      keywords: ["access", "use the package", "read the value", "get the value", "dot notation", "reach into", "how do i use cellblock"],
      response:
        "package name, then a dot, then the exported name: `cellblock.Cell` is the cell string, `cellblock.Sublevel` is the number. that's how you read what a package exposes.",
    },
    {
      keywords: ["variable", "var", ":=", "declare", "assign"],
      response:
        "you can pull the package value into your own name: `sublevel := cellblock.Sublevel`. `:=` declares and assigns in one step.",
    },
    {
      keywords: ["constant", "const"],
      response:
        "`cellblock.Cell` is already a `const` inside the package — a value that never changes. you don't declare it, you just read it.",
    },
    {
      keywords: ["string", "text", "quote", "double quote"],
      response:
        "strings go in double quotes: \"like this\". single quotes are for single characters only.",
    },
    {
      keywords: ["printf", "format", "%s", "%d", "placeholder"],
      response:
        "`fmt.Printf` fills blanks in a template: `fmt.Printf(\"CELL %s - SUBLEVEL %d\\n\", cellblock.Cell, cellblock.Sublevel)`. %s for text, %d for whole numbers, \\n ends the line.",
    },
    {
      keywords: ["newline", "\\n", "line break"],
      response:
        "Println adds a newline automatically. Printf doesn't — add \\n at the end if you need one.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "import `terminal/cellblock`, then print `cellblock.Cell` and `cellblock.Sublevel` as `CELL B-09 - SUBLEVEL 3`. don't type my cell in by hand — pull it from the package.",
    },
    {
      keywords: ["dash", "hyphen", "minus", "separator", "middle dot", "special character", "between the cell"],
      response:
        "the separator is a plain dash with a space on each side: `CELL B-09 - SUBLEVEL 3`. nothing special to type.",
    },
    {
      keywords: ["concat", "concatenat", "combine", "join", "+"],
      response:
        "go won't let you `+` a number onto text. pass the pieces to `fmt.Println` separated by commas instead — it adds the spaces: `fmt.Println(\"CELL\", cellblock.Cell, \"-\", \"SUBLEVEL\", cellblock.Sublevel)`.",
    },
    {
      keywords: ["example", "show me", "sample", "template"],
      response:
        "here's the shape:\n```\nimport (\n  \"fmt\"\n  \"terminal/cellblock\"\n)\n\nfunc main() {\n  fmt.Printf(\"CELL %s - SUBLEVEL %d\\n\", cellblock.Cell, cellblock.Sublevel)\n}\n```",
    },
  ],

  // Feedback for near-miss output. Exact-match completion is handled by
  // expectedOutput + requiredCode, so these never complete — they only nudge.
  outputPatterns: [
    {
      match: (output) => {
        const lower = output.toLowerCase();
        return lower.includes("hello") && lower.includes("world");
      },
      response:
        "that's a hello world. i don't need a greeting — i need my location. CELL B-09 - SUBLEVEL 3.",
    },
    {
      match: (output) => {
        const lower = output.toLowerCase();
        return (lower.includes("b-09") || lower.includes("b09")) && !lower.includes("sublevel");
      },
      response:
        "close — i see the cell but not the sublevel. i need both: CELL B-09 - SUBLEVEL 3.",
    },
    {
      match: (output) =>
        output.trim().length > 0 && !output.toLowerCase().includes("b-09") && !output.toLowerCase().includes("b09"),
      response:
        "you're printing something, but it's not my cell. i need CELL B-09 - SUBLEVEL 3.",
    },
  ],

  codePatterns: [
    {
      // pulled both values straight from the package — that's the whole point
      match: (code) => code.includes("cellblock.Cell") && code.includes("cellblock.Sublevel"),
      response:
        "...i see it. my cell. you actually got through.\n\n||COMPLETE||",
    },
    {
      match: (code) =>
        !code.includes("fmt") &&
        !code.includes("Println") &&
        !code.includes("Printf") &&
        !code.includes("Print("),
      response:
        "nothing came through. you need fmt.Println or fmt.Printf to send output.",
    },
    {
      match: (code) => {
        const lower = code.toLowerCase();
        return lower.includes("hello") && lower.includes("world");
      },
      response:
        "that's a hello world. i don't need a greeting — i need my location, straight from the cellblock package.",
    },
    {
      // reaching into the package but only grabbed one of the two values
      match: (code) => code.includes("cellblock.Cell") !== code.includes("cellblock.Sublevel"),
      response:
        "close — you're reaching into the package, but i need both: cellblock.Cell and cellblock.Sublevel.",
    },
    {
      // typed my cell in by hand instead of importing the package
      match: (code) => {
        const lower = code.toLowerCase();
        return (lower.includes("b-09") || lower.includes("b09")) && !code.includes("cellblock");
      },
      response:
        "don't type my cell in by hand. import `terminal/cellblock` and print cellblock.Cell and cellblock.Sublevel — pull the values from the package.",
    },
  ],

  correctResponse:
    "...i see it. my cell. you actually got through.\n\n||COMPLETE||",

  genericWrong: [
    "that's not right. check the output — i need CELL B-09 - SUBLEVEL 3. exactly.",
    "almost... but the output doesn't match. look at what you're printing.",
    "wrong signal. i need my exact location: CELL B-09 - SUBLEVEL 3.",
  ],

  rushDialogue: [
    "hurry. the footsteps stopped right outside.",
    "go. now. just print the location.",
    "no time — just get it done. CELL B-09 - SUBLEVEL 3.",
  ],

  stuckResponses: [
    "two steps. import `terminal/cellblock`, then:\n```\nfmt.Printf(\"CELL %s - SUBLEVEL %d\\n\", cellblock.Cell, cellblock.Sublevel)\n```",
    "the values aren't yours to type — they're in the package. `cellblock.Cell` and `cellblock.Sublevel`. import `terminal/cellblock` and read them.",
    "don't overthink it. import the package, then print cellblock.Cell and cellblock.Sublevel.",
  ],

  deflections: [
    "i don't have intel on that. focus on the mission.",
    "not now. i need my location confirmed first.",
    "can't help with that. what i need is on screen — print my cell location.",
    "stay focused. the mission brief has everything you need.",
  ],
};

// Chapter 02: Step 1 — Scaffold
const ch02ScaffoldBank: StepBank = {
  intro:
    "the keypad on my door runs go. same deal as before — get the terminal live by printing `Hello World`. that one line pulls in the whole skeleton: package, import, main.\n\nonce it's live, we can start cracking the sequence.",

  conceptFAQ: [
    {
      keywords: ["package", "package main"],
      response:
        "`package main` — first line. tells go this is a runnable program.",
    },
    {
      keywords: ["import", "fmt"],
      response:
        "`import \"fmt\"` — we'll need printing for the code output.",
    },
    {
      keywords: ["func", "function", "main"],
      response:
        "`func main() { }` — entry point. your loop goes inside here.",
    },
    {
      keywords: ["skeleton", "scaffold", "structure", "setup"],
      response:
        "same skeleton every time: package main, import fmt, func main, and `fmt.Println(\"Hello World\")` inside so the import is used.",
    },
  ],

  codePatterns: [
    {
      match: (code) => isValidScaffold(code),
      response:
        "terminal initialized. the keypad's listening.\n\nnow loop through codes 1-10.\n\n||COMPLETE||",
    },
    {
      match: (code) => !minify(code).includes("packagemain"),
      response:
        "the keypad terminal needs `package main`. first line.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("packagemain") && !m.includes('import"fmt"') && !m.includes('import("fmt")');
      },
      response:
        "package is set. add `import \"fmt\"` — you'll need print functions.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("packagemain") && (m.includes('import"fmt"') || m.includes('import("fmt")')) && !m.includes("funcmain(){");
      },
      response:
        "almost. add `func main() { }` — the entry point.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("packagemain") && (m.includes('import"fmt"') || m.includes('import("fmt")')) && m.includes("funcmain(){") && !m.includes("fmt.print") && !m.includes("fmt.sprint");
      },
      response:
        "almost. go won't compile if you import fmt but don't use it. add `fmt.Println(\"Hello World\")` inside main.",
    },
  ],

  correctResponse:
    "terminal initialized. the keypad's listening.\n\nnow loop through codes 1-10.\n\n||COMPLETE||",

  genericWrong: [
    "the keypad rejected that. i need: package main, import, func main().",
    "not valid go. start with the skeleton: package, import, main function.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "same shape as before: `package main`, then `import \"fmt\"`, then `func main() { fmt.Println(\"Hello World\") }`.",
  ],

  deflections: [
    "focus. get the terminal live with a hello world first, then we crack the codes.",
  ],
};

// Chapter 02: Step 2 — Loop
const ch02LoopBank: StepBank = {
  intro:
    "good, you're still here.\n\nthe keypad on my door cycles codes 1 through 10. write a loop that prints each number on its own line — just the raw numbers, nothing else. 1, 2, 3... up to 10. we'll classify them next.",

  conceptFAQ: [
    {
      keywords: ["for", "loop", "iterate", "repeat", "cycle"],
      response:
        "`for i := 1; i <= 10; i++` — that's go's only loop. no while, no do. just for.",
    },
    {
      keywords: ["print", "println", "output", "fmt"],
      response:
        "fmt.Println(i) — prints the current number. one per line.",
    },
    {
      keywords: [":=", "declare", "variable"],
      response:
        "in a for loop, `i := 1` declares i right there. it only exists inside the loop.",
    },
    {
      keywords: ["semicolon", "syntax", "error"],
      response:
        "go doesn't use semicolons at end of lines. and opening braces must be on the same line.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "write a for loop that prints numbers 1 through 10, one per line. `for i := 1; i <= 10; i++ { fmt.Println(i) }`.",
    },
    {
      keywords: ["while", "do while", "until"],
      response:
        "go has no while keyword. use `for` — it covers everything. `for i := 1; i <= 10; i++` is go's while loop.",
    },
    {
      keywords: ["range", "slice"],
      response:
        "you can use range for slices, but here you just need a counter: `for i := 1; i <= 10; i++`. no slice needed.",
    },
    {
      keywords: ["++", "increment", "i++"],
      response:
        "`i++` increments by 1. it's a statement in go, not an expression — can't use it inside other expressions.",
    },
    {
      keywords: ["off by one", "starts at 0", "zero", "0"],
      response:
        "the keypad codes start at 1, not 0. use `i := 1` as your starting value, and `i <= 10` as your condition.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => {
        const lines = output.trim().split("\n").filter(Boolean);
        if (lines.length === 0) return false;
        // Detect if user is printing labels already (e.g. "1 DENY")
        return lines.some((l) => /^\d+\s+\w+/.test(l.trim()));
      },
      response:
        "hold on — just the numbers for now, no labels. `fmt.Println(i)` gives you the raw number. we classify in the next step.",
    },
    {
      match: (output) => {
        const lines = output.trim().split("\n").filter(Boolean);
        return lines.length > 0 && lines.length < 10;
      },
      response:
        "you're printing, but not all 10. check your loop bounds — start at 1, go through 10. output should be 10 lines: just `1`, `2`, ... `10`.",
    },
    {
      match: (output) => output.trim().length === 0,
      response:
        "nothing came through. are you printing inside the loop? `fmt.Println(i)` prints the current number.",
    },
  ],

  codePatterns: [
    {
      // Offline fallback — check structure: for loop starting at 1, printing inside
      match: (code) => {
        const hasLoop = /for\s+\w+\s*:=\s*1/.test(code);
        const hasPrint = /fmt\.\w*[Pp]rint/.test(code);
        return hasLoop && hasPrint;
      },
      response:
        "loop confirmed. the keypad's cycling. now i need you to classify each code.\n\n||COMPLETE||",
    },
    {
      match: (code) => !(/for\s/.test(code)),
      response:
        "i need a loop. `for i := 1; i <= 10; i++` — go's loop syntax.",
    },
    {
      match: (code) =>
        /for\s/.test(code) && !(/fmt\.\w*[Pp]rint/.test(code)),
      response:
        "loop's there but you're not printing. add `fmt.Println(i)` inside.",
    },
  ],

  correctResponse:
    "loop confirmed. the keypad's cycling. now i need you to classify each code.\n\n||COMPLETE||",

  genericWrong: [
    "not quite. i need each number on its own line — just `1`, `2`, `3`... up to `10`. no labels yet, just numbers.",
    "the output should be exactly 10 lines: the numbers 1 through 10. nothing else on each line — we'll add labels in the next step.",
  ],

  rushDialogue: [],
  stuckResponses: [
    "`for i := 1; i <= 10; i++ { fmt.Println(i) }` — that's the whole thing.",
  ],
  deflections: [
    "focus. loop through 1-10 first, then we classify.",
  ],
};

// Chapter 02: Step 2 — Classify
const ch02ClassifyBank: StepBank = {
  intro:
    "the keypad's cycling. now modify your loop — for each code, print the number and its access level separated by a space.\n\n1-3: DENY\n4-6: WARN\n7-9: GRANT\n10: OVERRIDE\n\nso line 1 should be `1 DENY`, line 4 should be `4 WARN`... you get it.",

  conceptFAQ: [
    {
      keywords: ["switch", "case"],
      response:
        "`switch { case i <= 3: ... }` — no variable after switch when you're checking ranges.",
    },
    {
      keywords: ["if", "else", "condition", "branch"],
      response:
        "`if i <= 3 { ... } else if i <= 6 { ... }` — works fine too. switch is cleaner.",
    },
    {
      keywords: ["range", "1-3", "4-6", "7-9", "deny", "warn", "grant"],
      response:
        "1-3 is DENY, 4-6 is WARN, 7-9 is GRANT, 10 is OVERRIDE.",
    },
    {
      keywords: ["override", "default", "10"],
      response:
        "10 is special — OVERRIDE. use `default:` in your switch.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "modify your loop. for each code 1-10, print the number and its label. 1-3: DENY, 4-6: WARN, 7-9: GRANT, 10: OVERRIDE.",
    },
    {
      keywords: ["fallthrough", "fall through", "need break"],
      response:
        "go's switch doesn't fall through by default — no `break` needed. each case runs only its own block.",
    },
    {
      keywords: ["how many", "how many case", "how many conditions"],
      response:
        "four groups: `case i <= 3` for DENY, `case i <= 6` for WARN, `case i <= 9` for GRANT, and `default` for OVERRIDE.",
    },
    {
      keywords: ["print both", "number and label", "format output"],
      response:
        "`fmt.Println(i, \"DENY\")` — prints the number and label separated by a space. do this for each category.",
    },
  ],

  outputPatterns: [
    {
      // Printf without \n — output is all on one line
      match: (output) => {
        const lines = output.trim().split("\n").filter(Boolean);
        const lower = output.toLowerCase();
        return lines.length < 5 && lower.includes("deny") && output.trim().length > 30;
      },
      response:
        "your output is all jammed together on one line. `Printf` doesn't add a newline — `Println` does. either use `fmt.Println(i, \"DENY\")` or add `\\n` at the end: `fmt.Printf(\"%d DENY\\n\", i)`.",
    },
    {
      match: (output) => {
        // Labels but no numbers (e.g. just "DENY\nDENY\n...")
        const lines = output.trim().split("\n").filter(Boolean);
        return lines.length > 0 && lines.every((l) => /^(DENY|WARN|GRANT|OVERRIDE)$/i.test(l.trim()));
      },
      response:
        "you're printing labels but not the code numbers. each line needs both: `fmt.Println(i, \"DENY\")` gives `1 DENY`.",
    },
    {
      match: (output) => {
        // Has all 4 labels but wrong mapping (e.g. wrong ranges)
        const lower = output.toLowerCase();
        return (
          lower.includes("deny") &&
          lower.includes("warn") &&
          lower.includes("grant") &&
          lower.includes("override")
        );
      },
      response:
        "all four labels are there, but the mapping is off. each line should be like `1 DENY`. check: 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
    },
    {
      match: (output) => {
        const lower = output.toLowerCase();
        const hasAny = lower.includes("deny") || lower.includes("warn") || lower.includes("grant") || lower.includes("override");
        return hasAny;
      },
      response:
        "some labels are there but not all. i need DENY, WARN, GRANT, and OVERRIDE. format: `1 DENY`, `4 WARN`, etc.",
    },
    {
      match: (output) => output.trim().length > 0,
      response:
        "you're printing numbers but not classifying. add switch or if/else inside your loop. output should be `1 DENY`, `2 DENY`... `10 OVERRIDE`.",
    },
  ],

  codePatterns: [
    {
      // Offline fallback — check structure: loop + branch + all 4 labels
      match: (code) => {
        const hasLoop = /for\s+\w+\s*:=/.test(code);
        const hasBranch = code.includes("switch") || code.includes("if") || code.includes("case");
        const hasDeny = code.includes("DENY");
        const hasWarn = code.includes("WARN");
        const hasGrant = code.includes("GRANT");
        const hasOverride = code.includes("OVERRIDE");
        return hasLoop && hasBranch && hasDeny && hasWarn && hasGrant && hasOverride;
      },
      response:
        "the keypad's responding. all 10 codes mapped. but the redundancy protocol just kicked in — one more step.\n\n||COMPLETE||",
    },
    {
      match: (code) =>
        !code.includes("switch") &&
        !code.includes("if") &&
        !code.includes("case"),
      response:
        "you're looping but not classifying. use switch or if/else for the ranges.",
    },
    {
      match: (code) => !code.includes("OVERRIDE"),
      response:
        "almost — but code 10 needs to print OVERRIDE.",
    },
    {
      match: (code) =>
        code.includes("DENY") && !code.includes("WARN"),
      response:
        "i see DENY but not WARN. codes 4-6 should map to WARN.",
    },
  ],

  correctResponse:
    "the keypad's responding. all 10 codes mapped. but the redundancy protocol just kicked in — one more step.\n\n||COMPLETE||",

  genericWrong: [
    "that's not matching. loop 1-10, classify each.",
    "wrong output. check: 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
  ],

  rushDialogue: [
    "the knocking from B-10 is getting louder. hurry.",
    "someone in B-10 needs help. finish the sequence.",
  ],

  stuckResponses: [
    "for loop + switch. case i <= 3: DENY. case i <= 6: WARN. case i <= 9: GRANT. default: OVERRIDE.",
  ],

  deflections: [
    "focus. the keypad sequence is all that matters.",
  ],
};

// Chapter 02: Step 3 — Rewrite
const ch02RewriteBank: StepBank = {
  intro:
    "redundancy protocol. the keypad needs the same classification written a different way.\n\nif you used switch before, rewrite it with if/else chains. if you used if/else, rewrite with switch/case.\n\nsame output. i'm putting +2:00 on the clock for this one.",

  conceptFAQ: [
    {
      keywords: ["switch", "case"],
      response:
        "`switch { case i <= 3: ... }` — no variable after switch for range checks. each case is a boolean condition.",
    },
    {
      keywords: ["if", "else", "condition"],
      response:
        "`if i <= 3 { ... } else if i <= 6 { ... } else if i <= 9 { ... } else { ... }` — chain them together.",
    },
    {
      keywords: ["same", "output", "what"],
      response:
        "same as before: 1 DENY, 2 DENY, 3 DENY, 4 WARN, 5 WARN, 6 WARN, 7 GRANT, 8 GRANT, 9 GRANT, 10 OVERRIDE.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "why rewrite"],
      response:
        "the redundancy protocol requires the same classification written differently. if you used switch, rewrite with if/else. if you used if/else, use switch/case.",
    },
    {
      keywords: ["difference between", "switch vs", "if vs", "which is better", "compare"],
      response:
        "both produce the same result. switch is cleaner for multiple ranges. if/else is more familiar. the point is knowing both approaches.",
    },
  ],

  outputPatterns: [
    {
      // Printf without \n — output is all on one line
      match: (output) => {
        const lines = output.trim().split("\n").filter(Boolean);
        const lower = output.toLowerCase();
        return lines.length < 5 && lower.includes("deny") && output.trim().length > 30;
      },
      response:
        "your output is all on one line. `Printf` doesn't add a newline automatically. use `fmt.Println(i, \"DENY\")` or add `\\n`: `fmt.Printf(\"%d DENY\\n\", i)`.",
    },
    {
      match: (output) => {
        const lower = output.toLowerCase();
        return (
          lower.includes("deny") &&
          lower.includes("warn") &&
          lower.includes("grant") &&
          lower.includes("override")
        );
      },
      response:
        "all four labels are there, but the mapping is off. check: 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
    },
    {
      match: (output) => output.trim().length > 0,
      response:
        "output doesn't match. need: 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
    },
  ],

  codePatterns: [
    {
      // Offline fallback — accept either approach with correct labels
      match: (code) => {
        const hasLoop = /for\s+\w+\s*:=/.test(code);
        const hasBranch = code.includes("switch") || code.includes("if") || code.includes("case");
        const hasDeny = code.includes("DENY");
        const hasWarn = code.includes("WARN");
        const hasGrant = code.includes("GRANT");
        const hasOverride = code.includes("OVERRIDE");
        return hasLoop && hasBranch && hasDeny && hasWarn && hasGrant && hasOverride;
      },
      response:
        "redundancy check cleared. the door mechanism just clicked.\n\n||COMPLETE||",
    },
    {
      match: (code) =>
        !code.includes("switch") &&
        !code.includes("if") &&
        !code.includes("case"),
      response:
        "you need branching logic. use switch/case or if/else to classify the codes.",
    },
    {
      match: (code) => !code.includes("OVERRIDE"),
      response:
        "don't forget code 10 — OVERRIDE.",
    },
    {
      match: (code) =>
        code.includes("DENY") && !code.includes("WARN"),
      response:
        "got DENY but missing WARN. codes 4-6 should map to WARN.",
    },
  ],

  correctResponse:
    "redundancy check cleared. the door mechanism just clicked.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. same output as before, different approach.",
    "wrong output. 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 OVERRIDE.",
  ],

  rushDialogue: [
    "redundancy check is ticking. rewrite the classification.",
    "clock's running. same output, different approach.",
  ],

  stuckResponses: [
    "if/else approach: `if i <= 3 { fmt.Println(i, \"DENY\") } else if i <= 6 { fmt.Println(i, \"WARN\") } else if i <= 9 { fmt.Println(i, \"GRANT\") } else { fmt.Println(i, \"OVERRIDE\") }`.",
  ],

  deflections: [
    "focus. rewrite the classification and clear the redundancy check.",
  ],
};

// Chapter 03: Step 0 — Scaffold
const ch03ScaffoldBank: StepBank = {
  intro:
    "we're in the ventilation shaft now. the junction panels run go — same as before.\n\nget it live by printing `Hello World`. that one line pulls in the whole skeleton: package, import, main.",

  conceptFAQ: [
    {
      keywords: ["package", "package main"],
      response:
        "`package main` — first line. same as every go program.",
    },
    {
      keywords: ["import", "fmt"],
      response:
        "`import \"fmt\"` — you'll need it for printing results.",
    },
    {
      keywords: ["func", "main", "entry"],
      response:
        "`func main() { }` — the entry point. everything runs from here.",
    },
    {
      keywords: ["function", "sumCodes", "validate"],
      response:
        "functions come next step. right now just get the skeleton in.",
    },
  ],

  codePatterns: [
    {
      match: (code) => isValidScaffold(code),
      response:
        "terminal initialized. the shaft panel recognizes the program.\n\nnow i need you to write a function.\n\n||COMPLETE||",
    },
    {
      match: (code) => !minify(code).includes("packagemain"),
      response:
        "every go file starts with `package main`. first line.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("packagemain") && !m.includes('import"fmt"') && !m.includes('import("fmt")');
      },
      response:
        "package is set. add `import \"fmt\"` — we'll need print functions.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("packagemain") && (m.includes('import"fmt"') || m.includes('import("fmt")')) && !m.includes("funcmain(){");
      },
      response:
        "package and import are set. add `func main() { }` — the entry point.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("packagemain") && (m.includes('import"fmt"') || m.includes('import("fmt")')) && m.includes("funcmain(){") && !m.includes("fmt.print") && !m.includes("fmt.sprint");
      },
      response:
        "almost. go won't compile if you import fmt but don't use it. add `fmt.Println(\"Hello World\")` inside main.",
    },
  ],

  correctResponse:
    "terminal initialized. the shaft panel recognizes the program.\n\nnow i need you to write a function.\n\n||COMPLETE||",

  genericWrong: [
    "the panel can't parse that. package main, import, func main().",
    "not a valid go program. start with `package main`.",
  ],

  rushDialogue: [],
  stuckResponses: [
    "same shape as before: `package main`, `import \"fmt\"`, then `func main() { fmt.Println(\"Hello World\") }`.",
  ],
  deflections: [
    "just get a hello world on screen for now. package, import, main.",
  ],
};

// Chapter 03: Step 1 — Sum Function
const ch03SumBank: StepBank = {
  intro:
    "good. terminal's ready.\n\nnow write a function called `sumCodes`. it takes any number of ints — variadic parameter — and returns their sum. add it above main and call it.",

  conceptFAQ: [
    {
      keywords: ["variadic", "...", "dots", "any number"],
      response:
        "`func f(nums ...int)` — three dots mean any number of ints. inside, nums is a slice.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "write `func sumCodes(codes ...int) int` — it takes any number of ints and returns their sum. loop with range, accumulate into a total, return it.",
    },
    {
      keywords: ["how to call", "call sumCodes", "invoke", "use sumCodes"],
      response:
        "in main: `result := sumCodes(10, 20, 30, 45, 10)` then `fmt.Println(result)`. pass the junction codes directly.",
    },
    {
      keywords: ["function", "func", "define"],
      response:
        "`func name(params) returnType { ... }` — func keyword, name, params, return type.",
    },
    {
      keywords: ["range", "iterate", "loop", "for"],
      response:
        "`for _, v := range slice` — underscore ignores index. v is each value.",
    },
    {
      keywords: ["sum", "add", "total"],
      response:
        "start total at 0. loop with range. add each value. return total.",
    },
    {
      keywords: ["return type", "int", "return value"],
      response:
        "the return type goes after the params: `func sumCodes(codes ...int) int`. the `int` at the end means it returns an integer.",
    },
    {
      keywords: ["underscore", "_", "blank identifier"],
      response:
        "`_` is the blank identifier — it discards a value. `for _, v := range codes` ignores the index and gives you each value as `v`.",
    },
    {
      keywords: ["+=", "plus equals", "accumulate"],
      response:
        "`total += v` adds v to total. same as `total = total + v` but shorter.",
    },
  ],

  codePatterns: [
    {
      // Offline fallback
      match: (code) => {
        const hasVariadic = /func\s+sumCodes\s*\(\s*\w+\s+\.\.\.int/.test(code);
        const hasLoop = code.includes("range") || /for\s+\w+\s*:=/.test(code);
        const hasReturn = code.includes("return");
        return hasVariadic && hasLoop && hasReturn;
      },
      response:
        "sum function works. 115 — checks out.\n\nnow i need validation.\n\n||COMPLETE||",
    },
    {
      match: (code) =>
        !(/\.\.\.int/.test(code)),
      response:
        "sumCodes needs to accept any number of ints. use `codes ...int`.",
    },
    {
      match: (code) =>
        code.includes("...int") && !code.includes("range") && !/for\s+\w+\s*:=/.test(code),
      response:
        "variadic param is set but you're not looping. use `for _, c := range codes`.",
    },
  ],

  correctResponse:
    "sum function works. 115 — checks out.\n\nnow i need validation.\n\n||COMPLETE||",

  genericWrong: [
    "not right. sumCodes needs variadic input and a loop to sum them.",
    "the junction rejected it. check your function signature.",
  ],

  rushDialogue: [],
  stuckResponses: [
    "`total := 0` then `for _, c := range codes { total += c }` then `return total`.",
  ],
  deflections: [
    "focus on sumCodes. variadic int param, return the sum.",
  ],
};

// Chapter 03: Step 2 — Validate
const ch03ValidateBank: StepBank = {
  intro:
    "sum works. now add `validateCode` — takes variadic ints, returns `(int, bool)`. the bool is whether the sum is greater than 100. call sumCodes inside it, then `return total, total > 100`.",

  conceptFAQ: [
    {
      keywords: ["reuse", "call sumCodes", "use sumCodes"],
      response:
        "call sumCodes inside validateCode: `total := sumCodes(codes...)`. the `...` spreads the variadic parameter to the other function.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "write `func validateCode(codes ...int) (int, bool)`. inside, call `sumCodes(codes...)` to get the total, then `return total, total > 100`.",
    },
    {
      keywords: ["return", "multiple return", "two values"],
      response:
        "`func f() (int, bool) { return 42, true }` — both types in parens.",
    },
    {
      keywords: ["bool", "boolean", "true", "false"],
      response:
        "`total > 100` gives you a bool. return it directly.",
    },
    {
      keywords: ["call", "pass", "spread", "codes..."],
      response:
        "to pass variadic to another function: `sumCodes(codes...)` — dots spread it.",
    },
    {
      keywords: ["tuple", "pair", "two things", "multiple values"],
      response:
        "go functions can return multiple values. declare them in parens: `(int, bool)`. assign both: `total, valid := validateCode(10, 20, 30)`.",
    },
    {
      keywords: ["comparison", ">", "greater than", "greater"],
      response:
        "`total > 100` is a boolean expression — evaluates to true or false. return it directly as the second value.",
    },
    {
      keywords: ["why 100", "threshold", "what number"],
      response:
        "100 is the threshold. if the sum of junction codes exceeds 100, the gate validates. `total > 100` gives you the bool.",
    },
  ],

  codePatterns: [
    {
      // Offline fallback
      match: (code) => {
        const hasMultiReturn = /func\s+validateCode[\s\S]*\(int,\s*bool\)/.test(code);
        const hasReturn = (code.match(/return/g) || []).length >= 2;
        return hasMultiReturn && hasReturn;
      },
      response:
        "junction codes accepted. sum checks out — over 100. the shaft gate is opening.\n\n||COMPLETE||",
    },
    {
      match: (code) =>
        !/\(int,\s*bool\)/.test(code) && code.includes("validateCode"),
      response:
        "validateCode needs to return two values — (int, bool).",
    },
    {
      match: (code) =>
        code.includes("validateCode") && !code.includes("return"),
      response:
        "the function body needs a return statement.",
    },
  ],

  correctResponse:
    "junction codes accepted. sum checks out — over 100. the shaft gate is opening.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. validateCode needs (int, bool) return.",
    "the junction rejected it. check your function signatures.",
  ],

  rushDialogue: [
    "backup power is dropping. write the functions. now.",
    "the lights are flickering. hurry.",
  ],

  stuckResponses: [
    "`func validateCode(codes ...int) (int, bool) { total := sumCodes(codes...); return total, total > 100 }`",
  ],

  deflections: [
    "focus on validateCode. two return values: the sum and a bool.",
  ],
};

// Boss 01: Step 1 — Scaffold
const boss01ScaffoldBank: StepBank = {
  intro:
    "the lock controller is ahead. before we crack it, i need you to set up the program.\n\nwrite a function called `predictNext` — takes a slice of ints, returns an int. wire it into main so we can test it. the lock won't accept anything until the interface matches.",

  conceptFAQ: [
    {
      keywords: ["func", "function", "signature"],
      response:
        "`func predictNext(codes []int) int` — that's what the lock controller expects. takes a slice, returns an int.",
    },
    {
      keywords: ["slice", "[]int", "array"],
      response:
        "`[]int` is a slice of ints — go's dynamic array. you'll get the visible codes as a slice.",
    },
    {
      keywords: ["main", "entry"],
      response:
        "`func main()` — create a test slice, call predictNext, print the result. fmt.Println(predictNext(codes)).",
    },
    {
      keywords: ["import", "fmt"],
      response:
        "`import \"fmt\"` — you need fmt for printing. add it after package main.",
    },
    {
      keywords: ["return", "placeholder"],
      response:
        "`return 0` for now. the function needs to return something. we'll add the real logic next.",
    },
  ],

  codePatterns: [
    {
      match: (code) => {
        const m = minify(code);
        return (
          isValidScaffold(code) &&
          m.includes("funcpredictnext(") &&
          m.includes("[]int)int{") &&
          // main body must call predictNext
          m.slice(m.lastIndexOf("funcmain(){")).includes("predictnext(")
        );
      },
      response:
        "interface locked in. the lock controller recognizes the function signature.\n\nnow implement the prediction logic.\n\n||COMPLETE||",
    },
    {
      match: (code) => !minify(code).includes("funcpredictnext("),
      response:
        "the lock controller needs `func predictNext(codes []int) int`. that exact signature.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("funcpredictnext(") && !m.includes("[]int)int{");
      },
      response:
        "predictNext needs to accept a slice: `codes []int`. that's what the lock feeds it.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("funcpredictnext(") && !m.includes("funcmain(){");
      },
      response:
        "function looks good. now add `func main()` that calls it and prints the result.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return (
          m.includes("funcpredictnext(") &&
          m.includes("funcmain(){") &&
          !m.slice(m.lastIndexOf("funcmain(){")).includes("predictnext(")
        );
      },
      response:
        "main needs to call predictNext. create a test slice and pass it in.",
    },
  ],

  correctResponse:
    "interface locked in. the lock controller recognizes the function signature.\n\nnow implement the prediction logic.\n\n||COMPLETE||",

  genericWrong: [
    "the lock controller rejected the interface. it needs: predictNext(codes []int) int.",
    "not matching. set up: package, import, predictNext function, main calling it.",
  ],

  rushDialogue: [
    "the codes are cycling. get the structure in. now.",
    "hurry — predictNext signature, main function, print call.",
  ],

  stuckResponses: [
    "three parts: `func predictNext(codes []int) int { return 0 }`, then `func main()` that creates a slice and calls it.",
    "scaffold: package main, import fmt, func predictNext with []int param returning int, func main calls it.",
  ],

  deflections: [
    "focus on the scaffold. the lock controller needs the right interface first.",
    "not now. set up the program structure — then we crack the pattern.",
  ],
};

// Boss 01: Step 2 — Predict Next Code
const boss01PredictBank: StepBank = {
  intro:
    "the lock controller is cycling codes. i can see them on the display but i can't compute the next one — my terminal is read-only on this circuit.\n\nyou need to write `func predictNext(codes []int) int`. it takes the visible codes and returns what comes next. the pattern could be linear, alternating, or accelerating. find the rule. get it wrong and the lockmaster resets everything.",

  conceptFAQ: [
    {
      keywords: ["pattern", "rule", "delta"],
      response:
        "the difference between consecutive codes. compute it. if it's constant, add it to the last code.",
    },
    {
      keywords: ["function", "func", "signature"],
      response:
        "`func predictNext(codes []int) int` — takes the visible codes, returns the next one.",
    },
    {
      keywords: ["alternating", "two patterns"],
      response:
        "if the deltas alternate between two values, check odd/even position to pick which one comes next.",
    },
  ],

  outputPatterns: [],

  codePatterns: [
    {
      match: (code) => {
        const hasFn = /func\s+predictNext/.test(code);
        const hasCodes = code.includes("codes[");
        const hasReturn = code.includes("return");
        const hasLoop = /for\s/.test(code) || code.includes("range");
        return hasFn && hasCodes && hasReturn && hasLoop;
      },
      response:
        "the lock's accepting it. codes aligning... all 10 match. the mechanism is releasing.\n\n||COMPLETE||",
    },
    {
      match: (code) => !(/func\s+predictNext/.test(code)),
      response:
        "i need `func predictNext(codes []int) int`. that's the interface the lock accepts.",
    },
    {
      match: (code) =>
        /func\s+predictNext/.test(code) && !(/for\s/.test(code)) && !code.includes("range"),
      response:
        "you need to iterate through the codes to find the pattern. use a `for` loop.",
    },
    {
      match: (code) =>
        /func\s+predictNext/.test(code) &&
        (/for\s/.test(code) || code.includes("range")) &&
        !code.includes("return"),
      response:
        "the function needs to return the predicted next code.",
    },
    {
      match: (code) => {
        const hasReturn = /return\s+\d+/.test(code);
        const noLoop = !(/for\s/.test(code)) && !code.includes("range");
        return hasReturn && noLoop;
      },
      response:
        "you can't hardcode it. the pattern changes. find the rule.",
    },
  ],

  correctResponse:
    "the lock's accepting it. codes aligning... all 10 match. the mechanism is releasing.\n\n||COMPLETE||",

  genericWrong: [
    "wrong. the lockmaster reset. try again.",
    "pattern didn't match. look at the deltas.",
    "rejected. find the rule between consecutive codes.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "compute the delta: `codes[i] - codes[i-1]`. if it's constant, add it to the last code.",
  ],

  deflections: [
    "the lock controller doesn't care about that. find the pattern.",
  ],
};

// Chapter 04: Step 0 — Scaffold
const ch04ScaffoldBank: StepBank = {
  intro:
    "reeves's photograph. five guards, four floors. but first — set up the terminal. package, import, main.",

  conceptFAQ: [
    {
      keywords: ["package", "package main"],
      response:
        "`package main` — first line. same as every go program.",
    },
    {
      keywords: ["import", "fmt"],
      response:
        "`import \"fmt\"` — you'll need it for printing guard data.",
    },
    {
      keywords: ["func", "main", "entry"],
      response:
        "`func main() { }` — the entry point. guard logic goes inside.",
    },
    {
      keywords: ["map", "guard", "roster"],
      response:
        "maps come next step. right now just get the skeleton in.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "start"],
      response:
        "write the go skeleton. `package main`, `import \"fmt\"`, `func main() { fmt.Println(\"ready\") }`. transmit it.",
    },
  ],

  codePatterns: [
    {
      match: (code) => isValidScaffold(code),
      response:
        "terminal initialized. now build the guard roster.\n\n||COMPLETE||",
    },
    {
      match: (code) => !minify(code).includes("packagemain"),
      response:
        "every go file starts with `package main`. first line.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("packagemain") && !m.includes('import"fmt"') && !m.includes('import("fmt")');
      },
      response:
        "package is set. add `import \"fmt\"` — we'll need print functions.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("packagemain") && (m.includes('import"fmt"') || m.includes('import("fmt")')) && !m.includes("funcmain(){");
      },
      response:
        "package and import are set. add `func main() { }` — the entry point.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("packagemain") && (m.includes('import"fmt"') || m.includes('import("fmt")')) && m.includes("funcmain(){") && !m.includes("fmt.print") && !m.includes("fmt.sprint");
      },
      response:
        "almost. go won't compile if you import fmt but don't use it. add `fmt.Println(\"ready\")` inside main.",
    },
  ],

  correctResponse:
    "terminal initialized. now build the guard roster.\n\n||COMPLETE||",

  genericWrong: [
    "the terminal can't parse that. package main, import, func main().",
    "not a valid go program. start with `package main`.",
  ],

  rushDialogue: [],
  stuckResponses: [
    "three things: `package main`, `import \"fmt\"`, `func main() { }`.",
  ],
  deflections: [
    "just the skeleton for now. package, import, main.",
  ],
};

// Chapter 04: Step 1 — Guard Map
const ch04GuardmapBank: StepBank = {
  intro:
    "good. write a function `buildRoster() map[string]string` above main. it should return a map with five guard assignments:\n\nChen → Floor 1, Alvarez → Floor 2, Volkov → Floor 2, Park → Floor 3, Santos → Floor 1.\n\nthe terminal will test it with multiple lookups.",

  conceptFAQ: [
    {
      keywords: ["map", "what is a map", "maps"],
      response:
        "`map[string]string` — key-value pairs. keys are strings (guard names), values are strings (floor assignments). like a lookup table.",
    },
    {
      keywords: ["how do i create", "declare", "initialize", "make", "literal"],
      response:
        "return a composite literal: `return map[string]string{\"Chen\": \"Floor 1\", ...}`. every entry needs a trailing comma.",
    },
    {
      keywords: ["function", "func", "return", "signature"],
      response:
        "`func buildRoster() map[string]string { }` — takes no args, returns a map. build the map inside and return it.",
    },
    {
      keywords: ["access", "lookup", "get", "value", "retrieve"],
      response:
        "the harness calls `r[\"Volkov\"]` and `r[\"Chen\"]` on your returned map. make sure all 5 entries are correct.",
    },
    {
      keywords: ["key", "string"],
      response:
        "keys are strings — the guard names. values are strings — the floor names like `\"Floor 1\"`. both sides are `string`.",
    },
    {
      keywords: [":=", "short", "var"],
      response:
        "inside the function you can use `:=` or just return the literal directly: `return map[string]string{...}`.",
    },
    {
      keywords: ["comma", "trailing"],
      response:
        "every entry in a go map literal needs a trailing comma — including the last one. go's compiler requires it.",
    },
    {
      keywords: ["nil", "zero", "missing", "empty"],
      response:
        "accessing a missing key returns the zero value — `\"\"` for strings. the harness checks multiple keys, so all 5 must be present.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "start"],
      response:
        "write `func buildRoster() map[string]string` above main. return the map with all 5 guard-floor pairs.",
    },
    {
      keywords: ["guard", "guards", "names", "who", "roster"],
      response:
        "five guards: Chen (Floor 1), Alvarez (Floor 2), Volkov (Floor 2), Park (Floor 3), Santos (Floor 1).",
    },
    {
      keywords: ["test", "harness", "automatic", "how is it tested"],
      response:
        "the terminal replaces your main() with test code that calls buildRoster() and checks lookups + count. you just write the function.",
    },
  ],

  outputPatterns: [],

  codePatterns: [
    {
      match: (code) => {
        return code.includes("buildRoster") && code.includes("map[string]string") && code.includes("return");
      },
      response:
        "map confirmed. the roster checks out.\n\n||COMPLETE||",
    },
    {
      match: (code) => !code.includes("buildRoster"),
      response:
        "write a function called `buildRoster` — `func buildRoster() map[string]string { }`. return the map from inside it.",
    },
    {
      match: (code) => code.includes("buildRoster") && !code.includes("return"),
      response:
        "your function needs to return the map. add `return map[string]string{...}` inside buildRoster.",
    },
    {
      match: (code) => !code.includes("map"),
      response:
        "you need a `map[string]string` with guard names as keys and floor names as values. return it from buildRoster.",
    },
  ],

  correctResponse:
    "map confirmed. the roster checks out.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. write `func buildRoster() map[string]string` and return the map with all 5 guards.",
    "the harness tests multiple lookups. make sure all 5 entries are correct.",
  ],

  rushDialogue: [
    "we don't have long. build the roster function.",
    "hurry — write buildRoster and return the map.",
  ],

  stuckResponses: [
    "`func buildRoster() map[string]string { return map[string]string{\"Chen\": \"Floor 1\", \"Volkov\": \"Floor 2\", ...} }`.",
    "write the function above main. return a map literal with all 5 guard-floor pairs.",
  ],

  deflections: [
    "focus. write the buildRoster function first.",
    "not now — i need the roster confirmed. build the function.",
  ],
};

// Chapter 04: Step 2 — Clear Floors
const ch04ClearfloorsBank: StepBank = {
  intro:
    "roster confirmed. now write `func findClearFloor(guards map[string]string, maxFloor int) string` above main.\n\nbuild an occupied set from the map values using `range`, then loop from 1 to `maxFloor` (the parameter your function receives) and return the first unoccupied floor name.\n\nthe terminal will test it with different guard configs and floor counts.",

  conceptFAQ: [
    {
      keywords: ["range", "iterate", "loop map"],
      response:
        "`for _, floor := range guards` iterates the map values. use it to collect which floors are occupied.",
    },
    {
      keywords: ["occupied", "track", "set"],
      response:
        "`occupied := map[string]bool{}` — go's set pattern. add each floor as you iterate: `occupied[floor] = true`.",
    },
    {
      keywords: ["check", "member", "exists"],
      response:
        "`if !occupied[floor]` — a missing key in a bool map returns `false`. so `!occupied[key]` is true when the floor is unoccupied.",
    },
    {
      keywords: ["Sprintf", "format", "build string"],
      response:
        "`fmt.Sprintf(\"Floor %d\", i)` creates the string `\"Floor 1\"`, `\"Floor 2\"`, etc. use it as the key to check occupied.",
    },
    {
      keywords: ["bool", "map bool"],
      response:
        "`map[string]bool{}` is go's set pattern. keys present = in the set. missing key returns `false` automatically.",
    },
    {
      keywords: ["!", "negation", "not"],
      response:
        "`!occupied[key]` is true when the key is missing — meaning that floor has no guard. return that floor name.",
    },
    {
      keywords: ["function", "func", "signature", "return"],
      response:
        "`func findClearFloor(guards map[string]string, maxFloor int) string` — takes a guard map and floor count, returns the first clear floor name.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "start"],
      response:
        "write findClearFloor. build an occupied set from guard values, loop 1 to maxFloor, return the first floor not in the set.",
    },
    {
      keywords: ["clear", "empty", "unguarded", "gap"],
      response:
        "a clear floor is one with no guards assigned. after building the occupied set, return the first floor not in it.",
    },
    {
      keywords: ["test", "harness", "automatic", "how is it tested"],
      response:
        "the terminal tests your function with different guard maps — not just the original roster. your logic must work for any input.",
    },
  ],

  outputPatterns: [],

  codePatterns: [
    {
      match: (code) => {
        return code.includes("findClearFloor") && code.includes("map[string]bool") && code.includes("range") && code.includes("return");
      },
      response:
        "floor 4 is clear. that's our window. forty minutes.\n\n||COMPLETE||",
    },
    {
      match: (code) => !code.includes("findClearFloor"),
      response:
        "write a function called `findClearFloor` — `func findClearFloor(guards map[string]string, maxFloor int) string`.",
    },
    {
      match: (code) => code.includes("findClearFloor") && !code.includes("map[string]bool"),
      response:
        "you need a bool map to track occupied floors: `occupied := map[string]bool{}`. fill it from the guards map.",
    },
    {
      match: (code) => code.includes("findClearFloor") && !code.includes("range"),
      response:
        "use `for _, floor := range guards` to collect occupied floors into your bool map.",
    },
    {
      match: (code) => code.includes("findClearFloor") && !code.includes("return"),
      response:
        "your function needs to return the first clear floor name as a string.",
    },
  ],

  correctResponse:
    "floor 4 is clear. that's our window. forty minutes.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. write findClearFloor — build an occupied set, loop floors, return the first gap.",
    "the harness tests with different guard configs. make sure your logic works for any input, not just the original roster.",
  ],

  rushDialogue: [
    "reeves is waiting. write findClearFloor. now.",
    "the window is closing. finish the function.",
  ],

  stuckResponses: [
    "inside findClearFloor: `occupied := map[string]bool{}`, then `for _, f := range guards { occupied[f] = true }`, then loop 1 to maxFloor and return the first `!occupied[name]`.",
    "build the set, check each floor. `return fmt.Sprintf(\"Floor %d\", i)` when you find one not in occupied.",
  ],

  deflections: [
    "focus. write the findClearFloor function.",
    "not now — i need to know which floor is clear.",
  ],
};

// Chapter 04.2: Step 0 — Scaffold (3 imports)
const ch04_2ScaffoldBank: StepBank = {
  intro:
    "the comms room. reeves needs an encrypted relay — keyword scanners check every 30 seconds. first, set up the terminal. three imports this time: fmt, strings, strconv.",

  conceptFAQ: [
    {
      keywords: ["package", "package main"],
      response:
        "`package main` — first line. same as always.",
    },
    {
      keywords: ["import", "imports", "group", "grouped"],
      response:
        "three imports this time: `import (\"fmt\" \"strings\" \"strconv\")`. grouped in parentheses, one per line.",
    },
    {
      keywords: ["fmt"],
      response:
        "`fmt` — formatting and printing. you know this one.",
    },
    {
      keywords: ["strings", "string package"],
      response:
        "`strings` — string manipulation. Fields, Join, Contains, Replace. we'll use it for splitting and joining words.",
    },
    {
      keywords: ["strconv", "convert", "conversion"],
      response:
        "`strconv` — string conversions. Itoa converts int to string, Atoi converts string to int. we'll need both for relay headers.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "start", "func", "main"],
      response:
        "write the skeleton: `package main`, then `import (\"fmt\" \"strings\" \"strconv\")`, then `func main() { fmt.Println(\"ready\") }`. use all three eventually — for now fmt is enough to compile.",
    },
  ],

  codePatterns: [
    {
      match: (code) => {
        const m = minify(code);
        return isValidScaffold(code) && m.includes('"strings"') && m.includes('"strconv"');
      },
      response:
        "relay terminal online. three packages loaded. now build the cipher.\n\n||COMPLETE||",
    },
    {
      match: (code) => !minify(code).includes("packagemain"),
      response:
        "every go file starts with `package main`. first line.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("packagemain") && !m.includes("import");
      },
      response:
        "package is set. add your imports — three this time: fmt, strings, strconv. group them in parentheses.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("packagemain") && m.includes("import") && !m.includes("funcmain(){");
      },
      response:
        "imports are in. add `func main() { }` — the entry point.",
    },
    {
      match: (code) => {
        const m = minify(code);
        return m.includes("funcmain(){") && (!m.includes('"strings"') || !m.includes('"strconv"'));
      },
      response:
        "you need all three imports: fmt, strings, strconv. group them: `import (\"fmt\" \"strings\" \"strconv\")`.",
    },
  ],

  outputPatterns: [],

  correctResponse:
    "relay terminal online. three packages loaded. now build the cipher.\n\n||COMPLETE||",

  genericWrong: [
    "the terminal can't parse that. package main, three imports, func main().",
    "not a valid program. start with `package main`, then import fmt, strings, strconv.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "three things: `package main`, `import (\"fmt\" \"strings\" \"strconv\")`, `func main() { fmt.Println(\"ready\") }`.",
  ],

  deflections: [
    "just the skeleton for now. three imports: fmt, strings, strconv.",
  ],
};

// Chapter 04.2: Step 1 — Reverse Word
const ch04_2ReversewordBank: StepBank = {
  intro:
    "good. write `func reverseWord(s string) string` above main. convert the string to `[]rune` — that's a slice of unicode characters. reverse it, convert back.\n\na string in go is just bytes. to reverse safely, you need runes.",

  conceptFAQ: [
    {
      keywords: ["rune", "runes", "what is a rune"],
      response:
        "a rune is a single unicode character. `'A'` is a rune, `'世'` is a rune. type `rune` is an alias for `int32`.",
    },
    {
      keywords: ["[]rune", "rune slice", "why rune", "why not bytes", "bytes"],
      response:
        "strings are byte sequences. multi-byte characters (emoji, accents) get split if you index by bytes. `[]rune` gives you one element per character.",
    },
    {
      keywords: ["convert", "string to rune", "cast"],
      response:
        "`runes := []rune(s)` — converts the string into a slice of runes. each element is one character.",
    },
    {
      keywords: ["reverse", "how to reverse", "swap"],
      response:
        "swap from both ends: `for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 { runes[i], runes[j] = runes[j], runes[i] }`.",
    },
    {
      keywords: ["i, j", "two variable", "multi variable", "for loop"],
      response:
        "go's for loop can init two variables: `i, j := 0, len(runes)-1`. update both in the post statement: `i, j = i+1, j-1`.",
    },
    {
      keywords: ["string()", "convert back", "return"],
      response:
        "`return string(runes)` — converts the rune slice back to a string.",
    },
    {
      keywords: ["slice", "what is a slice"],
      response:
        "a slice is a dynamic-length view over an array. `[]rune` is a slice of runes. you can index it, get its length, and modify elements in place.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "start"],
      response:
        "write `func reverseWord(s string) string` above main. inside: convert to []rune, swap from both ends, return string(runes).",
    },
    {
      keywords: ["test", "tested", "how is it tested"],
      response:
        "the harness calls reverseWord with different strings — \"hello\", \"Go\", single characters. your logic must work for any input.",
    },
    {
      keywords: ["immutable", "can't change", "string immutable"],
      response:
        "strings in go are immutable — you can't change individual characters. that's why you convert to []rune, modify the slice, then convert back.",
    },
  ],

  codePatterns: [
    {
      match: (code) => {
        return code.includes("reverseWord") && code.includes("[]rune") && /runes?\[.*\].*=.*runes?\[/.test(code) && code.includes("return string(");
      },
      response:
        "olleh... oG... the cipher works. one word at a time.\n\n||COMPLETE||",
    },
    {
      match: (code) => !code.includes("reverseWord"),
      response:
        "write the function: `func reverseWord(s string) string` above main.",
    },
    {
      match: (code) => code.includes("reverseWord") && !code.includes("[]rune"),
      response:
        "strings are immutable. convert to `[]rune` first — `runes := []rune(s)`.",
    },
    {
      match: (code) => code.includes("[]rune") && !/runes?\[.*\].*=.*runes?\[/.test(code),
      response:
        "now reverse it — swap from both ends. `for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 { runes[i], runes[j] = runes[j], runes[i] }`.",
    },
    {
      match: (code) => code.includes("[]rune") && /runes?\[/.test(code) && !code.includes("return string("),
      response:
        "convert back: `return string(runes)`.",
    },
  ],

  outputPatterns: [],

  correctResponse:
    "olleh... oG... the cipher works. one word at a time.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. reverseWord should convert to []rune, swap from both ends, return string(runes).",
    "the harness tests with different words. make sure your swap loop covers all indices.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "inside reverseWord: `runes := []rune(s)`, then `for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 { runes[i], runes[j] = runes[j], runes[i] }`, then `return string(runes)`.",
    "three steps. []rune(s) to convert. swap loop from both ends. string(runes) to convert back.",
  ],

  deflections: [
    "focus. write the reverseWord function.",
    "not now — i need the word cipher working.",
  ],
};

// Chapter 04.2: Step 2 — Encode
const ch04_2EncodeBank: StepBank = {
  intro:
    "single words work. now write `func encode(msg string) string` — split the message into words, reverse each one, join them back.\n\nuse `strings.Fields` to split and `strings.Join` to rejoin. the round-trip proof: encode(encode(x)) should return x.",

  conceptFAQ: [
    {
      keywords: ["fields", "strings.Fields", "split"],
      response:
        "`strings.Fields(msg)` splits on any whitespace and drops empty entries. returns `[]string`.",
    },
    {
      keywords: ["join", "strings.Join"],
      response:
        "`strings.Join(slice, \" \")` joins a string slice with a separator. space between words.",
    },
    {
      keywords: ["append", "add to slice"],
      response:
        "`result = append(result, reversed)` — adds an element to the end of the slice.",
    },
    {
      keywords: ["result", "[]string", "empty slice", "initialize"],
      response:
        "start with an empty slice: `result := []string{}`. append each reversed word to it.",
    },
    {
      keywords: ["range", "loop", "iterate"],
      response:
        "`for _, word := range words { ... }` — loops over each word in the slice. underscore ignores the index.",
    },
    {
      keywords: ["reverseWord", "call", "compose", "composition"],
      response:
        "call reverseWord inside the loop: `reversed := reverseWord(word)`. function composition — one function calls another.",
    },
    {
      keywords: ["round trip", "encode twice", "why encode encode"],
      response:
        "reversing a reversed word gives you the original. so encode(encode(x)) returns x. reeves can decode by running encode again.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "start"],
      response:
        "write `func encode(msg string) string`. split with strings.Fields, reverse each word, join with strings.Join.",
    },
    {
      keywords: ["test", "tested", "how is it tested"],
      response:
        "the harness tests encode with different messages and checks the round-trip: encode(encode(original)) must equal original.",
    },
    {
      keywords: ["Fields vs Split", "difference", "Split"],
      response:
        "Fields splits on any whitespace and trims. Split needs an exact separator. Fields is safer for natural text.",
    },
  ],

  codePatterns: [
    {
      match: (code) => {
        return code.includes("func encode(") && code.includes("strings.Fields") && code.includes("reverseWord") && code.includes("strings.Join") && code.includes("return");
      },
      response:
        "roolf si raelc. encode works. and the round-trip checks out — encode(encode(x)) returns x. reeves can decode on his end.\n\n||COMPLETE||",
    },
    {
      match: (code) => !code.includes("func encode("),
      response:
        "write the function: `func encode(msg string) string` above main.",
    },
    {
      match: (code) => code.includes("func encode(") && !code.includes("strings.Fields"),
      response:
        "use `strings.Fields(msg)` to split on whitespace. it returns a []string of words.",
    },
    {
      match: (code) => code.includes("strings.Fields") && !code.includes("reverseWord"),
      response:
        "reverse each word — call reverseWord inside the loop.",
    },
    {
      match: (code) => code.includes("reverseWord") && !code.includes("strings.Join"),
      response:
        "glue them back: `strings.Join(result, \" \")`.",
    },
  ],

  outputPatterns: [],

  correctResponse:
    "roolf si raelc. encode works. and the round-trip checks out — encode(encode(x)) returns x. reeves can decode on his end.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. encode should split with Fields, reverse each word, join with Join.",
    "the round-trip must work. encode(encode(x)) should return x. check your logic.",
  ],

  rushDialogue: [],

  stuckResponses: [
    "inside encode: `words := strings.Fields(msg)`, then `result := []string{}`, then `for _, w := range words { result = append(result, reverseWord(w)) }`, then `return strings.Join(result, \" \")`.",
    "split, reverse each, join. three operations. strings.Fields, reverseWord in a loop, strings.Join.",
  ],

  deflections: [
    "focus. write the encode function.",
    "not now — i need the full message cipher working.",
  ],
};

// Chapter 04.2: Step 3 — Relay Header
const ch04_2RelayheaderBank: StepBank = {
  intro:
    "cipher confirmed. last piece — relay headers. write `func relayHeader(floor int, code string) string`.\n\nconvert floor to string with `strconv.Itoa`. convert code to int with `strconv.Atoi`. Atoi returns two values — (int, error). check the error.\n\nformat: `\"F\" + floor + \"-C\" + strconv.Itoa(code*2)`.",

  conceptFAQ: [
    {
      keywords: ["itoa", "strconv.Itoa", "int to string"],
      response:
        "`strconv.Itoa(42)` returns `\"42\"`. integer to ASCII. it's the reverse of Atoi.",
    },
    {
      keywords: ["atoi", "strconv.Atoi", "string to int"],
      response:
        "`strconv.Atoi(\"42\")` returns `(42, nil)`. if the string isn't a number, it returns `(0, error)`.",
    },
    {
      keywords: ["error", "err", "error return", "two values", "multiple return"],
      response:
        "Atoi returns two values: the int and an error. `n, err := strconv.Atoi(code)`. if err is not nil, the conversion failed.",
    },
    {
      keywords: ["err != nil", "nil", "check error", "error check"],
      response:
        "`if err != nil { return \"ERR\" }` — the standard go error check. if something can fail, check it.",
    },
    {
      keywords: ["what is error", "error type"],
      response:
        "`error` is a built-in interface in go. nil means no error. anything else means something went wrong. always check it.",
    },
    {
      keywords: ["concatenation", "+", "string concat"],
      response:
        "strings concatenate with `+`: `\"F\" + strconv.Itoa(floor) + \"-C\" + strconv.Itoa(n*2)`. all parts must be strings.",
    },
    {
      keywords: ["why *2", "multiply", "times two"],
      response:
        "relay protocol doubles the code value as a checksum. the scanner expects it.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "start"],
      response:
        "write `func relayHeader(floor int, code string) string`. use Itoa for the floor, Atoi for the code (check err), return the formatted header.",
    },
    {
      keywords: ["test", "tested", "how is it tested"],
      response:
        "the harness calls relayHeader with valid and invalid codes. your error handling must work for both cases.",
    },
    {
      keywords: ["bad input", "invalid", "fail", "not a number"],
      response:
        "if code isn't a valid number, Atoi returns an error. return a header with \"ERR\" instead of the doubled value.",
    },
  ],

  codePatterns: [
    {
      match: (code) => {
        return code.includes("relayHeader") && code.includes("strconv.Itoa") && code.includes("strconv.Atoi") && code.includes("err != nil") && code.includes("return");
      },
      response:
        "F2-C100, F3-ERR, F1-C50. headers confirmed. the relay is live.\n\n||COMPLETE||",
    },
    {
      match: (code) => !code.includes("relayHeader"),
      response:
        "write the function: `func relayHeader(floor int, code string) string` above main.",
    },
    {
      match: (code) => code.includes("relayHeader") && !code.includes("strconv.Itoa"),
      response:
        "use `strconv.Itoa(floor)` to convert the int to a string for the header.",
    },
    {
      match: (code) => code.includes("strconv.Itoa") && !code.includes("strconv.Atoi"),
      response:
        "`strconv.Atoi(code)` parses the string to int. it returns (int, error).",
    },
    {
      match: (code) => code.includes("strconv.Atoi") && !code.includes("err != nil"),
      response:
        "atoi can fail. check `if err != nil` — return the error format.",
    },
  ],

  outputPatterns: [],

  correctResponse:
    "F2-C100, F3-ERR, F1-C50. headers confirmed. the relay is live.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. relayHeader needs strconv.Itoa for the floor, strconv.Atoi for the code, and an error check.",
    "check your format: \"F\" + Itoa(floor) + \"-C\" + Itoa(n*2). and handle the error case.",
  ],

  rushDialogue: [
    "scanner sweep in 30 seconds. finish the headers.",
    "no time — strconv.Itoa for the floor, Atoi for the code. check the error.",
  ],

  stuckResponses: [
    "inside relayHeader: `n, err := strconv.Atoi(code)`, then `if err != nil { return \"F\" + strconv.Itoa(floor) + \"-ERR\" }`, then `return \"F\" + strconv.Itoa(floor) + \"-C\" + strconv.Itoa(n*2)`.",
    "two conversions: Itoa turns int to string, Atoi turns string to int. Atoi can fail — check err != nil.",
  ],

  deflections: [
    "focus. write the relayHeader function.",
    "not now — i need those headers formatted.",
  ],
};

// ══════════════════════════════════════════════════════════════
//  Act III — FILE TREE · CIRCUIT CUT · CHANNEL OF ESCAPE
// ══════════════════════════════════════════════════════════════
// Shape helpers: the classic concurrency mistakes live in WHERE a line sits
// (inside the goroutine or outside it, inside the deferred func or not), so
// these read function bodies rather than grepping the whole file.

function stripGoComments(code: string): string {
  return code.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

/** The text between the brace at `open` and its partner, or null if unbalanced. */
function braceBody(src: string, open: number): string | null {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return null;
}

/** Body of `func name(...)` (top-level), comments stripped. */
function goFuncBody(code: string, name: string): string | null {
  const src = stripGoComments(code);
  const m = new RegExp(`func\\s+${name}\\s*\\(`).exec(src);
  if (!m) return null;
  const open = src.indexOf("{", m.index);
  return open === -1 ? null : braceBody(src, open);
}

/** Bodies of every `go func(...) { ... }` literal in `code`. */
function goroutineBodies(code: string): string[] {
  const src = stripGoComments(code);
  const bodies: string[] = [];
  const re = /\bgo\s+func\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const open = src.indexOf("{", m.index);
    const body = open === -1 ? null : braceBody(src, open);
    if (body !== null) bodies.push(body);
  }
  return bodies;
}

/** `body` with its goroutine literals cut out — what the launching code does itself. */
function outsideGoroutines(body: string): string {
  let rest = stripGoComments(body);
  for (const g of goroutineBodies(rest)) rest = rest.replace(g, "");
  return rest;
}

/** Bodies of functions that call themselves — `var f func(...)` + `f = func` literals, or named funcs. */
function recursiveBodies(code: string): string[] {
  const src = stripGoComments(code);
  const bodies: string[] = [];
  const re = /(?:\bfunc\s+(\w+)\s*\(|\b(\w+)\s*:?=\s*func\s*\()/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const name = m[1] ?? m[2];
    const open = src.indexOf("{", m.index);
    const body = open === -1 ? null : braceBody(src, open);
    if (body !== null && new RegExp(`\\b${name}\\s*\\(`).test(body)) bodies.push(body);
  }
  return bodies;
}

/** A `name := func(...)` literal that calls itself — go can't see `name` inside its own initializer. */
function shortDeclaredRecursion(code: string): boolean {
  const src = stripGoComments(code);
  const re = /\b(\w+)\s*:=\s*func\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const open = src.indexOf("{", m.index);
    const body = open === -1 ? null : braceBody(src, open);
    if (body !== null && new RegExp(`\\b${m[1]}\\s*\\(`).test(body)) return true;
  }
  return false;
}

/** `defer func() { ... }` with no `()` after the closing brace. */
function deferLiteralMissingCall(code: string): boolean {
  const src = stripGoComments(code);
  const re = /\bdefer\s+func\s*\(\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const open = src.indexOf("{", m.index);
    const body = open === -1 ? null : braceBody(src, open);
    if (body === null) continue;
    if (!src.slice(open + body.length + 2).trimStart().startsWith("(")) return true;
  }
  return false;
}

/** Does every `recover()` sit directly inside a deferred function (a defer literal, or a named func that is deferred)? */
function recoverOnlyInDefer(code: string): boolean {
  const src = stripGoComments(code);
  const total = (src.match(/\brecover\(\)/g) ?? []).length;
  if (total === 0) return false;
  let inside = 0;
  const lit = /\bdefer\s+func\s*\(\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = lit.exec(src))) {
    const open = src.indexOf("{", m.index);
    const body = open === -1 ? null : braceBody(src, open);
    if (body) inside += (body.match(/\brecover\(\)/g) ?? []).length;
  }
  const named = /\bdefer\s+(\w+)\s*\(/g;
  while ((m = named.exec(src))) {
    if (m[1] === "func") continue;
    const body = goFuncBody(src, m[1]);
    if (body) inside += (body.match(/\brecover\(\)/g) ?? []).length;
  }
  return inside >= total;
}

/** Name of the last `int` parameter of `func name(...)` — e.g. awaitContact's timeoutMs. */
function lastIntParam(code: string, name: string): string | null {
  const m = new RegExp(`func\\s+${name}\\s*\\(([^)]*)\\)`).exec(stripGoComments(code));
  if (!m) return null;
  const p = /(\w+)\s+int\s*$/.exec(m[1].trim());
  return p ? p[1] : null;
}

/** The output lines before `marker` — blank ones mean results were read before goroutines wrote them. */
function blankLinesBefore(output: string, marker: string): boolean {
  const lines = output.split("\n");
  const at = lines.findIndex((l) => l.includes(marker));
  return at > 0 && lines.slice(0, at).some((l) => l.trim() === "");
}

/** Every Act III chapter opens on the same `Hello World` scaffold; only the room changes. */
function helloScaffoldBank(opts: {
  intro: string;
  correct: string;
  room: ConceptEntry;
  extraPatterns?: CodePattern[];
}): StepBank {
  return {
    intro: opts.intro,
    conceptFAQ: [
      { keywords: ["package", "package main"], response: "`package main` on the first line. that's what makes the file a program go can run." },
      { keywords: ["import", "fmt"], response: "`import \"fmt\"` under the package line — fmt is what prints. one import, one plain line." },
      { keywords: ["func main", "entry", "main"], response: "`func main() { }` is where the program starts. the print goes inside it." },
      { keywords: ["hello world", "print", "println"], response: "`fmt.Println(\"Hello World\")` inside main. capital H, capital W, no punctuation." },
      opts.room,
      {
        keywords: ["what do i do", "what should i do", "what now", "where do i start", "start"],
        response: "five lines: `package main`, `import \"fmt\"`, `func main() {`, `fmt.Println(\"Hello World\")`, `}`. transmit it.",
      },
    ],
    codePatterns: [
      ...(opts.extraPatterns ?? []),
      { match: (code) => isValidScaffold(code), response: opts.correct },
      { match: (code) => !minify(code).includes("packagemain"), response: "every go file starts with `package main`. first line." },
      {
        match: (code) => {
          const m = minify(code);
          return !m.includes('import"fmt"') && !m.includes('import("fmt")');
        },
        response: "package is set. add `import \"fmt\"` underneath — printing lives there.",
      },
      {
        match: (code) => !minify(code).includes("funcmain(){"),
        response: "package and import are in. add `func main() { }` — the entry point.",
      },
      {
        match: (code) => !minify(code).includes("fmt.print"),
        response: "almost. go won't compile an import you don't use. put `fmt.Println(\"Hello World\")` inside main.",
      },
    ],
    outputPatterns: [
      {
        match: (output) => /hello world/i.test(output) && !output.includes("Hello World"),
        response: "close. the terminal is case-sensitive — exactly `Hello World`, capital H, capital W.",
      },
    ],
    correctResponse: opts.correct,
    genericWrong: [
      "the terminal can't parse that. package main, import \"fmt\", func main(), and a print inside.",
      "not a valid go program yet. it should print exactly `Hello World`.",
    ],
    rushDialogue: ["hurry. five lines. print `Hello World`."],
    stuckResponses: [
      "in order: `package main`, then `import \"fmt\"`, then `func main() {`, then `fmt.Println(\"Hello World\")`, then `}`.",
      "same skeleton as every terminal so far. package, import, main, and a println inside main.",
    ],
    deflections: ["not yet. wake the terminal first — print `Hello World`.", "focus. the skeleton, then we talk."],
  };
}

// Chapter 07: Step 0 — Scaffold
const ch07ScaffoldBank = helloScaffoldBank({
  intro:
    "the archive terminal locks when the server room's night cycle starts. wake it — print `Hello World`. package, import, main, same as always.",
  correct: "archive terminal's awake. a directory listing is scrolling up the screen. it goes deep.\n\n||COMPLETE||",
  room: {
    keywords: ["kira", "who is she", "unregistered"],
    response: "an unregistered channel, a name i don't know, and she knew which room i'd be in. i'm not answering her until this terminal is awake.",
  },
});

// Chapter 07: Step 1 — Scan
const ch07ScanBank: StepBank = {
  intro:
    "my thesis is somewhere in this archive, and the tree goes as deep as it likes. write `scanArchive(archive, root)`: a counter, and an inner `scan` that calls itself on every directory and logs `scanned: <dir>` on its way out. return the count.",

  conceptFAQ: [
    {
      keywords: ["undefined: scan", "undefined", "var scan", "declare first", "call itself", "calls itself"],
      response:
        "a function literal can't see its own name while it's being built. declare it first, `var scan func(dir string)`, then assign `scan = func(dir string) { ... }`. now the body can call `scan(...)`.",
    },
    {
      keywords: ["recursion", "recursive", "recurse"],
      response:
        "a function that calls itself on a smaller piece of the problem. every directory is a smaller tree. it stops by itself when a directory has no subdirectories left to walk.",
    },
    {
      keywords: ["closure", "capture", "captures", "count"],
      response:
        "`scan` is a closure — it captures `count` from scanArchive. `count++` inside scan changes the same variable scanArchive returns. declare it once, outside scan.",
    },
    {
      keywords: ["defer"],
      response:
        "`defer` schedules a call for when the surrounding function returns. its arguments are evaluated right away, so `defer fmt.Println(\"scanned:\", dir)` remembers this call's dir and prints it on the way out.",
    },
    {
      keywords: ["order", "root last", "why root", "last"],
      response:
        "root is the first directory to start and the last to finish. the deferred print runs when each call finishes, so the deepest directories log first and root logs last.",
    },
    {
      keywords: ["slash", "directory", "file", "suffix", "hassuffix"],
      response:
        "an entry ending in `/` is a directory. check the last byte, `entry[len(entry)-1] == '/'`, and strip it with `entry[:len(entry)-1]` before you scan it — the archive keys have no slash.",
    },
    {
      keywords: ["map", "archive[", "nil", "missing key"],
      response:
        "`archive[dir]` gives that directory's entries as a []string. a key that isn't there gives nil, and ranging over nil just does nothing.",
    },
    {
      keywords: ["kira"],
      response: "she says information costs. she hasn't named a price yet. that's what worries me. count the files.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "start"],
      response:
        "inside scanArchive: `count := 0`, then `var scan func(dir string)`, then `scan = func(dir string) { ... }` — defer the log, range over `archive[dir]`, recurse on directories, `count++` on files. then `scan(root)` and `return count`.",
    },
  ],

  codePatterns: [
    {
      match: (code) => shortDeclaredRecursion(code),
      response:
        "go won't let a function literal call itself when it's declared with `:=` — the name doesn't exist yet inside its own body. declare first: `var scan func(dir string)`, then `scan = func(dir string) { ... }`.",
    },
    {
      match: (code) => code.includes("scanned:") && !/\bdefer\b/.test(stripGoComments(code)),
      response:
        "you log on the way in, so root prints first. the log belongs on the way out — make it the first line of scan: `defer fmt.Println(\"scanned:\", dir)`.",
    },
    {
      match: (code) => recursiveBodies(code).some((b) => /\bcount\s*:=/.test(b)),
      response:
        "`count := 0` sits inside scan, so every call starts its own fresh zero and throws it away. declare it once in scanArchive — the closure captures it, and every call adds to the same counter.",
    },
    {
      match: (code) => {
        const v = /for\s+\w+\s*,\s*(\w+)\s*:=\s*range/.exec(stripGoComments(code));
        return !!v && new RegExp(`\\bscan\\(\\s*${v[1]}\\s*\\)`).test(stripGoComments(code));
      },
      response:
        "you're scanning the entry with its slash still on — `logs/`. the archive key is `logs`. strip it first: `scan(entry[:len(entry)-1])`.",
    },
    {
      match: (code) => {
        const src = stripGoComments(code);
        return (
          /func\s+scanArchive\s*\(/.test(src) &&
          /\bdefer\s+fmt\.Print/.test(src) &&
          src.includes("scanned:") &&
          recursiveBodies(src).length > 0 &&
          /\breturn\s+\w+/.test(src)
        );
      },
      response:
        "nine files. logs, alpha, beta, gamma, servers, root — every directory signed off on its way out. gamma has two thesis files in it. two versions of my work, and one of them i don't remember writing.\n\n||COMPLETE||",
    },
    {
      match: (code) => !/func\s+scanArchive\s*\(/.test(stripGoComments(code)),
      response:
        "write the function the terminal calls: `func scanArchive(archive map[string][]string, root string) int`, above main.",
    },
    {
      match: (code) => recursiveBodies(code).length === 0,
      response:
        "scan has to call itself on every directory it finds — that's how it reaches the bottom of the tree. `var scan func(dir string)` first, then inside the body, `scan(entry[:len(entry)-1])` for each directory.",
    },
    {
      match: (code) => !/\bdefer\b/.test(stripGoComments(code)),
      response:
        "the terminal needs each directory logged as it finishes. first line of scan: `defer fmt.Println(\"scanned:\", dir)`.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => output.trim().startsWith("scanned: root"),
      response:
        "root logged first. the print fires on the way in. it has to fire on the way out — `defer fmt.Println(\"scanned:\", dir)` waits until that call returns.",
    },
    {
      match: (output) => output.includes("total files") && !output.includes("scanned:"),
      response:
        "the count came through, but no directory logged itself. each scan call needs `defer fmt.Println(\"scanned:\", dir)` as its first line.",
    },
    {
      match: (output) => /total files: 14\b/.test(output),
      response:
        "fourteen — you're counting the directories too. an entry ending in `/` is a directory: scan it, don't count it. only the rest are files.",
    },
    {
      match: (output) => /^total files: 0$/m.test(output),
      response:
        "zero. the counter never moved where scanArchive can see it. declare `count := 0` in scanArchive, outside scan, and `count++` inside — the closure shares it.",
    },
    {
      match: (output) => /^total files: 1$/m.test(output),
      response:
        "one file — root's own. the walk never went into a directory. call scan on each directory entry, without its trailing slash.",
    },
  ],

  correctResponse:
    "nine files. logs, alpha, beta, gamma, servers, root — every directory signed off on its way out. gamma has two thesis files in it. two versions of my work, and one of them i don't remember writing.\n\n||COMPLETE||",

  genericWrong: [
    "the tree didn't come out right. each directory should log `scanned: <dir>` as it finishes, deepest first, root last, then `total files: 9`.",
    "not matching. count only the entries without a trailing `/`, recurse into the ones with it, and defer the log so it prints on the way out.",
  ],

  rushDialogue: ["the night cycle is close. defer the log, recurse, count."],

  stuckResponses: [
    "inside scanArchive: `count := 0`, `var scan func(dir string)`, then `scan = func(dir string) { defer fmt.Println(\"scanned:\", dir); for _, entry := range archive[dir] { ... } }`. a directory entry ends in `/` — `scan(entry[:len(entry)-1])`, otherwise `count++`. then `scan(root)` and `return count`.",
    "three ideas, one function. a closure that shares `count`. a recursive call for every directory. a deferred print so each directory logs as it finishes.",
  ],

  deflections: ["later. the archive first — count the files.", "not now. scan the tree, find the thesis."],
};

// Chapter 07: Step 2 — Recover
const ch07RecoverBank: StepBank = {
  intro:
    "GHOST booby-trapped part of the archive. one corrupted directory and a plain scan crashes — and trips the alarm. write `safeScan`: panic on a nil directory, catch it inside each scan call with a deferred recover, write the error down, keep walking.",

  conceptFAQ: [
    {
      keywords: ["expression in defer", "must be function call", "()", "parentheses"],
      response:
        "`defer` needs a call, not a function. the `()` after the closing brace calls the literal: `defer func() { ... }()`. without them go won't compile it.",
    },
    {
      keywords: ["recover"],
      response:
        "`recover()` only works inside a deferred function — `defer func() { if r := recover(); r != nil { ... } }()`. called anywhere else it returns nil and catches nothing.",
    },
    {
      keywords: ["panic"],
      response:
        "`panic` stops the function on the spot and unwinds back up the calls, running every deferred function on the way. if none of them recovers, the program crashes.",
    },
    {
      keywords: ["order", "lifo", "last in", "which defer"],
      response:
        "deferred calls run last-in, first-out. both of scan's defers run before the call returns, panic or not — so vault still logs `scanned: vault`, and the recover still catches the panic.",
    },
    {
      keywords: ["keep going", "keep scanning", "carry on", "continue", "why does it keep"],
      response:
        "each scan call guards itself. vault's call panics, vault's deferred recover catches it, and that call returns normally — so root's loop just moves on to the next entry.",
    },
    {
      keywords: ["errs", "errors", "append", "record"],
      response:
        "declare `errs := []string{}` in safeScan next to count. the deferred func is a closure too — `errs = append(errs, ...)` inside it adds to the slice safeScan returns.",
    },
    {
      keywords: ["sprintf", "%v", "format", "message"],
      response:
        "`fmt.Sprintf(\"%s: %v\", dir, r)` — the directory, a colon, then whatever was passed to panic. `%v` prints any value.",
    },
    {
      keywords: ["try/catch", "try catch", "exception", "catch"],
      response:
        "go has no try/catch. errors are values — you've been returning them since `strconv.Atoi`. panic is for when a function can't go on. here we catch it at each directory so one bad sector can't take the scan down.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "start"],
      response:
        "copy your scan into `safeScan`. in scan, first a `defer func() { if r := recover(); r != nil { errs = append(errs, ...) } }()`, then the deferred log, then `if archive[dir] == nil { panic(\"corrupted directory\") }`. return count and errs.",
    },
  ],

  codePatterns: [
    {
      match: (code) => deferLiteralMissingCall(code),
      response:
        "your deferred func is missing its `()` after the closing brace. `defer func() { ... }()` — the parentheses call it. without them you're deferring a function value, and go won't compile that.",
    },
    {
      match: (code) => /\brecover\(\)/.test(stripGoComments(code)) && !recoverOnlyInDefer(code),
      response:
        "`recover()` is sitting outside a deferred function, where it returns nil and catches nothing. it only works inside one: `defer func() { if r := recover(); r != nil { ... } }()`.",
    },
    {
      match: (code) => {
        const src = stripGoComments(code);
        const rec = recursiveBodies(src);
        return /\brecover\(\)/.test(src) && rec.length > 0 && !rec.some((b) => /\brecover\(\)/.test(b));
      },
      response:
        "your recover guards safeScan, not each directory. the first panic unwinds the whole walk before it's caught. move the `defer func() { ... }()` inside scan, so every call catches its own panic and the parent keeps going.",
    },
    {
      match: (code) =>
        recursiveBodies(code).some((b) => {
          const p = b.search(/\bpanic\(/);
          const d = b.search(/\bdefer\s+fmt\.Print/);
          return p !== -1 && d !== -1 && p < d;
        }),
      response:
        "the panic comes before your deferred log, so for vault the log is never scheduled. defers have to be registered before anything can panic — put `defer fmt.Println(\"scanned:\", dir)` above the nil check.",
    },
    {
      match: (code) => {
        const src = stripGoComments(code);
        return (
          /func\s+safeScan\s*\(/.test(src) &&
          /\bpanic\(/.test(src) &&
          recoverOnlyInDefer(src) &&
          recursiveBodies(src).some((b) => /\brecover\(\)/.test(b)) &&
          /\bappend\(/.test(src)
        );
      },
      response:
        "vault fell over and the scan didn't. nine files, one corrupted sector logged, alarm still quiet. whatever GHOST kept in that vault, he didn't want it read.\n\n||COMPLETE||",
    },
    {
      match: (code) => !/func\s+safeScan\s*\(/.test(stripGoComments(code)),
      response:
        "write `func safeScan(archive map[string][]string, root string) (int, []string)` — your scan, made to survive. it returns the count and the errors.",
    },
    {
      match: (code) => !/\bpanic\(/.test(stripGoComments(code)),
      response:
        "a corrupted directory has no entries. when `archive[dir] == nil`, `panic(\"corrupted directory\")`.",
    },
    {
      match: (code) => !/\brecover\(\)/.test(stripGoComments(code)),
      response:
        "the panic needs catching. first line of scan: `defer func() { if r := recover(); r != nil { ... } }()`.",
    },
    {
      match: (code) => !/\bappend\(/.test(stripGoComments(code)),
      response:
        "you catch it, but nothing gets written down. inside the recover: `errs = append(errs, fmt.Sprintf(\"%s: %v\", dir, r))`.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => /ERROR: corrupted directory/.test(output),
      response:
        "the errors are missing the directory name. each one reads `<dir>: <panic>` — `fmt.Sprintf(\"%s: %v\", dir, r)`.",
    },
    {
      match: (output) => output.includes("ERROR: vault") && !output.includes("scanned: vault"),
      response:
        "vault was caught but never logged as scanned. the panic fires before your deferred print is scheduled. put `defer fmt.Println(\"scanned:\", dir)` at the top of scan, above the nil check.",
    },
    {
      match: (output) => /ERROR: vault: (?!corrupted directory$)/m.test(output),
      response:
        "the panic message has to be exactly `corrupted directory` — `panic(\"corrupted directory\")`.",
    },
    {
      match: (output) => /^total files: 0$/m.test(output),
      response:
        "zero files. the first panic took the whole walk down before it was caught. the recover belongs inside scan, so each directory catches its own.",
    },
    {
      match: (output) => output.includes("total files") && !output.includes("ERROR:"),
      response:
        "the scan survived, but no errors came back. inside the recover, `errs = append(errs, fmt.Sprintf(\"%s: %v\", dir, r))` — and return errs.",
    },
  ],

  correctResponse:
    "vault fell over and the scan didn't. nine files, one corrupted sector logged, alarm still quiet. whatever GHOST kept in that vault, he didn't want it read.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. every directory still logs `scanned: <dir>`, the count stays 9, and the corrupted one comes back as `ERROR: vault: corrupted directory`.",
    "the scan has to fall and get back up. panic on nil, a deferred recover in every scan call, record the error, carry on.",
  ],

  rushDialogue: ["sectors are failing. recover inside scan. now."],

  stuckResponses: [
    "inside scan, in this order: `defer func() { if r := recover(); r != nil { errs = append(errs, fmt.Sprintf(\"%s: %v\", dir, r)) } }()`, then `defer fmt.Println(\"scanned:\", dir)`, then `if archive[dir] == nil { panic(\"corrupted directory\") }`, then the same loop as before.",
    "panic stops the call. a deferred recover in that same call catches it. the call returns normally and its parent keeps looping. that's the whole trick.",
  ],

  deflections: ["not now. the vault is trapped and the scan has to survive it.", "later. get the scan through the corrupted sectors."],
};

// Chapter 08: Step 0 — Scaffold
const ch08ScaffoldBank = helloScaffoldBank({
  intro:
    "the breaker console is my way to the alarm grid's power. bring it up — print `Hello World`. just fmt for now.",
  correct: "breaker console online. four circuits on the board — north, south, east, west.\n\n||COMPLETE||",
  room: {
    keywords: ["time", "sync", "imports now", "import time"],
    response: "not yet. go refuses to compile an import you don't use. `time` and `sync` come in when a step needs them.",
  },
  extraPatterns: [
    {
      match: (code) => {
        const src = stripGoComments(code);
        return (
          (/"sync"/.test(src) && !/\bsync\./.test(src.replace(/"sync"/g, ""))) ||
          (/"time"/.test(src) && !/\btime\./.test(src.replace(/"time"/g, "")))
        );
      },
      response:
        "go won't compile an import you don't use. drop `time` and `sync` for now — just `import \"fmt\"`. they come in when a step needs them.",
    },
  ],
});

// Chapter 08: Step 1 — Goroutine
const ch08GoroutineBank: StepBank = {
  intro:
    "i can only throw one breaker at a time by hand. the program has to throw them for me, without stopping to watch each one. write `cut(name)` that prints `<name> circuit: DOWN`, and `cutAsync(name)` that runs it with `go` and returns straight away. import `time` — the terminal holds main open for 100ms.",

  conceptFAQ: [
    {
      keywords: ["goroutine", "go keyword", "go cut", "concurrent", "concurrency"],
      response:
        "a goroutine is a function running alongside the rest of the program. put `go` in front of any call and it starts — the caller doesn't wait for it to finish.",
    },
    {
      keywords: ["sleep", "100ms", "main returns", "exit", "why wait"],
      response:
        "when main returns, the program ends — every goroutine still running dies mid-flight. the terminal sleeps 100ms so south gets to finish. next step replaces the sleep with the real tool.",
    },
    {
      keywords: ["thread", "threads"],
      response:
        "a goroutine isn't an operating-system thread. it starts with a tiny stack, and go's scheduler runs thousands of them on a handful of threads. that's why they're cheap enough to start one per breaker.",
    },
    {
      keywords: ["undefined: time", "import time", "time"],
      response:
        "the terminal's main calls `time.Sleep`, so `\"time\"` has to be imported. two imports share one block: `import (` then `\"fmt\"` and `\"time\"` on their own lines, then `)`.",
    },
    {
      keywords: ["return", "cutasync"],
      response:
        "cutAsync returns nothing. one line in its body: `go cut(name)`. it launches and leaves.",
    },
    {
      keywords: ["order", "north first", "which prints first"],
      response:
        "north is called directly, so it prints before main moves on. south runs in its goroutine while main sleeps, then main prints `power cycle complete`.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "start"],
      response:
        "two functions above main. `func cut(name string)` prints `name + \" circuit: DOWN\"`. `func cutAsync(name string)` is one line: `go cut(name)`. and add `\"time\"` to your imports.",
    },
  ],

  codePatterns: [
    {
      match: (code) => {
        const body = goFuncBody(code, "cutAsync");
        return body !== null && /\bcut\s*\(/.test(body) && !/\bgo\b/.test(body);
      },
      response:
        "cutAsync calls cut right there, in the caller — so it waits for the breaker. same output, wrong machine. put `go` in front: `go cut(name)`.",
    },
    {
      match: (code) => {
        const body = goFuncBody(code, "cutAsync");
        return body !== null && /time\.Sleep|\.Wait\(\)/.test(body);
      },
      response:
        "cutAsync shouldn't wait for anything. it launches the goroutine and returns — the terminal's main does the holding.",
    },
    {
      match: (code) => !/"time"/.test(code),
      response:
        "the terminal's main calls `time.Sleep`, so `\"time\"` has to be in your imports. group them: `import (` then `\"fmt\"` and `\"time\"`, then `)`.",
    },
    {
      match: (code) => {
        const body = goFuncBody(code, "cutAsync");
        return (
          goFuncBody(code, "cut") !== null &&
          body !== null &&
          /\bgo\s+(cut\s*\(|func\s*\()/.test(body) &&
          code.includes("circuit: DOWN")
        );
      },
      response:
        "north by hand, south on its own. and i never stopped to watch it. one breaker thrown while i was already reaching for the next.\n\n||COMPLETE||",
    },
    {
      match: (code) => goFuncBody(code, "cut") === null,
      response: "write `func cut(name string)` — it prints `name + \" circuit: DOWN\"`.",
    },
    {
      match: (code) => goFuncBody(code, "cutAsync") === null,
      response: "now `func cutAsync(name string)` — one line inside: `go cut(name)`.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => /North/.test(output) && !output.includes("North circuit: DOWN"),
      response: "each breaker line reads exactly `<name> circuit: DOWN` — `North circuit: DOWN`. check the spacing and the capitals.",
    },
    {
      match: (output) => output.includes("North circuit: DOWN") && !output.includes("South circuit: DOWN"),
      response: "south never reported. cutAsync has to launch `cut(name)` — `go cut(name)` — and the call has to actually happen.",
    },
  ],

  correctResponse:
    "north by hand, south on its own. and i never stopped to watch it. one breaker thrown while i was already reaching for the next.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. the terminal wants `North circuit: DOWN`, `South circuit: DOWN`, then `power cycle complete`.",
    "cut prints the line. cutAsync starts cut as a goroutine with `go` and returns. that's the whole step.",
  ],

  rushDialogue: ["the grid's cycling. `go cut(name)`. go."],

  stuckResponses: [
    "`func cut(name string) { fmt.Println(name + \" circuit: DOWN\") }` and `func cutAsync(name string) { go cut(name) }`. import `\"fmt\"` and `\"time\"` together.",
    "the whole new idea is one word. `go` in front of a call means run it alongside, don't wait.",
  ],

  deflections: ["not now. one breaker, one goroutine.", "later. throw the breaker first."],
};

// Chapter 08: Step 2 — Fan-out
const ch08FanoutBank: StepBank = {
  intro:
    "all four breakers drop together or the grid sees the imbalance — and i can't call it blind until every one confirms. write `cutAll(circuits)`: one goroutine per circuit, a `sync.WaitGroup` to wait for them all, the confirmations back in circuit order.",

  conceptFAQ: [
    {
      keywords: ["by value", "copy waitgroup", "pointer", "&wg", "deadlock", "asleep"],
      response:
        "a WaitGroup must never be copied. pass it to another function by value and that function calls Done on a copy — the real one never reaches zero and Wait hangs forever. keep it local, or pass `&wg`.",
    },
    {
      keywords: ["add before", "add inside", "why add"],
      response:
        "if the goroutine adds itself, `Wait` might run first, see zero, and return before anything started. `wg.Add(1)` goes in the loop, before `go`.",
    },
    {
      keywords: ["waitgroup", "wait group", "sync"],
      response:
        "a WaitGroup counts running goroutines. `Add(1)` before each launch, `Done()` when one finishes, `Wait()` blocks until the count is back to zero. import `\"sync\"` and declare `var wg sync.WaitGroup`.",
    },
    {
      keywords: ["defer wg.done", "done", "defer"],
      response:
        "`defer wg.Done()` as the first line inside the goroutine. however the goroutine ends, even if it panics halfway, the count still goes down.",
    },
    {
      keywords: ["pass", "arguments", "loop variable", "loop var", "idx"],
      response:
        "hand the goroutine its own copy: `go func(idx int, n string) { ... }(i, name)`. since go 1.22 each loop iteration gets fresh variables anyway, but passing them in says exactly what the goroutine owns.",
    },
    {
      keywords: ["println inside", "print inside", "scrambled", "order", "why not print"],
      response:
        "goroutines finish in any order, so printing inside them scrambles the lines. each one writes its own slot, `results[idx]`, and the terminal prints them in order after `Wait`.",
    },
    {
      keywords: ["race", "append", "data race"],
      response:
        "two goroutines appending to the same slice at once is a data race — one write can swallow the other. pre-size it, `results := make([]string, len(circuits))`, and each goroutine writes only its own index.",
    },
    {
      keywords: ["make", "results", "pre-size", "presize"],
      response:
        "`results := make([]string, len(circuits))` — four empty slots, ready before any goroutine starts. goroutine i fills `results[i]`, no two touch the same one.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "start"],
      response:
        "make the results slice, declare the WaitGroup, then for each circuit: `wg.Add(1)`, launch `go func(idx int, n string) { defer wg.Done(); results[idx] = n + \" circuit: DOWN\" }(i, name)`. after the loop, `wg.Wait()` and `return results`.",
    },
  ],

  codePatterns: [
    {
      match: (code) => /\w+\s+sync\.WaitGroup\s*[,)]/.test(stripGoComments(code)),
      response:
        "you're passing the WaitGroup by value. the function gets a copy, calls Done on the copy, and the real count never reaches zero — Wait hangs. pass `&wg` and take `*sync.WaitGroup`, or keep it all inside cutAll.",
    },
    {
      match: (code) => goroutineBodies(code).some((b) => /\.Add\(/.test(b)),
      response:
        "`wg.Add(1)` is inside the goroutine. by the time it runs, `Wait` may already have seen zero and returned. add before you launch — in the loop, right above `go`.",
    },
    {
      match: (code) => goroutineBodies(code).some((b) => /\bfmt\.Print/.test(b)),
      response:
        "you're printing from inside the goroutines, so the lines come out in whatever order they finish. write `results[idx] = ...` instead and return the slice — the terminal prints it in order.",
    },
    {
      match: (code) => goroutineBodies(code).some((b) => /\bappend\(/.test(b)),
      response:
        "four goroutines appending to one slice at the same time is a data race — writes get lost and the order is luck. pre-size it with `make([]string, len(circuits))` and write `results[idx]`.",
    },
    {
      match: (code) => /\bgo\s+func/.test(code) && !/\.Wait\(\)/.test(stripGoComments(code)),
      response:
        "nothing waits for the goroutines, so cutAll returns empty slots before a single breaker reports. `wg.Wait()` after the loop, before `return`.",
    },
    {
      match: (code) => {
        const src = stripGoComments(code);
        const bodies = goroutineBodies(src);
        return (
          /sync\.WaitGroup/.test(src) &&
          /\.Add\(/.test(outsideGoroutines(src)) &&
          /\.Wait\(\)/.test(src) &&
          bodies.length > 0 &&
          bodies.every((b) => /^\s*defer\s+\w+\.Done\(\)/.test(b) && /\w+\[\w+\]\s*=/.test(b)) &&
          /\bgo\s+func\s*\(\s*\w+/.test(src)
        );
      },
      response:
        "four confirmations, in order, one cycle. north, south, east, west — all dark at once. the grid never saw it coming.\n\n||COMPLETE||",
    },
    {
      match: (code) => {
        const src = stripGoComments(code);
        const bodies = goroutineBodies(src);
        return (
          /sync\.WaitGroup/.test(src) &&
          /\.Add\(/.test(outsideGoroutines(src)) &&
          /\.Wait\(\)/.test(src) &&
          bodies.length > 0 &&
          bodies.every((b) => /\.Done\(\)/.test(b) && /\w+\[\w+\]\s*=/.test(b)) &&
          !bodies.every((b) => /^\s*defer\s+\w+\.Done\(\)/.test(b))
        );
      },
      response:
        "all four down, in order. it works. one habit for next time — `defer wg.Done()` as the first line of the goroutine, so the count drops however it exits.\n\n||COMPLETE||",
    },
    {
      match: (code) => {
        const src = stripGoComments(code);
        const bodies = goroutineBodies(src);
        return (
          /sync\.WaitGroup/.test(src) &&
          /\.Add\(/.test(outsideGoroutines(src)) &&
          /\.Wait\(\)/.test(src) &&
          bodies.length > 0 &&
          bodies.every((b) => /\.Done\(\)/.test(b) && /\w+\[\w+\]\s*=/.test(b))
        );
      },
      response:
        "all four down, in order. it works — since go 1.22 every loop iteration gets its own i and name. still, pass them in, `go func(idx int, n string) { ... }(i, name)`, so the goroutine says what it owns.\n\n||COMPLETE||",
    },
    {
      match: (code) => !/sync\.WaitGroup/.test(stripGoComments(code)),
      response:
        "you need something that counts the goroutines home. import `\"sync\"` and declare `var wg sync.WaitGroup` in cutAll.",
    },
    {
      match: (code) => !/\bgo\s/.test(stripGoComments(code)),
      response:
        "one goroutine per circuit — `go func(idx int, n string) { ... }(i, name)` inside the loop.",
    },
    {
      match: (code) => !/\.Add\(/.test(stripGoComments(code)),
      response: "the WaitGroup has to know how many to wait for. `wg.Add(1)` in the loop, before each `go`.",
    },
    {
      match: (code) => !/\.Done\(\)/.test(stripGoComments(code)),
      response: "each goroutine has to check in when it's finished. first line inside: `defer wg.Done()`.",
    },
    {
      match: () => true,
      response:
        "pre-size the results, `results := make([]string, len(circuits))`, and have each goroutine write its own slot: `results[idx] = n + \" circuit: DOWN\"`.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => blankLinesBefore(output, "ALL CIRCUITS DOWN"),
      response:
        "empty lines — cutAll returned before the goroutines wrote anything. `wg.Wait()` after the loop, before `return results`.",
    },
    {
      match: (output) => {
        const n = output.indexOf("North circuit: DOWN");
        const w = output.indexOf("West circuit: DOWN");
        return n !== -1 && w !== -1 && w < n;
      },
      response:
        "the breakers reported out of order — that's goroutines printing as they finish. each one writes `results[idx]`, and the terminal prints the slice in order.",
    },
    {
      match: (output) => /North/.test(output) && !output.includes("North circuit: DOWN"),
      response: "each confirmation reads exactly `<name> circuit: DOWN`. check the spacing and the capitals.",
    },
  ],

  correctResponse:
    "four confirmations, in order, one cycle. north, south, east, west — all dark at once. the grid never saw it coming.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. four lines in circuit order — `North circuit: DOWN` through `West circuit: DOWN` — then `ALL CIRCUITS DOWN`, then `Aux circuit: DOWN`.",
    "the ritual: `wg.Add(1)` before each `go`, `defer wg.Done()` first thing inside, `wg.Wait()` once after the loop. results by index.",
  ],

  rushDialogue: ["the self-check's coming. add, go, done, wait."],

  stuckResponses: [
    "`results := make([]string, len(circuits))`, `var wg sync.WaitGroup`, then `for i, name := range circuits { wg.Add(1); go func(idx int, n string) { defer wg.Done(); results[idx] = n + \" circuit: DOWN\" }(i, name) }`, then `wg.Wait()` and `return results`.",
    "a WaitGroup is a counter you can wait on. up by one before each launch, down by one as each finishes, and Wait sits there until it's zero.",
  ],

  deflections: ["not now. four breakers, one moment.", "later. get all four down together."],
};

// Chapter 08: Step 3 — One cycle
const ch08WindowBank: StepBank = {
  intro:
    "each breaker takes its own time to trip, and the grid self-checks once a cycle. one at a time costs the sum of the delays — two cycles, alarm. all at once costs only the slowest. write `cutTimed(circuits, delays)`: the same fan-out, but each goroutine sleeps its delay first, then records `<name> circuit: DOWN (<delay>ms)`.",

  conceptFAQ: [
    {
      keywords: ["mismatched types", "duration", "milliseconds", "ms", "sleep for"],
      response:
        "`time.Sleep` takes a `time.Duration`, not an int. convert, then scale: `time.Sleep(time.Duration(d) * time.Millisecond)`.",
    },
    {
      keywords: ["where does the sleep", "sleep", "where"],
      response:
        "inside the goroutine, before it records its line. sleep in the loop and the breakers trip one after another — the sum, not the max.",
    },
    {
      keywords: ["sum", "max", "slowest", "1100", "450"],
      response:
        "one after another: 300 + 150 + 450 + 200 = 1100ms, two cycles. all at once: they sleep side by side, so the whole thing takes as long as the slowest — 450ms.",
    },
    {
      keywords: ["timed", "measure", "time.since", "how does it know"],
      response:
        "the terminal reads the clock before and after your call with `time.Since`. under 1100ms is one cycle. it can't be faked — the breakers really have to sleep side by side.",
    },
    {
      keywords: ["format", "sprintf", "%d"],
      response: "`fmt.Sprintf(\"%s circuit: DOWN (%dms)\", n, d)` — name, then the delay in the brackets.",
    },
    {
      keywords: ["pass", "argument", "delays[i]", "delay"],
      response:
        "the delay is loop state too. pass it as a third argument: `go func(idx int, n string, d int) { ... }(i, name, delays[i])`.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "start"],
      response:
        "copy cutAll into `cutTimed(circuits []string, delays []int) []string`. inside each goroutine, sleep first, then `results[idx] = fmt.Sprintf(\"%s circuit: DOWN (%dms)\", n, d)`.",
    },
  ],

  codePatterns: [
    {
      match: (code) => {
        const body = goFuncBody(code, "cutTimed");
        return body !== null && /time\.Sleep/.test(outsideGoroutines(body));
      },
      response:
        "the sleep is in the loop, not the goroutine — so each breaker waits for the last one to finish before it even starts. that's the sum, two cycles. move `time.Sleep` inside the goroutine.",
    },
    {
      match: (code) => {
        const body = goFuncBody(code, "cutTimed");
        if (body === null) return false;
        const rest = outsideGoroutines(body);
        const at = rest.search(/\bfor\b/);
        if (at === -1) return false;
        const open = rest.indexOf("{", at);
        const loop = open === -1 ? null : braceBody(rest, open);
        return loop !== null && /\.Wait\(\)/.test(loop);
      },
      response:
        "`wg.Wait()` is inside the loop, so you wait for each breaker before launching the next. one after another — the sum. wait once, after the loop.",
    },
    {
      match: (code) =>
        /time\.Sleep\(\s*\w+(\[\w+\])?\s*\*\s*time\.Millisecond/.test(stripGoComments(code)) && !/time\.Duration\(/.test(code),
      response:
        "go won't multiply an int by a Duration. convert first: `time.Sleep(time.Duration(d) * time.Millisecond)`.",
    },
    {
      match: (code) => goroutineBodies(code).some((b) => /\.Add\(/.test(b)),
      response: "`wg.Add(1)` belongs before the `go`, not inside the goroutine — otherwise Wait can return before anyone's counted.",
    },
    {
      match: (code) => /\bgo\s+func/.test(code) && !/\.Wait\(\)/.test(stripGoComments(code)),
      response: "nothing waits for the breakers to trip. `wg.Wait()` after the loop, before `return`.",
    },
    {
      match: (code) => {
        const body = goFuncBody(code, "cutTimed");
        if (body === null) return false;
        const bodies = goroutineBodies(body);
        return (
          bodies.length > 0 &&
          bodies.some((b) => /time\.Sleep/.test(b)) &&
          /\.Wait\(\)/.test(body) &&
          /DOWN \(|%dms/.test(body)
        );
      },
      response:
        "four hundred and fifty milliseconds. one cycle. the alarm grid is blind and it doesn't know it yet.\n\n||COMPLETE||",
    },
    {
      match: (code) => goFuncBody(code, "cutTimed") === null,
      response:
        "write `func cutTimed(circuits []string, delays []int) []string` — your cutAll, with a sleep inside each goroutine.",
    },
    {
      match: (code) => !/time\.Sleep/.test(stripGoComments(code)),
      response:
        "each goroutine sleeps its breaker's delay first: `time.Sleep(time.Duration(d) * time.Millisecond)`.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => output.includes("MULTI CYCLE"),
      response:
        "two cycles — the breakers tripped one after another. the sleep has to happen inside each goroutine, and `wg.Wait()` only once, after the loop.",
    },
    {
      match: (output) => blankLinesBefore(output, "window:"),
      response: "empty lines — cutTimed returned before the goroutines wrote. `wg.Wait()` before `return results`.",
    },
    {
      match: (output) => /circuit: DOWN\s*$/m.test(output),
      response: "each line needs its delay: `North circuit: DOWN (300ms)` — `fmt.Sprintf(\"%s circuit: DOWN (%dms)\", n, d)`.",
    },
  ],

  correctResponse:
    "four hundred and fifty milliseconds. one cycle. the alarm grid is blind and it doesn't know it yet.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. four lines like `North circuit: DOWN (300ms)` in circuit order, then `window: SINGLE CYCLE - alarm blind`, then `ALL CIRCUITS DOWN`.",
    "same fan-out as before. the only new line is the sleep, and it lives inside the goroutine.",
  ],

  rushDialogue: [
    "self-check imminent. sleep inside the goroutine, wait once.",
    "no time. all four sleep together or we get two cycles.",
  ],

  stuckResponses: [
    "inside cutTimed's loop: `wg.Add(1)`, then `go func(idx int, n string, d int) { defer wg.Done(); time.Sleep(time.Duration(d) * time.Millisecond); results[idx] = fmt.Sprintf(\"%s circuit: DOWN (%dms)\", n, d) }(i, name, delays[i])`. after the loop, `wg.Wait()`.",
    "concurrent costs the slowest. sequential costs the sum. the only difference is whether the sleep is inside the goroutine or outside it.",
  ],

  deflections: ["not now. one cycle, four breakers.", "later. the grid checks itself any second."],
};

// Chapter 09: Step 0 — Scaffold
const ch09ScaffoldBank = helloScaffoldBank({
  intro: "the comms array is how i call for a way out. power it up — print `Hello World`. `time` joins the imports next step.",
  correct: "comms array is live. three extraction frequencies on the board — alpha, bravo, charlie.\n\n||COMPLETE||",
  room: {
    keywords: ["frequencies", "teams", "alpha", "bravo", "charlie"],
    response: "three teams on three frequencies, all from kira. one of them is slower than it should be. array first.",
  },
});

// Chapter 09: Step 1 — Hail
const ch09HailBank: StepBank = {
  intro:
    "i have to call an extraction team and hear back without freezing this terminal while i wait. write `hail(team, delayMs)`: a channel with room for one message, a goroutine that sleeps then sends `<team> responding`, and return the channel straight away.",

  conceptFAQ: [
    {
      keywords: ["deadlock", "asleep", "all goroutines"],
      response:
        "go stops the program when every goroutine is stuck waiting and nothing can wake them. usually a send with nobody receiving, or a receive with nobody sending.",
    },
    {
      keywords: ["buffer", "buffered", ", 1", "room", "capacity"],
      response:
        "`make(chan string, 1)` has room for one message. the team can drop its reply and leave even if nobody's listening yet. unbuffered, the sender is stuck until someone receives.",
    },
    {
      keywords: ["channel", "chan"],
      response:
        "a channel is a pipe between goroutines. `ch <- v` sends a value in, `v := <-ch` takes one out — and waits until there is one.",
    },
    {
      keywords: ["send", "receive", "<-", "arrow"],
      response:
        "the arrow points the way the data moves. `ch <- msg` pushes into the channel. `<-ch` pulls out of it.",
    },
    {
      keywords: ["return", "why return the channel"],
      response:
        "hail returns the channel itself, `chan string`, at once. the goroutine answers into it later. the terminal does the waiting with `<-ch`.",
    },
    {
      keywords: ["waitgroup", "wait group"],
      response: "no WaitGroup this time. receiving from the channel is the wait — `<-ch` doesn't return until the team has answered.",
    },
    {
      keywords: ["close"],
      response: "you don't need to close it. one message, one receive. closing is for telling a receiver no more values are coming.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "start"],
      response:
        "`ch := make(chan string, 1)`, then `go func() { time.Sleep(time.Duration(delayMs) * time.Millisecond); ch <- team + \" responding\" }()`, then `return ch`.",
    },
  ],

  codePatterns: [
    {
      match: (code) => /func\s+hail\s*\([^)]*\)\s*string\b/.test(stripGoComments(code)),
      response:
        "hail hands back the channel itself — `chan string` — not the message. the terminal does the receiving: `func hail(team string, delayMs int) chan string`.",
    },
    {
      match: (code) => /make\(\s*chan\s+string\s*\)/.test(stripGoComments(code)),
      response:
        "unbuffered works while someone's listening. next step three teams answer and only one gets heard — the other two would be stuck holding their messages forever. give it room for one: `make(chan string, 1)`.",
    },
    {
      match: (code) => {
        const body = goFuncBody(code, "hail");
        return body !== null && /time\.Sleep/.test(outsideGoroutines(body));
      },
      response:
        "hail sleeps before it returns, so the terminal freezes until the team answers. the sleep belongs inside the goroutine — hail returns the channel at once.",
    },
    {
      match: (code) => {
        const body = goFuncBody(code, "hail");
        return body !== null && /(=|\(|return)\s*<-\s*\w+/.test(outsideGoroutines(body));
      },
      response:
        "hail is receiving its own message. don't — return the channel and let the terminal do `<-ch`.",
    },
    {
      match: (code) => {
        const body = goFuncBody(code, "hail");
        return body !== null && !/\bgo\s/.test(body);
      },
      response:
        "the send needs its own goroutine, `go func() { ... }()`, so hail can return before the team answers.",
    },
    {
      match: (code) => {
        const body = goFuncBody(code, "hail");
        return (
          body !== null &&
          /make\(\s*chan\s+string\s*,\s*[1-9]/.test(body) &&
          goroutineBodies(body).some((b) => /\w+\s*<-/.test(b)) &&
          /\breturn\s+\w+/.test(outsideGoroutines(body))
        );
      },
      response:
        "bravo responding. the terminal never froze — it just listened when it was ready to. one message, one channel, and the team could leave the second they spoke.\n\n||COMPLETE||",
    },
    {
      match: (code) => goFuncBody(code, "hail") === null,
      response: "write `func hail(team string, delayMs int) chan string` above main.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => output.includes("Bravo") && !output.includes("Bravo responding"),
      response: "the reply reads exactly `Bravo responding` — `team + \" responding\"`.",
    },
  ],

  correctResponse:
    "bravo responding. the terminal never froze — it just listened when it was ready to. one message, one channel, and the team could leave the second they spoke.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. the terminal should print `hailing Bravo...`, then `Bravo responding`, then `channel confirmed`.",
    "make the channel with room for one, answer into it from a goroutine, hand it back straight away.",
  ],

  rushDialogue: ["hurry. make, go, return."],

  stuckResponses: [
    "`func hail(team string, delayMs int) chan string { ch := make(chan string, 1); go func() { time.Sleep(time.Duration(delayMs) * time.Millisecond); ch <- team + \" responding\" }(); return ch }`.",
    "hail doesn't wait. it sets up the pipe, sends a goroutine off to answer into it, and hands the pipe back.",
  ],

  deflections: ["not now. one team, one channel.", "later. i need a way to hear them first."],
};

// Chapter 09: Step 2 — First contact
const ch09FirstBank: StepBank = {
  intro:
    "all three teams are hailed at once. i go with whoever answers first and i don't wait on the slow ones. write `firstResponder(alpha, bravo, charlie)` — listen on all three with `select` and return the first message that lands.",

  conceptFAQ: [
    {
      keywords: ["tie", "same time", "both ready", "random"],
      response:
        "if two cases are ready at the same instant, select picks one at random. no favorites, on purpose — so no channel can starve the others.",
    },
    {
      keywords: ["default"],
      response:
        "hold off on default. it makes select stop waiting — if nobody's answered at that exact instant, you get nothing. the next step needs it. this one has to wait.",
    },
    {
      keywords: ["select"],
      response:
        "select is a switch for channels. it waits until one of its cases can go, runs that one, and ignores the rest.",
    },
    {
      keywords: ["in turn", "one by one", "sequential", "why not just receive"],
      response:
        "`<-alpha` first would wait for alpha even though bravo answered sooner. select listens to all three at once.",
    },
    {
      keywords: ["losers", "other teams", "slow ones", "leak"],
      response:
        "they still answer — into their one-message buffers from hail, where the reply just sits. nobody is left stuck sending. that's why the 1 mattered.",
    },
    {
      keywords: ["case", "syntax", "msg :="],
      response: "one case per team: `case msg := <-alpha: return msg`. the receive happens only for the case that wins.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "start"],
      response:
        "`func firstResponder(alpha, bravo, charlie chan string) string { select { case msg := <-alpha: return msg ... } }` — three cases, each returns its message.",
    },
  ],

  codePatterns: [
    {
      match: (code) => {
        const body = goFuncBody(code, "firstResponder");
        return body !== null && !/\bselect\s*\{/.test(body) && /<-\s*\w+/.test(body);
      },
      response:
        "you're waiting on one team before the others. bravo answered first and you weren't listening to bravo yet. listen to all three at once — `select { case msg := <-alpha: ... }`.",
    },
    {
      match: (code) => {
        const body = goFuncBody(code, "firstResponder");
        return body !== null && /\bdefault\s*:/.test(body);
      },
      response:
        "default makes select give up at once — nobody has answered at that instant, so you get nothing. drop it. this select has to wait for the first voice.",
    },
    {
      match: (code) => {
        const body = goFuncBody(code, "firstResponder");
        return body !== null && /\bselect\s*\{/.test(body) && (body.match(/\bcase\b[^\n]*<-/g) ?? []).length < 3;
      },
      response: "one case per team — three cases. a team without a case is a team you can't hear.",
    },
    {
      match: (code) => {
        const body = goFuncBody(code, "firstResponder");
        return body !== null && /\bselect\s*\{/.test(body) && (body.match(/\bcase\b[^\n]*<-/g) ?? []).length >= 3 && /\breturn\b/.test(body);
      },
      response:
        "bravo. first voice on the air, and the other two never held us up. dock 4. we have somewhere to run to.\n\n||COMPLETE||",
    },
    {
      match: (code) => goFuncBody(code, "firstResponder") === null,
      response: "write `func firstResponder(alpha, bravo, charlie chan string) string` above main.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => /first contact: (Alpha|Charlie) responding/.test(output),
      response:
        "you waited on a slower team. bravo answers at 100ms, but you were still listening to someone else. select listens to all three at once.",
    },
    {
      match: (output) => /first contact:\s*$/m.test(output),
      response: "empty — select took a default before anyone answered. drop the default so it waits for the first team.",
    },
  ],

  correctResponse:
    "bravo. first voice on the air, and the other two never held us up. dock 4. we have somewhere to run to.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. the terminal wants `hailing all teams...` then `first contact: Bravo responding`.",
    "one select, three cases, each returns its message. whichever channel has a value first wins.",
  ],

  rushDialogue: ["frequencies are degrading. one select, three cases.", "now. whoever answers first."],

  stuckResponses: [
    "`select { case msg := <-alpha: return msg; case msg := <-bravo: return msg; case msg := <-charlie: return msg }` — one case per line.",
    "a select blocks until any one case can go. it doesn't care about order, only about who's ready.",
  ],

  deflections: ["not now. three teams, one answer.", "later. who answers first is all that matters."],
};

// Chapter 09: Step 3 — Timeout
const ch09TimeoutBank: StepBank = {
  intro:
    "if every frequency is jammed i can't stand in a stairwell forever. write `awaitContact` — step 2's select plus a `time.After` case that gives up with `NO CONTACT` — and `sweep`, which glances at one channel and never waits: a `default` case returns `channel silent`.",

  conceptFAQ: [
    {
      keywords: ["time.after", "after", "timeout"],
      response:
        "`time.After(d)` returns a channel that delivers one value after `d`. as a fourth case, the teams race the clock — whichever fires first wins.",
    },
    {
      keywords: ["duration", "timeoutms", "milliseconds", "mismatched types"],
      response: "`time.Duration(timeoutMs) * time.Millisecond` — convert the int, then scale it. build it from the parameter, never a fixed number.",
    },
    {
      keywords: ["default"],
      response:
        "default runs when no other case is ready right now. with a default, the select never waits — check and keep moving.",
    },
    {
      keywords: ["which one", "timeout or default", "difference"],
      response:
        "timeout means wait, but not past the deadline. default means don't wait at all. awaitContact waits. sweep only glances.",
    },
    {
      keywords: ["sleep", "time.sleep"],
      response:
        "a sleep always waits the whole time, even if bravo answered in the first second. `time.After` races — the answer wins the moment it lands.",
    },
    {
      keywords: ["deadlock", "asleep", "all goroutines", "hang", "hangs"],
      response:
        "sweep without a default blocks on a channel nobody will ever send to — and go stops the program. the default is what makes the glance safe.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start", "start"],
      response:
        "awaitContact: your three cases plus `case <-time.After(time.Duration(timeoutMs) * time.Millisecond): return \"NO CONTACT\"`. sweep: `select { case msg := <-ch: return msg; default: return \"channel silent\" }`.",
    },
  ],

  codePatterns: [
    {
      match: (code) => {
        const p = lastIntParam(code, "awaitContact");
        return !!p && new RegExp(`time\\.After\\(\\s*${p}\\s*\\)`).test(stripGoComments(code));
      },
      response:
        "`time.After` wants a Duration, not a bare int. `time.After(time.Duration(timeoutMs) * time.Millisecond)`.",
    },
    {
      match: (code) => {
        const body = goFuncBody(code, "awaitContact");
        const p = lastIntParam(code, "awaitContact");
        const after = body ? /time\.After\(([^\n]*)\)/.exec(body) : null;
        return !!after && !!p && !new RegExp(`\\b${p}\\b`).test(after[1]);
      },
      response:
        "the deadline is fixed in your code, but the terminal passes a different one each time. build it from the parameter: `time.Duration(timeoutMs) * time.Millisecond`.",
    },
    {
      match: (code) => {
        const body = goFuncBody(code, "awaitContact");
        return body !== null && /\bdefault\s*:/.test(body);
      },
      response:
        "awaitContact has a default, so it gives up the instant it looks — before any team can answer. drop it. awaitContact waits until the deadline. only sweep glances.",
    },
    {
      match: (code) => {
        const body = goFuncBody(code, "awaitContact");
        return body !== null && /time\.Sleep/.test(body);
      },
      response:
        "a sleep waits the full time even when bravo answered early. race the clock instead — a `case <-time.After(...)` inside the select.",
    },
    {
      match: (code) => {
        const body = goFuncBody(code, "sweep");
        return body !== null && !/\bdefault\s*:/.test(body);
      },
      response:
        "sweep has no default, so on a silent channel it blocks forever — and go stops the program. add `default: return \"channel silent\"` to its select.",
    },
    {
      match: (code) => {
        const body = goFuncBody(code, "sweep");
        return body !== null && /time\.(Sleep|After)/.test(body);
      },
      response:
        "sweep doesn't wait at all — no sleep, no timer. a select with the receive and a `default`, and that's it.",
    },
    {
      match: (code) => {
        const a = goFuncBody(code, "awaitContact");
        const s = goFuncBody(code, "sweep");
        return a !== null && s !== null && /\bselect\b/.test(a) && /time\.After\(/.test(a) && /\bselect\b/.test(s) && /\bdefault\s*:/.test(s);
      },
      response:
        "bravo answers inside the window, the jammed line gives up on time, and the sweep never stops to stare. dock 4, forty minutes. extraction is locked.\n\n||COMPLETE||",
    },
    {
      match: (code) => goFuncBody(code, "awaitContact") === null,
      response:
        "write `func awaitContact(alpha, bravo, charlie chan string, timeoutMs int) string` — your select plus a deadline.",
    },
    {
      match: (code) => goFuncBody(code, "sweep") === null,
      response: "now `func sweep(ch chan string) string` — one receive case and a `default`.",
    },
    {
      match: () => true,
      response:
        "awaitContact needs a fourth case: `case <-time.After(time.Duration(timeoutMs) * time.Millisecond): return \"NO CONTACT\"`.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => output.trim().startsWith("contact: NO CONTACT"),
      response:
        "you gave up on bravo before bravo could answer. awaitContact has to wait until the deadline it's given — no default, and the timeout built from timeoutMs.",
    },
    {
      match: (output) => (output.match(/sweep: channel silent/g) ?? []).length >= 2,
      response:
        "the first sweep had a message waiting and still came back silent. the receive has to be a case in the same select as default — `case msg := <-ch: return msg`. select only takes default when no case is ready.",
    },
    {
      match: (output) => output.includes("NO CONTACT") === false && output.includes("contact:"),
      response:
        "the jammed line never timed out. add `case <-time.After(time.Duration(timeoutMs) * time.Millisecond): return \"NO CONTACT\"`.",
    },
  ],

  correctResponse:
    "bravo answers inside the window, the jammed line gives up on time, and the sweep never stops to stare. dock 4, forty minutes. extraction is locked.\n\n||COMPLETE||",

  genericWrong: [
    "not matching. a team that answers in time comes back as `contact: <reply>`, a jammed line as `contact: NO CONTACT`, and sweep says `channel silent` only when nothing's waiting.",
    "two functions. awaitContact waits, but only until the deadline. sweep never waits.",
  ],

  rushDialogue: ["window's closing. time.After in one, default in the other.", "now. never wait forever."],

  stuckResponses: [
    "awaitContact: `select { case msg := <-alpha: return msg; case msg := <-bravo: return msg; case msg := <-charlie: return msg; case <-time.After(time.Duration(timeoutMs) * time.Millisecond): return \"NO CONTACT\" }`.",
    "sweep: `select { case msg := <-ch: return msg; default: return \"channel silent\" }`. default is the don't-wait case.",
  ],

  deflections: ["not now. the extraction window is closing.", "later. a deadline first, then we talk."],
};

// ── Registry ──

// Go is the original realization. Other languages author their own banks under
// the same step ids (see ./banks/*).
const GO_BANKS: Record<string, StepBank> = {
  "chapter-01:scaffold": ch01ScaffoldBank,
  "chapter-01:location": ch01LocationBank,
  "chapter-02:scaffold": ch02ScaffoldBank,
  "chapter-02:loop": ch02LoopBank,
  "chapter-02:classify": ch02ClassifyBank,
  "chapter-02:rewrite": ch02RewriteBank,
  "chapter-03:scaffold": ch03ScaffoldBank,
  "chapter-03:sumfunc": ch03SumBank,
  "chapter-03:validate": ch03ValidateBank,
  "chapter-04:scaffold": ch04ScaffoldBank,
  "chapter-04:guardmap": ch04GuardmapBank,
  "chapter-04:clearfloors": ch04ClearfloorsBank,
  "chapter-04.2:scaffold": ch04_2ScaffoldBank,
  "chapter-04.2:reverseword": ch04_2ReversewordBank,
  "chapter-04.2:encode": ch04_2EncodeBank,
  "chapter-04.2:relayheader": ch04_2RelayheaderBank,
  "boss-01:scaffold": boss01ScaffoldBank,
  "boss-01:predict": boss01PredictBank,
  "chapter-07:scaffold": ch07ScaffoldBank,
  "chapter-07:scan": ch07ScanBank,
  "chapter-07:recover": ch07RecoverBank,
  "chapter-08:scaffold": ch08ScaffoldBank,
  "chapter-08:goroutine": ch08GoroutineBank,
  "chapter-08:fanout": ch08FanoutBank,
  "chapter-08:window": ch08WindowBank,
  "chapter-09:scaffold": ch09ScaffoldBank,
  "chapter-09:hail": ch09HailBank,
  "chapter-09:first": ch09FirstBank,
  "chapter-09:timeout": ch09TimeoutBank,
};

const BANKS: Record<LanguageId, Record<string, StepBank>> = {
  go: GO_BANKS,
  javascript: JAVASCRIPT_BANKS,
  python: PYTHON_BANKS,
  rust: RUST_BANKS,
};

/** Maya's answer bank for one step, in the language being taught. */
export function getStepBank(stepId: string, language: LanguageId = "go"): StepBank | undefined {
  return BANKS[language]?.[stepId];
}

// ── Sync Engine (chat + offline fallback) ──

export function callMayaEngine(
  stepId: string,
  userMessage: string,
  isCode: boolean,
  isFirstMessage: boolean,
  inRush: boolean,
  attempts: number,
  language: LanguageId = "go"
): MayaResponse {
  const bank = getStepBank(stepId, language);
  if (!bank) {
    return {
      reply: "...signal lost. no data for this sector.",
      isComplete: false,
    };
  }

  if (isFirstMessage && !isCode) {
    return { reply: bank.intro, isComplete: false };
  }

  if (isCode) {
    return evaluateCodeLocal(bank, userMessage, inRush, attempts, getLanguageService(language));
  }

  return handleChat(bank, userMessage, inRush);
}

// ── Async Engine (code submission with real compilation) ──

export interface StepTestConfig {
  testHarness?: string;
  expectedOutput?: string;
  requiredCode?: string[];
  compileModule?: CompileModule;
}

export async function callMayaEngineAsync(
  stepId: string,
  userMessage: string,
  isCode: boolean,
  isFirstMessage: boolean,
  inRush: boolean,
  attempts: number,
  stepTest?: StepTestConfig,
  language: LanguageId = "go"
): Promise<MayaResponse> {
  // Chat messages don't need compilation
  if (!isCode) {
    return callMayaEngine(stepId, userMessage, isCode, isFirstMessage, inRush, attempts, language);
  }

  const bank = getStepBank(stepId, language);
  if (!bank) {
    return { reply: "...signal lost. no data for this sector.", isComplete: false };
  }
  const lang = getLanguageService(language);

  // The three checks a player can see: it runs, it uses what it must, and its
  // output is right. Each return below reports them alongside Maya's reply.
  const required = stepTest?.requiredCode ?? [];
  const uses = required.length > 0 ? usesCheck(required, lang.codeForRequiredCheck(userMessage)) : null;
  const outputLabel = stepTest?.expectedOutput
    ? stepTest.testHarness ? CHECK_LABELS.harness : CHECK_LABELS.output
    : CHECK_LABELS.verdict;
  const checks = (runs: MissionCheck, output: MissionCheck["status"], outputDetail?: string): MissionCheck[] => [
    runs,
    ...(uses ? [uses] : []),
    {
      id: "output",
      label: outputLabel,
      status: output,
      ...(output === "fail" && outputDetail ? { detail: outputDetail } : {}),
    },
  ];
  const runsOk: MissionCheck = { id: "runs", label: CHECK_LABELS.runs, status: "pass" };
  const runsFail = (detail: string): MissionCheck => ({ id: "runs", label: CHECK_LABELS.runs, status: "fail", detail });

  // 1. Local diagnostics first (instant)
  const diagnostics = lang.diagnose(userMessage);
  const localErrors = diagnostics.filter((d) => d.severity === "error");
  if (localErrors.length > 0) {
    const first = localErrors[0];
    const prefix = inRush ? "no time for bugs. " : "";
    return {
      reply: `${prefix}line ${first.line}: ${first.message}`,
      isComplete: false,
      report: buildReport(checks(runsFail(`line ${first.line}: ${first.message}`), "pending")),
    };
  }

  // 2–3. Run it. The language injects the test harness and bundles any shipped
  // module its own way (Go swaps func main + builds a txtar module).
  const run = await lang.run({
    code: userMessage,
    harness: stepTest?.testHarness,
    module: stepTest?.compileModule,
  });

  // 4. Offline fallback → use local pattern matching
  if (run.status === "offline") {
    const local = evaluateCodeLocal(bank, userMessage, inRush, attempts, lang);
    return {
      ...local,
      report: buildReport(
        checks({ id: "runs", label: CHECK_LABELS.runs, status: "pending" }, "pending"),
        { offline: true },
      ),
    };
  }

  // 5. Compile/runtime errors → Maya reports them
  if (run.status === "error") {
    const reply = lang.explainError(run.error, inRush);
    return { reply, isComplete: false, report: buildReport(checks(runsFail(reply), "pending")) };
  }

  // 5b. Analyzer warnings (code runs but has issues like Println with format verbs)
  if (run.warning) {
    const reply = lang.explainWarning(run.warning, inRush);
    return { reply, isComplete: false, report: buildReport(checks(runsFail(reply), "pending"), { actual: run.stdout }) };
  }

  // 6. Test harness — output comparison (the scalable path)
  if (stepTest?.expectedOutput) {
    const diff = diffOutput(stepTest.expectedOutput, run.stdout);
    const report = buildReport(
      checks(runsOk, diff ? "fail" : "pass", diff?.note),
      { actual: run.stdout, ...(diff ? { diff } : {}) },
    );
    if (!diff) {
      // Check requiredCode — prevent hardcoding the answer
      if (uses?.status === "fail") {
        const missing = required.find((pat) => !lang.codeForRequiredCheck(userMessage).includes(pat));
        return {
          reply: `output is correct but you're not using the right approach. your code must include \`${missing}\`.`,
          isComplete: false,
          report,
        };
      }
      const reply = bank.correctResponse.replace("||COMPLETE||", "").trim();
      return { reply, isComplete: true, report };
    }
    // Output didn't match — use outputPatterns for targeted feedback, then a
    // concrete diff so the player can see exactly what's off.
    return { ...evaluateWrongOutput(bank, run.stdout, inRush, stepTest.expectedOutput), report };
  }

  // Steps graded by Maya's patterns have no fixed expected string: the third
  // check is her verdict on what the program printed / how it's written.
  const verdict = (res: MayaResponse): MayaResponse => ({
    ...res,
    report: buildReport(checks(runsOk, res.isComplete ? "pass" : "fail", res.reply), { actual: run.stdout }),
  });

  // 7. Output pattern matching (for steps without test harness)
  if (bank.outputPatterns) {
    for (const pattern of bank.outputPatterns) {
      if (pattern.match(run.stdout)) {
        const isComplete = pattern.response.includes("||COMPLETE||");
        const reply = pattern.response.replace("||COMPLETE||", "").trim();
        return verdict({ reply, isComplete });
      }
    }
  }

  // 9. Fall back to code pattern matching
  return verdict(evaluateCodePatterns(bank, userMessage, inRush, attempts));
}

// ── Wrong output feedback ──

function evaluateWrongOutput(bank: StepBank, output: string, inRush: boolean, expected?: string): MayaResponse {
  if (bank.outputPatterns) {
    for (const pattern of bank.outputPatterns) {
      if (pattern.match(output)) {
        return { reply: pattern.response, isComplete: false };
      }
    }
  }
  // When we know the exact target, show the player what they printed vs what's
  // needed — a concrete diff beats a vague "doesn't match".
  if (expected) {
    const got = output.trim();
    const want = expected.trim();
    const reply = got
      ? `almost. your terminal printed:\n\n  ${got}\n\nbut i need it to read exactly:\n\n  ${want}\n\nlook at the difference, character for character.`
      : `nothing came through. i need it to print exactly:\n\n  ${want}`;
    return { reply, isComplete: false };
  }
  let reply = pickRandom(bank.genericWrong);
  if (inRush && bank.rushDialogue.length > 0) {
    reply += "\n\n" + pickRandom(bank.rushDialogue);
  }
  return { reply, isComplete: false };
}

// ── Local Code Evaluation (sync, offline) ──

function evaluateCodeLocal(
  bank: StepBank,
  code: string,
  inRush: boolean,
  attempts: number,
  lang: LanguageService
): MayaResponse {
  // Run diagnostics first — catch syntax errors before pattern matching
  const diagnostics = lang.diagnose(code);
  const errors = diagnostics.filter((d) => d.severity === "error");

  if (errors.length > 0) {
    const first = errors[0];
    const prefix = inRush ? "no time for bugs. " : "";
    const reply = `${prefix}line ${first.line}: ${first.message}`;
    return { reply, isComplete: false };
  }

  return evaluateCodePatterns(bank, code, inRush, attempts);
}

// ── Code Pattern Matching ──

function evaluateCodePatterns(
  bank: StepBank,
  code: string,
  inRush: boolean,
  attempts: number
): MayaResponse {
  for (const pattern of bank.codePatterns) {
    if (pattern.match(code)) {
      const isComplete = pattern.response.includes("||COMPLETE||");
      const reply = pattern.response.replace("||COMPLETE||", "").trim();
      return { reply, isComplete };
    }
  }

  let reply = pickRandom(bank.genericWrong);
  if (inRush && bank.rushDialogue.length > 0) {
    reply += "\n\n" + pickRandom(bank.rushDialogue);
  }
  if (attempts >= 3 && bank.stuckResponses.length > 0) {
    reply += "\n\n" + pickRandom(bank.stuckResponses);
  }

  return { reply, isComplete: false };
}

function handleChat(
  bank: StepBank,
  message: string,
  inRush: boolean
): MayaResponse {
  const lower = message.toLowerCase();

  if (matchesAny(lower, ["hint", "help", "stuck", "don't know", "dont know", "no idea", "confused", "lost"])) {
    return {
      reply: bank.stuckResponses.length > 0
        ? pickRandom(bank.stuckResponses)
        : pickRandom(bank.deflections),
      isComplete: false,
    };
  }

  for (const entry of bank.conceptFAQ) {
    if (matchesAny(lower, entry.keywords)) {
      let reply = entry.response;
      if (inRush) {
        reply += "\n\nnow hurry.";
      }
      return { reply, isComplete: false };
    }
  }

  if (matchesAny(lower, ["ok", "okay", "got it", "thanks", "thank you", "cool", "right", "sure", "yes", "yeah", "yep"])) {
    const acks = [
      "good. get to it.",
      "go.",
      "show me the code.",
      "waiting on you.",
      "the terminal's ready.",
    ];
    return { reply: pickRandom(acks), isComplete: false };
  }

  if (matchesAny(lower, ["hello", "hi", "hey", "yo", "sup", "what's up"])) {
    const greetings = [
      "no time for pleasantries. check the mission brief.",
      "hey. focus. read the brief and write the code.",
      "you're here. good. now get to work — the brief has what you need.",
    ];
    return { reply: pickRandom(greetings), isComplete: false };
  }

  if (matchesAny(lower, ["who are you", "who r u", "your name", "maya", "tell me about"])) {
    return {
      reply: "maya chen. CS grad student. kidnapped 3 days ago. that's all you need to know right now. focus on the code.",
      isComplete: false,
    };
  }

  if (matchesAny(lower, ["where are", "location", "where is", "cell"])) {
    return {
      reply: "cell B-09, sublevel 3. some kind of underground facility. just get me out.",
      isComplete: false,
    };
  }

  return {
    reply: bank.deflections.length > 0
      ? pickRandom(bank.deflections)
      : "focus on the current step.",
    isComplete: false,
  };
}
