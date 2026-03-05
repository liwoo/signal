# Chapter 6 — Lock Interface

**Act II · Floors 1-3**

## Go Concepts

- Interfaces (definition, implementation)
- Errors (`error` interface, custom errors)
- Type assertions

## Story Context

Two lock types guard the server rooms: KeypadLock and BiometricLock. They share a common interface. One is broken and returns an error. Maya needs code that handles both gracefully.

## Challenge

Define a `Lock` interface with an `Unlock` method, implement it for two types, and handle errors from the broken lock.

### Starter Code

```go
package main

import (
    "errors"
    "fmt"
)

// Define Lock interface with: Unlock(code string) error

// KeypadLock: Unlock succeeds if code == "7291"
// BiometricLock: Unlock always fails with "scanner damaged"

// Try both locks and print the result

func main() {
    locks := []Lock{
        KeypadLock{},
        BiometricLock{},
    }

    for _, lock := range locks {
        err := lock.Unlock("7291")
        if err != nil {
            fmt.Println("FAILED:", err)
        } else {
            fmt.Println("UNLOCKED")
        }
    }
}
```

### Acceptance Criteria

- `Lock` interface defined with `Unlock(string) error`
- `KeypadLock` implements `Lock`, succeeds with correct code
- `BiometricLock` implements `Lock`, always returns error
- Error handling with `if err != nil`
- Output: "UNLOCKED" for keypad, "FAILED: scanner damaged" for biometric

## XP

- **Base:** 300 XP
- **First-try bonus:** +150 XP
- **Par time:** 150s

## Hints

1. "interfaces: `type Lock interface { Unlock(code string) error }`" (−8 energy)
2. "`errors.New(\"scanner damaged\")` creates a simple error value." (−12 energy)
3. "implement both: keypad checks code equality, biometric always returns error." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+15s | Rush Mode — "Biometric scanner triggering alarm" |

## Rush Mode

- **Duration:** 35 seconds
- **On expiry:** Jeopardy — Signal Scramble (3 random chars replaced with `█` every 8s)

## Twist (post-completion)

One of the guard structs from Chapter 5 has the name "K. VOLKOV". Kira. The hacker on the network is inside the building — wearing a guard uniform.

### Twist Display

- Lines:
  1. `> cross-referencing guard roster...`
  2. `> match found: K. VOLKOV — active duty, Floor 2`
  3. `> maya: wait. volkov. that's...`
  4. `> maya: kira is INSIDE the building.`
  5. `> maya: she's wearing a guard uniform.`

## UI State

- **Location label:** SERVER ROOM · FLOOR 2
- **Concept label:** Interfaces · Errors · Custom Errors
