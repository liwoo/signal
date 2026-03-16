# Chapter 4.3 — Signal Sort

**Act II · Floor 2 · Comms Room**

## Go Concepts

- `sort.Slice` (custom sort with comparison function)
- `sort.Ints`, `sort.Strings` (convenience sorts)
- `strings.Contains`, `strings.HasPrefix` (string searching)
- `strings.Replace`, `strings.ToUpper`, `strings.ToLower` (string transformation)
- `strings.Count` (substring counting)
- Combining sorting with string filtering

## Story Context

The encoded relay messages are piling up. Maya needs to organize intercepted transmissions: filter by prefix, clean up formatting, and sort by priority. Reeves wants the highest-priority messages at the top so they can plan the next move. The comms room terminal is overflowing — if the buffer fills before the messages are sorted, the relay crashes and GHOST gets a location ping.

## Challenge

Build functions that clean, filter, and sort intercepted messages by priority tier using Go's `strings` and `sort` packages.

### Steps

#### Step 0: Scaffold

Same as always — `package main`, `import`, `func main()`, print "ready".

Imports needed: `"fmt"`, `"strings"`, `"sort"`

#### Step 1: String Operations

Write `func cleanMessage(msg string) string` that:
1. Converts the entire message to lowercase using `strings.ToLower`
2. Replaces every occurrence of "ghost" with "[REDACTED]" using `strings.Replace`
3. Returns the cleaned message

Key teaching moment: `strings.ToLower` returns a new string (strings are immutable in Go). `strings.Replace` takes four args: the source string, old substring, new substring, and count (`-1` means replace all). Chain them — pass the result of `ToLower` into `Replace`.

```go
func cleanMessage(msg string) string {
    lower := strings.ToLower(msg)
    return strings.Replace(lower, "ghost", "[REDACTED]", -1)
}
```

Test harness:
```go
func main() {
    fmt.Println(cleanMessage("GHOST detected on Floor 2"))
    fmt.Println(cleanMessage("All clear, no GHOST activity"))
}
```

Expected output:
```
[REDACTED] detected on floor 2
all clear, no [REDACTED] activity
```

#### Step 2: Filter Messages

Write `func filterUrgent(messages []string) []string` that returns only messages containing "URGENT" (using `strings.Contains`) or starting with "PRIORITY" (using `strings.HasPrefix`).

Teaching moment: `strings.Contains(s, substr)` checks if `substr` appears anywhere in `s`. `strings.HasPrefix(s, prefix)` checks if `s` starts with `prefix`. Both return `bool`. The player builds a result slice using `append` — same pattern from ch04.2 but now with a conditional filter.

```go
func filterUrgent(messages []string) []string {
    result := []string{}
    for _, m := range messages {
        if strings.Contains(m, "URGENT") || strings.HasPrefix(m, "PRIORITY") {
            result = append(result, m)
        }
    }
    return result
}
```

Test harness:
```go
func main() {
    msgs := []string{
        "URGENT: Floor 3 breach",
        "routine check complete",
        "PRIORITY alpha team move",
        "sensor nominal",
        "URGENT: backup needed",
    }
    fmt.Println(filterUrgent(msgs))
}
```

Expected output:
```
[URGENT: Floor 3 breach PRIORITY alpha team move URGENT: backup needed]
```

#### Step 3: Sort by Priority

Write `func sortByPriority(messages []string) []string` that sorts messages so:
- Messages starting with "PRIORITY" come first
- Then messages containing "URGENT"
- Then everything else
- Within each group, sort alphabetically

Use `sort.Slice` with a custom `less` function.

Key teaching moment: `sort.Slice` is Go's universal sorter. It takes a slice and a `func(i, j int) bool` comparison function. The comparison returns `true` when element `i` should come before element `j`. The function is a closure — it captures the `messages` slice from the outer scope. Internally, `sort.Slice` rearranges the slice in place.

Also demonstrate `sort.Strings` — the convenience function for simple alphabetical sorting. Show it conceptually in the teaching notes even though the custom sorter handles everything here.

```go
func sortByPriority(messages []string) []string {
    result := make([]string, len(messages))
    copy(result, messages)
    sort.Slice(result, func(i, j int) bool {
        pi := priority(result[i])
        pj := priority(result[j])
        if pi != pj {
            return pi < pj
        }
        return result[i] < result[j]
    })
    return result
}

func priority(msg string) int {
    if strings.HasPrefix(msg, "PRIORITY") {
        return 0
    }
    if strings.Contains(msg, "URGENT") {
        return 1
    }
    return 2
}
```

Test harness:
```go
func main() {
    msgs := []string{
        "URGENT: backup needed",
        "routine check complete",
        "PRIORITY alpha team move",
        "sensor nominal",
        "URGENT: Floor 3 breach",
        "PRIORITY bravo standby",
    }
    sorted := sortByPriority(msgs)
    for _, m := range sorted {
        fmt.Println(m)
    }
}
```

Expected output:
```
PRIORITY alpha team move
PRIORITY bravo standby
URGENT: Floor 3 breach
URGENT: backup needed
routine check complete
sensor nominal
```

### Acceptance Criteria

- `cleanMessage` uses `strings.ToLower` and `strings.Replace`
- `filterUrgent` uses `strings.Contains` and `strings.HasPrefix`
- `sortByPriority` uses `sort.Slice` with a custom comparison function
- Messages correctly grouped by priority tier (PRIORITY > URGENT > other)
- Within each tier, messages are sorted alphabetically

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (cleanMessage):** 80 base, +40 first-try
- **Step 2 (filterUrgent):** 80 base, +40 first-try
- **Step 3 (sortByPriority):** 100 base, +50 first-try
- **Par time:** 160s total

## Hints

### Step 1
1. "`strings.ToLower(s)` returns a new string with all characters lowered. strings are immutable — it doesn't change the original." (−5 energy)
2. "`strings.Replace(s, old, new, -1)` replaces all occurrences. the `-1` means no limit on replacements." (−8 energy)
3. "chain them: `lower := strings.ToLower(msg)` then `return strings.Replace(lower, \"ghost\", \"[REDACTED]\", -1)`. lowercase first so \"GHOST\" becomes \"ghost\" before the replace." (−12 energy)

### Step 2
1. "`strings.Contains(s, \"URGENT\")` returns true if \"URGENT\" appears anywhere in `s`." (−5 energy)
2. "`strings.HasPrefix(s, \"PRIORITY\")` checks if `s` starts with \"PRIORITY\". combine with `||` for the filter condition." (−8 energy)
3. "loop with range, check the condition, `append` matches to a result slice: `result = append(result, m)`" (−12 energy)

### Step 3
1. "`sort.Slice(s, func(i, j int) bool { ... })` sorts `s` in place. the function returns true when `s[i]` should come before `s[j]`." (−5 energy)
2. "assign a numeric priority: 0 for PRIORITY prefix, 1 for URGENT, 2 for everything else. compare priorities first, then alphabetically as tiebreaker." (−8 energy)
3. "write a helper `func priority(msg string) int` that returns 0/1/2. in the less function: `if pi != pj { return pi < pj }` then `return result[i] < result[j]` for alphabetical tiebreak." (−12 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Maya message: "messages are flooding in. we need to filter the noise." |
| T+45s | System message: "RELAY BUFFER OVERFLOW — SORT REQUIRED" |
| T+90s | Rush Mode — "Buffer Full" |

## Rush Mode

- **Duration:** 60 seconds
- **Speed bonus:** Up to +70 XP
- **On expiry:** Jeopardy — Relay Overflow (chat panel floods with garbled messages for 5s)

## Twist

After sorting, Maya notices a pattern — all PRIORITY messages mention "alpha team." Reeves confirms: alpha team is Kira's unit. First breadcrumb toward the Ch6 Kira reveal.

> "every priority message... they're all about alpha team. who's running that unit?"
> Reeves pauses. "someone you used to know."

## UI State

- **Location label:** FLOOR 2 · COMMS ROOM
- **Concept label:** sort.Slice · strings · Filtering · Custom Sort
- **Visual state:** Comms terminal green tint, relay buffer indicator in top bar filling as timed events fire, sorted message list preview on right panel

## Teaching Notes

### sort.Slice — the universal sorter

`sort.Slice` is how you sort anything in Go. You pass your slice plus a comparison function. The comparison returns `true` when element `i` should come before element `j`. The function is a closure — it captures the slice variable from the outer scope, which is why you don't pass the slice into the function itself. Under the hood, Go uses an optimized quicksort variant.

For simple cases, Go provides convenience functions: `sort.Ints(s)` sorts `[]int` ascending, `sort.Strings(s)` sorts `[]string` alphabetically. But `sort.Slice` is what you reach for when the sort logic is custom — which is most real-world code.

### String functions — the swiss army knife

The `strings` package is one of the most-used in Go. Players saw `strings.Fields` and `strings.Join` in ch04.2 — this chapter rounds out the toolkit with `Contains`, `HasPrefix`, `Replace`, `ToLower`, and `Count`. Together these handle 90% of real-world string work. Each function is pure (returns a new string, never mutates), which reinforces Go's immutable-strings mental model.

### Composition callback

The player composes functions across steps: `cleanMessage` is a standalone transformer, `filterUrgent` builds a filtered slice, and `sortByPriority` ties it all together with a custom comparator that reuses the same `strings.HasPrefix` / `strings.Contains` checks from step 2. Each step builds on the previous. Same composition pattern from ch03 (sumCodes inside validateCode) and ch04.2 (reverseWord inside encode) — reinforcement without repetition.

### The priority helper pattern

Extracting a `priority(msg) int` helper is idiomatic Go: small, single-purpose functions that map domain concepts to comparable values. This pattern appears everywhere in production Go — turning complex sort logic into a simple numeric comparison. Players learn that breaking a complex `less` function into a helper makes the code readable and testable.
