import type { Challenge } from "@/types/game";

export const CH09_TIMEOUT_OUTPUT = [
  "contact: Bravo responding",
  "contact: NO CONTACT",
  "contact: Alpha responding",
  "sweep: Bravo holding at dock 4",
  "sweep: channel silent",
  "extraction locked",
].join("\n");

export const chapter09: Challenge = {
  id: "chapter-09",
  act: 3,
  chapter: 15,
  title: "CHANNEL OF ESCAPE",
  location: "SERVER ROOM · COMMS ARRAY",
  concepts: ["Channels", "Select", "Timeouts"],
  steps: [
    // ── Step 0: Scaffold ──
    {
      id: "chapter-09:scaffold",
      title: "SCAFFOLD",
      ask: "Print Hello World",
      stake: "Power up the comms array so Maya can call for a way out.",
      brief:
        "the comms array runs go. print `Hello World` to bring it up. (`time` joins the imports in step 1.)",
      starterCode: ``,
      expectedBehavior: "Hello World",
      expectedOutput: "Hello World",
      quickCheck: {
        prompt: "new array, same skeleton — tap whatever you need a refresher on.",
        items: [
          { question: "which line makes it runnable?", answer: "`package main` on the first line — that's what lets go run the file." },
          { question: "how do i pull in fmt?", answer: "`import \"fmt\"` right after the package line, quotes included." },
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
    // ── Step 1: Hail a team (a channel carries the answer) ──
    {
      id: "chapter-09:hail",
      title: "HAIL",
      ask: "Call a team and get their answer",
      stake: "Maya has to call an extraction team and hear back — without freezing the terminal while she waits.",
      brief:
        "write `func hail(team string, delayMs int) chan string`: make a channel with room for one message — `make(chan string, 1)` — start a goroutine that sleeps `delayMs` milliseconds then sends `<team> responding` on it, and return the channel straight away.\n\nthe terminal receives from it with `<-ch` — receiving is waiting:\n\nhailing Bravo...\nBravo responding\nchannel confirmed",
      starterCode: null,
      expectedBehavior: "hailing Bravo...\nBravo responding\nchannel confirmed",
      testHarness: `func main() {
\tch := hail("Bravo", 100)
\tfmt.Println("hailing Bravo...")
\tfmt.Println(<-ch)
\tfmt.Println("channel confirmed")
}`,
      expectedOutput: "hailing Bravo...\nBravo responding\nchannel confirmed",
      requiredCode: ["make(chan string, 1)", "go ", "<-"],
      quickCheck: {
        prompt: "stuck on the channel? tap the question that's in your head.",
        items: [
          { question: "what is a channel?", answer: "a pipe between goroutines. `ch <- v` sends a value in, `v := <-ch` takes one out — and waits until there is one." },
          { question: "why the 1 in `make(chan string, 1)`?", answer: "it's room for one message. the team can drop its reply and leave even if nobody is listening yet. without it, the sender is stuck until someone receives." },
          { question: "why does `hailing Bravo...` print first?", answer: "hail returns the channel at once — the goroutine sleeps in the background. then `<-ch` waits for the reply." },
        ],
      },
      hints: [
        { level: 1, text: "`make(chan string, 1)` — the 1 is buffer room. the team can drop its reply and go, even if nobody's listening yet.", energyCost: 5 },
        { level: 2, text: "launch the goroutine inside hail and return the channel immediately: `go func() { time.Sleep(...); ch <- team + \" responding\" }()` then `return ch`.", energyCost: 8 },
        { level: 3, text: "full shape: make the channel, `go func(){ sleep; send }()`, return ch. no WaitGroup needed — the receive IS the wait.", energyCost: 12 },
      ],
      rushMode: null,
      xp: { base: 100, firstTryBonus: 50, parTimeSeconds: 60 },
      events: [
        { triggerAtSeconds: 10, type: "story", message: "three teams, three frequencies. i take the first voice that answers and i don't look back." },
      ],
    },
    // ── Step 2: First responder (select) ──
    {
      id: "chapter-09:first",
      title: "FIRST CONTACT",
      ask: "Take whichever team answers first",
      stake: "Three teams are hailed at once — Maya goes with whoever answers first and doesn't wait on the slow ones.",
      brief:
        "write `func firstResponder(alpha, bravo, charlie chan string) string` that listens on all three channels at once with `select` and returns whichever message arrives first.\n\nhailing all teams...\nfirst contact: Bravo responding",
      starterCode: null,
      expectedBehavior: "hailing all teams...\nfirst contact: Bravo responding",
      testHarness: `func main() {
\ta := hail("Alpha", 200)
\tb := hail("Bravo", 100)
\tc := hail("Charlie", 300)
\tfmt.Println("hailing all teams...")
\tfmt.Println("first contact: " + firstResponder(a, b, c))
}`,
      expectedOutput: "hailing all teams...\nfirst contact: Bravo responding",
      requiredCode: ["select", "case "],
      quickCheck: {
        prompt: "stuck on select? tap the question that's in your head.",
        items: [
          { question: "what does select do?", answer: "it's a switch for channels. it waits until one of its cases can go, runs that one, and ignores the rest." },
          { question: "why not just receive from each in turn?", answer: "`<-alpha` first would wait for Alpha even though Bravo answered sooner. select listens to all three at once." },
          { question: "what happens to the teams that lose?", answer: "they still reply — into their one-message buffers from step 1, where the reply just sits. nobody is left stuck sending." },
        ],
      },
      hints: [
        { level: 1, text: "`select` is switch for channels. one `case msg := <-ch:` per team. it blocks until the first one has a value.", energyCost: 8 },
        { level: 2, text: "three cases, each `return msg`. don't receive them one by one — that waits on the slowest team.", energyCost: 12 },
        { level: 3, text: "`select { case msg := <-alpha: return msg; case msg := <-bravo: return msg; case msg := <-charlie: return msg }` — one case per line.", energyCost: 20 },
      ],
      rushMode: {
        label: "FREQUENCY DEGRADATION DETECTED",
        durationSeconds: 65,
        onExpiry: "signal_scramble",
        bonusTimeSeconds: 30,
      },
      xp: { base: 130, firstTryBonus: 65, parTimeSeconds: 70 },
      events: [
        { triggerAtSeconds: 10, type: "story", speaker: "KIRA", message: "Alpha, Bravo, Charlie. Frequencies attached. One of them is slower than it should be. Consider that a free lesson." },
        { triggerAtSeconds: 35, type: "story", speaker: "REEVES", message: "Frequencies she handed you, Maya. Every channel she gives us is a channel she can hear. Keep the timeout short." },
        { triggerAtSeconds: 60, type: "rush", message: "FREQUENCY DEGRADATION DETECTED" },
      ],
    },
    // ── Step 3: Timeout + non-blocking sweep ──
    {
      id: "chapter-09:timeout",
      title: "TIMEOUT",
      ask: "Never wait forever on a dead frequency",
      stake: "If every frequency is jammed, Maya can't stand in a stairwell forever — the program has to give up in time, and glance at a channel without stopping.",
      brief:
        "two functions.\n\n`func awaitContact(alpha, bravo, charlie chan string, timeoutMs int) string` — step 2's select plus a fourth case, `<-time.After(...)`, that returns `NO CONTACT` when the deadline passes first.\n\n`func sweep(ch chan string) string` — a select with a `default` case: return the message if one is already waiting, otherwise `channel silent` straight away.\n\ncontact: Bravo responding\ncontact: NO CONTACT\ncontact: Alpha responding\nsweep: Bravo holding at dock 4\nsweep: channel silent\nextraction locked",
      starterCode: null,
      expectedBehavior: CH09_TIMEOUT_OUTPUT,
      testHarness: `func main() {
\ta := hail("Alpha", 250)
\tb := hail("Bravo", 100)
\tc := hail("Charlie", 400)
\tfmt.Println("contact: " + awaitContact(a, b, c, 600))

\tjammed := make(chan string)
\tfmt.Println("contact: " + awaitContact(jammed, jammed, jammed, 200))
\tfmt.Println("contact: " + awaitContact(hail("Alpha", 300), jammed, jammed, 500))

\tready := make(chan string, 1)
\tready <- "Bravo holding at dock 4"
\tfmt.Println("sweep: " + sweep(ready))
\tfmt.Println("sweep: " + sweep(jammed))
\tfmt.Println("extraction locked")
}`,
      expectedOutput: CH09_TIMEOUT_OUTPUT,
      requiredCode: ["time.After", "default:"],
      quickCheck: {
        prompt: "stuck on the deadline? tap the question that's in your head.",
        items: [
          { question: "how does time.After make a timeout?", answer: "`time.After(d)` returns a channel that delivers one value after `d`. as a fourth case, the teams race the clock — whichever fires first wins." },
          { question: "how do i turn timeoutMs into a duration?", answer: "`time.Duration(timeoutMs) * time.Millisecond`." },
          { question: "what does `default` do in a select?", answer: "it runs when no other case is ready right now. so the select never waits — check and keep moving." },
          { question: "timeout or default — which one when?", answer: "timeout means wait, but not past the deadline. default means don't wait at all. awaitContact waits; sweep only glances." },
        ],
      },
      hints: [
        { level: 1, text: "`time.After(d)` gives you a channel that fires once after d. add it as a fourth case and the teams race the clock.", energyCost: 8 },
        { level: 2, text: "timeout case: `case <-time.After(time.Duration(timeoutMs) * time.Millisecond): return \"NO CONTACT\"`. build the duration from the parameter.", energyCost: 12 },
        { level: 3, text: "sweep is two cases: `case msg := <-ch: return msg` and `default: return \"channel silent\"`. default means never block.", energyCost: 20 },
      ],
      rushMode: {
        label: "EXTRACTION WINDOW CLOSING",
        durationSeconds: 60,
        onExpiry: "energy_drain",
        bonusTimeSeconds: 30,
      },
      xp: { base: 130, firstTryBonus: 65, parTimeSeconds: 80 },
      events: [
        { triggerAtSeconds: 15, type: "story", speaker: "GHOST", message: "T-MINUS 8 HOURS. PERIMETER ASSETS REPOSITIONING. DISTRICT EGRESS ROUTES UNDER REVIEW." },
        { triggerAtSeconds: 45, type: "story", speaker: "KIRA", message: "Still deciding whether to trust my frequencies? You'll get to give me a real answer soon enough." },
        { triggerAtSeconds: 70, type: "rush", message: "EXTRACTION WINDOW CLOSING" },
      ],
    },
  ],
  events: [],
  timer: { timeLimitSeconds: 450, gameOverOnExpiry: true },
  isBoss: false,
  parTimeSeconds: 200,
};

export const chapter09Twist = {
  headline: "BRAVO CONFIRMS",
  lines: [
    "> first contact: BRAVO - dock 4, forty minutes, one passenger",
    "> unregistered channel - K.VOLKOV",
    "> kira: bravo's frequency is open air. your thesis won't survive the trip uncoded. use my encoder.",
    "> attachment: transmit - six lines - reads clean. almost too clean.",
    "> reeves: Every gift of hers has carried a blade so far. Read every line before you run one.",
    "> maya: six lines. i can read six lines.",
    "> NEXT: her code. your verdict. what she is depends on what you see in it.",
  ],
};
