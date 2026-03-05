# Boss — The Archivist

**Act VII Boss · NEXUS Data Vault / Geneva**

## Go Concepts (Applied)

- Database queries with validation
- Retry logic
- Checksum/integrity verification
- Error handling under pressure

## Story Context

The vault's automated defense system — The Archivist — activates. It detects Maya's queries and begins corrupting responses. Every third query returns garbage data. Maya must write a validation layer that detects corrupted responses, retries clean queries, and extracts the critical record before the vault self-destructs.

## Mechanic

### Layout

```
+------------------------------------------------------+
|           THE ARCHIVIST · 01:28                      |
+----------------------------+-------------------------+
| QUERY LOG                  | YOUR VALIDATOR          |
|                            |                         |
| Q1: SELECT * FROM ops...  | func validateResult(    |
|   -> [CLEAN] 3 rows       |   rows []Row,           |
| Q2: SELECT * FROM subj... |   checksum string,      |
|   -> [CLEAN] 5 rows       | ) ([]Row, error) {      |
| Q3: SELECT * FROM keys... |   // TODO               |
|   -> [CORRUPT] ████████   | }                       |
| Q4: SELECT * FROM ops...  |                         |
|   -> [CLEAN] 2 rows       | func queryWithRetry(    |
| Q5: SELECT * FROM proj... |   db *sql.DB,           |
|   -> [CLEAN] 7 rows       |   query string,         |
| Q6: SELECT * FROM subj... |   maxRetries int,       |
|   -> [CORRUPT] ████████   | ) ([]Row, error) {      |
|                            |   // TODO               |
+----------------------------+-------------------------+
| VALID EXTRACTIONS: 4/8   | CORRUPTION RATE: 33%    |
+------------------------------------------------------+
```

### Corruption Detection

Each query response includes a checksum. Corrupted responses have a mismatched checksum. The player must:

1. Compute a checksum of the response data
2. Compare against the provided checksum
3. If mismatch: retry the query (up to 3 retries)
4. Log the corruption pattern

### Escalation

| Phase | Time | Corruption Rate |
| --- | --- | --- |
| Phase 1 | 0-30s | Every 3rd query corrupted |
| Phase 2 | 30-60s | Every 2nd query corrupted |
| Phase 3 | 60-90s | Random — 60% corruption rate |

### Target

Extract 8 valid query results before the timer expires.

### Timer

- **Duration:** 90 seconds
- **Each failed validation (accepted corrupt data):** -15 seconds
- **Each successful retry:** +5 seconds bonus

### Win Condition

8 valid extractions. The critical record (PANOPTICON launch codes) is in the final extraction.

### Loss Condition

Timer expires with < 8 valid extractions. Energy drops to 15%. Replay with 75s timer.

## XP

- **Base:** 700 XP
- **Under par (45s):** +350 XP
- **AI tokens earned:** +2

## Mobile Layout

- Query log as scrolling feed at top (25%)
- Editor takes bottom 75%
- Corruption rate shown as a percentage badge

## UI State

- **Location label:** NEXUS VAULT · ARCHIVIST ACTIVE
- **No chat panel** — pure focus
- **Visual:** Corrupt queries flash with glitch effect (CSS `clip-path` distortion)
- **Audio concept:** Digital corruption noise on each corrupt response
