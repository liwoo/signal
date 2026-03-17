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

    // ── Beginner Mode: visual-first, analogy-driven ──
    // Flow: Animation (section 0) → Package Card (section 1) → Code Recap (section 2) → Start Level
    beginnerBlocks: [
      // Section 0: Watch the program run — step-by-step animation
      {
        type: "diagram",
        diagramId: "ch01-animation",
        content: "",
        section: 0,
      },

      // Section 1: The Package Card — interactive physical analogy
      {
        type: "diagram",
        diagramId: "ch01-card",
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
    // Flow: Animation (section 0) → Card (section 1) → Code Recap (section 2) → Start Level
    beginnerBlocks: [
      // Section 0: Watch the keypad programme run — revolving door + sorting station
      {
        type: "diagram",
        diagramId: "ch02-animation",
        content: "",
        section: 0,
      },

      // Section 1: The interactive card — sealed folder + revolving door + sorting station
      {
        type: "diagram",
        diagramId: "ch02-card",
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

import (
    "fmt"
)

func main() {
    fmt.Println("ready")
}`,
        hotspots: [
          { text: "package main", tip: "every go executable starts with this. the shaft panel needs it." },
          { text: `import (
    "fmt"
)`, tip: "grouped import with parentheses — even for one package. this is the idiomatic go way. it makes adding more imports later a clean one-line diff." },
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

export function getBeginnerNotes(challengeId: string): BeginnerNotes | null {
  return BEGINNER_NOTES[challengeId] ?? null;
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
