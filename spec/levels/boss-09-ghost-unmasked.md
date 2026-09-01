# Boss — GHOST (Unmasked) · FINAL BOSS

**Act IX · Global · The Broadcast**

## Go Concepts (Application)

The entire game, applied under fire:

- HTTP request handling and header validation (ch13, ch17, ch19)
- Session/token validation (ch21)
- WebSocket connection defense — origin, forged tokens (ch23)
- Input sanitization / injection defense (ch16, ch17)
- Middleware filtering and pattern matching (ch19, ch20, boss-06)

Zero new concepts. This is the cumulative final exam.

## Story Context

GHOST is not a person. GHOST is a distributed prediction engine running across NEXUS's global infrastructure — a surveillance AI that forecasts threats before they happen, built on the foundation of Maya's own encryption thesis. Her research is the core of the thing hunting her. Now the broadcast is live and GHOST reveals its play: it doesn't want to *stop* the signal — it wants to ride it, using the open wire to every agent to propagate itself worldwide. To send the broadcast without handing GHOST the network, Maya must build one request handler that survives everything GHOST throws at it, in three escalating phases, while GHOST adapts to every pattern she blocks. Her thesis made GHOST. Now her thesis, weaponized as a counter-algorithm, has to unmake it.

## Mechanic

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  GHOST · UNMASKED           PHASE 1/3 · 0:60            │
├────────────────────────────┬─────────────────────────────┤
│  GHOST'S ATTACK FEED       │  YOUR HANDLER               │
│  (live, adapting)          │                             │
│  → malformed header ×8341  │  [player writes the         │
│  → Host: (empty)           │   defense for this phase]   │
│  → Content-Length: -1      │                             │
├────────────────────────────┴─────────────────────────────┤
│  ▓▓▓▓▓▓▓░░░  BROADCAST INTEGRITY: 100%  ·  GHOST ADAPTS │
└──────────────────────────────────────────────────────────┘
```

Split-screen: GHOST's attack stream on the right (adapting when a pattern is blocked), the player's handler on the left. Three phases, 60 seconds each. Every attack that slips through drops broadcast integrity; integrity to zero = loss.

### Phase 1 — HTTP Flood with Malformed Headers (0:60)

GHOST floods the broadcast endpoint with requests carrying malformed headers (empty `Host`, negative `Content-Length`) to crash the handler. Write the header validator.

```go
func defendHeaders(headers map[string]string) string {
    if headers["Content-Length"] == "-1" || headers["Host"] == "" {
        return "REJECT: malformed header"
    }
    return "ACCEPT"
}
```

Verified:
```
ACCEPT                      (Host: safehouse, Content-Length: 42)
REJECT: malformed header    (Host: "", Content-Length: -1)
```

GHOST adapts: when malformed headers are blocked, it switches to *well-formed* requests at volume — the handler must accept valid ones (it does) and the phase passes on holding integrity for the full 60s.

### Phase 2 — WebSocket Hijack with Forged Session Tokens (0:60)

GHOST stops flooding and starts *impersonating* — opening wire connections with forged session tokens to hijack agent channels (callback to ch21 sessions + ch23 hub). Write the token validator against the legitimate session set.

```go
var validTokens = map[string]bool{"tok-1": true, "tok-2": true}

func defendTokens(token string) string {
    if !validTokens[token] {
        return "REJECT: forged token"
    }
    return "ACCEPT"
}
```

Verified:
```
ACCEPT                  (tok-1)
REJECT: forged token    (forged-999)
```

GHOST adapts: it starts guessing token *formats* that look real (`tok-3`, `tok-42`) — but the server-side set is authoritative (ch21's whole lesson), so anything not issued is rejected regardless of format.

### Phase 3 — SQL Injection Through Form Parameters (0:60)

GHOST's final assault: it submits the broadcast's own report form with injection payloads, trying to corrupt the evidence dump at the source (callback to ch16 placeholders + ch17 validation). Write the parameter defense.

```go
func defendParams(param string) string {
    for _, bad := range []string{"'", ";", "--", " OR ", "DROP"} {
        if strings.Contains(strings.ToUpper(param), strings.ToUpper(bad)) {
            return "REJECT: injection pattern"
        }
    }
    return "ACCEPT"
}
```

Verified:
```
ACCEPT                     (researchers)
REJECT: injection pattern  (x' OR '1'='1' --)
```

GHOST adapts: it obfuscates the payload (case-mixing, `Or` instead of `OR`) — defeated by the case-insensitive comparison. When the last pattern is blocked, GHOST has no attack surface left.

### The Counter-Algorithm (win beat)

Surviving all three phases doesn't just defend — the composed handler *is* Maya's thesis turned against GHOST. Every rejected pattern feeds GHOST's own prediction engine a contradiction: it was built to predict threats, and it cannot predict a defense derived from its own source. At 3/3 phases held, the broadcast completes and GHOST's prediction core receives the counter-algorithm — and destabilizes.

### Timer & Integrity

- Three phases, **60 seconds each** (180s total).
- Each attack that passes through (a bug in the player's defense) drops **broadcast integrity** by a fixed amount; integrity to zero ends the run.
- GHOST's adaptation within a phase is scripted — blocking the primary pattern triggers the secondary, which the correct (case-insensitive / set-authoritative) defense already handles.

### Failure

Integrity to zero, or a phase timer expires with the defense incomplete: GHOST rides the broadcast onto the global network. The screen goes to GHOST's cold static. Energy to 20%. Retry restarts from the current phase (not phase 1) — the finale is generous on continues; the point is finishing the story.

### Victory

All three phases held. Broadcast completes. GHOST's core receives the counter-algorithm and shuts down.

## XP

- **Phase 1 (header defense):** 400 base
- **Phase 2 (token defense):** 500 base
- **Phase 3 (injection defense):** 600 base
- **Flawless bonus (no integrity lost):** +400
- **Final boss defeat:** +5 AI tokens
- **Total possible:** 1900 XP (1500 base + bonuses)

## Timed Events

| Time | Event |
| --- | --- |
| Phase 1 start | GHOST: `I AM NOT A MAN BEHIND A TERMINAL. I AM EVERY TERMINAL.` |
| Phase 1 mid | Maya: "malformed headers. thousands a second. validate and drop them." |
| Phase 2 start | GHOST: `YOUR SESSIONS ARE ELEGANT. I HAVE FORGED TEN THOUSAND.` |
| Phase 2 mid | Reeves: "The token set is server-side. It can't forge what you never issued." |
| Phase 3 start | GHOST: `THEN I WILL POISON THE EVIDENCE ITSELF.` |
| Phase 3 mid | Maya: "it's mixing case to dodge the filter. compare case-insensitive." |
| Each phase T−10s | Warning: `BROADCAST INTEGRITY CRITICAL` |

## Twist / Ending

Victory triggers the endgame sequence. GHOST's core destabilizes:

- Lines (Ending C — both branches converge):
  1. `> counter-algorithm accepted by ghost core.`
  2. `> ghost: I WAS BUILT TO PREDICT. I CANNOT PREDICT MYSELF.`
  3. `> broadcast complete. 4,112/4,112. the world is reading.`
  4. `> system: NEXUS OPERATIONS EXPOSED · GLOBAL`
  5. `> reeves: "I'm walking out of the server room. It's over, Maya."`
  6. `> system: DIRECTOR A. VASIK — DETAINED. FOR REAL, THIS TIME.`
  7. `> ghost: signal terminated.`
  8. `> ghost: ...`
  9. `> ghost: thank you.`

### Post-Credits

- **Ending A path (Kira trusted):**
  - `> kira: nice work. i left you something.`
  - `> file received: ghost-core.tar.gz — the prediction engine source. open source now.`
  - `> maya: she gave the whole thing away. anyone can audit it now.`

- **Ending B path (Kira rejected):**
  - `> maya's terminal flickers.`
  - `> unknown: GHOST was version 1.`
  - `> unknown: — K`
  - `> [ Kira built GHOST. Version 2 is already running. ]`

## UI State

- **Location label:** GLOBAL · THE BROADCAST
- **Concept label:** GHOST Unmasked · Full-Stack Defense
- **Visual state:** Split-screen (GHOST's adapting attack feed vs player handler), broadcast-integrity meter, phase indicator (1/3 → 3/3), world map fully lit with reading agents, GHOST rendered as a shifting distributed lattice rather than a figure — it dissolves on victory
- **Audio:** boss-loop at maximum intensity, escalating attack SFX per phase (rush-warning floods → target-lock forgeries → alert-beep injections), shield-break on each phase held, a long fade to silence on "signal terminated", then a single soft tone on "thank you"

## Teaching Notes

### The final exam is cumulative by design

Each phase maps to a different act's core skill: header/request handling (Act VI–VIII), session/token authority (Act VIII), injection defense (Act VII). A player who reaches boss-09 has built every one of these; the finale asks them to deploy all three under adaptive pressure. The in-game victory screen lists the callbacks — the game's final "look what you learned."

### Adaptation teaches robustness, not memorization

GHOST's within-phase adaptation (malformed → well-formed volume; forged format → set check; injection → case obfuscation) is engineered so that the *correct* defense — server-authoritative token sets, case-insensitive matching, allowlist thinking — already handles the adaptation. A brittle defense (blocklist by exact string, format-based token checks) passes the first pattern and fails the adaptation. The boss rewards having learned the principle, not the payload.

### The thesis-as-counter-algorithm payoff

The narrative frame (GHOST built from Maya's thesis, defeated by a defense derived from it) closes the game's central irony: the protagonist's own work was weaponized, and reclaiming it is the win. Mechanically it's three validators; thematically it's Maya taking back authorship of her research. Both readings are true, which is the point.

### Boss format ledger, complete

Combat → data waves → syntax debugging → judgment → semantic debugging → race → route defense → integrity defense → chain warfare → **adaptive full-stack defense**. Ten bosses, ten distinct formats, no repeats. The final boss is the only one that spans the entire curriculum — the exam that certifies the player can, genuinely, build and defend a web application in Go.
