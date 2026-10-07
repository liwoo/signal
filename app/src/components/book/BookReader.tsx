"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BeginnerNotes, NoteBlock } from "@/data/beginner-notes";
import { getSectionCountFromBlocks } from "@/data/beginner-notes";
import { BOOK } from "@/data/book";
import type { BookChapter } from "@/data/book";
import { BookCover } from "./BookCover";
import { ProgramBlueprint } from "@/components/game/diagrams/ProgramBlueprint";
import { GoAppliance } from "@/components/game/diagrams/GoAppliance";
import { DoorCodeMachine } from "@/components/game/diagrams/DoorCodeMachine";
import { DoorCodeVideo } from "@/components/game/diagrams/DoorCodeVideo";
import { ShaftFunctions } from "@/components/game/diagrams/ShaftFunctions";
import { GuardRoster } from "@/components/game/diagrams/GuardRoster";
import { CipherRelay } from "@/components/game/diagrams/CipherRelay";
import { trackBeginnerHotspot } from "@/lib/analytics";

const HOTSPOT_XP = 5;
const SCALE_MIN = 1;
const SCALE_MAX = 3;
const SCALE_STEP = 0.5;
const TURN_MS = 300;

interface BookReaderProps {
  notes: BeginnerNotes;
  chapter: BookChapter | null;
  chapterId: string;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
  /** Close the book and start the round. */
  onReady: () => void;
  /** Turn beginner mode off (skip the reading from now on). */
  onDisable: () => void;
  onHotspotXP: (amount: number) => void;
  soundEnabled?: boolean;
}

type Edition = "manual" | "plain";

type Page =
  | { kind: "inside-cover" }
  | { kind: "title" }
  | { kind: "section"; index: number; blocks: NoteBlock[] }
  | { kind: "end" };

function buildPages(blocks: NoteBlock[]): Page[] {
  const sections = getSectionCountFromBlocks(blocks);
  const pages: Page[] = [{ kind: "inside-cover" }, { kind: "title" }];
  for (let i = 0; i < sections; i++) {
    pages.push({ kind: "section", index: i, blocks: blocks.filter((b) => b.section === i) });
  }
  pages.push({ kind: "end" });
  return pages;
}

/**
 * The found chapter, read before the round: the beginner notes typeset as a
 * real book. Two-page spread on wide screens, one page on phones; pages turn
 * with ▸/◂, the arrow keys, or a tap on the page edge. Hotspots in listings
 * become footnotes and still pay the +5 XP.
 */
export function BookReader({ notes, chapter, chapterId, fontScale, onFontScaleChange, onReady, onDisable, onHotspotXP, soundEnabled = true }: BookReaderProps) {
  const hasPlain = !!notes.beginnerBlocks && notes.beginnerBlocks.length > 0;
  const [edition, setEdition] = useState<Edition>("manual");
  const blocks = edition === "plain" && notes.beginnerBlocks ? notes.beginnerBlocks : notes.blocks;
  const pages = useMemo(() => buildPages(blocks), [blocks]);
  const [spread, setSpread] = useState(0);
  const [turning, setTurning] = useState<"next" | "prev" | "land" | null>(null);
  const [clicked, setClicked] = useState<Set<string>>(new Set());
  const [earnedXP, setEarnedXP] = useState(0);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const perSpread = narrow ? 1 : 2;
  const spreadCount = Math.ceil(pages.length / perSpread);
  const atEnd = spread >= spreadCount - 1;
  const leftPage = pages[spread * perSpread] ?? null;
  const rightPage = narrow ? null : pages[spread * perSpread + 1] ?? null;

  const turn = useCallback((dir: "next" | "prev") => {
    if (turning) return;
    if (dir === "next" && atEnd) return;
    if (dir === "prev" && spread === 0) return;
    setTurning(dir);
    window.setTimeout(() => {
      setSpread((s) => s + (dir === "next" ? 1 : -1));
      setTurning(dir === "next" ? "land" : null);
      window.setTimeout(() => setTurning(null), 260);
    }, TURN_MS);
  }, [turning, atEnd, spread]);

  const switchEdition = useCallback((next: Edition) => {
    if (next === edition) return;
    setEdition(next);
    setSpread(0);
  }, [edition]);

  const handleHotspot = useCallback((text: string) => {
    if (clicked.has(text)) return;
    setClicked((prev) => new Set(prev).add(text));
    setEarnedXP((xp) => xp + HOTSPOT_XP);
    onHotspotXP(HOTSPOT_XP);
    trackBeginnerHotspot(chapterId, text);
  }, [clicked, onHotspotXP, chapterId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); if (atEnd) onReady(); else turn("next"); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); turn("prev"); }
      if (e.key === "Enter" && atEnd) onReady();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [turn, atEnd, onReady]);

  const bodyPx = Math.round(10 * fontScale + 3);
  const pageNumber = (page: Page | null, slot: number) => {
    if (!page || page.kind === "inside-cover") return null;
    return spread * perSpread + slot;
  };

  return (
    <div className="book-desk fixed inset-0 z-[60] flex flex-col" role="dialog" aria-modal="true" aria-label={`${BOOK.title} — chapter ${chapter?.numeral ?? ""}`}>
      {/* Toolbar — the game's chrome, over the desk */}
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2 sm:px-6" style={{ background: "rgba(4,8,16,0.72)", borderBottom: "1px solid rgba(110,255,160,0.08)" }}>
        <div className="min-w-0 text-[7px] tracking-[3px] sm:text-[8px]" style={{ color: "var(--color-dim)" }}>
          ▸ FIELD MANUAL{chapter ? ` · CHAPTER ${chapter.numeral}` : ""} · {notes.title}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {hasPlain && (
            <div className="hidden items-center sm:flex" style={{ border: "1px solid rgba(184,212,160,0.25)" }}>
              {(["manual", "plain"] as Edition[]).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => switchEdition(e)}
                  className="cursor-pointer bg-transparent px-2 py-1 text-[7px] tracking-[2px]"
                  style={{ color: edition === e ? "var(--color-signal)" : "var(--color-dim)", background: edition === e ? "rgba(110,255,160,0.08)" : "transparent" }}
                >
                  {e === "manual" ? "THE MANUAL" : "PLAIN EDITION"}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Smaller text" disabled={fontScale <= SCALE_MIN} onClick={() => onFontScaleChange(Math.max(SCALE_MIN, fontScale - SCALE_STEP))} className="cursor-pointer bg-transparent px-2 py-1 text-[9px] disabled:opacity-30" style={{ color: "var(--color-foreground)", border: "1px solid rgba(184,212,160,0.25)" }}>A−</button>
            <button type="button" aria-label="Larger text" disabled={fontScale >= SCALE_MAX} onClick={() => onFontScaleChange(Math.min(SCALE_MAX, fontScale + SCALE_STEP))} className="cursor-pointer bg-transparent px-2 py-1 text-[9px] disabled:opacity-30" style={{ color: "var(--color-foreground)", border: "1px solid rgba(184,212,160,0.25)" }}>A+</button>
          </div>
          {earnedXP > 0 && (
            <div className="text-[8px] tracking-[2px]" style={{ color: "var(--color-win)" }}>+{earnedXP} XP</div>
          )}
          <button type="button" onClick={onDisable} className="cursor-pointer bg-transparent px-2 py-1 text-[7px] tracking-[2px] sm:text-[8px]" style={{ color: "var(--color-dim)", border: "1px solid rgba(184,212,160,0.2)" }}>
            DON&apos;T SHOW AGAIN
          </button>
        </div>
      </div>

      {/* The open book */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 py-3 sm:px-6 sm:py-5" style={{ perspective: "1600px" }}>
        <div
          className={`relative flex h-full w-full max-w-[1180px] ${turning === "next" ? "book-turning-next" : turning === "prev" ? "book-turning-prev" : turning === "land" ? "book-landing" : ""}`}
          style={{ maxHeight: "86dvh", transformStyle: "preserve-3d" }}
        >
          {/* Boards behind the pages */}
          <div className="book-leather absolute" style={{ inset: narrow ? "-6px -8px -10px -8px" : "-8px -14px -14px -14px" }} />
          {/* Page edge stacks */}
          <div className="book-edges-bottom absolute" style={{ left: narrow ? 2 : 6, right: narrow ? 2 : 6, bottom: -7, height: 7 }} />

          <BookPage
            side={narrow ? "single" : "left"}
            page={leftPage}
            number={pageNumber(leftPage, 0)}
            notes={notes}
            chapter={chapter}
            bodyPx={bodyPx}
            clicked={clicked}
            onHotspot={handleHotspot}
            soundEnabled={soundEnabled}
            onTurn={() => turn("prev")}
            onReady={onReady}
            atEnd={atEnd}
          />
          {!narrow && (
            <>
              <div className="relative z-10 w-[14px] shrink-0" style={{ background: "linear-gradient(90deg, rgba(40,25,10,0.45), rgba(0,0,0,0.6) 50%, rgba(40,25,10,0.45))" }} />
              <BookPage
                side="right"
                page={rightPage}
                number={pageNumber(rightPage, 1)}
                notes={notes}
                chapter={chapter}
                bodyPx={bodyPx}
                clicked={clicked}
                onHotspot={handleHotspot}
                soundEnabled={soundEnabled}
                onTurn={() => turn("next")}
                onReady={onReady}
                atEnd={atEnd}
              />
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2 sm:px-6" style={{ background: "rgba(4,8,16,0.72)", borderTop: "1px solid rgba(110,255,160,0.08)" }}>
        <button type="button" onClick={() => turn("prev")} disabled={spread === 0} className="cursor-pointer bg-transparent px-4 py-2 text-[9px] tracking-[3px] disabled:opacity-30" style={{ color: "var(--color-foreground)", border: "1px solid rgba(184,212,160,0.3)" }}>
          ◂ BACK
        </button>
        <div className="text-[7px] tracking-[3px]" style={{ color: "var(--color-dim)" }}>
          {spread + 1} / {spreadCount}
        </div>
        {atEnd ? (
          <button type="button" onClick={onReady} className="cursor-pointer bg-transparent px-5 py-2.5 text-[9px] tracking-[3px] hover:bg-[rgba(110,255,160,.08)] sm:text-[10px]" style={{ color: "var(--color-signal)", border: "1px solid rgba(110,255,160,0.35)" }}>
            CLOSE THE BOOK · START LEVEL <span style={{ opacity: 0.35, fontSize: 8 }}>⏎</span>
          </button>
        ) : (
          <button type="button" onClick={() => turn("next")} className="cursor-pointer bg-transparent px-5 py-2.5 text-[9px] tracking-[3px] hover:bg-[rgba(110,255,160,.08)] sm:text-[10px]" style={{ color: "var(--color-signal)", border: "1px solid rgba(110,255,160,0.35)" }}>
            TURN THE PAGE ▸
          </button>
        )}
      </div>
    </div>
  );
}

// ── Pages ──

interface BookPageProps {
  side: "left" | "right" | "single";
  page: Page | null;
  number: number | null;
  notes: BeginnerNotes;
  chapter: BookChapter | null;
  bodyPx: number;
  clicked: Set<string>;
  onHotspot: (text: string) => void;
  soundEnabled: boolean;
  onTurn: () => void;
  onReady: () => void;
  atEnd: boolean;
}

function BookPage({ side, page, number, notes, chapter, bodyPx, clicked, onHotspot, soundEnabled, onTurn, onReady, atEnd }: BookPageProps) {
  const sideClass = side === "right" ? "book-page-right" : "book-page-left";
  const running = chapter ? `${BOOK.title} · ${BOOK.subtitle}` : notes.title;
  return (
    <div
      className={`book-paper ${sideClass} relative flex min-h-0 flex-1 flex-col font-[family-name:var(--font-book)]`}
      style={{ backfaceVisibility: "hidden" }}
    >
      {/* Running head */}
      <div className={`flex shrink-0 items-center px-6 pt-4 text-[9px] italic sm:px-10 sm:pt-6 ${side === "right" ? "justify-end" : "justify-start"}`} style={{ color: "var(--color-ink-soft)", letterSpacing: "0.12em" }}>
        {page && page.kind !== "inside-cover" ? (side === "right" ? (chapter ? `${chapter.numeral} · ${chapter.title}` : notes.subtitle) : running) : ""}
      </div>

      <div className="book-page-body min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-3 sm:px-10 sm:pt-5" style={{ fontSize: bodyPx, lineHeight: 1.5 }}>
        {page?.kind === "inside-cover" && <InsideCover chapter={chapter} />}
        {page?.kind === "title" && <TitlePage chapter={chapter} notes={notes} />}
        {page?.kind === "section" && (
          <SectionPage blocks={page.blocks} index={page.index} clicked={clicked} onHotspot={onHotspot} soundEnabled={soundEnabled} bodyPx={bodyPx} />
        )}
        {page?.kind === "end" && <EndPage chapter={chapter} onReady={onReady} />}
      </div>

      {/* Folio */}
      <div className={`flex shrink-0 items-center px-6 pb-3 text-[10px] sm:px-10 sm:pb-5 ${side === "right" ? "justify-end" : "justify-start"}`} style={{ color: "var(--color-ink-soft)" }}>
        {number !== null ? number : ""}
      </div>

      {/* Tap the outer edge to turn */}
      {page && !(side !== "left" && atEnd) && (
        <button
          type="button"
          aria-label={side === "left" ? "Previous page" : "Next page"}
          onClick={onTurn}
          className={`absolute inset-y-0 ${side === "left" ? "left-0" : "right-0"} w-8 cursor-pointer bg-transparent sm:w-12`}
        />
      )}
    </div>
  );
}

function InsideCover({ chapter }: { chapter: BookChapter | null }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <BookCover chapter={chapter} width={120} className="mb-6 opacity-90" />
      <div className="font-[family-name:var(--font-hand)]" style={{ fontSize: "1.45em", color: "var(--color-ink)", transform: "rotate(-2deg)" }}>
        {BOOK.dedication}
        <div className="mt-1 text-right" style={{ fontSize: "0.9em" }}>{BOOK.signature}</div>
      </div>
      {chapter && (
        <div className="mt-8 text-[0.72em] italic" style={{ color: "var(--color-ink-soft)", letterSpacing: "0.08em" }}>
          found {chapter.hiddenIn}
        </div>
      )}
    </div>
  );
}

function TitlePage({ chapter, notes }: { chapter: BookChapter | null; notes: BeginnerNotes }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="text-[0.7em]" style={{ letterSpacing: "0.4em", color: "var(--color-ink-soft)" }}>CHAPTER</div>
      <div className="mt-2 font-semibold" style={{ fontSize: "3.2em", lineHeight: 1 }}>{chapter?.numeral ?? "·"}</div>
      <div className="my-4 h-px w-16" style={{ background: "var(--color-ink-soft)" }} />
      <div className="italic" style={{ fontSize: "1.5em" }}>{chapter?.title ?? notes.title}</div>
      <div className="mt-2 text-[0.8em]" style={{ letterSpacing: "0.2em", color: "var(--color-ink-soft)" }}>{notes.subtitle.toLowerCase()}</div>
      {chapter && (
        <div className="mt-10 max-w-[80%] font-[family-name:var(--font-hand)]" style={{ fontSize: "1.5em", lineHeight: 1.2, color: "#3b3a6b", transform: "rotate(-1.5deg)" }}>
          “{chapter.marginNote}”
        </div>
      )}
    </div>
  );
}

function EndPage({ chapter, onReady }: { chapter: BookChapter | null; onReady: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="text-[0.75em]" style={{ letterSpacing: "0.4em", color: "var(--color-ink-soft)" }}>END OF CHAPTER {chapter?.numeral ?? ""}</div>
      <div className="my-5 text-[1.4em]">❦</div>
      <div className="max-w-[80%] italic" style={{ fontSize: "1.05em" }}>
        the rest is practice. close the book and put it to work at the terminal.
      </div>
      <button
        type="button"
        onClick={onReady}
        className="mt-8 cursor-pointer px-5 py-2 text-[0.72em]"
        style={{ letterSpacing: "0.3em", color: "var(--color-paper)", background: "var(--color-ink)", border: "1px solid var(--color-ink)" }}
      >
        CLOSE THE BOOK
      </button>
    </div>
  );
}

// ── Section content ──

function SectionPage({ blocks, index, clicked, onHotspot, soundEnabled, bodyPx }: {
  blocks: NoteBlock[];
  index: number;
  clicked: Set<string>;
  onHotspot: (text: string) => void;
  soundEnabled: boolean;
  bodyPx: number;
}) {
  // Footnotes: every hotspot the reader has opened on this page, in reading order.
  const footnotes: { n: number; text: string; tip: string }[] = [];
  let counter = 0;
  const numbered = new Map<string, number>();
  for (const block of blocks) {
    for (const h of block.hotspots ?? []) {
      counter += 1;
      numbered.set(h.text, counter);
      if (clicked.has(h.text)) footnotes.push({ n: counter, text: h.text, tip: h.tip });
    }
  }
  const firstProse = blocks.findIndex((b) => b.type === "text");
  return (
    <div>
      {index === 0 && <div className="mb-3 text-[0.7em]" style={{ letterSpacing: "0.3em", color: "var(--color-ink-soft)" }}>§ {index + 1}</div>}
      {index > 0 && <div className="mb-3 text-[0.7em]" style={{ letterSpacing: "0.3em", color: "var(--color-ink-soft)" }}>§ {index + 1}</div>}
      {blocks.map((block, i) => {
        if (block.type === "text") {
          const drop = i === firstProse;
          return (
            <p
              key={i}
              className={`mb-3 ${drop ? "book-drop-cap" : ""} ${block.important ? "pl-3" : ""}`}
              style={{ textAlign: "justify", hyphens: "auto", borderLeft: block.important ? "2px solid var(--color-gilt)" : undefined }}
            >
              {block.important && <span className="mr-1" style={{ color: "var(--color-gilt)" }}>✦</span>}
              {block.content}
            </p>
          );
        }
        if (block.type === "code") {
          return (
            <Listing key={i} block={block} numbered={numbered} clicked={clicked} onHotspot={onHotspot} bodyPx={bodyPx} />
          );
        }
        return (
          <Plate key={i} block={block} clicked={clicked} onHotspot={onHotspot} soundEnabled={soundEnabled} />
        );
      })}
      {blocks.some((b) => (b.hotspots?.length ?? 0) > 0) && (
        <div className="mt-2 text-[0.72em] italic" style={{ color: "var(--color-ink-soft)" }}>
          {footnotes.length === 0
            ? `annotated terms are marked — touch one for the footnote (+${HOTSPOT_XP} xp).`
            : null}
        </div>
      )}
      {footnotes.length > 0 && (
        <div className="mt-4 pt-2" style={{ borderTop: "1px solid var(--color-paper-shade)", fontSize: "0.82em", lineHeight: 1.4 }}>
          {footnotes.map((f) => (
            <div key={f.n} className="mb-1.5">
              <sup className="mr-1">{f.n}</sup>
              <span className="font-[family-name:var(--font-mono)]" style={{ fontSize: "0.85em" }}>{f.text}</span>
              {" — "}
              <span>{f.tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Listing({ block, numbered, clicked, onHotspot, bodyPx }: {
  block: NoteBlock;
  numbered: Map<string, number>;
  clicked: Set<string>;
  onHotspot: (text: string) => void;
  bodyPx: number;
}) {
  const hotspots = block.hotspots ?? [];
  // Split the listing into plain runs and hotspot runs (first match of each, in order of appearance).
  const parts: { text: string; hot: boolean }[] = [];
  let rest = block.content;
  while (rest.length > 0) {
    let best: { at: number; text: string } | null = null;
    for (const h of hotspots) {
      const at = rest.indexOf(h.text);
      if (at >= 0 && (!best || at < best.at)) best = { at, text: h.text };
    }
    if (!best) { parts.push({ text: rest, hot: false }); break; }
    if (best.at > 0) parts.push({ text: rest.slice(0, best.at), hot: false });
    parts.push({ text: best.text, hot: true });
    rest = rest.slice(best.at + best.text.length);
  }
  return (
    <pre
      className="my-3 overflow-x-auto whitespace-pre px-3 py-2 font-[family-name:var(--font-mono)]"
      style={{
        fontSize: Math.max(10, Math.round(bodyPx * 0.78)),
        lineHeight: 1.45,
        color: "var(--color-ink)",
        background: "rgba(42,36,32,0.06)",
        borderTop: "1px solid var(--color-paper-shade)",
        borderBottom: "1px solid var(--color-paper-shade)",
      }}
    >
      {parts.map((p, i) =>
        p.hot ? (
          <span
            key={i}
            role="button"
            tabIndex={0}
            className={`book-hotspot ${clicked.has(p.text) ? "book-hotspot-read" : ""}`}
            onClick={() => onHotspot(p.text)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onHotspot(p.text); } }}
          >
            {p.text}
            <sup style={{ fontSize: "0.7em" }}>{numbered.get(p.text)}</sup>
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </pre>
  );
}

/** A "plate": the interactive diagrams, mounted on the page like a tipped-in figure. */
function Plate({ block, clicked, onHotspot, soundEnabled }: {
  block: NoteBlock;
  clicked: Set<string>;
  onHotspot: (id: string) => void;
  soundEnabled: boolean;
}) {
  const id = block.diagramId;
  return (
    <figure className="my-3">
      <div className="flex min-h-[260px] flex-col" style={{ background: "var(--color-background)", border: "1px solid var(--color-paper-shade)", padding: 6 }}>
        {id === "ch01-blueprint" && <ProgramBlueprint onHotspotClick={onHotspot} clickedIds={clicked} />}
        {id === "ch01-animation" && <GoAppliance view="animation" autoPlay soundEnabled={soundEnabled} onHotspotClick={onHotspot} clickedIds={clicked} />}
        {id === "ch01-card" && <GoAppliance view="card" onHotspotClick={onHotspot} clickedIds={clicked} />}
        {id === "ch01-appliance" && <GoAppliance soundEnabled={soundEnabled} onHotspotClick={onHotspot} clickedIds={clicked} />}
        {id === "ch02-animation" && <DoorCodeVideo autoPlay soundEnabled={soundEnabled} />}
        {id === "ch02-card" && <DoorCodeMachine view="card" onHotspotClick={onHotspot} clickedIds={clicked} />}
        {id === "ch03-animation" && <ShaftFunctions view="animation" onHotspotClick={onHotspot} clickedIds={clicked} />}
        {id === "ch03-card" && <ShaftFunctions view="card" onHotspotClick={onHotspot} clickedIds={clicked} />}
        {id === "ch04-animation" && <GuardRoster view="animation" onHotspotClick={onHotspot} clickedIds={clicked} />}
        {id === "ch04-card" && <GuardRoster view="card" onHotspotClick={onHotspot} clickedIds={clicked} />}
        {id === "ch04.2-animation" && <CipherRelay view="animation" onHotspotClick={onHotspot} clickedIds={clicked} />}
        {id === "ch04.2-card" && <CipherRelay view="card" onHotspotClick={onHotspot} clickedIds={clicked} />}
      </div>
      <figcaption className="mt-1 text-center text-[0.72em] italic" style={{ color: "var(--color-ink-soft)" }}>
        plate · {block.content || id}
      </figcaption>
    </figure>
  );
}
