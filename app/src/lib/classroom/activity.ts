/**
 * Step-level activity log for the teacher dashboard (`public.progress_events`).
 *
 * Fire-and-forget: gameplay never waits on it and never sees its errors. Only
 * signed-in players are recorded — AuthProvider points this at the current user
 * via setActivityUser(), the same way it swaps the persistence backend.
 */

import { getSupabase } from "@/lib/supabase/client";
import type { ProgressEventKind } from "@/types/classroom";
import type { LanguageId } from "@/types/game";

let userId: string | null = null;

export function setActivityUser(id: string | null): void {
  userId = id;
}

export interface ActivityInput {
  kind: ProgressEventKind;
  language: LanguageId;
  chapterId: string;
  stepId?: string | null;
  data?: Record<string, string | number | boolean>;
}

export function recordActivity(event: ActivityInput): void {
  if (!userId) return;
  const supabase = getSupabase();
  if (!supabase) return;
  void Promise.resolve(
    supabase.from("progress_events").insert({
      user_id: userId,
      kind: event.kind,
      language: event.language,
      chapter_id: event.chapterId,
      step_id: event.stepId ?? null,
      data: event.data ?? {},
    }),
  ).catch(() => {
    // Offline or not migrated yet — the activity log is best-effort.
  });
}
