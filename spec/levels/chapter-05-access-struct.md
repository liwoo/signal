# Chapter 5 — Access Struct

**Act II · Floors 1-3**

## Go Concepts

- Structs (definition, instantiation)
- Methods (value receivers, pointer receivers)
- Pointers (basic)

## Story Context

Model the building's security personnel as structs to predict patrol windows. Each guard has a name, floor, shift start, and shift duration. Methods calculate when their patrol ends.

## Challenge

Define a `Guard` struct with methods to determine patrol window and whether a guard is currently on duty.

### Starter Code

```go
package main

import "fmt"

// Define a Guard struct with:
// Name (string), Floor (int), ShiftStart (int, hour 0-23), ShiftHours (int)

// Method: EndHour() returns the hour the shift ends (mod 24)
// Method: IsOnDuty(currentHour int) returns bool

func main() {
    guards := []Guard{
        {Name: "Chen", Floor: 1, ShiftStart: 8, ShiftHours: 6},
        {Name: "Alvarez", Floor: 2, ShiftStart: 14, ShiftHours: 8},
        {Name: "Park", Floor: 3, ShiftStart: 22, ShiftHours: 6},
    }

    currentHour := 20
    for _, g := range guards {
        fmt.Printf("%s (Floor %d): ends at %d, on duty: %t\n",
            g.Name, g.Floor, g.EndHour(), g.IsOnDuty(currentHour))
    }
}
```

### Acceptance Criteria

- `Guard` struct has at least Name, Floor, ShiftStart, ShiftHours fields
- `EndHour()` method correctly handles mod 24 (wrapping past midnight)
- `IsOnDuty()` correctly handles overnight shifts (e.g., 22:00 - 04:00)
- Output shows correct on-duty status for hour 20

## XP

- **Base:** 250 XP
- **First-try bonus:** +125 XP
- **Par time:** 150s

## Hints

1. "structs: `type Guard struct { Name string; Floor int; ... }`" (−8 energy)
2. "methods: `func (g Guard) EndHour() int { return (g.ShiftStart + g.ShiftHours) % 24 }`" (−12 energy)
3. "overnight shifts: if end < start, the guard is on duty when `hour >= start || hour < end`." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+25s | Rush Mode — "Guard shift change in 30 seconds" |

## Rush Mode

- **Duration:** 30 seconds
- **On expiry:** Jeopardy — Hint Burned (one hint randomly consumed)

## UI State

- **Location label:** FLOOR 1-3 · PATROL ANALYSIS
- **Concept label:** Structs · Methods · Pointers
