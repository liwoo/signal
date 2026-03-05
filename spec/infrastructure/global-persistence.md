# Global Persistence — Supabase Spec

## Purpose

Sync player progress to the cloud for cross-device play, leaderboards, and data durability. Supabase is the backend from Act IV onward, and retroactively for authenticated users.

---

## When It Activates

| Trigger | Behavior |
| --- | --- |
| User authenticates (any point) | localStorage migrated to Supabase |
| Chapter 10 reached (Act IV) | Auth prompt shown if not yet authenticated |
| Guest play (Acts I-III) | No Supabase — localStorage only |

## Supabase Project Setup

- **Auth:** Supabase Auth (email/password + OAuth: Google, GitHub)
- **Database:** PostgreSQL via Supabase
- **Realtime:** Not needed (single-player game)
- **Storage:** Not needed (no user uploads)
- **Edge Functions:** Optional — for leaderboard aggregation

## Database Schema

### `profiles`

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `progress`

```sql
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  current_act INT NOT NULL DEFAULT 1,
  current_chapter INT NOT NULL DEFAULT 1,
  completed_chapters INT[] DEFAULT '{}',
  bosses_defeated TEXT[] DEFAULT '{}',
  kira_verdict TEXT, -- 'trusted' | 'rejected' | NULL
  story_branch TEXT, -- 'a' | 'b' | NULL
  checkpoint_data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### `stats`

```sql
CREATE TABLE stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  xp INT DEFAULT 0,
  level INT DEFAULT 1,
  energy INT DEFAULT 100,
  energy_max INT DEFAULT 100,
  ai_tokens INT DEFAULT 0,
  streak INT DEFAULT 0,
  total_attempts INT DEFAULT 0,
  first_try_count INT DEFAULT 0,
  total_play_time_ms BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### `unlocks`

```sql
CREATE TABLE unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  syntax_highlighting TEXT DEFAULT 'locked', -- 'locked' | 'timed' | 'permanent'
  syntax_time_remaining_ms INT DEFAULT 0,
  vim_mode BOOLEAN DEFAULT FALSE,
  black_market BOOLEAN DEFAULT FALSE,
  ghost_channel BOOLEAN DEFAULT FALSE,
  extra_energy BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### `market_purchases`

```sql
CREATE TABLE market_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  cost_xp INT NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `leaderboard` (materialized view)

```sql
CREATE MATERIALIZED VIEW leaderboard AS
SELECT
  p.display_name,
  s.xp,
  s.level,
  pr.current_chapter,
  s.first_try_count,
  s.total_play_time_ms
FROM stats s
JOIN profiles p ON p.id = s.user_id
JOIN progress pr ON pr.user_id = s.user_id
ORDER BY s.xp DESC
LIMIT 100;
```

Refreshed every 5 minutes via Supabase cron or on-demand.

## Row Level Security (RLS)

```sql
-- Users can only read/write their own data
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress"
  ON progress FOR ALL
  USING (auth.uid() = user_id);

-- Same pattern for stats, unlocks, market_purchases
-- Leaderboard view is read-only for all authenticated users
```

## Sync Strategy

### Write Path

```
Game Event (XP gain, chapter complete, etc.)
  -> Update localStorage (immediate)
  -> Debounce 2 seconds
  -> Upsert to Supabase (background, non-blocking)
  -> On failure: queue in localStorage, retry on next write
```

### Read Path

```
Page Load
  -> Read localStorage (instant)
  -> Render immediately
  -> Fetch Supabase in background
  -> If Supabase has newer data: merge and update localStorage
  -> Re-render only if data changed
```

### Conflict Resolution

| Field | Strategy |
| --- | --- |
| XP | Higher value wins |
| Completed chapters | Union of both sets |
| Current chapter | Higher chapter wins |
| Unlocks | Union (once unlocked, stays unlocked) |
| Settings | Latest `updated_at` wins |
| Energy | Supabase value if fresher by > 5 minutes |

## Offline Queue

When offline:

1. All writes go to localStorage + an offline queue (`signal_sync_queue`)
2. Queue entries: `{ table, data, timestamp }`
3. On reconnect: flush queue in order
4. Conflicts resolved by merge rules above

## Client Library

```javascript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

## Data Size Estimates

| Table | Rows per User | Row Size | Total per User |
| --- | --- | --- | --- |
| progress | 1 | ~500B | 500B |
| stats | 1 | ~200B | 200B |
| unlocks | 1 | ~150B | 150B |
| market_purchases | ~10 max | ~100B each | 1KB |
| **Total** | | | **~2KB** |

Supabase free tier (500MB) supports ~250,000 users comfortably.
