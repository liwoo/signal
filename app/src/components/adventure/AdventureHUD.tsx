"use client";

import { TypeText } from "@/components/story/TypeText";
import { BookCover } from "@/components/book/BookCover";
import { BOOK } from "@/data/book";
import type { BookChapter } from "@/data/book";
import type { AdventureSnapshot } from "./AdventureScene";
import type { AdventureLevel } from "@/lib/adventure/types";

interface AdventureHUDProps {
  level: AdventureLevel;
  snapshot: AdventureSnapshot | null;
  /** Full-frame flash, cleared by the parent; `id` restarts the animation. */
  flash: { color: string; id: number } | null;
  showTitle: boolean;
  /** A chapter Maya just picked up — the sim is paused while it's shown. */
  foundBook: BookChapter | null;
  onKeepBook: () => void;
  onInteract: () => void;
  onRotate: (delta: number) => void;
  compact?: boolean;
}

const FLASH_COLORS: Record<string, string> = {
  signal: "var(--color-signal)",
  term: "var(--color-info)",
  danger: "var(--color-danger)",
  warm: "var(--color-alert)",
};

function Keycap({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block border px-1 py-px text-[7px] leading-none tracking-[0.2em] sm:text-[8px]"
      style={{ borderColor: "color-mix(in srgb, var(--color-foreground) 35%, transparent)", color: "var(--color-foreground)" }}
    >
      {children}
    </span>
  );
}

/** DOM chrome over the 3D stage: objective, Maya's thoughts, detection, prompts, cards. */
export function AdventureHUD({ level, snapshot, flash, showTitle, foundBook, onKeepBook, onInteract, onRotate, compact = false }: AdventureHUDProps) {
  const status = snapshot?.status ?? "playing";
  const alert = snapshot?.alert ?? 0;
  const seen = snapshot?.seen ?? false;
  const thought = snapshot?.thought ?? null;

  const stake = snapshot?.stake ?? level.objectives[0]?.stake ?? "";
  const objectiveLabel = snapshot ? `${snapshot.objectiveIndex + 1}/${snapshot.objectiveCount}` : `1/${level.objectives.length}`;
  const isVoice = thought?.includes(": ") && /^[a-z0-9-]+: /.test(thought);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      {/* Flash */}
      {flash && (
        <div
          key={flash.id}
          className="adventure-flash absolute inset-0 z-40"
          style={{ background: FLASH_COLORS[flash.color] ?? "var(--color-foreground)" }}
        />
      )}

      {/* Scanlines / vignette to match the rest of the game */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0px, rgba(0,0,0,0.14) 1px, transparent 1px, transparent 3px)",
          mixBlendMode: "multiply",
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }}
      />

      {/* Alarm wash */}
      {snapshot?.alarm && (
        <div className="adventure-alarm absolute inset-0" style={{ background: "var(--color-danger)" }} />
      )}

      {/* Top bar: location + objective */}
      <header className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-3 pt-2 sm:px-5 sm:pt-3">
        <div className="min-w-0 max-w-[70%]">
          <div className="text-[6px] tracking-[0.32em] sm:text-[8px]" style={{ color: "color-mix(in srgb, var(--color-foreground) 60%, transparent)" }}>
            {level.location}
          </div>
          <div
            key={stake}
            className="cinematic-caption-in mt-1 border-l-2 pl-2 text-[9px] leading-snug sm:text-[11px] lg:text-xs"
            style={{
              borderColor: "var(--color-signal)",
              color: "var(--color-foreground)",
              textShadow: "0 0 8px rgba(0,0,0,0.9)",
              background: "linear-gradient(90deg, rgba(4,8,16,0.75), transparent)",
            }}
          >
            <span className="mr-2 font-[family-name:var(--font-display)] text-[7px] tracking-[0.3em] sm:text-[8px]" style={{ color: "var(--color-signal)" }}>
              WHY · {objectiveLabel}
            </span>
            {stake}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className="flex items-center justify-end gap-2 text-[6px] tracking-[0.32em] sm:text-[7px]"
            style={{ color: "color-mix(in srgb, var(--color-danger) 75%, transparent)" }}
          >
            <span className="h-1.5 w-1.5 animate-pulse" style={{ background: "var(--color-danger)" }} />
            LIVE · YOU HAVE MAYA
          </div>
          {snapshot?.hidden && (
            <div className="mt-1 text-[7px] tracking-[0.32em] sm:text-[8px]" style={{ color: "var(--color-info)" }}>
              ▪ HIDDEN
            </div>
          )}
        </div>
      </header>

      {/* Detection meter */}
      {(alert > 0 || seen) && status === "playing" && (
        <div className="absolute left-1/2 top-[14%] w-[180px] -translate-x-1/2 sm:w-[240px]">
          <div
            className="mb-1 text-center font-[family-name:var(--font-display)] text-[8px] tracking-[0.4em] sm:text-[10px]"
            style={{ color: "var(--color-danger)", textShadow: "0 0 12px var(--color-danger)" }}
          >
            {seen ? "SEEN" : "SUSPICIOUS"}
          </div>
          <div className="h-1.5 w-full border" style={{ borderColor: "color-mix(in srgb, var(--color-danger) 60%, transparent)" }}>
            <div className="h-full" style={{ width: `${Math.round(alert * 100)}%`, background: "var(--color-danger)" }} />
          </div>
        </div>
      )}

      {/* Interaction prompt / progress */}
      {status === "playing" && snapshot && (snapshot.prompt || snapshot.progress > 0) && (
        <div className="pointer-events-auto absolute bottom-[22%] left-1/2 -translate-x-1/2">
          {snapshot.progress > 0 ? (
            <div className="w-[160px] sm:w-[220px]">
              <div className="mb-1 text-center text-[7px] tracking-[0.3em] sm:text-[8px]" style={{ color: "var(--color-info)" }}>
                WORKING
              </div>
              <div className="h-1.5 w-full border" style={{ borderColor: "color-mix(in srgb, var(--color-info) 60%, transparent)" }}>
                <div className="h-full" style={{ width: `${Math.round(snapshot.progress * 100)}%`, background: "var(--color-info)" }} />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onInteract}
              className="adventure-prompt cursor-pointer border-2 px-4 py-2 font-[family-name:var(--font-display)] text-[9px] tracking-[0.3em] sm:text-[11px]"
              style={{
                borderColor: "var(--color-signal)",
                color: "var(--color-signal)",
                background: "color-mix(in srgb, var(--color-background) 85%, transparent)",
                textShadow: "0 0 10px color-mix(in srgb, var(--color-signal) 60%, transparent)",
              }}
            >
              {!compact && <span className="mr-2 opacity-70">[SPACE]</span>}
              {snapshot.prompt}
            </button>
          )}
        </div>
      )}

      {/* Maya's inner voice / voices on the line */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-3 pb-2 sm:px-5 sm:pb-3">
        <div className="min-w-0 max-w-[72%]">
          {thought && status !== "ended" && (
            <div key={thought} className="cinematic-caption-in">
              <div className="mb-1 text-[6px] tracking-[0.32em] sm:text-[7px]" style={{ color: isVoice ? "var(--color-alert)" : "color-mix(in srgb, var(--color-signal) 70%, transparent)" }}>
                {isVoice ? "INCOMING" : "MAYA"}
              </div>
              <TypeText
                text={thought}
                speed={18}
                className="text-[10px] leading-relaxed sm:text-xs lg:text-sm"
              />
            </div>
          )}
        </div>
        <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-1.5">
          {compact ? (
            <div className="text-[7px] tracking-[0.2em]" style={{ color: "color-mix(in srgb, var(--color-foreground) 55%, transparent)" }}>
              TAP FLOOR TO MOVE · TAP ◆ TO USE
            </div>
          ) : (
            <div className="hidden items-center gap-1.5 text-[6px] tracking-[0.2em] sm:flex" style={{ color: "color-mix(in srgb, var(--color-foreground) 55%, transparent)" }}>
              <Keycap>WASD</Keycap> MOVE
              <span className="mx-1 opacity-50">·</span>
              <Keycap>CLICK</Keycap> WALK / USE
              <span className="mx-1 opacity-50">·</span>
              <Keycap>SPACE</Keycap> USE
              <span className="mx-1 opacity-50">·</span>
              <Keycap>Q</Keycap><Keycap>R</Keycap> TURN
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Rotate camera left"
              onClick={() => onRotate(Math.PI / 4)}
              className="cursor-pointer border px-2.5 py-1.5 text-[11px] sm:px-2 sm:py-1 sm:text-[9px]"
              style={{ borderColor: "color-mix(in srgb, var(--color-foreground) 28%, transparent)", color: "var(--color-foreground)", background: "color-mix(in srgb, var(--color-background) 70%, transparent)" }}
            >
              ⟲
            </button>
            <button
              type="button"
              aria-label="Rotate camera right"
              onClick={() => onRotate(-Math.PI / 4)}
              className="cursor-pointer border px-2.5 py-1.5 text-[11px] sm:px-2 sm:py-1 sm:text-[9px]"
              style={{ borderColor: "color-mix(in srgb, var(--color-foreground) 28%, transparent)", color: "var(--color-foreground)", background: "color-mix(in srgb, var(--color-background) 70%, transparent)" }}
            >
              ⟳
            </button>
          </div>
        </div>
      </div>

      {/* Title card */}
      {showTitle && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div
            className="cinematic-card font-[family-name:var(--font-display)] font-black leading-none tracking-[0.3em]"
            style={{
              fontSize: "clamp(22px, 4.8vw, 58px)",
              color: "var(--color-signal)",
              textShadow: "0 0 18px color-mix(in srgb, var(--color-signal) 60%, transparent), 0 0 64px color-mix(in srgb, var(--color-signal) 35%, transparent)",
            }}
          >
            {level.title}
          </div>
          <div className="cinematic-card-rule mt-3 h-px w-[38%]" style={{ background: "color-mix(in srgb, var(--color-signal) 55%, transparent)" }} />
          <div className="cinematic-card-sub mt-3 text-[8px] tracking-[0.5em] sm:text-[11px]" style={{ color: "color-mix(in srgb, var(--color-foreground) 80%, transparent)" }}>
            {level.subtitle}
          </div>
        </div>
      )}

      {/* Found a chapter of the field manual */}
      {foundBook && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center" style={{ background: "rgba(4,8,16,0.78)" }}>
          <div className="book-found-in flex max-w-[92vw] flex-col items-center gap-5 sm:flex-row sm:gap-10">
            <BookCover chapter={foundBook} width={compact ? 150 : 220} />
            <div className="max-w-[360px] text-center sm:text-left">
              <div className="text-[7px] tracking-[0.4em] sm:text-[8px]" style={{ color: "var(--color-signal)" }}>
                FOUND · {BOOK.title} · {BOOK.subtitle}
              </div>
              <div
                className="mt-2 font-[family-name:var(--font-book)] font-semibold leading-none"
                style={{ fontSize: compact ? 28 : 40, color: "var(--color-paper)" }}
              >
                Chapter {foundBook.numeral}
              </div>
              <div className="mt-1 font-[family-name:var(--font-book)] italic" style={{ fontSize: compact ? 18 : 24, color: "var(--color-paper-shade)" }}>
                {foundBook.title}
              </div>
              <div className="mt-3 text-[8px] tracking-[0.2em] sm:text-[9px]" style={{ color: "color-mix(in srgb, var(--color-foreground) 70%, transparent)" }}>
                {foundBook.hiddenIn}
              </div>
              <div className="mt-4 font-[family-name:var(--font-hand)]" style={{ fontSize: compact ? 20 : 26, color: "var(--color-gilt)", transform: "rotate(-1.5deg)" }}>
                “{foundBook.marginNote}”
                <span className="ml-2 text-[0.75em]">{BOOK.signature}</span>
              </div>
              <div className="mt-5 text-[9px] leading-relaxed sm:text-[11px]" style={{ color: "var(--color-foreground)" }}>
                you&apos;ll read it before the round. reeves wrote it for whoever came next.
              </div>
              <button
                type="button"
                onClick={onKeepBook}
                className="mt-5 cursor-pointer border-2 px-5 py-2 font-[family-name:var(--font-display)] text-[9px] tracking-[0.3em] sm:text-[11px]"
                style={{ borderColor: "var(--color-signal)", color: "var(--color-signal)", background: "color-mix(in srgb, var(--color-background) 85%, transparent)" }}
              >
                KEEP IT ▸
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Captured */}
      {status === "captured" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ background: "color-mix(in srgb, var(--color-danger) 18%, transparent)" }}>
          <div
            className="cinematic-card font-[family-name:var(--font-display)] font-black leading-none tracking-[0.3em]"
            style={{ fontSize: "clamp(24px, 5vw, 60px)", color: "var(--color-danger)", textShadow: "0 0 24px var(--color-danger)" }}
          >
            SPOTTED
          </div>
          <div className="mt-3 text-[8px] tracking-[0.4em] sm:text-[10px]" style={{ color: "var(--color-foreground)" }}>
            BACK TO THE LAST SAFE MOMENT
          </div>
        </div>
      )}

      {/* Ending card */}
      {(status === "ending" || status === "ended") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {level.ending === "relinquish" ? (
            <>
              <div className="cinematic-card-sub text-[8px] tracking-[0.5em] sm:text-[10px]" style={{ color: "var(--color-info)" }}>
                {level.handoff ?? "CONTROL → TERMINAL"}
              </div>
              <div
                className="cinematic-card mt-3 font-[family-name:var(--font-display)] font-black leading-none tracking-[0.3em]"
                style={{ fontSize: "clamp(18px, 4vw, 48px)", color: "var(--color-signal)", textShadow: "0 0 18px color-mix(in srgb, var(--color-signal) 60%, transparent)" }}
              >
                YOU HAVE THE TERMINAL
              </div>
              <div className="cinematic-card-sub mt-3 text-[8px] tracking-[0.4em] sm:text-[10px]" style={{ color: "color-mix(in srgb, var(--color-foreground) 80%, transparent)" }}>
                MAYA RELINQUISHES CONTROL
              </div>
            </>
          ) : (
            <>
              <div
                className="cinematic-card font-[family-name:var(--font-display)] font-black leading-none tracking-[0.3em]"
                style={{ fontSize: "clamp(20px, 4.6vw, 56px)", color: "var(--color-signal)", textShadow: "0 0 18px color-mix(in srgb, var(--color-signal) 60%, transparent)" }}
              >
                {level.endCard?.text ?? level.title}
              </div>
              {level.endCard?.sub && (
                <div className="cinematic-card-sub mt-3 text-[8px] tracking-[0.5em] sm:text-[11px]" style={{ color: "color-mix(in srgb, var(--color-foreground) 80%, transparent)" }}>
                  {level.endCard.sub}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
