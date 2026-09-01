# Chapter 22 — Vault Credentials

**Act VIII · NEXUS Corporate HQ · Singapore (Mirror Server)**

## Go Concepts

- Password hashing with `bcrypt` (`golang.org/x/crypto/bcrypt`)
- `bcrypt.GenerateFromPassword`, `bcrypt.CompareHashAndPassword`
- Salted hashes (why the same password hashes differently every time)
- Timing-safe comparison (why you never `==` a hash)
- Weak-password rejection and breach-list checks
- Composing validation → hash → store into a registration flow

## Story Context

Reeves is inside NEXUS HQ and the agent network is about to grow — dozens of new operatives need credentials on the mirror, and NEXUS is actively dumping stolen password databases onto the network to seed the mirror with weak accounts they can crack. Maya has to build the credential store right: hash every password with bcrypt so a stolen store is useless, reject weak and breached passwords at registration, and verify logins in constant time so an attacker can't measure their way in. Then she runs the new agents' passwords against NEXUS's own leaked dump — and one hash matches a plaintext she recognizes.

## Challenge

Build the credential store: hash with bcrypt, verify safely, reject weak/breached passwords, and wire it into a registration flow.

**Playground note:** `golang.org/x/crypto/bcrypt` is fetchable in the sandbox. bcrypt hashes are **salted** — the same password produces a different hash every run — so hashes are never printed or compared as expected output. All graded output is PASS/FAIL of verification and validation, which *is* deterministic.

### Steps

#### Step 0: Scaffold

`package main`, imports, `func main()`, print "credential store ready".

Imports needed: `"fmt"`, `"strings"`, `"golang.org/x/crypto/bcrypt"`

#### Step 1: Hash and Verify

Write `hashPassword(pw string) ([]byte, error)` and `checkPassword(hash []byte, pw string) bool`.

Key teaching moment: never store a plaintext password, and never store a plain hash (`sha256`) either — bcrypt is *designed* to be slow and salted, so a stolen store can't be brute-forced cheaply. `GenerateFromPassword` salts and hashes; `CompareHashAndPassword` returns `nil` on a match (an error otherwise). You compare through that function, never with `==` — that's the timing-safe check.

```go
func hashPassword(pw string) ([]byte, error) {
    return bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
}

func checkPassword(hash []byte, pw string) bool {
    return bcrypt.CompareHashAndPassword(hash, []byte(pw)) == nil
}
```

Test harness:
```go
func main() {
    hash, _ := hashPassword("Str0ngPass!")
    fmt.Println("correct password accepted:", checkPassword(hash, "Str0ngPass!"))
    fmt.Println("wrong password rejected:", !checkPassword(hash, "guess"))
}
```

Expected output:
```
correct password accepted: true
wrong password rejected: true
```

#### Step 2: Prove the Salt

Show that the same password hashes to two different values, and both still verify.

Key teaching moment: this is the property that makes bcrypt safe — the random salt means two agents with the same password have different stored hashes, so an attacker can't tell, and precomputed "rainbow tables" are useless. The hashes *differ* but both *verify*, because the salt is stored inside the hash and `CompareHashAndPassword` reads it back out.

```go
func main() {
    h1, _ := hashPassword("Str0ngPass!")
    h2, _ := hashPassword("Str0ngPass!")
    fmt.Println("salted (hashes differ):", string(h1) != string(h2))
    fmt.Println("both verify:", checkPassword(h1, "Str0ngPass!") && checkPassword(h2, "Str0ngPass!"))
}
```

Expected output:
```
salted (hashes differ): true
both verify: true
```

(The hashes themselves are never printed — only the booleans, which are deterministic.)

#### Step 3: Reject Weak & Breached Passwords

Write `func isWeak(pw string) error` — reject anything on NEXUS's breach dump first, then too-short, then no-uppercase.

Key teaching moment: hashing a bad password just gives you a well-protected bad password. Validation at registration is the other half. Order the checks so the most important reason wins: a breached password is rejected *as breached* even if it would also fail another rule (that's the reason worth reporting). The breach set is a `map[string]bool` — the same set-membership idiom as ch17's op types.

```go
var breachList = map[string]bool{
    "password": true, "ghost_admin": true, "12345678": true, "letmein": true,
}

func isWeak(pw string) error {
    if breachList[strings.ToLower(pw)] {
        return fmt.Errorf("found in NEXUS breach dump")
    }
    if len(pw) < 8 {
        return fmt.Errorf("too short (min 8)")
    }
    if strings.ToLower(pw) == pw {
        return fmt.Errorf("needs an uppercase letter")
    }
    return nil
}
```

Test harness:
```go
func main() {
    for _, pw := range []string{"Str0ngPass!", "short", "alllowercase", "ghost_admin"} {
        if err := isWeak(pw); err != nil {
            fmt.Printf("REJECT %q: %v\n", pw, err)
        } else {
            fmt.Printf("ACCEPT %q\n", pw)
        }
    }
}
```

Expected output:
```
ACCEPT "Str0ngPass!"
REJECT "short": too short (min 8)
REJECT "alllowercase": needs an uppercase letter
REJECT "ghost_admin": found in NEXUS breach dump
```

`ghost_admin` is on the breach list. Remember that.

#### Step 4: The Registration Flow

Write `func register(pw string) (string, error)` that validates first, then hashes — returning the stored hash string or the validation error.

Key teaching moment: the correct order is validate → hash → store. Validating first means you never spend the (deliberately expensive) bcrypt cost on a password you're going to reject anyway, and a weak password never reaches the store. This is the shape of every real signup handler.

```go
func register(pw string) (string, error) {
    if err := isWeak(pw); err != nil {
        return "", err
    }
    h, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
    if err != nil {
        return "", err
    }
    return string(h), nil
}
```

Test harness:
```go
func main() {
    h, err := register("Str0ngPass!")
    fmt.Println("register ok:", err == nil)
    fmt.Println("stored hash verifies:", bcrypt.CompareHashAndPassword([]byte(h), []byte("Str0ngPass!")) == nil)

    _, err2 := register("ghost_admin")
    fmt.Println("weak rejected:", err2 != nil, "-", err2)
}
```

Expected output:
```
register ok: true
stored hash verifies: true
weak rejected: true - found in NEXUS breach dump
```

### Acceptance Criteria

- Uses `bcrypt.GenerateFromPassword` and `bcrypt.CompareHashAndPassword` (never `==` on hashes)
- No hash value is ever printed (only booleans / PASS-FAIL)
- `isWeak` checks the breach list first, then length, then uppercase
- `register` validates before hashing and returns the error on weak input
- Required code: `bcrypt.GenerateFromPassword`, `bcrypt.CompareHashAndPassword`, `bcrypt.DefaultCost`, a breach-list map

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (hash + verify):** 110 base, +55 first-try
- **Step 2 (prove salt):** 90 base, +45 first-try
- **Step 3 (weak/breach rejection):** 120 base, +60 first-try
- **Step 4 (registration flow):** 110 base, +55 first-try
- **Total base:** 470
- **Par time:** 250s
- **Level timer:** 520s, game over on expiry

## Hints

### Step 1
1. "`bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)` returns `([]byte, error)`." (−8 energy)
2. "verify with `bcrypt.CompareHashAndPassword(hash, []byte(pw))` — nil error means match." (−12 energy)
3. "return `bcrypt.CompareHashAndPassword(...) == nil` as the bool. never compare hashes with ==." (−16 energy)

### Step 2
1. "hash the same password twice into h1, h2." (−8 energy)
2. "`string(h1) != string(h2)` is true — the salt differs each call." (−12 energy)
3. "both still verify because the salt is embedded in the hash. print the booleans, never the hashes." (−16 energy)

### Step 3
1. "breach check FIRST: `if breachList[strings.ToLower(pw)] { return err }`." (−8 energy)
2. "then length `< 8`, then `strings.ToLower(pw) == pw` for missing uppercase." (−12 energy)
3. "order = which reason wins. a breached password should say 'breached', not 'too short'." (−20 energy)

### Step 4
1. "validate before hashing: `if err := isWeak(pw); err != nil { return \"\", err }`." (−8 energy)
2. "only hash if validation passed — don't spend bcrypt cost on a reject." (−12 energy)
3. "return `string(h)` on success, the validation error on failure." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Reeves: "New agents need credentials. Hash everything. Reject anything NEXUS could already know." |
| T+80s | Maya: "bcrypt store's up. salted, verified. a stolen dump would be worthless." |
| T+150s | System: `INBOUND — NEXUS CREDENTIAL DUMP · 40,000 HASHED PAIRS` |
| T+160s | Rush Mode — "Secure Passwords Before The Dump Seeds Weak Accounts" |
| T+300s | GHOST: `YOU HASH THEIRS. HAVE YOU CHECKED WHOSE PASSWORD MATCHES MINE?` |
| T+340s | Rush Mode — "Cross-Check Against The Breach Dump" |

## Rush Mode

- **Rush 1 (T+160s):** 50 seconds · up to +90 XP · on expiry: Jeopardy — Signal Scramble
- **Rush 2 (T+340s):** 45 seconds · up to +100 XP · on expiry: Jeopardy — Energy Drain (−20) + Hint Burned

## Twist

Post-completion. Maya cross-checks the new credentials against NEXUS's own leaked dump. One plaintext, recovered from NEXUS's side, matches.

### Twist Display

- Lines:
  1. `> cross-referencing new agents against nexus breach dump...`
  2. `> no agent passwords compromised. store is clean.`
  3. `> but one plaintext in nexus's OWN dump decoded:`
  4. `> account: root@nexus-hq · password: "ghost_admin"`
  5. `> maya: that's GHOST's master password. it's in their own leaked data.`
  6. `> reeves: "Then GHOST has an account. GHOST has a login. GHOST can be locked OUT."`
  7. `> ghost: THAT PASSWORD OPENS EVERYTHING. INCLUDING THE DOOR YOU CAME IN.`

The design.md ch22 payoff: `ghost_admin` — GHOST's master password, the key to the endgame — surfaces from NEXUS's own breach dump, the exact string the player's breach list rejected in Step 3.

## UI State

- **Location label:** NEXUS HQ · MIRROR SERVER
- **Concept label:** bcrypt · Password Hashing · Breach Check
- **Visual state:** Credential-store panel (agent · "••••" · hashed ✓), a breach-dump cross-reference monitor that lights the `ghost_admin` match red, cost-factor indicator on hashing
- **Audio:** dark-drone-2 ambient, keypad-beep on registrations, warning-beep on the dump arrival, dread-sting on the ghost_admin reveal, heartbeat-fast under rush 2

## Teaching Notes

### bcrypt, and why not sha256

The single most important credential lesson: fast hashes (md5/sha) are *wrong* for passwords precisely because they're fast. bcrypt's deliberate slowness + salt is the whole point. Step 2 makes the salt observable (same input, different output, both verify) so the property is understood, not memorized. This is directly employable knowledge — most real password bugs are exactly this misunderstanding.

### Never print, never ==

Two hard rules enforced by the graded output shape: hashes are never printed (they're salted and nondeterministic — and printing them is a real logging vulnerability), and comparison always goes through `CompareHashAndPassword` (constant-time, unlike `==` which leaks length/prefix timing). The chapter can't grade a printed hash, which conveniently *is* the security rule.

### Validate before you hash

Step 4's ordering is both a security rule (weak passwords never reach the store) and a performance rule (don't pay bcrypt's cost to reject). The player learns that the *sequence* of a signup flow is itself a design decision — the same altitude of thinking as ch20's chain order.

### The breach list is the twist's setup

`ghost_admin` sits in the Step 3 breach list two steps before the twist names it as GHOST's master password. Players who wondered why that specific string was in the list get the answer as a gut-punch — the game's signature "the clue was in your own code" reveal, and the literal key that Act IX's finale turns against GHOST.

### Act VIII closes here

This is the last chapter before boss-08 (Vasik's middleware warfare) and the finale. The player now holds every Act VIII tool — middleware, chains, context, sessions, credentials — and, narratively, GHOST's password. The mirror is complete; the trap can be sprung.
