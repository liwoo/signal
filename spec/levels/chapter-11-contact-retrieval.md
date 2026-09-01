# Chapter 11 — Contact Retrieval

**Act IV · Exit Corridor · Network Uplink Closet**

## Go Concepts

- JSON decoding (`encoding/json`, `json.Unmarshal`)
- Struct tags (`json:"..."`)
- Nested structs and slices of structs
- HTTP client (`http.Get`, response body, status codes)
- `defer resp.Body.Close()` pattern
- `io.ReadAll`
- Validating untrusted data

## Story Context

The countdown clock is armed and the exit corridor is mapped. One thing is missing: where to run TO. The safe house contact — codename FERRYMAN — publishes an encrypted manifest on a dead-drop relay server. Maya has to fetch it over the building's own uplink and parse the nested JSON before the next network audit sweeps the closet she's hiding in. One wrong field and they walk out of the building into nothing. And Vasik is watching the network — anything fetched can be tampered with in flight.

## Challenge

Fetch FERRYMAN's contact manifest from the relay, decode the nested JSON into Go structs, and validate the addresses against known-safe districts.

### Steps

#### Step 0: Scaffold

Same as always — `package main`, imports, `func main()`, print "uplink ready".

Imports needed: `"encoding/json"`, `"fmt"`, `"io"`, `"net/http"`, `"strings"`

#### Step 1: Decode a Location

Define the struct and write `func parseLocation(data []byte) (Location, error)`:

```go
type Location struct {
    Type    string `json:"type"`
    Address string `json:"address"`
}
```

Key teaching moment: struct tags map JSON keys to Go fields — without the tag, `json.Unmarshal` matches only exported names case-insensitively; with it, the mapping is explicit and survives renames. `Unmarshal` takes a pointer (`&loc`) so it can fill the struct in place. Corrupt JSON returns an error — Maya's channel drops frames, so the error path is not optional.

```go
func parseLocation(data []byte) (Location, error) {
    var loc Location
    if err := json.Unmarshal(data, &loc); err != nil {
        return Location{}, err
    }
    return loc, nil
}
```

Test harness:
```go
func main() {
    raw := []byte(`{"type":"backup","address":"Unit 6, Rell Foundry, District 7"}`)
    loc, err := parseLocation(raw)
    if err != nil {
        fmt.Println("parse error:", err)
        return
    }
    fmt.Println(loc.Type, "->", loc.Address)

    _, err = parseLocation([]byte(`{"type":`))
    fmt.Println("corrupt frame rejected:", err != nil)
}
```

Expected output:
```
backup -> Unit 6, Rell Foundry, District 7
corrupt frame rejected: true
```

#### Step 2: Decode the Nested Manifest

FERRYMAN's manifest nests a contact with multiple locations. Define the outer structs and write `func parseManifest(data []byte) (Manifest, error)`:

```go
type Contact struct {
    Name      string     `json:"name"`
    Locations []Location `json:"locations"`
}

type Manifest struct {
    Contact  Contact `json:"contact"`
    Verified bool    `json:"verified"`
}
```

Key teaching moment: nested JSON maps to nested structs one-to-one — `[]Location` decodes a JSON array of objects with zero extra code. This is Go's whole JSON story: model the shape, unmarshal once, walk the fields. No manual traversal.

```go
func parseManifest(data []byte) (Manifest, error) {
    var m Manifest
    if err := json.Unmarshal(data, &m); err != nil {
        return Manifest{}, err
    }
    return m, nil
}
```

Test harness:
```go
func main() {
    raw := []byte(`{
        "contact": {
            "name": "FERRYMAN",
            "locations": [
                {"type": "primary", "address": "14 Kanal Street, Pier 9"},
                {"type": "backup", "address": "Unit 6, Rell Foundry, District 7"}
            ]
        },
        "verified": true
    }`)
    m, err := parseManifest(raw)
    if err != nil {
        fmt.Println("parse error:", err)
        return
    }
    fmt.Println("contact:", m.Contact.Name)
    fmt.Println("verified:", m.Verified)
    for _, loc := range m.Contact.Locations {
        fmt.Println(loc.Type, "->", loc.Address)
    }
}
```

Expected output:
```
contact: FERRYMAN
verified: true
primary -> 14 Kanal Street, Pier 9
backup -> Unit 6, Rell Foundry, District 7
```

#### Step 3: Fetch From the Relay

Write `func fetchManifest(url string) (Manifest, error)` that GETs the relay URL, checks the status code, reads the body, and parses it.

Key teaching moment: three rules of the Go HTTP client. One — `http.Get` returning `nil` error does NOT mean success; a 503 is a "successful" response. Check `resp.StatusCode`. Two — always `defer resp.Body.Close()` immediately after the error check, or connections leak (callback to ch07's defer). Three — `io.ReadAll(resp.Body)` gives you the bytes; then it's Step 2's problem.

```go
func fetchManifest(url string) (Manifest, error) {
    resp, err := http.Get(url)
    if err != nil {
        return Manifest{}, err
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        return Manifest{}, fmt.Errorf("relay returned %d", resp.StatusCode)
    }
    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return Manifest{}, err
    }
    return parseManifest(body)
}
```

Test harness (engine appends — an in-process `httptest` relay stands in for the dead drop; add `"net/http/httptest"` to imports):
```go
func main() {
    relay := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        fmt.Fprint(w, `{"contact":{"name":"FERRYMAN","locations":[{"type":"primary","address":"14 Kanal Street, Pier 9"},{"type":"backup","address":"Unit 6, Rell Foundry, District 7"}]},"verified":true}`)
    }))
    defer relay.Close()

    m, err := fetchManifest(relay.URL)
    if err != nil {
        fmt.Println("fetch error:", err)
        return
    }
    fmt.Println("contact:", m.Contact.Name)
    fmt.Println("locations:", len(m.Contact.Locations))

    down := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusServiceUnavailable)
    }))
    defer down.Close()
    _, err = fetchManifest(down.URL)
    fmt.Println("dead relay rejected:", err != nil)
}
```

Expected output:
```
contact: FERRYMAN
locations: 2
dead relay rejected: true
```

#### Step 4: Validate Against Tampering

Vasik owns this network. Write `func validateLocation(loc Location, safeDistricts []string) error` that rejects any address outside the known-safe districts.

Key teaching moment: data that crossed a hostile network is input, not truth. Validation is a plain Go function — no framework. Return `nil` for clean, a descriptive error for anything else (callback to ch06's error patterns). `%q` in the error quotes the address for the log.

```go
func validateLocation(loc Location, safeDistricts []string) error {
    for _, d := range safeDistricts {
        if strings.Contains(loc.Address, d) {
            return nil
        }
    }
    return fmt.Errorf("address %q is outside safe districts — possible tamper", loc.Address)
}
```

Test harness:
```go
func main() {
    safe := []string{"District 7", "Pier 9"}
    good := Location{Type: "backup", Address: "Unit 6, Rell Foundry, District 7"}
    bad := Location{Type: "primary", Address: "Warehouse 2, Corvin Yard, District 4"}

    if err := validateLocation(good, safe); err != nil {
        fmt.Println("REJECT:", err)
    } else {
        fmt.Println("CLEAR:", good.Address)
    }
    if err := validateLocation(bad, safe); err != nil {
        fmt.Println("REJECT:", err)
    } else {
        fmt.Println("CLEAR:", bad.Address)
    }
}
```

Expected output:
```
CLEAR: Unit 6, Rell Foundry, District 7
REJECT: address "Warehouse 2, Corvin Yard, District 4" is outside safe districts — possible tamper
```

That District 4 address is the tamper. FERRYMAN's real primary was Pier 9 — someone rewrote it in flight to walk Maya into a trap.

### Acceptance Criteria

- Structs use `json:"..."` tags matching the manifest keys exactly
- `parseLocation` / `parseManifest` pass `&target` to `json.Unmarshal` and propagate errors
- `fetchManifest` checks `resp.StatusCode`, defers `resp.Body.Close()`, uses `io.ReadAll`
- Non-200 responses return an error (no panic, no ignored status)
- `validateLocation` returns `nil` for safe addresses and a formatted error otherwise
- Required code: `json.Unmarshal`, `http.Get`, `defer resp.Body.Close()`, `io.ReadAll`, `strings.Contains`

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (parseLocation):** 90 base, +45 first-try
- **Step 2 (parseManifest):** 100 base, +50 first-try
- **Step 3 (fetchManifest):** 120 base, +60 first-try
- **Step 4 (validateLocation):** 90 base, +45 first-try
- **Total base:** 440
- **Par time:** 210s
- **Level timer:** 470s, game over on expiry

## Hints

### Step 1
1. "struct tags: `Type string \`json:\"type\"\`` — the tag string is the JSON key." (−5 energy)
2. "`json.Unmarshal(data, &loc)` — pass a POINTER or nothing gets filled." (−8 energy)
3. "check the error: `if err := json.Unmarshal(data, &loc); err != nil { return Location{}, err }`" (−12 energy)

### Step 2
1. "nest the structs the way the JSON nests: Manifest holds Contact holds []Location." (−5 energy)
2. "a JSON array of objects decodes straight into a slice of structs. no loop needed." (−8 energy)
3. "same shape as step 1: `var m Manifest; json.Unmarshal(data, &m)` — one call decodes the whole tree." (−12 energy)

### Step 3
1. "`http.Get(url)` returns `(*http.Response, error)`. a 503 is NOT an error — check `resp.StatusCode` yourself." (−8 energy)
2. "`defer resp.Body.Close()` right after the err check. always. leaked bodies leak connections." (−12 energy)
3. "read then reuse: `body, _ := io.ReadAll(resp.Body)` then hand off to `parseManifest(body)`." (−20 energy)

### Step 4
1. "loop the safe list, `strings.Contains(loc.Address, d)` — first match wins." (−8 energy)
2. "no match after the loop = tampered. build the error with `fmt.Errorf`." (−12 energy)
3. "`%q` quotes the address inside the error string. return nil on match, error after the loop." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Maya: "found the uplink closet. FERRYMAN's manifest is on the relay. pulling it now." |
| T+45s | Reeves: "The manifest is nested — contact, locations, verification flag. Model it exactly." |
| T+90s | System: `NETWORK AUDIT SWEEP — SECTOR 4 OF 9` |
| T+150s | GHOST: `OUTBOUND REQUEST LOGGED. SOURCE: UPLINK CLOSET 2.` |
| T+160s | Rush Mode — "Audit Sweep Approaching" |
| T+300s | VASIK: "Fetching directions, Ms. Chen? Do double-check the address." |
| T+310s | Rush Mode — "Verify Before He Rewrites It" |

## Rush Mode

- **Rush 1 (T+160s):** 60 seconds · up to +80 XP · on expiry: Jeopardy — Power Reduced (editor narrows; the closet's aux power is diverted to the audit)
- **Rush 2 (T+310s):** 50 seconds · up to +90 XP · on expiry: Jeopardy — Signal Scramble + Energy Drain (−20) (Vasik actively garbling the channel)

## Branch Variations

- **Trusted Kira (Ending A path):** Kira pre-signs the relay traffic. Rush windows are 15s longer, but the manifest gains a third nested level (`"escrow": {"holder": ..., "code": ...}`) the player must also model in Step 2.
- **Rejected Kira (Ending B path):** No inside help — rush windows as listed, lockdown chatter in events — but the manifest stays two levels deep as shown.

## Twist

Post-completion. The validator flags FERRYMAN's primary address — it was rewritten in transit. Vasik wasn't guessing; he already owns the route they were about to take.

### Twist Display

- Lines:
  1. `> manifest fetched. verification flag: TRUE`
  2. `> validating primary address...`
  3. `> REJECT: "Warehouse 2, Corvin Yard, District 4" — outside safe districts`
  4. `> ferryman's primary was PIER 9. someone rewrote it in flight.`
  5. `> vasik: "You'd have liked District 4. Very quiet. Very few exits."`
  6. `> maya: we use the backup. rell foundry. tell no one on this channel.`
  7. `> reeves: "Then we stop trusting this network. Completely."`

## UI State

- **Location label:** EXIT CORRIDOR · UPLINK CLOSET 2
- **Concept label:** JSON · Struct Tags · HTTP Client
- **Visual state:** Dim service-closet lighting, network traffic monitor strip in the top bar (packets tick on fetch), audit-sweep sector counter
- **Audio:** facility-hum ambient, terminal-beep on fetch, warning-beep on audit events, dread-sting on the Vasik chat lines

## Teaching Notes

### The client side, before the server side

This is the player's only HTTP **client** chapter — Part II flips them to the server side (ch13+). Landing `http.Get` → status check → `defer Close` → `io.ReadAll` → `Unmarshal` as one reflexive sequence here pays off for the whole web arc.

### Struct tags are the contract

The manifest's field names (`type`, `address`) are lowercase — unexported in Go terms — so tags aren't decoration here, they're the only way the mapping works. This makes the lesson concrete instead of cargo-cult.

### Errors as the plot

Every error path in this chapter is a story beat: corrupt frames (dropped packets), a 503 (dead relay), a failed validation (Vasik's tamper). The chapter argues Go's position — errors are values you route, not exceptions you pray about — through fiction where ignoring one gets Maya caught.

### Validation callback and foreshadow

`validateLocation` reuses ch04.3's `strings.Contains` in a security posture. It's deliberately the same muscle the player will use for input sanitization in ch17 and origin checks in ch23 — the "never trust the wire" thread starts here.
