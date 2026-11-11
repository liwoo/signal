"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { TypeText } from "@/components/story/TypeText";
import { MayaMarkdown } from "@/components/game/MayaMarkdown";
import { HintOverlay } from "@/components/game/QuickCheck";
import type { QuickCheck } from "@/types/game";

export interface ChatMsg {
  id: string;
  from: string;
  text: string;
  type: "maya" | "you" | "sys" | "win" | "err" | "dim" | "zen" | "kira" | "reeves" | "ghost";
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
  /** The step's "stuck?" helper, opened from the HINT button below. */
  quickCheck?: QuickCheck;
  /** The player looks stuck — the HINT button lights up. */
  stuck?: boolean;
  compact?: boolean;
}

const MSG_COLORS: Record<string, string> = {
  maya: "var(--color-signal)",
  win: "var(--color-win)",
  you: "var(--color-player)",
  sys: "var(--color-alert)",
  err: "var(--color-danger)",
  dim: "var(--color-dim)",
  zen: "var(--color-info)",
  kira: "var(--color-kira)",
  reeves: "var(--color-paper)",
  ghost: "var(--color-danger)",
};

const MAYA_TYPES = new Set(["maya", "win", "zen", "kira", "reeves", "ghost"]);

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
  quickCheck,
  stuck = false,
  compact = false,
}: ChatPanelProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [typedIds, setTypedIds] = useState<Set<string>>(new Set());
  const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : "";

  // The "stuck?" helper is opened on demand from the HINT button. It stays shut
  // unless the player opens it, and snaps shut again the moment the step changes
  // or Maya moves the story on (a new message lands) — so it never lingers over
  // fresh narration.
  const [hintOpen, setHintOpen] = useState(false);
  const [lastCheck, setLastCheck] = useState(quickCheck);
  if (quickCheck !== lastCheck) {
    setLastCheck(quickCheck);
    setHintOpen(false);
  }
  const [lastSeenMsgId, setLastSeenMsgId] = useState(lastMsgId);
  if (lastMsgId !== lastSeenMsgId) {
    setLastSeenMsgId(lastMsgId);
    setHintOpen(false);
  }
  const showQuickCheck = hintOpen && !!quickCheck && !busy;

  // Maya's newest line is still typing in — the pause bar reserves its row now
  // so the CONTINUE button appears in place rather than pushing in later.
  const lastMsg = messages[messages.length - 1];
  const mayaTyping =
    !!lastMsg && lastMsg.animated && MAYA_TYPES.has(lastMsg.type) && !typedIds.has(lastMsg.id);
  const canContinue = !!waitingForContinue && !busy && messages.length > 0;
  const showPauseBar = canContinue || (mayaTyping && !!onContinue);

  // Completed steps collapse into their divider so only the step you're on shows
  // by default — the history is one tap away, not a wall of text. Keyed by the
  // divider message id so expansions survive re-renders; the current step (last
  // segment) is always open.
  const [openSteps, setOpenSteps] = useState<Set<string>>(new Set());
  const toggleStep = (id: string) =>
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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

  // Split the transcript into step segments. A step divider ("STEP 2/4 · LOOP")
  // starts a new segment; the leading segment (before the first divider) is the
  // scaffold step and carries no divider of its own. Only the current step (the
  // last segment) stays expanded by default.
  const collapsed = collapseSystemNoise(messages);
  const isStepDivider = (m: ChatMsg) => m.type === "dim" && /STEP\s+\d+\s*\/\s*\d+/i.test(m.text);
  type Entry = { msg: ChatMsg; repeats: number; gi: number };
  type Segment = { divider: ChatMsg | null; items: Entry[] };
  const segments: Segment[] = [];
  let seg: Segment = { divider: null, items: [] };
  collapsed.forEach(({ msg, repeats }, gi) => {
    if (isStepDivider(msg)) {
      if (seg.divider || seg.items.length) segments.push(seg);
      seg = { divider: msg, items: [] };
    } else {
      seg.items.push({ msg, repeats, gi });
    }
  });
  segments.push(seg);
  const total = collapsed.length;
  const lastSegIdx = segments.length - 1;

  // A completed step collapses to a single clickable divider; the current one is
  // a plain (non-interactive) divider so it never looks dismissable.
  const stepHeader = (key: string, label: string, done: boolean, open: boolean, onClick?: () => void) => {
    const inner = (
      <>
        <span className="h-px flex-1" style={{ background: "currentColor", opacity: 0.25 }} />
        <span className="shrink-0 max-w-[85%] truncate inline-flex items-center gap-1.5">
          {done && <span style={{ color: "var(--color-signal)" }}>✓</span>}
          {label}
          {onClick && (
            <span className="text-[10px]">
              {open ? "▾" : "▸"}
            </span>
          )}
        </span>
        <span className="h-px flex-1" style={{ background: "currentColor", opacity: 0.25 }} />
      </>
    );
    const cls = "msg-enter flex items-center gap-2 text-[10px] tracking-[1px] transition-opacity duration-700";
    return onClick ? (
      <button
        key={key}
        type="button"
        onClick={onClick}
        aria-expanded={open}
        className={`${cls} w-full text-left cursor-pointer`}
        style={{ color: "var(--color-dim)", opacity: 0.7 }}
      >
        {inner}
      </button>
    ) : (
      <div key={key} className={cls} style={{ color: "var(--color-dim)" }}>
        {inner}
      </div>
    );
  };

  const renderMessage = ({ msg: m, repeats, gi }: Entry) => {
    const distFromEnd = total - 1 - gi;
    // Recency fade: older messages recede but stay readable.
    const opacity = distFromEnd < 2 ? 1 : Math.max(0.4, 1 - (distFromEnd - 1) * 0.15);
    const isMaya = MAYA_TYPES.has(m.type);
    const hasFinishedTyping = typedIds.has(m.id);
    const isSystem = m.type === "dim" || m.type === "sys";

    // Non-step system lines are status chips, not conversation.
    if (isSystem) {
      return (
        <div
          key={m.id}
          className="msg-enter flex items-center gap-2 text-[10px] tracking-[1px] transition-opacity duration-700"
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

    const isZen = m.type === "zen";
    return (
      <div
        key={m.id}
        className={`msg-enter leading-[1.6] transition-opacity duration-700 ${compact ? "text-[14px]" : "text-[15px]"} ${isZen ? "border-l-[3px] px-3 py-2" : ""}`}
        style={{
          opacity,
          ...(isZen ? {
            borderColor: "var(--color-info)",
            background: "color-mix(in srgb, var(--color-info) 6%, transparent)",
          } : {}),
        }}
      >
        <div className="mb-px">
          <span
            className="text-[10px] tracking-[2px]"
            style={{ color: MSG_COLORS[m.type], opacity: 0.7 }}
          >
            {isZen ? "ZEN NOTE · MAYA" : m.from}
          </span>
        </div>
        <div
          className="whitespace-pre-wrap break-words"
          style={{ color: MSG_COLORS[m.type] }}
        >
          <MessageContent
            msg={m}
            isMaya={isMaya}
            hasFinishedTyping={hasFinishedTyping}
            onTypingStart={handleTypingStart}
            onTypingEnd={handleTypingEnd}
          />
        </div>
      </div>
    );
  };

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
          <span className="text-[var(--color-signal)] text-[10px] tracking-[3px] font-[family-name:var(--font-display)]">
            MAYA · {location}
          </span>
          <span className="text-[10px] tracking-[2px] truncate" style={{ color: "var(--color-dim)" }} title={challengeConcepts}>
            {challengeTitle}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 pb-6 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="text-[var(--color-dim)] text-[10px] text-center mt-7">
            routing<span className="cursor-blink">...</span>
          </div>
        )}
        {segments.map((segment, si) => {
          const isCurrent = si === lastSegIdx;
          const dividerLabel = segment.divider
            ? segment.divider.text.replace(/^▸\s*/, "")
            : "STEP 1";
          const headerKey = segment.divider ? segment.divider.id : "__scaffold__";
          const open = isCurrent || openSteps.has(headerKey);

          return (
            <div key={headerKey} className="flex flex-col gap-2">
              {/* Divider / collapse toggle. The scaffold step has no divider of
                  its own, so it only shows a header once a later step exists. */}
              {segment.divider
                ? stepHeader(
                    headerKey,
                    dividerLabel,
                    !isCurrent,
                    open,
                    isCurrent ? undefined : () => toggleStep(headerKey),
                  )
                : !isCurrent &&
                  stepHeader(headerKey, dividerLabel, true, open, () => toggleStep(headerKey))}

              {open && segment.items.map((entry) => renderMessage(entry))}
            </div>
          );
        })}
        {busy && (
          <div className="text-[10px]">
            <span className="text-[var(--color-signal)] opacity-80 tracking-[2px]">
              MAYA{" "}
            </span>
            <span className="cursor-blink text-[var(--color-signal)]">▋</span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Pause bar — pinned between the transcript and the input so CONTINUE
          sits in the same spot every time. It used to trail the newest message,
          so it slid down as Maya's paragraphs typed in and players clicked the
          wrong thing. The row is reserved while Maya is still typing (disabled
          placeholder) so nothing shifts when the button becomes live. */}
      {showPauseBar && (
        <div
          className="shrink-0 px-3 py-2 flex items-center gap-1.5"
          style={{
            borderTop: "1px solid rgba(var(--signal-rgb),.15)",
            background: "rgba(var(--signal-rgb),.03)",
          }}
        >
          {canContinue && onContinue ? (
            <ContinueButton onContinue={onContinue} compact={compact} />
          ) : (
            <button
              type="button"
              disabled
              className={`bg-transparent text-[10px] tracking-[1px] px-2.5 cursor-default ${compact ? "min-h-11 py-2" : "py-1"}`}
              style={{
                border: "1px solid rgba(var(--signal-rgb),.15)",
                color: "var(--color-dim)",
              }}
            >
              maya is typing<span className="cursor-blink">…</span>
            </button>
          )}
          {canContinue && onExplain && !explainUsed && (
            <button
              onClick={onExplain}
              className={`bg-transparent text-[10px] tracking-[1px] px-2.5
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
              explain again <span style={{ color: "var(--color-alert)", fontSize: "10px" }}>-10 XP</span>
            </button>
          )}
          <span
            className="ml-auto text-[10px] tracking-[3px] whitespace-nowrap"
            style={{ color: "var(--color-dim)" }}
          >
            ▸ PAUSED · ABSORB
          </span>
        </div>
      )}

      {/* Input */}
      <div
        className="shrink-0 px-3 py-2.5 flex flex-col gap-1.5"
        style={{
          borderTop: "2px solid rgba(122,184,216,.2)",
          background: "rgba(4,9,15,.8)",
        }}
      >
        <div className="flex gap-2 items-center">
          {quickCheck && (
            <button
              type="button"
              onClick={() => setHintOpen((v) => !v)}
              className={`bg-transparent text-[10px] tracking-[2px] px-3 transition-colors cursor-pointer whitespace-nowrap ${compact ? "min-h-11 py-2" : "py-1.5"} ${stuck && !hintOpen ? "hint-pulse" : ""}`}
              style={{
                border: `1px solid ${hintOpen || stuck ? "var(--color-info)" : "rgba(122,184,216,.25)"}`,
                color: "var(--color-info)",
                background: hintOpen ? "rgba(0,212,255,.08)" : "transparent",
              }}
              aria-pressed={hintOpen}
              title="Open Maya's hints for this step"
            >
              {hintOpen ? "✕ HINT" : stuck ? "STUCK? HINT" : "? HINT"}
            </button>
          )}
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
            className={`bg-transparent text-[10px] px-3.5
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

      {showQuickCheck && quickCheck && (
        <HintOverlay check={quickCheck} onClose={() => setHintOpen(false)} />
      )}
    </div>
  );
}

const AUTO_CONTINUE_SECONDS = 5;

/** An editable field the keystroke was meant for (chat input, code editor). */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLInputElement) return !target.disabled && !target.readOnly;
  if (target instanceof HTMLTextAreaElement) return !target.disabled && !target.readOnly;
  return false;
}

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

  // Allow Enter key to continue — but not the Enter that sends a chat question
  // (or types a newline in the editor). That Enter belongs to the field it was
  // pressed in; treating it as "continue" too resumed the clock and released
  // queued story beats on top of the player's answer.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
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
      className={`bg-transparent text-[10px] tracking-[1px] px-2.5
                 cursor-pointer transition-colors ${compact ? "min-h-11 py-2" : "py-1"}`}
      style={{
        border: "1px solid rgba(var(--signal-rgb),.2)",
        color: "var(--color-signal)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--color-signal)";
        e.currentTarget.style.background = "rgba(var(--signal-rgb),.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(var(--signal-rgb),.2)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      continue <span style={{ opacity: 0.8, fontSize: "10px" }}>{remaining}s</span>
      <span className="ml-1.5" style={{ opacity: 0.7, fontSize: "10px" }}>⏎</span>
    </button>
  );
}

// Separate component to avoid re-rendering all messages when one finishes typing
function MessageContent({
  msg,
  isMaya,
  hasFinishedTyping,
  onTypingStart,
  onTypingEnd,
}: {
  msg: ChatMsg;
  isMaya: boolean;
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

  // Animated Maya message that's still typing. Every one of them holds the
  // clock while it types (holding is idempotent). `onStart` stays a stable
  // callback: toggling it on "is this the last message?" restarted the
  // typewriter from blank whenever a later line arrived, and left the reply
  // typing with the clock running.
  if (msg.animated && isMaya && !hasFinishedTyping) {
    return (
      <TypeText
        text={msg.text}
        className=""
        speed={14}
        onStart={onTypingStart}
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
        speed={14}
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
