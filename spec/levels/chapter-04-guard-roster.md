# Chapter 4 — Guard Roster

**Act II · Floors 1-3**

## Go Concepts

- Arrays
- Slices (`append`, `len`, indexing)
- Maps (`map[string]string`)
- Range

## Story Context

Dr. Reeves reveals the building holds three copies of Maya's encrypted thesis on isolated servers. Maya photographed the guard schedule. Parse it to find which floors are clear.

## Challenge

Build a map of guard names to their assigned floors, then filter to find which floors have no guards during the current window.

### Starter Code

```go
package main

import "fmt"

func main() {
    // Guard schedule: name -> floor
    // "Chen" -> "Floor 1"
    // "Alvarez" -> "Floor 2"
    // "Volkov" -> "Floor 2"
    // "Park" -> "Floor 3"
    // "Santos" -> "Floor 1"

    // 1. Create the guard map
    // 2. Find all unique floors with guards
    // 3. Print which floors (1-4) have NO guards

    // Expected output: "Floor 4 is clear"
}
```

### Acceptance Criteria

- Uses `map[string]string` for guard assignments
- Iterates with `range`
- Correctly identifies Floor 4 as the only clear floor
- Uses a slice or map to track occupied floors

## XP

- **Base:** 200 XP
- **First-try bonus:** +100 XP
- **Par time:** 120s

## Hints

1. "`map[string]string{\"Chen\": \"Floor 1\"}` — maps keys to values." (−8 energy)
2. "use `for name, floor := range guards` to loop through the map." (−12 energy)
3. "collect occupied floors in a map, then check floors 1-4 — missing ones are clear." (−20 energy)

## Timed Events

- No rush mode in this chapter (cooldown after Act I boss)

## Twist

None in this chapter — building tension for Chapter 6 reveal.

## UI State

- **Location label:** FLOOR 1-3 · SURVEILLANCE
- **Concept label:** Arrays · Slices · Maps · Range
- **GHOST introduction:** First system broadcast from GHOST appears in chat: "You have twelve hours. Then the building burns."
