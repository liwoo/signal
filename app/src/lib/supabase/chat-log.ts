import { getSupabase } from "./client";

interface ChatLogRow {
  step_id: string;
  kind: "chat" | "code";
  user_message: string;
  maya_reply: string;
  is_complete: boolean;
  attempt: number;
}

/**
 * Fire-and-forget: logs a user↔maya exchange to Supabase.
 * Never throws — silently drops on missing config or network errors.
 */
export function logChatMessage(row: ChatLogRow): void {
  const sb = getSupabase();
  if (!sb) return;

  sb.from("chat_logs").insert(row).then(({ error }) => {
    if (error) console.warn("[chat-log]", error.message);
  });
}
