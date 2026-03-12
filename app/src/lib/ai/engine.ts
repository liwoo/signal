import type { Challenge } from "@/types/game";
import { diagnose } from "@/lib/go/diagnostics";
import { compileGo, type CompileResult } from "@/lib/go/playground";

// ── Types ──

export interface MayaResponse {
  reply: string;
  isComplete: boolean;
}

interface CodePattern {
  match: (code: string) => boolean;
  response: string;
}

interface OutputPattern {
  match: (output: string) => boolean;
  response: string;
}

interface ConceptEntry {
  keywords: string[];
  response: string;
}

interface StepBank {
  intro: string;
  conceptFAQ: ConceptEntry[];
  codePatterns: CodePattern[];
  outputPatterns?: OutputPattern[];
  correctResponse: string;
  genericWrong: string[];
  rushDialogue: string[];
  stuckResponses: string[];
  deflections: string[];
}

// ── Keyword Matching ──

function matchesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => {
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
    "...signal received.\n\nyou're in. i'm maya — cell B-09, sublevel 3. i hacked this maintenance terminal but the connection is fragile.\n\nfirst things first. this terminal runs go. i need you to set up a valid program — package, import, main function. just the skeleton. the terminal won't accept anything until the structure is right.",

  conceptFAQ: [
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
        "four parts: `package main` at the top, `import \"fmt\"`, `func main() { }`, and `fmt.Println(\"I'm in\")` inside main — go won't compile if you import something and don't use it.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "what next", "where do i start", "start"],
      response:
        "write the go skeleton. four lines: `package main`, `import \"fmt\"`, `func main() {`, `fmt.Println(\"I'm in\")`, then `}`. transmit it.",
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
      keywords: ["capital", "uppercase", "Println", "case sensitive"],
      response:
        "go is case-sensitive. it's `Println` with a capital P, not `println`. same for `Printf`, `Print`.",
    },
  ],

  codePatterns: [
    {
      match: (code) => isValidScaffold(code),
      response:
        "structure checks out. package, import, main — the terminal accepted it.\n\nnow i need you to actually print something.\n\n||COMPLETE||",
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
        "almost. go won't compile if you import fmt but don't use it. add `fmt.Println(\"I'm in\")` inside main.",
    },
  ],

  correctResponse:
    "structure checks out. package, import, main — the terminal accepted it.\n\nnow i need you to actually print something.\n\n||COMPLETE||",

  genericWrong: [
    "the terminal can't parse that. i need: package main, import, func main(), and use fmt inside.",
    "not a valid go program. start with `package main` on the first line.",
    "missing pieces. a go program needs package, import, func main(), and a fmt.Println inside.",
  ],

  rushDialogue: [
    "the signal's degrading. just get the skeleton in. package, import, main, println.",
    "hurry — four lines is all i need. package main, import fmt, func main, fmt.Println.",
    "losing you. scaffold. now.",
  ],

  stuckResponses: [
    "four things, in order:\n1. `package main`\n2. `import \"fmt\"`\n3. `func main() {`\n4. `fmt.Println(\"I'm in\")`\n5. `}`",
    "every go program has the same shape. package at top, imports, then func main with a print inside. go won't compile if you import something unused.",
    "just write:\n```\npackage main\nimport \"fmt\"\nfunc main() {\n  fmt.Println(\"I'm in\")\n}\n```",
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
    "good. the terminal's ready.\n\nnow i need proof you can see my location. print it. exactly.\n\nCELL B-09 · SUBLEVEL 3\n\nuse variables and constants. show me you understand the language.",

  conceptFAQ: [
    {
      keywords: ["print", "println", "output", "display", "show", "write"],
      response:
        "fmt.Println(\"your text\") — that's how you send a signal through the terminal. it's already imported.",
    },
    {
      keywords: ["variable", "var", ":=", "declare", "assign"],
      response:
        "two ways. `var name string = \"value\"` or the short form: `name := \"value\"`. the second is faster.",
    },
    {
      keywords: ["constant", "const"],
      response:
        "const name = value — locked down, can't change it after. good for things that shouldn't move.",
    },
    {
      keywords: ["string", "text", "quote", "double quote"],
      response:
        "strings go in double quotes: \"like this\". single quotes are for single characters only.",
    },
    {
      keywords: ["printf", "format", "%s", "%d", "placeholder"],
      response:
        "fmt.Printf lets you mix values in: `fmt.Printf(\"CELL %s · SUBLEVEL %d\\n\", cell, level)`. %s for strings, %d for numbers.",
    },
    {
      keywords: ["newline", "\\n", "line break"],
      response:
        "Println adds a newline automatically. Printf doesn't — add \\n at the end if you need one.",
    },
    {
      keywords: ["what do i do", "what should i do", "what now", "where do i start"],
      response:
        "print my location: CELL B-09 · SUBLEVEL 3. use variables or constants if you want, but the output needs to match.",
    },
    {
      keywords: ["dot", "·", "middle dot", "special character", "unicode"],
      response:
        "the `·` is a middle dot. you can copy it directly into your string, or skip it — i'll accept the output as long as B-09 and SUBLEVEL 3 are both there.",
    },
    {
      keywords: ["concat", "concatenat", "combine", "join", "+"],
      response:
        "go doesn't use `+` to join strings in Println. just pass multiple args: `fmt.Println(cell, \"·\", sublevel)`. or use Printf with format verbs.",
    },
    {
      keywords: ["sprint", "Sprintf"],
      response:
        "`fmt.Sprintf` builds a string without printing. `fmt.Printf` prints directly. either works — just make sure the output has B-09 and SUBLEVEL 3.",
    },
    {
      keywords: ["example", "show me", "sample", "template"],
      response:
        "here's one way:\n```\ncell := \"B-09\"\nfmt.Printf(\"CELL %s · SUBLEVEL %d\\n\", cell, 3)\n```\nbut there are many valid approaches.",
    },
  ],

  outputPatterns: [
    {
      match: (output) => {
        const lower = output.toLowerCase();
        return (
          (lower.includes("b-09") || lower.includes("b09")) &&
          (lower.includes("sublevel 3") ||
            lower.includes("sublevel  3") ||
            (lower.includes("sublevel") && lower.includes("3")))
        );
      },
      response:
        "...i see it. my cell. you actually got through.\n\n||COMPLETE||",
    },
    {
      match: (output) => {
        const lower = output.toLowerCase();
        return lower.includes("hello") && lower.includes("world");
      },
      response:
        "that's a hello world. i don't need a greeting — i need my location. CELL B-09 · SUBLEVEL 3.",
    },
    {
      match: (output) =>
        output.trim().length > 0 && !output.toLowerCase().includes("b-09") && !output.toLowerCase().includes("b09"),
      response:
        "you're printing something, but it's not my cell. i need B-09 in there.",
    },
  ],

  codePatterns: [
    {
      match: (code) => {
        const lower = code.toLowerCase();
        return (
          (lower.includes("b-09") || lower.includes("b09")) &&
          (lower.includes("sublevel 3") ||
            lower.includes("sublevel  3") ||
            (lower.includes("sublevel") && lower.includes("3")))
        );
      },
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
        "that's a hello world. i don't need a greeting — i need my location. CELL B-09 · SUBLEVEL 3.",
    },
    {
      match: (code) =>
        code.includes("Println") && !code.toLowerCase().includes("b-09"),
      response:
        "you're printing something, but it's not my cell. i need B-09 in there.",
    },
    {
      match: (code) =>
        code.includes("Println") && !code.toLowerCase().includes("sublevel"),
      response:
        "close — i see the cell but not the sublevel. i need both: CELL B-09 · SUBLEVEL 3.",
    },
  ],

  correctResponse:
    "...i see it. my cell. you actually got through.\n\n||COMPLETE||",

  genericWrong: [
    "that's not right. check the output — i need CELL B-09 · SUBLEVEL 3. exactly.",
    "almost... but the output doesn't match. look at what you're printing.",
    "wrong signal. i need my exact location: CELL B-09 · SUBLEVEL 3.",
  ],

  rushDialogue: [
    "hurry. the footsteps stopped right outside.",
    "go. now. just print the location.",
    "no time — just get it done. CELL B-09 · SUBLEVEL 3.",
  ],

  stuckResponses: [
    "you're stuck? try: fmt.Println(\"CELL B-09 · SUBLEVEL 3\")",
    "start simple. fmt.Println puts text on screen. that's all you need.",
    "don't overthink it. print my location. use fmt.Println.",
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
    "the keypad on my door runs go. same deal as before — set up the program skeleton. package, import, main function.\n\nonce the terminal recognizes the structure, we can start cracking the sequence.",

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
        "same skeleton every time: package main, import fmt, func main, and a fmt.Println inside so the import is used.",
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
        "almost. go won't compile if you import fmt but don't use it. add `fmt.Println(\"ready\")` inside main.",
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
    "same three things: `package main`, `import \"fmt\"`, `func main() { }`. that's the skeleton.",
  ],

  deflections: [
    "focus. set up the program skeleton first, then we crack the codes.",
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
    "redundancy protocol. the keypad needs the same classification written a different way.\n\nif you used switch before, rewrite it with if/else chains. if you used if/else, rewrite with switch/case.\n\nsame output. +45s on the clock if you clear it.",

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
    "we're in the ventilation shaft now. the junction panels run go — same as before.\n\nset up the program skeleton. package, import, main. the panel won't initialize without it.",

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
        "almost. go won't compile if you import fmt but don't use it. add `fmt.Println(\"ready\")` inside main.",
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
    "three things: `package main`, `import \"fmt\"`, `func main() { }`.",
  ],
  deflections: [
    "just the skeleton for now. package, import, main.",
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

// ── Registry ──

const BANKS: Record<string, StepBank> = {
  "chapter-01:scaffold": ch01ScaffoldBank,
  "chapter-01:location": ch01LocationBank,
  "chapter-02:scaffold": ch02ScaffoldBank,
  "chapter-02:loop": ch02LoopBank,
  "chapter-02:classify": ch02ClassifyBank,
  "chapter-02:rewrite": ch02RewriteBank,
  "chapter-03:scaffold": ch03ScaffoldBank,
  "chapter-03:sumfunc": ch03SumBank,
  "chapter-03:validate": ch03ValidateBank,
  "boss-01:scaffold": boss01ScaffoldBank,
  "boss-01:predict": boss01PredictBank,
};

// ── Format Compile Errors ──

function formatCompileError(errors: string, inRush: boolean): string {
  // Go compiler errors look like: ./prog.go:4:6: undefined: fmt.WriteLine
  // Strip the ./prog.go: prefix and take the first error
  const lines = errors.trim().split("\n").filter((l) => l.trim());
  if (lines.length === 0) return "the terminal rejected that. check your code.";

  const first = lines[0]
    .replace(/^\.\/prog\.go:/, "")
    .trim();

  const prefix = inRush ? "no time for bugs. " : "";
  return `${prefix}${first}`;
}

function formatVetError(vetErrors: string, inRush: boolean): string {
  // Go vet errors look like: ./prog.go:7:2: fmt.Println call has possible Printf formatting directive %s
  const lines = vetErrors.trim().split("\n").filter((l) => l.trim());
  if (lines.length === 0) return "the terminal flagged a warning. check your code.";

  const first = lines[0]
    .replace(/^\.\/prog\.go:/, "")
    .trim();

  const prefix = inRush ? "hurry — " : "";

  // Common vet: Println with format verbs → give clear Maya-style guidance
  if (first.includes("Println") && first.includes("Printf")) {
    return `${prefix}${first}\n\nyou're using format verbs like \`%s\` or \`%d\` inside \`Println\`. that's \`Printf\` territory.\n\n\`Println\` just prints its args separated by spaces. \`Printf\` interprets the format string. switch to \`fmt.Printf(...)\` and add \`\\n\` at the end.`;
  }

  return `${prefix}go vet: ${first}`;
}

// ── Sync Engine (chat + offline fallback) ──

export function callMayaEngine(
  stepId: string,
  userMessage: string,
  isCode: boolean,
  isFirstMessage: boolean,
  inRush: boolean,
  attempts: number
): MayaResponse {
  const bank = BANKS[stepId];
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
    return evaluateCodeLocal(bank, userMessage, inRush, attempts);
  }

  return handleChat(bank, userMessage, inRush);
}

// ── Async Engine (code submission with real compilation) ──

export interface StepTestConfig {
  testHarness?: string;
  expectedOutput?: string;
}

export async function callMayaEngineAsync(
  stepId: string,
  userMessage: string,
  isCode: boolean,
  isFirstMessage: boolean,
  inRush: boolean,
  attempts: number,
  stepTest?: StepTestConfig
): Promise<MayaResponse> {
  // Chat messages don't need compilation
  if (!isCode) {
    return callMayaEngine(stepId, userMessage, isCode, isFirstMessage, inRush, attempts);
  }

  const bank = BANKS[stepId];
  if (!bank) {
    return { reply: "...signal lost. no data for this sector.", isComplete: false };
  }

  // 1. Local diagnostics first (instant)
  const diagnostics = diagnose(userMessage);
  const localErrors = diagnostics.filter((d) => d.severity === "error");
  if (localErrors.length > 0) {
    const first = localErrors[0];
    const prefix = inRush ? "no time for bugs. " : "";
    return { reply: `${prefix}line ${first.line}: ${first.message}`, isComplete: false };
  }

  // 2. Build source to compile — if testHarness is provided, swap main()
  const source = stepTest?.testHarness
    ? replaceMain(userMessage, stepTest.testHarness)
    : userMessage;

  // 3. Compile with Go Playground
  const compiled = await compileGo(source);

  // 4. Offline fallback → use local pattern matching
  if (compiled.errors === "__OFFLINE__") {
    return evaluateCodeLocal(bank, userMessage, inRush, attempts);
  }

  // 5. Compile errors → Maya reports them
  if (!compiled.success) {
    return { reply: formatCompileError(compiled.errors, inRush), isComplete: false };
  }

  // 5b. Vet warnings (code compiles but has issues like Println with format verbs)
  if (compiled.vetErrors) {
    return { reply: formatVetError(compiled.vetErrors, inRush), isComplete: false };
  }

  // 6. Test harness — exact output comparison (the scalable path)
  if (stepTest?.expectedOutput) {
    if (compiled.output.trim() === stepTest.expectedOutput.trim()) {
      const reply = bank.correctResponse.replace("||COMPLETE||", "").trim();
      return { reply, isComplete: true };
    }
    // Output didn't match — use outputPatterns for targeted feedback, then generic
    return evaluateWrongOutput(bank, compiled.output, inRush);
  }

  // 7. Output pattern matching (for steps without test harness)
  if (bank.outputPatterns) {
    for (const pattern of bank.outputPatterns) {
      if (pattern.match(compiled.output)) {
        const isComplete = pattern.response.includes("||COMPLETE||");
        const reply = pattern.response.replace("||COMPLETE||", "").trim();
        return { reply, isComplete };
      }
    }
  }

  // 9. Fall back to code pattern matching
  return evaluateCodePatterns(bank, userMessage, inRush, attempts);
}

// ── Replace user's main() with test harness ──

function replaceMain(code: string, harness: string): string {
  // Remove user's func main() { ... } and replace with the harness
  // Match func main() { ... } accounting for nested braces
  const mainStart = code.search(/func\s+main\s*\(\s*\)\s*\{/);
  if (mainStart === -1) {
    // No main found — just append the harness
    return code + "\n" + harness;
  }

  // Find the matching closing brace
  const braceStart = code.indexOf("{", mainStart);
  let depth = 0;
  let braceEnd = braceStart;
  for (let i = braceStart; i < code.length; i++) {
    if (code[i] === "{") depth++;
    if (code[i] === "}") depth--;
    if (depth === 0) {
      braceEnd = i;
      break;
    }
  }

  return code.slice(0, mainStart) + harness + code.slice(braceEnd + 1);
}

// ── Wrong output feedback ──

function evaluateWrongOutput(bank: StepBank, output: string, inRush: boolean): MayaResponse {
  if (bank.outputPatterns) {
    for (const pattern of bank.outputPatterns) {
      if (pattern.match(output)) {
        return { reply: pattern.response, isComplete: false };
      }
    }
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
  attempts: number
): MayaResponse {
  // Run diagnostics first — catch syntax errors before pattern matching
  const diagnostics = diagnose(code);
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
