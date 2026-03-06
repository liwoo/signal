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
        "three parts: `package main` at the top, `import \"fmt\"` for later, `func main() { }` for the entry point.",
    },
  ],

  codePatterns: [
    {
      match: (code) => {
        const hasPackage = /^\s*package\s+main\b/m.test(code);
        const hasImport = /import\s+["(]/.test(code) || /import\s+"fmt"/.test(code);
        const hasMain = /func\s+main\s*\(\s*\)\s*\{/.test(code);
        return hasPackage && hasImport && hasMain;
      },
      response:
        "structure checks out. package, import, main — the terminal accepted it.\n\nnow i need you to actually print something.\n\n||COMPLETE||",
    },
    {
      match: (code) => !(/package\s+main/.test(code)),
      response:
        "the terminal rejected it. every go file starts with `package main`. first line.",
    },
    {
      match: (code) =>
        /package\s+main/.test(code) && !(/import/.test(code)),
      response:
        "package is good. but you need `import \"fmt\"` — we'll need print functions next.",
    },
    {
      match: (code) =>
        /package\s+main/.test(code) &&
        /import/.test(code) &&
        !(/func\s+main/.test(code)),
      response:
        "package and import are set. now add `func main() { }` — the entry point.",
    },
  ],

  correctResponse:
    "structure checks out. package, import, main — the terminal accepted it.\n\nnow i need you to actually print something.\n\n||COMPLETE||",

  genericWrong: [
    "the terminal can't parse that. i need: package main, import, func main().",
    "not a valid go program. start with `package main` on the first line.",
    "missing pieces. a go program needs package, import, and func main().",
  ],

  rushDialogue: [
    "the signal's degrading. just get the skeleton in. package, import, main.",
    "hurry — three lines is all i need. package main, import fmt, func main.",
    "losing you. scaffold. now.",
  ],

  stuckResponses: [
    "three things, in order:\n1. `package main`\n2. `import \"fmt\"`\n3. `func main() { }`",
    "every go program has the same shape. package at top, imports, then func main. that's it.",
    "just write `package main` then `import \"fmt\"` then `func main() { }`. submit that.",
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

// Chapter 02: Step 1 — Loop
const ch02LoopBank: StepBank = {
  intro:
    "good, you're still here.\n\nthe keypad on my door cycles codes 1 through 10. first step — write a loop that prints each number. we'll classify them next.",

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
  ],

  outputPatterns: [
    {
      match: (output) => {
        const lines = output.trim().split("\n").map((l) => l.trim());
        const hasAll = Array.from({ length: 10 }, (_, i) => String(i + 1))
          .every((n) => lines.some((l) => l.includes(n)));
        return hasAll && lines.length >= 10;
      },
      response:
        "loop confirmed. the keypad's cycling. now i need you to classify each code.\n\n||COMPLETE||",
    },
  ],

  codePatterns: [
    {
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
    "not right. i need a for loop that prints 1 through 10.",
    "the keypad needs all 10 numbers. check your loop bounds.",
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
    "the keypad's cycling. now modify your loop — for each code 1-10, print the action.\n\n1-3: DENY\n4-6: WARN\n7-9: GRANT\n10: OVERRIDE",

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
        "the keypad's responding. all 10 codes mapped. the door mechanism just clicked.\n\n||COMPLETE||",
    },
  ],

  codePatterns: [
    {
      match: (code) => {
        const hasLoop = /for\s+\w+\s*:=/.test(code);
        const hasBranch =
          code.includes("switch") ||
          code.includes("if") ||
          code.includes("case");
        const hasDeny = code.includes("DENY");
        const hasOverride = code.includes("OVERRIDE");
        const hasGrant = code.includes("GRANT");
        return hasLoop && hasBranch && hasDeny && hasOverride && hasGrant;
      },
      response:
        "the keypad's responding. all 10 codes mapped. the door mechanism just clicked.\n\n||COMPLETE||",
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
    "the keypad's responding. all 10 codes mapped. the door mechanism just clicked.\n\n||COMPLETE||",

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

// Chapter 03: Step 1 — Sum Function
const ch03SumBank: StepBank = {
  intro:
    "we're in the ventilation shaft. each junction has a code panel.\n\nfirst — write a function that sums any number of codes. variadic parameter. return the total.",

  conceptFAQ: [
    {
      keywords: ["function", "func", "define"],
      response:
        "`func name(params) returnType { ... }` — func keyword, name, params, return type.",
    },
    {
      keywords: ["variadic", "...", "dots", "any number"],
      response:
        "`func f(nums ...int)` — three dots mean any number of ints. inside, nums is a slice.",
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
  ],

  codePatterns: [
    {
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
    "sum works. now add validateCode — returns the sum AND whether it's valid. two return values. the junction needs both.",

  conceptFAQ: [
    {
      keywords: ["return", "multiple return", "two values"],
      response:
        "`func f() (int, bool) { return 42, true }` — both types in parens.",
    },
    {
      keywords: ["bool", "boolean", "true", "false", "valid"],
      response:
        "`total > 100` gives you a bool. return it directly.",
    },
    {
      keywords: ["call", "pass", "spread", "codes..."],
      response:
        "to pass variadic to another function: `sumCodes(codes...)` — dots spread it.",
    },
  ],

  codePatterns: [
    {
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

// ── Registry ──

const BANKS: Record<string, StepBank> = {
  "chapter-01:scaffold": ch01ScaffoldBank,
  "chapter-01:location": ch01LocationBank,
  "chapter-02:loop": ch02LoopBank,
  "chapter-02:classify": ch02ClassifyBank,
  "chapter-03:sumfunc": ch03SumBank,
  "chapter-03:validate": ch03ValidateBank,
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

export async function callMayaEngineAsync(
  stepId: string,
  userMessage: string,
  isCode: boolean,
  isFirstMessage: boolean,
  inRush: boolean,
  attempts: number
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

  // 2. Compile with Go Playground
  const compiled = await compileGo(userMessage);

  // 3. Offline fallback → use local pattern matching
  if (compiled.errors === "__OFFLINE__") {
    return evaluateCodeLocal(bank, userMessage, inRush, attempts);
  }

  // 4. Compile errors → Maya reports them
  if (!compiled.success) {
    return { reply: formatCompileError(compiled.errors, inRush), isComplete: false };
  }

  // 5. Compiled successfully — check output patterns first
  if (bank.outputPatterns) {
    for (const pattern of bank.outputPatterns) {
      if (pattern.match(compiled.output)) {
        const isComplete = pattern.response.includes("||COMPLETE||");
        const reply = pattern.response.replace("||COMPLETE||", "").trim();
        return { reply, isComplete };
      }
    }
  }

  // 6. Fall back to code pattern matching
  return evaluateCodePatterns(bank, userMessage, inRush, attempts);
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
