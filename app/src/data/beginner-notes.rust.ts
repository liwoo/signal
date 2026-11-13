// ── Beginner Notes · Rust ──
// Reeves' "RUST: A Field Manual" chapters for Act I, under the shared
// challenge ids. Same shape as the Go notes (beginner-notes.ts) — `blocks` is
// the book (BookReader), `notesBlocks` is the in-game NOTES quick reference.
// No `beginnerBlocks` / diagram blocks: those animations are Go-specific.
// Names and wording agree with data/challenges/rust/act-1.ts + boss-01.ts.

import type { BeginnerNotes } from "./beginner-notes";

export const RUST_BEGINNER_NOTES: Record<string, BeginnerNotes> = {
  "chapter-01": {
    title: "RUST BASICS",
    subtitle: "WHAT YOU NEED FOR THIS LEVEL",
    blocks: [
      // Section 0: fn main + println!
      {
        type: "text",
        section: 0,
        content:
          "a rust program starts in one place: a function called main. rust runs whatever sits between its curly braces, top to bottom, and the program ends when main does. no main, no program — the compiler refuses to build it.",
      },
      {
        type: "code",
        section: 0,
        content: `fn main() {
    println!("Hello World");
}`,
        hotspots: [
          { text: "fn main()", tip: "fn declares a function. main is the special one — the entry point rust runs first. the empty brackets mean it takes nothing in." },
          { text: "{", tip: "the opening brace starts main's body. everything up to the matching closing brace belongs to main." },
          { text: "println!", tip: "prints a line to the terminal, then moves to a new line. it's always there — nothing to import." },
          { text: `"Hello World"`, tip: "a string — text in double quotes. single quotes are for one character, like 'a', not for text." },
          { text: ";", tip: "a semicolon ends the statement. leave it off and the compiler will point at the exact spot." },
        ],
      },
      {
        type: "text",
        section: 0,
        important: true,
        content:
          "println has an exclamation mark because it's a macro, not a plain function — a piece of code that writes more code for you before the program is built. you call it the same way, just with the bang: println!(...). without the bang, rust can't find it.",
      },
      {
        type: "text",
        section: 0,
        content:
          "rust checks the whole program before a single line runs. that's slower to start than some languages, but most mistakes get caught right there, with the line number and usually a suggested fix. read the compiler's message — it's trying to help.",
      },

      // Section 1: let + const
      {
        type: "text",
        section: 1,
        content:
          "let gives a value a name. rust works out the type on its own — text in quotes is a string, a whole number is an integer. use the name later and rust swaps the value in.",
      },
      {
        type: "code",
        section: 1,
        content: `fn main() {
    let cell = "B-09";  // text
    let sublevel = 3;   // a whole number

    println!("{}", cell);      // B-09
    println!("{}", sublevel);  // 3
}`,
        hotspots: [
          { text: `let cell = "B-09";`, tip: "creates the name cell for the text B-09. the statement ends with a semicolon, like every statement." },
          { text: "// text", tip: "a comment. rust ignores everything from // to the end of the line — it's a note for humans." },
          { text: `println!("{}", cell);`, tip: "{} is a slot in the text. rust fills it with the value that comes after the comma — here, B-09." },
        ],
      },
      {
        type: "text",
        section: 1,
        content:
          "some values should never change — maya's cell number, say. const locks a value for the whole program. a const always spells out its type after a colon, and its name is written in SCREAMING_CASE: capitals joined by underscores.",
      },
      {
        type: "code",
        section: 1,
        content: `const CELL: &str = "B-09";
const SUBLEVEL: u8 = 3;`,
        hotspots: [
          { text: "const CELL", tip: "a constant. it can never change while the program runs, and it can live outside main." },
          { text: "&str", tip: "the type of a piece of fixed text — a string slice. every string written in quotes is a &str." },
          { text: "u8", tip: "an unsigned 8-bit integer: a whole number from 0 to 255. plenty for a sublevel." },
        ],
      },

      // Section 2: mod + pub + ::
      {
        type: "text",
        section: 2,
        content:
          "the terminal ships a file called cellblock.rs that already holds maya's location. in rust, a separate file is a module, and your program only sees it once you declare it: mod cellblock; at the top. rust then loads cellblock.rs from beside your file.",
      },
      {
        type: "code",
        section: 2,
        content: `// cellblock.rs — shipped with the terminal
pub const CELL: &str = "B-09";
pub const SUBLEVEL: u8 = 3;`,
        hotspots: [
          { text: "pub", tip: "public. everything in a module is private unless it says pub — pub is what lets your file read these." },
        ],
      },
      {
        type: "code",
        section: 2,
        content: `mod cellblock;

fn main() {
    println!("{}", cellblock::CELL);      // B-09
    println!("{}", cellblock::SUBLEVEL);  // 3
}`,
        hotspots: [
          { text: "mod cellblock;", tip: "declares the module. rust finds cellblock.rs next to your file and brings it in under the name cellblock." },
          { text: "cellblock::CELL", tip: "a path: module name, two colons, the item you want. :: means \"the CELL that lives inside cellblock\"." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "read the values from cellblock — don't type B-09 yourself. the terminal checks that your program actually asks the module through cellblock::CELL and cellblock::SUBLEVEL, so a typed-in answer won't open anything.",
      },

      // Section 3: format strings
      {
        type: "text",
        section: 3,
        content:
          "the terminal wants one line: CELL B-09 - SUBLEVEL 3. println! can mix text and values in one go. write the text with a {} wherever a value belongs, then list the values after it, in order, separated by commas.",
      },
      {
        type: "code",
        section: 3,
        content: `mod cellblock;

fn main() {
    println!("CELL {} - SUBLEVEL {}", cellblock::CELL, cellblock::SUBLEVEL);
    // CELL B-09 - SUBLEVEL 3
}`,
        hotspots: [
          { text: `"CELL {} - SUBLEVEL {}"`, tip: "the format string. two {} slots, so println! expects exactly two values after it." },
          { text: "cellblock::CELL, cellblock::SUBLEVEL", tip: "the values, in order: the first fills the first {}, the second fills the second. numbers turn into text on their own." },
        ],
      },
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "the number of {} slots has to match the number of values. one too many or one too few and rust won't build the program — it counts them for you before anything runs.",
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "every program starts in main. println! is a macro — keep the bang." },
      {
        type: "code",
        section: 0,
        content: `fn main() {
    println!("Hello World");
}`,
      },
      { type: "text", section: 1, content: "name a value, or lock it." },
      {
        type: "code",
        section: 1,
        content: `let cell = "B-09";          // a variable
const SUBLEVEL: u8 = 3;     // a constant, type required`,
      },
      { type: "text", section: 2, content: "use another file's values." },
      {
        type: "code",
        section: 2,
        content: `mod cellblock;      // loads cellblock.rs

cellblock::CELL     // B-09`,
      },
      { type: "text", section: 3, content: "drop values into text — one {} per value." },
      { type: "code", section: 3, content: `println!("CELL {}", cellblock::CELL);   // CELL B-09` },
    ],
  },

  "chapter-02": {
    title: "LOOPS & BRANCHES",
    subtitle: "CONTROLLING THE FLOW",
    blocks: [
      // Section 0: scaffold recap
      {
        type: "text",
        section: 0,
        content:
          "same skeleton as last time: fn main, and inside it one println!. the keypad needs a loop, but first get its terminal live with the program you already know.",
      },
      {
        type: "code",
        section: 0,
        content: `fn main() {
    println!("Hello World");
}`,
        hotspots: [
          { text: `println!("Hello World");`, tip: "the whole job for now. once the terminal answers, the keypad listens." },
        ],
      },

      // Section 1: for + ranges
      {
        type: "text",
        section: 1,
        content:
          "the keypad cycles codes 1 to 10. a for loop repeats the same lines once for every value you hand it. a range makes the values: 1..=10 counts 1, 2, 3 ... up to and including 10.",
      },
      {
        type: "code",
        section: 1,
        content: `fn main() {
    for i in 1..=10 {
        println!("{}", i);
    }
}`,
        hotspots: [
          { text: "for i in", tip: "each pass, rust puts the next value in i and runs the body. i is just a name — short is fine for a counter." },
          { text: "1..=10", tip: "a range from 1 up to AND including 10. the = is what lets it reach 10." },
          { text: `println!("{}", i);`, tip: "inside the braces, so it runs ten times, once per number." },
        ],
      },
      {
        type: "text",
        section: 1,
        important: true,
        content:
          "two dots without the equals sign stop BEFORE the end: 1..10 gives 1 to 9 and never reaches 10 — the classic off-by-one. 0..4 is 0, 1, 2, 3: four passes. to include the end, write ..=",
      },
      {
        type: "text",
        section: 1,
        content:
          "the loop's body lives inside curly braces, like main's does. indent it four spaces so you can see what belongs where — rust doesn't need the indent, but every rust programmer writes it, and the formatter puts it there for you.",
      },

      // Section 2: if / else if / else
      {
        type: "text",
        section: 2,
        content:
          "next the keypad sorts each code into an access level:\n\ncodes 1-3 → DENY\ncodes 4-6 → WARN\ncodes 7-9 → GRANT\ncode 10 → OVERRIDE\n\nif, else if and else pick one path. rust checks them top to bottom and runs only the first one that's true.",
      },
      {
        type: "code",
        section: 2,
        content: `fn main() {
    for i in 1..=10 {
        if i <= 3 {
            println!("{} DENY", i);
        } else if i <= 6 {
            println!("{} WARN", i);
        } else if i <= 9 {
            println!("{} GRANT", i);
        } else {
            println!("{} OVERRIDE", i);
        }
    }
}`,
        hotspots: [
          { text: "if i <= 3 {", tip: "<= means less than or equal to. true for 1, 2 and 3. no brackets around the condition — just the braces after it." },
          { text: "} else if i <= 6 {", tip: "only checked when the if above was false, so it catches just 4, 5 and 6." },
          { text: "} else if i <= 9 {", tip: "only reached when i is above 6 — catches 7, 8 and 9." },
          { text: "} else {", tip: "no condition. runs when nothing above matched — here, only code 10." },
          { text: `println!("{} DENY", i);`, tip: "the {} takes the number, the word is plain text: 1 DENY." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "every branch needs its braces, even when it's one line — rust won't take an if without them. and the condition has to be a real true or false: rust never treats a number as true.",
      },

      // Section 3: the rewrite — match on ranges
      {
        type: "text",
        section: 3,
        content:
          "the redundancy step wants the same answers built a second way. look at the chain — every branch just picks a word. rust has a tool made for exactly that: match. it checks one value against a list of patterns, top to bottom, and runs the arm of the first pattern that fits.",
      },
      {
        type: "code",
        section: 3,
        content: `fn main() {
    for i in 1..=10 {
        let level = match i {
            1..=3 => "DENY",
            4..=6 => "WARN",
            7..=9 => "GRANT",
            _ => "OVERRIDE",
        };
        println!("{} {}", i, level);
    }
}`,
        hotspots: [
          { text: "match i {", tip: "match takes the value of i and compares it against each pattern below, in order." },
          { text: `1..=3 => "DENY",`, tip: "one arm: a pattern, an arrow, the result. a range works as a pattern — this arm catches 1, 2 and 3." },
          { text: `_ => "OVERRIDE",`, tip: "the underscore matches anything. it's the catch-all, so code 10 lands here." },
          { text: "let level = match", tip: "a match is an expression — it hands back a value. the word from the winning arm lands in level." },
          { text: "};", tip: "the semicolon closes the let statement, after the match's closing brace." },
        ],
      },
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "a match has to cover every possible value. i is an integer, so it could be anything — 0, 11, a million. drop the _ arm and rust refuses to build, because some numbers would fall through. the catch-all is what makes it complete.",
      },

      // Section 4: zen recap
      {
        type: "text",
        section: 4,
        content:
          "three habits for this level. let the range do the counting, and say ..= when you mean to include the end. order your else if conditions so each one only catches what's left. and when every branch just picks a value, a match on ranges says it shorter. the keypad expects:\n\n1 DENY, 2 DENY, 3 DENY, 4 WARN, 5 WARN, 6 WARN, 7 GRANT, 8 GRANT, 9 GRANT, 10 OVERRIDE",
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "count — ..= includes the end, .. stops before it." },
      {
        type: "code",
        section: 0,
        content: `for i in 1..=10 {   // 1 to 10
    println!("{}", i);
}`,
      },
      { type: "text", section: 1, content: "branch — the first true condition wins." },
      {
        type: "code",
        section: 1,
        content: `if i <= 3 {
    println!("{} DENY", i);   // 1 DENY
} else if i <= 6 {
    println!("{} WARN", i);
} else {
    println!("{} GRANT", i);
}`,
      },
      { type: "text", section: 2, content: "match — one arm per pattern, _ catches the rest." },
      {
        type: "code",
        section: 2,
        content: `let level = match i {
    1..=3 => "DENY",
    _ => "OVERRIDE",
};`,
      },
    ],
  },

  "chapter-03": {
    title: "FUNCTIONS",
    subtitle: "BUILDING BLOCKS",
    blocks: [
      // Section 0: scaffold recap
      {
        type: "text",
        section: 0,
        content:
          "same start: get the junction panel live with Hello World. then you'll write functions of your own — main is already one. a function is named code you can run again whenever you need it. reeves' margin note says it best: a function is a door you can open twice.",
      },
      {
        type: "code",
        section: 0,
        content: `fn main() {
    println!("Hello World");
}`,
      },

      // Section 1: fn + params + return value
      {
        type: "text",
        section: 1,
        content:
          "fn makes a function. give it a name, list what it takes in the brackets — each one a name, a colon and a type — then an arrow and the type it hands back.",
      },
      {
        type: "code",
        section: 1,
        content: `fn double(n: i32) -> i32 {
    n * 2
}

fn main() {
    println!("{}", double(4));   // 8
    println!("{}", double(21));  // 42
}`,
        hotspots: [
          { text: "fn double(n: i32)", tip: "fn, the name, then the parameters. n is a name for whatever the caller passes in, and i32 says it's a whole number." },
          { text: "-> i32", tip: "the arrow says what comes back. this function always hands back an i32." },
          { text: "    n * 2", tip: "no semicolon. the last expression in a function, with no semicolon after it, is the value it returns." },
          { text: "double(4)", tip: "calling the function: n becomes 4, and the call is replaced by 8." },
        ],
      },
      {
        type: "text",
        section: 1,
        important: true,
        content:
          "that missing semicolon matters. n * 2 hands the value back; n * 2; throws it away, and rust complains that the function returns nothing. you can also write return n * 2; — it works, but rust programmers save return for leaving early.",
      },
      {
        type: "text",
        section: 1,
        content:
          "rust names functions in snake_case: lowercase words joined by underscores. sum_codes, not sumCodes. a function can sit above or below main — rust reads the whole file before it runs anything.",
      },

      // Section 2: slices + let mut
      {
        type: "text",
        section: 2,
        content:
          "each junction sends a different number of codes — four at one, three at the next. rust functions take a fixed number of parameters; there's no \"any number of arguments\". so you pass one thing that holds them all: a slice. &[i32] means \"a view of some i32s, however many there are\".",
      },
      {
        type: "code",
        section: 2,
        content: `fn sum_codes(codes: &[i32]) -> i32 {
    let mut total = 0;
    for c in codes {
        total += c;
    }
    total
}

fn main() {
    println!("{}", sum_codes(&[25, 30, 50, 10]));  // 115
    println!("{}", sum_codes(&[1, 2, 3]));         // 6
}`,
        hotspots: [
          { text: "codes: &[i32]", tip: "a slice of i32s. the & means the function borrows the numbers to read them — it doesn't take them over." },
          { text: "let mut total = 0;", tip: "mut makes the variable changeable. rust variables are frozen by default — without mut, total += c won't compile." },
          { text: "for c in codes {", tip: "the same for you used with ranges — but now it walks the slice, one value at a time." },
          { text: "total += c;", tip: "adds c to what's already in total. short for total = total + c." },
          { text: "&[25, 30, 50, 10]", tip: "square brackets make the numbers, the & lends them to the function as a slice." },
        ],
      },
      {
        type: "text",
        section: 2,
        important: true,
        content:
          "let makes a name that can't change. let mut makes one that can. rust asks you to say which, so nothing changes behind your back — when you see mut, you know to watch that value.",
      },
      {
        type: "text",
        section: 2,
        content:
          "slices can also add themselves up: codes.iter().sum() walks the numbers and totals them in one line. the whole body can be that one expression — either version opens the junction.",
      },

      // Section 3: tuples + destructuring
      {
        type: "text",
        section: 3,
        content:
          "the junction also needs to know if the codes pass: is the total over 100? a function can hand back two values at once inside a tuple — a fixed group of values in round brackets. its type lists each part: (i32, bool). the caller takes it apart again with let and matching brackets.",
      },
      {
        type: "code",
        section: 3,
        content: `fn sum_codes(codes: &[i32]) -> i32 {
    codes.iter().sum()
}

fn validate_code(codes: &[i32]) -> (i32, bool) {
    let total = sum_codes(codes);
    (total, total > 100)
}

fn main() {
    let (s, v) = validate_code(&[25, 30, 50, 10]);
    println!("Result: {}, Valid: {}", s, v);
    // Result: 115, Valid: true
}`,
        hotspots: [
          { text: "-> (i32, bool)", tip: "the return type is a tuple: a number and a yes-or-no, in that order." },
          { text: "let total = sum_codes(codes);", tip: "reuse what you built. codes is already a slice, so pass it straight through — no & needed again." },
          { text: "(total, total > 100)", tip: "build the tuple and hand it back — no semicolon, so it's the return value." },
          { text: "let (s, v) =", tip: "destructuring. s gets the first part, v the second. the pattern has to have the same shape as the tuple." },
        ],
      },
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "a comparison is already a yes-or-no value — a bool. total > 100 is either true or false, and rust prints them in lowercase. you don't need an if to produce it.",
      },

      // Section 4: zen recap
      {
        type: "text",
        section: 4,
        content:
          "four habits for this level. name functions in snake_case. keep each one to a single job — sum_codes sums, validate_code checks, neither prints. reuse what you built instead of writing the adding twice. and hand back a comparison directly instead of wrapping it in if and else.",
      },
      {
        type: "code",
        section: 4,
        content: `// direct — clean
(total, total > 100)

// wrapped — works, but four extra lines
if total > 100 {
    (total, true)
} else {
    (total, false)
}`,
        hotspots: [
          { text: "(total, total > 100)", tip: "the comparison already is the bool. hand it back as it is." },
          { text: "(total, true)", tip: "works, but the if and else spell out what the comparison already says." },
        ],
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "a function — typed params in, -> type out. last line, no semicolon, is the result." },
      {
        type: "code",
        section: 0,
        content: `fn double(n: i32) -> i32 {
    n * 2
}

double(4)   // 8`,
      },
      { type: "text", section: 1, content: "a slice — any number of values, passed as one." },
      {
        type: "code",
        section: 1,
        content: `fn sum_codes(codes: &[i32]) -> i32 {
    let mut total = 0;
    for c in codes {
        total += c;
    }
    total
}

sum_codes(&[1, 2, 3])   // 6`,
      },
      { type: "text", section: 2, content: "two values out as a tuple, taken apart with let." },
      {
        type: "code",
        section: 2,
        content: `fn validate_code(codes: &[i32]) -> (i32, bool) {
    let total = sum_codes(codes);
    (total, total > 100)
}

let (s, v) = validate_code(&[60, 50]);   // 110, true`,
      },
    ],
  },

  "boss-01": {
    title: "WEAPON SYSTEMS",
    subtitle: "RUST SURVIVAL GUIDE FOR THE LOCKMASTER",
    blocks: [
      // Section 0: tactics
      {
        type: "text",
        section: 0,
        content:
          "the lockmaster fights in real time. your weapon fires on its own whenever you have a clear line to it and it's in range. its shots cost hearts and land where you're standing, so keep moving. a server rack between you breaks its line of sight — and yours.",
      },
      {
        type: "text",
        section: 0,
        important: true,
        content:
          "when it hardens and your weapon goes cold, duck to a lit pad. the fight freezes while you're in cover. fix the weapon, rearm, step back out. three covers, three upgrades — every one built from what you already know.",
      },

      // Section 1: sight — let + println!
      {
        type: "text",
        section: 1,
        content:
          "first cover: sight. a cold weapon is useless. give it damage 12, fire rate 500 and range 6, then print the spec line. three lets and one println! — chapter one.",
      },
      {
        type: "code",
        section: 1,
        content: `fn main() {
    let damage = 12;
    let fire_rate = 500;
    let reach = 6;
    println!("DMG {} RATE {} RANGE {}", damage, fire_rate, reach);
    // DMG 12 RATE 500 RANGE 6
}`,
        hotspots: [
          { text: "let damage = 12;", tip: "the starter sets every trait to 0. change the value, keep the name." },
          { text: `"DMG {} RATE {} RANGE {}"`, tip: "three {} slots, three values after the comma, filled in order." },
        ],
      },

      // Section 2: charge — counting loop + let mut
      {
        type: "text",
        section: 2,
        content:
          "second cover: charge. single shots stop landing, so overclock the rate: loop over the four capacitors, adding 90 each pass. chapter two's loop, building a total — and since the total changes, it has to be let mut.",
      },
      {
        type: "code",
        section: 2,
        content: `fn main() {
    let mut rate = 0;
    for _ in 0..4 {
        rate += 90;
    }
    println!("{}", rate);   // 360
}`,
        hotspots: [
          { text: "let mut rate = 0;", tip: "mut, because the loop keeps changing it. the starter already has it." },
          { text: "for _ in 0..4 {", tip: "0..4 stops before 4: 0, 1, 2, 3 — four passes, not five. _ means \"i don't need the number, just the passes\"." },
          { text: "rate += 90;", tip: "adds to what's already there. rate = 90; would just overwrite it four times and leave 90." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "the starter's loop body holds only a comment, so the loop runs four times and does nothing. replace the comment with rate += 90; — semicolon included.",
      },

      // Section 3: combo — a fn over a slice
      {
        type: "text",
        section: 3,
        content:
          "last cover: combo. sum the three modules into one overload shot. combo has the same shape as sum_codes from chapter three — it takes a slice, walks it, and adds each module to total. the last line, total with no semicolon, hands the sum back.",
      },
      {
        type: "code",
        section: 3,
        content: `fn combo(mods: &[i32]) -> i32 {
    let mut total = 0;
    for m in mods {
        total += m;
    }
    total
}

fn main() {
    let damage = combo(&[8, 7, 7]);
    println!("DMG {} RATE {} RANGE {}", damage, 260, 8);
    // DMG 22 RATE 260 RANGE 8
}`,
        hotspots: [
          { text: "mods: &[i32]", tip: "combo(&[8, 7, 7]) lends it the three modules as a slice." },
          { text: "for m in mods {", tip: "walk the modules one at a time and add each one in." },
        ],
      },

      // Section 4: recap
      {
        type: "text",
        section: 4,
        content:
          "three things carry you through: one {} per value in println!. a range with two dots stops before its end. a value that changes needs let mut. keep moving, take cover when it hardens, and end it.",
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "cold weapon → lit pad → fight freezes → fix → rearm." },
      { type: "text", section: 1, content: "sight — set three values, print the spec." },
      { type: "code", section: 1, content: `println!("DMG {} RATE {} RANGE {}", damage, fire_rate, reach);` },
      { type: "text", section: 2, content: "charge — 0..4 is four passes. the total needs mut." },
      {
        type: "code",
        section: 2,
        content: `let mut rate = 0;
for _ in 0..4 {
    rate += 90;   // 360
}`,
      },
      { type: "text", section: 3, content: "combo — sum every module in the slice." },
      {
        type: "code",
        section: 3,
        content: `fn combo(mods: &[i32]) -> i32 {
    mods.iter().sum()
}`,
      },
    ],
  },
};
