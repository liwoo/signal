# Chapter 16 — Query the Vault

**Act VII · NEXUS Data Vault · Geneva**

## Go Concepts

- Parameterized queries — `?` placeholders vs string concatenation (SQL injection)
- Query execution against a DB handle (`db.Query(query, args...)`)
- Row scanning into structs (the `rows.Scan` pattern)
- Column/row error handling (`strconv.Atoi` on scan, column-count checks)
- Composing query → scan → sort into one data-access function
- Aggregation with maps + sorted keys (deterministic reports)

## Story Context

Geneva. Reeves' defector contact got them a live link into the NEXUS archive vault — a MySQL database holding every operation NEXUS has ever run against academic researchers. The link is fragile: NEXUS rotates vault credentials every 90 seconds, and every malformed query trips the intrusion sensor. Maya has to pull the researcher records — cleanly, with bound parameters, because the vault's IDS flags quoted literals in query strings as tampering. One sloppy concatenated query and the session burns, the defector burns with it, and NEXUS learns exactly who is inside their archive. The extraction list Maya builds tonight is the evidence that takes NEXUS down.

## Challenge

Query the vault with `?` placeholders, scan rows into `Subject` structs, and build the sorted extraction report for every researcher NEXUS has targeted.

**Playground note:** the real vault speaks MySQL, but no driver can reach it from the dead-drop sandbox — the scaffold ships an in-memory `VaultDB` stub (fictionally: a cached vault snapshot the defector smuggled out). Its `Query` method has the same shape as `database/sql`: query string, variadic args, `?` placeholders bound as literal values. The real `database/sql` calls appear side-by-side in the Teaching Notes.

### Steps

#### Step 0: Scaffold

`package main`, imports, `func main()`, print the ready line.

Imports needed: `"fmt"`, `"sort"`, `"strconv"`, `"strings"`

The scaffold provides the **VAULT LINK** block as read-only reference code (the editor shows the snapshot data collapsed as `VAULT SNAPSHOT · 7 rows` so the records stay unread until the player's own queries surface them):

```go
// ---- VAULT LINK (provided — read-only) -----------------------------
// In-memory stand-in for *sql.DB. The real vault speaks MySQL; this
// snapshot speaks just enough SQL for tonight's job.

type Row []string // column order: id, name, field, status

type VaultDB struct {
	rows []Row
}

// Query supports exactly one shape:
//   SELECT id, name, field, status FROM subjects WHERE <column> = ?
// Each ? consumes one arg. Args are bound as literal VALUES — they can
// never change the meaning of the query. That is the entire point.
func (db *VaultDB) Query(query string, args ...string) ([]Row, error) {
	if strings.Count(query, "?") != len(args) {
		return nil, fmt.Errorf("vault: %d placeholders, %d args", strings.Count(query, "?"), len(args))
	}
	prefix := "SELECT id, name, field, status FROM subjects WHERE "
	if !strings.HasPrefix(query, prefix) {
		return nil, fmt.Errorf("vault: unsupported query shape")
	}
	clause := strings.TrimSpace(query[len(prefix):])
	parts := strings.SplitN(clause, "=", 2)
	if len(parts) != 2 || strings.TrimSpace(parts[1]) != "?" {
		return nil, fmt.Errorf("vault: WHERE must bind a ? placeholder")
	}
	col := strings.TrimSpace(parts[0])
	idx := map[string]int{"id": 0, "name": 1, "field": 2, "status": 3}
	i, ok := idx[col]
	if !ok {
		return nil, fmt.Errorf("vault: unknown column %q", col)
	}
	var out []Row
	for _, r := range db.rows {
		if r[i] == args[0] {
			out = append(out, r)
		}
	}
	return out, nil
}

// QueryRaw evaluates quoted literals the naive way — the way injection
// happens. It exists only for the step-1 demonstration. Never use it.
func (db *VaultDB) QueryRaw(query string) []Row {
	if strings.Contains(query, "' OR '1'='1") {
		return db.rows // tautology: true for every row. the table dumps.
	}
	start := strings.Index(query, "'")
	end := strings.LastIndex(query, "'")
	if start < 0 || end <= start {
		return nil
	}
	val := query[start+1 : end]
	var out []Row
	for _, r := range db.rows {
		if r[2] == val {
			out = append(out, r)
		}
	}
	return out
}

func openVault() *VaultDB {
	return &VaultDB{rows: []Row{
		{"12", "Dr. Eleanor Reeves", "quantum encryption", "ACTIVE ASSET"},
		{"31", "Prof. Amara Okafor", "quantum encryption", "APPROACHED"},
		{"47", "Maya Chen", "quantum encryption", "ACQUIRED"},
		{"58", "Dr. Yusuf Rahman", "cryptography", "ACQUIRED"},
		{"63", "Dr. Lena Petrov", "cryptography", "ACQUIRED"},
		{"71", "Dr. Ken Tanaka", "neural networks", "MONITORING"},
		{"84", "Prof. Ines Duarte", "quantum encryption", "ACQUIRED"},
	}}
}
```

Player writes:

```go
func main() {
	fmt.Println("vault link ready")
}
```

Expected output:
```
vault link ready
```

#### Step 1: Bind, Never Concatenate

Write `func findByField(db *VaultDB, field string) ([]Row, error)` that queries the `subjects` table with a `?` placeholder for the field value.

Key teaching moment: a `?` placeholder keeps *data* out of the *query*. The query string is fixed at compile time; the value travels separately and is bound as a literal. Whatever an attacker types — quotes, `OR` clauses, whole statements — it can only ever be compared as a field value, never executed as SQL. String concatenation (`"... WHERE field = '" + input + "'"`) merges data into code, and one well-placed quote rewrites the query. The harness runs both against the same hostile input so the difference is visible in the row counts.

```go
func findByField(db *VaultDB, field string) ([]Row, error) {
	return db.Query("SELECT id, name, field, status FROM subjects WHERE field = ?", field)
}
```

Test harness:
```go
func main() {
	db := openVault()

	rows, err := findByField(db, "cryptography")
	if err != nil {
		fmt.Println("error:", err)
		return
	}
	fmt.Println("bound query:", len(rows), "rows")

	// the exact string an attacker would submit:
	hostile := "cryptography' OR '1'='1"
	rows, err = findByField(db, hostile)
	if err != nil {
		fmt.Println("error:", err)
		return
	}
	fmt.Println("bound hostile:", len(rows), "rows")

	// what concatenation would have done with the same input:
	leaked := db.QueryRaw("SELECT id, name, field, status FROM subjects WHERE field = '" + hostile + "'")
	fmt.Println("concatenated hostile:", len(leaked), "rows")
}
```

Expected output:
```
bound query: 2 rows
bound hostile: 0 rows
concatenated hostile: 7 rows
```

The bound version treats the attack string as a (nonexistent) field name — zero rows. The concatenated version dumps all seven. Same input, one changed byte of discipline.

#### Step 2: Scan Rows into Structs

Define the `Subject` struct and write `func scanSubjects(rows []Row) ([]Subject, error)` that converts raw rows into typed structs — the hand-rolled equivalent of `rows.Scan(&s.ID, &s.Name, ...)`.

Key teaching moment: the database hands back untyped column data; scanning is where types are enforced and where corruption surfaces. Check the column count, convert `id` with `strconv.Atoi` (the same two-value error pattern from ch04.2), and fail loudly on the first bad row — a silent partial scan is how bad data walks into a report.

```go
type Subject struct {
	ID     int
	Name   string
	Field  string
	Status string
}

func scanSubjects(rows []Row) ([]Subject, error) {
	subjects := make([]Subject, 0, len(rows))
	for _, r := range rows {
		if len(r) != 4 {
			return nil, fmt.Errorf("scan: want 4 columns, got %d", len(r))
		}
		id, err := strconv.Atoi(r[0])
		if err != nil {
			return nil, fmt.Errorf("scan: bad id %q", r[0])
		}
		subjects = append(subjects, Subject{ID: id, Name: r[1], Field: r[2], Status: r[3]})
	}
	return subjects, nil
}
```

Test harness:
```go
func main() {
	db := openVault()
	rows, _ := findByField(db, "cryptography")
	subjects, err := scanSubjects(rows)
	if err != nil {
		fmt.Println("error:", err)
		return
	}
	for _, s := range subjects {
		fmt.Printf("#%d %s [%s] %s\n", s.ID, s.Name, s.Field, s.Status)
	}
	_, err = scanSubjects([]Row{{"corrupt", "??", "??", "??"}})
	fmt.Println("corrupt row:", err)
}
```

Expected output:
```
#58 Dr. Yusuf Rahman [cryptography] ACQUIRED
#63 Dr. Lena Petrov [cryptography] ACQUIRED
corrupt row: scan: bad id "corrupt"
```

#### Step 3: The Data-Access Function

Write `func queryTargets(db *VaultDB, field string) ([]Subject, error)` — query with `findByField`, scan with `scanSubjects`, sort by `ID` ascending, propagate any error.

Key teaching moment: this is the shape of every data-access layer in production Go — one function per question the code asks the database, returning typed structs, with errors flowing up instead of being logged and swallowed. Sorting before returning makes output deterministic: never let storage order leak into behavior. `sort.Slice` with an ID comparator is the ch04.3 pattern on a struct field.

```go
func queryTargets(db *VaultDB, field string) ([]Subject, error) {
	rows, err := findByField(db, field)
	if err != nil {
		return nil, err
	}
	subjects, err := scanSubjects(rows)
	if err != nil {
		return nil, err
	}
	sort.Slice(subjects, func(i, j int) bool { return subjects[i].ID < subjects[j].ID })
	return subjects, nil
}
```

Test harness:
```go
func main() {
	db := openVault()
	targets, err := queryTargets(db, "neural networks")
	if err != nil {
		fmt.Println("error:", err)
		return
	}
	for _, s := range targets {
		fmt.Printf("#%d %s [%s] %s\n", s.ID, s.Name, s.Field, s.Status)
	}
	ghost, err := queryTargets(db, "ghost studies")
	if err != nil {
		fmt.Println("error:", err)
		return
	}
	fmt.Println("ghost studies:", len(ghost), "records")
}
```

Expected output:
```
#71 Dr. Ken Tanaka [neural networks] MONITORING
ghost studies: 0 records
```

An empty result is not an error — it's an answer. `database/sql` makes the same distinction (`sql.ErrNoRows` exists only for single-row queries).

#### Step 4: The Extraction Report

Write `func statusSummary(subjects []Subject) []string` that counts subjects per status and returns `"STATUS: count"` lines sorted alphabetically by status. The harness runs the full extraction: every researcher in `quantum encryption` — Maya's own field.

Key teaching moment: aggregating with a `map[string]int` is one range loop, but map iteration order is random in Go — *by design*. Any report built from a map must collect the keys, `sort.Strings` them, then emit. Randomized output in an evidence file is worthless in court; deterministic output is a correctness requirement, not a style choice.

```go
func statusSummary(subjects []Subject) []string {
	counts := map[string]int{}
	for _, s := range subjects {
		counts[s.Status]++
	}
	keys := make([]string, 0, len(counts))
	for k := range counts {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	lines := make([]string, 0, len(keys))
	for _, k := range keys {
		lines = append(lines, fmt.Sprintf("%s: %d", k, counts[k]))
	}
	return lines
}
```

Test harness:
```go
func main() {
	db := openVault()
	subjects, err := queryTargets(db, "quantum encryption")
	if err != nil {
		fmt.Println("error:", err)
		return
	}
	fmt.Println("EXTRACTION — quantum encryption:", len(subjects), "records")
	for _, s := range subjects {
		fmt.Printf("#%d %s — %s\n", s.ID, s.Name, s.Status)
	}
	for _, line := range statusSummary(subjects) {
		fmt.Println(line)
	}
}
```

Expected output:
```
EXTRACTION — quantum encryption: 4 records
#12 Dr. Eleanor Reeves — ACTIVE ASSET
#31 Prof. Amara Okafor — APPROACHED
#47 Maya Chen — ACQUIRED
#84 Prof. Ines Duarte — ACQUIRED
ACQUIRED: 2
ACTIVE ASSET: 1
APPROACHED: 1
```

Maya's own program prints row 12. `Dr. Eleanor Reeves — ACTIVE ASSET`. Not ACQUIRED like the victims. Not MONITORING like the watched. *Active asset.* The player types the code that finds it.

### Acceptance Criteria

- `findByField` passes the value as a `db.Query` arg with a `?` placeholder — **any solution that concatenates or `fmt.Sprintf`s the field value into the query string is rejected**, even if output matches
- `scanSubjects` checks column count and uses `strconv.Atoi` with the error handled (no `_` on the error)
- `Subject` struct has `ID int` (typed, not string)
- `queryTargets` composes `findByField` + `scanSubjects` (no re-implemented query logic) and sorts with `sort.Slice` by `ID`
- Errors are returned up the chain (`return nil, err`), never printed inside the data-access functions
- `statusSummary` collects map keys and sorts them before emitting (no direct `for k, v := range counts` print)
- Empty result set returns an empty slice + nil error, not an error

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (findByField):** 90 base, +45 first-try
- **Step 2 (scanSubjects):** 100 base, +50 first-try
- **Step 3 (queryTargets):** 110 base, +55 first-try
- **Step 4 (extraction report):** 120 base, +60 first-try
- **Total base:** 460
- **Level timer:** 500s, gameOverOnExpiry: **true** — at zero, the vault session is traced to the defector's terminal
- **Par time:** 230s total

## Hints

### Step 1
1. "the query string stays constant. the value rides separately: `db.Query(\"... WHERE field = ?\", field)`" (−5 energy)
2. "never build SQL with `+` or Sprintf. the `?` is not string substitution — the vault binds it as a pure value." (−8 energy)
3. "one line: return `db.Query` with the full SELECT shape from the stub's comment, and `field` as the second argument." (−12 energy)

### Step 2
1. "raw rows are `[]string`. your job is turning `r[0]` into an `int` — you know the function from the relay headers." (−5 energy)
2. "guard first: wrong column count → error. then `strconv.Atoi(r[0])` — and check that err, don't blank it." (−8 energy)
3. "on any bad row return `nil, fmt.Errorf(...)` immediately. partial data that looks whole is worse than no data." (−12 energy)

### Step 3
1. "you already wrote both halves. this function is just query → scan → sort, errors passed up." (−8 energy)
2. "`if err != nil { return nil, err }` after each call. the caller decides what an error means, not this layer." (−12 energy)
3. "`sort.Slice(subjects, func(i, j int) bool { ... })` — compare the `ID` fields. same comparator shape as the signal sort." (−20 energy)

### Step 4
1. "count with `map[string]int`, one range loop, `counts[s.Status]++`." (−8 energy)
2. "map iteration order is randomized on purpose. pull the keys into a slice first." (−12 energy)
3. "keys slice → `sort.Strings` → range keys → `fmt.Sprintf(\"%s: %d\", k, counts[k])`. deterministic or it's not evidence." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+15s | Maya message: "the defector's snapshot is live. same query shape as the real vault — placeholders only, the IDS reads every string we send." |
| T+60s | Reeves message: "The credentials rotate every ninety seconds, Maya. Assume every window is your last." |
| T+120s | Rush Mode — "CREDENTIAL ROTATION IN 50 SECONDS" |
| T+200s | System message: "VAULT IDS: QUERY PATTERN AUDIT IN PROGRESS — 0 ANOMALIES" |
| T+260s | GHOST broadcast: "SOMEONE IS READING MY ARCHIVE. HOW NOSTALGIC." |
| T+300s | Rush Mode — "SECOND ROTATION — 45 SECONDS. LAST CLEAN WINDOW." |
| T+380s | Maya message: "217 subject rows in the snapshot index. how long has this been running?" |
| T+440s | System message: "SESSION TRACE PROGRESS: 71% — FINISH THE EXTRACTION" |

## Rush Mode

- **Rush 1 (T+120s):** 50 seconds. Speed bonus up to +80 XP. On expiry: Jeopardy — Signal Scramble (credential rotation mid-query garbles the editor's syntax highlighting for 8s; the vault link visibly re-handshakes)
- **Rush 2 (T+300s):** 45 seconds. Speed bonus up to +90 XP. On expiry: Jeopardy — Energy Drain (−20 energy; the defector has to burn a backup credential set to keep the session alive)

## Twist

The extraction report is complete — and the player's own step-4 output already printed the line. The chat goes quiet, then the terminal detonates it:

### Twist Display

> `> extraction complete: 4 records · quantum encryption`
> `> cross-referencing subject index...`
> `> row 47: MAYA CHEN — STATUS: ACQUIRED — asset value: PRIMARY`
> `> row 12: DR. ELEANOR REEVES — STATUS: ACTIVE ASSET — placement date: 26 months ago`
> `> maya: 26 months. we met 26 months ago.`
> `> maya: were you ever actually kidnapped?`
> `> reeves: maya. let me explain—`

(types at 22ms/char)

## UI State

- **Location label:** NEXUS DATA VAULT · GENEVA
- **Concept label:** database/sql · Placeholders · Row Scanning
- **Visual state:** Cold blue-white vault terminal skin — the safe-house warmth is gone. Left rail shows VAULT LINK status (LIVE / ROTATING / TRACED) and a 90s credential-rotation ring that resets on each rotation. Query results render as a table overlay as harness output arrives.
- **Audio:** dark-drone-2 ambience, keypad-beep on query submit, warning-beep on rotation events, dread-sting on the twist display

## Teaching Notes

### The stub is the lesson, not a compromise

The playground can't reach a MySQL server, so the chapter grades against `VaultDB` — but the skills are exactly `database/sql` skills: fixed query string + variadic args, untyped rows scanned into structs, errors at every layer. For reference, the real version of steps 1–3 (show as read-only in the level library):

```go
db, err := sql.Open("mysql", "user:pass@tcp(10.0.0.5:3306)/archive")
if err != nil { log.Fatal(err) }
defer db.Close()

rows, err := db.Query("SELECT id, name, field, status FROM subjects WHERE field = ?", field)
if err != nil { return nil, err }
defer rows.Close()

var subjects []Subject
for rows.Next() {
	var s Subject
	if err := rows.Scan(&s.ID, &s.Name, &s.Field, &s.Status); err != nil {
		return nil, err
	}
	subjects = append(subjects, s)
}
return subjects, rows.Err()
```

Every line maps 1:1 onto what the player wrote: `db.Query` ↔ `findByField`, the `rows.Next()/Scan` loop ↔ `scanSubjects`, `rows.Err()` ↔ the propagated error. Note for mentors: `sql.Open` validates arguments but doesn't connect — the first query does.

### Injection is taught by demonstration, not sermon

Step 1's harness runs the *same hostile string* through both paths and prints 0 rows vs 7 rows. That contrast is the entire OWASP SQL-injection lesson in three lines of output. The acceptance criteria enforce it structurally: a concatenated solution fails even when its output matches, because the graded pattern is the placeholder, not the stdout. This plants the seed for ch17, where Maya defends her own form input, and pays off the ch14/boss-06 thread of hostile input arriving over HTTP.

### Composition callback

`queryTargets` composing `findByField` + `scanSubjects` is the ch03 pattern (sumCodes inside validateCode) and the ch04.2 pattern (reverseWord inside encode) promoted to an architecture lesson: the data-access layer. Zen rules should reward returning errors upward, `sort.Slice` on the ID field, and pre-sized slices (`make([]Subject, 0, len(rows))`).

### Common mistakes

- `fmt.Sprintf("... WHERE field = '%s'", field)` — compiles, matches output on friendly input, and is exactly the vulnerability. The pattern check must catch it.
- Blanking the `Atoi` error (`id, _ :=`) — the corrupt-row harness case exists to fail this.
- Printing inside `queryTargets` instead of returning data — mixing I/O into the data layer.
- Ranging the counts map directly in step 4 — passes sometimes, fails randomly. If a player hits the flaky failure, that *is* the lesson; Maya's hint 2 names it.

### Why the twist lands here

The Reeves reveal is Part II's biggest trust fracture, and it arrives through the player's own deterministic report — row 12 sits in the middle of output they generated, sorted by the comparator they wrote. The game never announces it early: the snapshot data is collapsed in the editor, and no timed event names Reeves. The code finds her. That's the chapter's thesis: queries don't have opinions.
