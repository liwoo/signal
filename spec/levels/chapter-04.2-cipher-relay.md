# Chapter 4.2 — Cipher Relay

**Act II · Floor 2 · Comms Room**

## Go Concepts

- Strings as slices of bytes / runes (`[]rune`, `[]byte`)
- Arrays (fixed-length) vs slices (dynamic)
- String building (`string()` conversion, concatenation)
- `strconv.Itoa` / `strconv.Atoi`
- Range over strings (rune iteration)
- Slice operations (`append`, `len`, indexing, sub-slicing)

## Story Context

Maya and Reeves reach the comms room on Floor 2. GHOST's surveillance is intercepting all outgoing messages. Reeves suggests a simple cipher: reverse each word in the message so the guards' keyword scanners can't parse it. Maya needs to build the encoder and a decoder to verify round-trip correctness. She also needs to convert numeric floor codes between strings and ints for the relay headers.

## Challenge

Build functions that reverse individual words in a message (preserving word order and spaces), plus a numeric conversion helper for relay headers.

### Steps

#### Step 0: Scaffold

Same as always — `package main`, `import`, `func main()`, print "ready".

Imports needed: `"fmt"`, `"strings"`, `"strconv"`

#### Step 1: Reverse a Single Word

Write `func reverseWord(s string) string` that reverses the characters (runes) of a single word.

Key teaching moment: a string in Go is a read-only slice of bytes. To reverse it safely (handling unicode), convert to `[]rune` first, reverse the rune slice, then convert back to `string`.

```go
func reverseWord(s string) string {
    runes := []rune(s)
    for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
        runes[i], runes[j] = runes[j], runes[i]
    }
    return string(runes)
}
```

Test harness:
```go
func main() {
    fmt.Println(reverseWord("hello"))
    fmt.Println(reverseWord("Go"))
    fmt.Println(reverseWord("a"))
}
```

Expected output:
```
olleh
oG
a
```

#### Step 2: Encode a Full Message

Write `func encode(msg string) string` that splits the message into words, reverses each word (using `reverseWord`), and joins them back with spaces.

Teaching moment: `strings.Fields` splits on whitespace. Slices are dynamic — you can `append` reversed words to a result slice, then `strings.Join` them.

```go
func encode(msg string) string {
    words := strings.Fields(msg)
    result := []string{}
    for _, w := range words {
        result = append(result, reverseWord(w))
    }
    return strings.Join(result, " ")
}
```

Test harness:
```go
func main() {
    fmt.Println(encode("floor is clear"))
    fmt.Println(encode("move to shaft 3"))
    fmt.Println(encode(encode("round trip")))
}
```

Expected output:
```
roolf si raelc
evom ot tfahs 3
round trip
```

The third test proves `encode(encode(x)) == x` — reversing twice recovers the original. This is the round-trip verification Reeves needs.

#### Step 3: Relay Header Conversion

Write `func relayHeader(floor int, code string) string` that:
1. Converts the floor number to a string using `strconv.Itoa`
2. Converts the code string to an int using `strconv.Atoi`
3. Returns a formatted header: `"F<floor>-C<code_int * 2>"`

Teaching moment: `strconv.Atoi` returns two values `(int, error)`. The error must be handled (or at minimum, assigned to `_` — but teach the clean way with a check). This is Go's "no exceptions" pattern.

```go
func relayHeader(floor int, code string) string {
    f := strconv.Itoa(floor)
    c, err := strconv.Atoi(code)
    if err != nil {
        return "F" + f + "-ERR"
    }
    return "F" + f + "-C" + strconv.Itoa(c*2)
}
```

Test harness:
```go
func main() {
    fmt.Println(relayHeader(2, "50"))
    fmt.Println(relayHeader(3, "abc"))
    fmt.Println(relayHeader(1, "25"))
}
```

Expected output:
```
F2-C100
F3-ERR
F1-C50
```

### Acceptance Criteria

- `reverseWord` converts to `[]rune` and reverses (not byte-level)
- `encode` uses `strings.Fields` + `reverseWord` + `strings.Join`
- `encode(encode(x)) == x` (round-trip)
- `relayHeader` uses `strconv.Itoa` and `strconv.Atoi`
- Error case handled for `strconv.Atoi`

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (reverseWord):** 80 base, +40 first-try
- **Step 2 (encode):** 100 base, +50 first-try
- **Step 3 (relayHeader):** 80 base, +40 first-try
- **Par time:** 150s total

## Hints

### Step 1
1. "a string is read-only. convert to `[]rune(s)` to get a mutable slice of characters." (−5 energy)
2. "swap from both ends: `for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1`" (−8 energy)
3. "full pattern: `runes[i], runes[j] = runes[j], runes[i]` inside the loop, then `return string(runes)`" (−12 energy)

### Step 2
1. "`strings.Fields(msg)` splits on whitespace and returns a `[]string` slice." (−5 energy)
2. "build a result slice with `append`: `result = append(result, reverseWord(w))`" (−8 energy)
3. "`strings.Join(result, \" \")` glues the slice back into one string with spaces." (−12 energy)

### Step 3
1. "`strconv.Itoa(42)` → `\"42\"`. int to ASCII." (−5 energy)
2. "`strconv.Atoi(\"50\")` returns `(50, nil)`. if the string isn't a number, err is non-nil." (−8 energy)
3. "check `if err != nil { return \"F\" + f + \"-ERR\" }` — Go's error pattern. no exceptions." (−12 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Maya message: "reeves says the keyword scanners check every 30 seconds. we need the cipher ready before the next sweep." |
| T+40s | System message: "COMMS INTERCEPT DETECTED — ENCODING REQUIRED" |
| T+80s | Rush Mode — "Scanner Sweep Incoming" |

## Rush Mode

- **Duration:** 70 seconds
- **Speed bonus:** Up to +80 XP
- **On expiry:** Jeopardy — Intercepted (chat panel shows garbled text overlay for 5s, disorienting)

## Twist

None — story beat happens at end of chapter:

Maya sends the first encoded message through the relay:
> `evom ot roolf 4 — raelc`

Reeves decodes it on the other end. The relay is live. They have a secure channel.

## UI State

- **Location label:** FLOOR 2 · COMMS ROOM
- **Concept label:** Strings · Runes · Slices · Arrays · strconv
- **Visual state:** Comms terminal green tint, relay status indicator in top bar

## Teaching Notes

### Strings are slices (the big reveal)

This is the first time the player sees that strings aren't atomic — they're slices of bytes under the hood. The `[]rune` conversion is critical: iterating bytes on a multi-byte character (like emoji or accented letters) would break. `[]rune` guarantees one element per character.

### Arrays vs slices

The `[]rune` conversion produces a **slice** (dynamic, backed by an array). Mention that Go also has fixed-length arrays (`[5]int`) but slices are what you use 99% of the time. The reverseWord function demonstrates slice indexing and mutation.

### strconv as the bridge

`strconv` is Go's "strings ↔ numbers" bridge. `Itoa` (int to ASCII) and `Atoi` (ASCII to int) are the two functions every Go programmer memorizes. The error return from `Atoi` is the first time the player handles a Go error — a gentle introduction before the more complex error handling in later chapters.

### Composition callback

The player already learned composition in ch03 (sumCodes inside validateCode). Here they compose again: `reverseWord` inside `encode`. Same pattern, different domain. Reinforcement without repetition.
