// ── Act II in Python ──
// The same steps as the Go chapters (story, stakes, XP, events are shared);
// only the code-shaped half is realized here. Divergences from Go, decided in
// docs/cross-language-act-2-plan.md:
//   • Go fakes a set with map[string]bool — Python has a real `set`
//   • strings are already sequences of characters, so reversal is a slice
//   • int() raises ValueError instead of returning an error — try/except
//   • nothing in chapter 4.2 needs an import, so its scaffold is Hello World

import type { ChallengeRealization } from "@/types/game";

const ROSTER_HARNESS = `r = build_roster()
print(r["Volkov"])
print(r["Chen"])
print(len(r))`;

export const PY_CHAPTER_04: ChallengeRealization = {
  concepts: ["Dictionaries", "Sets", ".values()", "len()"],
  steps: {
    "chapter-04:scaffold": {
      brief: "Wake the terminal: print `Hello World`.",
      expectedBehavior: "Hello World",
      expectedOutput: "Hello World",
      quickCheck: {
        prompt: "same one-liner, new terminal — tap whatever you need a refresher on.",
        items: [
          { question: "how do i print again?", answer: "`print(\"Hello World\")` — one line is the whole program." },
          { question: "do i need an import for this chapter?", answer: "no. dictionaries and sets are built into python — nothing to import." },
        ],
      },
      hints: [
        { level: 1, text: "`print(...)` writes a line to the terminal.", energyCost: 5 },
        { level: 2, text: "text goes in quotes inside the brackets.", energyCost: 8 },
        { level: 3, text: "`print(\"Hello World\")`", energyCost: 12 },
      ],
    },
    "chapter-04:guardmap": {
      brief:
        'Write `build_roster()` that returns a dictionary of guard → floor:\n\n"Chen": "Floor 1"\n"Alvarez": "Floor 2"\n"Volkov": "Floor 2"\n"Park": "Floor 3"\n"Santos": "Floor 1"\n\nThe terminal looks up Volkov, then Chen, then counts the guards:\n\nFloor 2\nFloor 1\n5',
      expectedBehavior: "Floor 2\nFloor 1\n5",
      testHarness: ROSTER_HARNESS,
      expectedOutput: "Floor 2\nFloor 1\n5",
      quickCheck: {
        prompt: "stuck on the roster? tap the question that's in your head.",
        items: [
          {
            question: "how does a dictionary hold a guard and their floor?",
            answer: "it pairs keys with values: `{\"Chen\": \"Floor 1\"}`. the name is the key, the floor is the value.",
          },
          {
            question: "how do i write more than one pair?",
            answer: "separate them with commas inside the braces. one pair per line reads best — end each line with a comma.",
          },
          {
            question: "how does the terminal read it?",
            answer: "`r[\"Volkov\"]` looks a guard up by name, and `len(r)` counts the pairs.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`def build_roster():` then `return { ... }` — a dictionary literal is curly braces with `key: value` pairs.", energyCost: 8 },
        { level: 2, text: "`return {\"Chen\": \"Floor 1\", \"Alvarez\": \"Floor 2\", ...}` — one pair per guard, commas between.", energyCost: 12 },
        { level: 3, text: "all five guards, spelled exactly: Chen, Alvarez, Volkov, Park, Santos. the terminal checks names and the count.", energyCost: 20 },
      ],
    },
    "chapter-04:clearfloors": {
      brief:
        "Write `find_clear_floor(guards, max_floor)`: collect the floors that have a guard into a set, then return the first of `Floor 1` … `Floor max_floor` that isn't in it.\n\nThe terminal tries three rosters:\n\nFloor 4\nFloor 2\nFloor 3",
      expectedBehavior: "Floor 4\nFloor 2\nFloor 3",
      testHarness: `r = build_roster()
print(find_clear_floor(r, 4))
print(find_clear_floor({"A": "Floor 1", "B": "Floor 3"}, 3))
print(find_clear_floor({"X": "Floor 1", "Y": "Floor 2"}, 3))`,
      expectedOutput: "Floor 4\nFloor 2\nFloor 3",
      quickCheck: {
        prompt: "stuck finding the gap? tap the question that's in your head.",
        items: [
          {
            question: "how do i get just the floors out of the roster?",
            answer: "`guards.values()` gives you every value — the floors — without the names.",
          },
          {
            question: "what's a set and why use one?",
            answer: "a set holds each thing once and answers `in` instantly. `set(guards.values())` is every occupied floor.",
          },
          {
            question: "how do i check floors 1 up to max_floor?",
            answer: "`for i in range(1, max_floor + 1):` — range stops before its end, so add one.",
          },
          {
            question: "how do i build the floor's name?",
            answer: "an f-string: `f\"Floor {i}\"`.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`occupied = set(guards.values())` — every floor that has a guard, each once.", energyCost: 8 },
        { level: 2, text: "`for i in range(1, max_floor + 1):` — then build the name with `f\"Floor {i}\"`.", energyCost: 12 },
        { level: 3, text: "inside the loop: `if name not in occupied: return name` — the first gap wins.", energyCost: 20 },
      ],
    },
  },
};

export const PY_CHAPTER_04_2: ChallengeRealization = {
  concepts: ["String slicing", "split() & join()", "int() & str()", "try / except"],
  steps: {
    "chapter-04.2:scaffold": {
      brief: "Bring the relay online: print `Hello World`.",
      expectedBehavior: "Hello World",
      expectedOutput: "Hello World",
      quickCheck: {
        prompt: "same one-liner, new room — tap whatever you need a refresher on.",
        items: [
          { question: "how do i print again?", answer: "`print(\"Hello World\")`." },
          {
            question: "what do i need to import for the cipher?",
            answer: "nothing. slicing, `split`, `join`, `int` and `str` are all built in.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`print(...)` writes a line.", energyCost: 5 },
        { level: 2, text: "text in quotes inside the brackets.", energyCost: 8 },
        { level: 3, text: "`print(\"Hello World\")`", energyCost: 12 },
      ],
    },
    "chapter-04.2:reverseword": {
      brief:
        "Write `reverse_word(s)` that returns the word backwards. The terminal tries three words:\n\nolleh\noG\na",
      expectedBehavior: "olleh\noG\na",
      testHarness: `print(reverse_word("hello"))
print(reverse_word("Go"))
print(reverse_word("a"))`,
      expectedOutput: "olleh\noG\na",
      quickCheck: {
        prompt: "stuck reversing the word? tap the question that's in your head.",
        items: [
          {
            question: "can i change the letters inside a string?",
            answer: "no — strings can't be changed in place. you build a new one and return it.",
          },
          {
            question: "what's the quickest way to flip a string?",
            answer: "a slice with a step of -1: `s[::-1]` walks the string from the end to the start.",
          },
          {
            question: "what do the colons in `[::-1]` mean?",
            answer: "`[start:stop:step]`. leave start and stop empty to take everything; step -1 goes backwards.",
          },
        ],
      },
      hints: [
        { level: 1, text: "strings slice like lists: `s[start:stop:step]`.", energyCost: 5 },
        { level: 2, text: "a negative step walks backwards. leave start and stop empty to take the whole word.", energyCost: 8 },
        { level: 3, text: "`return s[::-1]`", energyCost: 12 },
      ],
    },
    "chapter-04.2:encode": {
      brief:
        "Write `encode(msg)`: split the message into words, reverse each with `reverse_word`, join them back with spaces. Encoding twice must give the original back:\n\nroolf si raelc\nevom ot tfahs 3\nround trip",
      expectedBehavior: "roolf si raelc\nevom ot tfahs 3\nround trip",
      testHarness: `print(encode("floor is clear"))
print(encode("move to shaft 3"))
print(encode(encode("round trip")))`,
      expectedOutput: "roolf si raelc\nevom ot tfahs 3\nround trip",
      quickCheck: {
        prompt: "stuck encoding the message? tap the question that's in your head.",
        items: [
          {
            question: "how do i break a message into words?",
            answer: "`msg.split()` with no argument splits on any run of spaces and hands back a list of words.",
          },
          {
            question: "how do i glue words back together?",
            answer: "`\" \".join(words)` — the string before `.join` goes between every word.",
          },
          {
            question: "how do i reverse every word?",
            answer: "loop and append to a new list, or in one line: `[reverse_word(w) for w in words]`.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`words = msg.split()` gives you a list of words.", energyCost: 5 },
        { level: 2, text: "build a new list of reversed words: `[reverse_word(w) for w in words]`.", energyCost: 8 },
        { level: 3, text: "`return \" \".join(...)` glues them back with single spaces.", energyCost: 12 },
      ],
    },
    "chapter-04.2:relayheader": {
      brief:
        'Write `relay_header(floor, code)` that returns `"F<floor>-C<code × 2>"`. `code` is text — turn it into a number with `int()`. If it isn\'t a number, return `"F<floor>-ERR"` instead of crashing:\n\nF2-C100\nF3-ERR\nF1-C50',
      expectedBehavior: "F2-C100\nF3-ERR\nF1-C50",
      testHarness: `print(relay_header(2, "50"))
print(relay_header(3, "abc"))
print(relay_header(1, "25"))`,
      expectedOutput: "F2-C100\nF3-ERR\nF1-C50",
      quickCheck: {
        prompt: "stuck on the header? tap the question that's in your head.",
        items: [
          {
            question: "how do i turn \"50\" into the number 50?",
            answer: "`int(\"50\")` gives you 50. the other way, `str(2)` gives you `\"2\"` — or let an f-string do it.",
          },
          {
            question: "what happens with int(\"abc\")?",
            answer: "python raises a `ValueError` and the program stops — unless you catch it.",
          },
          {
            question: "how do i catch it?",
            answer: "put the risky line in `try:` and the fallback in `except ValueError:`. python's way is to try first and handle the failure.",
          },
        ],
      },
      hints: [
        { level: 1, text: "`int(code)` converts the text to a number — and raises `ValueError` if it can't.", energyCost: 5 },
        { level: 2, text: "`try:` then `n = int(code)`, and under `except ValueError:` return `f\"F{floor}-ERR\"`.", energyCost: 8 },
        { level: 3, text: "after the try block: `return f\"F{floor}-C{n * 2}\"`.", energyCost: 12 },
      ],
    },
  },
};
