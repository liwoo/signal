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
}: ChatPanelProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [typedIds, setTypedIds] = useState<Set<string>>(new Set());
  const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : "";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      <div className="flex-1 overflow-y-auto px-3 py-2.5 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="text-[#0a3a2a] text-[10px] text-center mt-7">
            routing<span className="cursor-blink">...</span>
          </div>
        )}
        {messages.map((m, i) => {
          const distFromEnd = messages.length - 1 - i;
          const opacity = distFromEnd < 5 ? 1 : Math.max(0.15, 1 - (distFromEnd - 4) * 0.15);
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
