# Chapter 9 — Channel of Escape

**Act III · Server Room · Comms Array**

## Go Concepts

- Channels: `make(chan string)` vs `make(chan string, 1)` (unbuffered rendezvous vs buffered mailbox)
- Sending (`ch <- v`) and receiving (`msg := <-ch`); a channel as data + synchronization in one value
- Returning a channel from a function (the `hail` pattern)
- `select` across multiple channels — first ready case wins
- `time.After` as a timeout case inside `select`
- `default` case — non-blocking channel poll
- `time.Sleep` / `time.Duration` for simulated response latency (callback to ch08)

## Story Context

The grid is blind, the thesis is copied, and Kira's quarantined "gift" gave up its decryption key — now Maya needs a way out of the district before the alarm heals. Kira supplies three extraction-team frequencies: Alpha, Bravo, Charlie. Different teams, different response times, and any of them could be compromised — the frequencies came from *her*. Reeves wants them burned unread. Maya can't afford to: she'll open a channel to each team, take whoever answers first, and make sure a dead frequency can never hang the program — because a receive that blocks forever is a Maya who stands in a stairwell until the sweep finds her. GHOST's deadline is eight hours out.

## Challenge

Open one channel per extraction team, hail all three concurrently, pick the first responder with `select`, cap the wait with `time.After`, and poll silently with `default` — no blocking, no hanging, no standing still.

### Steps

#### Step 0: Scaffold

Same as always — `package main`, `import`, `func main()`, print "extraction console ready".

Imports for this chapter: `"fmt"` now; `"time"` arrives in step 1. (Go refuses to compile unused imports — add them only when a step needs them.)

#### Step 1: Hail a Team

Write `func hail(team string, delayMs int) chan string` that creates a channel, launches a goroutine that sleeps `delayMs` milliseconds and then sends `<team> responding` on it, and returns the channel immediately.

Key teaching moment: ch08 used a WaitGroup to know *when* goroutines finished — a channel carries the *answer itself*, and the synchronization comes free. `<-ch` blocks until a value arrives: receiving IS waiting. The buffer size is the real decision. An **unbuffered** channel (`make(chan string)`) is a rendezvous — the send blocks until someone receives, so if Maya stops listening, the team's goroutine hangs forever, leaked. A **buffered** channel of capacity 1 (`make(chan string, 1)`) is a mailbox — the team drops its reply and moves on whether or not anyone is listening yet. Use capacity 1 here: in step 2, `select` will abandon the losing teams, and abandoned senders must not leak.

```go
func hail(team string, delayMs int) chan string {
    ch := make(chan string, 1)
    go func() {
        time.Sleep(time.Duration(delayMs) * time.Millisecond)
        ch <- team + " responding"
    }()
    return ch
}
```

Test harness:
```go
func main() {
    ch := hail("Bravo", 100)
    fmt.Println("hailing Bravo...")
    fmt.Println(<-ch)
    fmt.Println("channel confirmed")
}
```

Expected output:
```
hailing Bravo...
Bravo responding
channel confirmed
```

(`hail` returns instantly — the goroutine sleeps in the background, so "hailing Bravo..." prints first. Then `<-ch` blocks main for 100ms until the reply lands. The receive is the wait.)

#### Step 2: First Responder

Write `func firstResponder(alpha, bravo, charlie chan string) string` that listens on all three channels at once and returns whichever message arrives first.

Key teaching moment: `select` is `switch` for channels. It blocks until *one* case can proceed, runs that case, and ignores the rest — exactly the fiction: three teams hailed, first voice on the air wins, nobody waits in line. If two cases are ready at the same instant, Go picks one at random (here the delays differ, so exactly one is ready first). The losing teams still reply later — into their capacity-1 buffers from step 1, where the replies sit harmlessly. Swap step 1 to unbuffered channels and this select quietly leaks two goroutines per escape attempt. That's why the buffer decision came first.

```go
func firstResponder(alpha, bravo, charlie chan string) string {
    select {
    case msg := <-alpha:
        return msg
    case msg := <-bravo:
        return msg
    case msg := <-charlie:
        return msg
    }
}
```

Test harness:
```go
func main() {
    a := hail("Alpha", 200)
    b := hail("Bravo", 100)
    c := hail("Charlie", 300)
    fmt.Println("hailing all teams...")
    fmt.Println("first contact: " + firstResponder(a, b, c))
}
```

Expected output:
```
hailing all teams...
first contact: Bravo responding
```

(The playground's virtual clock makes this deterministic: Bravo's 100ms send is ready strictly before Alpha's 200ms and Charlie's 300ms, so `select` always takes the bravo case.)

#### Step 3: Timeout and Silent Sweep

Two functions. `func awaitContact(alpha, bravo, charlie chan string, timeoutMs int) string` — the step 2 select plus a fourth case: `<-time.After(...)` that returns `NO CONTACT` if every team stays silent past the deadline. And `func sweep(ch chan string) string` — a **non-blocking** poll that returns the message if one is already waiting, or `channel silent` immediately if not.

Key teaching moment: step 2's select has a failure mode — if all three frequencies are jammed, it blocks forever, and Maya stands still until the sweep finds her. `time.After(d)` returns a channel that delivers one value after `d`; drop it in as a fourth case and the select now races the teams against the clock — whichever fires first wins. That's the idiomatic Go timeout: no timers to cancel, just one more channel. `default` is the opposite tool: it makes select *refuse to wait at all* — if no case is ready right now, run `default` and keep moving. Timeout = wait this long, no longer. Default = don't wait, even once. Know which one the situation needs.

```go
func awaitContact(alpha, bravo, charlie chan string, timeoutMs int) string {
    select {
    case msg := <-alpha:
        return msg
    case msg := <-bravo:
        return msg
    case msg := <-charlie:
        return msg
    case <-time.After(time.Duration(timeoutMs) * time.Millisecond):
        return "NO CONTACT"
    }
}

func sweep(ch chan string) string {
    select {
    case msg := <-ch:
        return msg
    default:
        return "channel silent"
    }
}
```

Test harness:
```go
func main() {
    a := hail("Alpha", 250)
    b := hail("Bravo", 100)
    c := hail("Charlie", 400)
    fmt.Println("contact: " + awaitContact(a, b, c, 600))

    jammed := make(chan string)
    fmt.Println("contact: " + awaitContact(jammed, jammed, jammed, 200))

    ready := make(chan string, 1)
    ready <- "Bravo holding at dock 4"
    fmt.Println("sweep: " + sweep(ready))
    fmt.Println("sweep: " + sweep(jammed))
    fmt.Println("extraction locked")
}
```

Expected output:
```
contact: Bravo responding
contact: NO CONTACT
sweep: Bravo holding at dock 4
sweep: channel silent
extraction locked
```

(Bravo answers at 100ms, well inside 600ms. The jammed channel has no sender, so only `time.After(200ms)` can fire. The `ready` mailbox already holds a value — sweep takes it without waiting — and the jammed channel makes sweep fall straight through to `default`. Note the pre-loaded send `ready <- ...` only works because the channel is buffered: step 1's lesson, proven in the harness.)

### Acceptance Criteria

- Step 1: `hail` uses a **buffered** channel — `make(chan string, 1)` (pattern-checked; unbuffered compiles and passes this step's harness but leaks in step 2)
- Step 1: goroutine launched inside `hail` with the `go` keyword; `hail` returns the channel without waiting
- Step 2: `firstResponder` uses `select` with three receive cases; no `time.Sleep` polling, no reading channels in sequence
- Step 3: `awaitContact` includes a `case <-time.After(...)` using `timeoutMs` (not a hardcoded duration)
- Step 3: `sweep` uses `select` with a `default` case; contains no sleep and no `time.After`
- Message strings built from the `team` parameter — output not hardcoded

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (hail):** 100 base, +50 first-try
- **Step 2 (first responder):** 130 base, +65 first-try
- **Step 3 (timeout + sweep):** 130 base, +65 first-try
- **Par time:** 200s total
- **Level timer:** 450s, game over on expiry

## Hints

### Step 1
1. "`make(chan string, 1)` — the 1 is buffer capacity. the team can drop its reply and go, even if nobody's listening yet." (−5 energy)
2. "launch the goroutine inside hail, return the channel immediately: `go func() { time.Sleep(...); ch <- team + \" responding\" }()` then `return ch`." (−8 energy)
3. "full shape: make the channel, `go func(){ sleep; send }()`, return ch. main's `<-ch` does the waiting — no WaitGroup needed, the receive IS the wait." (−12 energy)

### Step 2
1. "`select` is switch for channels. one `case msg := <-ch:` per team. it blocks until the first one has a value." (−8 energy)
2. "three cases, each returns its msg. don't receive them one by one — `<-alpha` first would wait on the slowest team to hail us back." (−12 energy)
3. "`select { case msg := <-alpha: return msg; case msg := <-bravo: return msg; case msg := <-charlie: return msg }` — first frequency to light up wins, the rest park in their buffers." (−20 energy)

### Step 3
1. "`time.After(d)` gives you a channel that fires once after d. add it as a fourth case and the teams race the clock." (−8 energy)
2. "timeout case: `case <-time.After(time.Duration(timeoutMs) * time.Millisecond): return \"NO CONTACT\"`. build the duration from the parameter." (−12 energy)
3. "sweep is two cases: `case msg := <-ch: return msg; default: return \"channel silent\"`. default means never block — check and keep moving." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Maya message: "three teams, three frequencies. i take the first voice that answers and i don't look back." |
| T+40s | Kira message: "Alpha, Bravo, Charlie. Frequencies attached. One of them is slower than it should be. Consider that a free lesson." |
| T+70s | Reeves message: "Frequencies she handed you, Maya. Every channel she gives us is a channel she can hear. Keep the timeout short." |
| T+120s | Rush Mode 1 — "FREQUENCY DEGRADATION DETECTED" |
| T+165s | GHOST broadcast: "T-MINUS 8 HOURS. PERIMETER ASSETS REPOSITIONING. DISTRICT EGRESS ROUTES UNDER REVIEW." |
| T+210s | Kira message: "Still deciding whether to trust my frequencies? You'll get to give me a real answer soon enough." |
| T+260s | Rush Mode 2 — "EXTRACTION WINDOW CLOSING" |
| T+320s | System message: "COMMS ARRAY THERMAL FLAG — SUSTAINED TRANSMISSION NOTICED" |

## Rush Mode

Two rushes this chapter — Act III pressure is climbing.

- **Rush 1 — Frequency Degradation**
  - **Trigger:** T+120s
  - **Duration:** 65 seconds
  - **Speed bonus:** Up to +60 XP
  - **On expiry:** Jeopardy — Signal Scramble (GHOST bleeds noise into the array: chat panel garbles for 8s, Maya's messages arrive corrupted — the one channel Maya trusts stops being trustworthy)
- **Rush 2 — Extraction Window Closing**
  - **Trigger:** T+260s
  - **Duration:** 60 seconds
  - **Speed bonus:** Up to +70 XP
  - **On expiry:** Jeopardy — Energy Drain (holding three open frequencies burns the array's reserve cell: energy −20, immediately)

## Twist

Bravo confirms — and Kira invoices.

### Twist Display

Lines (types at 22ms/char):

1. `> first contact: BRAVO — dock 4, forty minutes, one passenger`
2. `> unregistered channel — K.VOLKOV`
3. `> kira: bravo's frequency is open air. your thesis won't survive the trip uncoded. use my encoder.`
4. `> attachment: transmit.go — six lines — reads clean. almost too clean.`
5. `> reeves: Every gift of hers has carried a blade so far. Read every line before you run one.`
6. `> maya: six lines. i can read six lines.`
7. `> NEXT: her code. your verdict. what she is depends on what you see in it.`

## UI State

- **Location label:** SERVER ROOM · COMMS ARRAY
- **Concept label:** Channels · Select · Timeouts
- **Visual state:** Three frequency indicators (ALPHA/BRAVO/CHARLIE) with signal-strength bars; the winning channel locks green when `select` resolves; timeout arc sweeps around the indicators during step 3; `default` sweeps flash a brief radar ping
- **Audio:** facility-hum ambient, terminal-beep on each hail, handshake-confirm when a channel resolves, warning-beep at rush triggers, tension-drone during rushes, dread-sting on twist line 3
- **Kira's messages** render in her distinct color (established in ch07)

## Teaching Notes

### Channels after WaitGroups — deliberate sequencing

Ch08 taught "wait for goroutines" with a WaitGroup and carried results out through a pre-sized slice — two tools doing two jobs. This chapter shows the channel doing both at once: the value and the synchronization travel together, and `<-ch` replaces `wg.Wait()` for the one-answer case. Frame it explicitly: WaitGroup when you need *all* results, channel + select when you need *the first one*. That contrast is the whole reason the extraction fiction works.

### Buffered capacity 1 is a leak decision, not a performance decision

The classic beginner mistake is treating the buffer size as tuning. Here it's correctness: `select` abandons the losing teams, and an abandoned sender on an unbuffered channel blocks forever — a goroutine leak on every escape attempt. Capacity 1 lets losers deliver and die. This is the exact idiom used by production timeout wrappers (and by `time.After` itself). Zen rules should reward `make(chan string, 1)` in `hail` and flag unbuffered channels handed to a `select`.

### Timeout vs default — two different refusals to wait

Players conflate them constantly. `time.After` inside select = "wait, but not past the deadline." `default` = "don't wait at all, not even a tick." The fiction assigns each its scene: `awaitContact` guards the escape against jammed frequencies; `sweep` is a walk-past glance at a channel. A `default` where a timeout belongs busy-loops; a timeout where a `default` belongs stalls the loop. Zen rules should flag `time.After` inside `sweep` and any `for { select { default: } }` spin.

### Determinism on the playground

All expected output rides on the virtual clock: distinct sleep durations (100/200/250/300/400ms) guarantee exactly one select case becomes ready first, every run. The jammed-channel test works because an unbuffered channel with no sender can *never* fire — only `time.After` can. No output in this chapter depends on scheduler order.

### Common mistakes to catch

- Receiving sequentially (`<-alpha` then `<-bravo`) instead of `select` — passes no test (Bravo's reply would print second) but watch for it in hints
- `time.Sleep`-then-`sweep` polling loops instead of a blocking select with timeout
- Hardcoding `600` / `200` instead of using `timeoutMs` (acceptance-checked)
- Forgetting `hail` must return *before* the reply arrives — putting the sleep outside the goroutine serializes the hails, and Charlie's 400ms would delay every harness line

### The Kira thread

Every channel in this chapter runs on frequencies Kira supplied — the timed events keep scoring that unease (Reeves at T+70, Kira's own taunt at T+210), and the twist hands the player her `transmit.go`. The next encounter is not a level; it's a verdict. This chapter must leave the player fluent enough in channels to *read* concurrent code, because the boss asks them to judge some.
