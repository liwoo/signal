# Analytics — Firebase Spec

## Purpose

Track player behavior, progression funnels, and engagement metrics to inform game balance and content decisions. Firebase Analytics (Google Analytics 4 under the hood) provides event-based tracking with no backend.

---

## Setup

```javascript
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";

const app = initializeApp({
  apiKey: "...",
  authDomain: "signal-game.firebaseapp.com",
  projectId: "signal-game",
  appId: "..."
});

const analytics = getAnalytics(app);
```

## Event Taxonomy

### Core Events

| Event | Parameters | When |
| --- | --- | --- |
| `game_start` | `{ backend: "gemini-nano" \| "webllm" \| "anthropic-api" }` | First load / new game |
| `chapter_start` | `{ act, chapter, title, energy, level }` | Chapter begins |
| `chapter_complete` | `{ act, chapter, title, xp_earned, attempts, time_ms, first_try }` | Correct submission |
| `chapter_fail` | `{ act, chapter, energy_at_fail, attempts }` | Energy hits 0 |
| `boss_start` | `{ boss_name, act }` | Boss encounter begins |
| `boss_complete` | `{ boss_name, act, time_ms, attempts, under_par }` | Boss defeated |
| `boss_fail` | `{ boss_name, act, attempts }` | Boss timer/energy depleted |

### Progression Events

| Event | Parameters | When |
| --- | --- | --- |
| `level_up` | `{ new_level, total_xp }` | Player levels up |
| `act_complete` | `{ act, total_time_ms, chapters_failed }` | All chapters in act done |
| `game_complete` | `{ ending: "a" \| "b", total_xp, total_time_ms, level }` | Final boss defeated |
| `kira_verdict` | `{ verdict: "trusted" \| "rejected", correct }` | Allegiance challenge resolved |

### Engagement Events

| Event | Parameters | When |
| --- | --- | --- |
| `hint_used` | `{ chapter, hint_number, energy_cost }` | Hint revealed |
| `ai_token_used` | `{ chapter, backend }` | ASK CLAUDE clicked |
| `rush_triggered` | `{ chapter, event_type }` | Rush mode activates |
| `rush_solved` | `{ chapter, time_remaining_ms }` | Solved during rush |
| `rush_expired` | `{ chapter, jeopardy_event }` | Rush timer ran out |
| `market_purchase` | `{ item, cost_xp, xp_remaining }` | Black Market buy |
| `vim_mode_toggle` | `{ enabled }` | Vim mode toggled |

### Retention Events

| Event | Parameters | When |
| --- | --- | --- |
| `session_start` | `{ returning, current_chapter, level }` | App opened |
| `session_end` | `{ duration_ms, chapters_completed }` | Tab closed / 30min idle |
| `auth_prompt_shown` | `{ chapter }` | Auth prompt displayed |
| `auth_completed` | `{ method: "google" \| "github" \| "email" }` | User signs in |
| `auth_skipped` | `{ chapter }` | User skips auth prompt |
| `pwa_install` | `{}` | Add to Home Screen accepted |

### Error Events

| Event | Parameters | When |
| --- | --- | --- |
| `llm_fallback` | `{ from, to, reason }` | LLM backend falls back |
| `llm_error` | `{ backend, error_type }` | LLM fails to respond |
| `storage_error` | `{ storage_type, error }` | localStorage/sessionStorage fails |
| `submission_error` | `{ chapter, error_type }` | Code eval fails unexpectedly |

## User Properties

Set once per user, updated when they change:

| Property | Value |
| --- | --- |
| `player_level` | Current level (1-8) |
| `current_act` | Current act (1-5) |
| `ai_backend` | Detected LLM backend |
| `vim_user` | Whether they've enabled Vim mode |
| `authenticated` | Whether signed in |
| `platform` | "desktop" / "tablet" / "mobile" |

## Key Funnels to Monitor

### Chapter Completion Funnel

```
Chapter 1 Start -> Chapter 1 Complete -> Chapter 2 Start -> ... -> Game Complete
```

Drop-off at each chapter reveals difficulty spikes or engagement cliffs.

### Auth Conversion Funnel

```
Chapter 10 Reached -> Auth Prompt Shown -> Auth Completed
                                        -> Auth Skipped
```

### Hint Dependency

Track hint usage rate per chapter. High hint usage = chapter may be too hard or under-explained.

## Privacy

- No PII collected — Firebase anonymous IDs only
- If user authenticates, Firebase UID linked to Supabase UID for cross-reference
- GDPR: analytics consent banner shown on first visit (EU users)
- Opt-out available in settings; disables `logEvent` calls
- No analytics in offline/PWA mode (events queued and sent on reconnect)

## Dashboard (Firebase Console)

Key views to configure:

1. **Daily Active Players** — session_start events
2. **Chapter Completion Rates** — funnel visualization
3. **Average Attempts per Chapter** — difficulty calibration
4. **LLM Backend Distribution** — pie chart of ai_backend
5. **Retention Cohorts** — day 1, 3, 7, 14, 30
6. **Auth Conversion Rate** — auth_completed / auth_prompt_shown
