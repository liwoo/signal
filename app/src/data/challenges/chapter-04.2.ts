import type { Challenge } from "@/types/game";

export const chapter04_2: Challenge = {
  id: "chapter-04.2",
  act: 2,
  chapter: 6,
  title: "CIPHER RELAY",
  location: "FLOOR 2 · COMMS ROOM",
  concepts: ["Strings", "Runes", "Slices", "strconv"],
  steps: [
    // ── Step 0: Scaffold ──
    {
      id: "chapter-04.2:scaffold",
      title: "SCAFFOLD",
      brief:
        "set up the terminal. this time you need three imports — fmt, strings, and strconv. print \"ready\" so the relay initializes.",
      starterCode: `package main

// TODO: import "fmt", "strings", and "strconv"
// use an import group: import ( ... )

// TODO: write func main()
// print "ready" to initialize the relay
// reeves says the keyword scanners check every 30 seconds
`,
      expectedBehavior: "valid-go-scaffold",
      hints: [
        {
          level: 1,
          text: "same skeleton: package main, import group, func main(). this time you need three imports.",
          energyCost: 5,
        },
        {
          level: 2,
          text: "use an import group: `import (\\n  \"fmt\"\\n  \"strings\"\\n  \"strconv\"\\n)`",
          energyCost: 8,
        },
        {
          level: 3,
          text: 'package main, import ("fmt"; "strings"; "strconv"), func main() { fmt.Println("ready") }. use _ to silence unused imports for now.',
          energyCost: 12,
        },
      ],
      rushMode: null,
      xp: {
        base: 40,
        firstTryBonus: 20,
        parTimeSeconds: 25,
      },
      events: [],
    },
    // ── Step 1: Reverse a Single Word ──
    {
      id: "chapter-04.2:reverseword",
      title: "REVERSE",
      brief:
        "write `func reverseWord(s string) string` that reverses the characters of a single word.\n\nkey: convert to `[]rune` first (not bytes — runes handle unicode safely), reverse the slice, convert back to `string`.\n\nthe terminal will test it with multiple words.",
      starterCode: null,
      expectedBehavior: "olleh\noG\na",
      testHarness: `func main() {
\tfmt.Println(reverseWord("hello"))
\tfmt.Println(reverseWord("Go"))
\tfmt.Println(reverseWord("a"))
\t_ = strings.Join(nil, "")
\t_ = strconv.Itoa(0)
}`,
      expectedOutput: "olleh\noG\na",
      hints: [
        {
          level: 1,
          text: "a string is read-only. convert to `[]rune(s)` to get a mutable slice of characters.",
          energyCost: 5,
        },
        {
          level: 2,
          text: "swap from both ends: `for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1`",
          energyCost: 8,
        },
        {
          level: 3,
          text: "`runes[i], runes[j] = runes[j], runes[i]` inside the loop, then `return string(runes)`",
          energyCost: 12,
        },
      ],
      rushMode: null,
      xp: {
        base: 80,
        firstTryBonus: 40,
        parTimeSeconds: 50,
      },
      events: [
        {
          triggerAtSeconds: 10,
          type: "story",
          message:
            "reeves says the keyword scanners check every 30 seconds. we need the cipher ready before the next sweep.",
        },
      ],
    },
    // ── Step 2: Encode a Full Message ──
    {
      id: "chapter-04.2:encode",
      title: "ENCODE",
      brief:
        "write `func encode(msg string) string` that splits the message into words, reverses each word using `reverseWord`, and joins them back with spaces.\n\nuse `strings.Fields` to split and `strings.Join` to rejoin.\n\nbonus: `encode(encode(x)) == x` — reversing twice recovers the original. the terminal tests this.",
      starterCode: null,
      expectedBehavior: "roolf si raelc\nevom ot tfahs 3\nround trip",
      testHarness: `func main() {
\tfmt.Println(encode("floor is clear"))
\tfmt.Println(encode("move to shaft 3"))
\tfmt.Println(encode(encode("round trip")))
\t_ = strconv.Itoa(0)
}`,
      expectedOutput: "roolf si raelc\nevom ot tfahs 3\nround trip",
      hints: [
        {
          level: 1,
          text: "`strings.Fields(msg)` splits on whitespace and returns a `[]string` slice.",
          energyCost: 5,
        },
        {
          level: 2,
          text: "build a result slice with `append`: `result = append(result, reverseWord(w))`",
          energyCost: 8,
        },
        {
          level: 3,
          text: "`strings.Join(result, \" \")` glues the slice back into one string with spaces.",
          energyCost: 12,
        },
      ],
      rushMode: null,
      xp: {
        base: 100,
        firstTryBonus: 50,
        parTimeSeconds: 60,
      },
      events: [
        {
          triggerAtSeconds: 40,
          type: "system",
          message: "COMMS INTERCEPT DETECTED — ENCODING REQUIRED",
        },
      ],
    },
    // ── Step 3: Relay Header Conversion ──
    {
      id: "chapter-04.2:relayheader",
      title: "HEADER",
      brief:
        'write `func relayHeader(floor int, code string) string` that:\n\n1. converts the floor number to a string using `strconv.Itoa`\n2. converts the code string to an int using `strconv.Atoi`\n3. returns `"F<floor>-C<code_int * 2>"`\n\nif Atoi fails (bad input), return `"F<floor>-ERR"`.\n\nthis is go\'s error pattern — no exceptions. `Atoi` returns `(int, error)`. check `err != nil`.',
      starterCode: null,
      expectedBehavior: "F2-C100\nF3-ERR\nF1-C50",
      testHarness: `func main() {
\tfmt.Println(relayHeader(2, "50"))
\tfmt.Println(relayHeader(3, "abc"))
\tfmt.Println(relayHeader(1, "25"))
}`,
      expectedOutput: "F2-C100\nF3-ERR\nF1-C50",
      hints: [
        {
          level: 1,
          text: "`strconv.Itoa(42)` → `\"42\"`. int to ASCII.",
          energyCost: 5,
        },
        {
          level: 2,
          text: "`strconv.Atoi(\"50\")` returns `(50, nil)`. if the string isn't a number, err is non-nil.",
          energyCost: 8,
        },
        {
          level: 3,
          text: "check `if err != nil { return \"F\" + f + \"-ERR\" }` — go's error pattern. no exceptions.",
          energyCost: 12,
        },
      ],
      rushMode: {
        label: "Scanner Sweep Incoming",
        durationSeconds: 70,
        onExpiry: "signal_scramble",
        bonusTimeSeconds: 30,
      },
      xp: {
        base: 80,
        firstTryBonus: 40,
        parTimeSeconds: 60,
      },
      events: [
        {
          triggerAtSeconds: 80,
          type: "rush",
          message: "Scanner Sweep Incoming",
        },
      ],
    },
  ],
  events: [
    {
      triggerAtSeconds: 10,
      type: "story",
      message:
        "reeves says the keyword scanners check every 30 seconds. we need the cipher ready before the next sweep.",
    },
    {
      triggerAtSeconds: 40,
      type: "system",
      message: "COMMS INTERCEPT DETECTED — ENCODING REQUIRED",
    },
    {
      triggerAtSeconds: 80,
      type: "rush",
      message: "Scanner Sweep Incoming",
    },
  ],
  timer: {
    timeLimitSeconds: 380,
    gameOverOnExpiry: true,
  },
  isBoss: false,
  parTimeSeconds: 150,
};

export const chapter04_2Twist = {
  headline: "RELAY LIVE",
  lines: [
    "> maya: sending first encoded message through the relay...",
    "> maya: evom ot roolf 4 — raelc",
    "> [REEVES]: decoded on my end. relay is live.",
    "> maya: we have a secure channel.",
  ],
};
