// ── Beginner Notes · Rust ──
// Reeves' "RUST: A Field Manual" chapters (and Kira's loose pages for Act III),
// under the shared challenge ids. Same shape as the Go notes (beginner-notes.ts)
// — `blocks` is the book (BookReader), `notesBlocks` is the in-game NOTES quick
// reference. No `beginnerBlocks` / diagram blocks: those animations are
// Go-specific. Names and wording agree with data/challenges/rust/act-1.ts,
// boss-01.ts, act-2.ts and act-3.ts.

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

  // ── Act II ──

  "chapter-04": {
    title: "HASHMAPS & SETS",
    subtitle: "KEYS, VALUES, AND WHO'S WHERE",
    blocks: [
      // Section 0: scaffold
      {
        type: "text",
        section: 0,
        content:
          "same first line as always: wake the surveillance terminal with Hello World. no use line yet — the roster arrives in the next step, and that's when you bring in what it needs.",
      },
      {
        type: "code",
        section: 0,
        content: `fn main() {
    println!("Hello World");
}`,
      },

      // Section 1: use + HashMap::from + lookup
      {
        type: "text",
        section: 1,
        content:
          "a hashmap pairs keys with values. each guard's name is a key, their floor is the value. ask for a name and it jumps straight to the floor — no searching. it lives in the standard library, so bring it in by name first, with a use line at the top of the file.",
      },
      {
        type: "code",
        section: 1,
        content: `use std::collections::HashMap;

fn main() {
    let guards = HashMap::from([
        ("Chen", "Floor 1"),
        ("Volkov", "Floor 2"),
        ("Park", "Floor 3"),
    ]);

    println!("{}", guards["Volkov"]);  // Floor 2
    println!("{}", guards.len());      // 3
}`,
        hotspots: [
          { text: "use std::collections::HashMap;", tip: "a use line. HashMap lives in std, the standard library, under collections. after this line you can just say HashMap." },
          { text: "HashMap::from([", tip: "builds the whole map in one go from a list of pairs in square brackets. :: again — the from that belongs to HashMap." },
          { text: `("Chen", "Floor 1"),`, tip: "one pair, as a tuple: the key first, the value second. the same round brackets that handed back two values in chapter three." },
          { text: `guards["Volkov"]`, tip: "a lookup. square brackets with a key hand back its value." },
          { text: "guards.len()", tip: "a method — a function you call on a value with a dot. len counts the pairs." },
        ],
      },
      {
        type: "text",
        section: 1,
        content:
          "with more than a couple of pairs, give each its own line and end every line with a comma, even the last one. add a guard later and only one line changes.",
      },
      {
        type: "text",
        section: 1,
        important: true,
        content:
          "each key appears once. write the same name twice and the map keeps the last value without a word — and len comes up one short. and guards[\"Nobody\"] doesn't hand back nothing: the program panics, stopping dead with an error. for a name that might not be there, ask with get.",
      },

      // Section 2: get + Option
      {
        type: "text",
        section: 2,
        content:
          "get answers a question rust takes seriously: is it there at all? it hands back an Option — Some(value) when the key exists, None when it doesn't. you can't use the floor until you've opened the Option, and match is how you open it: one arm for each case.",
      },
      {
        type: "code",
        section: 2,
        content: `use std::collections::HashMap;

fn main() {
    let guards = HashMap::from([("Chen", "Floor 1")]);

    match guards.get("Chen") {
        Some(floor) => println!("Chen is on {}", floor),
        None => println!("no such guard"),
    }
    // Chen is on Floor 1
}`,
        hotspots: [
          { text: `guards.get("Chen")`, tip: "asks without risk. Some(floor) if Chen is on the roster, None if not — never a crash." },
          { text: "Some(floor) =>", tip: "the pattern takes the Option apart. if there's a value inside, it's named floor for this arm." },
          { text: "None =>", tip: "the empty case. match won't build until you've handled it — the same rule that made the keypad need its _ arm." },
        ],
      },
      {
        type: "text",
        section: 2,
        important: true,
        content:
          "rust has no null — no value that quietly means nothing and blows up when you touch it. a value that might be missing says so in its type, Option, and the compiler makes you deal with the missing case before you use what's inside. you'll meet Option on every page from here.",
      },

      // Section 3: returning a HashMap
      {
        type: "text",
        section: 3,
        content:
          "the terminal won't read a map you leave lying around in main. it calls build_roster and looks guards up in whatever comes back. the return type spells out what the map holds, in angle brackets: the key's type, then the value's.",
      },
      {
        type: "code",
        section: 3,
        content: `use std::collections::HashMap;

fn build_roster() -> HashMap<&'static str, &'static str> {
    HashMap::from([
        ("Chen", "Floor 1"),
        ("Alvarez", "Floor 2"),
        ("Volkov", "Floor 2"),
        ("Park", "Floor 3"),
        ("Santos", "Floor 1"),
    ])
}

fn main() {
    let r = build_roster();
    println!("{}", r["Chen"]);  // Floor 1
}`,
        hotspots: [
          { text: "fn build_roster()", tip: "empty brackets — it needs nothing from the caller. the roster is the same every time." },
          { text: "HashMap<&'static str, &'static str>", tip: "a map from text to text. &'static str is text that lives as long as the program does." },
          { text: "let r = build_roster();", tip: "the caller gets the whole map back and can look anyone up." },
        ],
      },
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "'static is a lifetime — how long borrowed text stays valid. text typed in quotes is baked into the program, so it lasts as long as the program does. a function handing back borrowed text has to say how long it lasts, and for literals the answer is forever. and no semicolon after HashMap::from(...): it's the last expression, so it's the return value.",
      },

      // Section 4: values() + HashSet
      {
        type: "text",
        section: 4,
        content:
          "to find an empty floor, first collect every floor that has a guard. values() walks just the floors and skips the names. then a HashSet — a map with keys and no values. it holds each thing once, drops the repeats, and answers contains at once instead of checking item by item.",
      },
      {
        type: "code",
        section: 4,
        content: `use std::collections::{HashMap, HashSet};

fn main() {
    let guards = HashMap::from([
        ("Chen", "Floor 1"),
        ("Volkov", "Floor 2"),
        ("Santos", "Floor 1"),
    ]);

    let occupied: HashSet<&str> = guards.values().copied().collect();
    println!("{}", occupied.len());                 // 2
    println!("{}", occupied.contains("Floor 2"));   // true
    println!("{}", !occupied.contains("Floor 4"));  // true
}`,
        hotspots: [
          { text: "{HashMap, HashSet}", tip: "two names from the same place in one use line. two separate use lines work just as well." },
          { text: "guards.values()", tip: "just the values — the floors. keys() would give you the names." },
          { text: ".copied()", tip: "values() hands out references to the floors inside the map. copied() turns each one into a plain &str of its own." },
          { text: ".collect()", tip: "gathers everything into a collection. which kind? the type written after occupied — a HashSet of &str." },
          { text: `occupied.contains("Floor 2")`, tip: "membership: true or false. a set answers without looking at every item." },
          { text: "!occupied", tip: "! flips true and false. read it as not." },
        ],
      },
      {
        type: "text",
        section: 4,
        important: true,
        content:
          "a hashmap and a hashset keep no order. walk one and the items come out in whatever order rust stored them — and it can change from run to run. look things up by key; never count on the order.",
      },

      // Section 5: finding the gap — format!, String vs &str
      {
        type: "text",
        section: 5,
        content:
          "now walk the floors from 1 to the top and stop at the first one nobody's on. build each floor's name with format! — it works like println!, but instead of printing the text it hands it back to you.",
      },
      {
        type: "text",
        section: 5,
        important: true,
        content:
          "what it hands back is a String, and that's not the same as a &str. a &str is borrowed — a view of text that lives somewhere else, like every literal in quotes. a String is owned — text you built, that belongs to you and can grow. format! builds new text, so it gives you a String, and a function returning text it built returns String.",
      },
      {
        type: "code",
        section: 5,
        content: `use std::collections::{HashMap, HashSet};

fn find_clear_floor(guards: &HashMap<&str, &str>, max_floor: u32) -> String {
    let occupied: HashSet<&str> = guards.values().copied().collect();
    for i in 1..=max_floor {
        let name = format!("Floor {}", i);
        if !occupied.contains(name.as_str()) {
            return name;
        }
    }
    String::new()
}

fn main() {
    let r = HashMap::from([("Chen", "Floor 1"), ("Park", "Floor 2")]);
    println!("{}", find_clear_floor(&r, 4));  // Floor 3
}`,
        hotspots: [
          { text: "guards: &HashMap<&str, &str>", tip: "& borrows the roster to read it — the caller keeps it, like the slices in chapter three." },
          { text: "1..=max_floor", tip: "1 up to and including the top floor. with two dots alone, the top floor never gets checked." },
          { text: `format!("Floor {}", i)`, tip: "capital F, one space, the number — exactly how the roster writes it, or nothing will match." },
          { text: "name.as_str()", tip: "lends the String as a &str — the kind of text the set holds." },
          { text: "return name;", tip: "the first gap wins. return leaves the function right there, loop and all." },
          { text: "String::new()", tip: "an empty String. if every floor is taken, the loop ends without returning — and rust needs an answer for every path." },
        ],
      },
      {
        type: "text",
        section: 5,
        content:
          "max_floor comes in as a parameter — a u32, a whole number that can't be negative. the terminal tries a four-floor building and a three-floor one, so the loop has to use it, not a number you picked.",
      },

      // Section 6: zen recap
      {
        type: "text",
        section: 6,
        content:
          "habits for this level. build the map as one HashMap::from, one pair per line, trailing commas. ask for exactly what you need — values() when the names don't matter. put the things you'll test with contains into a HashSet, and write !occupied.contains(...) — contains is already a bool, so == false says it twice. and when a key might be missing, ask with get and handle the None.",
      },
      {
        type: "code",
        section: 6,
        content: `// one expression — clean
let roster = HashMap::from([
    ("Chen", "Floor 1"),
    ("Park", "Floor 3"),
]);

// filled in by hand — works, but noisier
let mut roster = HashMap::new();
roster.insert("Chen", "Floor 1");
roster.insert("Park", "Floor 3");`,
        hotspots: [
          { text: "HashMap::new()", tip: "an empty map, filled one insert at a time — so it has to be mut. fine when you build it as you go, not when you already know every pair." },
          { text: `roster.insert("Chen", "Floor 1");`, tip: "insert adds one pair, or replaces the value if the key is already there." },
        ],
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "a hashmap — keys to values. index to read, get when it might be missing." },
      {
        type: "code",
        section: 0,
        content: `use std::collections::HashMap;

let guards = HashMap::from([("Chen", "Floor 1"), ("Volkov", "Floor 2")]);
guards["Volkov"]       // Floor 2
guards.get("Nobody")   // None
guards.len()           // 2`,
      },
      { type: "text", section: 1, content: "the values, gathered into a set." },
      {
        type: "code",
        section: 1,
        content: `let occupied: HashSet<&str> = guards.values().copied().collect();
!occupied.contains("Floor 3")   // true`,
      },
      { type: "text", section: 2, content: "walk the floors, return the first gap." },
      {
        type: "code",
        section: 2,
        content: `for i in 1..=max_floor {
    let name = format!("Floor {}", i);
    if !occupied.contains(name.as_str()) {
        return name;
    }
}
String::new()`,
      },
    ],
  },

  "chapter-04.2": {
    title: "STRINGS & RESULTS",
    subtitle: "THE CIPHER, AND WHAT TO DO WHEN IT BREAKS",
    blocks: [
      // Section 0: scaffold
      {
        type: "text",
        section: 0,
        content:
          "bring the relay online with Hello World. nothing to import this chapter: chars, rev, split_whitespace, join and parse are methods every piece of text already has.",
      },
      {
        type: "code",
        section: 0,
        content: `fn main() {
    println!("Hello World");
}`,
      },

      // Section 1: &str vs String, utf-8
      {
        type: "text",
        section: 1,
        content:
          "you met both kinds of text at the guard roster. a &str is borrowed — you can read it, never change it. a String is owned — you can build it, grow it, hand it back. every trick on this page reads a &str and builds a brand-new String. the original is never touched.",
      },
      {
        type: "code",
        section: 1,
        content: `fn main() {
    let word = "relay";                // &str: borrowed
    let mut owned = word.to_string();  // String: yours
    owned.push_str(" on");
    println!("{}", owned);             // relay on
    println!("{}", word.len());        // 5
}`,
        hotspots: [
          { text: "word.to_string()", tip: "copies borrowed text into a String of your own." },
          { text: `owned.push_str(" on");`, tip: "adds to the end. only a String can grow — and only a mut one." },
          { text: "word.len()", tip: "the length in bytes, not letters. for plain english letters they're the same." },
        ],
      },
      {
        type: "text",
        section: 1,
        important: true,
        content:
          "rust text is utf-8, and one letter can take more than one byte: \"é\".len() is 2. so rust won't let you grab word[0] — a byte from the middle of a letter isn't a letter. to walk text one letter at a time, ask for chars().",
      },

      // Section 2: chars().rev().collect()
      {
        type: "text",
        section: 2,
        content:
          "chars() walks the text one character at a time. it doesn't build anything yet — it's an iterator, something you can step through. rev() steps through it from the other end. collect() gathers the steps into something real, and builds whatever type you asked for.",
      },
      {
        type: "code",
        section: 2,
        content: `fn reverse_word(s: &str) -> String {
    s.chars().rev().collect()
}

fn main() {
    println!("{}", reverse_word("hello"));  // olleh
    println!("{}", reverse_word("café"));   // éfac
}`,
        hotspots: [
          { text: "s.chars()", tip: "every character in order: h, e, l, l, o. whole characters, never half of one." },
          { text: ".rev()", tip: "the same characters, last first." },
          { text: ".collect()", tip: "gathers them up. the -> String on the function tells it what to build." },
          { text: `reverse_word("café")`, tip: "é takes two bytes. flip the bytes and you'd tear it in half — chars keeps it whole." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "the whole body is one chain with no semicolon, so it's the return value. you've seen a chain like it before: codes.iter().sum() in chapter three.",
      },

      // Section 3: split_whitespace, map, Vec, join
      {
        type: "text",
        section: 3,
        content:
          "a whole message needs each word reversed on its own. split_whitespace() walks the words, skipping every run of spaces between them. map(reverse_word) runs your function on each one. collect them into a Vec — rust's growable list — and join puts them back together with a space between each.",
      },
      {
        type: "code",
        section: 3,
        content: `fn reverse_word(s: &str) -> String {
    s.chars().rev().collect()
}

fn encode(msg: &str) -> String {
    msg.split_whitespace().map(reverse_word).collect::<Vec<String>>().join(" ")
}

fn main() {
    println!("{}", encode("floor is clear"));       // roolf si raelc
    println!("{}", encode(&encode("round trip")));  // round trip
}`,
        hotspots: [
          { text: "msg.split_whitespace()", tip: "the words one by one: floor, is, clear. never an empty word, however many spaces." },
          { text: ".map(reverse_word)", tip: "runs reverse_word on every word. no brackets after the name — you're handing over the function, not calling it." },
          { text: ".collect::<Vec<String>>()", tip: "a Vec<String> is a list of Strings. ::<> names the type right on collect, because nothing else says what to build. rust programmers call it the turbofish." },
          { text: `.join(" ")`, tip: "one String back, with a single space between the words and none on the ends." },
          { text: "encode(&encode(", tip: "encode hands back a String; & lends it as a &str to the outer call. reverse every word twice and you're back where you started." },
        ],
      },

      // Section 4: parse + Result
      {
        type: "text",
        section: 4,
        content:
          "text and numbers are different things, even when they look alike. \"50\" is two characters; 50 is a number. parse reads text as a number, and ::<i32> says which kind of number you want back.",
      },
      {
        type: "code",
        section: 4,
        content: `fn main() {
    let good = "50".parse::<i32>();
    let bad = "abc".parse::<i32>();
    println!("{:?}", good);  // Ok(50)
    println!("{:?}", bad);   // Err(ParseIntError { kind: InvalidDigit })
}`,
        hotspots: [
          { text: `"50".parse::<i32>()`, tip: "text in, a Result out. ::<i32> asks for a 32-bit whole number." },
          { text: "{:?}", tip: "debug printing: shows a value the way rust sees it, Ok and Err included. plain {} is only for values meant for people." },
          { text: "Ok(50)", tip: "it worked: the number sits inside Ok." },
          { text: "Err(ParseIntError", tip: "it didn't: Err holds the reason. abc has no digits in it." },
        ],
      },
      {
        type: "text",
        section: 4,
        content:
          "parse can fail, so it doesn't hand you a number. it hands you a Result: Ok(number) when it worked, Err(reason) when it didn't. like Option, it's a box you have to open before you can use what's inside.",
      },
      {
        type: "text",
        section: 4,
        important: true,
        content:
          "the quick way to open it is unwrap(). it takes the number out of Ok — and on Err, it panics. \"abc\".parse::<i32>().unwrap() stops the whole program right there, and one bad code takes the relay down. unwrap is a promise that it can't fail. this one can.",
      },

      // Section 5: match on Result
      {
        type: "text",
        section: 5,
        content:
          "open it with match, the way you opened an Option: one arm for Ok, one for Err. rust won't build the match unless both are there, so you can't forget the failure.",
      },
      {
        type: "code",
        section: 5,
        content: `fn relay_header(floor: u32, code: &str) -> String {
    match code.parse::<i32>() {
        Ok(n) => format!("F{}-C{}", floor, n * 2),
        Err(_) => format!("F{}-ERR", floor),
    }
}

fn main() {
    println!("{}", relay_header(2, "50"));   // F2-C100
    println!("{}", relay_header(3, "abc"));  // F3-ERR
}`,
        hotspots: [
          { text: "match code.parse::<i32>() {", tip: "parse, then open the Result on the spot. the whole match is the function's answer." },
          { text: "Ok(n) =>", tip: "it worked: the number is named n for this arm." },
          { text: "n * 2", tip: "real arithmetic, now that it's a number." },
          { text: "Err(_) =>", tip: "it failed. _ means you don't need the reason, only the fact." },
        ],
      },
      {
        type: "text",
        section: 5,
        content:
          "each arm builds a String with format!, and the match is the last expression — so whichever arm runs, its String is the answer.",
      },

      // Section 6: Option and Result side by side
      {
        type: "text",
        section: 6,
        content:
          "two boxes, one habit. Option is maybe a value: Some(value) or None — the guard might not be on the roster. Result is a value or the reason there isn't one: Ok(value) or Err(reason) — the code might not be a number. rust never lets you use what's inside without asking which it is.",
      },
      {
        type: "text",
        section: 6,
        important: true,
        content:
          "match handles both cases. unwrap handles one and crashes on the other. save unwrap for when failure really is impossible — and when it isn't, write the match. in rust, the error is a value you hold in your hand, not something that jumps out at you.",
      },

      // Section 7: zen recap
      {
        type: "text",
        section: 7,
        content:
          "habits for this level. walk text with chars(), never bytes. split_whitespace() for words. chain the steps — chars, rev, collect — instead of building by hand. join the words instead of gluing them on one at a time. and open every Result with a match instead of unwrapping it.",
      },
      {
        type: "code",
        section: 7,
        content: `// matched — clean
match code.parse::<i32>() {
    Ok(n) => format!("F{}-C{}", floor, n * 2),
    Err(_) => format!("F{}-ERR", floor),
}

// unwrapped — one bad code and it panics
format!("F{}-C{}", floor, code.parse::<i32>().unwrap() * 2)`,
        hotspots: [
          { text: `Err(_) => format!("F{}-ERR", floor),`, tip: "the bad code gets its own answer, and the relay stays up." },
          { text: ".unwrap() * 2", tip: "\"abc\" panics right here. the relay goes down with it." },
        ],
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "reverse by characters — chars, rev, collect." },
      {
        type: "code",
        section: 0,
        content: `fn reverse_word(s: &str) -> String {
    s.chars().rev().collect()
}`,
      },
      { type: "text", section: 1, content: "split into words, reverse each, join with spaces." },
      {
        type: "code",
        section: 1,
        content: `fn encode(msg: &str) -> String {
    msg.split_whitespace().map(reverse_word).collect::<Vec<String>>().join(" ")
}`,
      },
      { type: "text", section: 2, content: "parse hands back a Result — match both arms." },
      {
        type: "code",
        section: 2,
        content: `match code.parse::<i32>() {
    Ok(n) => format!("F{}-C{}", floor, n * 2),
    Err(_) => format!("F{}-ERR", floor),
}`,
      },
    ],
  },

  // ── Act III: Kira's pages ──
  // Reeves' manual ends at chapter six. These chapters are loose sheets in
  // Kira's hand — sharp, and priced.

  "chapter-07": {
    title: "RECURSION & DROP",
    subtitle: "KIRA'S PAGES · THE ARCHIVE, AND WHAT IT HIDES",
    blocks: [
      // Section 0: scaffold
      {
        type: "text",
        section: 0,
        content:
          "these pages aren't reeves'. the hand is sharper, the margins are full of prices. first line across the top: wake the archive terminal. you know how. — k.",
      },
      {
        type: "code",
        section: 0,
        content: `fn main() {
    println!("Hello World");
}`,
      },

      // Section 1: the archive — Vec, vec!, if let, strip_suffix
      {
        type: "text",
        section: 1,
        content:
          "the archive is a HashMap. each key is a directory, each value is a Vec of what's inside it — vec! builds one from a list. a name ending in / is another directory: look it up by the same name without the slash. anything else is a file.",
      },
      {
        type: "code",
        section: 1,
        content: `use std::collections::HashMap;

fn main() {
    let archive = HashMap::from([
        ("root", vec!["config.dat", "logs/"]),
        ("logs", vec!["access.log", "error.log"]),
    ]);

    for entry in &archive["root"] {
        if let Some(sub) = entry.strip_suffix('/') {
            println!("directory: {}", sub);
        } else {
            println!("file: {}", entry);
        }
    }
}
// file: config.dat
// directory: logs`,
        hotspots: [
          { text: `vec!["config.dat", "logs/"]`, tip: "vec! is a macro, like println!. it builds a Vec holding these values, in order." },
          { text: `&archive["root"]`, tip: "look root up and borrow its Vec to walk it. the & means the loop reads the list without taking it out of the map." },
          { text: "if let Some(sub) =", tip: "a one-arm match. if the value fits Some(...), run this block with sub named; otherwise run the else." },
          { text: "entry.strip_suffix('/')", tip: "Some(the name without the slash) if it ends in /, None if it doesn't. '/' in single quotes is one character." },
        ],
      },
      {
        type: "text",
        section: 1,
        content:
          "if let is match for when you only care about one pattern. a full match would need a None arm doing exactly what the else does — if let says it shorter.",
      },
      {
        type: "text",
        section: 1,
        content:
          "kira, in the margin: a loop goes one level deep. this archive goes as deep as whoever built it wanted. you need something that keeps going.",
      },

      // Section 2: recursion
      {
        type: "text",
        section: 2,
        content:
          "recursion is a function calling itself. scan(\"root\") finds servers/ and calls scan(\"servers\"), which finds alpha/ and calls scan(\"alpha\"). each call has its own dir, finishes its own directory, and hands control back to the one that called it. a directory with nothing but files makes no further calls — that's where it stops.",
      },
      {
        type: "code",
        section: 2,
        content: `use std::collections::HashMap;

fn scan(archive: &HashMap<&str, Vec<&str>>, dir: &str) {
    for entry in &archive[dir] {
        if let Some(sub) = entry.strip_suffix('/') {
            scan(archive, sub);
        } else {
            println!("file: {}", entry);
        }
    }
}

fn main() {
    let archive = HashMap::from([
        ("root", vec!["config.dat", "logs/"]),
        ("logs", vec!["access.log"]),
    ]);
    scan(&archive, "root");
}`,
        hotspots: [
          { text: "archive: &HashMap<&str, Vec<&str>>", tip: "the whole archive, borrowed. archive is already a reference, so each call passes it straight on." },
          { text: "scan(archive, sub);", tip: "the function calling itself, one level deeper. it comes back when that whole directory is done." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "root starts first and finishes last — everything inside it has to finish before it can. hold on to that order. it's the whole trick of section four.",
      },

      // Section 3: &mut counter
      {
        type: "text",
        section: 3,
        content:
          "now count the files: one counter, and every call adds to it. a rust function only sees what you pass it, so the counter has to travel with the calls. pass it as &mut usize — a borrow that's allowed to change what it points at.",
      },
      {
        type: "code",
        section: 3,
        content: `use std::collections::HashMap;

fn scan(archive: &HashMap<&str, Vec<&str>>, dir: &str, count: &mut usize) {
    for entry in &archive[dir] {
        if let Some(sub) = entry.strip_suffix('/') {
            scan(archive, sub, count);
        } else {
            *count += 1;
        }
    }
}

fn scan_archive(archive: &HashMap<&str, Vec<&str>>, root: &str) -> usize {
    let mut count = 0;
    scan(archive, root, &mut count);
    count
}

fn main() {
    let archive = HashMap::from([
        ("root", vec!["config.dat", "logs/"]),
        ("logs", vec!["access.log", "error.log"]),
    ]);
    println!("total files: {}", scan_archive(&archive, "root"));  // total files: 3
}`,
        hotspots: [
          { text: "count: &mut usize", tip: "a mutable borrow of a usize — the whole-number type rust uses for counting things. scan changes the caller's counter, not a copy." },
          { text: "scan(archive, sub, count);", tip: "count is already a &mut, so pass it straight down. every call shares the one counter." },
          { text: "*count += 1;", tip: "the * follows the borrow to the number it points at. add one there, not to the borrow." },
          { text: "let mut count = 0;", tip: "the real counter lives here. it's mut, so it can be lent out as &mut." },
          { text: "scan(archive, root, &mut count);", tip: "lend it to the walk. when the walk is done, count holds every file it found." },
        ],
      },
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "rust allows one &mut borrow of a value at a time, and while it's out, nothing else may even read the value. that rule is what stops two pieces of code changing the same number under each other. here it costs nothing — the calls take turns.",
      },

      // Section 4: Drop guard
      {
        type: "text",
        section: 4,
        content:
          "each directory has to log scanned: <dir> as it finishes — however it finishes. rust's way is a value whose whole job is cleanup. a type says what happens when one of its values goes away by implementing Drop, and rust calls drop for you the moment the value goes out of scope: at the end of the function, on an early return, even on a panic.",
      },
      {
        type: "code",
        section: 4,
        content: `struct Log(String);

impl Drop for Log {
    fn drop(&mut self) {
        println!("scanned: {}", self.0);
    }
}

fn main() {
    let _first = Log("root".to_string());
    let _second = Log("logs".to_string());
    println!("working");
}
// working
// scanned: logs
// scanned: root`,
        hotspots: [
          { text: "struct Log(String);", tip: "a new type — a struct. this one just wraps one String, its field known by position. a tuple struct." },
          { text: "impl Drop for Log {", tip: "impl gives Log some behaviour. Drop is the cleanup kind: what to run when a Log goes away." },
          { text: "fn drop(&mut self)", tip: "self is the Log being dropped. you never call drop yourself — rust does." },
          { text: "self.0", tip: "the first field of the tuple struct: the directory's name." },
          { text: "let _first", tip: "the leading underscore says i won't read this name. the Log still lives until main ends." },
        ],
      },
      {
        type: "text",
        section: 4,
        content:
          "values go away in reverse order of creation: the last one made is the first one dropped. so scanned: logs prints before scanned: root. put a Log at the top of scan and every directory reports on its way out.",
      },
      {
        type: "code",
        section: 4,
        content: `fn scan(archive: &HashMap<&str, Vec<&str>>, dir: &str, count: &mut usize) {
    let _log = Log(dir.to_string());
    for entry in &archive[dir] {
        if let Some(sub) = entry.strip_suffix('/') {
            scan(archive, sub, count);
        } else {
            *count += 1;
        }
    }
}
// scanned: logs
// scanned: alpha
// ...
// scanned: root`,
        hotspots: [
          { text: "let _log = Log(dir.to_string());", tip: "first line of scan. it lives until scan ends, so the deepest directories log first and root logs last." },
        ],
      },
      {
        type: "text",
        section: 4,
        important: true,
        content:
          "write let _log, not let _. a bare _ isn't a name at all: the Log is dropped on the spot, and every directory logs before it's been scanned. _log is a name you won't use; _ throws the value away.",
      },

      // Section 5: Result + ?
      {
        type: "text",
        section: 5,
        content:
          "ghost booby-trapped the archive. now each value is an Option<Vec<&str>> — Some(entries), or None for a corrupted directory. in rust a panic is for bugs, things that should never happen. bad data is just an answer you didn't want, so the walk returns a Result: Ok(()) when the directory scanned clean, Err(reason) when it didn't.",
      },
      {
        type: "code",
        section: 5,
        content: `fn walk(
    archive: &HashMap<&str, Option<Vec<&str>>>,
    dir: &str,
    count: &mut usize,
    errors: &mut Vec<String>,
) -> Result<(), String> {
    let _log = Log(dir.to_string());
    let entries = archive[dir].as_ref().ok_or("corrupted directory")?;
    for entry in entries {
        if let Some(sub) = entry.strip_suffix('/') {
            if let Err(e) = walk(archive, sub, count, errors) {
                errors.push(format!("{}: {}", sub, e));
            }
        } else {
            *count += 1;
        }
    }
    Ok(())
}`,
        hotspots: [
          { text: "-> Result<(), String>", tip: "Ok carries nothing worth sending back — () is the empty value. Err carries the reason, as a String." },
          { text: ".as_ref()", tip: "look at the Option inside the map without taking it out." },
          { text: `.ok_or("corrupted directory")?`, tip: "ok_or turns None into Err(\"corrupted directory\") and Some into Ok. then ? opens it: Ok gives you the entries, Err leaves the function on the spot." },
          { text: "if let Err(e) = walk(", tip: "check the subdirectory's answer. an Err gets written down and the loop moves on to the next entry." },
          { text: "errors.push(", tip: "push adds to the end of a Vec. errors is &mut, so it's the caller's list that grows." },
          { text: "Ok(())", tip: "made it to the end: this directory scanned clean." },
        ],
      },
      {
        type: "text",
        section: 5,
        content:
          "? does three things in one character. on Ok(value), it hands you the value. on Err(e), it returns Err(e) from this function right now. and on the way out, it converts the error into the function's error type — the text \"corrupted directory\" becomes a String.",
      },
      {
        type: "text",
        section: 5,
        important: true,
        content:
          "and the guard still runs. ? leaves the function early, leaving drops _log, so the corrupted directory logs scanned: vault too. the cleanup doesn't care how you got out.",
      },

      // Section 6: where to catch
      {
        type: "text",
        section: 6,
        content:
          "safe_scan starts the walk at root and hands back the count and every error it collected. root can fail too, so its answer gets the same check.",
      },
      {
        type: "code",
        section: 6,
        content: `fn safe_scan(archive: &HashMap<&str, Option<Vec<&str>>>, root: &str) -> (usize, Vec<String>) {
    let mut count = 0;
    let mut errors = Vec::new();
    if let Err(e) = walk(archive, root, &mut count, &mut errors) {
        errors.push(format!("{}: {}", root, e));
    }
    (count, errors)
}`,
        hotspots: [
          { text: "Vec::new()", tip: "an empty Vec. rust works out that it holds Strings from what gets pushed into it later." },
          { text: "&mut count, &mut errors", tip: "both lent to the walk. every call adds to the same count and the same list." },
          { text: "(count, errors)", tip: "both answers at once, as a tuple — like validate_code in chapter three." },
        ],
      },
      {
        type: "text",
        section: 6,
        important: true,
        content:
          "where you check decides what you lose. check once, around the whole scan, and the first trap ends everything. check each subdirectory's answer where you call it, and the vault's error is written down while root's loop carries on to the next entry. catch at the edge of one piece of work. — k.",
      },

      // Section 7: zen recap
      {
        type: "text",
        section: 7,
        content:
          "habits for this level. keep the counter in one place and lend it as &mut. put cleanup in a Drop guard named _log, never _. ask strip_suffix instead of counting characters from the end. return a Result for bad data and save panic for bugs. bail with ?, and check the Err where one piece of work ends — not around the whole job.",
      },
      {
        type: "code",
        section: 7,
        content: `// a guard — runs on every way out
let _log = Log(dir.to_string());
let entries = archive[dir].as_ref().ok_or("corrupted directory")?;

// a print at the bottom — never reached when ? leaves early
let entries = archive[dir].as_ref().ok_or("corrupted directory")?;
// ...walk the entries...
println!("scanned: {}", dir);`,
        hotspots: [
          { text: "let _log = Log(dir.to_string());", tip: "made before anything can fail, dropped whichever way the function ends." },
          { text: `println!("scanned: {}", dir);`, tip: "on the corrupted directory, ? has already returned. this line never runs, and the vault never logs." },
        ],
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "one counter, lent to every call as &mut." },
      {
        type: "code",
        section: 0,
        content: `fn scan(archive: &HashMap<&str, Vec<&str>>, dir: &str, count: &mut usize) {
    for entry in &archive[dir] {
        if let Some(sub) = entry.strip_suffix('/') {
            scan(archive, sub, count);
        } else {
            *count += 1;
        }
    }
}`,
      },
      { type: "text", section: 1, content: "a Drop guard logs on every way out." },
      {
        type: "code",
        section: 1,
        content: `struct Log(String);

impl Drop for Log {
    fn drop(&mut self) {
        println!("scanned: {}", self.0);
    }
}

let _log = Log(dir.to_string());   // first line of scan`,
      },
      { type: "text", section: 2, content: "return a Result, bail with ?, check each call." },
      {
        type: "code",
        section: 2,
        content: `let entries = archive[dir].as_ref().ok_or("corrupted directory")?;

if let Err(e) = walk(archive, sub, count, errors) {
    errors.push(format!("{}: {}", sub, e));
}`,
      },
    ],
  },

  "chapter-08": {
    title: "THREADS & JOIN",
    subtitle: "KIRA'S PAGES · FOUR HANDS, ONE MOMENT",
    blocks: [
      // Section 0: scaffold
      {
        type: "text",
        section: 0,
        content:
          "another sheet, taped behind breaker four. first line: bring the console online. after that, everything on this page happens at once. — k.",
      },
      {
        type: "code",
        section: 0,
        content: `fn main() {
    println!("Hello World");
}`,
      },
      {
        type: "text",
        section: 0,
        content:
          "everything new in this chapter lives in std::thread and std::time. bring each in with a use line in the step that first needs it — not before.",
      },

      // Section 1: closures
      {
        type: "text",
        section: 1,
        content:
          "first, a new kind of function. a closure is a function with no name, written right where you need it: its parameters between two bars, then its body. it can also use the variables around it — it closes over them, which is where the name comes from.",
      },
      {
        type: "code",
        section: 1,
        content: `fn main() {
    let double = |n: i32| n * 2;
    println!("{}", double(21));  // 42

    let name = "North";
    let report = || println!("{} circuit: DOWN", name);
    report();  // North circuit: DOWN
}`,
        hotspots: [
          { text: "|n: i32| n * 2", tip: "a closure taking one i32. after the bars comes the body — one expression, and it's the result." },
          { text: "let report", tip: "report uses name from the line above. it was never passed in — the closure just sees it." },
          { text: "|| println!", tip: "empty bars: a closure that takes nothing." },
          { text: "report();", tip: "call a closure like any function." },
        ],
      },

      // Section 2: thread::spawn
      {
        type: "text",
        section: 2,
        content:
          "a thread is a separate line of work running alongside main. thread::spawn takes a closure, starts it on a new thread, and returns at once — the caller doesn't wait for it.",
      },
      {
        type: "code",
        section: 2,
        content: `use std::thread;
use std::time::Duration;

fn cut(name: &str) {
    println!("{} circuit: DOWN", name);
}

fn main() {
    thread::spawn(|| cut("South"));
    println!("orders sent");
    thread::sleep(Duration::from_millis(100));
}
// usually: orders sent, then South circuit: DOWN`,
        hotspots: [
          { text: "use std::thread;", tip: "brings in the thread module. after this, thread::spawn and thread::sleep are yours." },
          { text: `thread::spawn(|| cut("South"));`, tip: "start the closure on its own thread. spawn hands back straight away, and main goes on to the next line." },
          { text: "thread::sleep(", tip: "pause this thread — here, main — for that long. the other threads keep running." },
          { text: "Duration::from_millis(100)", tip: "a length of time: 100 milliseconds. Duration comes from std::time." },
        ],
      },
      {
        type: "text",
        section: 2,
        important: true,
        content:
          "when main ends, the whole program ends — every other thread with it, finished or not. that's why the terminal holds main open for 100ms after cut_async. leave the sleep out and south may never get to speak.",
      },

      // Section 3: move + owned data
      {
        type: "text",
        section: 3,
        content:
          "cut_async has a problem. its name is a &str — borrowed text, only valid until cut_async returns. a thread can still be running long after that, so rust refuses to send a borrow into it. the fix is to give the thread its own copy: make an owned String, and move it into the closure.",
      },
      {
        type: "code",
        section: 3,
        content: `use std::thread;
use std::time::Duration;

fn cut(name: &str) {
    println!("{} circuit: DOWN", name);
}

fn cut_async(name: &str) {
    let name = name.to_string();
    thread::spawn(move || cut(&name));
}

fn main() {
    cut_async("South");
    thread::sleep(Duration::from_millis(100));
}`,
        hotspots: [
          { text: "let name = name.to_string();", tip: "an owned copy, under the same name. from here on the new name hides the borrowed one — rust calls that shadowing." },
          { text: "move ||", tip: "move hands the closure everything it uses — here, the String. now it belongs to the thread, and lives as long as the thread needs it." },
          { text: "cut(&name)", tip: "inside the thread, lend the String to cut as a &str." },
        ],
      },
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "make the copy but leave out move, and the closure still only borrows it. the compiler stops you: closure may outlive the current function, but it borrows name. read that error once and you know what move is for.",
      },

      // Section 4: JoinHandle + join
      {
        type: "text",
        section: 4,
        content:
          "four breakers, all at once, and you need every confirmation back, in order. thread::spawn returns a JoinHandle — a ticket for that thread. handle.join() waits until the thread is done, then hands back whatever its closure returned.",
      },
      {
        type: "code",
        section: 4,
        content: `use std::thread;

fn cut_all(circuits: &[&str]) -> Vec<String> {
    let mut handles = Vec::new();
    for name in circuits {
        let name = name.to_string();
        handles.push(thread::spawn(move || format!("{} circuit: DOWN", name)));
    }
    handles.into_iter().map(|h| h.join().unwrap()).collect()
}

fn main() {
    for line in cut_all(&["North", "South", "East", "West"]) {
        println!("{}", line);
    }
}`,
        hotspots: [
          { text: "let mut handles = Vec::new();", tip: "somewhere to keep every ticket." },
          { text: "handles.push(thread::spawn(", tip: "start the thread and keep its handle. no waiting yet — the loop moves straight on to the next circuit." },
          { text: `move || format!("{} circuit: DOWN", name)`, tip: "the thread doesn't print. it returns its line, and join hands it back." },
          { text: "handles.into_iter()", tip: "walks the handles in the order you pushed them, taking each one — join uses a handle up." },
          { text: "h.join().unwrap()", tip: "wait for that thread and take its line. join answers with a Result — Err only if the thread panicked — so unwrap is fine here." },
        ],
      },
      {
        type: "text",
        section: 4,
        important: true,
        content:
          "launch them all, then join. spawn and join inside the same loop and each thread is waited for before the next one starts — one at a time, no faster than doing it all on main. and join in circuit order: the lines come back in the order you join them, not the order the threads finished.",
      },

      // Section 5: zip
      {
        type: "text",
        section: 5,
        content:
          "each breaker takes its own time to trip. the names are in one slice, the delays in another, in the same order. zip walks both side by side and hands you a pair each time round.",
      },
      {
        type: "code",
        section: 5,
        content: `fn main() {
    let circuits = ["North", "South"];
    let delays: &[u64] = &[300, 150];

    for (name, &d) in circuits.iter().zip(delays) {
        println!("{} {}", name, d);
    }
}
// North 300
// South 150`,
        hotspots: [
          { text: "&[u64]", tip: "u64: a whole number, never negative, with room for very big values. it's what Duration::from_millis takes." },
          { text: "(name, &d)", tip: "each pair unpacks into two names, like a tuple. the & in the pattern copies the number out of its borrow, so d is a plain u64." },
          { text: "circuits.iter().zip(delays)", tip: "pairs item 0 with item 0, item 1 with item 1. stops at the end of the shorter one." },
        ],
      },

      // Section 6: the window
      {
        type: "text",
        section: 6,
        content:
          "one power cycle is 1100 milliseconds. the four delays — 300, 150, 450, 200 — add up to exactly that. so when you wait decides everything.",
      },
      {
        type: "code",
        section: 6,
        content: `use std::thread;
use std::time::Duration;

fn cut_timed(circuits: &[&str], delays: &[u64]) -> Vec<String> {
    let mut handles = Vec::new();
    for (name, &d) in circuits.iter().zip(delays) {
        let name = name.to_string();
        handles.push(thread::spawn(move || {
            thread::sleep(Duration::from_millis(d));
            format!("{} circuit: DOWN ({}ms)", name, d)
        }));
    }
    handles.into_iter().map(|h| h.join().unwrap()).collect()
}

fn main() {
    for line in cut_timed(&["North", "South"], &[300, 150]) {
        println!("{}", line);
    }
}`,
        hotspots: [
          { text: "move || {", tip: "a closure with a body in braces: several lines, run in order. the last line, with no semicolon, is what it returns." },
          { text: "thread::sleep(Duration::from_millis(d));", tip: "inside the thread, so only this breaker waits. the others are sleeping at the same time." },
          { text: `format!("{} circuit: DOWN ({}ms)", name, d)`, tip: "d moved in with the name — a number is simply copied — so each thread reports its own delay." },
          { text: "h.join().unwrap()", tip: "the first join waits 300ms. by the time the slowest is joined, all four are done: about 450ms in all." },
        ],
      },
      {
        type: "text",
        section: 6,
        important: true,
        content:
          "join each thread before spawning the next and the sleeps queue up end to end: 1100ms, two power cycles, alarm. spawn all four first and they overlap: 450ms, one cycle, grid blind. the same code inside each breaker — the only difference is when you wait.",
      },

      // Section 7: zen recap
      {
        type: "text",
        section: 7,
        content:
          "habits for this level. give a thread owned data and move it in. let cut_async reuse cut instead of printing the line a second time. keep every handle, spawn them all, then join in order. return results from threads instead of printing inside them. sleep inside the thread, never in the loop that starts them. zip slices that belong together. — k.",
      },
      {
        type: "code",
        section: 7,
        content: `// one at a time — the sum
for (name, &d) in circuits.iter().zip(delays) {
    let name = name.to_string();
    let h = thread::spawn(move || trip(name, d));
    lines.push(h.join().unwrap());
}

// all at once — the slowest
for (name, &d) in circuits.iter().zip(delays) {
    let name = name.to_string();
    handles.push(thread::spawn(move || trip(name, d)));
}
let lines: Vec<String> = handles.into_iter().map(|h| h.join().unwrap()).collect();`,
        hotspots: [
          { text: "lines.push(h.join().unwrap());", tip: "waits for each breaker before the next one even starts. trip is section six's closure body: sleep, then the line." },
          { text: "let lines: Vec<String> = handles", tip: "every breaker is already running. wait once for each, in order." },
        ],
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "a thread gets its own copy — move it in." },
      {
        type: "code",
        section: 0,
        content: `fn cut_async(name: &str) {
    let name = name.to_string();
    thread::spawn(move || cut(&name));
}`,
      },
      { type: "text", section: 1, content: "spawn them all, keep the handles, join in order." },
      {
        type: "code",
        section: 1,
        content: `let mut handles = Vec::new();
for name in circuits {
    let name = name.to_string();
    handles.push(thread::spawn(move || format!("{} circuit: DOWN", name)));
}
handles.into_iter().map(|h| h.join().unwrap()).collect()`,
      },
      { type: "text", section: 2, content: "sleep inside each thread, in milliseconds." },
      {
        type: "code",
        section: 2,
        content: `thread::sleep(Duration::from_millis(d));`,
      },
    ],
  },

  "chapter-09": {
    title: "CHANNELS & TIMEOUTS",
    subtitle: "KIRA'S PAGES · FIRST VOICE WINS",
    blocks: [
      // Section 0: scaffold
      {
        type: "text",
        section: 0,
        content:
          "under the antenna housing. her hand again, and a heading underlined twice: listen to everyone, wait on no one. first, power the array. — k.",
      },
      {
        type: "code",
        section: 0,
        content: `fn main() {
    println!("Hello World");
}`,
      },

      // Section 1: mpsc::channel
      {
        type: "text",
        section: 1,
        content:
          "a channel is a pipe between threads. mpsc::channel() hands you both ends: tx sends, rx receives. move tx into a thread and that thread can talk to whoever holds rx. rx.recv() waits until a message arrives.",
      },
      {
        type: "code",
        section: 1,
        content: `use std::sync::mpsc::{self, Receiver};
use std::thread;
use std::time::Duration;

fn hail(team: &str, delay_ms: u64) -> Receiver<String> {
    let (tx, rx) = mpsc::channel();
    let team = team.to_string();
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(delay_ms));
        let _ = tx.send(format!("{} responding", team));
    });
    rx
}

fn main() {
    let rx = hail("Bravo", 100);
    println!("hailing Bravo...");
    println!("{}", rx.recv().unwrap());  // Bravo responding
}`,
        hotspots: [
          { text: "use std::sync::mpsc::{self, Receiver};", tip: "self brings in mpsc itself, so you can write mpsc::channel(). Receiver comes in by name, for the return type." },
          { text: "-> Receiver<String>", tip: "hail hands back the receiving end the moment the thread is started — maya's earpiece." },
          { text: "let (tx, rx) = mpsc::channel();", tip: "two ends of one pipe, taken apart like any tuple. rust works out from the send what kind of message travels down it." },
          { text: "let _ = tx.send(", tip: "send returns a Result — Err if nobody's holding rx any more. let _ throws that answer away on purpose: a team doesn't care whether anyone heard." },
          { text: "rx.recv().unwrap()", tip: "receiving is waiting. recv gives Err only when every sender is gone without a word — not happening here." },
        ],
      },
      {
        type: "text",
        section: 1,
        content:
          "hail returns at once, so you can hail three teams in three lines and they all start answering together. only then do you decide how to listen.",
      },

      // Section 2: fan-in
      {
        type: "text",
        section: 2,
        content:
          "three receivers, and you want whichever answers first. alpha.recv() would wait for alpha however long alpha takes — even with bravo already on the line. rust's standard library has no way to wait on several receivers at once. so make them one: a new channel, and a forwarding thread for each team that passes its answer on into it.",
      },
      {
        type: "text",
        section: 2,
        content:
          "that works because a sender can be cloned. tx.clone() makes another sender into the same channel, so every forwarder gets its own. mpsc stands for multiple producer, single consumer: many senders, one receiver.",
      },
      {
        type: "code",
        section: 2,
        content: `fn first_responder(alpha: Receiver<String>, bravo: Receiver<String>, charlie: Receiver<String>) -> String {
    let (tx, rx) = mpsc::channel();
    for r in [alpha, bravo, charlie] {
        let tx = tx.clone();
        thread::spawn(move || {
            if let Ok(msg) = r.recv() {
                let _ = tx.send(msg);
            }
        });
    }
    rx.recv().unwrap()
}`,
        hotspots: [
          { text: "for r in [alpha, bravo, charlie]", tip: "an array of the three receivers. the loop takes each one out, so it can move into its forwarder." },
          { text: "let tx = tx.clone();", tip: "a fresh sender for this forwarder, feeding the same inbox." },
          { text: "if let Ok(msg) = r.recv()", tip: "wait on this one team. when its answer lands, pass it on." },
          { text: "rx.recv().unwrap()", tip: "the first message into the inbox is the first team that answered." },
        ],
      },
      {
        type: "text",
        section: 2,
        important: true,
        content:
          "the losers aren't stopped. there's no way to cancel a thread from outside in rust. their forwarders send into an inbox nobody reads any more, the send fails quietly into let _, and each one finishes on its own.",
      },

      // Section 3: recv_timeout
      {
        type: "text",
        section: 3,
        content:
          "if every frequency is jammed, recv would wait forever. give it a deadline: recv_timeout(duration) waits for a message, but no longer than that. it answers Ok(msg) if one arrived in time, Err if the clock ran out first.",
      },
      {
        type: "text",
        section: 3,
        content:
          "await_contact needs the same fan-in as first_responder. don't write it twice — pull it out into its own function, fan_in, and let both use it.",
      },
      {
        type: "code",
        section: 3,
        content: `fn fan_in(teams: [Receiver<String>; 3]) -> Receiver<String> {
    let (tx, rx) = mpsc::channel();
    for r in teams {
        let tx = tx.clone();
        thread::spawn(move || {
            if let Ok(msg) = r.recv() {
                let _ = tx.send(msg);
            }
        });
    }
    rx
}

fn await_contact(alpha: Receiver<String>, bravo: Receiver<String>, charlie: Receiver<String>, timeout_ms: u64) -> String {
    match fan_in([alpha, bravo, charlie]).recv_timeout(Duration::from_millis(timeout_ms)) {
        Ok(msg) => msg,
        Err(_) => "NO CONTACT".to_string(),
    }
}`,
        hotspots: [
          { text: "[Receiver<String>; 3]", tip: "an array type: exactly three receivers. the type, a semicolon, the count." },
          { text: ".recv_timeout(Duration::from_millis(timeout_ms))", tip: "wait on the inbox — but only until the caller's deadline." },
          { text: "Ok(msg) => msg,", tip: "someone answered in time. hand their message straight back." },
          { text: `Err(_) => "NO CONTACT".to_string(),`, tip: "the clock won. to_string makes the owned String the function promised." },
        ],
      },
      {
        type: "text",
        section: 3,
        content:
          "the deadline comes from the caller, as timeout_ms. never pick your own number inside — the terminal tries three different deadlines.",
      },

      // Section 4: try_recv
      {
        type: "text",
        section: 4,
        content:
          "sometimes you can't afford to wait at all — just glance at a channel and move on. try_recv never waits. a message already in the channel comes back as Ok(msg), an empty channel as Err, right now.",
      },
      {
        type: "code",
        section: 4,
        content: `use std::sync::mpsc::{self, Receiver};

fn sweep(ch: &Receiver<String>) -> String {
    match ch.try_recv() {
        Ok(msg) => msg,
        Err(_) => "channel silent".to_string(),
    }
}

fn main() {
    let (tx, rx) = mpsc::channel();
    tx.send("Bravo holding at dock 4".to_string()).unwrap();
    println!("{}", sweep(&rx));  // Bravo holding at dock 4
    println!("{}", sweep(&rx));  // channel silent
}`,
        hotspots: [
          { text: "ch: &Receiver<String>", tip: "borrowed. sweep only glances — the caller keeps the channel and can sweep it again." },
          { text: "ch.try_recv()", tip: "a look, not a wait. Ok or Err, this instant." },
          { text: "sweep(&rx)", tip: "the first sweep finds the waiting message. the second finds nothing, and says so at once." },
        ],
      },
      {
        type: "text",
        section: 4,
        important: true,
        content:
          "a channel holds its messages until someone takes them. a message sent before anyone was listening is still there for the next recv or try_recv — nothing is lost by arriving early.",
      },

      // Section 5: three ways to listen
      {
        type: "text",
        section: 5,
        content:
          "three ways to listen, one question each. recv: wait as long as it takes. recv_timeout: wait, but not past the deadline. try_recv: don't wait at all. await_contact waits with a deadline; sweep only glances. pick by how long you can afford to stand still.",
      },
      {
        type: "code",
        section: 5,
        content: `use std::sync::mpsc;
use std::time::Duration;

fn main() {
    let (_tx, rx) = mpsc::channel::<String>();
    println!("{:?}", rx.try_recv());                               // Err(Empty)
    println!("{:?}", rx.recv_timeout(Duration::from_millis(50)));  // Err(Timeout)
}`,
        hotspots: [
          { text: "_tx", tip: "the sender is kept alive but never used. drop every sender and both answers become Disconnected — nobody left who could ever send." },
          { text: "Err(Empty)", tip: "try_recv's no: nothing waiting right now." },
          { text: "Err(Timeout)", tip: "recv_timeout's no: the deadline passed first." },
        ],
      },

      // Section 6: zen recap
      {
        type: "text",
        section: 6,
        content:
          "habits for this level. give every forwarder its own sender — clone it. fan many receivers into one instead of waiting on them in a line. write the fan-in once and reuse it. take the deadline from the caller. glance with try_recv when you can't afford to wait. and throw a send's answer away with let _ only when nobody listening is fine. — k.",
      },
      {
        type: "code",
        section: 6,
        content: `// waits on alpha, whoever's first
alpha.recv().unwrap()

// listens to all three
fan_in([alpha, bravo, charlie]).recv().unwrap()`,
        hotspots: [
          { text: "alpha.recv().unwrap()", tip: "bravo answered first. nobody heard it." },
          { text: "fan_in([alpha, bravo, charlie])", tip: "every team into one inbox. the first voice wins." },
        ],
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "a channel — tx sends, rx receives, recv waits." },
      {
        type: "code",
        section: 0,
        content: `let (tx, rx) = mpsc::channel();
thread::spawn(move || {
    let _ = tx.send(format!("{} responding", team));
});
rx.recv().unwrap()`,
      },
      { type: "text", section: 1, content: "fan in — clone the sender, forward every team." },
      {
        type: "code",
        section: 1,
        content: `for r in [alpha, bravo, charlie] {
    let tx = tx.clone();
    thread::spawn(move || {
        if let Ok(msg) = r.recv() {
            let _ = tx.send(msg);
        }
    });
}`,
      },
      { type: "text", section: 2, content: "a deadline, or a glance." },
      {
        type: "code",
        section: 2,
        content: `rx.recv_timeout(Duration::from_millis(timeout_ms))   // Err → NO CONTACT
ch.try_recv()                                        // Err → channel silent`,
      },
    ],
  },

  "boss-03": {
    title: "READING CODE",
    subtitle: "REEVES · READ BEFORE YOU RUN",
    blocks: [
      // Section 0: the situation
      {
        type: "text",
        section: 0,
        content:
          "my hand again. i wrote this one for tonight. kira's encoder is supposed to mask your thesis before it crosses bravo's open frequency. seven lines. it compiles, and in rust that feels like a promise. it isn't one.",
      },
      {
        type: "text",
        section: 0,
        important: true,
        content:
          "this is not a fight. there are no hearts and no countdown. study her code against my loopback log, mark the lines you don't trust, then say what she is — trust or reject — and explain why in plain words. if you're right, you may get the chance to fix it.",
      },

      // Section 1: bytes
      {
        type: "text",
        section: 1,
        content:
          "the thesis travels as raw bytes — u8, numbers from 0 to 255, usually written in hex: 0x10 is sixteen. a Vec<u8> you own with mut can be changed one byte at a time. ^ is xor, and xor with 0xFF flips every bit of a byte — that's kira's mask.",
      },
      {
        type: "code",
        section: 1,
        content: `let mut data: Vec<u8> = vec![0x10, 0x20, 0x30, 0x40];
data[0] ^= 0xFF;
println!("{:02X?}", data);    // [EF, 20, 30, 40]`,
        hotspots: [
          { text: "vec![0x10, 0x20, 0x30, 0x40]", tip: "four bytes. mut means you're allowed to change them." },
          { text: "data[0] ^= 0xFF", tip: "flip every bit of byte 0, in place. 0x10 becomes 0xEF." },
        ],
      },

      // Section 2: borrows vs copies
      {
        type: "text",
        section: 2,
        content:
          "&data[1..] borrows a window onto the same bytes. .to_vec() copies them into a new Vec with bytes of its own. change data afterwards and the copy doesn't notice.",
      },
      {
        type: "code",
        section: 2,
        content: `let mut data: Vec<u8> = vec![0x10, 0x20, 0x30];
let part = data[1..].to_vec();
data[1] ^= 0xFF;
println!("{:02X?}", part);    // [20, 30] — untouched`,
        hotspots: [
          { text: "data[1..].to_vec()", tip: "a copy. its bytes are its own." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "try the other way — keep &data[1..] around and then flip data[1] — and the compiler stops you: you can't change data while it's borrowed. that rule is why rust is safe here. so code that wants to share bytes that keep changing has to ask for it out loud.",
      },

      // Section 3: Arc<Mutex<..>>
      {
        type: "text",
        section: 3,
        content:
          "the way to ask is Arc<Mutex<Vec<u8>>>. the Mutex is a lock — .lock() before you read or change the bytes. the Arc lets several owners hold the same locked buffer. Arc::clone does not copy the bytes. it hands out another handle to the same buffer. change it through one handle, and every other handle sees the change.",
      },
      {
        type: "code",
        section: 3,
        content: `use std::sync::{Arc, Mutex};

let data = Arc::new(Mutex::new(vec![0x10u8, 0x20, 0x30]));
let other = Arc::clone(&data);
data.lock().unwrap()[1] ^= 0xFF;
println!("{:02X?}", &other.lock().unwrap()[1..]);    // [DF, 30] — it changed`,
        hotspots: [
          { text: "Arc::clone(&data)", tip: "a second handle. same bytes underneath — nothing was copied." },
          { text: "data.lock().unwrap()[1] ^= 0xFF", tip: "change it through one handle…" },
          { text: "other.lock().unwrap()[1..]", tip: "…and the other handle sees it." },
        ],
      },
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "the compiler checks that nobody changes bytes behind your back without a lock. it can't check whether you meant to share them at all. the question to ask is never does this compile. it's who else can still change what i'm looking at.",
      },

      // Section 4: her code
      {
        type: "text",
        section: 4,
        content:
          "now read hers. a Frame is what the receiver reads: a handle on a buffer, and where the frame starts. ch is a channel — send drops a frame in for the receiver to take later. a frame is sent the moment it's sent, but the receiver doesn't read it until afterwards.",
      },
      {
        type: "code",
        section: 4,
        content: `struct Frame {
    buf: Arc<Mutex<Vec<u8>>>,
    from: usize,
}

fn transmit(data: Arc<Mutex<Vec<u8>>>, ch: Sender<Frame>) {
    let len = data.lock().unwrap().len();
    for i in 0..len {
        data.lock().unwrap()[i] ^= 0xFF;
        ch.send(Frame { buf: Arc::clone(&data), from: i }).unwrap();
    }
}`,
        hotspots: [
          { text: "buf: Arc<Mutex<Vec<u8>>>", tip: "a frame holds a handle, not bytes of its own." },
          { text: "data.lock().unwrap()[i] ^= 0xFF", tip: "the mask, applied in place — to the buffer every earlier frame is holding." },
          { text: "Arc::clone(&data)", tip: "sends another handle on the thesis itself, not a snapshot. the next pass of the loop rewrites what this frame shows." },
        ],
      },
      {
        type: "text",
        section: 4,
        content:
          "walk it with four bytes, 10 20 30 40. frame 0 goes out showing EF 20 30 40. then the loop flips byte 1, and frame 0 — already sent — now shows EF DF 30 40. by the time the receiver reads, every frame but the last has been rewritten under it. my loopback log shows it: the checksums taken at send time don't match what arrives.",
      },

      // Section 5: the fix
      {
        type: "text",
        section: 5,
        content:
          "the fix is one move: copy at the moment you send. buf[i..].to_vec() freezes those bytes into a new Vec, and a fresh Arc around it means no one else holds a handle. later flips touch data, not the frame.",
      },
      {
        type: "code",
        section: 5,
        content: `for i in 0..len {
    let mut buf = data.lock().unwrap();
    buf[i] ^= 0xFF;
    let frozen = buf[i..].to_vec();
    ch.send(Frame { buf: Arc::new(Mutex::new(frozen)), from: 0 }).unwrap();
}

// frame 0: EF 20 30 40
// frame 1: DF 30 40
// frame 2: CF 40
// frame 3: BF`,
        hotspots: [
          { text: "buf[i..].to_vec()", tip: "a frozen copy, taken at send time." },
          { text: "Arc::new(Mutex::new(frozen))", tip: "a brand-new buffer only this frame holds. it can never change after it leaves." },
        ],
      },

      // Section 6: how to read code you didn't write
      {
        type: "text",
        section: 6,
        content:
          "three questions for any code someone hands you. what does it change in place? what does it hand to someone else? and is what it hands over a copy, or another handle on the thing it keeps changing? a mutation, a send, and a missing copy — find all three and you've found the problem.",
      },
      {
        type: "text",
        section: 6,
        important: true,
        content:
          "whether she meant it is a separate question, and the code can't answer it. the code can only tell you what it does. decide what she is from that, not from how clean it looks — or from the fact that it compiled. — e.r.",
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "Arc::clone is another handle on the same bytes, not a copy. .to_vec() is a copy." },
      {
        type: "code",
        section: 0,
        content: `let part = data[1..].to_vec();   // copy — safe
let other = Arc::clone(&shared);  // handle — sees every later change`,
      },
      { type: "text", section: 1, content: "mutation + send + no copy = frames rewritten after they leave." },
      {
        type: "code",
        section: 1,
        content: `data.lock().unwrap()[i] ^= 0xFF;
ch.send(Frame { buf: Arc::clone(&data), from: i })    // sends a handle`,
      },
      { type: "text", section: 2, content: "the fix: freeze a copy at send time." },
      {
        type: "code",
        section: 2,
        content: `let frozen = buf[i..].to_vec();
ch.send(Frame { buf: Arc::new(Mutex::new(frozen)), from: 0 })`,
      },
    ],
  },
};
