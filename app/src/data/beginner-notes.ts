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
  important?: boolean;  // renders with accent border + icon for key concepts
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
  let max = 0;
  for (const block of notes.blocks) {
    if (block.section > max) max = block.section;
  }
  return max + 1;
}
