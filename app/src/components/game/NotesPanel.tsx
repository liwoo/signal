"use client";

import { useState } from "react";
import { getBeginnerNotes, type BeginnerNotes, type NoteBlock } from "@/data/beginner-notes";
import { tokenize, type Token } from "@/lib/go/tokenizer";

const SCALE_MIN = 1;
const SCALE_MAX = 3;
const SCALE_STEP = 0.5;

interface NotesPanelProps {
  currentChapterId: string;
  completedChapterIds: string[];
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
}

/** Collects beginner notes for current + completed chapters. */
function collectNotes(
  currentChapterId: string,
  completedChapterIds: string[]
): Array<{ chapterId: string; notes: BeginnerNotes }> {
  const result: Array<{ chapterId: string; notes: BeginnerNotes }> = [];
  const seen = new Set<string>();

  // Completed chapters first (in order)
  for (const id of completedChapterIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const notes = getBeginnerNotes(id);
    if (notes) result.push({ chapterId: id, notes });
  }

  // Current chapter
  if (!seen.has(currentChapterId)) {
    const notes = getBeginnerNotes(currentChapterId);
    if (notes) result.push({ chapterId: currentChapterId, notes });
  }

  return result;
}

export function NotesPanel({ currentChapterId, completedChapterIds, fontScale, onFontScaleChange }: NotesPanelProps) {
  const allNotes = collectNotes(currentChapterId, completedChapterIds);
  const [expandedChapter, setExpandedChapter] = useState<string>(currentChapterId);

  if (allNotes.length === 0) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-[var(--color-dim)] text-[9px] tracking-[3px] mb-2">
            ▸ NOTES
          </div>
          <div className="text-[#0a3a4a] text-[11px] leading-[1.7]">
            no tutorial notes available yet
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 overflow-y-auto h-full">
      {/* Font scale controls */}
      <div className="flex items-center justify-end gap-1 mb-2">
        <button
          onClick={() => onFontScaleChange(Math.max(SCALE_MIN, fontScale - SCALE_STEP))}
          disabled={fontScale <= SCALE_MIN}
          className="bg-transparent text-[10px] px-1.5 py-0.5 cursor-pointer transition-colors
                     hover:bg-[rgba(110,255,160,.05)] disabled:opacity-20 disabled:cursor-default"
          style={{
            color: "var(--color-dim)",
            border: "1px solid rgba(110,255,160,.1)",
          }}
        >
          A−
        </button>
        <span className="text-[7px] tracking-[1px] min-w-[24px] text-center" style={{ color: "var(--color-dim)" }}>
          {fontScale}x
        </span>
        <button
          onClick={() => onFontScaleChange(Math.min(SCALE_MAX, fontScale + SCALE_STEP))}
          disabled={fontScale >= SCALE_MAX}
          className="bg-transparent text-[10px] px-1.5 py-0.5 cursor-pointer transition-colors
                     hover:bg-[rgba(110,255,160,.05)] disabled:opacity-20 disabled:cursor-default"
          style={{
            color: "var(--color-dim)",
            border: "1px solid rgba(110,255,160,.1)",
          }}
        >
          A+
        </button>
      </div>
      {allNotes.map(({ chapterId, notes }) => {
        const isExpanded = expandedChapter === chapterId;
        const isCurrent = chapterId === currentChapterId;

        return (
          <div key={chapterId} className="mb-2">
            {/* Chapter header — collapsible */}
            <button
              onClick={() => setExpandedChapter(isExpanded ? "" : chapterId)}
              className="w-full bg-transparent text-left px-2.5 py-2 cursor-pointer transition-colors flex items-center gap-2"
              style={{
                border: `1px solid ${isCurrent ? "rgba(110,255,160,.15)" : "rgba(110,255,160,.06)"}`,
                background: isExpanded ? "rgba(110,255,160,.03)" : "transparent",
              }}
            >
              <span
                className="text-[8px] transition-transform"
                style={{
                  color: "var(--color-dim)",
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                ▸
              </span>
              <span
                className="font-[family-name:var(--font-display)] text-[9px] tracking-[2px]"
                style={{ color: isCurrent ? "var(--color-signal)" : "var(--color-foreground)" }}
              >
                {notes.title}
              </span>
              <span className="text-[7px] tracking-[1px]" style={{ color: "var(--color-dim)" }}>
                {notes.subtitle}
              </span>
              {isCurrent && (
                <span
                  className="ml-auto text-[6px] tracking-[2px] px-1.5 py-0.5"
                  style={{
                    color: "var(--color-signal)",
                    border: "1px solid rgba(110,255,160,.2)",
                  }}
                >
                  CURRENT
                </span>
              )}
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div
                className="px-2.5 py-2"
                style={{
                  borderLeft: "1px solid rgba(110,255,160,.06)",
                  borderRight: "1px solid rgba(110,255,160,.06)",
                  borderBottom: "1px solid rgba(110,255,160,.06)",
                }}
              >
                {notes.blocks.map((block, i) => (
                  <NoteBlockView key={i} block={block} fontScale={fontScale} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NoteBlockView({ block, fontScale }: { block: NoteBlock; fontScale: number }) {
  const textSize = `${Math.round(10 * fontScale)}px`;

  if (block.type === "text") {
    return (
      <div
        className="leading-[1.7] mb-2"
        style={{ fontSize: textSize, color: "var(--color-foreground)", opacity: 0.8 }}
      >
        {block.content}
      </div>
    );
  }

  // Code block with syntax highlighting
  return (
    <div className="mb-2">
      <pre
        className="leading-[1.5] p-2.5 overflow-x-auto font-[family-name:var(--font-mono)]"
        style={{
          fontSize: textSize,
          background: "rgba(4,8,16,.6)",
          border: "1px solid rgba(110,255,160,.06)",
          tabSize: 4,
        }}
        dangerouslySetInnerHTML={{ __html: highlightGo(block.content) }}
      />
      {block.hotspots && block.hotspots.length > 0 && (
        <div className="mt-1 flex flex-col gap-0.5">
          {block.hotspots.map((hs, i) => (
            <HotspotTip key={i} text={hs.text} tip={hs.tip} />
          ))}
        </div>
      )}
    </div>
  );
}

function HotspotTip({ text, tip }: { text: string; tip: string }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full bg-transparent text-left px-2 py-1 cursor-pointer transition-colors"
      style={{
        border: "1px solid rgba(110,255,160,.04)",
        background: open ? "rgba(110,255,160,.03)" : "transparent",
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[8px]" style={{ color: "var(--color-signal)", opacity: 0.5 }}>
          ?
        </span>
        <code
          className="text-[9px] font-[family-name:var(--font-mono)]"
          style={{ color: "var(--color-signal)" }}
        >
          {text.length > 40 ? text.slice(0, 40) + "…" : text}
        </code>
      </div>
      {open && (
        <div
          className="text-[9px] leading-[1.6] mt-1 ml-3"
          style={{ color: "var(--color-dim)" }}
        >
          {tip}
        </div>
      )}
    </button>
  );
}

/** Simple Go syntax highlight using the tokenizer. */
function highlightGo(code: string): string {
  const TOKEN_COLORS: Record<string, string> = {
    keyword: "var(--color-syn-keyword)",
    string: "var(--color-syn-string)",
    number: "var(--color-syn-number)",
    comment: "var(--color-syn-comment)",
    builtin: "var(--color-syn-builtin)",
    function: "var(--color-syn-func)",
    operator: "var(--color-syn-operator)",
    type: "var(--color-syn-type)",
    package: "var(--color-syn-package)",
    punctuation: "var(--color-syn-punct)",
  };

  try {
    const tokens: Token[] = tokenize(code);
    return tokens
      .map((t: Token) => {
        const escaped = t.value
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        const color = TOKEN_COLORS[t.type];
        if (color) {
          return `<span style="color:${color}">${escaped}</span>`;
        }
        return escaped;
      })
      .join("");
  } catch {
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}
