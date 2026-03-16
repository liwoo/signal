# Chapter 10.2 — Countdown Clock

**Act IV · Exit Corridor · Security Hub**

## Go Concepts

- `time.Now()` — current time
- `time.Parse` / `time.Format` — Go's reference time `"2006-01-02 15:04:05"` (the weird Go date format where the numbers are Mon Jan 2 15:04:05 MST 2006)
- `time.Since` / `time.Sub` — duration between times
- `time.Duration` — hours, minutes, seconds
- `time.Add` / `time.AddDate` — adding durations to times

## Story Context

GHOST's countdown is real — 12 hours from Maya's cell breach. She needs to calculate exactly how much time remains before the building's deadlock protocol triggers. The security hub displays timestamps in GHOST's format. Maya needs to parse them, calculate durations, and figure out the exact escape deadline. If she gets the math wrong, they'll still be inside when the doors seal permanently.

This connects to GHOST's ch04 broadcast: "You have twelve hours. Then the building burns."

## Challenge

Build functions that parse GHOST's timestamps, calculate the escape deadline, compute remaining time, and format a security event log with relative durations.

### Steps

#### Step 0: Scaffold

Same as always — `package main`, `import`, `func main()`, print "clock synced".

Imports needed: `"fmt"`, `"time"`

#### Step 1: Parse GHOST Timestamps

Write `func parseGhostTime(s string) time.Time` that parses a timestamp string in the format `"2006-01-02 15:04:05"`.

Key teaching moment: Go uses a REFERENCE time, not format symbols like `%Y-%m-%d`. The reference time is `Mon Jan 2 15:04:05 MST 2006` — which is 01/02 03:04:05 PM '06. Every digit is unique. This is weird but makes Go timestamps very readable once you get it.

```go
func parseGhostTime(s string) time.Time {
    t, err := time.Parse("2006-01-02 15:04:05", s)
    if err != nil {
        fmt.Println("parse error:", err)
        return time.Time{}
    }
    return t
}
```

Test harness:
```go
func main() {
    breach := parseGhostTime("2024-03-15 02:30:00")
    fmt.Println(breach.Format("Jan 2, 3:04 PM"))
}
```

Expected output:
```
Mar 15, 2:30 AM
```

#### Step 2: Calculate Deadline

Write `func deadline(breach time.Time, hours int) time.Time` that adds hours to the breach time, AND write `func timeRemaining(now, deadline time.Time) string` that returns a human-readable duration like `"5h30m remaining"` or `"EXPIRED"` if past deadline.

Teaching moment: `time.Duration` is just `int64` nanoseconds. You multiply constants: `time.Duration(hours) * time.Hour`. To extract components, `d.Hours()` returns a float, so cast to int and use modulo on minutes.

```go
func deadline(breach time.Time, hours int) time.Time {
    return breach.Add(time.Duration(hours) * time.Hour)
}

func timeRemaining(now, dead time.Time) string {
    remaining := dead.Sub(now)
    if remaining <= 0 {
        return "EXPIRED"
    }
    hours := int(remaining.Hours())
    minutes := int(remaining.Minutes()) % 60
    return fmt.Sprintf("%dh%02dm remaining", hours, minutes)
}
```

Test harness:
```go
func main() {
    breach := parseGhostTime("2024-03-15 02:30:00")
    dead := deadline(breach, 12)
    fmt.Println(dead.Format("Jan 2, 3:04 PM"))

    now1 := parseGhostTime("2024-03-15 09:00:00")
    fmt.Println(timeRemaining(now1, dead))

    now2 := parseGhostTime("2024-03-15 14:28:00")
    fmt.Println(timeRemaining(now2, dead))

    now3 := parseGhostTime("2024-03-15 15:00:00")
    fmt.Println(timeRemaining(now3, dead))
}
```

Expected output:
```
Mar 15, 2:30 PM
5h30m remaining
0h02m remaining
EXPIRED
```

Breakdown: breach is 02:30, +12h = 14:30. now1 09:00 → 5h30m left. now2 14:28 → 2m left. now3 15:00 → past deadline, EXPIRED.

#### Step 3: Security Log Formatter

Write `func formatLog(events []string, times []string) string` that:
1. Parses each timestamp
2. Calculates the duration since the first event
3. Formats as `"[+Xm] event"` where X is minutes since first event

Teaching moment: `t.Sub(first).Minutes()` gives a float64 of total minutes. Cast to int for clean output. This combines everything from the chapter — parsing, subtraction, duration extraction — into one function.

```go
func formatLog(events []string, times []string) string {
    if len(events) == 0 {
        return ""
    }
    first := parseGhostTime(times[0])
    result := ""
    for i, event := range events {
        t := parseGhostTime(times[i])
        diff := int(t.Sub(first).Minutes())
        result += fmt.Sprintf("[+%dm] %s\n", diff, event)
    }
    return result
}
```

Test harness:
```go
func main() {
    events := []string{"cell breach", "corridor clear", "shaft accessed", "floor 2 reached"}
    times := []string{
        "2024-03-15 02:30:00",
        "2024-03-15 02:47:00",
        "2024-03-15 03:15:00",
        "2024-03-15 04:00:00",
    }
    fmt.Print(formatLog(events, times))
}
```

Expected output:
```
[+0m] cell breach
[+17m] corridor clear
[+45m] shaft accessed
[+90m] floor 2 reached
```

### Acceptance Criteria

- Uses `time.Parse` with Go's reference time format `"2006-01-02 15:04:05"`
- Uses `time.Format` for human-readable output
- Uses `time.Add` with `time.Hour` for deadline calculation
- Uses `time.Sub` for duration calculation
- Handles expired/past deadline case with `remaining <= 0`
- `time.Duration` arithmetic (`.Hours()`, `.Minutes()`)
- `formatLog` iterates parallel slices and computes relative offsets

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (parseGhostTime):** 80 base, +40 first-try
- **Step 2 (deadline + timeRemaining):** 100 base, +50 first-try
- **Step 3 (formatLog):** 100 base, +50 first-try
- **Par time:** 170s total

## Hints

### Step 0
1. "start with `package main` and import `\"fmt\"` and `\"time\"`." (−5 energy)
2. "write `func main()` and call `fmt.Println(\"clock synced\")`." (−8 energy)
3. "full scaffold: `package main\nimport (\"fmt\"\n\"time\")\nfunc main() { fmt.Println(\"clock synced\") }`" (−12 energy)

### Step 1
1. "`time.Parse` takes a layout and a value. the layout uses Go's reference time, not `%Y-%m-%d`." (−5 energy)
2. "the reference layout is `\"2006-01-02 15:04:05\"` — the digits 01 02 03 04 05 06 each appear once. pass this as the first argument to `time.Parse`." (−8 energy)
3. "`t, err := time.Parse(\"2006-01-02 15:04:05\", s)` — check `err != nil`, return `time.Time{}` on error, return `t` on success." (−12 energy)

### Step 2
1. "`time.Duration(hours) * time.Hour` gives you a duration of N hours. use `.Add()` to offset a time." (−5 energy)
2. "`dead.Sub(now)` returns a `time.Duration`. if it's `<= 0`, the deadline has passed." (−8 energy)
3. "`int(remaining.Hours())` for hours, `int(remaining.Minutes()) % 60` for leftover minutes. format with `Sprintf(\"%dh%02dm remaining\", ...)`." (−12 energy)

### Step 3
1. "parse `times[0]` as the baseline. for each event, compute `t.Sub(first).Minutes()`." (−5 energy)
2. "cast the float64 minutes to int: `diff := int(t.Sub(first).Minutes())`. format with `[+%dm]`." (−8 energy)
3. "loop with `for i, event := range events`, parse `times[i]`, compute diff from first, `Sprintf(\"[+%dm] %s\\n\", diff, event)` and concatenate." (−12 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Maya message: "GHOST's countdown started when I left the cell. every second counts." |
| T+50s | System message: "DEADLOCK PROTOCOL: T-MINUS COUNTING" |
| T+100s | Rush Mode — "Clock Ticking" |

## Rush Mode

- **Duration:** 70 seconds
- **Speed bonus:** Up to +80 XP
- **On expiry:** Jeopardy — Time Miscalculation (security hub display glitches, garbled overlay for 5s)

## Twist

After building the log formatter, Maya runs it on the actual security logs. The output reveals something wrong — there's a 3-hour gap between "shaft accessed" and "floor 2 reached." Someone delayed the system clock. Reeves: "GHOST is playing with time. The 12 hours might not be real."

## UI State

- **Location label:** EXIT CORRIDOR · SECURITY HUB
- **Concept label:** time.Parse · time.Format · Duration · time.Sub
- **Visual state:** Clock display with countdown, timestamp log scrolling

## Teaching Notes

### Go's reference time — the weirdest design choice that actually works

Go doesn't use strftime-style format strings (`%Y`, `%m`, `%d`). Instead it uses a reference time: `Mon Jan 2 15:04:05 MST 2006`. The numbers 01, 02, 03, 04, 05, 06 each appear exactly once. To format a date, you write what the reference time would look like in your desired format. Example: `"2006-01-02"` for ISO dates, `"Jan 2, 3:04 PM"` for readable dates. Weird at first, completely intuitive once it clicks.

### Duration arithmetic

`time.Duration` is just `int64` nanoseconds under the hood. `time.Hour`, `time.Minute`, `time.Second` are constants. You multiply: `3 * time.Hour`. You extract: `d.Hours()`, `d.Minutes()`. Clean and precise. The gotcha: `.Minutes()` returns total minutes as float64, not minutes-after-hours. That's why Step 2 uses `% 60` to extract the remainder.

### Error handling callback

`time.Parse` returns `(time.Time, error)` — same pattern as `strconv.Atoi` from ch04.2. Players see the error pattern again in a different context. Reinforcement without repetition.

### Parallel slice iteration

Step 3 iterates two slices in lockstep (`events[i]` and `times[i]`). This is a common real-world pattern — parallel arrays where index correlates the data. Go doesn't have `zip()` like Python, so explicit indexing is the idiom.

### Duration from subtraction — the core concept

The entire chapter builds toward one idea: `time.Sub` returns a `time.Duration`, and duration has methods to extract human-readable components. Step 1 teaches parsing, Step 2 teaches subtraction + formatting, Step 3 combines both into a practical formatter. Each step builds on the last.
