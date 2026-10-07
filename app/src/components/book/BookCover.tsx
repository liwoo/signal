"use client";

import { BOOK } from "@/data/book";
import type { BookChapter } from "@/data/book";

interface BookCoverProps {
  /** When set, the torn chapter's first page peeks out of the cover. */
  chapter?: BookChapter | null;
  /** Width in px; the cover keeps a 2:3 ratio. */
  width?: number;
  className?: string;
}

/**
 * The closed field manual: worn leather boards, a raised spine, gilt title,
 * and (optionally) a folded chapter slip tucked into the fore-edge. Pure CSS —
 * gradients and an SVG grain, no images, no border-radius, no box-shadow.
 */
export function BookCover({ chapter = null, width = 220, className = "" }: BookCoverProps) {
  const height = Math.round(width * 1.5);
  const unit = width / 220;
  return (
    <div className={`relative select-none ${className}`} style={{ width, height: height + 10 * unit }} aria-label={`${BOOK.title}: ${BOOK.subtitle}, by ${BOOK.author}`}>
      {/* Page block showing below the boards */}
      <div
        className="book-edges-bottom absolute"
        style={{ left: 10 * unit, right: 6 * unit, top: 8 * unit, bottom: 0 }}
      />
      {/* Boards */}
      <div className="book-leather absolute inset-x-0 top-0" style={{ height, borderTop: `1px solid rgba(255,255,255,0.12)` }}>
        {/* Spine ridge */}
        <div className="absolute inset-y-0 left-0" style={{ width: 14 * unit, background: "linear-gradient(90deg, rgba(0,0,0,0.5), rgba(0,0,0,0.2) 50%, rgba(255,255,255,0.08) 80%, rgba(0,0,0,0.35))" }} />
        {/* Blind-embossed frame */}
        <div
          className="absolute"
          style={{
            left: 28 * unit, right: 16 * unit, top: 20 * unit, bottom: 20 * unit,
            border: `${Math.max(1, Math.round(1.5 * unit))}px solid rgba(0,0,0,0.42)`,
            outline: `1px solid rgba(255,230,180,0.14)`,
            outlineOffset: `-${Math.round(4 * unit)}px`,
          }}
        />
        {/* Title block */}
        <div className="absolute flex flex-col items-center text-center" style={{ left: 28 * unit, right: 16 * unit, top: 56 * unit }}>
          <div className="book-gilt font-[family-name:var(--font-book)] font-semibold" style={{ fontSize: 46 * unit, letterSpacing: `${0.28 * unit}em`, lineHeight: 1 }}>
            {BOOK.title}
          </div>
          <div className="book-gilt mt-2 font-[family-name:var(--font-book)]" style={{ fontSize: 11 * unit, letterSpacing: `${0.34 * unit}em` }}>
            {BOOK.subtitle}
          </div>
          <div className="mt-3 h-px" style={{ width: 46 * unit, background: "rgba(201,165,90,0.6)" }} />
        </div>
        <div className="book-emboss absolute text-center font-[family-name:var(--font-book)] italic" style={{ left: 28 * unit, right: 16 * unit, bottom: 36 * unit, fontSize: 11 * unit, letterSpacing: `${0.2 * unit}em` }}>
          {BOOK.author}
        </div>
        {/* Wear: corner rubbing */}
        <div className="absolute right-0 top-0" style={{ width: 26 * unit, height: 26 * unit, background: "linear-gradient(225deg, rgba(255,220,190,0.14), rgba(0,0,0,0) 60%)" }} />
        <div className="absolute bottom-0 right-0" style={{ width: 40 * unit, height: 30 * unit, background: "linear-gradient(315deg, rgba(255,220,190,0.1), rgba(0,0,0,0) 60%)" }} />
      </div>
      {/* The torn chapter, tucked in at the fore-edge */}
      {chapter && (
        <div
          className="book-paper absolute font-[family-name:var(--font-book)]"
          style={{
            right: -18 * unit, top: 150 * unit, width: 120 * unit, height: 150 * unit,
            transform: `rotate(${7}deg)`,
            borderLeft: "1px solid rgba(0,0,0,0.15)",
            backgroundImage: "linear-gradient(90deg, rgba(0,0,0,0.12), rgba(0,0,0,0) 14%)",
          }}
        >
          <div className="absolute inset-x-0 text-center" style={{ top: 18 * unit }}>
            <div style={{ fontSize: 8 * unit, letterSpacing: `${0.3 * unit}em`, color: "var(--color-ink-soft)" }}>CHAPTER</div>
            <div className="font-semibold" style={{ fontSize: 26 * unit, lineHeight: 1.1 }}>{chapter.numeral}</div>
            <div className="mx-auto my-1 h-px" style={{ width: 30 * unit, background: "var(--color-ink-soft)" }} />
            <div className="italic" style={{ fontSize: 10 * unit }}>{chapter.title}</div>
          </div>
          {/* Faux text lines */}
          <div className="absolute" style={{ left: 14 * unit, right: 12 * unit, top: 82 * unit }}>
            {[1, 0.9, 0.95, 0.7, 0.88, 0.6].map((w, i) => (
              <div key={i} className="mb-[3px]" style={{ height: Math.max(1, 1.4 * unit), width: `${w * 100}%`, background: "rgba(42,36,32,0.32)" }} />
            ))}
          </div>
          {/* Fold crease */}
          <div className="absolute inset-y-0" style={{ left: "50%", width: 1, background: "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.18), rgba(0,0,0,0))" }} />
        </div>
      )}
    </div>
  );
}
