// ── JAVASCRIPT: A Field Manual ──
// Reeves' torn-out chapters for players learning SIGNAL in JavaScript.
// Same shape as the Go notes in beginner-notes.ts: `blocks` render as book
// pages (one section per page), `notesBlocks` are the in-game quick reference.
// JavaScript has no skeleton — the file is the program — so chapter one
// starts from a single line instead of package/import/main.

import type { BeginnerNotes } from "./beginner-notes";

export const JAVASCRIPT_BEGINNER_NOTES: Record<string, BeginnerNotes> = {
  "chapter-01": {
    title: "THE FIRST LINE",
    subtitle: "WHAT YOU NEED FOR THIS LEVEL",
    blocks: [
      // Section 0: the file is the program
      {
        type: "text",
        section: 0,
        content:
          "in javascript the file is the program. it runs from the top line to the bottom, one line after another. some languages make you build a skeleton first. javascript doesn't — one line is a whole program.",
      },
      {
        type: "code",
        section: 0,
        content: `console.log("Hello World");`,
        hotspots: [
          { text: "console.log", tip: "console is the terminal. .log writes whatever is inside the brackets, then starts a new line." },
          { text: `"Hello World"`, tip: "text in quotes is called a string. the quotes mark where the text starts and stops — they aren't printed." },
        ],
      },
      {
        type: "text",
        section: 0,
        important: true,
        content:
          "text always goes in quotes. without them javascript thinks you mean a name it should look up — and when it can't find one, it stops with an error.",
      },

      // Section 1: const and let
      {
        type: "text",
        section: 1,
        content:
          "a program needs to remember things. const gives a value a name that can never change. let gives it a name that can change later.",
      },
      {
        type: "code",
        section: 1,
        content: `const cell = "B-09";   // fixed — never changes
let sublevel = 3;      // allowed to change
sublevel = 4;          // fine, it's let

console.log(cell, sublevel); // B-09 4`,
        hotspots: [
          { text: `const cell = "B-09"`, tip: "a constant. try cell = \"B-10\" later and the program stops: assignment to constant variable." },
          { text: "let sublevel = 3", tip: "a variable. let says \"this one may change\" — numbers need no quotes." },
          { text: "sublevel = 4;", tip: "a plain = puts a new value in an existing let. no const or let in front — the name already exists." },
        ],
      },
      {
        type: "text",
        section: 1,
        content:
          "start with const. reach for let only when the value really has to change — it tells the next reader to keep an eye on that one.",
      },

      // Section 2: import / export
      {
        type: "text",
        section: 2,
        content:
          "the facility keeps maya's location in another file, cellblock.js. a file shares values with export. your file pulls them in with import.",
      },
      {
        type: "code",
        section: 2,
        content: `// cellblock.js — the guards' file
export const cell = "B-09";
export let sublevel = 3;`,
        hotspots: [
          { text: "export const cell", tip: "export makes cell visible to other files. without it, the value stays private to cellblock.js." },
        ],
      },
      {
        type: "code",
        section: 2,
        content: `import { cell, sublevel } from "./cellblock.js";

console.log(cell);     // B-09
console.log(sublevel); // 3`,
        hotspots: [
          { text: "import { cell, sublevel }", tip: "the names in the braces must match the exported names exactly — cell, not Cell. after this line you can use them below." },
          { text: `"./cellblock.js"`, tip: "./ means \"in this same folder\". the .js is part of the file name." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "imports go at the top of the file. you can read an imported value, but you can't reassign it from your file — the guards' file owns it.",
      },

      // Section 3: template literals
      {
        type: "text",
        section: 3,
        content:
          "now put the values into one line of text. wrap the text in backticks instead of quotes, and drop each value in with a dollar sign and curly braces. that's a template literal.",
      },
      {
        type: "code",
        section: 3,
        content: `import { cell, sublevel } from "./cellblock.js";

console.log(\`CELL \${cell} - SUBLEVEL \${sublevel}\`);
// CELL B-09 - SUBLEVEL 3`,
        hotspots: [
          { text: "${cell}", tip: "javascript swaps in the value of cell right here. the backticks around the text are what make this work — plain quotes would print ${cell} as is." },
          { text: "${sublevel}", tip: "numbers work too. the 3 is turned into text for you." },
        ],
      },
      {
        type: "text",
        section: 3,
        important: true,
        content:
          "why not just type CELL B-09 - SUBLEVEL 3? because the guards move prisoners. read the real values from their file — a typed guess goes stale the moment they move her.",
      },

      // Section 4: zen recap
      {
        type: "text",
        section: 4,
        content:
          "two habits for this level. const by default, let only when the value changes. and template literals instead of gluing strings together with + — the glued version is easy to get wrong by one missing space.",
      },
      {
        type: "code",
        section: 4,
        content: `// glued with + — count the spaces
console.log("CELL " + cell + " - SUBLEVEL " + sublevel);

// template literal — reads like the output
console.log(\`CELL \${cell} - SUBLEVEL \${sublevel}\`);`,
        hotspots: [
          { text: `"CELL " + cell`, tip: "works, but every space lives inside a separate string. drop one and the output runs together." },
        ],
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "the file is the program — it runs top to bottom. no setup." },
      {
        type: "code",
        section: 0,
        content: `console.log("Hello World"); // Hello World`,
      },
      { type: "text", section: 1, content: "store a value." },
      {
        type: "code",
        section: 1,
        content: `const cell = "B-09"; // never changes
let n = 3;           // can change`,
      },
      { type: "text", section: 2, content: "pull values from another file." },
      {
        type: "code",
        section: 2,
        content: `import { cell, sublevel } from "./cellblock.js";`,
      },
      { type: "text", section: 3, content: "mix text and values — backticks, then ${...}." },
      {
        type: "code",
        section: 3,
        content: `console.log(\`CELL \${cell} - SUBLEVEL \${sublevel}\`);`,
      },
    ],
  },

  "chapter-02": {
    title: "LOOPS & BRANCHES",
    subtitle: "CONTROLLING THE FLOW",
    blocks: [
      // Section 0: one line again
      {
        type: "text",
        section: 0,
        content:
          "the keypad runs javascript too. same as before — no skeleton, the file is the program. one line gets the terminal live.",
      },
      {
        type: "code",
        section: 0,
        content: `console.log("Hello World");`,
      },

      // Section 1: the for loop
      {
        type: "text",
        section: 1,
        content:
          "the keypad cycles codes 1 to 10. you could write ten console.log lines — or one loop that runs the same line ten times.",
      },
      {
        type: "code",
        section: 1,
        content: `for (let i = 1; i <= 10; i++) {
  console.log(i);
}`,
        hotspots: [
          { text: "let i = 1", tip: "the start. runs once, before the first pass — makes a counter called i and sets it to 1." },
          { text: "i <= 10", tip: "the condition. checked before every pass. the loop keeps going while it's true." },
          { text: "i++", tip: "the step. adds 1 to i after every pass, so the loop moves forward instead of running forever." },
          { text: "console.log(i);", tip: "the body. runs once per pass with the current value of i — 1, then 2, up to 10." },
        ],
      },
      {
        type: "text",
        section: 1,
        content:
          "three parts inside the round brackets, split by semicolons: where to start, when to keep going, how to step. the body in curly braces runs once per pass.",
      },
      {
        type: "text",
        section: 1,
        important: true,
        content:
          "the counter is let, not const. the loop changes i on every pass, and a const can never change — with const i, the very first i++ stops the program with an error.",
      },

      // Section 2: printing two things
      {
        type: "text",
        section: 2,
        content:
          "the classify step needs the number and its access level on one line. give console.log more than one thing, separated by commas — it prints them with a space between.",
      },
      {
        type: "code",
        section: 2,
        content: `const i = 7;
console.log(i, "GRANT"); // 7 GRANT`,
        hotspots: [
          { text: `i, "GRANT"`, tip: "two values, one comma. console.log adds the space for you — don't put one inside the quotes." },
        ],
      },

      // Section 3: if / else if / else
      {
        type: "text",
        section: 3,
        content:
          "branching — picking a path based on a condition. the keypad sorts codes into access levels:\n\ncodes 1-3 → DENY\ncodes 4-6 → WARN\ncodes 7-9 → GRANT\ncode 10 → OVERRIDE",
      },
      {
        type: "code",
        section: 3,
        content: `if (i <= 3) {
  console.log(i, "DENY");
} else if (i <= 6) {
  console.log(i, "WARN");
} else if (i <= 9) {
  console.log(i, "GRANT");
} else {
  console.log(i, "OVERRIDE");
}`,
        hotspots: [
          { text: "if (i <= 3)", tip: "the condition goes in round brackets — javascript needs them. true for 1, 2 and 3." },
          { text: "} else if (i <= 6)", tip: "only checked when the one above was false, so this catches 4, 5 and 6." },
          { text: "} else if (i <= 9)", tip: "only reached when i is past 6. catches 7, 8 and 9." },
          { text: "} else {", tip: "no condition — runs when nothing above matched. that's code 10." },
        ],
      },
      {
        type: "text",
        section: 3,
        content:
          "the checks run top to bottom and the first true one wins. put this inside the loop and all ten codes get sorted.",
      },

      // Section 4: switch (true), break, ===
      {
        type: "text",
        section: 4,
        content:
          "the rewrite step asks for the other approach. a switch lists cases instead of chaining else if. switch (true) means: run the first case whose condition is true.",
      },
      {
        type: "code",
        section: 4,
        content: `switch (true) {
  case i <= 3:
    console.log(i, "DENY");
    break;
  case i <= 6:
    console.log(i, "WARN");
    break;
  case i <= 9:
    console.log(i, "GRANT");
    break;
  default:
    console.log(i, "OVERRIDE");
}`,
        hotspots: [
          { text: "switch (true)", tip: "compares true against each case, top to bottom. the first case that is true matches." },
          { text: "case i <= 3:", tip: "one case per range. a colon, not curly braces — the case runs until it hits break." },
          { text: "break;", tip: "stops here and leaves the switch. every case needs one." },
          { text: "default:", tip: "runs when no case matched — code 10. the switch version of a final else." },
        ],
      },
      {
        type: "text",
        section: 4,
        important: true,
        content:
          "always end a case with break. without it javascript falls through — it keeps running the next case's lines too, even though that case didn't match. code 1 would print DENY and then WARN.",
      },
      {
        type: "text",
        section: 4,
        content:
          "a switch matches with === — strict equals. one = stores a value. === asks \"same value and same type?\". there's also a loose ==, which converts first and so calls the text \"5\" equal to the number 5. use === and a mix-up can't sneak through.",
      },
      {
        type: "code",
        section: 4,
        content: `console.log(5 === 5);   // true
console.log("5" === 5); // false — text vs number
console.log("5" == 5);  // true — loose, converts first`,
        hotspots: [
          { text: `"5" == 5`, tip: "the loose version. it quietly turns the text into a number before comparing. easy to get fooled by." },
        ],
      },

      // Section 5: zen recap
      {
        type: "text",
        section: 5,
        content:
          "three habits for this level. let for a counter that changes. === instead of ==. a break at the end of every case. if/else and switch (true) are both good javascript — pick whichever reads clearest. the expected output is:\n\n1 DENY, 2 DENY, 3 DENY, 4 WARN, 5 WARN, 6 WARN, 7 GRANT, 8 GRANT, 9 GRANT, 10 OVERRIDE",
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, content: "count 1 to 10 — the counter is let." },
      {
        type: "code",
        section: 0,
        content: `for (let i = 1; i <= 10; i++) {
  console.log(i);
}`,
      },
      { type: "text", section: 1, content: "print a number and a word — the comma adds the space." },
      {
        type: "code",
        section: 1,
        content: `console.log(i, "DENY"); // 1 DENY`,
      },
      { type: "text", section: 2, content: "branch — the first true condition wins." },
      {
        type: "code",
        section: 2,
        content: `if (i <= 3) {
  // DENY
} else if (i <= 6) {
  // WARN
} else {
  // everything else
}`,
      },
      { type: "text", section: 3, important: true, content: "switch (true) — break after every case, or it falls through." },
      {
        type: "code",
        section: 3,
        content: `switch (true) {
  case i <= 3:
    console.log(i, "DENY");
    break;
  default:
    console.log(i, "OVERRIDE");
}`,
      },
      { type: "text", section: 4, content: "compare with ===, not ==." },
      {
        type: "code",
        section: 4,
        content: `"5" === 5 // false
"5" == 5  // true — loose`,
      },
    ],
  },

  "chapter-03": {
    title: "FUNCTIONS",
    subtitle: "BUILDING BLOCKS",
    blocks: [
      // Section 0: one line, then functions
      {
        type: "text",
        section: 0,
        content:
          "the shaft panel runs javascript. one line gets it live — you know this one by now.",
      },
      {
        type: "code",
        section: 0,
        content: `console.log("Hello World");`,
      },
      {
        type: "text",
        section: 0,
        content:
          "this time you'll write functions: named pieces of code you can run again and again, with different values each time.",
      },

      // Section 1: functions
      {
        type: "text",
        section: 1,
        content:
          "a function is a recipe with a name. write it once with function, then run it — call it — by its name and round brackets. values go in through the parameters. return hands one back.",
      },
      {
        type: "code",
        section: 1,
        content: `function double(n) {
  return n * 2;
}

console.log(double(4));  // 8
console.log(double(50)); // 100`,
        hotspots: [
          { text: "function double(n)", tip: "function, then the name, then the parameters in brackets. n is a placeholder for whatever value the caller sends in." },
          { text: "return n * 2;", tip: "sends the answer back to whoever called. the function stops here." },
          { text: "double(4)", tip: "a call. n becomes 4 for this run, and the call is replaced by what came back — 8." },
        ],
      },
      {
        type: "text",
        section: 1,
        content:
          "writing a function doesn't run it. nothing happens until you call it.",
      },

      // Section 2: arrays and for...of
      {
        type: "text",
        section: 2,
        content:
          "the junction sends a list of codes. in javascript a list is an array — values in square brackets, split by commas. for...of walks through it, one value per pass.",
      },
      {
        type: "code",
        section: 2,
        content: `const codes = [25, 30, 50, 10];

console.log(codes.length); // 4
console.log(codes[0]);     // 25 — counting starts at 0

for (const c of codes) {
  console.log(c);
}`,
        hotspots: [
          { text: "[25, 30, 50, 10]", tip: "an array of four numbers. square brackets hold the list." },
          { text: "codes.length", tip: "how many values the array holds." },
          { text: "codes[0]", tip: "the first value. positions start at 0, so codes[3] is the fourth." },
          { text: "for (const c of codes)", tip: "each pass, c is the next value: 25, then 30, 50, 10. const is fine here — every pass gets a fresh c." },
        ],
      },

      // Section 3: rest parameters
      {
        type: "text",
        section: 3,
        content:
          "each junction sends a different number of codes. a rest parameter — three dots before the name — gathers every argument into one array, however many there are.",
      },
      {
        type: "code",
        section: 3,
        content: `function sumCodes(...codes) {
  let total = 0;
  for (const c of codes) {
    total += c;
  }
  return total;
}

console.log("Sum:", sumCodes(25, 30, 50, 10)); // Sum: 115
console.log("Sum:", sumCodes(1, 2, 3));        // Sum: 6`,
        hotspots: [
          { text: "...codes", tip: "the three dots gather every argument into an array called codes. one value, four values, any number." },
          { text: "let total = 0;", tip: "let, because total grows on every pass." },
          { text: "total += c;", tip: "adds c to total. the same as total = total + c." },
          { text: "return total;", tip: "sumCodes only sums. it doesn't print — the caller decides what to do with the answer." },
        ],
      },

      // Section 4: two values back — array return, destructuring, spread
      {
        type: "text",
        section: 4,
        content:
          "a function returns one thing. to hand back two, return an array holding both. the caller unpacks it with destructuring — square brackets on the left side of the =.",
      },
      {
        type: "code",
        section: 4,
        content: `function validateCode(...codes) {
  const total = sumCodes(...codes);
  return [total, total > 100];
}

const [s, v] = validateCode(25, 30, 50, 10);
console.log(\`Result: \${s}, Valid: \${v}\`);
// Result: 115, Valid: true`,
        hotspots: [
          { text: "sumCodes(...codes)", tip: "the same three dots, used the other way round: they spread the array back out into separate arguments. reuse what you already built." },
          { text: "[total, total > 100]", tip: "two values in one array. first the sum, then true or false." },
          { text: "const [s, v] =", tip: "destructuring. s gets the first item, v gets the second." },
        ],
      },
      {
        type: "text",
        section: 4,
        important: true,
        content:
          "three dots in the parameters gather values into an array. three dots in a call spread an array back out. same symbol, opposite directions.",
      },

      // Section 5: zen recap
      {
        type: "text",
        section: 5,
        content:
          "three habits for this level. keep each function to one job — sumCodes sums, validateCode validates, neither prints. reuse sumCodes instead of writing the loop twice. and return a comparison directly — total > 100 is already true or false.",
      },
      {
        type: "code",
        section: 5,
        content: `// direct — the comparison is already a boolean
return [total, total > 100];

// works, but four extra lines for nothing
if (total > 100) {
  return [total, true];
} else {
  return [total, false];
}`,
        hotspots: [
          { text: "return [total, total > 100];", tip: "total > 100 gives true or false on its own. hand it straight back." },
          { text: "return [total, true];", tip: "this works, but the if/else just rebuilds the boolean the comparison already gave you." },
        ],
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, content: "a function — define once, call by name." },
      {
        type: "code",
        section: 0,
        content: `function double(n) {
  return n * 2;
}
double(4); // 8`,
      },
      { type: "text", section: 1, content: "rest parameter — any number of arguments, arriving as an array." },
      {
        type: "code",
        section: 1,
        content: `function sumCodes(...codes) {
  let total = 0;
  for (const c of codes) {
    total += c;
  }
  return total;
}`,
      },
      { type: "text", section: 2, important: true, content: "two values back — return an array, unpack with destructuring." },
      {
        type: "code",
        section: 2,
        content: `return [total, total > 100];

const [s, v] = validateCode(25, 30);`,
      },
      { type: "text", section: 3, content: "spread an array back into arguments." },
      {
        type: "code",
        section: 3,
        content: `const total = sumCodes(...codes);`,
      },
    ],
  },

  "chapter-04": {
    title: "OBJECTS & SETS",
    subtitle: "KEY-VALUE LOOKUPS",
    blocks: [
      // Section 0: one line, then objects
      {
        type: "text",
        section: 0,
        content:
          "the surveillance terminal runs javascript. one line wakes it — you know this one. nothing to import this chapter: objects and sets are built into the language.",
      },
      {
        type: "code",
        section: 0,
        content: `console.log("Hello World");`,
      },
      {
        type: "text",
        section: 0,
        content:
          "then the real work: a roster that pairs every guard with a floor, and a way to spot the floor nobody is on.",
      },

      // Section 1: object literals
      {
        type: "text",
        section: 1,
        content:
          "an object pairs keys with values. write it as an object literal — curly braces, key: value pairs, commas between them. the guard's name is the key, the floor is the value.",
      },
      {
        type: "code",
        section: 1,
        content: `function buildRoster() {
  return {
    Chen: "Floor 1",
    Alvarez: "Floor 2",
    Volkov: "Floor 2",
    Park: "Floor 3",
    Santos: "Floor 1",
  };
}`,
        hotspots: [
          { text: "return {", tip: "a function can hand back a whole object. the literal goes straight after return — no variable needed first." },
          { text: `Chen: "Floor 1",`, tip: "one pair: the key Chen, a colon, the value \"Floor 1\". a key that's a plain name needs no quotes. the value is text, so it does." },
          { text: `Santos: "Floor 1",`, tip: "a comma after the last pair too. javascript allows it, and adding a sixth guard won't touch this line." },
        ],
      },
      {
        type: "text",
        section: 1,
        content:
          "declare all the pairs at once. it's cleaner than starting with {} and adding guards one assignment at a time — the code looks like the roster.",
      },

      // Section 2: reading the roster
      {
        type: "text",
        section: 2,
        content:
          "look a guard up with a dot or square brackets. a key that isn't there gives undefined, not an error. objects have no .length — count them through Object.keys.",
      },
      {
        type: "code",
        section: 2,
        content: `const r = buildRoster();

console.log(r.Volkov);              // Floor 2
console.log(r["Chen"]);             // Floor 1
console.log(r.Nobody);              // undefined
console.log(Object.keys(r).length); // 5
console.log(Object.values(r));      // the five floors`,
        hotspots: [
          { text: "r.Volkov", tip: "dot lookup — the key written as a plain name." },
          { text: `r["Chen"]`, tip: "bracket lookup — the same thing, with the key as a string. use brackets when the key sits in a variable." },
          { text: "Object.keys(r)", tip: "an array of the keys — the names. its .length is how many guards there are." },
          { text: "Object.values(r)", tip: "an array of the values — just the floors, no names. Floor 2 appears twice because two guards are on it." },
        ],
      },
      {
        type: "text",
        section: 2,
        content:
          "plain-name keys come back in the order you wrote them. still, don't build logic that leans on the order — ask for the key you want.",
      },

      // Section 3: Map, and why the roster isn't one
      {
        type: "text",
        section: 3,
        content:
          "javascript also has a Map — a dedicated key-value store you fill with .set and read with .get. it's useful when keys aren't plain names. the roster uses a plain object, because that's what the terminal reads, and what most javascript you'll ever meet uses.",
      },
      {
        type: "code",
        section: 3,
        content: `const m = new Map();
m.set("Chen", "Floor 1");

console.log(m.get("Chen")); // Floor 1
console.log(m.Chen);        // undefined`,
        hotspots: [
          { text: "m.get(\"Chen\")", tip: "a Map keeps its entries behind .get — that's the only way in." },
          { text: "m.Chen", tip: "dot lookup doesn't reach inside a Map. hand the terminal a Map and every lookup comes back undefined." },
        ],
      },

      // Section 4: Set
      {
        type: "text",
        section: 4,
        content:
          "a Set holds each value once and answers .has straight away. some languages fake a set with a table of true values. javascript has the real thing.",
      },
      {
        type: "code",
        section: 4,
        content: `const occupied = new Set(Object.values(r));

console.log(occupied.size);           // 3 — Floor 1, 2, 3
console.log(occupied.has("Floor 2")); // true
console.log(occupied.has("Floor 4")); // false`,
        hotspots: [
          { text: "new Set(Object.values(r))", tip: "every floor that has a guard on it. five values go in, duplicates fall away — three floors come out." },
          { text: "occupied.size", tip: "a Set counts its items with .size, not .length." },
          { text: `occupied.has("Floor 4")`, tip: "true if the value is in the set, false if not. no guard on floor 4, so false." },
        ],
      },
      {
        type: "text",
        section: 4,
        important: true,
        content:
          "an array's .includes gives the same answer, but it walks the whole list every time you ask. build the Set once, then ask it as often as you like.",
      },

      // Section 5: finding the gap
      {
        type: "text",
        section: 5,
        content:
          "to find the first clear floor, count from 1 up to the top floor, build each floor's name with a template literal, and return the first one the set doesn't have.",
      },
      {
        type: "code",
        section: 5,
        content: `function findClearFloor(guards, maxFloor) {
  const occupied = new Set(Object.values(guards));
  for (let i = 1; i <= maxFloor; i++) {
    const name = \`Floor \${i}\`;
    if (!occupied.has(name)) return name;
  }
  return "";
}`,
        hotspots: [
          { text: "i <= maxFloor", tip: "<= so the top floor is checked too. use the parameter — the terminal tries buildings of different heights." },
          { text: "`Floor ${i}`", tip: "a template literal, like chapter one: the number drops into the name. Floor 1, Floor 2..." },
          { text: "!occupied.has(name)", tip: "the ! flips true and false. this is true when no guard is on that floor." },
          { text: "return name;", tip: "return ends the function on the spot. the first clear floor wins — the loop stops there." },
          { text: `return "";`, tip: "only reached when every floor has a guard. an empty string means: nowhere to go." },
        ],
      },

      // Section 6: zen recap
      {
        type: "text",
        section: 6,
        content:
          "habits for this level. build the roster in one object literal, with a comma after every pair. reach for Object.values when you only need the values. keep membership in a real Set and ask it with .has. and build names with a template literal, not +.",
      },
      {
        type: "code",
        section: 6,
        content: `// a Set — asked once per floor, answers straight away
const occupied = new Set(Object.values(guards));
occupied.has(name);

// works, but walks the whole list every time
const floors = Object.values(guards);
floors.includes(name);`,
        hotspots: [
          { text: "occupied.has(name);", tip: "the set answers without looking through every floor." },
          { text: "floors.includes(name);", tip: "same answer, but it checks the floors one by one, every single time." },
        ],
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, content: "an object — keys paired with values." },
      {
        type: "code",
        section: 0,
        content: `return {
  Chen: "Floor 1",
  Volkov: "Floor 2",
};`,
      },
      { type: "text", section: 1, content: "look up, and count." },
      {
        type: "code",
        section: 1,
        content: `r.Volkov;              // "Floor 2"
Object.keys(r).length; // how many guards
Object.values(r);      // just the floors`,
      },
      { type: "text", section: 2, important: true, content: "a Set — each value once, asked with .has." },
      {
        type: "code",
        section: 2,
        content: `const occupied = new Set(Object.values(guards));
occupied.has("Floor 4"); // false`,
      },
      { type: "text", section: 3, content: "first floor not in the set." },
      {
        type: "code",
        section: 3,
        content: `for (let i = 1; i <= maxFloor; i++) {
  const name = \`Floor \${i}\`;
  if (!occupied.has(name)) return name;
}`,
      },
    ],
  },

  "chapter-04.2": {
    title: "STRINGS & CHARACTERS",
    subtitle: "TAKING TEXT APART",
    blocks: [
      // Section 0: one line, nothing to import
      {
        type: "text",
        section: 0,
        content:
          "the comms room. one line brings the relay online. still nothing to import — split, join, reverse and Number come with every string and array.",
      },
      {
        type: "code",
        section: 0,
        content: `console.log("Hello World");`,
      },
      {
        type: "text",
        section: 0,
        content:
          "this chapter you'll build a cipher: reverse every word so the keyword scanners can't read the message, then stamp it with a header.",
      },

      // Section 1: spreading a string into characters
      {
        type: "text",
        section: 1,
        content:
          "a string can't be changed in place, and it has no reverse. arrays do. so spread the string into an array of characters, reverse the array, and join it back into a new string.",
      },
      {
        type: "code",
        section: 1,
        content: `function reverseWord(s) {
  return [...s].reverse().join("");
}

console.log(reverseWord("hello")); // olleh`,
        hotspots: [
          { text: "[...s]", tip: "the spread — the same three dots as chapter three. it lays the string out as an array, one character per slot: [\"h\", \"e\", \"l\", \"l\", \"o\"]." },
          { text: ".reverse()", tip: "flips the array, last to first. strings don't have this — that's why you spread first." },
          { text: `.join("")`, tip: "glues the array back into one string with nothing between the pieces. leave out the \"\" and you get commas." },
        ],
      },
      {
        type: "text",
        section: 1,
        content:
          "each call hands its result to the next one — spread, then reverse, then join. that's called chaining. read it left to right.",
      },

      // Section 2: why not split("")
      {
        type: "text",
        section: 2,
        content:
          "you'll see s.split(\"\") used for this too. on plain letters it gives the same array. but under the hood some characters — emoji, for one — are stored as two pieces, and split(\"\") cuts them apart.",
      },
      {
        type: "code",
        section: 2,
        content: `"😀".split("");  // two broken halves
[..."😀"];        // ["😀"] — one whole character

"a😀b".split("").reverse().join(""); // garbage in the middle
[..."a😀b"].reverse().join("");      // "b😀a"`,
        hotspots: [
          { text: `"😀".split("")`, tip: "split(\"\") cuts the string into storage pieces. this emoji is two pieces, so it splits in half." },
          { text: `[..."😀"]`, tip: "the spread walks the string character by character — the emoji stays in one piece." },
          { text: `[..."a😀b"].reverse().join("")`, tip: "spread, reverse, join — the emoji survives the round trip." },
        ],
      },
      {
        type: "text",
        section: 2,
        important: true,
        content:
          "spread a string when you want its characters: [...s]. Array.from(s) does the same thing. save split for cutting at a separator, like a space.",
      },

      // Section 3: split and join words
      {
        type: "text",
        section: 3,
        content:
          "split with a separator cuts a string into an array at every match. join does the opposite — it glues an array into one string, with the separator between each piece.",
      },
      {
        type: "code",
        section: 3,
        content: `const words = "move to shaft 3".split(" ");
console.log(words);           // [ 'move', 'to', 'shaft', '3' ]
console.log(words.join("-")); // move-to-shaft-3`,
        hotspots: [
          { text: `.split(" ")`, tip: "cuts at every space. two spaces in a row would leave an empty word between them — the messages here use one." },
          { text: `.join("-")`, tip: "whatever you pass goes between every piece. a space puts the sentence back together." },
        ],
      },

      // Section 4: functions are values — map
      {
        type: "text",
        section: 4,
        content:
          "a function is a value, like a number or a string. you can hand one to another function. map takes a function, runs it on every item of an array, and gives back a new array of the results.",
      },
      {
        type: "code",
        section: 4,
        content: `function encode(msg) {
  return msg.split(" ").map(reverseWord).join(" ");
}

console.log(encode("floor is clear"));         // roolf si raelc
console.log(encode(encode("floor is clear"))); // floor is clear`,
        hotspots: [
          { text: ".map(reverseWord)", tip: "no brackets after reverseWord — you're handing over the function itself. map calls it once per word." },
          { text: `.join(" ")`, tip: "puts the reversed words back together with spaces." },
          { text: "encode(encode(", tip: "reverse a reversed word and you're back where you started. reeves decodes with the same function." },
        ],
      },
      {
        type: "text",
        section: 4,
        content:
          "map never changes the old array — it builds a new one. you'll also see the function written in place with an arrow: .map((w) => reverseWord(w)). the arrow takes a word on the left and returns what's on the right. when it only passes the word along, .map(reverseWord) says it shorter.",
      },

      // Section 5: Number and NaN
      {
        type: "text",
        section: 5,
        content:
          "the relay's codes arrive as text. Number turns text into a number. when the text isn't a number, javascript doesn't stop with an error — it hands back NaN, \"not a number\", and carries on.",
      },
      {
        type: "code",
        section: 5,
        content: `Number("50");   // 50
Number("abc");  // NaN
Number("12abc"); // NaN — the whole thing must be a number

Number.isNaN(Number("abc")); // true
NaN === NaN;                 // false`,
        hotspots: [
          { text: `Number("abc")`, tip: "no crash. the bad value comes back as NaN, and anything you do with it is NaN too." },
          { text: "Number.isNaN(", tip: "the check that works. true only for a real NaN." },
          { text: "NaN === NaN;", tip: "NaN isn't equal to anything — not even itself. so n === NaN is always false. ask Number.isNaN instead." },
        ],
      },
      {
        type: "text",
        section: 5,
        important: true,
        content:
          "skip parseInt here. parseInt(\"12abc\") quietly gives 12 — it reads digits until it hits something else and drops the rest. and watch the empty string: Number(\"\") is 0, not NaN.",
      },

      // Section 6: the relay header
      {
        type: "text",
        section: 6,
        content:
          "the header puts it together. convert the code, catch the bad case first, then build the header with a template literal — numbers drop in as text on their own.",
      },
      {
        type: "code",
        section: 6,
        content: `function relayHeader(floor, code) {
  const n = Number(code);
  if (Number.isNaN(n)) return \`F\${floor}-ERR\`;
  return \`F\${floor}-C\${n * 2}\`;
}

console.log(relayHeader(2, "50"));  // F2-C100
console.log(relayHeader(3, "abc")); // F3-ERR`,
        hotspots: [
          { text: "const n = Number(code);", tip: "text in, number out — or NaN if the text was garbage." },
          { text: "if (Number.isNaN(n))", tip: "the bad case first. if this returns, the line below never runs." },
          { text: "${n * 2}", tip: "the relay doubles the code as a checksum. the maths happens inside the ${}, then the result drops into the text." },
        ],
      },

      // Section 7: three error models
      {
        type: "text",
        section: 7,
        content:
          "reeves' margin note: every language decides what happens when \"abc\" should have been a number. go hands back two values — the number and an error — and you check the error. python raises a ValueError, and you catch it with try/except. javascript does neither: it hands back NaN and carries on.",
      },
      {
        type: "code",
        section: 7,
        content: `try {
  const n = Number("abc"); // no error to catch
  console.log(n);          // NaN
} catch (e) {
  console.log("never runs");
}`,
        hotspots: [
          { text: "catch (e)", tip: "try/catch does exist in javascript — but Number never throws, so there's nothing for it to catch." },
          { text: "// NaN", tip: "the poisoned value. the only way to notice it is to check: Number.isNaN(n)." },
        ],
      },
      {
        type: "text",
        section: 7,
        important: true,
        content:
          "returned, raised, or poisoned. three answers to the same problem. in javascript the check is on you.",
      },

      // Section 8: zen recap
      {
        type: "text",
        section: 8,
        content:
          "habits for this level. spread a string into characters with [...s], not split(\"\"). let the array reverse itself. transform with map, and reuse reverseWord instead of reversing twice. convert with Number and check with Number.isNaN. build the header with a template literal.",
      },
      {
        type: "code",
        section: 8,
        content: `// map — every word in, every word out
return msg.split(" ").map(reverseWord).join(" ");

// works, but it's the same thing the long way
const out = [];
for (const w of msg.split(" ")) {
  out.push(reverseWord(w));
}
return out.join(" ");`,
        hotspots: [
          { text: ".map(reverseWord)", tip: "the whole loop in one call — and it can't forget to push." },
          { text: "out.push(reverseWord(w));", tip: "this is what map does for you: an empty array, a loop, a push." },
        ],
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, content: "reverse a word — spread, reverse, join." },
      {
        type: "code",
        section: 0,
        content: `return [...s].reverse().join("");`,
      },
      { type: "text", section: 1, important: true, content: "[...s] keeps characters whole. split(\"\") can cut emoji in half." },
      {
        type: "code",
        section: 1,
        content: `[..."a😀b"]; // ["a", "😀", "b"]`,
      },
      { type: "text", section: 2, content: "split into words, map each, join back." },
      {
        type: "code",
        section: 2,
        content: `return msg.split(" ").map(reverseWord).join(" ");`,
      },
      { type: "text", section: 3, important: true, content: "bad numbers don't throw — they come back NaN." },
      {
        type: "code",
        section: 3,
        content: `const n = Number(code);
if (Number.isNaN(n)) return \`F\${floor}-ERR\`;
return \`F\${floor}-C\${n * 2}\`;`,
      },
    ],
  },

  "boss-01": {
    title: "WEAPON SYSTEMS",
    subtitle: "SURVIVING THE LOCKMASTER",
    blocks: [
      // Section 0: tactics
      {
        type: "text",
        section: 0,
        content:
          "the lockmaster fights back. keep moving — it fires where you stand, and every hit costs a heart. your weapon fires on its own whenever the core is in sight and in range.",
      },
      {
        type: "text",
        section: 0,
        important: true,
        content:
          "when your shots stop landing, duck to a lit pad. the fight freezes while you're in cover. fix the weapon, run it, and you rearm. three upgrades, and each one is something you already learned.",
      },

      // Section 1: sight — variables + console.log
      {
        type: "text",
        section: 1,
        content:
          "phase one, sight. the weapon is cold — every trait is 0. set damage, fire rate and reach, then print the spec line so the weapon can read it.",
      },
      {
        type: "code",
        section: 1,
        content: `let damage = 12;
let fireRate = 500;
let reach = 6;
console.log("DMG", damage, "RATE", fireRate, "RANGE", reach);
// DMG 12 RATE 500 RANGE 6`,
        hotspots: [
          { text: "let damage = 12;", tip: "a name holding a number — chapter one. change the 0 to the value the weapon needs." },
          { text: `console.log("DMG", damage`, tip: "commas put a space between every piece — chapter two. the words in quotes, the values without." },
        ],
      },

      // Section 2: charge — counting loop
      {
        type: "text",
        section: 2,
        content:
          "phase two, charge. it shrugs off single shots. four capacitors, each adding 90 to the fire rate. a counting loop does the adding for you.",
      },
      {
        type: "code",
        section: 2,
        content: `let rate = 0;
for (let i = 0; i < 4; i++) {
  rate += 90;
}
const damage = 16;
const reach = 7;
console.log("DMG", damage, "RATE", rate, "RANGE", reach);
// DMG 16 RATE 360 RANGE 7`,
        hotspots: [
          { text: "i < 4", tip: "starts at 0 and stops before 4: passes 0, 1, 2 and 3. that's four capacitors." },
          { text: "rate += 90;", tip: "adds 90 on every pass. four passes make 360. rate is let because it grows." },
        ],
      },

      // Section 3: combo — rest-parameter function
      {
        type: "text",
        section: 3,
        content:
          "phase three, combo. last stand. combo takes every module's charge and sums it into one overload shot — the same rest-parameter function you wrote in the shaft.",
      },
      {
        type: "code",
        section: 3,
        content: `function combo(...mods) {
  let total = 0;
  for (const m of mods) {
    total += m;
  }
  return total;
}

const damage = combo(8, 7, 7);
console.log("DMG", damage, "RATE", 260, "RANGE", 8);
// DMG 22 RATE 260 RANGE 8`,
        hotspots: [
          { text: "...mods", tip: "gathers every module into one array — chapter three." },
          { text: "for (const m of mods)", tip: "walks the modules one at a time and adds each to total." },
          { text: "combo(8, 7, 7)", tip: "three modules: 8 + 7 + 7 = 22. the call is replaced by the total." },
        ],
      },

      // Section 4: recap
      {
        type: "text",
        section: 4,
        content:
          "sight is variables. charge is a loop. combo is a function. if a phase won't arm, read the spec line it prints — the numbers tell you what's off. take your time in cover. the fight waits for you there.",
      },
    ],

    notesBlocks: [
      { type: "text", section: 0, important: true, content: "duck to a lit pad — the fight freezes. fix the weapon, run it, rearm." },
      { type: "text", section: 1, content: "sight — set each trait, print the spec line." },
      {
        type: "code",
        section: 1,
        content: `let damage = 12;
console.log("DMG", damage, "RATE", fireRate, "RANGE", reach);`,
      },
      { type: "text", section: 2, content: "charge — add inside the loop. four passes." },
      {
        type: "code",
        section: 2,
        content: `for (let i = 0; i < 4; i++) {
  rate += 90;
}`,
      },
      { type: "text", section: 3, content: "combo — sum every value in the rest parameter." },
      {
        type: "code",
        section: 3,
        content: `for (const m of mods) {
  total += m;
}`,
      },
    ],
  },
};
