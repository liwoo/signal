# Chapter 6 — Lock Interface

**Act II · Floor 3 · Server Room Doors**

## Go Concepts

- Interfaces (definition, implicit implementation)
- The `error` interface (`Error() string`)
- `errors.New` (simple error values)
- Custom error types (struct with `Error()` method, pointer receiver)
- `errors.As` (extracting a concrete error type)
- Accepting interface types in function parameters (polymorphism)

## Story Context

Hour 20. Park's patrol gap is open and Maya is at the Floor 3 server room — the first door between her and a copy of her thesis. Two locks guard it: a keypad on the west door, a biometric scanner on the east, and the east scanner is throwing faults. Somewhere on this floor is K. VOLKOV — the guard uniform Kira is wearing. Reeves can't tell Maya which door will open; the locks are different hardware speaking different protocols. She needs one piece of code that treats every lock the same — try it, read the error it hands back, and route through the door that works. Trip a fault alarm and Park's gap slams shut.

## Challenge

Define a `Lock` interface, implement it with two lock types, build a custom error type that carries the failing lock's data, and write one door-opening function that handles every lock — working or broken.

### Steps

#### Step 0: Scaffold

Same as always — `package main`, `import`, `func main()`, print "lock interface ready".

Imports needed: `"errors"`, `"fmt"`

Expected output:
```
lock interface ready
```

#### Step 1: The Lock Interface + KeypadLock

Define `type Lock interface { Unlock(code string) error }`, then a `KeypadLock` struct that satisfies it.

Key teaching moment: an interface is a contract — a list of method signatures. Any type that has those methods satisfies the interface *automatically*. There is no `implements` keyword in Go. `KeypadLock` is a plain struct (same as ch05's `Guard`) with an `Unlock` method; that method alone makes it a `Lock`. And `error` is the return type every real-world unlock uses: `nil` means success, non-nil explains the failure. `errors.New` builds a simple error value.

```go
type Lock interface {
    Unlock(code string) error
}

type KeypadLock struct {
    Code string
}

func (k KeypadLock) Unlock(code string) error {
    if code != k.Code {
        return errors.New("keypad: wrong code")
    }
    return nil
}
```

Test harness:
```go
func main() {
    var l Lock = KeypadLock{Code: "7291"}
    if err := l.Unlock("0000"); err != nil {
        fmt.Println("FAILED:", err)
    }
    if err := l.Unlock("7291"); err == nil {
        fmt.Println("UNLOCKED")
    }
}
```

Expected output:
```
FAILED: keypad: wrong code
UNLOCKED
```

Note the harness variable: `var l Lock = KeypadLock{...}` — the concrete struct is assigned to the interface type. That line only compiles if `KeypadLock` really satisfies `Lock`.

#### Step 2: Custom Error Type + BiometricLock

Define a `LockError` struct that satisfies the `error` interface, then a `BiometricLock` that returns it when jammed.

Key teaching moment: `error` is not magic — it's just another interface: `type error interface { Error() string }`. Any type with an `Error() string` method is an error. A custom error *struct* can carry structured data (which door, what reason) instead of a bare message. Return it as a pointer (`&LockError{...}`) — the `Error()` method uses a pointer receiver, so the pointer is what satisfies `error`.

```go
type LockError struct {
    Door   string
    Reason string
}

func (e *LockError) Error() string {
    return e.Door + " lock failed: " + e.Reason
}

type BiometricLock struct {
    Door   string
    Jammed bool
}

func (b BiometricLock) Unlock(code string) error {
    if b.Jammed {
        return &LockError{Door: b.Door, Reason: "scanner jammed"}
    }
    return nil
}
```

Test harness:
```go
func main() {
    var l Lock = BiometricLock{Door: "server-east", Jammed: true}
    err := l.Unlock("")
    fmt.Println(err)

    working := BiometricLock{Door: "server-west", Jammed: false}
    if working.Unlock("") == nil {
        fmt.Println("server-west UNLOCKED")
    }
}
```

Expected output:
```
server-east lock failed: scanner jammed
server-west UNLOCKED
```

`fmt.Println(err)` calls `Error()` for you — that's the interface at work again.

#### Step 3: One Function for Every Lock

Write `func openDoor(l Lock, code string) string` that tries any lock and reports what happened:
1. `nil` error → `"ACCESS GRANTED"`
2. A `*LockError` → `"BLOCKED [<door>]: <reason>"` (extract it with `errors.As`)
3. Any other error → `"DENIED: <error message>"`

Key teaching moment: this is why interfaces exist. `openDoor` takes a `Lock` — it doesn't know or care whether it's a keypad or a scanner. And `errors.As` asks "is this error, underneath, a `*LockError`?" — if yes, it fills the target pointer so you can read the struct's fields. Declare the target first (`var lockErr *LockError`), then pass its address: `errors.As(err, &lockErr)`.

```go
func openDoor(l Lock, code string) string {
    err := l.Unlock(code)
    if err == nil {
        return "ACCESS GRANTED"
    }
    var lockErr *LockError
    if errors.As(err, &lockErr) {
        return "BLOCKED [" + lockErr.Door + "]: " + lockErr.Reason
    }
    return "DENIED: " + err.Error()
}
```

Test harness:
```go
func main() {
    locks := []Lock{
        KeypadLock{Code: "7291"},
        BiometricLock{Door: "server-east", Jammed: true},
        BiometricLock{Door: "server-west", Jammed: false},
    }
    codes := []string{"0000", "", ""}
    for i, l := range locks {
        fmt.Println(openDoor(l, codes[i]))
    }
}
```

Expected output:
```
DENIED: keypad: wrong code
BLOCKED [server-east]: scanner jammed
ACCESS GRANTED
```

The `[]Lock` slice holds two *different* struct types under one interface — that's the payoff. Fictionally, this is the routing code: the west biometric door reports `ACCESS GRANTED`, and that's the door Maya takes.

### Acceptance Criteria

- `Lock` interface defined with exactly `Unlock(code string) error`
- `KeypadLock.Unlock` compares against the `Code` field (no hardcoded `"7291"` checks against literals in `main`, no hardcoded output strings)
- `LockError` struct has `Door` and `Reason` fields and an `Error() string` method with a pointer receiver
- `BiometricLock.Unlock` returns `&LockError{...}` when jammed, `nil` otherwise
- `openDoor` accepts the interface type `Lock`, not a concrete struct
- `errors.As` used with a `*LockError` target (not string matching on the error message)
- `errors.New` used for the plain keypad error

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (interface + keypad):** 90 base, +45 first-try
- **Step 2 (custom error + biometric):** 100 base, +50 first-try
- **Step 3 (openDoor + errors.As):** 100 base, +50 first-try
- **Par time:** 180s total
- **Level timer:** 420s · gameOverOnExpiry: true

## Hints

### Step 1
1. "an interface is just a contract: `type Lock interface { Unlock(code string) error }`. any type with that method satisfies it. no implements keyword." (−5 energy)
2. "KeypadLock is a struct like ch05's Guard. attach the method: `func (k KeypadLock) Unlock(code string) error`." (−8 energy)
3. "inside Unlock: `if code != k.Code { return errors.New(\"keypad: wrong code\") }` then `return nil`. nil means the door opens." (−12 energy)

### Step 2
1. "error is an interface too — anything with `Error() string`. define a struct and give it that method." (−5 energy)
2. "`type LockError struct { Door, Reason string }` then `func (e *LockError) Error() string` — pointer receiver. return `e.Door + \" lock failed: \" + e.Reason`." (−8 energy)
3. "in BiometricLock.Unlock: `if b.Jammed { return &LockError{Door: b.Door, Reason: \"scanner jammed\"} }` — don't drop the `&`. return nil otherwise." (−12 energy)

### Step 3
1. "declare the target before the check: `var lockErr *LockError`, then `errors.As(err, &lockErr)` — the `&` is required." (−8 energy)
2. "errors.As returns true when err is a *LockError underneath. inside that branch, lockErr.Door and lockErr.Reason are filled in and readable." (−12 energy)
3. "three exits: nil err → \"ACCESS GRANTED\". errors.As true → \"BLOCKED [\" + lockErr.Door + \"]: \" + lockErr.Reason. anything else → \"DENIED: \" + err.Error()." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+15s | Maya message: "hour 20. park's gap is open. two doors, two locks — we get one shot at picking right." |
| T+60s | Reeves message: "The east scanner is logging a fault every few seconds. Something — or someone — has interfered with it." |
| T+120s | GHOST broadcast: "T-MINUS NINE HOURS. STRUCTURAL INCINERATION PROTOCOL ARMED." |
| T+180s | System message: "LOCK TELEMETRY QUERY DETECTED — SOURCE: EXEC-TERM-01" |
| T+240s | Rush Mode — "Fault Alarm Pending" |

## Rush Mode

- **Duration:** 60 seconds
- **Speed bonus:** Up to +80 XP
- **On expiry:** Jeopardy — Signal Scramble (the east scanner's fault counter trips a diagnostic sweep; 3 random characters in the editor are replaced with `█` every 8s until fixed)

## Twist

Maya's `openDoor` routine comes back with something she didn't ask for. The jammed east scanner isn't broken — its fault log shows a manual override: K. VOLKOV badged through 92 seconds ago and held the door open behind her. Kira isn't just inside the building. She's *here*, on Floor 3, moments ahead of them — and she left the door open on purpose. As Maya reads the log, one more line lands: an executive terminal has quietly attached itself to the lock telemetry session. Someone upstairs is watching the same log she is. (Sets up boss-02: Director Vasik.)

### Twist Display

- Lines (types at 22ms/char):
  1. `> reading fault log — server-east biometric`
  2. `> last badge event: K. VOLKOV · SECURITY · 92 seconds ago`
  3. `> door state: HELD OPEN — manual override`
  4. `> maya: ninety seconds. she just walked through this door.`
  5. `> maya: the scanner isn't broken. she jammed it open. for us.`
  6. `> maya: she's leaving a path. reeves — do we follow her?`
  7. `> [EXEC-TERM-01] observer attached to lock telemetry session`

## UI State

- **Location label:** FLOOR 3 · SERVER ROOM DOORS
- **Concept label:** Interfaces · Errors · Custom Errors
- **Visual state:** Split door schematic (west keypad / east scanner) with per-lock status LEDs; east scanner LED flickers amber on every fault event; fault counter in top bar climbs during rush
- **Audio:** facility-hum ambient, keypad-beep on code submit, warning-beep on fault events, alert-beep on the EXEC-TERM-01 event, dread-sting on twist line 7

## Teaching Notes

### Interfaces are satisfied implicitly (the big idea)

This is Go's most distinctive design choice. In Java/C# you declare `implements Lock`; in Go you just write the method and the compiler figures it out. Step 1's harness line `var l Lock = KeypadLock{...}` is the proof — it only compiles because the method set matches. Emphasize that `Lock` doesn't know about `KeypadLock` and `KeypadLock` doesn't know about `Lock`. They meet in the middle.

### error was an interface all along

The player has been returning and checking errors since `strconv.Atoi` in ch04.2 without knowing what `error` *is*. This chapter pulls the curtain back: `type error interface { Error() string }` — one method, same mechanics as `Lock`. Teaching interfaces and errors in the same chapter is deliberate; each explains the other.

### Custom errors carry data — and here, the data carries the plot

`LockError` isn't just a fancier message: `Door` and `Reason` are structured fields the caller can branch on. Fictionally, the twist rides in exactly this channel — the jam reason surfaces the Volkov badge log. When the fictional system and the code are the same system, the lesson sticks.

### errors.As, gently

`errors.As(err, &lockErr)` is the modern idiom (it also sees through wrapped errors, which matters from Act III on). The classic type assertion `lockErr, ok := err.(*LockError)` does the same for unwrapped errors — mention it in passing, but teach `errors.As` as the default. The two sharp edges to warn about: the target must be declared first, and you pass `&lockErr` (pointer to the pointer).

### Sentinel errors preview

Don't teach `errors.Is` here — but note it exists: a package-level `var ErrJammed = errors.New("jammed")` is a *sentinel* you compare with `errors.Is(err, ErrJammed)`. The Act II boss puts a sentinel error in Vasik's code, so this one-line preview pays off within the hour.

### Composition callback

`KeypadLock` and `BiometricLock` are ch05 structs with methods — nothing new until the interface unifies them. `openDoor` is the same compose-small-functions move as ch03 (`sumCodes` in `validateCode`) and ch04.2 (`reverseWord` in `encode`), now lifted to types.

### Common mistakes

- Defining `Error()` on the value receiver but returning `&LockError{}` (or vice versa) — the method set mismatch confuses beginners; standardize on pointer receiver + return pointer.
- Forgetting the `&` in `errors.As(err, &lockErr)` — compile error, good learning moment.
- Matching on `err.Error() == "..."` strings instead of types — the acceptance criteria explicitly block this.

### What the zen rules should reward

- Early return on error (`if err == nil { return "ACCESS GRANTED" }` first, no else-chains)
- Go error-string convention: lowercase, no trailing punctuation ("keypad: wrong code")
- `openDoor` accepting the `Lock` interface rather than a concrete struct ("accept interfaces, return structs")
