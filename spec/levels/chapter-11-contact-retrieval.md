# Chapter 11 — Contact Retrieval

**Act IV · Server Farm**

## Go Concepts

- HTTP client (`net/http`)
- JSON parsing (`encoding/json`)
- String formatting (`fmt.Sprintf`)

## Story Context

Fetch the safe house contact's info from a live public API. Parse nested JSON structs to extract the address. But beware — the address has been tampered with.

## Challenge

Write a Go program that makes an HTTP GET request, parses the JSON response into structs, and identifies the correct contact information.

### Starter Code

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

// The API returns:
// {
//   "contact": {
//     "name": "Agent Marsh",
//     "locations": [
//       { "type": "primary", "address": "742 Evergreen Terrace" },
//       { "type": "backup", "address": "221B Baker Street" }
//     ]
//   },
//   "verified": true
// }

// Define structs to parse this JSON
// Fetch from the API
// Print the backup location address (primary has been tampered with)

type Location struct {
    // TODO
}

type Contact struct {
    // TODO
}

type Response struct {
    // TODO
}

func main() {
    // TODO: HTTP GET, parse JSON, find backup address
}
```

### Acceptance Criteria

- Defines structs with JSON tags (`json:"..."`)
- Uses `http.Get` or `http.NewRequest`
- Uses `json.NewDecoder` or `json.Unmarshal`
- Correctly navigates nested struct to find backup address
- Handles the response body close (`defer resp.Body.Close()`)

### Note on Evaluation

Since there's no real API in the browser, the LLM evaluates the code structure and logic rather than executing it. The challenge tests understanding of HTTP + JSON patterns.

## XP

- **Base:** 350 XP
- **First-try bonus:** +175 XP
- **Par time:** 180s

## Hints

1. "`type Location struct { Type string \\`json:\"type\"\\`; Address string \\`json:\"address\"\\` }`" (−8 energy)
2. "`resp, err := http.Get(url); defer resp.Body.Close(); json.NewDecoder(resp.Body).Decode(&data)`" (−12 energy)
3. "loop through `response.Contact.Locations`, find the one where `Type == \"backup\"`, print its Address." (−20 energy)

## Twist (post-completion)

The contact's primary address in the API response is wrong. Someone has tampered with it. Vasik is watching the network.

### Twist Display

- Lines:
  1. `> analyzing API response...`
  2. `> PRIMARY ADDRESS: COMPROMISED`
  3. `> network trace detected: vasik's terminal`
  4. `> maya: he's watching everything we do.`
  5. `> dr. reeves: then we use the backup. move fast.`

## Timed Events

| Time | Event |
| --- | --- |
| T+20s | Rush Mode — "Network trace detected" |

## Rush Mode

- **Duration:** 45 seconds
- **On expiry:** Jeopardy — Energy Drain (−20) + Guard Enters

## UI State

- **Location label:** SERVER FARM · NETWORK TERMINAL
- **Concept label:** HTTP Client · JSON · String Formatting
