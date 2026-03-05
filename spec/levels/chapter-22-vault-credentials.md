# Chapter 22 — Vault Credentials

**Act VIII · NEXUS Corporate HQ / Singapore**

## Go Concepts

- `golang.org/x/crypto/bcrypt` package
- Password hashing (`bcrypt.GenerateFromPassword`)
- Hash comparison (`bcrypt.CompareHashAndPassword`)
- Cost factors
- Timing-safe comparison (why bcrypt handles this)
- Weak password detection

## Story Context

Maya needs to secure the agent network's credentials. Plaintext passwords are a liability — if NEXUS captures the agent database, every identity is burned. She implements bcrypt hashing. But while testing, she runs NEXUS's own credential dump through her hasher — and discovers that GHOST's master password is embarrassingly weak.

## Challenge

Build a credential system with bcrypt hashing, password validation, and strength checking.

### Starter Code

```go
package main

import (
    "fmt"

    "golang.org/x/crypto/bcrypt"
)

// Build:
// 1. hashPassword(password string) -> (string, error)
//    Hash with bcrypt cost 12
//
// 2. checkPassword(hash, password string) -> bool
//    Compare hash against plaintext, return true if match
//
// 3. isStrongPassword(password string) -> bool
//    Must be 8+ chars, contain at least one uppercase, one digit
//
// Test with these credentials:
// Agent ALPHA: password "SecurePass99" -> should hash and verify
// Agent BRAVO: password "weak"         -> should fail strength check
// GHOST admin: password "ghost_admin"  -> check against stored hash

var ghostHash = "$2a$12$LJ3m4ys3Lg5Klr0Oj8Q3QOYfMTEVjZHRvOKy6t.r9M.s8S.KhASi"

func main() {
    // TODO: hash, verify, and strength-check the passwords above
}
```

### Expected Solution (reference)

```go
package main

import (
    "fmt"
    "unicode"

    "golang.org/x/crypto/bcrypt"
)

func hashPassword(password string) (string, error) {
    hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
    return string(hash), err
}

func checkPassword(hash, password string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}

func isStrongPassword(password string) bool {
    if len(password) < 8 {
        return false
    }
    hasUpper, hasDigit := false, false
    for _, c := range password {
        if unicode.IsUpper(c) {
            hasUpper = true
        }
        if unicode.IsDigit(c) {
            hasDigit = true
        }
    }
    return hasUpper && hasDigit
}

func main() {
    // Agent ALPHA
    hash, _ := hashPassword("SecurePass99")
    fmt.Println("ALPHA hash:", hash)
    fmt.Println("ALPHA verify:", checkPassword(hash, "SecurePass99"))
    fmt.Println("ALPHA strong:", isStrongPassword("SecurePass99"))

    // Agent BRAVO
    fmt.Println("BRAVO strong:", isStrongPassword("weak"))

    // GHOST admin
    fmt.Println("GHOST match:", checkPassword(ghostHash, "ghost_admin"))
}
```

### Acceptance Criteria

- Uses `bcrypt.GenerateFromPassword` with a cost factor >= 10
- Uses `bcrypt.CompareHashAndPassword` for verification
- Does NOT compare hashes directly (timing attack vulnerability)
- `isStrongPassword` checks length and character requirements
- Correctly identifies "ghost_admin" as matching the stored hash
- Correctly rejects weak passwords

## Timed Events

| Time | Event |
| --- | --- |
| T+20s | Rush Mode — "NEXUS credential dump detected. Secure passwords NOW." |

## Rush Mode

- **Duration:** 40 seconds
- **On expiry:** Jeopardy — Energy Drain (-20) + Signal Scramble

## XP

- **Base:** 350 XP
- **First-try bonus:** +175 XP
- **Par time:** 120s

## Hints

1. "`bcrypt.GenerateFromPassword([]byte(pass), 12)` — cost 12 is good. higher = slower but more secure." (-8 energy)
2. "`bcrypt.CompareHashAndPassword([]byte(hash), []byte(pass))` — returns nil on match, error on mismatch. never compare hashes with `==`." (-12 energy)
3. "loop through runes: `for _, c := range pass { if unicode.IsUpper(c) { hasUpper = true } }` — check all requirements." (-20 energy)

## Twist (post-completion)

One of the hashed passwords in NEXUS's credential dump matches "ghost_admin". GHOST's master password. The key to everything.

### Twist Display

- Lines:
  1. `> running NEXUS credential dump through bcrypt verify...`
  2. `> match found.`
  3. `> account: GHOST_ADMIN`
  4. `> password: ghost_admin`
  5. `> maya: the most powerful AI in the world...`
  6. `> maya: ...and its password is "ghost_admin".`
  7. `> dr. reeves [from singapore]: use it. now. before they change it.`

## UI State

- **Location label:** NEXUS HQ · CREDENTIAL VAULT
- **Concept label:** bcrypt · Password Hashing · Timing-safe Comparison
