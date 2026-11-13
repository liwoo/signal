// ── Beginner Mode Notes ──
// Pre-level concept briefings shown to new players.
// Each challenge ID maps to an array of note blocks.
// Blocks are either "text" (prose) or "code" (Go snippet).
// Blocks with the same `section` number are revealed together.
// The player presses CONTINUE between sections.
// Code blocks can have `hotspots` — clickable regions with tooltips.
// Go notes live here; other languages' notes live in beginner-notes.<lang>.ts.

import type { LanguageId } from "@/types/game";
import { JAVASCRIPT_BEGINNER_NOTES } from "./beginner-notes.javascript";
import { PYTHON_BEGINNER_NOTES } from "./beginner-notes.python";
import { RUST_BEGINNER_NOTES } from "./beginner-notes.rust";

export interface Hotspot {
  text: string;     // exact substring in the code to highlight
  tip: string;      // tooltip shown on click
}

export interface NoteBlock {
  type: "text" | "code" | "diagram";
  content: string;
  section: number;
  hotspots?: Hotspot[]; // only for code blocks
  important?: boolean;  // renders with accent border + icon for key concepts
  diagramId?: string;   // only for diagram blocks — maps to a diagram component
}

export interface BeginnerNotes {
  title: string;
  subtitle: string;
  blocks: NoteBlock[];                // "Expert Mode" — the original text-heavy notes
  beginnerBlocks?: NoteBlock[];       // "Beginner Mode" — visual-first, analogy-driven (default when present)
  notesBlocks?: NoteBlock[];          // In-challenge quick reference — terse concept + code (used by NotesPanel when present)
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
      {
        type: "text",
        section: 1,
        content:
          "important: go won't compile if you import a package but don't use it. if you write import \"fmt\", you must use fmt somewhere (like fmt.Println). this keeps go code clean.",
      },

      // Section 2: Variables & constants
      {
        type: "text",
        section: 2,
        content: "go has two ways to declare variables. the short way uses := and lets go figure out the type. the long way uses var and lets you state the type explicitly.",
      },
      {
        type: "code",
        section: 2,
        content: `// short declaration — go infers the type
cell := "B-09"
sublevel := 3

// explicit type with var
var cell string = "B-09"
var sublevel int = 3

// var without a value — gets a zero default
var count int      // 0
var name string    // ""
var ready bool     // false`,
        hotspots: [
          { text: `:=`, tip: "short variable declaration. go infers the type from the value on the right. only works inside functions." },
          { text: "var cell string", tip: "explicit declaration — you name the type. useful when you want to be clear, or when you need a variable before you have a value for it." },
          { text: "var count int", tip: "declared without a value. go gives it the zero value for its type: 0 for int, \"\" for string, false for bool." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "both forms are valid. := is shorter and common inside functions. var is useful when you want to declare the type explicitly, or when you need a variable initialized to its zero value.",
      },
      {
        type: "code",
        section: 2,
        content: `// constant — value never changes
const sublevel = 3
const cell = "B-09"`,
        hotspots: [
          { text: "const", tip: "declares a constant — a value that can never be reassigned. evaluated at compile time, zero runtime cost." },
          { text: "sublevel = 3", tip: "an integer constant. go knows this is an int from the value. constants can't use :=." },
        ],
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
fmt.Printf("CELL %s - SUBLEVEL %d\\n", cell, sublevel)
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

    // ── Beginner Mode: visual-first, analogy-driven ──
    // Flow: Analogy card (section 0) → Animated walkthrough (section 1) → Code Recap (section 2) → Start Level
    beginnerBlocks: [
      // Section 0: The Package Card — the analogy comes first (letter → code)
      {
        type: "diagram",
        diagramId: "ch01-card",
        content: "",
        section: 0,
      },

      // Section 1: Watch the program run — step-by-step animation ("the video")
      {
        type: "diagram",
        diagramId: "ch01-animation",
        content: "",
        section: 1,
      },

      // Section 2: Recap — the full program with hotspots
      {
        type: "code",
        section: 2,
        content: `package main

import "fmt"

func main() {
    const favLang = "Go"
    name := "maya"
    fmt.Println(favLang)
    fmt.Println(name)
}`,
        hotspots: [
          { text: "package main", tip: "the package label. tells go this is a runnable program." },
          { text: `import "fmt"`, tip: "the address label. fetched from the shelf so zainab knows where to send envelopes." },
          { text: "func main()", tip: "the main envelope. go reads every instruction inside, top to bottom." },
          { text: `const favLang = "Go"`, tip: "sealed envelope. the sticker 🔤\"Go\" is locked inside forever." },
          { text: `name := "maya"`, tip: "open envelope. sticker 🔤\"maya\" inside — can be peeled off and replaced later." },
          { text: "fmt.Println(favLang)", tip: "uses the fmt address label to post favLang through the postal slot. jijo reads the sticker → output: Go" },
          { text: "fmt.Println(name)", tip: "posts name to fmt. jijo reads the sticker → output: maya" },
        ],
      },
    ],

    // ── In-challenge quick reference — terse concept + code ──
    notesBlocks: [
      { type: "text", section: 0, important: true, content: "the skeleton — every program has these three." },
      {
        type: "code",
        section: 0,
        content: `package main

import "fmt"

func main() {
}`,
      },
      { type: "text", section: 1, content: "print — show text on screen." },
      {
        type: "code",
        section: 1,
        content: `fmt.Println("hi")          // hi
fmt.Printf("%s %d\\n", s, n) // fill the blanks`,
      },
      { type: "text", section: 2, content: "store a value." },
      {
        type: "code",
        section: 2,
        content: `name := "maya"   // infers type, can change
var n int = 3    // explicit type
const k = 10     // never changes`,
      },
    ],
  },

  "chapter-02": {
    title: "LOOPS & BRANCHES",
    subtitle: "CONTROLLING THE FLOW",
    blocks: [
      // Section 0: Scaffold recap
      {
        type: "text",
        section: 0,
        content:
          "every go program starts the same way. you've seen this before — package, import, main. this time the keypad needs a loop inside main. but first, set up the skeleton.",
      },
      {
        type: "code",
        section: 0,
        content: `package main

import "fmt"

func main() {
    // your loop goes here
}`,
        hotspots: [
          { text: "package main", tip: "every go executable starts with this. the keypad terminal needs it." },
          { text: `import "fmt"`, tip: "brings in the fmt package for printing. you'll print code classifications." },
          { text: "func main()", tip: "entry point. the keypad loop goes inside here." },
        ],
      },

      // Section 1: The for loop
      {
        type: "text",
        section: 1,
        content:
          "go has exactly one loop keyword: for. no while, no do-while, no foreach. just for. it handles everything.",
      },
      {
        type: "code",
        section: 1,
        content: `for i := 1; i <= 10; i++ {
    fmt.Println(i)
}`,
        hotspots: [
          { text: "i := 1", tip: "init statement — runs once before the loop starts. declares i and sets it to 1." },
          { text: "i <= 10", tip: "condition — checked before every iteration. loop continues while this is true." },
          { text: "i++", tip: "post statement — runs after every iteration. increments i by 1. go only has i++, never ++i." },
          { text: "fmt.Println(i)", tip: "prints the current value of i. runs once per iteration." },
        ],
      },

      // Section 1 continued: Loop anatomy
      {
        type: "text",
        section: 1,
        content:
          "the for loop has three parts separated by semicolons: init (runs once), condition (checked each time), and post (runs after each iteration). all three are optional.",
      },
      {
        type: "text",
        section: 1,
        content:
          "i++ is a statement in go, not an expression. you can't write x = i++ like in C. this prevents a whole class of bugs. one way to increment. simple.",
      },

      // Section 2: Const groups
      {
        type: "text",
        section: 2,
        content:
          "when you have several related constants — like keypad labels — group them in a const block outside main. this makes intent visible and changes safe. one place to update, no magic strings scattered through your switch.",
      },
      {
        type: "code",
        section: 2,
        content: `const (
    deny     = "DENY"
    warn     = "WARN"
    grant    = "GRANT"
    override = "OVERRIDE"
)

func main() {
    // use the named constants in your code
    fmt.Println(deny)  // not "DENY" as a raw string
}`,
        hotspots: [
          { text: "const (", tip: "grouped constant declaration with parentheses. keeps related values together — same pattern as grouped imports." },
          { text: `deny     = "DENY"`, tip: "each constant gets a name. now \"DENY\" lives in one place. if the label changes, you change it once." },
          { text: "fmt.Println(deny)", tip: "use the constant name, not the raw string. the name carries meaning — anyone reading the code knows this is intentional." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "const blocks live outside main, at the package level. this is a go pattern you'll see everywhere — naming your domain values makes code self-documenting.",
      },

      // Section 3: if/else and switch
      {
        type: "text",
        section: 3,
        content: "branching — choosing different paths based on conditions. the keypad classifies codes into access levels:\n\ncodes 1-3 → DENY (restricted)\ncodes 4-6 → WARN (caution)\ncodes 7-9 → GRANT (cleared)\ncode 10 → OVERRIDE (master key)\n\nyou can use either if/else or switch — both work:",
      },
      {
        type: "code",
        section: 3,
        content: `// if/else approach
if i <= 3 {
    fmt.Println(i, "DENY")
} else if i <= 6 {
    fmt.Println(i, "WARN")
} else if i <= 9 {
    fmt.Println(i, "GRANT")
} else {
    fmt.Println(i, "OVERRIDE")
}`,
        hotspots: [
          { text: "if i <= 3", tip: "no parentheses around the condition — go doesn't use them. braces are required." },
          { text: "} else if i <= 6", tip: "else must be on the same line as the closing brace. go enforces this. checks 4-6 (since <= 3 was already caught)." },
          { text: "} else if i <= 9", tip: "checks 7-9. each condition only catches what previous ones didn't." },
          { text: "} else {", tip: "the final else catches everything remaining — code 10 (OVERRIDE)." },
        ],
      },
      {
        type: "code",
        section: 3,
        content: `// switch approach — cleaner for multiple ranges
switch {
case i <= 3:
    fmt.Println(i, "DENY")
case i <= 6:
    fmt.Println(i, "WARN")
case i <= 9:
    fmt.Println(i, "GRANT")
default:
    fmt.Println(i, "OVERRIDE")
}`,
        hotspots: [
          { text: "switch {", tip: "switch with no variable — each case is an independent boolean condition. replaces long if/else chains." },
          { text: "case i <= 3:", tip: "first true case wins. if i is 1, 2, or 3 this matches." },
          { text: "case i <= 6:", tip: "only reached if i > 3. catches 4, 5, 6." },
          { text: "case i <= 9:", tip: "only reached if i > 6. catches 7, 8, 9." },
          { text: "default:", tip: "runs if no case matches — code 10 gets OVERRIDE." },
        ],
      },

      // Section 4: Switch zen — no break needed
      {
        type: "text",
        section: 4,
        content:
          "if you use switch: go's switch doesn't fall through by default — no need for break statements. each case exits automatically. if you want fallthrough, you have to say it explicitly. coming from C or Java, this might surprise you.",
      },
      {
        type: "text",
        section: 4,
        content:
          "both if/else and switch are valid go. pick whichever reads clearest to you. the expected output is:\n\n1 DENY, 2 DENY, 3 DENY, 4 WARN, 5 WARN, 6 WARN, 7 GRANT, 8 GRANT, 9 GRANT, 10 OVERRIDE",
      },
    ],

    // ── Beginner Mode: visual-first, analogy-driven ──
    // Flow: Analogy Card (section 0) → Walkthrough Video (section 1) → Code Recap (section 2) → Start Level
    beginnerBlocks: [
      // Section 0: The interactive card — sealed folder + revolving door + sorting station
      {
        type: "diagram",
        diagramId: "ch02-card",
        content: "",
        section: 0,
      },

      // Section 1: Watch the keypad programme run — the door code video
      {
        type: "diagram",
        diagramId: "ch02-animation",
        content: "",
        section: 1,
      },

      // Section 2: Code recap with hotspots
      {
        type: "code",
        section: 2,
        content: `package main

import "fmt"

const (
    deny     = "DENY"
    warn     = "WARN"
    grant    = "GRANT"
    override = "OVERRIDE"
)

func main() {
    for i := 1; i <= 10; i++ {
        switch {
        case i <= 3:
            fmt.Println(i, deny)
        case i <= 6:
            fmt.Println(i, warn)
        case i <= 9:
            fmt.Println(i, grant)
        default:
            fmt.Println(i, override)
        }
    }
}`,
        hotspots: [
          { text: "const (", tip: "opens the sealed folder. all name tags inside are locked forever. grouped constants — same pattern as grouped imports." },
          { text: `deny     = "DENY"`, tip: "a name tag in the folder. use 'deny' in code instead of the raw string \"DENY\". one place to change it." },
          { text: "for i := 1; i <= 10; i++", tip: "the revolving door. counter starts at 1, spins while i ≤ 10, ticks up each time. the worker passes through once per spin." },
          { text: "switch {", tip: "the sorting station. no variable after switch — each case is a standalone condition. checks top to bottom, first true wins." },
          { text: "case i <= 3:", tip: "first sorting lane. codes 1-3 get routed here → DENY." },
          { text: "case i <= 6:", tip: "second lane. only reached if i > 3. codes 4-6 → WARN." },
          { text: "default:", tip: "the catch-all lane. if no case matched → OVERRIDE. like else in if/else." },
        ],
      },
    ],
  },

  "chapter-03": {
    title: "FUNCTIONS",
    subtitle: "BUILDING BLOCKS",
    blocks: [
      // Section 0: Scaffold recap + function intro
      {
        type: "text",
        section: 0,
        content:
          "every go program starts with the same skeleton. you know this now — package, import, main. this time you'll add functions above main. scaffold first, then build.",
      },
      {
        type: "code",
        section: 0,
        content: `package main

import "fmt"

func main() {
    fmt.Println("ready")
}`,
        hotspots: [
          { text: "package main", tip: "every go executable starts with this. the shaft panel needs it." },
          { text: `import "fmt"`, tip: "one package, one plain import line — that's how gofmt writes it. the grouped `import ( ... )` form is for when you import two or more packages." },
          { text: "func main()", tip: "entry point. your functions go above this, and you call them from inside." },
        ],
      },

      // Section 1: Slices — the foundation for everything in this level
      {
        type: "text",
        section: 1,
        content:
          "before we get to functions, you need to know about slices. a slice is go's way of holding a list of values — like an array, but flexible. you'll see them written as []int (a list of ints) or []string (a list of strings).",
      },
      {
        type: "code",
        section: 1,
        content: `// a slice of ints
codes := []int{25, 30, 50, 10}

// how many elements?
fmt.Println(len(codes)) // 4

// access by index (starts at 0)
fmt.Println(codes[0]) // 25
fmt.Println(codes[3]) // 10

// loop through every element
for i, c := range codes {
    fmt.Println(i, c)
}`,
        hotspots: [
          { text: "[]int{25, 30, 50, 10}", tip: "[]int means \"slice of ints\". the curly braces hold the initial values. slices can grow and shrink — they're not fixed-size like arrays." },
          { text: "len(codes)", tip: "built-in function that returns the number of elements. works on slices, strings, and maps." },
          { text: "codes[0]", tip: "indexing starts at 0. codes[0] is the first element, codes[3] is the fourth." },
          { text: "for i, c := range codes", tip: "range walks through the slice. i is the index (0, 1, 2...), c is the value at that index. this is the go way to iterate." },
        ],
      },
      {
        type: "text",
        section: 1,
        content:
          "when you don't need the index, use _ to discard it. go won't let you declare a variable you don't use — _ is how you say \"i don't need this one.\"",
      },
      {
        type: "code",
        section: 1,
        content: `// discard the index with _
for _, c := range codes {
    fmt.Println(c)
}`,
        hotspots: [
          { text: "_", tip: "the blank identifier. go requires every variable to be used. _ tells the compiler \"i know this exists, but i don't need it.\"" },
          { text: "c", tip: "short name for a short scope. inside a small loop, single-letter names are idiomatic go. save long names for things with wider scope." },
        ],
      },

      // Section 2: Functions + variadic
      {
        type: "text",
        section: 2,
        content:
          "functions in go are declared with func. they take parameters and return values. a variadic function uses three dots (...) to accept any number of arguments — they arrive inside the function as a slice.",
      },
      {
        type: "code",
        section: 2,
        content: `func sumCodes(codes ...int) int {
    total := 0
    for _, c := range codes {
        total += c
    }
    return total
}

// call with any number of ints
fmt.Println(sumCodes(10, 20, 30)) // 60
fmt.Println(sumCodes(5, 5))       // 10`,
        hotspots: [
          { text: "codes ...int", tip: "the three dots make this variadic — accepts 0 or more ints. inside the function, codes is a []int slice. you already know how to work with those." },
          { text: "for _, c := range codes", tip: "range over the slice, discard the index with _. same pattern you just learned — now inside a function." },
          { text: "total += c", tip: "+= adds c to total. same as total = total + c." },
          { text: "return total", tip: "the function does one thing — sum. no printing, no side effects. single purpose. that's how go functions should be." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "notice that sumCodes only sums — it doesn't print. keeping functions single-purpose makes them reusable. main() handles output.",
      },

      // Section 3: Multiple return values + composition
      {
        type: "text",
        section: 3,
        content:
          "go functions can return multiple values. this is used everywhere — for results with errors, or computed values with status flags. you can also reuse existing functions by composing them.",
      },
      {
        type: "code",
        section: 3,
        content: `func validateCode(codes ...int) (int, bool) {
    total := sumCodes(codes...)
    return total, total > 100
}

// receiving both values
sum, ok := validateCode(40, 50, 25)
fmt.Printf("sum=%d valid=%t\\n", sum, ok)`,
        hotspots: [
          { text: "(int, bool)", tip: "two return types in parentheses. this function returns an int AND a bool." },
          { text: "sumCodes(codes...)", tip: "composition — call sumCodes inside validateCode. reuse what you already built. the ... spreads the slice back into individual arguments." },
          { text: "total > 100", tip: "this comparison IS a boolean. no need for if/else — return the expression directly. that's clean go." },
          { text: "sum, ok :=", tip: "receiving multiple return values. both are declared with :=." },
        ],
      },

      // Section 4: Zen principles recap
      {
        type: "text",
        section: 4,
        content:
          "four patterns to remember for this level: slices ([]int) hold lists of values. use _ to discard unused values in range loops. keep functions single-purpose — sum only sums, validate only validates. and return boolean expressions directly — don't wrap them in if/else.",
      },
      {
        type: "code",
        section: 4,
        content: `// direct bool return — clean
return total, total > 100

// unnecessary if/else — avoid this
if total > 100 {
    return total, true
} else {
    return total, false
}`,
        hotspots: [
          { text: "return total, total > 100", tip: "the comparison already IS a bool. return it directly. go rewards brevity." },
          { text: "return total, true", tip: "this works but it's verbose. the if/else adds 4 lines for something that's a single expression." },
        ],
      },
    ],

    // ── Beginner Mode: visual-first, analogy-driven ──
    // Flow: Animation (section 0) → Card (section 1) → Code Recap (section 2) → Start Level
    beginnerBlocks: [
      // Section 0: Watch the programme run — function envelopes, stretchy pouches, outbox slots
      {
        type: "diagram",
        diagramId: "ch03-animation",
        content: "",
        section: 0,
      },

      // Section 1: The interactive card — function envelopes + pouches + outbox
      {
        type: "diagram",
        diagramId: "ch03-card",
        content: "",
        section: 1,
      },

      // Section 2: Code recap with hotspots
      {
        type: "text",
        section: 2,
        content:
          "functions are separate envelopes. each one does one job. the main envelope calls them by filling their pouch and reading the outbox.",
      },
      {
        type: "code",
        section: 2,
        content: `func sumCodes(codes ...int) int {
    total := 0
    for _, c := range codes {
        total += c
    }
    return total
}

func validateCode(codes ...int) (int, bool) {
    total := sumCodes(codes...)
    return total, total > 100
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
    s, v := validateCode(25, 30, 50, 10)
    fmt.Printf("Result: %d, Valid: %v\\n", s, v)
}`,
        hotspots: [
          { text: "codes ...int", tip: "the stretchy pouch. three dots = variadic. accepts any number of int stickers. inside, codes is a []int slice." },
          { text: "for _, c := range codes", tip: "a revolving door that spins through the pouch — one sticker per spin. range walks the list automatically. _ discards the position; zainab only needs the values." },
          { text: "return total", tip: "write the result in the outbox slot on the back of the envelope. one slot, one value. zainab takes it back to main." },
          { text: "(int, bool)", tip: "two outbox slots on the back of the envelope. the worker fills both before sending it back." },
          { text: "sumCodes(codes...)", tip: "composition — tip the pouch contents into another envelope's pouch. the ... spreads the slice back into individual stickers." },
          { text: "total > 100", tip: "the comparison IS a bool. write it directly into the outbox slot. no if/else wrapping needed." },
          { text: "s, v :=", tip: "read both outbox slots when the envelope comes back. s gets the int, v gets the bool." },
        ],
      },
    ],
  },

  "chapter-04": {
    title: "MAPS & SETS",
    subtitle: "KEY-VALUE LOOKUPS",
    blocks: [
      // Section 0: Scaffold recap + maps intro
      {
        type: "text",
        section: 0,
        content:
          "every go program starts the same way. this time you're building a guard roster — and you'll need go's map type.",
      },
      {
        type: "code",
        section: 0,
        content: `package main

import "fmt"

func main() {
    // guard roster goes here
}`,
        hotspots: [
          { text: "package main", tip: "every go executable starts with this. the roster terminal needs it." },
          { text: `import "fmt"`, tip: "brings in the fmt package for printing. you'll print which floors are clear." },
          { text: "func main()", tip: "entry point. your map logic goes inside here." },
        ],
      },

      // Section 1: Maps
      {
        type: "text",
        section: 1,
        content:
          "a map stores key-value pairs. map[string]string means string keys, string values. you create one with a composite literal.",
      },
      {
        type: "code",
        section: 1,
        content: `guards := map[string]string{
    "Chen":    "Floor 1",
    "Alvarez": "Floor 2",
    "Volkov":  "Floor 2",
    "Park":    "Floor 3",
    "Santos":  "Floor 1",
}`,
        hotspots: [
          { text: "map[string]string", tip: "the type — keys are strings, values are strings. the key type goes in brackets, the value type follows." },
          { text: ":=", tip: "short variable declaration. go infers the full type from the literal on the right." },
          { text: `{
    "Chen":    "Floor 1",
    "Alvarez": "Floor 2",
    "Volkov":  "Floor 2",
    "Park":    "Floor 3",
    "Santos":  "Floor 1",
}`, tip: "a composite literal — all entries declared at once. cleaner than adding them one by one with guards[\"Chen\"] = \"Floor 1\"." },
          { text: `"Santos":  "Floor 1",`, tip: "trailing comma is required in go when the closing brace is on its own line. the compiler enforces this." },
        ],
      },
      {
        type: "text",
        section: 1,
        content:
          "access a single value: guards[\"Volkov\"] returns \"Floor 2\". if the key doesn't exist, you get the zero value (empty string for strings).",
      },

      // Section 2: Range over maps
      {
        type: "text",
        section: 2,
        content:
          "use range to iterate over all entries. with maps, range gives you key and value each iteration.",
      },
      {
        type: "code",
        section: 2,
        content: `for name, floor := range guards {
    fmt.Println(name, "is on", floor)
}`,
        hotspots: [
          { text: "range guards", tip: "iterates all entries in the map. each iteration gives you one key-value pair." },
          { text: "name", tip: "the key — each guard's name. range assigns it fresh each iteration." },
          { text: "floor", tip: "the value — the floor assignment for that guard." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "map iteration order is random in go — don't depend on a specific order. this is by design.",
      },

      // Section 3: Tracking with a bool map
      {
        type: "text",
        section: 3,
        content:
          "to find which floors are occupied, collect them in a separate map. a map[string]bool lets you check membership quickly — like a set.",
      },
      {
        type: "code",
        section: 3,
        content: `occupied := map[string]bool{}
for _, floor := range guards {
    occupied[floor] = true
}
// check if a floor is occupied
if occupied["Floor 4"] {
    fmt.Println("Floor 4 has guards")
} else {
    fmt.Println("Floor 4 is clear")
}`,
        hotspots: [
          { text: "map[string]bool{}", tip: "empty map literal — the set pattern. keys are the items in the set, values are always true." },
          { text: "occupied[floor] = true", tip: "marking a floor as present. after this loop, every floor that appears in guards will be in the map." },
          { text: `occupied["Floor 4"]`, tip: "lookup returns false if the key is missing — the zero value for bool. no need for a special \"contains\" function." },
        ],
      },
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "this is go's \"set\" pattern — a map[T]bool where you only care about the keys. checking a missing key returns false (the zero value for bool), which is exactly what we want.",
      },

      // Section 4: Looping through floors
      {
        type: "text",
        section: 4,
        important: true,
        content:
          "fmt.Sprintf works like Printf but returns the string instead of printing it. this is how you build strings dynamically in go — and you'll use it constantly.",
      },
      {
        type: "code",
        section: 4,
        content: `for i := 1; i <= 4; i++ {
    floor := fmt.Sprintf("Floor %d", i)
    if !occupied[floor] {
        fmt.Println(floor, "is clear")
    }
}`,
        hotspots: [
          { text: `fmt.Sprintf("Floor %d", i)`, tip: "builds a string without printing it. like Printf but returns the string instead of writing to stdout." },
          { text: "!occupied[floor]", tip: "negation — true when the floor ISN'T in the map. missing keys return false, so !false = true." },
        ],
      },

      // Section 5: Functions that return maps
      {
        type: "text",
        section: 5,
        content:
          "in this level, you'll write functions that return maps. the terminal tests your functions with different inputs — so your logic must work for any data, not just one specific case.",
      },
      {
        type: "code",
        section: 5,
        content: `func buildRoster() map[string]string {
    return map[string]string{
        "Chen":    "Floor 1",
        "Alvarez": "Floor 2",
    }
}`,
        hotspots: [
          { text: "buildRoster() map[string]string", tip: "the return type is map[string]string — a function can return any type, including maps." },
          { text: "return map[string]string{", tip: "you can return a composite literal directly — no need to assign it to a variable first." },
        ],
      },

      // Section 6: Zen recap
      {
        type: "text",
        section: 6,
        content:
          "zen tips for this level: use a map composite literal (declare all entries at once, not one by one). use range to iterate maps — not manual key lookups. give your maps descriptive names — guards and occupied, not m and m2.",
      },
    ],
    beginnerBlocks: [
      // Section 0: Animation — office room walkthrough
      { type: "diagram", diagramId: "ch04-animation", content: "", section: 0 },
      // Section 1: Card — interactive package card
      { type: "diagram", diagramId: "ch04-card", content: "", section: 1 },
      // Section 2: Code recap with analogy hotspots
      {
        type: "text",
        section: 2,
        content:
          "maps are open folders with labelled drawer slots inside. each slot has a name tag (the key) and a sticker (the value). you can add, change, or remove slots freely — unlike sealed folders (const), these stay open.\n\nrange is a revolving door — it spins once per slot in the map, handing you the name tag and sticker each spin.\n\na map[string]bool is a clipboard. check a name = mark it present. look it up later = is it checked?",
      },
      {
        type: "code",
        section: 2,
        content: `func buildRoster() map[string]string {
    return map[string]string{
        "Chen":    "Floor 1",
        "Alvarez": "Floor 2",
        "Volkov":  "Floor 2",
        "Park":    "Floor 3",
        "Santos":  "Floor 1",
    }
}

func findClearFloor(guards map[string]string, maxFloor int) string {
    occupied := map[string]bool{}
    for _, floor := range guards {
        occupied[floor] = true
    }
    for i := 1; i <= maxFloor; i++ {
        floor := fmt.Sprintf("Floor %d", i)
        if !occupied[floor] {
            return floor
        }
    }
    return ""
}`,
        hotspots: [
          { text: "map[string]string", tip: "the map envelope type — name tags are strings, stickers are strings. the key type goes in brackets, value type follows." },
          { text: `"Chen":    "Floor 1"`, tip: "one labelled slot: name tag 'Chen', sticker 'Floor 1'. each slot is a key-value pair." },
          { text: "map[string]bool{}", tip: "the clipboard pattern. an empty map where keys are names and values are true/false. go's version of a set." },
          { text: "for _, floor := range guards", tip: "the revolving door spins through every slot in the map. each spin gives a name tag and sticker. _ discards the name tag — zainab only needs the floor sticker." },
          { text: "occupied[floor] = true", tip: "check a name on the clipboard. after spinning through all guards, every occupied floor is marked." },
          { text: `fmt.Sprintf("Floor %d", i)`, tip: "the sticker printer — feeds a number into a template, spits out a string. like Printf but returns the sticker instead of posting it." },
          { text: "!occupied[floor]", tip: "is this floor NOT on the clipboard? missing keys return false (the zero value for bool), so !false = true. no special 'contains' needed." },
        ],
      },
    ],
  },

  "chapter-04.2": {
    title: "CIPHER RELAY",
    subtitle: "STRINGS, RUNES, AND TYPE CONVERSION",
    blocks: [
      // Section 0: Scaffold recap + strings intro
      {
        type: "text",
        section: 0,
        content:
          "you know the skeleton: package main, import, func main(). this chapter needs three imports: fmt for printing, strings for splitting and joining words, and strconv for converting between numbers and strings.",
      },
      {
        type: "code",
        section: 0,
        content: `package main

import (
    "fmt"
    "strings"
    "strconv"
)`,
      },
      {
        type: "text",
        section: 0,
        content:
          "in go, a string is a read-only sequence of bytes. you can read it, pass it around, slice it — but you can't change individual characters in place. to manipulate characters safely, especially for unicode, you convert to a rune slice first.",
      },

      // Section 1: Strings as byte slices + []rune conversion
      {
        type: "text",
        section: 1,
        content:
          "a rune in go is a single unicode character (technically an int32). when you write []rune(s), you cut the string into individual character tiles. each tile is one rune — safe for any language, any emoji, any symbol.",
      },
      {
        type: "code",
        section: 1,
        content: `s := "hello"
runes := []rune(s)
// runes = ['h', 'e', 'l', 'l', 'o']
// each element is one character

// when you're done, seal back:
result := string(runes)
// result = "hello" (a new string)`,
      },
      {
        type: "text",
        section: 1,
        important: true,
        content:
          "string(runes) creates a NEW string. the original string was never modified. strings in go are immutable — read-only bytes under the hood.",
      },

      // Section 2: Reversing a rune slice (swap pattern)
      {
        type: "text",
        section: 2,
        content:
          "to reverse a word, use two pointers: i starts at the beginning, j starts at the end. each step, swap runes[i] and runes[j], then move both inward. stop when i >= j (they've met in the middle).",
      },
      {
        type: "code",
        section: 2,
        content: `func reverseWord(s string) string {
    runes := []rune(s)
    for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
        runes[i], runes[j] = runes[j], runes[i]
    }
    return string(runes)
}
// reverseWord("hello") = "olleh"`,
      },
      {
        type: "text",
        section: 2,
        content:
          "go's multi-assign (runes[i], runes[j] = runes[j], runes[i]) swaps both values in one statement. no temporary variable needed. the for loop also uses multi-assign for i and j — declaring two loop variables at once.",
      },

      // Section 3: strings.Fields + strings.Join
      {
        type: "text",
        section: 3,
        content:
          "strings.Fields splits a string at every whitespace boundary and returns a slice of words. it handles multiple spaces cleanly — no empty strings in the result. this is better than strings.Split(s, \" \") which would leave empty entries for double spaces.",
      },
      {
        type: "code",
        section: 3,
        content: `words := strings.Fields("move to floor 4")
// words = ["move", "to", "floor", "4"]

// reverse each word, collect results:
result := []string{}
for _, w := range words {
    result = append(result, reverseWord(w))
}

// tape them back together:
encoded := strings.Join(result, " ")
// encoded = "evom ot roolf 4"`,
      },
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "strings.Join is the inverse of Fields — it sticks slice elements together with a separator. Join([]string{\"a\",\"b\",\"c\"}, \"-\") = \"a-b-c\". use Join instead of manual string concatenation in loops.",
      },

      // Section 4: strconv.Itoa and strconv.Atoi
      {
        type: "text",
        section: 4,
        content:
          "strconv.Itoa converts an int to a string. the name means \"Integer TO Ascii\". it always succeeds — every number has a string representation.",
      },
      {
        type: "code",
        section: 4,
        content: `f := strconv.Itoa(3)    // f = "3"
f = strconv.Itoa(42)    // f = "42"

// the reverse: Atoi (Ascii TO Integer)
c, err := strconv.Atoi("50")   // c = 50, err = nil
c, err = strconv.Atoi("abc")   // c = 0, err = error`,
      },
      {
        type: "text",
        section: 4,
        content:
          "strconv.Atoi returns TWO values: the parsed integer and an error. if the string can't be parsed as a number, the error is non-nil. you must always check the error.",
      },

      // Section 5: Error handling with Atoi (err != nil pattern)
      {
        type: "text",
        section: 5,
        content:
          "go doesn't have exceptions or try/catch. instead, functions return an error value. the pattern is: call the function, check if err != nil, handle the error case first, then continue with the success case.",
      },
      {
        type: "code",
        section: 5,
        content: `c, err := strconv.Atoi(code)
if err != nil {
    // code wasn't a valid number
    return "F" + f + "-ERR"
}
// if we get here, c is a valid int
return "F" + f + "-C" + strconv.Itoa(c*2)`,
      },
      {
        type: "text",
        section: 5,
        important: true,
        content:
          "always handle the error case first and return early. this keeps the happy path unindented and easy to read. in go, you'll see this pattern hundreds of times — it's the language's core philosophy.",
      },

      // Section 6: Zen recap
      {
        type: "text",
        section: 6,
        content:
          "zen tips for this level: convert to []rune before manipulating characters — never index a string directly (bytes != characters for unicode). use strings.Fields over strings.Split for whitespace splitting. use strings.Join over manual concatenation in loops. always check the error from strconv.Atoi. compose functions — feed one function's output into another.",
      },
    ],
    beginnerBlocks: [
      // Section 0: Animation — office room walkthrough
      { type: "diagram", diagramId: "ch04.2-animation", content: "", section: 0 },
      // Section 1: Card — interactive package card
      { type: "diagram", diagramId: "ch04.2-card", content: "", section: 1 },
      // Section 2: Code recap with analogy hotspots
      {
        type: "text",
        section: 2,
        content:
          "a string is a sealed letter — read-only bytes. []rune cuts it into character tiles you can rearrange. strings.Fields is scissors (splits at spaces). strings.Join is tape (sticks tiles back together). strconv.Itoa is a number stamp (int to string). strconv.Atoi is a label reader (string to int, but it might fail — always check the error).",
      },
      {
        type: "code",
        section: 2,
        content: `func reverseWord(s string) string {
    runes := []rune(s)
    for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
        runes[i], runes[j] = runes[j], runes[i]
    }
    return string(runes)
}

func encode(msg string) string {
    words := strings.Fields(msg)
    result := []string{}
    for _, w := range words {
        result = append(result, reverseWord(w))
    }
    return strings.Join(result, " ")
}

func relayHeader(floor int, code string) string {
    f := strconv.Itoa(floor)
    c, err := strconv.Atoi(code)
    if err != nil {
        return "F" + f + "-ERR"
    }
    return "F" + f + "-C" + strconv.Itoa(c*2)
}`,
        hotspots: [
          { text: "[]rune(s)", tip: "cuts the sealed letter into individual character tiles. each tile is one unicode character (rune), safe for any language." },
          { text: "runes[i], runes[j] = runes[j], runes[i]", tip: "the swap -- flip tiles from both ends. go's multi-assign moves both at once, no temp variable needed." },
          { text: "string(runes)", tip: "seals the tiles back into a new letter. the original string wasn't changed (strings are read-only)." },
          { text: "strings.Fields(msg)", tip: "scissors cutting the sentence at every space. returns a stack of word tiles. handles multiple spaces cleanly." },
          { text: "append(result, reverseWord(w))", tip: "composition -- feeding each word tile through the reverseWord machine, collecting the results." },
          { text: `strings.Join(result, " ")`, tip: "tape -- sticks the reversed word tiles back together with a space between each." },
          { text: "strconv.Itoa(floor)", tip: "the number stamp -- stamps the number onto a string label. 3 becomes \"3\"." },
          { text: "strconv.Atoi(code)", tip: "the label reader -- reads a string label and returns the number. but if the label says \"abc\"... error." },
          { text: "if err != nil", tip: "go's error check. no exceptions, no try/catch. atoi returns (int, error). you check the error every time." },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  //  Act III — Kira's pages (boss-03 is Reeves again)
  // ══════════════════════════════════════════════════════════════

  "chapter-07": {
    title: "FILE TREE",
    subtitle: "CLOSURES, RECURSION, DEFER, PANIC & RECOVER",
    blocks: [
      // Section 0: functions are values
      {
        type: "text",
        section: 0,
        content:
          "same skeleton as every terminal: package main, import \"fmt\", func main(). this chapter is about functions themselves. in go a function is a value — you can store one in a variable, pass it around, and call it later. a function written without a name is a function literal.",
      },
      {
        type: "code",
        section: 0,
        content: `package main

import "fmt"

func main() {
    greet := func(name string) string {
        return "hello, " + name
    }
    fmt.Println(greet("maya")) // hello, maya
}`,
        hotspots: [
          { text: "greet := func(name string) string", tip: "a function literal — no name after func — stored in the variable greet. greet now holds a function, the way n can hold an int." },
          { text: `greet("maya")`, tip: "calling the variable calls the function inside it. same parentheses as any call." },
        ],
      },
      {
        type: "text",
        section: 0,
        content:
          "kira, in the margin: \"You already know functions. What you don't know yet is that they can remember things. That part I charge for.\"",
      },

      // Section 1: closures
      {
        type: "text",
        section: 1,
        content:
          "a function literal can use the variables around it. it doesn't get a copy — it captures the variable itself. change it inside the literal and the change is visible outside. a function plus the variables it captured is called a closure.",
      },
      {
        type: "code",
        section: 1,
        content: `count := 0
tick := func() {
    count++
}
tick()
tick()
fmt.Println(count) // 2`,
        hotspots: [
          { text: "count := 0", tip: "declared outside the literal. this is the one and only count." },
          { text: "count++", tip: "not a copy. the literal reaches out to the same count declared above and adds one to it." },
          { text: "fmt.Println(count)", tip: "two calls to tick, so count is 2 out here. the closure and main share the variable." },
        ],
      },
      {
        type: "text",
        section: 1,
        important: true,
        content:
          "declare the shared variable OUTSIDE the literal. if you write count := 0 inside it, every call starts its own fresh zero and throws it away when it returns.",
      },

      // Section 2: recursion
      {
        type: "text",
        section: 2,
        content:
          "a recursive function calls itself on a smaller piece of the problem. a directory tree is the textbook case: every directory is a smaller tree. each call needs a way to stop — the base case — or it calls itself forever.",
      },
      {
        type: "code",
        section: 2,
        content: `var countdown func(n int)
countdown = func(n int) {
    if n == 0 {
        return
    }
    fmt.Println(n)
    countdown(n - 1)
}
countdown(3) // 3, 2, 1`,
        hotspots: [
          { text: "var countdown func(n int)", tip: "declare the variable first, with its function type. now the name exists before the body is written." },
          { text: "countdown = func(n int) {", tip: "then assign the literal with = (not :=). inside this body, countdown already means something." },
          { text: "if n == 0 {", tip: "the base case. without a way to stop, the calls never end." },
          { text: "countdown(n - 1)", tip: "the recursive call, on a smaller problem. 3 calls 2, 2 calls 1, 1 calls 0, and 0 stops." },
        ],
      },
      {
        type: "text",
        section: 2,
        important: true,
        content:
          "a literal can't call itself if you declare it with :=. go hasn't finished creating the name while it reads the body, so countdown := func... with countdown(n - 1) inside fails with \"undefined: countdown\". var first, then =.",
      },
      {
        type: "text",
        section: 2,
        content:
          "in the archive, an entry ending in / is a directory. a string is bytes, so entry[len(entry)-1] is its last byte — compare it with the byte literal '/' (single quotes mean one character). entry[:len(entry)-1] is the same string without that last byte: \"logs/\" becomes \"logs\".",
      },
      {
        type: "code",
        section: 2,
        content: `entry := "logs/"
if entry[len(entry)-1] == '/' {
    dir := entry[:len(entry)-1]
    fmt.Println(dir) // logs
}`,
        hotspots: [
          { text: "entry[len(entry)-1] == '/'", tip: "the last byte of the string, compared with the character /. true means this entry is a directory." },
          { text: "entry[:len(entry)-1]", tip: "a slice of the string from the start up to (not including) the last byte. the slash is gone." },
        ],
      },

      // Section 3: defer
      {
        type: "text",
        section: 3,
        content:
          "defer schedules a function call to run when the surrounding function returns — however it returns. write it at the top, and it runs at the very end. the arguments are evaluated immediately, when the defer line runs, so the call remembers the values from that moment.",
      },
      {
        type: "code",
        section: 3,
        content: `func visit(dir string) {
    defer fmt.Println("leaving", dir)
    fmt.Println("entering", dir)
}

visit("logs")
// entering logs
// leaving logs`,
        hotspots: [
          { text: `defer fmt.Println("leaving", dir)`, tip: "runs when visit returns, not here. dir is evaluated right now, so it prints this call's directory." },
          { text: `fmt.Println("entering", dir)`, tip: "runs first, even though it's written second." },
        ],
      },
      {
        type: "text",
        section: 3,
        content:
          "several defers in one function run last-in, first-out — like a stack of plates. and in a recursive walk, a deferred print fires on the way OUT of each call: the deepest directory finishes first, the root finishes last.",
      },
      {
        type: "code",
        section: 3,
        content: `defer fmt.Println("first in")
defer fmt.Println("second in")
// when the function returns:
// second in
// first in`,
        hotspots: [
          { text: `defer fmt.Println("second in")`, tip: "deferred last, so it runs first. defers unwind in reverse order." },
        ],
      },

      // Section 4: panic and recover
      {
        type: "text",
        section: 4,
        content:
          "panic stops the current function on the spot and unwinds back up through its callers, running every deferred call on the way. if nothing stops it, the program crashes. recover stops it — but only when called inside a deferred function. anywhere else, recover returns nil and does nothing.",
      },
      {
        type: "code",
        section: 4,
        content: `errs := []string{}
check := func(dir string, entries []string) {
    defer func() {
        if r := recover(); r != nil {
            errs = append(errs, fmt.Sprintf("%s: %v", dir, r))
        }
    }()
    if entries == nil {
        panic("corrupted directory")
    }
    fmt.Println(dir, "ok")
}
check("logs", []string{"access.log"})
check("vault", nil)
fmt.Println(errs) // [vault: corrupted directory]`,
        hotspots: [
          { text: "defer func() {", tip: "a deferred function literal. it runs as check returns — including when check is panicking." },
          { text: "if r := recover(); r != nil {", tip: "an if with a short statement: run r := recover() first, then test r != nil. r is whatever was passed to panic, or nil if nothing panicked." },
          { text: `fmt.Sprintf("%s: %v", dir, r)`, tip: "%v prints any value — here the panic's message. the result reads \"vault: corrupted directory\"." },
          { text: "}()", tip: "the () calls the literal. defer needs a call, not just a function — leave these off and go won't compile it." },
          { text: `panic("corrupted directory")`, tip: "stops check right here. the deferred func runs, recover catches it, and check returns normally to its caller." },
        ],
      },
      {
        type: "text",
        section: 4,
        important: true,
        content:
          "put the deferred recover in the function whose failure you want to contain. in a recursive scan that means inside the scan itself: each call guards its own directory, so one bad directory costs one directory and the parent's loop carries on. defers you want to run during a panic must be registered BEFORE the line that panics.",
      },
      {
        type: "text",
        section: 4,
        content:
          "panic is not go's normal error path — errors are values, like the one strconv.Atoi returned. panic is for a function that cannot go on. recover is how you build a boundary it can't cross.",
      },

      // Section 5: zen recap
      {
        type: "text",
        section: 5,
        content:
          "zen tips for this level: defer the line that ends a call at the top of the call. let a closure capture the counter instead of threading pointers through. declare a recursive literal with var first, then assign. call recover only inside a deferred function, and recover in each recursive call so one failure stays one failure.",
      },
      {
        type: "text",
        section: 5,
        content:
          "kira, in the margin: \"Every directory signs out on its way past. So does everyone in this building. I read those logs too.\"",
      },
    ],
    notesBlocks: [
      { type: "text", section: 0, important: true, content: "closure — a function literal that shares the variables around it." },
      {
        type: "code",
        section: 0,
        content: `count := 0
tick := func() { count++ }
tick() // count is now 1`,
      },
      { type: "text", section: 1, content: "recursion with a literal — declare, then assign." },
      {
        type: "code",
        section: 1,
        content: `var scan func(dir string)
scan = func(dir string) {
    scan(sub) // allowed: scan already exists
}`,
      },
      { type: "text", section: 2, content: "defer — runs when the function returns, last-in first-out." },
      {
        type: "code",
        section: 2,
        content: `defer fmt.Println("scanned:", dir) // args evaluated now`,
      },
      { type: "text", section: 3, content: "panic and recover — recover only inside a deferred func." },
      {
        type: "code",
        section: 3,
        content: `defer func() {
    if r := recover(); r != nil {
        // handle r
    }
}()
panic("corrupted directory")`,
      },
    ],
  },

  "chapter-08": {
    title: "CIRCUIT CUT",
    subtitle: "GOROUTINES & WAITGROUPS",
    blocks: [
      // Section 0: skeleton + imports
      {
        type: "text",
        section: 0,
        content:
          "same skeleton, two new packages. time measures and waits. sync coordinates work that runs at the same time. go refuses to compile an import you don't use, so each one joins the block only when a step needs it.",
      },
      {
        type: "code",
        section: 0,
        content: `package main

import (
    "fmt"
    "sync"
    "time"
)`,
        hotspots: [
          { text: `"sync"`, tip: "home of sync.WaitGroup — a counter you can wait on. used from step 2." },
          { text: `"time"`, tip: "time.Sleep, time.Millisecond, time.Now, time.Since. used from step 1." },
        ],
      },

      // Section 1: goroutines
      {
        type: "text",
        section: 1,
        content:
          "a goroutine is a function running alongside the rest of your program. put go in front of any function call and it starts — the caller doesn't wait for it, it just carries on to the next line. the function's arguments are evaluated right away, in the caller.",
      },
      {
        type: "code",
        section: 1,
        content: `func cut(name string) {
    fmt.Println(name + " circuit: DOWN")
}

func main() {
    cut("North")    // runs now, main waits
    go cut("South") // starts now, main doesn't wait
    time.Sleep(100 * time.Millisecond)
    fmt.Println("power cycle complete")
}`,
        hotspots: [
          { text: `go cut("South")`, tip: "the go statement. cut starts running on its own and main moves straight on." },
          { text: "time.Sleep(100 * time.Millisecond)", tip: "holds main open for 100ms. without it, main could return first — and South would never print." },
        ],
      },
      {
        type: "text",
        section: 1,
        important: true,
        content:
          "when main returns, the program ends — every goroutine still running is stopped mid-flight, no warning. sleeping and hoping is not a plan. section 3 shows the real tool.",
      },
      {
        type: "text",
        section: 1,
        content:
          "goroutines are cheap. each starts with a tiny stack, and go's scheduler runs thousands of them on a handful of operating-system threads. one per breaker is nothing.",
      },

      // Section 2: durations
      {
        type: "text",
        section: 2,
        content:
          "time.Sleep takes a time.Duration. a constant like 100 can be multiplied by time.Millisecond directly. a variable of type int can't — go never mixes types silently. convert it first with time.Duration(d), then scale it by the unit.",
      },
      {
        type: "code",
        section: 2,
        content: `time.Sleep(100 * time.Millisecond) // fine: 100 is a constant

d := 300
time.Sleep(time.Duration(d) * time.Millisecond) // 300ms
// time.Sleep(d * time.Millisecond) won't compile: int * Duration`,
        hotspots: [
          { text: "time.Duration(d) * time.Millisecond", tip: "convert the int to a Duration, then multiply by the unit. this is the pattern every time the number lives in a variable." },
        ],
      },

      // Section 3: WaitGroup
      {
        type: "text",
        section: 3,
        content:
          "a sync.WaitGroup counts goroutines that are still working. Add(1) before each launch. Done() when one finishes. Wait() blocks until the count is back to zero. three calls, always in the same places.",
      },
      {
        type: "code",
        section: 3,
        content: `var wg sync.WaitGroup
for _, name := range []string{"North", "South"} {
    wg.Add(1)
    go func(n string) {
        defer wg.Done()
        cut(n)
    }(name)
}
wg.Wait()
fmt.Println("both down")`,
        hotspots: [
          { text: "var wg sync.WaitGroup", tip: "a WaitGroup ready to use, count zero. no make needed." },
          { text: "wg.Add(1)", tip: "count the goroutine BEFORE it starts. if it counted itself, Wait could look first, see zero, and return early." },
          { text: "go func(n string) {", tip: "a goroutine running a function literal. the () at the end of the block calls it, passing name in as n." },
          { text: "defer wg.Done()", tip: "first line inside. however the goroutine ends, the count goes down by one." },
          { text: "wg.Wait()", tip: "blocks main until every goroutine has called Done. once, after the loop — never inside it." },
        ],
      },
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "never copy a WaitGroup. pass one to another function by value and that function calls Done on a copy — the real count never reaches zero and Wait hangs forever. keep it in one function, or pass a pointer, &wg.",
      },
      {
        type: "text",
        section: 3,
        content:
          "kira, in the margin: \"Newer Go has wg.Go(f), which does the Add and the Done for you. Learn the ritual first. Shortcuts are for people who know what they skip.\"",
      },

      // Section 4: goroutines in a loop
      {
        type: "text",
        section: 4,
        content:
          "goroutines finish in whatever order they finish. if each one prints, the lines come out scrambled. instead, make a slice with one slot per goroutine, have each write only its own slot, and read the slice after Wait. pass the loop values in as arguments, so each goroutine visibly owns its copy.",
      },
      {
        type: "code",
        section: 4,
        content: `results := make([]string, len(circuits))
var wg sync.WaitGroup
for i, name := range circuits {
    wg.Add(1)
    go func(idx int, n string) {
        defer wg.Done()
        results[idx] = n + " circuit: DOWN"
    }(i, name)
}
wg.Wait()
return results`,
        hotspots: [
          { text: "make([]string, len(circuits))", tip: "one empty slot per circuit, made before anything starts. nobody needs to grow the slice." },
          { text: "results[idx] = n", tip: "each goroutine writes only its own index. no two touch the same slot, so nothing collides." },
          { text: "}(i, name)", tip: "the arguments, handed in at launch. each goroutine gets its own idx and n." },
        ],
      },
      {
        type: "text",
        section: 4,
        important: true,
        content:
          "never append to a shared slice from several goroutines at once. that's a data race — two writes land together and one is lost. pre-size, write by index. (since go 1.22 every loop iteration gets fresh i and name variables, so a literal that reads them directly also works. passing them in still says exactly what the goroutine depends on.)",
      },

      // Section 5: max vs sum
      {
        type: "text",
        section: 5,
        content:
          "run four waits one after another and the total is their sum. run them as four goroutines and they wait side by side — the total is only the slowest one. that's the whole point of concurrency here: the sleep has to happen INSIDE each goroutine.",
      },
      {
        type: "code",
        section: 5,
        content: `// one after another: 300 + 150 + 450 + 200 = 1100ms
for i := range delays {
    time.Sleep(time.Duration(delays[i]) * time.Millisecond)
}

// side by side: max(300, 150, 450, 200) = 450ms
for i := range delays {
    wg.Add(1)
    go func(d int) {
        defer wg.Done()
        time.Sleep(time.Duration(d) * time.Millisecond)
    }(delays[i])
}
wg.Wait()`,
        hotspots: [
          { text: "go func(d int) {", tip: "each delay sleeps in its own goroutine, so all four clocks run at once." },
        ],
      },
      {
        type: "text",
        section: 5,
        content:
          "the terminal measures with t := time.Now() before your call and time.Since(t) after it. under 1100ms means all four tripped inside one power cycle.",
      },

      // Section 6: zen recap
      {
        type: "text",
        section: 6,
        content:
          "zen tips for this level: go f(x) launches a call — the launcher returns at once and someone else waits. wg.Add(1) before go, defer wg.Done() as the first line inside, wg.Wait() once after the loop. pass loop values in as arguments. write results by index, never print or append from inside goroutines. sleep inside the goroutine. convert ints with time.Duration(d) before scaling.",
      },
      {
        type: "text",
        section: 6,
        content:
          "kira, in the margin: \"Four hands, one moment. You're welcome. I'll remember that you were.\"",
      },
    ],
    notesBlocks: [
      { type: "text", section: 0, important: true, content: "goroutine — go in front of a call. the caller doesn't wait." },
      { type: "code", section: 0, content: `go cut(name)` },
      { type: "text", section: 1, content: "the WaitGroup ritual." },
      {
        type: "code",
        section: 1,
        content: `var wg sync.WaitGroup
wg.Add(1)            // before go
go func(i int) {
    defer wg.Done()  // first line
}(i)
wg.Wait()            // once, after the loop`,
      },
      { type: "text", section: 2, content: "results by index — one slot per goroutine." },
      { type: "code", section: 2, content: `results := make([]string, len(circuits))
results[idx] = n + " circuit: DOWN"` },
      { type: "text", section: 3, content: "sleep a variable number of milliseconds." },
      { type: "code", section: 3, content: `time.Sleep(time.Duration(d) * time.Millisecond)` },
    ],
  },

  "chapter-09": {
    title: "CHANNEL OF ESCAPE",
    subtitle: "CHANNELS, SELECT & TIMEOUTS",
    blocks: [
      // Section 0: skeleton
      {
        type: "text",
        section: 0,
        content:
          "same skeleton. time joins the imports in step 1. goroutines you know — they run alongside you. this chapter is how they talk back. a WaitGroup tells you a goroutine finished. a channel hands you what it found.",
      },
      {
        type: "code",
        section: 0,
        content: `package main

import (
    "fmt"
    "time"
)`,
      },

      // Section 1: channels
      {
        type: "text",
        section: 1,
        content:
          "a channel is a typed pipe between goroutines. make one with make(chan string). ch <- v sends a value in. v := <-ch takes one out — and waits until there is one. the arrow always points the way the data moves.",
      },
      {
        type: "code",
        section: 1,
        content: `ch := make(chan string)
go func() {
    ch <- "Bravo responding"
}()
msg := <-ch
fmt.Println(msg) // Bravo responding`,
        hotspots: [
          { text: "make(chan string)", tip: "a channel that carries strings. unbuffered: no room inside, so a send waits until someone receives." },
          { text: `ch <- "Bravo responding"`, tip: "send. the value goes into the channel. arrow pointing in." },
          { text: "msg := <-ch", tip: "receive. main waits right here until the goroutine sends. receiving IS waiting — no WaitGroup needed." },
        ],
      },
      {
        type: "text",
        section: 1,
        important: true,
        content:
          "on an unbuffered channel, a send blocks until a receiver takes the value, and a receive blocks until a sender provides one. if every goroutine ends up blocked like that, go stops the program: \"all goroutines are asleep - deadlock\".",
      },

      // Section 2: buffered channels, returning a channel
      {
        type: "text",
        section: 2,
        content:
          "make(chan string, 1) gives the channel room for one value. a send only waits when the buffer is full, so a goroutine can drop its one reply and finish — even if nobody ever reads it. a function can make a channel, start a goroutine that answers into it, and return the channel straight away.",
      },
      {
        type: "code",
        section: 2,
        content: `func hail(team string, delayMs int) chan string {
    ch := make(chan string, 1)
    go func() {
        time.Sleep(time.Duration(delayMs) * time.Millisecond)
        ch <- team + " responding"
    }()
    return ch
}

ch := hail("Bravo", 100) // returns at once
fmt.Println(<-ch)        // waits ~100ms`,
        hotspots: [
          { text: "chan string {", tip: "the return type is the channel itself. the caller gets the pipe now and the answer later." },
          { text: "make(chan string, 1)", tip: "room for one message. the reply can sit in the channel until someone reads it — or forever, harmlessly." },
          { text: "return ch", tip: "returns before the goroutine has slept. hail never makes the caller wait." },
          { text: "fmt.Println(<-ch)", tip: "the caller decides when to wait. the receive blocks until the team answers." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "kira, in the margin: \"A reply with nowhere to go is a goroutine stuck forever. Give every sender you might ignore a buffer of one. It costs nothing. Ignoring people usually doesn't.\"",
      },

      // Section 3: select
      {
        type: "text",
        section: 3,
        content:
          "receiving from alpha, then bravo, waits for alpha first even if bravo answered sooner. select listens to several channels at once. it waits until one of its cases is ready, runs that case, and ignores the rest. it's a switch for channels.",
      },
      {
        type: "code",
        section: 3,
        content: `select {
case msg := <-alpha:
    return msg
case msg := <-bravo:
    return msg
case msg := <-charlie:
    return msg
}`,
        hotspots: [
          { text: "select {", tip: "blocks until any one case can go. order on the page doesn't matter — readiness does." },
          { text: "case msg := <-bravo:", tip: "a receive case. if bravo's channel has a value first, this case runs and msg holds it." },
        ],
      },
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "if two cases are ready at the same moment, select picks one at random — no channel gets favored, so none can starve the others. and the teams that lost still deliver into their one-message buffers. nobody is left stuck.",
      },

      // Section 4: timeouts
      {
        type: "text",
        section: 4,
        content:
          "time.After(d) returns a channel that delivers one value once d has passed. add it as one more case and the other channels race the clock: whichever is ready first wins. build d from a parameter, so the caller chooses how long to wait.",
      },
      {
        type: "code",
        section: 4,
        content: `select {
case msg := <-bravo:
    return msg
case <-time.After(time.Duration(timeoutMs) * time.Millisecond):
    return "NO CONTACT"
}`,
        hotspots: [
          { text: "case <-time.After(time.Duration(timeoutMs) * time.Millisecond):", tip: "a receive with no variable — we only care that the clock fired. if it fires before any team answers, we give up." },
          { text: "timeoutMs", tip: "the deadline comes from the caller. the same function can wait 200ms on a jammed line or 600ms on a live one." },
        ],
      },
      {
        type: "text",
        section: 4,
        content:
          "why not time.Sleep and then check? a sleep always waits the full time, even if the answer arrived in the first millisecond. time.After races — the answer wins the moment it lands.",
      },

      // Section 5: default
      {
        type: "text",
        section: 5,
        content:
          "a select with a default case never waits. if no other case is ready at that instant, default runs immediately. that's a glance at a channel, not a wait on it.",
      },
      {
        type: "code",
        section: 5,
        content: `func sweep(ch chan string) string {
    select {
    case msg := <-ch:
        return msg
    default:
        return "channel silent"
    }
}`,
        hotspots: [
          { text: "default:", tip: "runs only when no case is ready right now. with a default, select never blocks." },
        ],
      },
      {
        type: "text",
        section: 5,
        important: true,
        content:
          "timeout means wait, but not past a deadline. default means don't wait at all. put default only where you mean \"just look\" — inside a select that is supposed to wait for an answer, it gives up before anyone can reply.",
      },

      // Section 6: zen recap
      {
        type: "text",
        section: 6,
        content:
          "zen tips for this level: give an abandonable sender a buffer of one. return the channel at once and let the caller wait. wait on many channels with one select, not one receive after another. take a timeout from the caller with time.After. keep default for the select that should never wait.",
      },
      {
        type: "text",
        section: 6,
        content:
          "kira, in the margin: \"Every frequency on this page is one I gave you. Listen on them anyway. Just never wait forever on anyone — me included.\"",
      },
    ],
    notesBlocks: [
      { type: "text", section: 0, important: true, content: "channel — send in, receive out. receiving waits." },
      { type: "code", section: 0, content: `ch := make(chan string, 1) // room for one
ch <- "msg"                 // send
msg := <-ch                 // receive (waits)` },
      { type: "text", section: 1, content: "select — take the first ready case." },
      { type: "code", section: 1, content: `select {
case msg := <-a:
    return msg
case msg := <-b:
    return msg
}` },
      { type: "text", section: 2, content: "timeout and non-blocking." },
      { type: "code", section: 2, content: `case <-time.After(time.Duration(ms) * time.Millisecond):
    return "NO CONTACT"   // waited, gave up
default:
    return "channel silent" // never waited` },
    ],
  },

  "boss-03": {
    title: "READ BEFORE YOU RUN",
    subtitle: "SLICES SHARE MEMORY",
    blocks: [
      // Section 0: why this page exists
      {
        type: "text",
        section: 0,
        content:
          "reeves again. the last pages were hers, and they were good — which is exactly why this one is mine. tonight you don't write code. you read someone else's, and decide what it does before it touches anything you care about. this page is the one idea you need to read it: a slice is a window onto memory, not the memory itself.",
      },
      {
        type: "text",
        section: 0,
        important: true,
        content:
          "the rule i taught every student: read before you run. for every line, ask what it changes, and who else is holding the thing it changes.",
      },

      // Section 1: the slice header
      {
        type: "text",
        section: 1,
        content:
          "a slice value is a small header with three fields: a pointer to an underlying array, a length, and a capacity. the bytes live in the array. slicing a slice — b := a[1:] — makes a new header pointing into the SAME array. nothing is copied.",
      },
      {
        type: "code",
        section: 1,
        content: `a := []byte{0x10, 0x20, 0x30, 0x40}
b := a[1:]       // b sees 20 30 40

a[1] = 0x99
fmt.Printf("% X\\n", b) // 99 30 40`,
        hotspots: [
          { text: "b := a[1:]", tip: "a new header: pointer to a's second element, length 3. same backing array as a — not a copy." },
          { text: "a[1] = 0x99", tip: "a write through a. b points at the same byte, so b changes too." },
          { text: `fmt.Printf("% X\\n", b)`, tip: "% X prints each byte as two hex digits with spaces between. b now reads 99 30 40." },
        ],
      },

      // Section 2: sending a slice sends the header
      {
        type: "text",
        section: 2,
        content:
          "passing a slice to a function, storing it, or sending it on a channel copies the header — three small fields — never the bytes. whoever receives it is looking through a window at memory the sender can still write to. if the sender keeps writing after it sends, the receiver's \"message\" changes under its feet.",
      },
      {
        type: "code",
        section: 2,
        content: `frames := make(chan []byte, 2)
buf := []byte{0x01, 0x02}

frames <- buf[0:] // sent: 01 02
buf[0] = 0xAA     // written AFTER sending

f := <-frames
fmt.Printf("% X\\n", f) // AA 02`,
        hotspots: [
          { text: "frames <- buf[0:]", tip: "sends a slice header pointing into buf's array. the receiver gets the window, not the bytes." },
          { text: "buf[0] = 0xAA", tip: "the sender writes after sending. the receiver's frame points at this same byte." },
          { text: "f := <-frames", tip: "what arrives is what's in the array NOW — AA 02 — not what was there at send time." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "a type like chan<- []byte is a send-only channel — the function may send on it but not receive. it's a restriction on the parameter, nothing more. and if a separate goroutine reads frames while the sender is still writing, it's a data race: go run -race will flag it. even with no race at all, the bytes are still shared.",
      },

      // Section 3: make + copy
      {
        type: "text",
        section: 3,
        content:
          "to freeze a frame, give it its own array. make a new slice of the right length, copy the bytes in, send the copy. later writes to the original can't reach it. copy(dst, src) copies min(len(dst), len(src)) elements and returns how many it copied.",
      },
      {
        type: "code",
        section: 3,
        content: `frame := make([]byte, len(buf))
copy(frame, buf)
frames <- frame   // its own array

buf[0] = 0xAA     // frame is untouched`,
        hotspots: [
          { text: "make([]byte, len(buf))", tip: "a brand-new backing array, the right size. nobody else has a pointer into it." },
          { text: "copy(frame, buf)", tip: "copies the bytes across. from here on frame and buf share nothing." },
        ],
      },
      {
        type: "text",
        section: 3,
        content:
          "the one-line form appends onto an empty slice, which forces a fresh array: frame := append([]byte(nil), buf...). same effect. what matters is that the copy happens BEFORE the send.",
      },

      // Section 4: XOR
      {
        type: "text",
        section: 4,
        content:
          "the encoder you'll read masks bytes with XOR. b ^= 0xFF flips every bit of b in place: 0x10 becomes 0xEF, 0x20 becomes 0xDF. in place means the original array is rewritten — which brings you straight back to who else is looking at it.",
      },
      {
        type: "code",
        section: 4,
        content: `data := []byte{0x10, 0x20}
data[0] ^= 0xFF
fmt.Printf("% X\\n", data) // EF 20`,
        hotspots: [
          { text: "data[0] ^= 0xFF", tip: "XOR with all ones flips every bit. it writes the result back into data's own array." },
        ],
      },

      // Section 5: how to read
      {
        type: "text",
        section: 5,
        content:
          "how i read code i didn't write: find every line that writes. for each write, find every slice that shares that array — anything made by slicing, anything already sent or stored. if a shared slice left the function before the write, the write reaches it. then look for the copy that should have broken the link. if there isn't one, you have your answer.",
      },
      {
        type: "text",
        section: 5,
        important: true,
        content:
          "a receiver log is evidence. a frame that changed after it was sent is memory that was still shared. a frame that didn't change tells you just as much — ask why that one was safe.",
      },
      {
        type: "text",
        section: 5,
        content:
          "she's clever, maya. clever people write code that reads clean. read it anyway. — e.r.",
      },
    ],
    notesBlocks: [
      { type: "text", section: 0, important: true, content: "a slice is a header: pointer, length, capacity. slicing shares the array." },
      { type: "code", section: 0, content: `b := a[1:]  // same array as a
a[1] = 0x99 // b[0] is now 0x99` },
      { type: "text", section: 1, content: "sending a slice sends the header, not the bytes." },
      { type: "code", section: 1, content: `ch <- buf[i:] // receiver shares buf's array` },
      { type: "text", section: 2, content: "make + copy freezes a frame." },
      { type: "code", section: 2, content: `frame := make([]byte, len(src))
copy(frame, src)
ch <- frame` },
    ],
  },

  "boss-01": {
    title: "WEAPON SYSTEMS",
    subtitle: "GO SURVIVAL GUIDE FOR THE LOCKMASTER",
    blocks: [
      // Section 0: Packages & imports
      {
        type: "text",
        section: 0,
        content:
          "the weapon system is split into two packages — just like a real go project. aim.go, load.go, and fire.go are in package weapon. main.go is package main and imports weapon to use its functions.",
      },
      {
        type: "code",
        section: 0,
        content: `// weapon files (aim.go, load.go, fire.go):
package weapon

func Aim(sector int) (int, int) { ... }
func Load(threat string) []string { ... }
func Fire(x, y int, ammo []string) string { ... }

// main.go:
package main

import "weapon"

func main() {
    x, y := weapon.Aim(5)
    ammo := weapon.Load("shield")
    result := weapon.Fire(x, y, ammo)
}`,
        hotspots: [
          { text: "package weapon", tip: "declares these files as part of the weapon package. any file can be in any package — the package name groups them." },
          { text: `import "weapon"`, tip: "brings the weapon package into scope. now you can call weapon.Aim(), weapon.Load(), weapon.Fire()." },
          { text: "weapon.Aim(5)", tip: "the package name + dot + function name. in go, exported functions (capitalized) are visible from other packages." },
          { text: "func Aim(", tip: "capitalized name = exported. other packages can call weapon.Aim(). a lowercase name like \"aim\" would be private." },
        ],
      },
      {
        type: "text",
        section: 0,
        content:
          "in go, capitalized names are exported (visible to other packages). lowercase names are private. all the weapon functions — Aim, Load, Fire — are capitalized, so main.go can call them.",
      },

      // Section 1: := vs = (the #1 gotcha)
      {
        type: "text",
        section: 1,
        content:
          "the corrupted weapon code has bugs you need to fix. but be careful — go has rules that will trip you up if you don't know them. first rule: := declares a NEW variable. = reassigns an EXISTING one.",
      },
      {
        type: "code",
        section: 1,
        content: `count := 0          // declares count

count = 5            // reassigns count (correct)
count := 5           // ERROR — count already exists

// inside a switch/if block, := creates
// a NEW variable scoped to that block:
switch threat {
case "shield":
    count = 3        // reassigns outer count
    count := 3       // creates NEW count (bug!)
}`,
        hotspots: [
          { text: "count := 0", tip: "short variable declaration — creates a new variable AND assigns it. only use this the FIRST time." },
          { text: "count = 5            // reassigns count (correct)", tip: "plain = assigns a new value to an existing variable. use this inside switch/if blocks." },
          { text: "count := 3       // creates NEW count (bug!)", tip: "this creates a DIFFERENT count inside the case block. the outer count stays 0. go will say \"declared and not used\" because the inner one is never read." },
        ],
      },

      // Section 2: && vs || (logical operators)
      {
        type: "text",
        section: 2,
        content:
          "second rule: && means AND (both must be true). || means OR (either one is true). the weapon code uses these to validate inputs — getting them backwards means your conditions are wrong.",
      },
      {
        type: "code",
        section: 2,
        content: `// || means OR — true if EITHER side is true
if x == 0 || y == 0 {
    // fires when x is zero OR y is zero
    return "NO TARGET"
}

// && means AND — true only if BOTH are true
if x == 0 && y == 0 {
    // only fires when BOTH are zero
    // misses cases like x=0, y=320
}`,
        hotspots: [
          { text: "x == 0 || y == 0", tip: "OR — rejects if EITHER coordinate is zero. this is what you want for input validation." },
          { text: "x == 0 && y == 0", tip: "AND — only rejects when BOTH are zero. if x=0 but y=320, this lets it through. that's a bug." },
        ],
      },

      // Section 3: Grouped parameters + corrupted types
      {
        type: "text",
        section: 3,
        content:
          "third rule: when function parameters share a type, go lets you group them. \"x, y int\" means both x and y are int. the weapon code uses this — and the corrupted version has type names misspelled.",
      },
      {
        type: "code",
        section: 3,
        content: `// grouped parameters — x and y are both int
func Fire(x, y int, ammo []string) string

// this is the same as writing:
func Fire(x int, y int, ammo []string) string

// watch for corrupted types:
func Aim(sector in) (int, int)   // WRONG: "in"
func Aim(sector int) (int, int)  // RIGHT: "int"

func Load(threat sting) []string // WRONG: "sting"
func Load(threat string) []string // RIGHT: "string"`,
        hotspots: [
          { text: "x, y int", tip: "grouped parameters — when consecutive params share a type, only write the type once after the last name." },
          { text: "sector in)", tip: "\"in\" is not a type. the malware corrupted \"int\" — fix it to \"int\"." },
          { text: "threat sting)", tip: "\"sting\" is not a type. the malware corrupted \"string\" — fix it to \"string\"." },
        ],
      },

      // Section 4: Const groups
      {
        type: "text",
        section: 4,
        content:
          "fourth rule: go uses const groups to define named values. fire.go uses a const group for its return strings — but the malware corrupted one of the values. const values can't be changed after declaration, so you fix them in the const block, not in the function.",
      },
      {
        type: "code",
        section: 4,
        content: `// const group — named values
const (
    Hit      = "HIT"
    NoTarget = "NO TARGET"
    NoAmmo   = "NO AMMO"
)

// use the const names in your code:
func Fire(x, y int, ammo []string) string {
    if x == 0 || y == 0 {
        return NoTarget
    }
    if len(ammo) == 0 {
        return NoAmmo
    }
    return Hit
}`,
        hotspots: [
          { text: "const (", tip: "a const group — declares multiple constants together. cleaner than separate const lines." },
          { text: `Hit      = "HIT"`, tip: "the malware changed this to \"FIRE\". the test expects \"HIT\" — fix the value, not the function." },
          { text: "return Hit", tip: "this returns whatever Hit is set to in the const block. if Hit = \"FIRE\", the function returns \"FIRE\" — wrong." },
        ],
      },

      // Section 5: Variadic functions — write from scratch
      {
        type: "text",
        section: 5,
        content:
          "the combo tab is where you write your own code. main.go imports the weapon package and needs a Combo function. a variadic function uses \"...\" before the type to accept any number of arguments. inside the function, it's a regular slice.",
      },
      {
        type: "code",
        section: 5,
        content: `// you will write this yourself in the COMBO tab:
func Combo(shots ...string) string {
    return strings.Join(shots, " | ")
}

// calling it:
Combo("HIT")                  // "HIT"
Combo("HIT", "HIT", "HIT")   // "HIT | HIT | HIT"

// strings.Join(slice, separator)
// joins all elements with separator between them`,
        hotspots: [
          { text: "...string", tip: "three dots make this variadic — pass any number of strings. inside the function, shots is a []string." },
          { text: `strings.Join(shots, " | ")`, tip: "Join takes a slice and a separator string. it puts \" | \" between each element." },
          { text: `Combo("HIT", "HIT", "HIT")`, tip: "three arguments become []string{\"HIT\", \"HIT\", \"HIT\"}. Join returns \"HIT | HIT | HIT\"." },
        ],
      },

      // Section 6: Combat summary
      {
        type: "text",
        section: 6,
        content:
          "the lockmaster attacks in 6 turns. each turn tells you which tab to fix. aim.go, load.go, and fire.go are corrupted weapon package files — misspelled types, wrong operators, missing braces, and a wrong const value. main.go is your package main — you write the Combo function yourself.",
      },
      {
        type: "text",
        section: 6,
        content:
          "halfway through, the sector grid shifts +64 on each axis — update every coordinate in aim.go. remember: = not :=, || not &&, int not in, string not sting, Hit not \"FIRE\". good luck.",
      },
    ],
  },
};

// Each language's field-manual chapters, under the shared challenge ids.
const NOTES_BY_LANGUAGE: Record<LanguageId, Record<string, BeginnerNotes>> = {
  go: BEGINNER_NOTES,
  javascript: JAVASCRIPT_BEGINNER_NOTES,
  python: PYTHON_BEGINNER_NOTES,
  rust: RUST_BEGINNER_NOTES,
};

export function getBeginnerNotes(challengeId: string, language: LanguageId = "go"): BeginnerNotes | null {
  return NOTES_BY_LANGUAGE[language]?.[challengeId] ?? null;
}

export function getSectionCount(notes: BeginnerNotes): number {
  return getSectionCountFromBlocks(notes.blocks);
}

export function getSectionCountFromBlocks(blocks: NoteBlock[]): number {
  let max = 0;
  for (const block of blocks) {
    if (block.section > max) max = block.section;
  }
  return max + 1;
}
