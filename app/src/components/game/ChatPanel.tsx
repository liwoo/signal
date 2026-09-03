"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { TypeText } from "@/components/story/TypeText";
import { MayaMarkdown } from "@/components/game/MayaMarkdown";

export interface ChatMsg {
  id: string;
  from: string;
  text: string;
  type: "maya" | "you" | "sys" | "win" | "err" | "dim";
  animated: boolean;
}

interface ChatPanelProps {
  messages: ChatMsg[];
  busy: boolean;
  chatInput: string;
  onChatChange: (value: string) => void;
  onSend: () => void;
  challengeTitle: string;
  challengeConcepts: string;
  location: string;
  onMayaTypingStart?: () => void;
  onMayaTypingEnd?: () => void;
  waitingForContinue?: boolean;
  explainUsed?: boolean;
  onContinue?: () => void;
  onExplain?: () => void;
  compact?: boolean;
}

const MSG_COLORS: Record<string, string> = {
  maya: "var(--color-signal)",
  win: "var(--color-win)",
  you: "var(--color-player)",
  sys: "var(--color-alert)",
  err: "var(--color-danger)",
  dim: "#1a4a5a",
};

const MAYA_TYPES = new Set(["maya", "win"]);

/** Fold runs of identical system lines ("energy drain" ×3) into one chip. */
function collapseSystemNoise(messages: ChatMsg[]): Array<{ msg: ChatMsg; repeats: number }> {
  const out: Array<{ msg: ChatMsg; repeats: number }> = [];
  for (const m of messages) {
    const prev = out[out.length - 1];
    const system = m.type === "dim" || m.type === "sys";
    if (prev && system && prev.msg.type === m.type && prev.msg.text === m.text) {
      prev.repeats += 1;
      prev.msg = m; // keep the newest id so the list stays keyed on the tail
      continue;
    }
    out.push({ msg: m, repeats: 1 });
  }
  return out;
}

export function ChatPanel({
  messages,
  busy,
  chatInput,
  onChatChange,
  onSend,
  challengeTitle,
  challengeConcepts,
  location,
  onMayaTypingStart,
  onMayaTypingEnd,
  waitingForContinue,
  explainUsed,
  onContinue,
  onExplain,
  compact = false,
}: ChatPanelProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [typedIds, setTypedIds] = useState<Set<string>>(new Set());
  const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : "";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, waitingForContinue, typedIds, busy]);

  // Stable refs for callbacks
  const onStartRef = useRef(onMayaTypingStart);
  const onEndRef = useRef(onMayaTypingEnd);
  useEffect(() => {
    onStartRef.current = onMayaTypingStart;
    onEndRef.current = onMayaTypingEnd;
  }, [onMayaTypingStart, onMayaTypingEnd]);

  const handleTypingStart = useCallback(() => {
    onStartRef.current?.();
  }, []);

  const handleTypingEnd = useCallback((id: string) => {
    setTypedIds((prev) => new Set(prev).add(id));
    onEndRef.current?.();
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Location bar */}
      <div
        className={`shrink-0 px-3 ${compact ? "py-2" : "py-1.5"}`}
        style={{
          background: "rgba(0,0,0,.3)",
          borderBottom: "1px solid #0a1820",
        }}
      >
        <div className="flex justify-between items-center gap-3">
          <span className="text-[var(--color-signal)] text-[9px] tracking-[3px] font-[family-name:var(--font-display)]">
            MAYA · {location}
          </span>
          <span className="text-[8px] tracking-[2px] truncate" style={{ color: "var(--color-dim)" }} title={challengeConcepts}>
            {challengeTitle}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 pb-6 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="text-[#0a3a2a] text-[10px] text-center mt-7">
            routing<span className="cursor-blink">...</span>
          </div>
        )}
        {collapseSystemNoise(messages).map(({ msg: m, repeats }, i, list) => {
          const distFromEnd = list.length - 1 - i;
          // Recency fade: older messages recede but stay readable.
          const opacity = distFromEnd < 2 ? 1 : Math.max(0.4, 1 - (distFromEnd - 1) * 0.15);
          const isMaya = MAYA_TYPES.has(m.type);
          const isLastMsg = m.id === lastMsgId;
          const hasFinishedTyping = typedIds.has(m.id);
          const isSystem = m.type === "dim" || m.type === "sys";

          // System lines are status chips, not conversation.
          if (isSystem) {
            return (
              <div
                key={m.id}
                className="msg-enter flex items-center gap-2 text-[9px] tracking-[1px] transition-opacity duration-700"
                style={{ opacity, color: m.type === "sys" ? "var(--color-alert)" : "var(--color-dim)" }}
              >
                <span className="h-px flex-1" style={{ background: "currentColor", opacity: 0.25 }} />
                <span className="shrink-0 max-w-[85%] truncate">
                  {m.text.replace(/^▸\s*/, "")}
                  {repeats > 1 ? ` ×${repeats}` : ""}
                </span>
                <span className="h-px flex-1" style={{ background: "currentColor", opacity: 0.25 }} />
              </div>
            );
          }

          return (
            <div
              key={m.id}
              className={`msg-enter leading-[1.6] transition-opacity duration-700 ${compact ? "text-[14px]" : "text-[15px]"}`}
              style={{ opacity }}
            >
              <div className="mb-px">
                <span
                  className="text-[8px] tracking-[2px]"
                  style={{ color: MSG_COLORS[m.type], opacity: 0.7 }}
                >
                  {m.from}
                </span>
              </div>
              <div
                className="whitespace-pre-wrap break-words"
                style={{ color: MSG_COLORS[m.type] }}
              >
                <MessageContent
                  msg={m}
                  isMaya={isMaya}
                  isLastMsg={isLastMsg}
                  hasFinishedTyping={hasFinishedTyping}
                  onTypingStart={handleTypingStart}
                  onTypingEnd={handleTypingEnd}
                />
              </div>
            </div>
          );
        })}
        {busy && (
          <div className="text-[9px]">
            <span className="text-[var(--color-signal)] opacity-50 tracking-[2px]">
              MAYA{" "}
            </span>
            <span className="cursor-blink text-[var(--color-signal)]">▋</span>
          </div>
        )}

        {/* Pause + continue/explain buttons */}
        {waitingForContinue && !busy && messages.length > 0 && (
          <div className="mt-1.5">
            <div
              className="flex items-center gap-2 px-2 py-1.5 mb-1.5"
              style={{
                border: "1px solid rgba(110,255,160,.1)",
                background: "rgba(110,255,160,.02)",
              }}
            >
              <span
                className="text-[7px] tracking-[3px]"
                style={{ color: "var(--color-dim)" }}
              >
                ▸ PAUSED · ABSORB
              </span>
            </div>
            <div className="flex gap-1.5">
              {onContinue && (
                <ContinueButton onContinue={onContinue} compact={compact} />
              )}
              {onExplain && !explainUsed && (
                <button
                  onClick={onExplain}
                  className={`bg-transparent text-[9px] tracking-[1px] px-2.5
                             cursor-pointer transition-colors
                             ${compact ? "min-h-11 py-2" : "py-1"}`}
                  style={{
                    border: "1px solid rgba(122,184,216,.15)",
                    color: "var(--color-player)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-player)";
                    e.currentTarget.style.background = "rgba(122,184,216,.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(122,184,216,.15)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  explain again <span style={{ color: "var(--color-alert)", fontSize: "7px" }}>-10 XP</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div
        className="shrink-0 px-3 py-2.5 flex flex-col gap-1.5"
        style={{
          borderTop: "2px solid rgba(122,184,216,.2)",
          background: "rgba(4,9,15,.8)",
        }}
      >
        <div className="flex gap-2 items-center">
          <input
            value={chatInput}
            onChange={(e) => onChatChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            placeholder="ask maya anything…"
            disabled={busy}
            className={`flex-1 bg-transparent text-[var(--color-player)] py-1 focus:outline-none placeholder:text-[rgba(122,184,216,.25)] disabled:opacity-40 ${compact ? "text-[16px]" : "text-[14px]"}`}
            style={{
              border: "none",
              borderBottom: "1px solid rgba(122,184,216,.15)",
            }}
          />
          <button
            onClick={onSend}
            disabled={busy || !chatInput.trim()}
            className={`bg-transparent text-[9px] px-3.5
                       tracking-[2px] transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed
                       ${compact ? "min-h-11 py-2" : "py-1.5"}`}
            style={{
              border: "1px solid rgba(122,184,216,.25)",
              color: "var(--color-player)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-player)";
              e.currentTarget.style.background = "rgba(122,184,216,.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(122,184,216,.25)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
}

const AUTO_CONTINUE_SECONDS = 7;

// Continue button with auto-countdown
function ContinueButton({ onContinue, compact = false }: { onContinue: () => void; compact?: boolean }) {
  const [remaining, setRemaining] = useState(AUTO_CONTINUE_SECONDS);
  const firedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fire onContinue when countdown hits 0 — outside the state updater
  useEffect(() => {
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      onContinue();
    }
  }, [remaining, onContinue]);

  // Allow Enter key to continue
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !firedRef.current) {
        firedRef.current = true;
        onContinue();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onContinue]);

  return (
    <button
      onClick={() => {
        if (!firedRef.current) {
          firedRef.current = true;
          onContinue();
        }
      }}
      className={`bg-transparent text-[9px] tracking-[1px] px-2.5
                 cursor-pointer transition-colors ${compact ? "min-h-11 py-2" : "py-1"}`}
      style={{
        border: "1px solid rgba(110,255,160,.2)",
        color: "var(--color-signal)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--color-signal)";
        e.currentTarget.style.background = "rgba(110,255,160,.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(110,255,160,.2)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      continue <span style={{ opacity: 0.4, fontSize: "7px" }}>{remaining}s</span>
      <span className="ml-1.5" style={{ opacity: 0.3, fontSize: "8px" }}>⏎</span>
    </button>
  );
}

// Separate component to avoid re-rendering all messages when one finishes typing
function MessageContent({
  msg,
  isMaya,
  isLastMsg,
  hasFinishedTyping,
  onTypingStart,
  onTypingEnd,
}: {
  msg: ChatMsg;
  isMaya: boolean;
  isLastMsg: boolean;
  hasFinishedTyping: boolean;
  onTypingStart: () => void;
  onTypingEnd: (id: string) => void;
}) {
  const doneRef = useRef(false);

  const handleDone = useCallback(() => {
    if (!doneRef.current) {
      doneRef.current = true;
      onTypingEnd(msg.id);
    }
  }, [msg.id, onTypingEnd]);

  // Animated Maya message that's still typing
  if (msg.animated && isMaya && !hasFinishedTyping) {
    return (
      <TypeText
        text={msg.text}
        className=""
        speed={20}
        onStart={isLastMsg ? onTypingStart : undefined}
        onDone={handleDone}
      />
    );
  }

  // Animated non-Maya (system messages etc)
  if (msg.animated && !isMaya && !hasFinishedTyping) {
    return (
      <TypeText
        text={msg.text}
        className=""
        speed={20}
        onDone={handleDone}
      />
    );
  }

  // Maya message (finished typing or not animated) — render with markdown
  if (isMaya) {
    return <MayaMarkdown text={msg.text} color={MSG_COLORS[msg.type]} />;
  }

  // Plain text
  return <>{msg.text}</>;
}
