# Feedback — Canny Spec

## Purpose

Collect structured player feedback, feature requests, and bug reports. Canny provides a public board for voting and tracking without building custom feedback infrastructure.

---

## Setup

### Canny Integration

- **Board:** Single board named "SIGNAL Feedback"
- **Categories:** Bug Report, Feature Request, Content Request, Difficulty Feedback
- **Widget:** Canny's embedded widget in the game settings panel

### Widget Initialization

```javascript
import Canny from "canny-sdk";

Canny("identify", {
  appID: "SIGNAL_CANNY_APP_ID",
  user: {
    id: user?.id || `guest_${getGuestId()}`,
    name: user?.displayName || "Anonymous Agent",
    email: user?.email, // only if authenticated
    created: user?.createdAt
  }
});
```

## In-Game Access Points

### 1. Settings Panel

A `[ FEEDBACK ]` button in the settings drawer opens the Canny widget as a modal overlay.

### 2. Chapter Fail State

After the "Retry from Checkpoint" prompt, a subtle link appears:

```
Too hard? Let us know → [ REPORT DIFFICULTY ]
```

This pre-fills a Canny post with:
- Category: Difficulty Feedback
- Title: "Chapter {N} — {title} difficulty"
- Pre-filled body: "I found this chapter [too hard / confusing / unclear]. Attempts: {count}. Hints used: {count}."

### 3. Post-Game (Game Complete)

After the ending screen, a feedback prompt:

```
━━ SIGNAL COMPLETE ━━
How was the experience?

[ LOVED IT ]  [ COULD BE BETTER ]  [ REPORT BUG ]
```

- "LOVED IT" -> Optional Canny post with positive category
- "COULD BE BETTER" -> Opens Canny widget with Feature Request category
- "REPORT BUG" -> Opens Canny widget with Bug Report category

### 4. Chat Command

Typing `> feedback` in the chat input opens the Canny widget. FIXER responds: "Noted. The brass is listening."

## Canny Board Structure

### Categories

| Category | Description | Auto-tags |
| --- | --- | --- |
| Bug Report | Something broken | `bug`, chapter number |
| Feature Request | Something missing | `feature` |
| Content Request | More chapters, story branches | `content` |
| Difficulty Feedback | Too hard / too easy | `difficulty`, chapter number |

### Custom Fields

| Field | Type | Source |
| --- | --- | --- |
| Chapter | Number | Auto-populated from game state |
| Level | Number | Auto-populated |
| AI Backend | String | Auto-populated |
| Platform | String | desktop / tablet / mobile |
| Browser | String | User agent parsed |

## Guest vs Authenticated Users

| Feature | Guest | Authenticated |
| --- | --- | --- |
| Submit feedback | Yes (anonymous) | Yes (with display name) |
| Vote on posts | No | Yes |
| Track own posts | No (no account) | Yes |
| Email notifications | No | Optional |

## Privacy

- Guests submit anonymously — only a random guest ID is sent
- Authenticated users can choose to show display name or remain anonymous
- No gameplay data sent to Canny beyond the custom fields above
- Canny privacy policy linked in the feedback modal footer

## Moderation

- Canny admin dashboard for reviewing and responding to feedback
- Auto-close duplicates via Canny's merge feature
- Status labels: Under Review, Planned, In Progress, Complete
- Public roadmap visible at `signal.canny.io` (optional — can be private)
