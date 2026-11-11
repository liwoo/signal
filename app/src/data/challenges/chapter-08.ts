import type { Challenge } from "@/types/game";

const CIRCUITS = `[]string{"North", "South", "East", "West"}`;

export const CH08_FANOUT_OUTPUT = [
  "North circuit: DOWN",
  "South circuit: DOWN",
  "East circuit: DOWN",
  "West circuit: DOWN",
  "ALL CIRCUITS DOWN",
  "Aux circuit: DOWN",
].join("\n");

export const CH08_WINDOW_OUTPUT = [
  "North circuit: DOWN (300ms)",
  "South circuit: DOWN (150ms)",
  "East circuit: DOWN (450ms)",
  "West circuit: DOWN (200ms)",
  "window: SINGLE CYCLE - alarm blind",
  "ALL CIRCUITS DOWN",
].join("\n");

export const chapter08: Challenge = {
  id: "chapter-08",
  act: 3,
  chapter: 14,
  title: "CIRCUIT CUT",
  location: "POWER PLANT · CIRCUIT ARRAY",
  concepts: ["Goroutines", "WaitGroups", "Fan-out"],
  steps: [
    // ── Step 0: Scaffold ──
    {
      id: "chapter-08:scaffold",
      title: "SCAFFOLD",
      ask: "Print Hello World",
      stake: "Bring the breaker console online so Maya can reach the alarm grid's power.",
      brief:
        "the breaker console runs go. print `Hello World` to bring it up. (`time` and `sync` join the imports when a step needs them — go won't compile an import you don't use.)",
      starterCode: ``,
      expectedBehavior: "Hello World",
      expectedOutput: "Hello World",
      quickCheck: {
        prompt: "new console, same skeleton — tap whatever you need a refresher on.",
        items: [
          { question: "which line makes it runnable?", answer: "`package main` on the first line — that's what lets go run the file." },
          { question: "should i import time and sync now?", answer: "not yet. go refuses to compile an unused import — add each one when a step uses it." },
          { question: "where does the code that runs go?", answer: "inside `func main()` — that's the entry point go looks for." },
        ],
      },
      hints: [
        { level: 1, text: "same skeleton as always: package main, import \"fmt\", func main() { }.", energyCost: 5 },
        { level: 2, text: "inside main, `fmt.Println(\"Hello World\")`.", energyCost: 8 },
        { level: 3, text: 'package main, then import "fmt", then func main() { fmt.Println("Hello World") }', energyCost: 12 },
      ],
      rushMode: null,
      xp: { base: 40, firstTryBonus: 20, parTimeSeconds: 25 },
      events: [],
    },
    // ── Step 1: First goroutine ──
    {
      id: "chapter-08:goroutine",
      title: "GOROUTINE",
      ask: "Throw a breaker without waiting on it",
      stake: "Maya can only throw one breaker at a time by hand — the program has to throw them for her, without stopping to watch each one.",
      brief:
        "write `func cut(name string)` that prints `<name> circuit: DOWN`, and `func cutAsync(name string)` that runs `cut` as a goroutine — `go cut(name)` — and returns straight away.\n\nimport `time`: the terminal holds main open for 100ms so the goroutine gets to finish.\n\nNorth circuit: DOWN\nSouth circuit: DOWN\npower cycle complete",
      starterCode: null,
      expectedBehavior: "North circuit: DOWN\nSouth circuit: DOWN\npower cycle complete",
      testHarness: `func main() {
\tcut("North")
\tcutAsync("South")
\ttime.Sleep(100 * time.Millisecond)
\tfmt.Println("power cycle complete")
}`,
      expectedOutput: "North circuit: DOWN\nSouth circuit: DOWN\npower cycle complete",
      requiredCode: ["go "],
      quickCheck: {
        prompt: "stuck on the goroutine? tap the question that's in your head.",
        items: [
          { question: "what's a goroutine?", answer: "a function running alongside the rest of your program. put `go` in front of any call and it starts — the caller doesn't wait for it." },
          { question: "why does the terminal sleep for 100ms?", answer: "when main returns, every goroutine dies mid-flight. the sleep holds the door open long enough for South to finish. step 2 replaces it with the real tool." },
          { question: "does cutAsync need to return anything?", answer: "no. one line: `go cut(name)`. it launches and leaves." },
        ],
      },
      hints: [
        { level: 1, text: "`go cut(name)` — the `go` keyword in front of any call launches it as a goroutine. that's the whole syntax.", energyCost: 5 },
        { level: 2, text: "goroutines die when main returns. the terminal sleeps 100ms to hold the door open — that's why South still prints. add `\"time\"` to your imports.", energyCost: 8 },
        { level: 3, text: "two functions: `cut` prints `name + \" circuit: DOWN\"`. `cutAsync` is one line: `go cut(name)`.", energyCost: 12 },
      ],
      rushMode: null,
      xp: { base: 100, firstTryBonus: 50, parTimeSeconds: 60 },
      events: [
        { triggerAtSeconds: 10, type: "story", message: "four circuits, one self-check. cut them one at a time and the grid sees the imbalance. they go down together or not at all." },
      ],
    },
    // ── Step 2: WaitGroup fan-out ──
    {
      id: "chapter-08:fanout",
      title: "FAN-OUT",
      ask: "Cut every circuit at once, then confirm",
      stake: "All four breakers have to drop together, and Maya can't call the grid blind until every one has confirmed.",
      brief:
        "write `func cutAll(circuits []string) []string`: one goroutine per circuit, a `sync.WaitGroup` to wait for all of them, and the confirmations returned in circuit order.\n\nthe ritual: `wg.Add(1)` before each launch, `defer wg.Done()` first thing inside, `wg.Wait()` once after the loop. pass the index and name INTO the goroutine, and have it write `results[idx]` in a slice made with `make([]string, len(circuits))`.\n\nNorth circuit: DOWN\nSouth circuit: DOWN\nEast circuit: DOWN\nWest circuit: DOWN\nALL CIRCUITS DOWN\nAux circuit: DOWN",
      starterCode: null,
      expectedBehavior: CH08_FANOUT_OUTPUT,
      testHarness: `func main() {
\tstart := time.Now()
\tfor _, line := range cutAll(${CIRCUITS}) {
\t\tfmt.Println(line)
\t}
\tfmt.Println("ALL CIRCUITS DOWN")
\tfor _, line := range cutAll([]string{"Aux"}) {
\t\tfmt.Println(line)
\t}
\t_ = time.Since(start)
}`,
      expectedOutput: CH08_FANOUT_OUTPUT,
      requiredCode: ["sync.WaitGroup", ".Wait()", ".Done()", "go "],
      quickCheck: {
        prompt: "stuck on the fan-out? tap the question that's in your head.",
        items: [
          { question: "what does a WaitGroup do?", answer: "it counts running goroutines. `Add(1)` before each launch, `Done()` when one finishes, and `Wait()` blocks until the count is back to zero." },
          { question: "why `Add` before `go`, not inside?", answer: "if the goroutine adds itself, `Wait` might run first, see zero, and return before anything started." },
          { question: "why pass `i` and `name` into the goroutine?", answer: "a closure that reaches out for loop state shares it with every other goroutine. pass them in as arguments and each goroutine gets its own copy." },
          { question: "why not print inside the goroutine?", answer: "goroutines finish in any order, so the lines would come out scrambled. each one writes its own slot, `results[idx]`, and you print in order after `Wait`." },
        ],
      },
      hints: [
        { level: 1, text: "`var wg sync.WaitGroup`, then `wg.Add(1)` before each launch. `wg.Wait()` blocks until the count is zero. import `\"sync\"`.", energyCost: 8 },
        { level: 2, text: "first line inside every goroutine: `defer wg.Done()`. pre-size the results: `results := make([]string, len(circuits))`.", energyCost: 12 },
        { level: 3, text: "launch `go func(idx int, n string) { defer wg.Done(); results[idx] = n + \" circuit: DOWN\" }(i, name)` — pass i and name IN. then `wg.Wait()` and `return results`.", energyCost: 20 },
      ],
      rushMode: null,
      xp: { base: 120, firstTryBonus: 60, parTimeSeconds: 90 },
      events: [
        { triggerAtSeconds: 20, type: "story", speaker: "KIRA", message: "The grid self-checks every power cycle. You get one cycle. Four breakers, one window. You're welcome." },
        { triggerAtSeconds: 50, type: "story", speaker: "REEVES", message: "How does she have plant schematics? Don't answer her, Maya. Just write the code." },
      ],
    },
    // ── Step 3: One power cycle ──
    {
      id: "chapter-08:window",
      title: "ONE CYCLE",
      ask: "Drop all four inside one power cycle",
      stake: "Each breaker takes its own time to trip — Maya needs all four down inside a single power cycle or the grid seals the facility.",
      brief:
        "write `func cutTimed(circuits []string, delays []int) []string` — the same fan-out, but each goroutine first sleeps its breaker's delay in milliseconds, then records `<name> circuit: DOWN (<delay>ms)`.\n\nthe terminal times the whole thing. one at a time takes the SUM of the delays — 1100ms, two power cycles, alarm. all at once takes the slowest — 450ms.\n\nNorth circuit: DOWN (300ms)\nSouth circuit: DOWN (150ms)\nEast circuit: DOWN (450ms)\nWest circuit: DOWN (200ms)\nwindow: SINGLE CYCLE - alarm blind\nALL CIRCUITS DOWN",
      starterCode: null,
      expectedBehavior: CH08_WINDOW_OUTPUT,
      testHarness: `func main() {
\tcircuits := ${CIRCUITS}
\tdelays := []int{300, 150, 450, 200}
\tstart := time.Now()
\tlines := cutTimed(circuits, delays)
\telapsed := time.Since(start)
\tfor _, line := range lines {
\t\tfmt.Println(line)
\t}
\tif elapsed < 1100*time.Millisecond {
\t\tfmt.Println("window: SINGLE CYCLE - alarm blind")
\t} else {
\t\tfmt.Println("window: MULTI CYCLE - alarm tripped")
\t}
\tfmt.Println("ALL CIRCUITS DOWN")
}`,
      expectedOutput: CH08_WINDOW_OUTPUT,
      requiredCode: ["time.Sleep", ".Wait()", "go "],
      quickCheck: {
        prompt: "stuck on the timing? tap the question that's in your head.",
        items: [
          { question: "how do i sleep for a number of milliseconds?", answer: "`time.Sleep(time.Duration(d) * time.Millisecond)` — convert the int to a Duration, then scale it." },
          { question: "where does the sleep go?", answer: "inside the goroutine. sleep in the loop and the breakers trip one after another — the sum, not the max." },
          { question: "how do i format the line?", answer: "`fmt.Sprintf(\"%s circuit: DOWN (%dms)\", n, d)`." },
        ],
      },
      hints: [
        { level: 1, text: "same skeleton as step 2. each goroutine sleeps first: `time.Sleep(time.Duration(d) * time.Millisecond)`.", energyCost: 8 },
        { level: 2, text: "the delay is loop state too — pass it as a third argument: `go func(idx int, n string, d int) { ... }(i, name, delays[i])`.", energyCost: 12 },
        { level: 3, text: "after the sleep: `results[idx] = fmt.Sprintf(\"%s circuit: DOWN (%dms)\", n, d)`. all four sleep at once, so the window is the slowest breaker — not the sum.", energyCost: 20 },
      ],
      rushMode: {
        label: "GRID SELF-CHECK IMMINENT",
        durationSeconds: 65,
        onExpiry: "power_reduced",
        bonusTimeSeconds: 40,
      },
      xp: { base: 120, firstTryBonus: 60, parTimeSeconds: 90 },
      events: [
        { triggerAtSeconds: 20, type: "story", speaker: "GHOST", message: "T-MINUS 9 HOURS. ASSET CONTAINMENT REMAINS PRIORITY. SUBLEVEL SWEEPS EXPANDING." },
        { triggerAtSeconds: 40, type: "rush", message: "GRID SELF-CHECK IMMINENT" },
      ],
    },
  ],
  events: [],
  timer: { timeLimitSeconds: 420, gameOverOnExpiry: true },
  isBoss: false,
  parTimeSeconds: 180,
};

export const chapter08Twist = {
  headline: "GRID BLIND",
  lines: [
    "> ALL CIRCUITS DOWN - ALARM GRID BLIND",
    "> incoming file transfer - K.VOLKOV - 4.7 MB",
    "> contents: decryption key for thesis_v2.enc [VERIFIED]",
    "> contents: unsigned binary, obfuscated [ZERO-DAY SIGNATURE DETECTED]",
    "> maya: she sent the key. and a gun aimed at my terminal. in the same file.",
    "> reeves: A gift and a trap, priced as one. That is how Kira negotiates.",
    "> file quarantined. key extracted. remember this.",
  ],
};
