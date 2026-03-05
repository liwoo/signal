# Chapter 23 — Live Wire

**Act IX · Global / Distributed Signal Network**

## Go Concepts

- WebSocket protocol (upgrade from HTTP)
- `gorilla/websocket` package
- WebSocket upgrader configuration
- Bidirectional messaging (read/write loops)
- Connection management (ping/pong, close handling)
- Broadcasting to multiple clients

## Story Context

This is it. Maya has the evidence, GHOST's master password, and agents in 14 countries. She needs real-time communication with all of them simultaneously — WebSockets. One persistent connection per agent. Bidirectional. The ground relay for PANOPTICON is the target. But GHOST is listening too.

## Challenge

Build a WebSocket server that accepts connections, broadcasts messages to all connected clients, and handles disconnections gracefully.

### Starter Code

```go
package main

import (
    "fmt"
    "log"
    "net/http"
    "sync"

    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        // TODO: validate origin
        return true
    },
}

// Connected clients
var (
    clients   = make(map[*websocket.Conn]string) // conn -> agentID
    clientsMu sync.Mutex
)

// Build:
// 1. /ws endpoint that upgrades HTTP to WebSocket
// 2. Read loop: receive messages from each client
// 3. Broadcast: send received messages to ALL connected clients
// 4. Handle disconnection: remove client from map on close
// 5. /broadcast endpoint (POST): send a message to all connected clients

func wsHandler(w http.ResponseWriter, r *http.Request) {
    // TODO: upgrade connection
    // TODO: register client
    // TODO: read loop with broadcast
}

func broadcast(message string) {
    // TODO: send to all clients
}

func main() {
    http.HandleFunc("/ws", wsHandler)
    log.Println("WebSocket server on :8080")
    http.ListenAndServe(":8080", nil)
}
```

### Expected Solution (reference)

```go
package main

import (
    "fmt"
    "log"
    "net/http"
    "sync"

    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true // In production, validate origin
    },
}

var (
    clients   = make(map[*websocket.Conn]string)
    clientsMu sync.Mutex
)

func broadcast(message string) {
    clientsMu.Lock()
    defer clientsMu.Unlock()
    for conn, agentID := range clients {
        err := conn.WriteMessage(websocket.TextMessage, []byte(message))
        if err != nil {
            log.Printf("Error sending to %s: %v", agentID, err)
            conn.Close()
            delete(clients, conn)
        }
    }
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println("Upgrade error:", err)
        return
    }
    defer conn.Close()

    agentID := r.URL.Query().Get("agent")
    if agentID == "" {
        agentID = "UNKNOWN"
    }

    clientsMu.Lock()
    clients[conn] = agentID
    clientsMu.Unlock()

    log.Printf("Agent %s connected", agentID)
    broadcast(fmt.Sprintf("AGENT %s ONLINE", agentID))

    for {
        _, msg, err := conn.ReadMessage()
        if err != nil {
            log.Printf("Agent %s disconnected", agentID)
            clientsMu.Lock()
            delete(clients, conn)
            clientsMu.Unlock()
            break
        }
        broadcast(fmt.Sprintf("[%s] %s", agentID, string(msg)))
    }
}

func main() {
    http.HandleFunc("/ws", wsHandler)
    log.Println("WebSocket server on :8080")
    http.ListenAndServe(":8080", nil)
}
```

### Acceptance Criteria

- Uses `upgrader.Upgrade(w, r, nil)` to upgrade HTTP to WebSocket
- Stores connections in a map with mutex protection
- Read loop using `conn.ReadMessage()` in a for loop
- Broadcasts messages to all connected clients
- Handles disconnection: removes client from map on error
- Uses `defer conn.Close()`
- Mutex protects concurrent access to clients map

## Timed Events

| Time | Event |
| --- | --- |
| T+5s | Agents start connecting: "3... 7... 12..." |
| T+20s | Connection from `GHOST-NODE-01` — GHOST is listening |
| T+25s | Rush Mode — "GHOST attempting to flood websocket connections" |

## Rush Mode

- **Duration:** 50 seconds
- **On expiry:** Jeopardy — Signal Scramble + Energy Drain (-20) + Power Reduced (triple stack)

## XP

- **Base:** 450 XP
- **First-try bonus:** +225 XP
- **Par time:** 180s

## Hints

1. "`conn, err := upgrader.Upgrade(w, r, nil)` — upgrades the HTTP connection to a WebSocket. returns a `*websocket.Conn`." (-8 energy)
2. "read loop: `for { _, msg, err := conn.ReadMessage(); if err != nil { break } }` — blocks until message or close." (-12 energy)
3. "broadcast: lock mutex, loop over all clients, `conn.WriteMessage(websocket.TextMessage, []byte(msg))`, remove on error." (-20 energy)

## Twist (post-completion)

GHOST floods the server with 10,000 fake connections. Connection validation becomes critical.

### Twist Display

- Lines:
  1. `> websocket server active. 14 agents connected.`
  2. `> ...`
  3. `> connection surge detected.`
  4. `> connections: 347... 2,891... 10,000+`
  5. `> maya: ghost is flooding us.`
  6. `> maya: we need to validate every connection.`
  7. `> maya: origin checks. rate limits. everything we've built.`

## UI State

- **Location label:** GLOBAL SIGNAL NETWORK · LIVE
- **Concept label:** WebSockets · gorilla/websocket · Broadcasting
- **Visual:** Live connection counter ticking up in the HUD
- **Atmosphere:** Urgency. The endgame is here.
