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
  onStartRef.current = onMayaTypingStart;
  onEndRef.current = onMayaTypingEnd;

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
        className="shrink-0 px-3 py-1.5"
        style={{
          background: "rgba(0,0,0,.3)",
          borderBottom: "1px solid #0a1820",
        }}
      >
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[var(--color-alert)] text-[11px] font-semibold">
              {challengeTitle}{" "}
            </span>
            <span className="text-[#1a5a6a] text-[9px]">
              — {challengeConcepts}
            </span>
          </div>
          <div className="text-[var(--color-dim)] text-[8px] text-right">
            {location}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 pb-6 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="text-[#0a3a2a] text-[10px] text-center mt-7">
            routing<span className="cursor-blink">...</span>
          </div>
        )}
        {messages.map((m, i) => {
          const distFromEnd = messages.length - 1 - i;
          const opacity = distFromEnd < 2 ? 1 : Math.max(0.08, 1 - (distFromEnd - 1) * 0.25);
          const isMaya = MAYA_TYPES.has(m.type);
          const isLastMsg = m.id === lastMsgId;
          const hasFinishedTyping = typedIds.has(m.id);

          return (
            <div
              key={m.id}
              className="msg-enter text-[11.5px] leading-[1.65] transition-opacity duration-700"
              style={{ opacity }}
            >
              <div className="flex gap-1.5 mb-px">
                <span className="text-[#0a2a3a] text-[7px]">
                  {new Date(parseInt(m.id)).toLocaleTimeString("en-US", {
                    hour12: false,
                  })}
                </span>
                <span
                  className="text-[7px] tracking-[2px]"
                  style={{ color: MSG_COLORS[m.type] }}
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
          <div className="text-[9px] text-[#0a4a3a]">
            <span className="text-[var(--color-signal)] opacity-30 tracking-[2px]">
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
                <ContinueButton onContinue={onContinue} />
              )}
              {onExplain && !explainUsed && (
                <button
                  onClick={onExplain}
                  className="bg-transparent text-[9px] tracking-[1px] px-2.5 py-1
                             cursor-pointer transition-colors"
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
        className="shrink-0 px-2.5 py-1.5 flex gap-2 items-center"
        style={{
          borderTop: "1px solid #0a1820",
          background: "#04090f",
        }}
      >
        <span className="text-[#0a3a2a] text-[11px]">▸</span>
        <input
          value={chatInput}
          onChange={(e) => onChatChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder="ask maya..."
          disabled={busy}
          className="flex-1 bg-transparent border-0 border-b border-b-[#0a1820] text-[var(--color-player)] text-[11px] py-0.5 focus:outline-none placeholder:text-[#0a3a4a] disabled:opacity-40"
        />
        <button
          onClick={onSend}
          disabled={busy || !chatInput.trim()}
          className="bg-transparent border border-[#0a3a4a] text-[#0a5a6a] text-[8px] px-2.5 py-1
                     tracking-[1px] hover:border-[var(--color-player)] hover:text-[var(--color-player)]
                     transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
        >
          TX
        </button>
      </div>
    </div>
  );
}

const AUTO_CONTINUE_SECONDS = 7;

// Continue button with auto-countdown
function ContinueButton({ onContinue }: { onContinue: () => void }) {
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
      className="bg-transparent text-[9px] tracking-[1px] px-2.5 py-1
                 cursor-pointer transition-colors"
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
