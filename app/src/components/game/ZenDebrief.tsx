"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { LibraryEntry } from "@/lib/game/library";
import { entryLesson } from "@/lib/game/library";
import { ZEN_EXAMPLES } from "@/data/zen-examples";
import { tokenize, type Token } from "@/lib/go/tokenizer";
import { useAudio } from "@/hooks/useAudio";

interface ZenDebriefProps {
  chapterTitle: string;
  entries: LibraryEntry[];
  soundEnabled?: boolean;
  onDone: () => void;
}

interface Beat {
  kind: "title" | "rule" | "outro";
  entry?: LibraryEntry;
  line: string;
}

const TYPE_MS = 30;
const HOLD_MS = 2400;

function beatDuration(beat: Beat): number {
  return 500 + beat.line.length * TYPE_MS + (beat.kind === "rule" ? HOLD_MS + 1200 : HOLD_MS);
}

/**
 * The zen lessons as something you watch. One rule per beat: a verdict
 * (LEARNED / MISSED), the principle in display type, Maya's line typed as a
 * subtitle, and the code before → after with the fix sliding into place.
 * Paced by reading length, skippable, and it ends on the tally.
 */
export function ZenDebrief({ chapterTitle, entries, soundEnabled = true, onDone }: ZenDebriefProps) {
  const audio = useAudio(soundEnabled);
  const learned = entries.filter((e) => e.learned).length;
  const earned = entries.filter((e) => e.learned).reduce((s, e) => s + e.bonusXP, 0);
  const missedXP = entries.filter((e) => !e.learned).reduce((s, e) => s + e.bonusXP, 0);

  const beats = useMemo<Beat[]>(() => {
    const list: Beat[] = [
      { kind: "title", line: `maya's memory is coming back. ${entries.length} habits of go, ${learned} already in your code.` },
      ...entries.map<Beat>((entry) => ({
        kind: "rule",
        entry,
        line: entryLesson(entry),
      })),
      {
        kind: "outro",
        line: missedXP > 0
          ? `${learned}/${entries.length} learned · +${earned} zen xp. the missed ones wait in your library — each is worth xp next time.`
          : `${learned}/${entries.length} learned · +${earned} zen xp. clean. keep writing like that.`,
      },
    ];
    return list;
  }, [entries, learned, earned, missedXP]);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [typed, setTyped] = useState({ index: 0, n: 0 });
  const beat = beats[index];
  const shown = typed.index === index ? typed.n : 0;

  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      setTyped((prev) => {
        const n = prev.index === index ? prev.n : 0;
        if (n >= beat.line.length) return prev;
        return { index, n: n + 1 };
      });
    }, TYPE_MS);
    return () => clearInterval(iv);
  }, [index, playing, beat.line.length]);

  useEffect(() => {
    if (!playing) return;
    if (beat.kind === "rule") audio.playSfx(beat.entry?.learned ? "handshake-confirm" : "warning-beep", 0.22);
    else audio.playSfx("terminal-beep", 0.2);
    const t = setTimeout(() => {
      if (index >= beats.length - 1) setPlaying(false);
      else setIndex((i) => i + 1);
    }, beatDuration(beat));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- audio ref is stable
  }, [index, playing, beat, beats.length]);

  const goTo = useCallback((i: number) => {
    const clamped = Math.max(0, Math.min(beats.length - 1, i));
    setIndex(clamped);
    setPlaying(true);
  }, [beats.length]);

  const ended = !playing && index >= beats.length - 1;
  const example = beat.entry ? ZEN_EXAMPLES[beat.entry.id] : undefined;
  const verdictColor = beat.entry?.learned ? "var(--color-signal)" : "var(--color-alert)";

  return (
    <div
      className="fixed inset-0 z-[950] flex flex-col items-center justify-center px-4 py-6"
      style={{ background: "var(--color-background)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Zen debrief"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--color-signal) 3%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-signal) 3%, transparent) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at center, black, transparent 78%)",
        }}
      />

      {/* Picture */}
      <section
        className="relative w-full flex flex-col overflow-hidden sm:aspect-[16/10]"
        style={{ maxWidth: 880, maxHeight: "78dvh", minHeight: 360, border: "1px solid color-mix(in srgb, var(--color-signal) 20%, transparent)", background: "#04090f" }}
      >
        {/* Header rail */}
        <header className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div className="font-[family-name:var(--font-display)] text-[12px] tracking-[4px]" style={{ color: "var(--color-info)" }}>
            ZEN DEBRIEF · {chapterTitle}
          </div>
          <div className="text-[10px] tracking-[2px]" style={{ color: "var(--color-foreground)", opacity: 0.8 }}>
            {beat.kind === "rule" ? `${index}/${entries.length}` : ""}
          </div>
        </header>

        <div className="relative flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-4 py-4 sm:px-6 text-center">
          {beat.kind === "title" && (
            <div key="title" className="cinematic-card font-[family-name:var(--font-display)] font-black tracking-[0.3em]" style={{ fontSize: "clamp(22px, 4.5vw, 44px)", color: "var(--color-signal)", textShadow: "0 0 24px rgba(110,255,160,.5)" }}>
              THE ZEN OF GO
            </div>
          )}

          {beat.kind === "rule" && beat.entry && (
            <div key={beat.entry.id} className="w-full flex flex-col items-center gap-3 sm:gap-4 zen-beat">
              <div className="text-[10px] sm:text-[11px] tracking-[3px] px-3 py-1" style={{ color: verdictColor, border: `1px solid ${verdictColor}` }}>
                {beat.entry.learned ? "✓ LEARNED" : "○ MISSED"} · +{beat.entry.bonusXP} XP
              </div>
              <div className="font-[family-name:var(--font-display)] font-black tracking-[0.1em] lowercase leading-tight" style={{ fontSize: "clamp(18px, 3.4vw, 32px)", color: "var(--color-foreground)" }}>
                {beat.entry.principle}
              </div>
              {example ? (
                <div className="w-full grid gap-2 sm:gap-3 text-left grid-cols-1 sm:grid-cols-[1fr_auto_1fr]" style={{ maxWidth: 720 }}>
                  <CodeBox label="before" code={example.before} tone="dim" />
                  <div className="self-center justify-self-center font-[family-name:var(--font-display)] text-[20px] zen-arrow rotate-90 sm:rotate-0" style={{ color: "var(--color-signal)" }}>→</div>
                  <CodeBox label="after" code={example.after} tone="lit" />
                  <div className="sm:col-span-3 text-center text-[11px] sm:text-[12px] tracking-[1px]" style={{ color: "var(--color-info)" }}>
                    {example.change}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {beat.kind === "outro" && (
            <div key="outro" className="cinematic-card font-[family-name:var(--font-display)] font-black tracking-[0.2em]" style={{ fontSize: "clamp(22px, 4.5vw, 44px)", color: "var(--color-win)", textShadow: "0 0 24px rgba(255,237,74,.4)" }}>
              {learned}/{entries.length} · +{earned} XP
            </div>
          )}
        </div>

        {/* Subtitle */}
        <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 text-center" style={{ minHeight: 76, borderTop: "1px solid var(--color-border)", background: "rgba(4,8,16,.9)" }}>
          <div className="text-[9px] tracking-[3px] mb-1" style={{ color: "var(--color-signal)", opacity: 0.8 }}>MAYA</div>
          <div className="text-[13px] sm:text-[15px] leading-[1.5]" style={{ color: "var(--color-foreground)" }}>
            {playing ? beat.line.slice(0, shown) : beat.line}
            {playing && shown < beat.line.length && <span className="cursor-blink" style={{ color: "var(--color-signal)" }}>▍</span>}
          </div>
        </div>
      </section>

      {/* Transport */}
      <div className="w-full flex flex-col gap-2 mt-3 shrink-0" style={{ maxWidth: 880 }}>
        <div className="flex gap-1">
          {beats.map((b, i) => (
            <button key={i} type="button" onClick={() => goTo(i)} className="flex-1 h-1 border-0 p-0 cursor-pointer" style={{ background: i < index ? "var(--color-signal)" : i === index ? "color-mix(in srgb, var(--color-signal) 60%, transparent)" : "var(--color-border)" }} aria-label={`Go to ${b.kind === "rule" ? b.entry?.principle : b.kind}`} />
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} className="btn-secondary bg-transparent cursor-pointer px-3 py-2 text-[11px] tracking-[2px] disabled:opacity-30" style={{ color: "var(--color-foreground)", border: "1px solid rgba(184,212,160,.35)" }}>◀</button>
            <button type="button" onClick={() => (playing ? setPlaying(false) : ended ? goTo(0) : setPlaying(true))} className="btn-secondary bg-transparent cursor-pointer px-4 py-2 text-[11px] tracking-[2px]" style={{ color: "var(--color-foreground)", border: "1px solid rgba(184,212,160,.35)", minWidth: 96 }}>
              {playing ? "❚❚ PAUSE" : ended ? "↻ REPLAY" : "▶ PLAY"}
            </button>
            <button type="button" onClick={() => goTo(index + 1)} disabled={index >= beats.length - 1} className="btn-secondary bg-transparent cursor-pointer px-3 py-2 text-[11px] tracking-[2px] disabled:opacity-30" style={{ color: "var(--color-foreground)", border: "1px solid rgba(184,212,160,.35)" }}>▶</button>
          </div>
          <button
            type="button"
            onClick={onDone}
            className="cursor-pointer px-6 py-2.5 text-[12px] tracking-[3px] font-[family-name:var(--font-display)] transition-colors"
            style={{
              border: `2px solid ${ended ? "var(--color-signal)" : "rgba(110,255,160,.4)"}`,
              color: ended ? "var(--color-background)" : "var(--color-signal)",
              background: ended ? "var(--color-signal)" : "transparent",
            }}
          >
            {ended ? "CONTINUE ▸" : "SKIP DEBRIEF ▸"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CodeBox({ label, code, tone }: { label: string; code: string; tone: "dim" | "lit" }) {
  const lit = tone === "lit";
  return (
    <div className={lit ? "zen-after" : "zen-before"} style={{ border: `1px solid ${lit ? "rgba(110,255,160,.45)" : "rgba(184,212,160,.15)"}`, background: lit ? "rgba(110,255,160,.05)" : "rgba(4,8,16,.6)" }}>
      <div className="px-3 py-1 text-[9px] tracking-[3px]" style={{ color: lit ? "var(--color-signal)" : "var(--color-foreground)", opacity: lit ? 1 : 0.6, borderBottom: "1px solid var(--color-border)" }}>
        {label.toUpperCase()}
      </div>
      <pre className="px-3 py-2 text-[13px] leading-[1.6] overflow-x-auto font-[family-name:var(--font-mono)]" style={{ whiteSpace: "pre", opacity: lit ? 1 : 0.75 }} dangerouslySetInnerHTML={{ __html: highlight(code) }} />
    </div>
  );
}

const COLORS: Record<string, string> = {
  keyword: "var(--color-syn-keyword)",
  string: "var(--color-syn-string)",
  number: "var(--color-syn-number)",
  comment: "var(--color-syn-comment)",
  builtin: "var(--color-syn-builtin)",
  type: "var(--color-syn-type)",
};

function highlight(code: string): string {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  try {
    const tokens: Token[] = tokenize(code);
    let out = "";
    let cursor = 0;
    for (const t of tokens) {
      if (t.start > cursor) out += esc(code.slice(cursor, t.start));
      const color = COLORS[t.type];
      out += color ? `<span style="color:${color}">${esc(t.value)}</span>` : esc(t.value);
      cursor = Math.max(cursor, t.end);
    }
    if (cursor < code.length) out += esc(code.slice(cursor));
    return out;
  } catch {
    return esc(code);
  }
}
