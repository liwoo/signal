"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type MobileView = "chat" | "code" | "mission" | "more";
type SecondaryView = "library" | "notes" | null;

interface MobileGameLayoutProps {
  height: number | null;
  topBar: ReactNode;
  chatPanel: ReactNode;
  codePanel: ReactNode;
  missionPanel: ReactNode;
  libraryPanel: ReactNode;
  notesPanel: ReactNode;
  latestMessage?: string;
  waitingForContinue: boolean;
  inRush: boolean;
  /**
   * Whose turn it is right now: "narrative" (Maya is speaking / paused) or
   * "code" (the player's turn to type). On each change we auto-switch the phone
   * to CHAT or CODE so the player focuses on one thing at a time. null = don't
   * force a switch (keeps a deliberate MISSION/MORE tap put).
   */
  focusMode?: "narrative" | "code" | null;
}

const PRIMARY_TABS: Array<{ id: MobileView; label: string }> = [
  { id: "chat", label: "CHAT" },
  { id: "code", label: "CODE" },
  { id: "mission", label: "MISSION" },
  { id: "more", label: "MORE" },
];

export function MobileGameLayout({
  height,
  topBar,
  chatPanel,
  codePanel,
  missionPanel,
  libraryPanel,
  notesPanel,
  latestMessage,
  waitingForContinue,
  inRush,
  focusMode = null,
}: MobileGameLayoutProps) {
  const [view, setView] = useState<MobileView>("code");
  const [secondaryView, setSecondaryView] = useState<SecondaryView>(null);
  const [lastReadMessage, setLastReadMessage] = useState("");

  const hasUnreadMessage = Boolean(
    latestMessage && latestMessage !== lastReadMessage && view !== "chat"
  );

  // Auto-switch on each focus change, not continuously — so a deliberate tap
  // between turns is respected, but the phone always follows the action:
  // narrative → CHAT (read Maya, hints included), player's turn → CODE.
  const prevFocus = useRef(focusMode);
  useEffect(() => {
    if (focusMode && focusMode !== prevFocus.current) {
      setView(focusMode === "narrative" ? "chat" : "code");
      setSecondaryView(null);
      // Whatever Maya said up to this beat counts as seen once we move.
      if (latestMessage) setLastReadMessage(latestMessage);
    }
    prevFocus.current = focusMode;
  }, [focusMode, latestMessage]);

  return (
    <div
      className="flex w-full flex-col overflow-hidden"
      style={{
        height: height ? `${height}px` : "100dvh",
        background: "var(--color-background)",
        paddingBottom: inRush ? "calc(48px + env(safe-area-inset-bottom))" : undefined,
      }}
    >
      <div data-tour="top-bar">{topBar}</div>

      <nav
        data-tour="tab-bar"
        aria-label="Game panels"
        className="grid shrink-0 grid-cols-4"
        style={{ background: "#04090f", borderBottom: "1px solid var(--color-border)" }}
      >
        {PRIMARY_TABS.map((tab) => {
          const selected = view === tab.id;
          const unread = tab.id === "chat" && hasUnreadMessage;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={selected ? "page" : undefined}
              onClick={() => {
                if ((view === "chat" || tab.id === "chat") && latestMessage) {
                  setLastReadMessage(latestMessage);
                }
                setView(tab.id);
                if (tab.id !== "more") setSecondaryView(null);
              }}
              className="relative min-h-11 bg-transparent px-1 text-[9px] tracking-[1px]"
              style={{
                color: selected ? "var(--color-signal)" : "var(--color-dim)",
                borderBottom: selected ? "2px solid var(--color-signal)" : "2px solid transparent",
              }}
            >
              {tab.label}
              {unread ? (
                <span
                  aria-label="New message"
                  className="absolute right-3 top-2 h-1.5 w-1.5"
                  style={{ background: "var(--color-signal)" }}
                />
              ) : null}
            </button>
          );
        })}
      </nav>

      {view === "code" && hasUnreadMessage ? (
        <button
          type="button"
          onClick={() => {
            if (latestMessage) setLastReadMessage(latestMessage);
            setView("chat");
          }}
          className="flex min-h-11 shrink-0 items-center gap-2 px-3 text-left"
          style={{
            background: "rgba(110,255,160,.04)",
            borderBottom: "1px solid rgba(110,255,160,.14)",
            color: "var(--color-signal)",
          }}
        >
          <span className="shrink-0 text-[8px] tracking-[2px]">MAYA</span>
          <span className="min-w-0 flex-1 truncate text-[12px]">{latestMessage}</span>
          <span className="text-[9px]">OPEN ›</span>
        </button>
      ) : null}

      {view === "code" && waitingForContinue && !hasUnreadMessage ? (
        <button
          type="button"
          onClick={() => setView("chat")}
          className="min-h-11 shrink-0 px-3 text-left text-[10px] tracking-[2px]"
          style={{
            color: "var(--color-alert)",
            background: "rgba(255,159,28,.04)",
            borderBottom: "1px solid rgba(255,159,28,.15)",
          }}
        >
          ▸ MAYA IS WAITING · OPEN CHAT
        </button>
      ) : null}

      <main className="min-h-0 flex-1 overflow-hidden">
        <div className={view === "chat" ? "h-full" : "hidden"} data-tour="chat-panel">
          {chatPanel}
        </div>
        <div className={view === "code" ? "h-full" : "hidden"} data-tour="code-editor">
          {codePanel}
        </div>
        <div className={view === "mission" ? "h-full overflow-hidden" : "hidden"}>
          {missionPanel}
        </div>
        {view === "more" ? (
          secondaryView ? (
            <div className="flex h-full flex-col">
              <button
                type="button"
                onClick={() => setSecondaryView(null)}
                className="min-h-11 shrink-0 bg-transparent px-4 text-left text-[9px] tracking-[2px]"
                style={{ color: "var(--color-signal)", borderBottom: "1px solid var(--color-border)" }}
              >
                ‹ BACK TO MORE
              </button>
              <div className="min-h-0 flex-1 overflow-hidden">
                {secondaryView === "library" ? libraryPanel : notesPanel}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
              <div className="mb-1 text-[8px] tracking-[3px]" style={{ color: "var(--color-dim)" }}>
                ▸ FIELD RESOURCES
              </div>
              <MobileMoreButton
                label="ZEN LIBRARY"
                description="Review principles earned from your code."
                onClick={() => setSecondaryView("library")}
              />
              <MobileMoreButton
                label="❔ NOTES · HELP"
                description="Stuck? The concept + code you need for this level."
                onClick={() => setSecondaryView("notes")}
              />
            </div>
          )
        ) : null}
      </main>
    </div>
  );
}

function MobileMoreButton({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-16 bg-transparent p-4 text-left"
      style={{ border: "1px solid var(--color-border)", color: "var(--color-signal)" }}
    >
      <span className="block text-[11px] tracking-[2px]">{label}</span>
      <span className="mt-1 block text-[11px] leading-5" style={{ color: "var(--color-dim)" }}>
        {description}
      </span>
    </button>
  );
}
