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
  },

  "boss-01": {
    title: "WEAPON SYSTEMS",
    subtitle: "HOW TO FIGHT THE LOCKMASTER",
    blocks: [
      // Section 0: Combat overview
      {
        type: "text",
        section: 0,
        content:
          "this is a boss fight. the lockmaster attacks in turns — each turn it telegraphs what it's doing and you have a few seconds to write code and hit RUN (or ctrl+enter). you have 3 weapon tabs: aim, load, and fire. each tab has one function you need to complete.",
      },
      {
        type: "text",
        section: 0,
        content:
          "every turn, the game tells you which tab to focus on. your functions all run together as one program — aim feeds coordinates to fire, load feeds ammo to fire. miss a turn and you take damage. lose all hearts and it's over.",
      },
      {
        type: "code",
        section: 0,
        content: `// AIM tab — returns x, y coordinates
func Aim(sector int) (int, int)

// LOAD tab — returns ammo sequence
func Load(threat string) []string

// FIRE tab — combines aim + load
func Fire(x, y int, ammo []string) string`,
        hotspots: [
          { text: "func Aim(sector int) (int, int)", tip: "takes a sector number (1-9), returns pixel coordinates. two return values — (x, y)." },
          { text: "func Load(threat string) []string", tip: "takes a threat type like \"shield\" or \"armor\", returns a slice of ammo strings." },
          { text: "func Fire(x, y int, ammo []string) string", tip: "takes coordinates + ammo, returns a result string. this is where aim and load come together." },
        ],
      },

      // Section 1: Aim — sector grid
      {
        type: "text",
        section: 1,
        content:
          "the lockmaster's systems are laid out on a 3x3 sector grid. each sector maps to fixed pixel coordinates. when the game says \"sector 3\", you return the x,y for that position. use if/else or a slice to map sectors to coordinates.",
      },
      {
        type: "code",
        section: 1,
        content: `// the sector grid:
//   1=(128,160)  2=(256,160)  3=(384,160)
//   4=(128,320)  5=(256,320)  6=(384,320)
//   7=(128,480)  8=(256,480)  9=(384,480)

func Aim(sector int) (int, int) {
    if sector == 1 {
        return 128, 160
    }
    if sector == 2 {
        return 256, 160
    }
    // ... handle all 9 sectors
    return 0, 0
}`,
        hotspots: [
          { text: "(int, int)", tip: "multiple return values — go lets functions return more than one thing. the caller uses x, y := Aim(3)." },
          { text: "return 128, 160", tip: "returning two values at once. no parentheses needed around the values." },
          { text: "return 0, 0", tip: "fallback for unknown sectors. guard clause — if the sector isn't valid, return zeros." },
          { text: "sector == 1", tip: "each sector maps to a fixed pair of coordinates. you could also use a switch statement." },
        ],
      },

      // Section 2: Load — threat types and slices
      {
        type: "text",
        section: 2,
        content:
          "different threats need different ammo. a shield needs 3 piercing rounds. armor needs 2 blast rounds. an exposed core needs 1 pulse. Load returns a slice of strings — the ammo sequence.",
      },
      {
        type: "code",
        section: 2,
        content: `// threat → ammo mapping:
//   "shield"  → 3x "pierce"
//   "armor"   → 2x "blast"
//   "exposed" → 1x "pulse"

func Load(threat string) []string {
    if threat == "shield" {
        return []string{"pierce", "pierce", "pierce"}
    }
    if threat == "armor" {
        return []string{"blast", "blast"}
    }
    if threat == "exposed" {
        return []string{"pulse"}
    }
    return []string{}
}`,
        hotspots: [
          { text: "[]string{\"pierce\", \"pierce\", \"pierce\"}", tip: "a slice literal with 3 elements. the brackets define the type, the braces define the values." },
          { text: "return []string{}", tip: "empty slice — no ammo for unknown threats. never return nil when the caller expects a slice." },
          { text: "threat == \"shield\"", tip: "string comparison in go uses ==. the threat type comes from the boss's telegraph message." },
        ],
      },

      // Section 3: Fire — wiring it together
      {
        type: "text",
        section: 3,
        content:
          "fire is where everything connects. the test harness calls Aim to get coordinates, Load to get ammo, and passes both to Fire. your fire function validates the inputs and returns a result. when everything works: return \"HIT\".",
      },
      {
        type: "code",
        section: 3,
        content: `// how the test harness calls your code:
func main() {
    x, y := Aim(5)
    ammo := Load("armor")
    result := Fire(x, y, ammo)
    fmt.Println(result)
}

// Fire needs to return "HIT" when inputs are valid
func Fire(x, y int, ammo []string) string {
    if x == 0 || y == 0 {
        return "NO TARGET"
    }
    if len(ammo) == 0 {
        return "NO AMMO"
    }
    return "HIT"
}`,
        hotspots: [
          { text: "x, y := Aim(5)", tip: "multiple assignment — captures both return values from Aim. this is how go handles functions that return multiple values." },
          { text: "ammo := Load(\"armor\")", tip: "ammo is a []string. the Load function decides what goes in it based on the threat." },
          { text: "Fire(x, y, ammo)", tip: "all three weapon systems wired together. aim → coordinates. load → ammo. fire → result." },
          { text: "return \"HIT\"", tip: "when coordinates are valid and ammo is loaded, fire returns \"HIT\". this is what the boss fight checks for." },
        ],
      },

      // Section 4: Grid shift
      {
        type: "text",
        section: 4,
        content:
          "halfway through the fight, the lockmaster reroutes — the sector grid shifts by +64 on each axis. you need to update your Aim function to handle the new coordinates. this tests whether your code can adapt under pressure.",
      },
      {
        type: "code",
        section: 4,
        content: `// shifted grid (+64 on each axis):
//   1=(192,224)  2=(320,224)  3=(448,224)
//   4=(192,384)  5=(320,384)  6=(448,384)
//   7=(192,544)  8=(320,544)  9=(448,544)

// update your Aim to use the new values
func Aim(sector int) (int, int) {
    if sector == 5 {
        return 320, 384   // was 256, 320
    }
    // ...
}`,
        hotspots: [
          { text: "+64 on each axis", tip: "every x gets +64 and every y gets +64. 128→192, 256→320, 384→448, etc." },
          { text: "return 320, 384   // was 256, 320", tip: "sector 5 used to be (256,320). now it's (320,384). the pattern holds for all 9 sectors." },
        ],
      },
      {
        type: "text",
        section: 4,
        content:
          "the lockmaster tests everything you've learned: functions, multiple returns, slices, string comparison, and adapting under time pressure. read the telegraph, check the active tab, write your code, hit run. good luck.",
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
