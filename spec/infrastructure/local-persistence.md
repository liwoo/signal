# Local Persistence Spec

## Purpose

Store game state client-side using `sessionStorage` (ephemeral) and `localStorage` (durable) for offline-first play. Local persistence is the primary storage layer through Act I-III (Chapters 1-9). Global persistence (Supabase) takes over from Act IV onward.

---

## Storage Strategy

| Store | Data | Lifetime | Sync to Supabase? |
| --- | --- | --- | --- |
| `sessionStorage` | Chat messages, current editor content, LLM session state | Browser tab lifetime | No |
| `localStorage` | Progress, XP, level, energy, unlocks, settings, AI tokens | Permanent (until cleared) | Yes (from Act IV / Chapter 10) |

## sessionStorage Schema

### Chat Messages

Key: `signal_chat_{challengeId}`

```json
{
  "messages": [
    {
      "id": "msg_001",
      "sender": "MAYA" | "YOU" | "SYS",
      "text": "floor 2 is clear now.",
      "timestamp": 1709654400000,
      "era": "current" | "previous"
    }
  ]
}
```

- Cleared when tab closes (by design — chat is ephemeral)
- On chapter advance: existing messages marked `era: "previous"`, not deleted
- Not sent to LLM on new chapter (fresh session per challenge)

### Editor State

Key: `signal_editor_{challengeId}`

```json
{
  "code": "package main\n\nfunc main() {\n\t// TODO\n}",
  "cursorLine": 3,
  "cursorCol": 8,
  "vimMode": "NORMAL" | "INSERT" | "VISUAL",
  "scrollTop": 0
}
```

- Persists across tab refreshes within a session
- Allows resuming mid-challenge if page reloads accidentally

### Active Jeopardy

Key: `signal_jeopardy_active`

```json
{
  "events": ["guard_entered", "power_reduced"],
  "scramblePositions": [14, 28, 55],
  "chatLockUntil": 1709654460000
}
```

## localStorage Schema

### Player Progress

Key: `signal_progress`

```json
{
  "version": 1,
  "currentAct": 2,
  "currentChapter": 5,
  "completedChapters": [1, 2, 3, 4],
  "bossesDefeated": ["lockmaster"],
  "kiraVerdict": null,
  "storyBranch": null,
  "checkpointData": {
    "chapter": 5,
    "energy": 65,
    "jeopardyCarryover": []
  }
}
```

### Player Stats

Key: `signal_stats`

```json
{
  "xp": 1847,
  "level": 4,
  "energy": 78,
  "energyMax": 100,
  "aiTokens": 5,
  "streak": 3,
  "streakMultiplier": 1.4,
  "totalAttempts": 42,
  "firstTryCount": 28,
  "totalPlayTimeMs": 3600000
}
```

### Unlocks

Key: `signal_unlocks`

```json
{
  "syntaxHighlighting": "timed",
  "syntaxHighlightTimeRemainingMs": 180000,
  "vimMode": true,
  "blackMarket": false,
  "permanentHighlighting": false,
  "ghostChannel": false,
  "extraEnergyCapacity": false
}
```

### Settings

Key: `signal_settings`

```json
{
  "vimModeEnabled": false,
  "fontSize": 12,
  "mayaBackend": "gemini-nano",
  "soundEnabled": true
}
```

### Black Market Purchases

Key: `signal_market`

```json
{
  "purchases": [
    { "item": "signal_boost", "timestamp": 1709654400000, "cost": 150 },
    { "item": "scramble_shield", "timestamp": 1709655000000, "cost": 100 }
  ],
  "activeEffects": ["scramble_shield"]
}
```

## Migration to Supabase

At the start of Chapter 10 (Act IV), or when user authenticates (whichever comes first):

1. Read all `signal_*` keys from localStorage
2. Upload to Supabase user profile (see `global-persistence.md`)
3. From this point, writes go to both localStorage AND Supabase
4. localStorage remains the read source (faster); Supabase is the backup
5. On new device login: Supabase data hydrates localStorage

### Conflict Resolution

If localStorage and Supabase disagree (e.g., played on two devices):

- **Higher XP wins** — player keeps their best progress
- **Union of completed chapters** — no chapter un-completes
- **Latest timestamp wins** for settings and unlocks

## Storage Limits

- sessionStorage: ~5MB per origin (more than enough)
- localStorage: ~5-10MB per origin
- Total expected usage: < 50KB for all game state
- No IndexedDB needed for game state (WebLLM uses IndexedDB for model cache separately)

## Data Integrity

- All writes wrapped in try/catch (private browsing may throw)
- Version field in progress schema enables future migrations
- Corrupt data detection: if JSON parse fails, offer "reset progress" prompt
- Never silently discard corrupt data — always surface to user
