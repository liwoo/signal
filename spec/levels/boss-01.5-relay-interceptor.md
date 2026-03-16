# Boss — The Relay Interceptor

**Act II · Floor 2 · Comms Room**

## Go Concepts (Application)

- Maps (lookup, iteration)
- Slices (append, filtering)
- Strings (reversal, Contains, HasPrefix, Replace, ToLower)
- sort.Slice (custom comparison)
- strconv (Atoi, Itoa)
- Range

Comprehensive application of ch04, ch04.2, and ch04.3 concepts.

## Story Context

GHOST detects the cipher relay. It deploys the Relay Interceptor — an AI counter-program that jams their comms by flooding the channel with garbage data, scrambled headers, and decoy messages. Maya needs to decode, filter, sort, and reconstruct the real messages from the noise. Each wave gets harder. If she can't clear the relay buffer in time, GHOST traces their location.

Reeves: "It's flooding the channel. You need to separate signal from noise — fast."

## Mechanic

### Layout

```
┌──────────────────────────────────────────────────────┐
│    RELAY INTERCEPTOR · COMMS ROOM · WAVE 1/4          │
├─────────────────────────┬────────────────────────────┤
│  INCOMING BUFFER        │  YOUR SOLUTION              │
│  (read-only)            │                            │
│                         │                            │
│  [scrambled messages     │  // Process the buffer     │
│   and relay data         │  // Filter, decode, sort   │
│   shown here]            │                            │
│                         │                            │
├─────────────────────────┴────────────────────────────┤
│ ██████████░░░░░░  RELAY BUFFER · WAVE 1 · 0:45        │
└──────────────────────────────────────────────────────┘
```

Split-pane: left shows incoming data (read-only), right is the editor. Each wave presents new data and a new processing task.

### Wave Structure

**Wave 1 — Decode (35s)**
Left pane shows 5 encoded messages (reversed words from ch04.2 cipher). Player writes a decode function and prints the decoded messages.

```
Input buffer:
evom ot roolf 3
raelc htap devresbo
draug noitats ta roolf 1
yaler evitca
tixe etuor demrifnoc
```

Player must write reverseWord + decode to produce:
```
move to floor 3
clear path observed
guard station at floor 1
relay active
exit route confirmed
```

**Wave 2 — Filter + Clean (40s)**
Left pane shows 8 messages, some are GHOST decoys (contain "[GHOST]" or start with "NOISE:"). Player must filter out decoys, clean the real messages (lowercase, redact "ghost"), and print only real ones.

```
Input buffer:
URGENT: backup team ready
NOISE: asdkjf29fj
[GHOST] trace initiated
move to extraction point
NOISE: !!##@@
floor 4 clear confirmed
[GHOST] location locked
PRIORITY: alpha team standby
```

Player filters + cleans to produce:
```
urgent: backup team ready
move to extraction point
floor 4 clear confirmed
priority: alpha team standby
```

**Wave 3 — Sort + Header (45s)**
Left pane shows 6 relay messages with numeric priority codes as strings. Player must parse the codes with strconv.Atoi, sort by priority (lowest number first), and format with relay headers.

```
Input buffer:
"exit confirmed" code:"30"
"guard spotted" code:"5"
"path blocked" code:"15"
"all clear" code:"50"
"backup needed" code:"3"
"relay stable" code:"25"
```

Player sorts by code value and formats as:
```
F2-C6 backup needed
F2-C10 guard spotted
F2-C30 path blocked
F2-C50 exit confirmed
F2-C60 relay stable
F2-C100 all clear
```

(Each code is doubled per ch04.2's relayHeader pattern)

**Wave 4 — Combine All (50s)**
Left pane shows a mix: some encoded, some with decoys, all needing sort. Player must decode → filter → sort → format. This wave combines everything.

```
Input buffer:
"evom ot roolf 4" code:"10"
"[GHOST] ekaf egassem" code:"99"
"NOISE: corrupted" code:"0"
"raelc rof noitcartxe" code:"5"
"draug nwod" code:"20"
"[GHOST] gnikcolb" code:"1"
```

Player decodes, filters (removing GHOST/NOISE), sorts by code, formats:
```
F2-C10 clear for extraction
F2-C20 move to floor 4
F2-C40 guard down
```

### Timer

Each wave has its own countdown. Total encounter: ~170s across all waves. No hearts/lives — this is a speed/skill challenge, not a combat boss.

### Failure

If any wave timer expires: Jeopardy — Relay Traced. GHOST narrows location. Player gets one retry per wave (costs 10 energy). Second failure on same wave: boss fails, player retries from wave 1.

### Victory

Clearing all 4 waves defeats the Interceptor. GHOST loses the trace. Relay is secured for the rest of Act II.

## XP

- **Wave 1:** 100 base, +50 speed bonus
- **Wave 2:** 120 base, +60 speed bonus
- **Wave 3:** 120 base, +60 speed bonus
- **Wave 4:** 160 base, +80 speed bonus
- **Total possible:** 750 XP

## Timed Events

| Time | Event |
| --- | --- |
| Wave 1 start | Reeves: "First batch coming in. Decode them — you know the cipher." |
| Wave 2 start | Maya: "GHOST is injecting decoys. filter the noise." |
| Wave 3 start | Reeves: "Messages are out of order. Sort by priority or we miss the window." |
| Wave 4 start | System: "FINAL WAVE — FULL PROCESSING REQUIRED" |
| Any wave T-10s | Warning: "RELAY BUFFER CRITICAL" |

## Twist

After clearing wave 4, the last decoded message reads: `"K. VOLKOV — INSIDE — FLOOR 3"`. Maya and Reeves freeze. Volkov from the guard roster... is Kira. She's inside the building, wearing a guard uniform. This sets up the ch06 reveal.

## UI State

- **Location label:** FLOOR 2 · COMMS ROOM
- **Concept label:** Relay Interceptor
- **Visual state:** Split-pane editor, wave progress indicator, relay buffer bar (fills as time runs out), incoming data stream animation on left pane
- **Audio:** tension-drone ambient, warning-beep on wave transitions, alert-beep at T-10s

## Teaching Notes

### Application boss, not a new concept boss

This boss introduces zero new concepts. Every function the player writes uses tools from ch04, ch04.2, and ch04.3. The challenge is combining them under time pressure. This tests mastery, not memorization.

### Progressive complexity

Wave 1 is just decode (one skill). Wave 2 is filter + clean (two skills). Wave 3 is sort + format (two skills). Wave 4 is all four combined. Each wave adds one layer. The player builds confidence before the final challenge.

### Different boss format

Boss-01 (Lockmaster) was combat. Boss-02 (Vasik) is debugging. This boss is data processing — waves of real-time input. Three different boss formats keeps the game fresh.
