# Authentication Spec

## Purpose

Optional authentication for cross-device progress sync, leaderboards, and cloud saves. The game is fully playable without auth through Act III.

---

## Auth Provider

**Supabase Auth** — handles user management, session tokens, and OAuth.

## Auth Methods

| Method | Priority | Notes |
| --- | --- | --- |
| Google OAuth | P0 | Lowest friction, most users |
| GitHub OAuth | P0 | Developer audience alignment |
| Email/Password | P1 | Fallback for privacy-conscious users |
| Magic Link (email) | P2 | Passwordless option |

## Auth Flow

### Guest Play (Default)

1. Player starts game — no auth required
2. All state in localStorage/sessionStorage
3. Game fully functional through Act III (Chapters 1-9)
4. Auth prompt appears at Chapter 10 (Act IV start)

### Auth Prompt (Chapter 10)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SIGNAL COMPROMISED — BACKUP REQUIRED

Maya's escape data needs a secure backup.
Sign in to save progress to the cloud.

[ GOOGLE ]  [ GITHUB ]  [ EMAIL ]

                         [ SKIP FOR NOW ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- In-world framing: "secure backup" = cloud save
- Skip is always available — game continues with localStorage only
- Prompt does NOT block gameplay

### Sign-in Flow

1. User selects auth method
2. Supabase Auth handles OAuth redirect or email flow
3. On success: `supabase.auth.getUser()` returns user object
4. Trigger localStorage -> Supabase migration (see `global-persistence.md`)
5. Game resumes from current state

### Session Management

- **Token storage:** Supabase stores tokens in localStorage automatically
- **Session duration:** 7 days (refreshed on activity)
- **Refresh:** Supabase JS client handles token refresh transparently
- **Logout:** Clears Supabase session; localStorage game data remains (can play as guest)

## User Profile

Minimal profile — no personal data beyond what OAuth provides:

```typescript
interface SignalUser {
  id: string;          // Supabase UUID
  displayName: string; // From OAuth or user-entered
  avatarUrl?: string;  // From OAuth provider
  authProvider: "google" | "github" | "email";
  createdAt: string;
}
```

### Display Name

- Default: first name from OAuth, or email prefix
- Editable in settings (max 20 chars, alphanumeric + underscores)
- Used on leaderboard
- Profanity filter: basic blocklist check on save

## Auth State in UI

### Signed Out (Guest)

- HUD shows no user indicator
- Settings show `[ SIGN IN ]` button
- Leaderboard shows `Sign in to appear on the board`

### Signed In

- HUD shows display name in top-right: `AGENT: cryptox`
- Settings show `Signed in as cryptox` + `[ SIGN OUT ]`
- Leaderboard shows user's rank highlighted

## Security

- Supabase RLS enforces data isolation (users only access own data)
- No sensitive data stored client-side beyond Supabase session token
- OAuth tokens never exposed to game code (Supabase handles)
- PKCE flow for OAuth (default in Supabase Auth v2)
- Rate limiting on auth endpoints (Supabase default: 30 requests/hour)

## Account Deletion

- Available in settings: `[ DELETE ACCOUNT ]`
- Confirmation: "This will permanently delete your progress. Type DELETE to confirm."
- Triggers: Supabase `auth.admin.deleteUser()` + CASCADE deletes all related data
- localStorage cleared on deletion
- In-world message: "Signal terminated. All traces erased."

## Error Handling

| Scenario | Behavior |
| --- | --- |
| OAuth popup blocked | Show "Allow popups for this site" message |
| Network error during auth | "Signal lost. Try again." with retry button |
| Email already registered | "This identity is already in the system." |
| Session expired | Silent refresh; if refresh fails, show sign-in prompt |
| Supabase down | Game continues with localStorage only; banner: "Cloud backup offline" |
