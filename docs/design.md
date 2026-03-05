# SIGNAL — Game Design Document

### A Browser-Based Go Programming Escape Thriller

**Version 1.0 · Confidential**

---

## Table of Contents

1. [Vision & Pillars](#1-vision--pillars)
2. [The Story — Full Plot](#2-the-story--full-plot)
3. [Jeopardy System — Stakes & Consequences](#3-jeopardy-system--stakes--consequences)
4. [Boss Encounters](#4-boss-encounters)
5. [Core Mechanics](#5-core-mechanics)
6. [The Editor — Vim Mode & Syntax Highlighting](#6-the-editor--vim-mode--syntax-highlighting)
7. [Economy — Energy, Tokens & the Black Market](#7-economy--energy-tokens--the-black-market)
8. [Maya's Chat — On-Device AI Architecture](#8-mayas-chat--on-device-ai-architecture)
9. [Act Structure & Curriculum Map](#9-act-structure--curriculum-map)
10. [Mobile Design](#10-mobile-design)
11. [UI/UX Reference](#11-uiux-reference)
12. [Technical Architecture](#12-technical-architecture)

---

## 1. Vision & Pillars

> _"Learn Go by keeping someone alive."_

**SIGNAL** is a narrative-driven, browser-based coding game where the player is a Go programmer contacted by Maya Chen — a kidnapped CS grad student — through an encrypted terminal. Each room she escapes teaches one or more Go concepts from the gobyexample.com curriculum, woven into the logic of her actual escape.

### Design Pillars

| Pillar                     | Meaning                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| **Jeopardy-first**         | Every challenge has real stakes. Fail and Maya suffers consequences.                           |
| **Code is the mechanic**   | Go code is the controller. No puzzles divorced from real programming.                          |
| **Story drives retention** | Players finish acts because they want to know what happens, not just because they levelled up. |
| **Earn your tools**        | Syntax highlighting, AI hints, Vim mode — all unlockable through play, not paywalls.           |
| **Mobile-native**          | Designed for thumbs. The editor, chat, and timer work on a 375px screen.                       |

---

## 2. The Story — Full Plot

### Characters

| Name                   | Role               | Background                                                                                          |
| ---------------------- | ------------------ | --------------------------------------------------------------------------------------------------- |
| **Maya Chen**          | Protagonist        | 22yo CS grad, encryption specialist. Her thesis on quantum-resistant key exchange is the MacGuffin. |
| **The Player**         | You                | An anonymous programmer Maya contacts through a chain of 9 proxies. You never meet.                 |
| **Dr. Eleanor Reeves** | Ally (Act I twist) | Maya's thesis advisor. Also kidnapped. She knows why.                                               |
| **GHOST**              | Antagonist         | The unseen overseer of the facility. Communicates through encrypted system broadcasts.              |
| **Kira**               | Wild card          | A second hacker on the same network. Is she helping or monitoring?                                  |
| **Director Vasik**     | Boss × 3           | Head of a private intelligence contractor. He has three terminals and a God complex.                |

---

### Act I — First Contact _(Sublevel 3)_

**Go concepts: Variables, Control Flow, Functions**

Maya wakes up in Cell B-09 and finds a maintenance terminal still connected to the building's intranet. She establishes an encrypted channel to the outside world and reaches you.

**Chapter 1 — Handshake**
She needs proof you have her exact location before she trusts you. Simple `fmt.Println`, constants, variables.

- _Event at T+18s:_ Footsteps outside her door. She goes silent.
- _Event at T+20s:_ Rush Mode activates — 45 seconds. Solve under pressure for bonus XP.
- **Twist:** Guards are talking about an "encryption thesis". Maya realizes she wasn't taken at random — they want something on her laptop.

**Chapter 2 — Door Code**
The keypad uses a 1–10 classification sequence. For loops, switch/case.

- _Event at T+12s:_ Two slow knocks from Cell B-10.
- _Event at T+28s:_ Three knocks — a distress signal.
- _Event at T+30s:_ Rush Mode — "Cell B-10 in Danger."
- **Twist:** A voice from B-10 says Maya's name. Someone in there knows her.

**Chapter 3 — Shaft Codes**
Maya enters the ventilation shaft. Variadic functions, multiple return values.

- _Event at T+8s:_ **Power Cut** — full screen flicker and blackout for 4 seconds. Red emergency tinge replaces the UI colour.
- _Event at T+10s:_ System message: `⚡ BACKUP POWER · 90 SECONDS`
- _Event at T+11s:_ Rush Mode — "Backup Power Failing."
- **Twist reveal (cinematic):** Maya reaches B-10. Dr. Reeves is inside, alive. She says: _"Maya — I know exactly why they took us."_

**ACT I BOSS — The Lockmaster**
_See §4 Boss Encounters._

---

### Act II — Inside the Machine _(Floors 1–3)_

**Go concepts: Slices, Maps, Structs, Methods, Interfaces, Errors**

Dr. Reeves reveals the building holds three copies of Maya's encrypted thesis on isolated servers. GHOST intercepts their comms and addresses them directly for the first time: _"You have twelve hours. Then the building burns."_

**Chapter 4 — Guard Roster**
Maps and slices: find which floors are clear by parsing the guard schedule Maya photographed.

**Chapter 5 — Access Struct**
Structs and methods: model the building's security personnel to predict patrol windows.

**Chapter 6 — Lock Interface**
Interfaces and errors: two lock types — KeypadLock and BiometricLock. One is broken. One isn't.

- **Twist:** One of the guard structs has the name "K. VOLKOV". Kira. The hacker on the network is inside the building — and she's wearing a guard uniform.

**ACT II BOSS — Director Vasik (Terminal 1 of 3)**
First encounter. Vasik types from his office terminal. He's also a programmer. This is a live duel.

---

### Act III — Deeper In _(Server Room / Power Plant)_

**Go concepts: Closures, Recursion, Defer, Goroutines, Channels, WaitGroups**

Kira makes contact. She claims she's a whistleblower who infiltrated the facility. She offers to help — but her information costs. Dr. Reeves doesn't trust her.

**Chapter 7 — File Tree**
Closures and recursion: count files in the building's archive directory tree to find which server has the thesis.

**Chapter 8 — Circuit Cut**
Goroutines and WaitGroups: simultaneously kill 4 circuits before the alarm triggers. Timing is everything.

- **Twist:** Kira sends a file. It contains a decryption key — but also a zero-day exploit aimed at Maya's terminal. Is it a gift or a trap?

**Chapter 9 — Channel of Escape**
Select, timeouts, non-blocking channels: three extraction teams respond at different speeds. Pick the first contact.

**ACT III BOSS — Kira (Allegiance Challenge)**
Not combat — a social/code test. Kira gives Maya a modified goroutine. If you evaluate it correctly (race condition or not?), you determine if Kira is an ally or saboteur. The answer changes Act IV's story branch.

---

### Act IV — The Breach _(Exit Corridor / Server Farm)_

**Go concepts: Mutexes, Atomic Counters, HTTP Client, JSON**

Two story branches based on Act III's Kira verdict:

- **Trusted Kira:** She disables 3 cameras from the inside. Easier timing windows, harder code challenges (she raises the bar).
- **Rejected Kira:** She triggers a lockdown. Harder navigation, simpler code (more direct problems, less time).

**Chapter 10 — Sensor Sweep**
Mutexes and atomics: 10 goroutines write to a shared sensor-log. Protect it correctly or lose the thread.

**Chapter 11 — Contact Retrieval**
HTTP client and JSON: fetch the safe house contact's info from a live public API. Parse nested JSON structs.

- **Twist:** The contact's address in the API response is wrong. Someone has tampered with it. Vasik is watching the network.

**ACT IV BOSS — Director Vasik (Terminal 2 of 3)**
He sends a malformed Go struct and asks you to find the bug that would crash Maya's escape route program. Timed. His code is deliberately obfuscated.

---

### Act V — Freedom _(City Streets / District 7)_

**Go concepts: Worker Pools, Context, Rate Limiting, Generics**

The building is behind them. But Vasik has activated the city's surveillance grid. Maya and Dr. Reeves have 11 checkpoints to clear simultaneously. The player must write the most sophisticated code yet — a full concurrent system.

**Chapter 12 — Scout Network**
Worker pools, context, rate limiting, generics: coordinate 8 scouts concurrently, rate-limited to avoid surveillance triggers, with a hard 5-second context timeout.

**FINAL BOSS — Director Vasik (Terminal 3 of 3)**
He challenges you directly. A head-to-head typing/solving race. His "solution" appears on the right half of your screen, yours on the left. The first complete, correct Go program wins. He cheats — his code has a subtle goroutine leak. Will you notice?

**Ending A (Trusted Kira):** Kira broadcasts Vasik's files publicly. He's arrested. Maya and Dr. Reeves make it to the safe house. The thesis is safe.

**Ending B (Rejected Kira):** Kira vanishes. Vasik escapes. Maya is safe, but the story isn't over. _"Act II begins."_

**INTERLUDE — 72 Hours Later**

Both endings converge. Maya and Dr. Reeves are at the safe house. The immediate danger is over — but GHOST sends a final broadcast: _"You escaped the building. You haven't escaped the network."_ Dr. Reeves reveals that Vasik was a node in something larger — **NEXUS**, a private intelligence consortium with assets across 14 countries. The thesis wasn't just valuable — it was the prototype for NEXUS's next-generation surveillance encryption. To destroy NEXUS, they need to build their own infrastructure. Maya can code Go — but now she needs to code for the _web_.

---

### Act VI — The Dead Drop _(Safe House / Basement Server Room)_

**Go concepts: HTTP Server, Routing, Templates**

Maya converts the safe house basement into a server room. She needs a covert web service — a dead drop system where allied agents can check in, receive instructions, and report intel. No third-party platforms. No cloud. Just raw Go.

**Chapter 13 — First Server**
`net/http`, handlers, `ListenAndServe`: stand up a basic HTTP server that responds to health checks from allied agents.

- _Event at T+12s:_ First ping arrives from an unknown IP. Friend or foe?
- **Twist:** The ping includes a header: `X-Agent: KIRA`. She's still out there.

**Chapter 14 — Route Map**
Routing with `gorilla/mux`, named parameters, method-based handlers: build endpoints for agent check-in (`POST /agent/{id}/checkin`), status retrieval (`GET /agent/{id}/status`), and a kill switch (`DELETE /agent/{id}`).

- _Event at T+20s:_ Rush Mode — "Unregistered agent scanning your routes."
- **Twist:** An agent checks in with ID `VASIK-PROXY`. Someone is using Vasik's credentials — or Vasik isn't as arrested as they thought.

**Chapter 15 — Status Board**
Go `html/template`: render a live status dashboard showing all checked-in agents, their last ping time, and threat level. Template logic: conditionals, range loops, custom functions.

- _Event at T+15s:_ Rush Mode — "NEXUS scanning for active HTTP services on this subnet."
- **Twist:** The template renders a hidden agent Maya never registered. GHOST has injected a phantom into the system.

**ACT VI BOSS — GHOST Proxy**
GHOST hijacks Maya's server by injecting rogue route handlers. The player sees their clean router config on the left and GHOST's corrupted version on the right. They must write middleware that intercepts GHOST's injected routes and redirects them to a honeypot endpoint — all while keeping legitimate routes functional. Time limit: 120 seconds. Every 15 seconds, GHOST injects a new rogue route.

---

### Act VII — The Archive _(NEXUS Data Vault / Geneva)_

**Go concepts: MySQL Database, Forms, Assets & Static Files**

Dr. Reeves has a contact in Geneva — a former NEXUS analyst who defected. She reveals that NEXUS stores operational records in a database vault accessible only from inside their network. Maya's dead drop system has attracted enough allied agents to mount a coordinated infiltration. But extracting the data requires building query tools, search interfaces, and an evidence export pipeline.

**Chapter 16 — Query the Vault**
`database/sql`, MySQL driver, parameterised queries: connect to the NEXUS database and query operational records. Find all operations targeting academic researchers.

- _Event at T+10s:_ Database connection drops — NEXUS rotates credentials every 90 seconds.
- _Event at T+12s:_ Rush Mode — "Credential rotation in 45 seconds. Query fast."
- **Twist:** One of the query results returns Dr. Reeves' name — with a status of "ACTIVE ASSET". Was she ever really kidnapped, or was she placed?

**Chapter 17 — Search Terminal**
HTML forms, `r.FormValue`, `r.ParseForm`, POST handling: build a search interface that lets agents query the vault by name, date range, and operation type. Validate and sanitise input to prevent SQL injection.

- _Event at T+18s:_ Someone submits a search for "GHOST IDENTITY" — from inside the network.
- **Twist:** The search returns a single result: `GHOST is not a person. GHOST is a system.`

**Chapter 18 — Evidence Locker**
`http.FileServer`, `http.StripPrefix`, serving static assets: build a file server that hosts extracted evidence documents. Agents download via authenticated routes. Serve CSS for the search terminal's UI.

- **Twist:** One of the "evidence files" is a trojan — it phones home to NEXUS when opened. Maya must add a content-type validation middleware (foreshadowing Act VIII).

**ACT VII BOSS — The Archivist**
The vault's automated defense system activates. It corrupts every third database query with garbage data. The player must write a validation layer that detects corrupted responses (checksum mismatch), retries the query, and logs the corruption pattern. The Archivist speeds up — by the end, it's corrupting every other query. 90-second timer. Each failed validation costs 15 seconds.

---

### Act VIII — The Fortress _(NEXUS Corporate HQ / Singapore)_

**Go concepts: Middleware (Basic), Middleware (Advanced), Sessions, Password Hashing**

The evidence from Geneva points to NEXUS's corporate headquarters in Singapore. Their systems are layered — every request passes through authentication middleware, rate limiters, session validators, and encrypted credential stores. To infiltrate, Maya must understand and replicate each security layer. She's not breaking in — she's building a mirror of their security stack to intercept their own traffic.

**Chapter 19 — Access Layer**
Basic middleware pattern: `func(next http.Handler) http.Handler`. Build a logging middleware that records every request's method, path, and timestamp. Chain it with an auth-check middleware that validates API keys in headers.

- _Event at T+8s:_ Logs show a request from `10.0.0.1` — NEXUS's internal gateway. They know Maya is on the network.
- _Event at T+10s:_ Rush Mode — "Firewall closing in 35 seconds."
- **Twist:** The logging middleware captures a request with header `X-Ghost-Cmd: SHUTDOWN`. GHOST is trying to kill Maya's mirror server.

**Chapter 20 — Security Chain**
Advanced middleware: chaining multiple middleware functions, conditional middleware (apply different rules per route), middleware that modifies the request context (`context.WithValue`).

- _Event at T+22s:_ Rush Mode — "NEXUS deploying adaptive firewall."
- **Twist:** Maya's middleware chain catches a pattern — GHOST sends a heartbeat every 30 seconds to all NEXUS nodes. If Maya can forge a heartbeat, she can impersonate a NEXUS node.

**Chapter 21 — Identity Lock**
`gorilla/sessions`, cookie-based session management: build a session system that tracks agent identity across requests. Store session data server-side. Handle session expiry and renewal.

- _Event at T+15s:_ A session token appears that Maya didn't create. Someone else is on her server.
- **Twist:** The rogue session belongs to Dr. Reeves — accessing the system from a NEXUS terminal in Singapore. She's inside the building. She went in alone.

**Chapter 22 — Vault Credentials**
`bcrypt` password hashing, `CompareHashAndPassword`: build a credential store for the agent network. Hash passwords on registration, verify on login. Detect and reject weak passwords.

- _Event at T+20s:_ Rush Mode — "NEXUS credential dump detected. Secure passwords NOW."
- **Twist:** One of the hashed passwords in NEXUS's own credential dump matches the plaintext "ghost_admin". GHOST's master password. The key to everything.

**ACT VIII BOSS — Director Vasik (Terminal 4 of 4)**
Vasik is alive. He was never truly arrested (Ending A) or never truly gone (Ending B). He's in Singapore, at the NEXUS HQ, and he's rebuilt his defenses. This time it's middleware warfare — Vasik sends requests through 5 chained middleware layers, each with a subtle bug. The player must identify all 5 bugs and write corrected middleware. But Vasik is also attacking — every 20 seconds he adds a new middleware layer to his chain. If the player falls behind by 3+ layers, Maya's connection drops. 150-second timer.

---

### Act IX — The Broadcast _(Global / Distributed Signal Network)_

**Go concepts: Websockets, Full Web Application**

This is it. They have the evidence. They have GHOST's master password. They have agents in 14 countries. Now they need to broadcast everything simultaneously — a coordinated global data dump that NEXUS can't suppress. The tool: real-time websockets connecting every agent in the network. One signal. Everywhere. At once.

**Chapter 23 — Live Wire**
Websocket server (`gorilla/websocket`), upgrading HTTP connections, bidirectional messaging: build a websocket server that maintains persistent connections with all agents. Broadcast messages to all connected clients. Handle disconnections gracefully.

- _Event at T+5s:_ Agents start connecting. The counter ticks up: 3... 7... 12...
- _Event at T+20s:_ Connection from `GHOST-NODE-01`. GHOST is listening.
- _Event at T+25s:_ Rush Mode — "GHOST attempting to flood websocket connections."
- **Twist:** GHOST floods the server with 10,000 fake connections. The player must add connection validation (origin check, rate limiting per IP) to the websocket upgrader — a callback to every web concept they've learned.

**Chapter 24 — The Signal**
Full web application: combine HTTP server, routing, templates, database queries, middleware, sessions, and websockets into a single coordinated broadcast system. This is the capstone — every concept from Acts VI–IX in one program.

- _Event at T+10s:_ Dr. Reeves sends a message from inside NEXUS HQ: "I have the server room. Send the signal."
- _Event at T+30s:_ Rush Mode — "NEXUS kill switch activated. Broadcast before shutdown."
- **No twist** — pure execution under pressure.

**FINAL BOSS — GHOST (Unmasked)**

GHOST is not a person. GHOST is a distributed AI system running across NEXUS's global infrastructure — a surveillance engine that predicts threats before they materialise. It was built using Maya's thesis. Her encryption research was the foundation for GHOST's core prediction algorithm.

**Mechanic:** GHOST generates web requests in real time — HTTP, websocket, database queries — all designed to crash Maya's broadcast server. The player must build a complete request handler that:

1. Validates and routes HTTP requests (routing)
2. Authenticates via session tokens (sessions)
3. Filters through middleware (logging + rate limiting)
4. Responds to legitimate agents via websocket (websockets)
5. Rejects GHOST's attack patterns (pattern matching)

Split-screen returns: GHOST's attack feed on the right, player's handler code on the left. GHOST adapts — when the player blocks one pattern, GHOST evolves to a new one. Three phases, 60 seconds each:

- **Phase 1:** HTTP flood with malformed headers
- **Phase 2:** Websocket connection hijacking with forged session tokens
- **Phase 3:** SQL injection attempts through form parameters

**Win condition:** Survive all 3 phases. The broadcast completes. GHOST's prediction engine receives Maya's counter-algorithm — her thesis, weaponised against itself — and shuts down.

**Ending C (Both branches):** The broadcast succeeds. NEXUS's operations are exposed globally. Dr. Reeves walks out of the Singapore server room. Vasik is arrested — for real, this time. GHOST goes silent. Maya's terminal displays one final message:

_"signal terminated."_
_"..."_
_"thank you."_

**Post-credits (Ending A path):** Kira sends a message: _"Nice work. I left you something."_ A file appears — the source code for GHOST's prediction engine. Open source now.

**Post-credits (Ending B path):** Maya's terminal flickers. One new message: _"GHOST was version 1. — K"_ Kira built GHOST. And version 2 is already running.

---

## 3. Jeopardy System — Stakes & Consequences

SIGNAL has permanent failure states, time pressure, and meaningful setbacks. Not permadeath — but degradation.

### 3.1 Rush Mode

Triggered by story events (guard, power cut, alarm). A countdown bar appears at the bottom of the screen.

| Outcome                        | Result                               |
| ------------------------------ | ------------------------------------ |
| Solve **before** timer expires | Speed Bonus XP (+25–100)             |
| Timer expires                  | **Jeopardy Event** fires (see below) |
| Solve after timer expires      | Base XP only, Jeopardy persists      |

### 3.2 Jeopardy Events (timer expiry)

These are permanent for the current chapter run:

| Event               | Mechanical Effect                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------- |
| **Guard Enters**    | Chat panel dims 50% and locks for 60 seconds. Maya can't respond.                            |
| **Power Reduced**   | Code editor drops to 40% width. Line numbers disappear.                                      |
| **Signal Scramble** | Every 8 seconds, 3 random characters in the editor are replaced with `█`. You must fix them. |
| **Energy Drain**    | Lose 20 energy immediately (see §7).                                                         |
| **Hint Burned**     | One of your remaining hints is randomly consumed.                                            |

Multiple jeopardy events can stack within a chapter.

### 3.3 Attempt Penalty

Each wrong submission costs:

- **Attempt 1:** Free
- **Attempt 2:** −5 energy
- **Attempt 3:** −10 energy + jeopardy event warning
- **Attempt 4+:** −15 energy + one random character scramble per attempt

### 3.4 Chapter Failure State

If energy hits 0 mid-chapter, Maya is "caught". The screen cuts to black. Maya's last words appear character by character. Then a **Retry from Checkpoint** prompt appears — same chapter, but:

- All jeopardy effects carry over at 50% intensity
- Speed bonus is unavailable
- Energy starts at 30%

---

## 4. Boss Encounters

Bosses break the normal flow. The editor, chat, and timer all behave differently.

### 4.1 The Lockmaster — ACT I BOSS

**Concept:** Loops and conditionals under fire.

**Setup:** The building's master lock controller — an automated system — starts cycling through 6-digit access codes. It will lock the entire sublevel in 90 seconds. The code pattern follows a mathematical rule Maya can see but can't compute fast enough manually.

**Mechanic:** The player sees a live feed of the current code cycling on the right panel (updates every 3 seconds). They must write a Go function that detects the pattern and predicts the **next** code before it locks. The system accepts only the exact next value.

**Jeopardy:** Every wrong submission = 10 seconds removed from the countdown clock (not just the rush timer — the actual boss timer).

**Win condition:** Correct predicted code submitted. Lock releases.
**Loss condition:** Timer hits zero. Sublevel locks. Energy drops to 10%. Chapter replays with a 60-second timer instead of 90.

---

### 4.2 Director Vasik — Terminal 1 (ACT II BOSS)

**Concept:** Structs, methods, and error handling.

**Setup:** Vasik detects Maya on the network and opens a direct terminal channel. He taunts her. He sends a broken Go struct — a `SecurityProfile` — and says the building's doors will stay sealed until his _own_ code compiles cleanly. He's deliberately introduced three errors. Find them.

**Mechanic:** Player receives Vasik's code (pre-filled, read-only). A diff panel appears. Player writes a corrected version in the editor. Maya submits it. Vasik evaluates it.

**Jeopardy:** Every 20 seconds without a submission, Vasik shuts off another wing — shrinking Maya's potential escape route visually on a building minimap that appears in the top-right corner.

**Plot pivot:** If player solves it in under 60 seconds, Vasik is visibly rattled. He says: _"Faster than expected."_ This unlocks a dialogue branch in Act IV where he makes an offer.

---

### 4.3 Kira — Allegiance Challenge (ACT III BOSS)

**Concept:** Goroutines and race conditions.

**Setup:** Kira sends a function. It looks like it helps Maya. But the player must evaluate: does this goroutine introduce a data race?

```go
// Kira's code — evaluate this
func transmit(data []byte, ch chan<- []byte) {
    for i := range data {
        data[i] ^= 0xFF  // in-place mutation
        ch <- data[i:]    // sends slice of mutated original
    }
}
```

**The answer:** Yes — it sends a slice of the same underlying array at each iteration. Every receiver sees mutated data from subsequent iterations. It's subtle and would corrupt the escape transmission.

**Mechanic:** Player must write a comment-only answer (no code) explaining the race condition. Maya's AI evaluates the explanation. Must identify: shared slice header, in-place mutation, and missing copy.

**Branching:**

- Correct → Reject Kira. She's trying to corrupt your channel. Ending B path.
- Incorrect → Trust Kira (wrongly). She helps in Act IV but with a hidden cost. Ending A path, but with a twist in the finale.

---

### 4.4 Director Vasik — Terminal 3 — FINAL BOSS (ACT V)

**Concept:** Full concurrent Go program, generics, context cancellation.

**Setup:** Split-screen. Left: player's editor. Right: Vasik's editor, streaming his solution in real time (pre-scripted, timed to create pressure). He types fast.

**Mechanic:** Both must implement the same spec — a concurrent worker pool with context timeout and generic result mapper. First correct, complete solution wins.

**Vasik's code has a bug:** His goroutines don't call `wg.Done()` inside a `defer`. Under cancellation, his pool leaks. The player's code doesn't need to be faster — it needs to be _correct_.

**Jeopardy:** Every 15 seconds, Vasik adds a new constraint to the spec (displayed in a scrolling mission brief). If the player ignores it, their solution won't pass. Vasik's solution also updates to include the new constraint — sometimes correctly, sometimes not.

**Win:** Vasik's code submits first but fails evaluation. Maya's submits, passes. The screen fractures. Vasik's terminal disconnects.

---

## 5. Core Mechanics

### 5.1 XP & Levelling

| XP Source                     | Amount     |
| ----------------------------- | ---------- |
| Challenge base completion     | 100–300 XP |
| First-try bonus               | +50% base  |
| Speed bonus (Rush Mode)       | +25–100 XP |
| Boss defeat                   | 500 XP     |
| Boss defeated under par time  | +250 XP    |
| Kira allegiance: correct read | +400 XP    |

**Level thresholds:**

| Level | XP Required | Unlock                                          |
| ----- | ----------- | ----------------------------------------------- |
| 1     | 0           | Basic editor                                    |
| 2     | 300         | Syntax highlighting — 5 minutes                 |
| 3     | 700         | Vim mode unlocked permanently                   |
| 4     | 1,200       | AI hint token × 3                               |
| 5     | 2,000       | Black Market access                             |
| 6     | 3,500       | Syntax highlighting — permanent                 |
| 7     | 5,500       | Extra energy capacity (+50)                     |
| 8     | 8,000       | "GHOST channel" — intercept story audio logs    |
| 9     | 10,000      | Part II unlock + "Web Mode" editor theme        |
| 10    | 12,500      | HTTP request preview panel (live response view)  |
| 11    | 15,000      | AI token capacity increased to 15               |
| 12    | 18,000      | "NEXUS dossier" — character backstory files     |

### 5.2 Streak System

Consecutive correct first-try submissions build a streak multiplier:

| Streak | Multiplier | Label      |
| ------ | ---------- | ---------- |
| 2      | 1.2×       | SHARP      |
| 3      | 1.4×       | ON FIRE    |
| 4      | 1.7×       | CRACKING   |
| 5+     | 2.0×       | GHOST MODE |

Breaking a streak (wrong first attempt) resets to 1×. The streak label flashes full-screen on each new tier.

### 5.3 Chapter Timing Bonuses

Every chapter has a **par time** (target completion time). Submitting a correct solution under par earns:

```
Speed XP = floor(base_xp × (1 - elapsed/par) × 0.5)
```

Example: Chapter worth 200 XP, par 120s, solved in 40s:
`Speed XP = floor(200 × (1 - 40/120) × 0.5) = floor(200 × 0.67 × 0.5) = 67 XP`

---

## 6. The Editor — Vim Mode & Syntax Highlighting

### 6.1 Syntax Highlighting

Go syntax is highlighted using a lightweight client-side tokenizer (no external libraries). Highlight categories:

| Token Type                              | Colour                         |
| --------------------------------------- | ------------------------------ |
| Keywords (`func`, `go`, `chan`, `for`…) | `#6ea8e0` — ice blue           |
| Strings (`"..."`, `` `...` ``)          | `#d4a84b` — amber              |
| Comments (`// …`)                       | `#4a6880` — slate, italic      |
| Numbers                                 | `#b0d4a8` — soft green         |
| Built-ins (`make`, `append`, `len`)     | `#e08080` — coral              |
| Types (`int`, `string`, `bool`)         | `#9a7ae0` — lavender           |
| Identifiers                             | `#b8d4a0` — default code green |

**Unlock states:**

| State         | Trigger                                  | Duration              |
| ------------- | ---------------------------------------- | --------------------- |
| Locked        | Default for new players                  | —                     |
| **Timed**     | Level 2 reached                          | 5 minutes per session |
| **Permanent** | Level 6 OR spend 500 Black Market tokens | Forever               |

When timed highlighting expires, a 10-second warning pulses the editor border orange. Then colours fade to monochrome over 3 seconds.

**Refill mechanic:** Every correct first-try submission adds 2 minutes to the highlight timer when in Timed state.

### 6.2 Vim Mode

Unlocked at **Level 3**. Permanently available once unlocked. Implements:

**Normal mode:**

- `h j k l` — cursor movement
- `w b` — word forward/back
- `dd` — delete line
- `yy` — yank line
- `p` — paste
- `u` — undo
- `gg / G` — top/bottom of file
- `/ + term` — search (highlights matches)
- `n / N` — next/prev match
- `ci" / ca{` — change inside quotes/braces
- `:%s/old/new/g` — substitute all (basic)
- `i a o I A O` — enter Insert mode

**Insert mode:**

- `Esc` or `Ctrl+[` — return to Normal
- All standard typing

**Visual mode:**

- `v V` — character/line visual
- `d y` — delete/yank selection
- `>  <` — indent/dedent

A persistent mode indicator sits in the bottom-left of the editor: `[ NORMAL ]`, `[ INSERT ]`, `[ VISUAL ]` — colour-coded.

Vim mode defaults to off per session. Player toggles it with `Ctrl+Alt+V` or via the editor toolbar.

### 6.3 Editor Toolbar (collapsible on mobile)

```
[ VIM ] [ HIGHLIGHT: 4:32 ] [ RESET ] [ FONT: 11px ▾ ] [ 24 lines ]
```

On mobile: collapsed to a single `⚙` icon that expands to a bottom drawer.

---

## 7. Economy — Energy, Tokens & the Black Market

### 7.1 Energy

Energy represents Maya's and Dr. Reeves' physical and mental stamina, the charge on Maya's hacked terminal, and the bandwidth on the encrypted channel.

- **Max energy:** 100 (extendable to 150 at Level 7)
- **Starting energy per act:** 100
- **Regeneration:** +5 energy per minute of active play, capped at max

**Energy costs:**

| Action                           | Cost                     |
| -------------------------------- | ------------------------ |
| Wrong submission (2nd attempt)   | −5                       |
| Wrong submission (3rd attempt)   | −10                      |
| Wrong submission (4th+)          | −15                      |
| Rush timer expiry                | −20                      |
| Viewing a hint                   | −8                       |
| Using an AI token (see §7.3)     | −0 (tokens are separate) |
| Purchasing syntax highlight time | −15 energy per 3 minutes |

**Energy display:** A segmented bar in the top navigation. At ≤30%, it pulses amber. At ≤15%, it flashes red and the screen dims slightly. At 0%, chapter fail state triggers.

### 7.2 Code Hints

Each challenge has 3 built-in hints, revealed progressively:

| Hint   | What it shows                                       | Energy cost |
| ------ | --------------------------------------------------- | ----------- |
| Hint 1 | The Go concept needed and a link to gobyexample.com | −8 energy   |
| Hint 2 | A concrete syntax snippet without the full answer   | −12 energy  |
| Hint 3 | The algorithmic approach, near-complete             | −20 energy  |

Hints are **per-challenge** and don't reset. Once all 3 are revealed, no more hints exist for that challenge unless the player buys a **Premium Hint** (see §7.4).

### 7.3 AI Tokens

AI tokens unlock one use of the **full Anthropic Claude API** for a deep, contextual hint from Maya. Unlike the on-device chat (§8), Claude gives specific code feedback.

**Token sources:**

| Source                                   | Tokens gained |
| ---------------------------------------- | ------------- |
| Level up (Levels 3–8)                    | +1 per level  |
| Boss defeat                              | +2            |
| Complete act without failing any chapter | +3            |
| Daily login bonus                        | +1            |
| Correct Kira allegiance reading          | +2            |

**Token use:** A `⚡ ASK CLAUDE` button appears next to the hint panel. Costs 1 token. Response limited to 180 tokens for speed. Claude is prompted to be Maya's voice — same character — but with more technical precision. Token count displayed in the HUD.

**Token capacity:** Max 10 tokens banked.

### 7.4 The Black Market

Unlocked at **Level 5**. A terminal interface accessed via a hidden `> market` command in the chat input. Sold by a character called **FIXER** — a former employee of the facility who went rogue.

**Black Market listings:**

| Item                          | Cost (XP) | Description                                                                                                                         |
| ----------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Permanent Syntax Highlighting | 500 XP    | Skip Level 6 requirement                                                                                                            |
| Premium Hint                  | 200 XP    | Extra hint beyond the built-in 3                                                                                                    |
| Signal Boost                  | 150 XP    | +30 energy                                                                                                                          |
| Code Ghost                    | 300 XP    | Ghost text of working solution fades in character by character over 90 seconds — slow enough that writing it manually is still work |
| Scramble Shield               | 100 XP    | Prevents next Signal Scramble jeopardy event                                                                                        |
| Time Extension                | 250 XP    | +30 seconds to current Rush timer                                                                                                   |
| Story Branch Preview          | 400 XP    | Preview the next plot twist before it fires                                                                                         |

**FIXER's personality:** Terse, mercenary, speaks in corporate euphemism. Warns against over-spending XP: _"Spending your edge. Bold move."_

---

## 8. Maya's Chat — On-Device AI Architecture

### 8.1 Philosophy

The chat panel is Maya's voice. It must be:

1. **Always available** — no network required for basic help
2. **Contextually focused** — every response steers the player toward the current challenge
3. **Narratively consistent** — Maya sounds like Maya, not a help desk
4. **Ephemeral** — previous rounds' conversations fade, keeping cognitive focus on the current task

### 8.2 Primary: Chrome Built-in AI (Gemini Nano via Prompt API)

**What it is:** Chrome 138+ ships Gemini Nano as a built-in model accessible via the `LanguageModel` API. No API key, no server, no cost. Runs fully on-device via WebGPU.

**Setup detection:**

```javascript
async function detectMayaBackend() {
  // 1. Try Chrome built-in (Gemini Nano)
  if ("LanguageModel" in globalThis) {
    const status = await LanguageModel.availability();
    if (status === "available") return "gemini-nano";
    if (status === "downloadable") {
      await LanguageModel.create(); // triggers download
      return "gemini-nano";
    }
  }
  // 2. Fall back to WebLLM (Phi-3.5-mini via WebGPU)
  if (navigator.gpu) return "webllm";
  // 3. Fall back to Anthropic API (costs tokens)
  return "anthropic-api";
}
```

**Session creation:**

```javascript
const session = await LanguageModel.create({
  systemPrompt: buildMayaSystemPrompt(currentChallenge),
  temperature: 0.7,
  topK: 10,
});
const stream = session.promptStreaming(userMessage);
// stream to chat panel character by character
```

**System prompt (concise, fits Gemini Nano's small context window):**

```
You are Maya Chen, a kidnapped CS grad student whispering through a hacked terminal.
Current task: {challenge.title} — teaching {challenge.concepts}.
Mission: {challenge.brief_one_line}.
Hint if asked: {challenge.hint_compact}.

Rules:
- Max 2 sentences. Lowercase. Scared but technically sharp.
- Always steer user back to the current Go challenge.
- If user asks about code: give ONE specific Go syntax hint.
- Never break character. Never mention AI.
```

**Token management:** Gemini Nano has a limited context window. The implementation tracks `session.tokensLeft` and destroys/recreates the session when it drops below 200 tokens.

### 8.3 Fallback: WebLLM (Phi-3.5-mini)

For browsers without Chrome 138+ built-in AI, WebLLM loads a quantized Phi-3.5-mini model via WebGPU.

```javascript
import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

const engine = await CreateMLCEngine("Phi-3.5-mini-instruct-q4f16_1-MLC", {
  initProgressCallback: (progress) => updateLoadingBar(progress),
});
```

**Loading UX:** A fake "terminal boot sequence" plays while the model downloads (~400MB for Phi-3.5-mini, cached in IndexedDB after first load). Players see:

```
▸ ESTABLISHING SECURE CHANNEL...
▸ LOADING ENCRYPTION LAYER...
▸ MAYA'S TERMINAL ACTIVE
```

Model download progress is shown as a signal strength bar, not a percentage — keeping it in-world.

### 8.4 Final Fallback: Anthropic API

If neither on-device option is available, chat uses the Anthropic API. This costs 1 AI token per chat message (not just per hint). A clear indicator shows: `⚡ USING AI TOKEN`. Players are warned before their first API message if tokens are low.

### 8.5 Conversation Fade — Focus Architecture

Each challenge has its own conversation context. When a new challenge begins:

1. Previous messages slide up and fade to 5% opacity over 1.5 seconds
2. A visual separator appears: `━━ NEW OBJECTIVE ━━`
3. Maya's first message in the new context animates in from 0%
4. Faded messages can be expanded by tapping/clicking the separator (collapses back on tap)

**The architecture:** Previous-round history is stored in `sessionStorage` by challenge ID but is **not** sent to the LLM. Each challenge creates a fresh session. This keeps responses relevant and the context window small.

**On mobile:** Faded messages are hidden entirely (height: 0, overflow: hidden). Tap the separator to reveal.

### 8.6 Maya's Response Tiers

Responses are constrained by context and urgency:

| State       | Max length  | Tone                   |
| ----------- | ----------- | ---------------------- |
| Normal      | 2 sentences | Whisper, focused       |
| Rush Mode   | 1 sentence  | Urgent, clipped        |
| Power Cut   | 1 sentence  | Terrified whisper      |
| Boss Mode   | 2 sentences | Concentrated, no jokes |
| After Twist | 3 sentences | Emotional, vulnerable  |

---

## 9. Act Structure & Curriculum Map

### Part I Curriculum (gobyexample.com aligned)

| Act | Ch  | Title              | Go Concepts                                    | XP   | Boss? |
| --- | --- | ------------------ | ---------------------------------------------- | ---- | ----- |
| I   | 1   | Handshake          | Hello World, Variables, Constants              | 100  |       |
| I   | 2   | Door Code          | For, Switch, If/Else                           | 150  |       |
| I   | 3   | Shaft Codes        | Functions, Multiple Returns, Variadic          | 200  |       |
| I   | —   | The Lockmaster     | For, If/Else (applied)                         | 500  | ✓     |
| II  | 4   | Guard Roster       | Arrays, Slices, Maps, Range                    | 200  |       |
| II  | 5   | Access Struct      | Structs, Methods, Pointers                     | 250  |       |
| II  | 6   | Lock Interface     | Interfaces, Errors, Custom Errors              | 300  |       |
| II  | —   | Director Vasik I   | Structs, Errors (debugging)                    | 500  | ✓     |
| III | 7   | File Tree          | Closures, Recursion, Defer                     | 250  |       |
| III | 8   | Circuit Cut        | Goroutines, WaitGroups                         | 350  |       |
| III | 9   | Channel of Escape  | Channels, Select, Timeouts                     | 350  |       |
| III | —   | Kira (Allegiance)  | Race Conditions (evaluate)                     | 600  | ✓     |
| IV  | 10  | Sensor Sweep       | Mutexes, Atomic Counters                       | 300  |       |
| IV  | 11  | Contact Retrieval  | HTTP Client, JSON, String Formatting           | 350  |       |
| IV  | —   | Director Vasik II  | Interfaces, Goroutines (debugging)             | 600  | ✓     |
| V   | 12  | Scout Network      | Worker Pools, Context, Rate Limiting, Generics | 400  |       |
| V   | —   | Director Vasik III | Full concurrent Go (race duel)                 | 1000 | ✓     |

**Part I base XP (no bonuses):** ~5,900 XP

### Part II Curriculum (gowebexamples.com aligned)

| Act  | Ch  | Title            | Go Web Concepts                                   | XP   | Boss? |
| ---- | --- | ---------------- | ------------------------------------------------- | ---- | ----- |
| VI   | 13  | First Server     | net/http, Handlers, ListenAndServe                | 250  |       |
| VI   | 14  | Route Map        | gorilla/mux, Named Params, Method Routing         | 300  |       |
| VI   | 15  | Status Board     | html/template, Range, Conditionals, Pipelines     | 350  |       |
| VI   | —   | GHOST Proxy      | HTTP Middleware, Route Interception (applied)      | 600  | ✓     |
| VII  | 16  | Query the Vault  | database/sql, MySQL, Prepared Statements, Scanning| 350  |       |
| VII  | 17  | Search Terminal   | HTML Forms, FormValue, POST, Input Validation     | 300  |       |
| VII  | 18  | Evidence Locker  | http.FileServer, StripPrefix, Static Assets       | 300  |       |
| VII  | —   | The Archivist    | Query Validation, Retry Logic, Checksums          | 700  | ✓     |
| VIII | 19  | Access Layer     | Basic Middleware, Handler Wrapping, Logging        | 350  |       |
| VIII | 20  | Security Chain   | Advanced Middleware, Composition, Context Injection| 400  |       |
| VIII | 21  | Identity Lock    | Sessions, Cookies, Server-side Storage, CSRF      | 400  |       |
| VIII | 22  | Vault Credentials| bcrypt, Password Hashing, Timing-safe Comparison  | 350  |       |
| VIII | —   | Director Vasik IV| Middleware Debugging (5 layers)                   | 800  | ✓     |
| IX   | 23  | Live Wire        | WebSockets, Upgrade, Bidirectional Messaging      | 450  |       |
| IX   | 24  | The Signal       | Full Web App (capstone — all concepts combined)   | 600  |       |
| IX   | —   | GHOST (Unmasked) | Complete Web Stack (3-phase defense)              | 1500 | ✓     |

**Part II base XP (no bonuses):** ~8,050 XP

**Total base XP (Parts I + II, no bonuses):** ~13,950 XP

---

## 10. Mobile Design

### 10.1 Principles

- **Single-column stacking** at ≤768px
- **Bottom-sheet pattern** for secondary panels (Lesson, Tips, Market)
- **Large tap targets** — minimum 44×44px for all interactive elements
- **Thumb-zone priority** — submit button and chat input always in bottom 25% of screen
- **No hover states** on touch — replaced with tap + hold for tooltips
- **Collapsible editor toolbar** — slides up from bottom on `⚙` tap

### 10.2 Breakpoints

| Width      | Layout             | Changes                                          |
| ---------- | ------------------ | ------------------------------------------------ |
| ≥1024px    | Desktop two-column | Chat left 44%, Editor right 56%                  |
| 768–1023px | Tablet             | Tabs replace columns, swipe between Chat/Editor  |
| 375–767px  | Mobile             | Full-width tabs, bottom drawer for tips          |
| <375px     | Small mobile       | Font reduced to 10px, editor line numbers hidden |

### 10.3 Mobile Editor

The code editor on mobile uses a **custom `<textarea>`** (not CodeMirror — too heavy for mobile) with:

- Font size 12px minimum (users can pinch-zoom the editor zone)
- Virtual keyboard detection: when keyboard appears, editor height shrinks; chat panel collapses fully
- `Tab` key replacement: a floating `⇥ TAB` button appears above the keyboard
- Vim mode **disabled** on mobile by default (no keyboard shortcut conflicts)
- Line numbers hidden at <375px to reclaim space

### 10.4 Mobile Rush Timer

On mobile, the Rush timer bar collapses to a thin 3px strip at the very top of the screen (above the navigation) when the keyboard is open, expanding back to full-height when keyboard closes. The time readout remains visible in the top-right corner of the nav at all times.

### 10.5 Mobile Chat

- Chat messages use slightly smaller font (10.5px vs 11.5px desktop)
- Previous-round faded messages are hidden entirely (no reveal on tap — too much clutter)
- Chat input is a fixed bottom bar, `position: fixed; bottom: 0` adjusted by `visualViewport` API to sit above the software keyboard
- Maya's typing animation speed increased on mobile (28ms → 20ms per character) to account for shorter viewport patience

### 10.6 Mobile Boss Layout

Boss encounters on mobile:

- **Lockmaster:** Timer + current cycling code takes top 30%. Editor takes bottom 70%.
- **Vasik I/II:** Diff panel becomes a collapsible drawer. Player switches between "Vasik's code" and "Your code" via tab toggle.
- **Vasik III (Final):** Split-screen collapses to **alternating view** — Vasik's progress shown as a read-only status bar ("Vasik: 14/23 lines complete") while the player's editor takes the full screen.
- **Kira (Allegiance):** Mobile gets a binary choice UI (Trust / Reject) with the code snippet shown as a non-editable code block above. Still requires text explanation — a dedicated prose `<textarea>` replaces the code editor for this challenge.

### 10.7 Progressive Web App

SIGNAL ships as a PWA:

- `manifest.json` with `display: standalone`
- Service Worker caches all static assets + WebLLM model after first load
- Offline play available after first session (on-device AI continues to work; Anthropic API falls back to a graceful "signal lost" message)
- Add to Home Screen prompt fires after Chapter 3 completion
- iOS Safari: `apple-mobile-web-app-capable` meta tag for fullscreen

---

## 11. UI/UX Reference

### 11.1 Design Language

**Aesthetic:** Tactical terminal — dark military green on near-black. Not retro nostalgia. Functional brutalism that feels like real hacking infrastructure.

**Fonts:**

- Display / labels: `Orbitron` — geometric, commanding
- Code / chat / body: `JetBrains Mono` — legible at small sizes, authoritative for code

**Colour palette:**

```
Background:     #040810   (near-black blue)
Panel:          #06101a   (dark navy)
Code bg:        #030810   (deepest black)
─────────────────────────────────────────
Maya (signal):  #6effa0   (signal green)
Alert:          #ff9f1c   (amber)
Danger:         #ff4040   (red)
Info:           #00d4ff   (cyan)
You:            #7ab8d8   (steel blue)
Win:            #ffed4a   (yellow)
─────────────────────────────────────────
Borders:        #0a2030
Dim text:       #1a5a4a
```

**Motion principles:**

- All screen transitions: 400ms ease
- Message in: 350ms translateY from 8px
- XP burst: 1.5s ease, floats upward
- Rush bar: fill shrinks via `transition: width 1s linear`
- Power cut: multi-phase — flicker (1.2s) → black (2s) → red restore (0.8s)
- Twist reveal: cinematic, lines type at 22ms/char with 900ms line delay

### 11.2 HUD Layout (Desktop)

```
┌──────────────────────────────────────────────────────────────────────┐
│ SIGNAL │ LV3 ████████░░░░░ 847 XP │ CH 4/12 ○—●—○—○ │ ⚡3 │ ● LIVE │
├─────────────────────────────┬────────────────────────────────────────┤
│ CELL B-09 · SUBLEVEL 3      │  [CODE]  [MISSION]  [TIPS]    TRIES: 2 │
│ GUARD ROSTER · Maps · Range │                                        │
├─────────────────────────────┤  11  func main() {                     │
│ 02:14:07  MAYA              │  12      guards := map[string]string{  │
│ ...floor 2 is clear now.    │  13      // TODO: add entries          │
│ bob's patrol ends in 4 mins │  14      }                             │
│                             │                                        │
│ 02:15:30  YOU               │                                        │
│ what format do you need?    │                                        │
│                             │                                        │
│ 02:15:44  MAYA              │                                        │
│ name → floor, string map.   │                                        │
│ hurry.              ▋       │                                        │
│─────────────────────────────│────────────────────────────────────────│
│ ▸ ask maya...          [TX] │  ⚡ +100 first try  [▸ SUBMIT · +200]  │
└─────────────────────────────┴────────────────────────────────────────┘
▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░  GUARD APPROACHING · 0:22  [RUSH]
```

### 11.3 HUD Layout (Mobile — Portrait)

```
┌──────────────────────────────────┐
│ SIGNAL  LV3 ██████░░  ⚡3  ●LIVE │  ← 40px top nav
├──────────────────────────────────┤
│ [CHAT]  [CODE]  [TIPS]  [MARKET] │  ← 36px tab bar
├──────────────────────────────────┤
│                                  │
│  02:15:44  MAYA                  │
│  ...floor 2 is clear.            │
│  guards. hurry.          ▋       │
│                                  │
│  ─────── NEW OBJECTIVE ──────    │  ← faded separator
│                                  │
│                                  │
│                                  │
│                                  │
├──────────────────────────────────┤
│ ▸ ask maya...               [TX] │  ← fixed bottom input
└──────────────────────────────────┘
▓▓▓▓▓▓░░░░  0:22                     ← 3px rush strip at top when typing
```

---

## 12. Technical Architecture

### 12.1 Stack

| Layer           | Technology                                             | Reason                                     |
| --------------- | ------------------------------------------------------ | ------------------------------------------ |
| Framework       | React 18 (JSX, hooks)                                  | Component model, state management          |
| Styling         | Inline styles + CSS keyframes                          | Zero build step, full control              |
| AI (primary)    | Chrome Prompt API (Gemini Nano)                        | Free, private, on-device                   |
| AI (fallback 1) | WebLLM — Phi-3.5-mini                                  | WebGPU acceleration, OpenAI-compatible API |
| AI (fallback 2) | Anthropic Claude API                                   | Highest quality, costs tokens              |
| Code eval       | LLM-based (Maya evaluates semantically)                | No sandboxed execution environment needed  |
| Storage         | `sessionStorage` (chat), `localStorage` (progress, XP) | No backend, privacy-preserving             |
| PWA             | Service Worker + `manifest.json`                       | Offline support, Add to Home Screen        |
| Fonts           | Google Fonts (Orbitron, JetBrains Mono)                | CDN-hosted                                 |

### 12.2 State Diagram (simplified)

```
intro → playing
         │
         ├─ chapter N (active)
         │      ├─ events fire (interrupt / rush / powercut)
         │      ├─ jeopardy accumulates
         │      ├─ code submitted → pass → twist reveal → chapter N+1
         │      │                          └─ boss? → boss encounter → pass → next act
         │      └─ energy hits 0 → checkpoint retry
         │
         └─ all chapters + final boss → win
```

### 12.3 Maya AI Backend Selection (runtime)

```javascript
// Evaluated once on game start
const MAYA_BACKEND = await detectMayaBackend();
// 'gemini-nano' | 'webllm' | 'anthropic-api'

async function askMaya(message, isCode = false) {
  switch (MAYA_BACKEND) {
    case "gemini-nano":
      return askGeminiNano(message, isCode); // chrome LanguageModel API
    case "webllm":
      return askWebLLM(message, isCode); // mlc-ai/web-llm Phi-3.5
    case "anthropic-api":
      return askAnthropic(message, isCode); // costs 1 token if chat
  }
}
```

### 12.4 Conversation Fade Implementation

```javascript
// Challenge boundary — called when advancing chapters
function advanceChapter(nextChallenge) {
  // 1. Mark all current messages as "previous"
  setMsgs((m) => m.map((msg) => ({ ...msg, era: "previous" })));

  // 2. Insert separator
  addMsg("SYS", "━━ NEW OBJECTIVE ━━", "separator");

  // 3. Create fresh LLM session (no previous context)
  resetLLMSession(nextChallenge);

  // 4. CSS handles the fade:
  //    .msg[data-era="previous"] { opacity: 0.05; transition: opacity 1.5s; }
  //    On mobile: height: 0; overflow: hidden;
}
```

### 12.5 Vim Mode Implementation

Vim mode is a state machine layered over the `<textarea>`:

```
states: NORMAL | INSERT | VISUAL
keydown interceptor:
  if INSERT: default textarea behaviour (except Esc → NORMAL)
  if NORMAL: parse command buffer → execute → stay NORMAL
  if VISUAL: track selection + parse commands
```

The implementation intercepts `keydown` on the editor `<textarea>`. In NORMAL mode, it prevents default and routes through a command parser. Command buffer accumulates keystrokes (e.g., `c i "`) and executes on recognition.

### 12.6 Syntax Highlighter

A pure function that takes Go source text and returns HTML with `<span>` tags. Runs on every keystroke, debounced at 150ms. The textarea remains plain text; a `<div>` overlaid with `pointer-events: none` renders the highlighted version. The textarea and div are scroll-synced via `onScroll`.

```
tokenize(code: string) → Token[]
  - regex-based, single pass
  - handles nested template literals
  - GO_KEYWORDS: Set<string> for O(1) lookup
  - returns { type, value, start, end }[]

render(tokens: Token[]) → string (HTML)
  - maps type → span colour
  - escapes HTML entities first
```

### 12.7 Mobile Keyboard Detection

```javascript
// visualViewport API for accurate keyboard height detection
window.visualViewport?.addEventListener("resize", () => {
  const kbHeight = window.innerHeight - visualViewport.height;
  setKeyboardHeight(kbHeight); // drives bottom padding on chat input
});
```

---

_SIGNAL Game Design Document · End of v1.0_
_Next: v1.1 will add Act II boss detailed encounter spec, audio/sfx brief, and localisation notes._
