import type { Challenge } from "@/types/game";

export const boss01: Challenge = {
  id: "boss-01",
  act: 1,
  chapter: 3,
  title: "LOCKMASTER",
  location: "MASTER LOCK CONTROLLER",
  concepts: ["program structure", "for loops", "if/else (pattern detection)", "slices", "len()"],
  steps: [
    // ── Step 1: Scaffold ──
    {
      id: "boss-01:scaffold",
      title: "SCAFFOLD",
      brief:
        "the lock controller expects a specific interface. set up a valid go program with a function called predictNext that takes a slice of ints and returns an int. wire it into main so we can test it.",
      starterCode: `package main

// TODO: import the fmt package

// TODO: write func predictNext(codes []int) int

// TODO: write func main() that calls predictNext
// and prints the result
`,
      expectedBehavior: "valid go program with predictNext function signature and main calling it",
      hints: [
        {
          level: 1,
          text: "you need three things: import \"fmt\", func predictNext(codes []int) int, and func main().",
          energyCost: 5,
        },
        {
          level: 2,
          text: "in main, create a slice with []int{...} and pass it to predictNext. print the result with fmt.Println.",
          energyCost: 8,
        },
        {
          level: 3,
          text: "func predictNext(codes []int) int { return 0 } — return 0 as placeholder. func main() { codes := []int{1,2,3}; fmt.Println(predictNext(codes)) }",
          energyCost: 12,
        },
      ],
      rushMode: null,
      xp: {
        base: 150,
        firstTryBonus: 75,
        parTimeSeconds: 30,
      },
      events: [],
    },
    // ── Step 2: Predict ──
    {
      id: "boss-01:predict",
      title: "PREDICT",
      brief:
        "the master lock controller is cycling 6-digit access codes every 3 seconds. the pattern follows an arithmetic rule — linear, alternating, or quadratic. now implement predictNext — find the pattern in the deltas and return the next value before the sublevel locks down.",
      starterCode: null, // carry forward from scaffold
      expectedBehavior: "returns next code in the sequence",
      hints: [
        {
          level: 1,
          text: "compute the differences between consecutive codes. if they're all the same, it's linear.",
          energyCost: 8,
        },
        {
          level: 2,
          text: "if the deltas alternate between two values, add the correct one. if the deltas themselves increase by a constant, it's quadratic — compute the next delta.",
          energyCost: 12,
        },
        {
          level: 3,
          text: "delta := codes[1] - codes[0]. if delta == codes[2]-codes[1], return codes[len(codes)-1] + delta. otherwise check if deltas of deltas are constant.",
          energyCost: 20,
        },
      ],
      rushMode: null,
      xp: {
        base: 500,
        firstTryBonus: 250,
        parTimeSeconds: 60,
      },
      events: [
        {
          triggerAtSeconds: 10,
          type: "story",
          message: "the lock controller is cycling faster",
        },
        {
          triggerAtSeconds: 30,
          type: "system",
          message: "LOCKDOWN WARNING \u00b7 60 SECONDS",
        },
        {
          triggerAtSeconds: 60,
          type: "system",
          message: "LOCKDOWN IMMINENT \u00b7 30 SECONDS",
        },
      ],
    },
  ],
  events: [
    {
      triggerAtSeconds: 0,
      type: "system",
      message: "MASTER LOCK CONTROLLER \u00b7 ACTIVE",
    },
    {
      triggerAtSeconds: 5,
      type: "story",
      message:
        "i can see the pattern on my side. the delta between each code... it's consistent. find the rule.",
    },
  ],
  timer: {
    timeLimitSeconds: 90,
    gameOverOnExpiry: true,
  },
  isBoss: true,
  parTimeSeconds: 60,
};
