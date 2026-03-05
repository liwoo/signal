# Chapter 16 — Query the Vault

**Act VII · NEXUS Data Vault / Geneva**

## Go Concepts

- `database/sql` package
- Database driver registration
- Parameterized queries (prepared statements)
- Row scanning (`rows.Scan`)
- Connection lifecycle (`db.Open`, `defer db.Close`)

## Story Context

Dr. Reeves has a contact in Geneva — a former NEXUS analyst who defected. She reveals that NEXUS stores operational records in a database vault. Maya must connect, query, and extract records of every scientist NEXUS has targeted. The clock is ticking — NEXUS rotates credentials every 90 seconds.

## Challenge

Write a Go program that connects to a database, executes parameterized queries, and scans results into structs.

### Starter Code

```go
package main

import (
    "database/sql"
    "fmt"
    "log"

    _ "github.com/go-sql-driver/mysql"
)

type Subject struct {
    ID       int
    Name     string
    Field    string
    Status   string
}

// Connect to the NEXUS vault database
// Query all subjects where Field = "quantum encryption"
// Print each subject's Name and Status
// Use parameterized queries (NOT string concatenation)

func main() {
    // Connection string: "nexus:vault@tcp(10.0.0.5:3306)/archive"
    // TODO: open connection
    // TODO: query with parameter
    // TODO: scan and print results
    // TODO: check for row errors
}
```

### Expected Solution (reference)

```go
package main

import (
    "database/sql"
    "fmt"
    "log"

    _ "github.com/go-sql-driver/mysql"
)

type Subject struct {
    ID     int
    Name   string
    Field  string
    Status string
}

func main() {
    db, err := sql.Open("mysql", "nexus:vault@tcp(10.0.0.5:3306)/archive")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    rows, err := db.Query("SELECT id, name, field, status FROM subjects WHERE field = ?", "quantum encryption")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    for rows.Next() {
        var s Subject
        if err := rows.Scan(&s.ID, &s.Name, &s.Field, &s.Status); err != nil {
            log.Fatal(err)
        }
        fmt.Printf("%s — %s\n", s.Name, s.Status)
    }
    if err := rows.Err(); err != nil {
        log.Fatal(err)
    }
}
```

### Acceptance Criteria

- Uses `sql.Open` with a driver name and connection string
- Uses `defer db.Close()`
- Uses parameterized query with `?` placeholder (NOT string concatenation)
- Iterates with `rows.Next()` and `rows.Scan`
- Uses `defer rows.Close()`
- Checks `rows.Err()` after iteration
- Scans into a struct with matching fields

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Database connection drops warning: "NEXUS rotates credentials every 90 seconds" |
| T+12s | Rush Mode — "Credential rotation in 45 seconds. Query fast." |

## Rush Mode

- **Duration:** 45 seconds
- **On expiry:** Jeopardy — Energy Drain (-20) + Hint Burned

## XP

- **Base:** 350 XP
- **First-try bonus:** +175 XP
- **Par time:** 120s

## Hints

1. "`db, err := sql.Open(\"mysql\", connectionString)` — open doesn't connect, it prepares. query triggers the connection." (-8 energy)
2. "NEVER use `fmt.Sprintf` to build SQL. use `db.Query(\"SELECT ... WHERE field = ?\", value)` — the `?` is a parameter." (-12 energy)
3. "`for rows.Next() { var s Subject; rows.Scan(&s.ID, &s.Name, &s.Field, &s.Status) }` — scan in order of SELECT columns." (-20 energy)

## Twist (post-completion)

The database contains a `subjects` table. Maya's name is row 47. Dr. Reeves is row 12. There are 200+ rows.

### Twist Display

- Lines:
  1. `> query returned 14 results for "quantum encryption".`
  2. `> ...`
  3. `> row 12: "Dr. Eleanor Reeves" — STATUS: ACTIVE ASSET`
  4. `> row 47: "Maya Chen" — STATUS: ACQUIRED`
  5. `> total subjects in database: 217`
  6. `> maya: ...active asset? dr. reeves?`
  7. `> dr. reeves: maya, let me explain—`
  8. `> maya: were you ever really kidnapped?`

## UI State

- **Location label:** NEXUS DATA VAULT · GENEVA
- **Concept label:** database/sql · MySQL · Prepared Statements
- **Atmosphere:** Cold, clinical. The safe house warmth is gone.
