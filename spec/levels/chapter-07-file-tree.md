# Chapter 7 — File Tree

**Act III · Server Room / Power Plant**

## Go Concepts

- Closures
- Recursion
- Defer
- Panic / Recover

## Story Context

Maya needs to find which server has her thesis by counting files in the building's archive directory tree. The tree is nested — recursion is the only way through. But some directories are corrupted (GHOST's doing). If Maya's code hits a corrupted directory without protection, the entire scan crashes and triggers an alarm. She needs `defer` + `recover` to gracefully handle panics from bad data.

## Challenge

Write a recursive function with a closure counter to traverse a directory tree and count total files. Use `defer` to log when each directory scan completes. Handle corrupted directories with `panic` and `recover`.

### Steps

#### Step 0: Scaffold

`package main`, `import "fmt"`, `func main()`, print "scanner ready".

#### Step 1: Recursive File Counter

Write a recursive function with a closure to traverse the directory tree and count files. Use `defer` to log directory completion.

Key teaching moment: closures capture variables from their enclosing scope. The `count` variable lives outside the recursive function but gets modified inside it. `defer` runs when the function returns — perfect for cleanup logging.

```go
var archive = map[string][]string{
    "root":    {"config.dat", "logs/", "servers/"},
    "logs":    {"access.log", "error.log"},
    "servers": {"alpha/", "beta/", "gamma/"},
    "alpha":   {"thesis_v1.enc", "readme.txt"},
    "beta":    {"backup.dat"},
    "gamma":   {"thesis_v2.enc", "thesis_v3.enc", "notes.txt"},
}

func main() {
    count := 0
    var scan func(dir string)
    scan = func(dir string) {
        defer fmt.Println("scanned:", dir)
        entries := archive[dir]
        for _, entry := range entries {
            if entry[len(entry)-1] == '/' {
                scan(entry[:len(entry)-1])
            } else {
                count++
            }
        }
    }
    scan("root")
    fmt.Println("total files:", count)
}
```

Expected output (scanned lines may vary in order due to defer):
```
scanned: logs
scanned: alpha
scanned: beta
scanned: gamma
scanned: servers
scanned: root
total files: 8
```

#### Step 2: Panic and Recover

GHOST has corrupted some directories. Add a "corrupted" directory to the archive that panics when scanned. Use `defer` + `recover` to catch the panic, log it, and continue scanning other directories.

Key teaching moment: `panic` crashes the program. `recover` (called inside a deferred function) catches the panic and returns the panic value. This is Go's "last resort" error handling — for truly exceptional situations, not normal errors. The `defer`/`recover` combo is the canonical pattern.

```go
var archive = map[string][]string{
    "root":      {"config.dat", "logs/", "servers/", "vault/"},
    "logs":      {"access.log", "error.log"},
    "servers":   {"alpha/", "beta/", "gamma/"},
    "alpha":     {"thesis_v1.enc", "readme.txt"},
    "beta":      {"backup.dat"},
    "gamma":     {"thesis_v2.enc", "thesis_v3.enc", "notes.txt"},
    "vault":     nil, // corrupted — will panic
}

func main() {
    count := 0
    errors := []string{}

    var scan func(dir string)
    scan = func(dir string) {
        defer func() {
            if r := recover(); r != nil {
                errors = append(errors, fmt.Sprintf("%s: %v", dir, r))
            }
        }()
        defer fmt.Println("scanned:", dir)

        entries := archive[dir]
        if entries == nil {
            panic("corrupted directory")
        }
        for _, entry := range entries {
            if entry[len(entry)-1] == '/' {
                scan(entry[:len(entry)-1])
            } else {
                count++
            }
        }
    }
    scan("root")
    fmt.Println("total files:", count)
    for _, e := range errors {
        fmt.Println("ERROR:", e)
    }
}
```

Expected output:
```
scanned: logs
scanned: alpha
scanned: beta
scanned: gamma
scanned: servers
scanned: vault
scanned: root
total files: 8
ERROR: vault: corrupted directory
```

The key insight: the scan continues after vault panics. Without recover, the entire program would crash. The deferred recover catches the panic, logs it, and lets the parent continue scanning.

### Acceptance Criteria

- Recursive function traverses the nested map
- Closure used to accumulate file count
- `defer` used to log directory scan completion
- Correct total: 8 files
- All directories appear in "scanned" output
- `panic` triggered on corrupted directory
- `defer` + `recover` catches the panic gracefully
- Scan continues after corrupted directory (doesn't crash)
- Error is logged, not silently swallowed

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (recursive counter):** 120 base, +60 first-try
- **Step 2 (panic/recover):** 120 base, +60 first-try
- **Par time:** 200s total

## Hints

### Step 1
1. "closures capture outer variables. `count := 0` outside, `count++` inside the function." (−5 energy)
2. "recursive: if entry ends with `/`, strip the `/` and call scan again with that directory name." (−8 energy)
3. "`defer fmt.Println(\"scanned:\", dir)` at the top of scan — it runs when the function returns." (−12 energy)

### Step 2
1. "`panic(\"message\")` crashes immediately. `recover()` inside a deferred func catches it." (−5 energy)
2. "pattern: `defer func() { if r := recover(); r != nil { /* handle */ } }()` — the `()` at the end calls it." (−8 energy)
3. "recover returns the panic value (an `interface{}`). check `r != nil` to know if a panic happened. the scan continues because each recursive call has its own defer/recover." (−12 energy)

## Timed Events

- No rush mode (Kira tension building — events are narrative, not mechanical)

## Narrative Events

| Time | Event |
| --- | --- |
| T+10s | Kira makes contact via chat: "I can help. But information costs." |
| T+30s | Dr. Reeves in chat: "Don't trust her." |
| T+60s | Kira: "Some directories are corrupted. GHOST booby-traps them. Your code needs to survive." |

## Twist

None — story beat happens at end:

Maya's scan finds `thesis_v2.enc` in the gamma directory. But the vault directory was corrupted — Kira warns that GHOST is actively destroying evidence. "Your thesis isn't safe in there. We need to copy it out before GHOST wipes the rest."

## UI State

- **Location label:** SERVER ROOM · ARCHIVE
- **Concept label:** Closures · Recursion · Defer · Panic/Recover
- **Kira's messages** appear in a distinct color (different from Maya and SYS)

## Teaching Notes

### Closures capture by reference

The `count` variable isn't passed to the scan function — it's captured from the enclosing scope. When `count++` runs inside scan, it modifies the same variable. This is powerful but requires care — closures over loop variables are a classic Go gotcha (though less so since Go 1.22).

### defer runs LIFO

Multiple defers in a function run in last-in-first-out order. In step 2, the recover defer runs before the print defer. This matters — if recover didn't run first, the print would execute during the panic unwind and the recover would never fire.

### panic/recover is NOT try/catch

This is critical framing. In most languages, you throw exceptions for any error. In Go, `panic` is reserved for truly unrecoverable situations (programmer bugs, corrupted state). Normal errors use the `(value, error)` return pattern (which players learned in ch04.2 and ch06). `recover` exists mainly for libraries that need to prevent panics from crossing API boundaries.

### The corrupted directory teaches defensive coding

The nil check (`if entries == nil { panic(...) }`) simulates what happens when external data is broken. In production Go, you'd return an error instead of panicking. But the panic here teaches the concept, and the recover shows how to build resilient systems that degrade gracefully instead of crashing entirely.
