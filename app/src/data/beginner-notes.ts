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
    title: "PATTERN ANALYSIS",
    subtitle: "EVERYTHING YOU NEED FOR THE LOCKMASTER",
    blocks: [
      // Section 0: Program structure recap
      {
        type: "text",
        section: 0,
        content:
          "every go program needs the same skeleton — package, import, functions, main. the lockmaster is no different. get the structure right first, then solve the puzzle.",
      },
      {
        type: "code",
        section: 0,
        content: `package main

import "fmt"

func predictNext(codes []int) int {
    // your logic here
    return 0
}

func main() {
    codes := []int{100, 200, 300}
    fmt.Println(predictNext(codes))
}`,
        hotspots: [
          { text: "func predictNext(codes []int) int", tip: "a function that takes a slice of ints and returns one int. this is the interface the lock controller expects." },
          { text: "[]int", tip: "slice of ints — a dynamic-length list of integers. the lock controller feeds you the visible codes." },
          { text: "return 0", tip: "placeholder — you'll replace this with actual logic. every code path in the function must return an int." },
          { text: "predictNext(codes)", tip: "calling your function from main. the result gets printed." },
        ],
      },

      // Section 1: Slices and len()
      {
        type: "text",
        section: 1,
        content:
          "the lock controller gives you a slice of codes. you need to walk through it, compare elements, and find the pattern. len() tells you how many elements you have — never assume the count.",
      },
      {
        type: "code",
        section: 1,
        content: `codes := []int{102847, 104694, 106541}

// how many codes?
n := len(codes)

// access first and last
first := codes[0]
last := codes[n-1]

// loop through pairs
for i := 1; i < n; i++ {
    diff := codes[i] - codes[i-1]
    fmt.Println(diff)
}`,
        hotspots: [
          { text: "len(codes)", tip: "built-in function. returns the count. use it — don't hardcode 3 or any number." },
          { text: "codes[n-1]", tip: "last element. n is the length, so n-1 is the last valid index." },
          { text: "i := 1; i < n", tip: "start at 1 (not 0) because we compare codes[i] with codes[i-1]. avoids out-of-bounds." },
          { text: "codes[i] - codes[i-1]", tip: "the difference between consecutive elements. this is how you detect a pattern — compute all the deltas." },
        ],
      },

      // Section 2: Computing deltas
      {
        type: "text",
        section: 2,
        content:
          "the key to pattern detection: compute the difference (delta) between each consecutive pair. if all deltas are the same, the pattern is linear — just add the delta to the last code.",
      },
      {
        type: "code",
        section: 2,
        content: `// compute first delta
delta := codes[1] - codes[0]

// check if all deltas match
allSame := true
for i := 2; i < len(codes); i++ {
    if codes[i] - codes[i-1] != delta {
        allSame = false
    }
}

// if linear, predict the next
if allSame {
    return codes[len(codes)-1] + delta
}`,
        hotspots: [
          { text: "delta := codes[1] - codes[0]", tip: "give the difference a descriptive name — 'delta' tells the reader exactly what this value represents." },
          { text: "allSame := true", tip: "a flag that starts true. any mismatch flips it to false. clean pattern for checking consistency." },
          { text: "codes[i] - codes[i-1] != delta", tip: "compare each gap to the first one. if any differ, the pattern isn't linear." },
          { text: "codes[len(codes)-1] + delta", tip: "last code plus the constant delta. that's the prediction for a linear sequence." },
        ],
      },

      // Section 3: Guard clauses and early returns
      {
        type: "text",
        section: 3,
        content:
          "good go functions handle edge cases first with guard clauses — short if statements at the top that return early. this keeps the main logic clean and unindented.",
      },
      {
        type: "code",
        section: 3,
        content: `func predictNext(codes []int) int {
    // guard: need at least 2 codes to find a pattern
    if len(codes) < 2 {
        return 0
    }

    // now the main logic can assume len >= 2
    delta := codes[1] - codes[0]
    // ...
}`,
        hotspots: [
          { text: "if len(codes) < 2 {", tip: "guard clause — check the edge case and return immediately. don't nest the main logic inside an else." },
          { text: "return 0", tip: "early return. can't detect a pattern with fewer than 2 codes. exit fast." },
          { text: "// now the main logic", tip: "after the guard, you can safely assume the input is valid. no extra indentation needed." },
        ],
      },

      // Section 4: Naming and clarity
      {
        type: "text",
        section: 4,
        content:
          "name your variables for what they mean, not what they are. delta instead of d. codes instead of arr. go values clarity — a good name is the best documentation.",
      },
      {
        type: "code",
        section: 4,
        content: `// unclear
d := a[1] - a[0]

// clear — intent is visible
delta := codes[1] - codes[0]`,
        hotspots: [
          { text: "d := a[1] - a[0]", tip: "what is 'a'? what is 'd'? this compiles but it doesn't communicate." },
          { text: "delta := codes[1] - codes[0]", tip: "delta — the difference. codes — the input sequence. the reader knows exactly what's happening." },
        ],
      },
      {
        type: "text",
        section: 4,
        content:
          "the lockmaster tests everything you've learned: program structure, slices, loops, conditionals, functions, and clean code. scaffold first. solve second. good luck.",
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
