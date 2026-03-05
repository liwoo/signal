# Chapter 7 — File Tree

**Act III · Server Room / Power Plant**

## Go Concepts

- Closures
- Recursion
- Defer

## Story Context

Maya needs to find which server has her thesis by counting files in the building's archive directory tree. The tree is nested — recursion is the only way through.

## Challenge

Write a recursive function with a closure counter to traverse a directory tree and count total files. Use `defer` to log when each directory scan completes.

### Starter Code

```go
package main

import "fmt"

// Directory tree represented as a map: directory name -> list of entries
// Entries ending in "/" are subdirectories, others are files

var archive = map[string][]string{
    "root":     {"config.dat", "logs/", "servers/"},
    "logs":     {"access.log", "error.log"},
    "servers":  {"alpha/", "beta/", "gamma/"},
    "alpha":    {"thesis_v1.enc", "readme.txt"},
    "beta":     {"backup.dat"},
    "gamma":    {"thesis_v2.enc", "thesis_v3.enc", "notes.txt"},
}

// Count all files (non-directory entries) in the tree starting from "root"
// Use a closure to track the count
// Use defer to print "scanned: <dir>" after each directory is processed

func main() {
    // Expected output: total file count = 8
    // Plus "scanned: <dir>" lines for each directory
}
```

### Acceptance Criteria

- Recursive function traverses the nested map
- Closure used to accumulate file count
- `defer` used to log directory scan completion
- Correct total: 8 files
- All 6 directories appear in "scanned" output

## XP

- **Base:** 250 XP
- **First-try bonus:** +125 XP
- **Par time:** 180s

## Hints

1. "closures capture variables from their enclosing scope. `count := 0; inc := func() { count++ }`" (−8 energy)
2. "recursive: if entry ends with `/`, strip the `/` and call the function again with that directory." (−12 energy)
3. "`defer fmt.Println(\"scanned:\", dir)` at the top of your recursive function — it runs when the function returns." (−20 energy)

## Timed Events

- No rush mode (Kira tension building — events are narrative, not mechanical)

## Narrative Events

| Time | Event |
| --- | --- |
| T+10s | Kira makes contact via chat: "I can help. But information costs." |
| T+30s | Dr. Reeves in chat: "Don't trust her." |

## UI State

- **Location label:** SERVER ROOM · ARCHIVE
- **Concept label:** Closures · Recursion · Defer
- **Kira's messages** appear in a distinct color (different from Maya and SYS)
