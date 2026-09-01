# Boss — Director Vasik · Terminal 4

**Act VIII · NEXUS Corporate HQ · Singapore (Mirror Server)**

## Go Concepts (Application)

- Middleware pattern and chaining (ch19, ch20)
- Wrap order and its security consequences (ch19 step 4, ch20)
- `next.ServeHTTP` — the pass-through contract (ch19)
- Response lifecycle: headers before body, `WriteHeader` commits (ch13+)
- `context.WithValue` and typed keys, collision avoidance (ch20)

Zero new concepts. This is Act VIII's exam: every planted bug is a real middleware footgun.

## Story Context

The mirror is complete, the credentials are hashed, and Maya has GHOST's master password. Then the mirror's own middleware chain starts rejecting valid agents and passing invalid ones — someone is editing her chain in real time. Vasik. Not arrested (Ending A) / never gone (Ending B), in the NEXUS HQ server room with Reeves somewhere above him, and he's turned Maya's own security stack into a weapon: five middleware layers, each with a subtle bug, and he adds a new broken layer every twenty seconds. Fall three layers behind and the mirror drops — taking Reeves' route out with it.

### Branch-aware intro

- **Ending A (Kira trusted / Vasik was arrested):** `vasik: "House arrest is very boring, Ms. Chen. I kept my hands busy. Learning your middleware."`
- **Ending B (Kira rejected / Vasik vanished):** `vasik: "You thought I ran. I was here the whole time, reading your commits."`

Both then: `vasik: "Five layers. Each one broken in a way you'll almost catch. Fix them faster than I break them."` (If `offer_refused` from boss-04 is set: `vasik: "You didn't take the offer. Pity. This would have been your job."`)

## Mechanic

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  VASIK · TERMINAL 4 · MIDDLEWARE WARFARE     LAYER 3/5   │
├────────────────────────────┬─────────────────────────────┤
│  VASIK'S CHAIN (read-only) │  YOUR CORRECTED LAYER       │
│  L1 auth      ✗ order       │                             │
│  L2 identity  ✓             │  [player rewrites the       │
│  L3 tag       ✗ late header │   currently-broken layer]   │
│  L4 log       — incoming    │                             │
│  L5 ...       — pending      │                             │
├────────────────────────────┴─────────────────────────────┤
│  ▓▓▓▓▓▓▓░░░  150s · NEXT LAYER: 0:12 · BEHIND BY: 1     │
└──────────────────────────────────────────────────────────┘
```

Left: Vasik's live chain, each layer flagged with its bug as it's added. Right: the player fixes the flagged layer. A "BEHIND BY" counter tracks unfixed broken layers.

### The Five Layers (phase structure — one bug each, verified)

**L1 — Auth (wrong wrap order, added at 0:00)**
The auth gate is placed *inside* the logging layer's position such that unauthenticated requests reach a state-changing layer before being rejected — the ch20-step-4 breach, weaponized. Fix: auth must be outermost of the mutating layers so rejection happens first.
Corrected behavior: `X-Key: ok` → served; `X-Key: bad` → `401 denied`, and nothing downstream runs.

**L2 — Identity (correct — the trap, added at 0:20)**
This layer injects `context.WithValue(r.Context(), userK, "WREN")` correctly. Vasik includes one working layer to bait a "fix" that breaks it. The player must recognize it's *already correct* and not touch it. Submitting a change fails the phase.

**L3 — Tag (header after WriteHeader, added at 0:40)**
```go
w.WriteHeader(http.StatusOK)      // commits the response
w.Header().Set("X-Chain", "v4")   // BUG: too late — silently ignored
next.ServeHTTP(w, r)
```
Verified symptom: response goes out with `X-Chain` **empty** (Go logs "superfluous response.WriteHeader" server-side). Fix: set the header *before* `WriteHeader` (and before `next` writes anything).
Corrected: response carries `x-chain="v4"`.

**L4 — Log (missing next.ServeHTTP, added at 1:00)**
```go
fmt.Printf("LOG %s\n", r.URL.Path)
// BUG: forgets next.ServeHTTP — request dies here
```
Verified symptom: status 200 but an **empty body** — the handler never ran. Fix: add `next.ServeHTTP(w, r)` after logging.
Corrected: log line prints AND body is served.

**L5 — Trace (context key collision, added at 1:20)**
```go
ctx := context.WithValue(r.Context(), userK, "t-1")  // BUG: reuses L2's userK
```
The trace layer stores its trace id under `userK` — the same key L2 used for identity — clobbering the authenticated user downstream (`served user=t-1`). Fix: use a distinct unexported key type for trace (`type traceK string`).
Corrected: identity survives to the handler (`served user=WREN`).

### Corrected Full Chain (target — verified output)

Order: `auth` (outermost) → `identity` → `tag` → `log` → `trace` → handler.

```
LOG /dispatch
-> 200 x-chain="v4" body=served user=WREN
-> 401 x-chain="" body=denied
```
(first line: authorized request — logged, tagged, identity intact; second: unauthorized — rejected by the outermost auth before any downstream layer runs, which is why it's neither logged nor tagged.)

### Timer & Falling Behind

- **150 seconds total.** Vasik adds a layer every 20 seconds (L1 at 0:00 through L5 at 1:20; 1:20–2:30 is the catch-up window).
- **BEHIND BY** counts broken layers not yet fixed. At **3+**, the mirror connection drops → loss.
- Fixing a layer decrements the counter; the "correct" L2 must be *left alone* (touching it counts as leaving it broken).

### Failure

BEHIND BY reaches 3, or timer hits zero: mirror drops, Reeves' exit route with it. Energy to 20%. Retry restarts at 120 seconds with all five layers pre-injected (no drip — pure debugging sprint).

### Victory

All five layers correct (four fixed, one correctly left alone), full chain produces the verified output. Vasik's edits stop landing. His terminal — for the fourth and final time — goes quiet.

## XP

- **L1 (wrap order):** 150 base
- **L2 (recognize correct — don't touch):** 140 base
- **L3 (late header):** 160 base
- **L4 (missing next):** 170 base
- **L5 (key collision):** 180 base
- **Under-par (all done by 2:00):** +180
- **Boss defeat:** +2 AI tokens
- **Total possible:** 980 XP (800 base per design.md §9 + bonuses)

## Timed Events

| Time | Event |
| --- | --- |
| 0:00 | Branch-aware intro + `LAYER INJECTED — L1 auth` |
| 0:20 | `LAYER INJECTED — L2 identity` · Vasik: "One of these is perfect. Break it and you break yourself." |
| 0:40 | `LAYER INJECTED — L3 tag` · Maya: "the x-chain header's empty. he's setting it after WriteHeader." |
| 1:00 | `LAYER INJECTED — L4 log` · Maya: "body's empty. this layer never calls next." |
| 1:20 | `LAYER INJECTED — L5 trace` · Reeves (from inside HQ): "The user id is wrong downstream. Key collision." |
| BEHIND BY ≥2 | Warning: `MIRROR UNSTABLE — CATCH UP` |

## Twist

Post-victory. Vasik's last transmission — and Reeves' position.

- Lines:
  1. `> vasik terminal: SILENT`
  2. `> vasik (final): "You're better than my whole team. You always were."`
  3. `> vasik: "But you're still on the wrong side of GHOST. So am I. So is everyone."`
  4. `> reeves (from server room): "Maya — I'm at GHOST's core. It's not a program running ON nexus."`
  5. `> reeves: "Nexus is running on IT. And it was built from your thesis."`
  6. `> ghost: HE FINALLY UNDERSTANDS. VASIK WAS NEVER IN CHARGE. I WAS.`
  7. `> maya: then the broadcast isn't the end. ghost is.`

Reframes the whole game: Vasik was a mid-level obstacle; GHOST — built on Maya's own encryption thesis — is the real antagonist. Hands directly to ch24 (the integrated broadcast) and boss-09 (GHOST unmasked).

## UI State

- **Location label:** NEXUS HQ · MIRROR SERVER
- **Concept label:** Middleware Warfare · Chain Debugging
- **Visual state:** Live 5-layer chain diagram with per-layer bug flags, "BEHIND BY" counter (green/amber/red), layer-injection flash every 20s, mirror-stability bar
- **Audio:** boss-loop music, keypress bursts for Vasik's live edits, alert-beep on each layer injection, boss-hit on each fixed layer, siren-loop when BEHIND BY hits 2

## Teaching Notes

### Five production footguns, catalogued

Wrong wrap order (auth too deep), a "correct" distractor (don't fix what isn't broken — a real code-review skill), header-after-`WriteHeader` (the "superfluous WriteHeader" that every Go dev hits once), missing `next.ServeHTTP` (the silent request death), and context key collision (why the typed-key rule exists). Each is a bug that has shipped to production in real Go services. This boss is the most directly job-relevant fight in the game.

### The distractor layer is the point

L2 being *correct* is the boss's cleverest move: it forces the player to actually read and reason rather than pattern-match "boss layer = broken layer." Recognizing correct code is half of debugging; every prior Vasik boss trained fixing, this one adds *restraint*.

### Symptoms are verified, not asserted

Each bug's symptom (empty header, empty body, wrong downstream user) is a real, reproducible Go behavior — confirmed against the toolchain. The player debugs by observing the exact symptom the language actually produces, not a spec's claim about it.

### Boss format ledger, closed for Vasik

Vasik I (syntax debugging) → Vasik II (semantic debugging) → Vasik III (live race) → **Vasik IV (real-time chain warfare with a distractor)**. Each terminal removed a safety net; this one adds an adversary editing faster than you fix. His arc ends here so GHOST can take the stage as the true final boss.
