// ── Act II in JavaScript ──
// The same steps as the Go chapters (story, stakes, XP, events are shared);
// only the code-shaped half is realized here. Divergences from Go, decided in
// docs/cross-language-act-2-plan.md:
//   • the roster is a plain object (what JSON and real code use), not a Map
//   • Go fakes a set with map[string]bool — JavaScript has a real `Set`
//   • `[...s]` splits a string into whole characters — the twin of Go's []rune
//   • Number("abc") doesn't throw, it returns NaN — check with Number.isNaN
//   • nothing in chapter 4.2 needs an import, so its scaffold is Hello World

import type { ChallengeRealization } from "@/types/game";

export const JS_CHAPTER_04: ChallengeRealization = {
  concepts: ["Objects", "Sets", "Object.values", "Template literals"],
  steps: {
    "chapter-04:scaffold": {
      brief: "Wake the terminal: print `Hello World`.",
      expectedBehavior: "Hello World",
      expectedOutput: "Hello World",
      quickCheck: {
        prompt: "same one-liner, new terminal — tap whatever you need a refresher on.",
        items: [
          { question: "how do i print again?", answer: "`console.log(\"Hello World\");` — one line is the whole program." },
          { question: "do i need an import for this chapter?", answer: "no. objects and sets are built into javascript — nothing to import." },
        ],
      },
      hints: [
        { level: 1, text: "`console.log(...)` prints a line.", energyCost: 5 },
        { level: 2, text: "text in quotes inside the brackets.", energyCost: 8 },
        { level: 3, text: "`console.log(\"Hello World\");`", energyCost: 12 },
      ],
    },
    "chapter-04:guardmap": {
      brief:
        "Write `buildRoster()` that returns an object of guard → floor:\n\nChen: \"Floor 1\"\nAlvarez: \"Floor 2\"\nVolkov: \"Floor 2\"\nPark: \"Floor 3\"\nSantos: \"Floor 1\"\n\nThe terminal looks up Volkov, then Chen, then counts the guards:\n\nFloor 2\nFloor 1\n5",
      expectedBehavior: "Floor 2\nFloor 1\n5",
      testHarness: `const r = buildRoster();
console.log(r.Volkov);
console.log(r["Chen"]);
console.log(Object.keys(r).length);`,
      expectedOutput: "Floor 2\nFloor 1\n5",
      quickCheck: {
        prompt: "stuck on the roster? tap the question that's in your head.",
        items: [
          {
            question: "how does an object hold a guard and their floor?",
            answer: "it pairs keys with values: `{ Chen: \"Floor 1\" }`. the name is the key, the floor is the value.",
          },
          {
            question: "how do i write more than one pair?",
            answer: "commas between them inside the braces. one pair per line reads best — end each with a comma.",
          },
          {
            question: "how does the terminal read it?",
            answer: "`r.Volkov` or `r[\"Volkov\"]` looks a guard up, and `Object.keys(r).length` counts them.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`function buildRoster() { return { ... }; }` — an object literal is curly braces with `key: value` pairs.", energyCost: 8 },
        { level: 2, text: "`return { Chen: \"Floor 1\", Alvarez: \"Floor 2\", ... };` — one pair per guard, commas between.", energyCost: 12 },
        { level: 3, text: "all five guards, spelled exactly: Chen, Alvarez, Volkov, Park, Santos. the terminal checks names and the count.", energyCost: 20 },
      ],
    },
    "chapter-04:clearfloors": {
      brief:
        "Write `findClearFloor(guards, maxFloor)`: collect the floors that have a guard into a `Set`, then return the first of `Floor 1` … `Floor maxFloor` that isn't in it.\n\nThe terminal tries three rosters:\n\nFloor 4\nFloor 2\nFloor 3",
      expectedBehavior: "Floor 4\nFloor 2\nFloor 3",
      testHarness: `const r = buildRoster();
console.log(findClearFloor(r, 4));
console.log(findClearFloor({ A: "Floor 1", B: "Floor 3" }, 3));
console.log(findClearFloor({ X: "Floor 1", Y: "Floor 2" }, 3));`,
      expectedOutput: "Floor 4\nFloor 2\nFloor 3",
      quickCheck: {
        prompt: "stuck finding the gap? tap the question that's in your head.",
        items: [
          {
            question: "how do i get just the floors out of the roster?",
            answer: "`Object.values(guards)` gives you an array of every value — the floors — without the names.",
          },
          {
            question: "what's a Set and why use one?",
            answer: "a Set holds each thing once and answers `.has(x)` instantly. `new Set(Object.values(guards))` is every occupied floor.",
          },
          {
            question: "how do i check floors 1 up to maxFloor?",
            answer: "`for (let i = 1; i <= maxFloor; i++)` — the same loop as the door keypad.",
          },
          {
            question: "how do i build the floor's name?",
            answer: "a template literal: ``const name = `Floor ${i}`;``",
          },
        ],
      },
      hints: [
        { level: 1, text: "`const occupied = new Set(Object.values(guards));` — every floor with a guard, each once.", energyCost: 8 },
        { level: 2, text: "`for (let i = 1; i <= maxFloor; i++)` — build the name with a template literal.", energyCost: 12 },
        { level: 3, text: "inside the loop: `if (!occupied.has(name)) return name;` — the first gap wins.", energyCost: 20 },
      ],
    },
  },
};

export const JS_CHAPTER_04_2: ChallengeRealization = {
  concepts: ["Strings", "Spread [...s]", "split & join", "Number & NaN"],
  steps: {
    "chapter-04.2:scaffold": {
      brief: "Bring the relay online: print `Hello World`.",
      expectedBehavior: "Hello World",
      expectedOutput: "Hello World",
      quickCheck: {
        prompt: "same one-liner, new room — tap whatever you need a refresher on.",
        items: [
          { question: "how do i print again?", answer: "`console.log(\"Hello World\");`" },
          {
            question: "what do i need to import for the cipher?",
            answer: "nothing. `split`, `join`, `reverse` and `Number` are all built in.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`console.log(...)` prints a line.", energyCost: 5 },
        { level: 2, text: "text in quotes inside the brackets.", energyCost: 8 },
        { level: 3, text: "`console.log(\"Hello World\");`", energyCost: 12 },
      ],
    },
    "chapter-04.2:reverseword": {
      brief:
        "Write `reverseWord(s)` that returns the word backwards. Spread it into characters with `[...s]`, reverse, join. The terminal tries three words:\n\nolleh\noG\na",
      expectedBehavior: "olleh\noG\na",
      testHarness: `console.log(reverseWord("hello"));
console.log(reverseWord("Go"));
console.log(reverseWord("a"));`,
      expectedOutput: "olleh\noG\na",
      quickCheck: {
        prompt: "stuck reversing the word? tap the question that's in your head.",
        items: [
          {
            question: "can i reverse a string directly?",
            answer: "no — strings have no `reverse`. turn it into an array of characters, reverse that, join it back.",
          },
          {
            question: "why `[...s]` and not `s.split(\"\")`?",
            answer: "spreading splits into whole characters. `split(\"\")` cuts some characters, like emoji, in half.",
          },
          {
            question: "how do i turn the array back into a string?",
            answer: "`.join(\"\")` glues the characters together with nothing between them.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`[...s]` turns the word into an array of characters.", energyCost: 5 },
        { level: 2, text: "arrays have `.reverse()`. strings don't — that's why you spread first.", energyCost: 8 },
        { level: 3, text: "`return [...s].reverse().join(\"\");`", energyCost: 12 },
      ],
    },
    "chapter-04.2:encode": {
      brief:
        "Write `encode(msg)`: split the message into words, reverse each with `reverseWord`, join them back with spaces. Encoding twice must give the original back:\n\nroolf si raelc\nevom ot tfahs 3\nround trip",
      expectedBehavior: "roolf si raelc\nevom ot tfahs 3\nround trip",
      testHarness: `console.log(encode("floor is clear"));
console.log(encode("move to shaft 3"));
console.log(encode(encode("round trip")));`,
      expectedOutput: "roolf si raelc\nevom ot tfahs 3\nround trip",
      quickCheck: {
        prompt: "stuck encoding the message? tap the question that's in your head.",
        items: [
          {
            question: "how do i break a message into words?",
            answer: "`msg.split(\" \")` cuts at every space and hands back an array of words.",
          },
          {
            question: "how do i reverse every word?",
            answer: "`.map(reverseWord)` runs your function on each word and gives back a new array.",
          },
          {
            question: "how do i glue words back together?",
            answer: "`.join(\" \")` — the string you pass goes between every word.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`msg.split(\" \")` gives you an array of words.", energyCost: 5 },
        { level: 2, text: "`.map(reverseWord)` reverses every word into a new array.", energyCost: 8 },
        { level: 3, text: "chain it: `return msg.split(\" \").map(reverseWord).join(\" \");`", energyCost: 12 },
      ],
    },
    "chapter-04.2:relayheader": {
      brief:
        'Write `relayHeader(floor, code)` that returns `"F<floor>-C<code × 2>"`. `code` is text — turn it into a number with `Number()`. If it isn\'t a number you get `NaN`; return `"F<floor>-ERR"` instead:\n\nF2-C100\nF3-ERR\nF1-C50',
      expectedBehavior: "F2-C100\nF3-ERR\nF1-C50",
      testHarness: `console.log(relayHeader(2, "50"));
console.log(relayHeader(3, "abc"));
console.log(relayHeader(1, "25"));`,
      expectedOutput: "F2-C100\nF3-ERR\nF1-C50",
      quickCheck: {
        prompt: "stuck on the header? tap the question that's in your head.",
        items: [
          {
            question: "how do i turn \"50\" into the number 50?",
            answer: "`Number(\"50\")` gives you 50. a template literal turns numbers back into text for you.",
          },
          {
            question: "what happens with Number(\"abc\")?",
            answer: "nothing crashes — you get `NaN`, \"not a number\". javascript hands back a poisoned value instead of an error.",
          },
          {
            question: "how do i check for NaN?",
            answer: "`Number.isNaN(n)`. not `n === NaN` — NaN isn't equal to anything, not even itself.",
          },
          {
            question: "why not parseInt?",
            answer: "`parseInt(\"12abc\")` quietly gives 12 — it stops at the first bad character. `Number` rejects the whole thing.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`const n = Number(code);` — bad text becomes `NaN` instead of throwing.", energyCost: 5 },
        { level: 2, text: "``if (Number.isNaN(n)) return `F${floor}-ERR`;`` — catch the bad input first.", energyCost: 8 },
        { level: 3, text: "then ``return `F${floor}-C${n * 2}`;``", energyCost: 12 },
      ],
    },
  },
};
