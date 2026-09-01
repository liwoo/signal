# Boss — The Archivist

**Act VII · NEXUS Data Vault · Geneva (Deep Archive)**

## Go Concepts (Application)

- Checksums / integrity validation (byte-sum verification)
- Retry logic with bounded attempts (ch08/ch09 control flow, applied)
- Stateful request counting (structs + pointer receivers — ch05)
- Detecting and logging corruption patterns (maps, ch04)
- Defensive data access (ch11's "the wire is hostile", ch17's validation)

Zero new concepts. This is the Act VII exam: pull clean data from a channel that is actively lying to you.

## Story Context

The evidence locker is live and the extraction is underway — and the vault's automated defense wakes up. The Archivist: NEXUS's integrity-corruption daemon. It can't stop Maya reading records, so it poisons them in transit — scrambling payloads while leaving stale checksums attached, hoping she exports garbage and the whole evidence package gets thrown out in court. It starts corrupting every third response. As the export runs, it accelerates. Maya has to validate every record against its checksum, retry the poisoned ones, log the corruption pattern for the defector's testimony, and finish the pull before the Archivist corrupts faster than she can retry.

## Mechanic

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  THE ARCHIVIST · DEEP ARCHIVE PULL         WAVE 1/3      │
├────────────────────────────┬─────────────────────────────┤
│  VAULT STREAM              │  YOUR VALIDATOR             │
│  (records arriving)        │                             │
│  RECORD-001  ✓             │  func fetchValidated(...)   │
│  RECORD-002  ✓             │    checksum → retry → log   │
│  RECORD-003  ✗ CORRUPT     │                             │
│  RECORD-003  ✓ (retry)     │                             │
├────────────────────────────┴─────────────────────────────┤
│  ▓▓▓▓▓▓▓░░░  90s  ·  CORRUPTION RATE: 1-in-3 → RISING   │
└──────────────────────────────────────────────────────────┘
```

Left pane streams records with live ✓/✗ marks; corruption rate climbs across waves. Right: the validator.

### Scaffolding (given — the vault and checksum contract)

```go
type Response struct {
    Payload  string
    Checksum int
}

// Integrity: checksum is the sum of payload bytes, mod 256.
func checksum(s string) int {
    sum := 0
    for _, b := range []byte(s) {
        sum += int(b)
    }
    return sum % 256
}

// The vault is stateful: it corrupts every Nth REQUEST (not every Nth id),
// so a retry lands on a different request number and can return clean.
type Vault struct {
    reqCount     int
    corruptEvery int
}

func (v *Vault) query(id int) Response {
    v.reqCount++
    clean := fmt.Sprintf("RECORD-%03d", id)
    good := Response{Payload: clean, Checksum: checksum(clean)}
    if v.corruptEvery > 0 && v.reqCount%v.corruptEvery == 0 {
        return Response{Payload: "########", Checksum: good.Checksum} // scrambled body, stale sum
    }
    return good
}
```

The corruption signature: payload changed, checksum *not* recomputed. That mismatch is the tell.

### Wave Structure

**Wave 1 — Validate (30s, corrupt 1-in-3)**
Write `validate(r Response) bool` — recompute the checksum from the payload and compare. Pull records 1–6; corrupted responses are detectable but not yet retried (any corrupt record fails the pull). Teaches: never trust a checksum that came bundled with the data — recompute it yourself.

```go
func validate(r Response) bool {
    return checksum(r.Payload) == r.Checksum
}
```

Verified: `validate` on `RECORD-007` (checksum 131) → true; on scrambled `########` with checksum 131 → false.

**Wave 2 — Retry (30s, corrupt 1-in-3)**
Write `fetchValidated(v *Vault, id, maxRetries int) (Response, int, bool)` — query, validate, and on failure retry up to `maxRetries`. Because the vault corrupts per-request, a retry re-rolls onto a clean response.

```go
func fetchValidated(v *Vault, id, maxRetries int) (Response, int, bool) {
    for attempt := 1; attempt <= maxRetries+1; attempt++ {
        r := v.query(id)
        if validate(r) {
            return r, attempt, true
        }
    }
    return Response{}, maxRetries + 1, false
}
```

Graded pull (records 1–6, `corruptEvery: 3`, `maxRetries: 2`) — verified deterministic:
```
record 1: RECORD-001 (attempts=1 ok=true)
record 2: RECORD-002 (attempts=1 ok=true)
record 3: RECORD-003 (attempts=2 ok=true)
record 4: RECORD-004 (attempts=1 ok=true)
record 5: RECORD-005 (attempts=2 ok=true)
record 6: RECORD-006 (attempts=1 ok=true)
corruption events survived: 2
total vault requests: 8
```

**Wave 3 — Log the Pattern (30s, corrupt accelerates to 1-in-2)**
The Archivist speeds up: `corruptEvery: 2`. Retries alone aren't enough — the player must also **log** which record ids required retries, into a corruption report the defector can testify from. Extend the pull to record ids 1–8, collect the retried ids into a slice (in order), and report the count. With 1-in-2 corruption and `maxRetries: 3`, all records still resolve; the report captures the pattern.

Expected shape (report accumulates retried ids in pull order):
```
PULL COMPLETE: 8/8 records recovered
CORRUPTION REPORT: records requiring retry = [ids...]
```
(exact ids depend on the request interleaving the engine fixes in the harness; the graded value is "8/8 recovered" + a non-empty, order-stable report)

### Timer & Acceleration

- **90 seconds total.** Each **failed validation that is not retried** (a bug in the player's retry loop) costs **15 seconds** off the clock — the design.md penalty, now mechanical: a record that slips through corrupt is a real time loss.
- The corruption rate is scripted (1-in-3 → 1-in-3 → 1-in-2), shown climbing on the rate meter.

### Failure

Clock at zero, or any wave completes with an unretried corrupt record in the export: the evidence package is tainted, the pull aborts. −15 energy, retry from wave 1 at 75 seconds.

### Victory

All three waves pull clean, corruption logged. The export completes — court-admissible. The Archivist, unable to corrupt faster than Maya validates, goes dormant.

## XP

- **Wave 1 (validate):** 180 base
- **Wave 2 (retry):** 240 base
- **Wave 3 (log pattern under acceleration):** 280 base
- **Zero-taint bonus (no corrupt record ever exported):** +150
- **Boss defeat:** +2 AI tokens
- **Total possible:** 850 XP (700 base + bonuses)

## Timed Events

| Time | Event |
| --- | --- |
| 0:00 | Reeves: "The defector testifies from this data. If one record is garbage, the whole file is inadmissible." |
| 0:30 | System: `INTEGRITY DAEMON ACTIVE — CORRUPTION 1-IN-3` |
| 0:45 | Maya: "the checksums don't match the payloads. it's scrambling the body and leaving the old sum." |
| 1:00 | System: `CORRUPTION RATE RISING — 1-IN-2` |
| 1:15 | GHOST: `EVERY RECORD YOU SAVE, I ROT ANOTHER. WHO TIRES FIRST?` |
| T−15s | Warning: `EXPORT WINDOW CLOSING` |

## Twist

Post-victory. The corruption report finishes — and its pattern isn't random.

- Lines:
  1. `> export complete. 8/8 records recovered, corruption logged.`
  2. `> analyzing corruption pattern...`
  3. `> the archivist protected some records harder than others.`
  4. `> most-corrupted record: SUBJECT "REEVES, E." — 6 retries`
  5. `> maya: it fought hardest to keep us from reading HER file.`
  6. `> reeves: "...what did it not want you to see about me?"`
  7. `> system: FILE FLAG — "REEVES, E. · ACTIVE ASSET · SINGAPORE CLEARANCE"`

Escalates the ch16 "ACTIVE ASSET" bomb toward its Act VIII payoff (Reeves inside NEXUS HQ, ch21) and drives the team to Singapore.

## UI State

- **Location label:** GENEVA VAULT · DEEP ARCHIVE
- **Concept label:** The Archivist · Checksums · Retry · Corruption Log
- **Visual state:** Streaming record list with ✓/✗ marks, rising corruption-rate meter, retry counter per record, corruption report building on the side
- **Audio:** boss-loop music, terminal-beep on clean records, warning-beep on corruption, hit-confirm on successful retries, countdown-tick under 15s, dread-sting on the Reeves reveal

## Teaching Notes

### Defensive programming as a boss

Every prior boss attacked the player's *code correctness*. The Archivist attacks the player's *data*, which is the more insidious real-world failure: the program is correct and the results are still wrong. Recompute-don't-trust, retry-with-bounds, and log-the-anomaly are the three habits that separate robust data pipelines from fragile ones.

### The checksum is real and hand-verifiable

Byte-sum mod 256 is deliberately simple enough to check by hand (`RECORD-007` → 131), so the player builds genuine intuition for what integrity validation *is* before meeting real hashes (bcrypt in ch22, and conceptually, cryptographic digests). The corruption signature — changed payload, stale checksum — is exactly how a naive integrity check gets fooled, which is why the player must recompute.

### Bounded retries, not infinite loops

`maxRetries` is the lesson every junior engineer learns the hard way: a retry without a bound is a denial-of-service against yourself. The 15-second penalty for a slipped-through corrupt record makes the cost of getting the loop wrong immediate and legible.

### Boss format ledger

Combat → data waves → debugging → judgment → semantic debugging → race → route defense → **integrity defense under acceleration**. Part II's bosses are all operational; the Archivist is the "your service is up but returning bad data" incident, dramatized.
