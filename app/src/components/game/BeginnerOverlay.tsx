"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { BeginnerNotes, NoteBlock, Hotspot } from "@/data/beginner-notes";
import { getSectionCountFromBlocks } from "@/data/beginner-notes";
import { ProgramBlueprint } from "./diagrams/ProgramBlueprint";
import { GoAppliance } from "./diagrams/GoAppliance";
import { DoorCodeMachine } from "./diagrams/DoorCodeMachine";
import { ShaftFunctions } from "./diagrams/ShaftFunctions";
import { GuardRoster } from "./diagrams/GuardRoster";
import { trackBeginnerHotspot } from "@/lib/analytics";

const HOTSPOT_XP = 5;

const SCALE_MIN = 1;
const SCALE_MAX = 3;
const SCALE_STEP = 0.5;

interface BeginnerOverlayProps {
  notes: BeginnerNotes;
  chapterId: string;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
  onReady: () => void;
  onDisable: () => void;
  onHotspotXP: (amount: number) => void;
}

type BriefingTab = "beginner" | "expert";

export function BeginnerOverlay({ notes, chapterId, fontScale, onFontScaleChange, onReady, onDisable, onHotspotXP }: BeginnerOverlayProps) {
  const hasBeginner = !!notes.beginnerBlocks && notes.beginnerBlocks.length > 0;
  const [activeTab, setActiveTab] = useState<BriefingTab>(hasBeginner ? "beginner" : "expert");
  const activeBlocks = activeTab === "beginner" && notes.beginnerBlocks ? notes.beginnerBlocks : notes.blocks;
  const totalSections = getSectionCountFromBlocks(activeBlocks);
  const [currentSection, setCurrentSection] = useState(0);
  const [sectionDone, setSectionDone] = useState(false);
  const [typingBlockIndex, setTypingBlockIndex] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [earnedXP, setEarnedXP] = useState(0);
  const [clickedHotspots, setClickedHotspots] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sectionBlocks = activeBlocks.filter((b) => b.section === currentSection);
  const currentTypingBlock = typingBlockIndex < sectionBlocks.length ? sectionBlocks[typingBlockIndex] : null;
  const currentContent = currentTypingBlock?.content ?? "";
  const isLastSection = currentSection >= totalSections - 1;

  // When the section is a single diagram, give it the full remaining height
  // so its internal scroll + pinned controls work correctly
  const isDiagramSection = sectionBlocks.length > 0 && sectionBlocks.every((b) => b.type === "diagram");

  const sectionHasHotspots = sectionBlocks.some(
    (b) => (b.type === "code" && b.hotspots && b.hotspots.length > 0) || b.type === "diagram"
  );

  const handleHotspotClick = useCallback((hotspotText: string) => {
    if (clickedHotspots.has(hotspotText)) return;
    setClickedHotspots((prev) => new Set(prev).add(hotspotText));
    setEarnedXP((prev) => prev + HOTSPOT_XP);
    onHotspotXP(HOTSPOT_XP);
    trackBeginnerHotspot(chapterId, hotspotText);
  }, [clickedHotspots, onHotspotXP, chapterId]);

  useEffect(() => {
    if (!currentTypingBlock) {
      setSectionDone(true);
      return;
    }

    // Diagram blocks render instantly — skip typing animation
    if (currentTypingBlock.type === "diagram") {
      setTimeout(() => {
        setTypingBlockIndex((i) => i + 1);
        setTypedChars(0);
      }, 100);
      return;
    }

    const speed = currentTypingBlock.type === "code" ? 8 : 18;
    intervalRef.current = setInterval(() => {
      setTypedChars((prev) => {
        if (prev >= currentContent.length) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setTimeout(() => {
            setTypingBlockIndex((i) => i + 1);
            setTypedChars(0);
          }, 300);
          return prev;
        }
        return prev + 1;
      });
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentSection, typingBlockIndex, currentTypingBlock, currentContent.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [typingBlockIndex, typedChars, currentSection]);

  const skipSection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTypingBlockIndex(sectionBlocks.length);
    setTypedChars(0);
    setSectionDone(true);
  }, [sectionBlocks.length]);

  const advanceSection = useCallback(() => {
    if (isLastSection) {
      onReady();
      return;
    }
    setCurrentSection((s) => s + 1);
    setTypingBlockIndex(0);
    setTypedChars(0);
    setSectionDone(false);
  }, [isLastSection, onReady]);

  const switchTab = useCallback((tab: BriefingTab) => {
    if (tab === activeTab) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActiveTab(tab);
    setCurrentSection(0);
    setTypingBlockIndex(0);
    setTypedChars(0);
    setSectionDone(false);
  }, [activeTab]);

  // Allow Enter key to advance when section is done
  useEffect(() => {
    if (!sectionDone) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") advanceSection();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sectionDone, advanceSection]);

  const completedBlocks = activeBlocks.filter((b) => b.section < currentSection);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: "rgba(4,8,16,.92)" }}
    >
      <div className={`${isDiagramSection ? "max-w-[960px]" : "max-w-[860px]"} w-full mx-6 flex flex-col`} style={{ maxHeight: "90dvh", height: isDiagramSection ? "90dvh" : "auto" }}>
        {/* Header */}
        <div className="shrink-0 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-[7px] tracking-[4px]" style={{ color: "var(--color-dim)" }}>
              ▸ BEGINNER BRIEFING
            </div>
            <div className="flex items-center gap-3">
              {/* Font scale controls */}
              <div className="flex items-center gap-1">
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
              {earnedXP > 0 && (
                <div
                  className="text-[9px] tracking-[2px] font-[family-name:var(--font-display)]"
                  style={{ color: "var(--color-signal)" }}
                >
                  +{earnedXP} XP
                </div>
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <div
              className="font-[family-name:var(--font-display)] font-bold tracking-[4px] text-lg"
              style={{ color: "var(--color-signal)" }}
            >
              {notes.title}
            </div>
            <div className="text-[8px] tracking-[2px]" style={{ color: "var(--color-dim)" }}>
              {currentSection + 1}/{totalSections}
            </div>
          </div>
          <div className="text-[8px] tracking-[3px] mt-0.5" style={{ color: "var(--color-dim)" }}>
            {notes.subtitle}
          </div>

          {/* Tab switcher — only shown when beginner blocks exist */}
          {hasBeginner && (
            <div className="flex gap-0 mt-3" style={{ borderBottom: "1px solid rgba(110,255,160,.08)" }}>
              {(["beginner", "expert"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => switchTab(tab)}
                  className="bg-transparent text-[8px] tracking-[2px] px-4 py-1.5 cursor-pointer transition-colors font-[family-name:var(--font-display)]"
                  style={{
                    color: activeTab === tab ? "var(--color-signal)" : "var(--color-dim)",
                    border: "none",
                    borderBottom: activeTab === tab ? "2px solid var(--color-signal)" : "2px solid transparent",
                    opacity: activeTab === tab ? 1 : 0.5,
                  }}
                >
                  {tab === "beginner" ? "BEGINNER MODE" : "EXPERT MODE"}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-1.5 mt-2.5">
            {Array.from({ length: totalSections }, (_, i) => (
              <div
                key={i}
                className="h-[3px] flex-1 transition-colors duration-300"
                style={{
                  background:
                    i < currentSection
                      ? "var(--color-signal)"
                      : i === currentSection
                        ? "var(--color-alert)"
                        : "rgba(110,255,160,.1)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Notebook content — diagram sections get full height, text sections scroll */}
        <div
          ref={scrollRef}
          className={isDiagramSection ? "flex-1 min-h-0 flex flex-col" : "flex-1 overflow-y-auto pr-4 space-y-4"}
          style={isDiagramSection ? {} : {
            borderLeft: "2px solid rgba(110,255,160,.15)",
            paddingLeft: 24,
          }}
        >
          {!isDiagramSection && completedBlocks.map((block, i) => (
            <BlockRenderer
              key={`prev-${i}`}
              block={block}
              text={block.content}
              isStreaming={false}
              dimmed
              interactive={false}
              clickedHotspots={clickedHotspots}
              onHotspotClick={handleHotspotClick}
              fontScale={fontScale}
            />
          ))}

          {!isDiagramSection && completedBlocks.length > 0 && (
            <div className="h-px my-2" style={{ background: "rgba(110,255,160,.08)" }} />
          )}

          {sectionBlocks.map((block, i) => {
            if (i > typingBlockIndex) return null;
            const isTyping = i === typingBlockIndex;
            const text = isTyping ? currentContent.slice(0, typedChars) : block.content;
            if (!text && block.type !== "diagram") return null;

            return (
              <BlockRenderer
                key={`cur-${i}`}
                block={block}
                text={text}
                isStreaming={isTyping && typedChars < currentContent.length}
                dimmed={false}
                interactive={sectionDone}
                clickedHotspots={clickedHotspots}
                onHotspotClick={handleHotspotClick}
                fontScale={fontScale}
              />
            );
          })}

          {/* Hotspot prompt */}
          {!isDiagramSection && sectionDone && sectionHasHotspots && (
            <div
              className="text-[9px] tracking-[2px] mt-2 opacity-0"
              style={{
                color: "var(--color-info)",
                animation: "intro-in .5s ease .2s forwards",
              }}
            >
              ▸ tap the
              <span
                className="mx-1 px-1 py-px"
                style={{
                  borderBottom: "1px dashed var(--color-info)",
                  color: "var(--color-info)",
                }}
              >
                highlighted code
              </span>
              to explore · earn +{HOTSPOT_XP} XP each
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-3 mt-5 pt-3" style={{ borderTop: "1px solid rgba(110,255,160,.08)" }}>
          {!sectionDone ? (
            <button
              onClick={skipSection}
              className="bg-transparent text-[9px] tracking-[3px] px-4 py-2 cursor-pointer transition-colors
                         hover:bg-[rgba(110,255,160,.05)]"
              style={{
                color: "var(--color-dim)",
                border: "1px solid rgba(110,255,160,.15)",
              }}
            >
              SKIP ▸▸
            </button>
          ) : (
            <button
              onClick={advanceSection}
              className="bg-transparent text-[10px] tracking-[4px] px-5 py-2.5 cursor-pointer transition-colors
                         hover:bg-[rgba(110,255,160,.08)]"
              style={{
                color: "var(--color-signal)",
                border: "1px solid rgba(110,255,160,.3)",
              }}
            >
              {isLastSection ? "START LEVEL" : "CONTINUE ▸"}{" "}
              <span style={{ opacity: 0.3, fontSize: "8px" }}>⏎</span>
            </button>
          )}
          <button
            onClick={onDisable}
            className="bg-transparent text-[8px] tracking-[2px] px-3 py-2 cursor-pointer transition-colors ml-auto
                       hover:bg-[rgba(255,64,64,.05)]"
            style={{
              color: "rgba(110,255,160,.25)",
              border: "1px solid rgba(110,255,160,.06)",
            }}
          >
            DON&apos;T SHOW AGAIN
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Block Renderer ──

function BlockRenderer({
  block,
  text,
  isStreaming,
  dimmed,
  interactive,
  clickedHotspots,
  onHotspotClick,
  fontScale,
}: {
  block: NoteBlock;
  text: string;
  isStreaming: boolean;
  dimmed: boolean;
  interactive: boolean;
  clickedHotspots: Set<string>;
  onHotspotClick: (hotspotText: string) => void;
  fontScale: number;
}) {
  const textSize = `${Math.round(12 * fontScale)}px`;
  const codeSize = `${Math.round(12 * fontScale)}px`;

  if (block.type === "diagram") {
    return (
      <div
        className="transition-opacity duration-300 flex-1 min-h-0 flex flex-col"
        style={{ opacity: dimmed ? 0.4 : 1 }}
      >
        {block.diagramId === "ch01-blueprint" && (
          <ProgramBlueprint
            onHotspotClick={(id) => onHotspotClick(id)}
            clickedIds={clickedHotspots}
          />
        )}
        {block.diagramId === "ch01-animation" && (
          <GoAppliance
            view="animation"
            onHotspotClick={(id) => onHotspotClick(id)}
            clickedIds={clickedHotspots}
          />
        )}
        {block.diagramId === "ch01-card" && (
          <GoAppliance
            view="card"
            onHotspotClick={(id) => onHotspotClick(id)}
            clickedIds={clickedHotspots}
          />
        )}
        {block.diagramId === "ch01-appliance" && (
          <GoAppliance
            onHotspotClick={(id) => onHotspotClick(id)}
            clickedIds={clickedHotspots}
          />
        )}
        {block.diagramId === "ch02-animation" && (
          <DoorCodeMachine
            view="animation"
            onHotspotClick={(id) => onHotspotClick(id)}
            clickedIds={clickedHotspots}
          />
        )}
        {block.diagramId === "ch02-card" && (
          <DoorCodeMachine
            view="card"
            onHotspotClick={(id) => onHotspotClick(id)}
            clickedIds={clickedHotspots}
          />
        )}
        {block.diagramId === "ch03-animation" && (
          <ShaftFunctions
            view="animation"
            onHotspotClick={(id) => onHotspotClick(id)}
            clickedIds={clickedHotspots}
          />
        )}
        {block.diagramId === "ch03-card" && (
          <ShaftFunctions
            view="card"
            onHotspotClick={(id) => onHotspotClick(id)}
            clickedIds={clickedHotspots}
          />
        )}
        {block.diagramId === "ch04-animation" && (
          <GuardRoster
            view="animation"
            onHotspotClick={(id) => onHotspotClick(id)}
            clickedIds={clickedHotspots}
          />
        )}
        {block.diagramId === "ch04-card" && (
          <GuardRoster
            view="card"
            onHotspotClick={(id) => onHotspotClick(id)}
            clickedIds={clickedHotspots}
          />
        )}
      </div>
    );
  }

  if (block.type === "code") {
    const hasHotspots = interactive && block.hotspots && block.hotspots.length > 0;

    return (
      <div
        className="relative transition-opacity duration-300"
        style={{ opacity: dimmed ? 0.4 : 1 }}
      >
        <pre
          className="leading-[1.7] px-5 py-4 overflow-x-auto"
          style={{
            fontSize: codeSize,
            background: "var(--color-code-bg)",
            border: "1px solid rgba(110,255,160,.08)",
            color: "var(--color-signal)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {hasHotspots ? (
            <CodeWithHotspots
              code={text}
              hotspots={block.hotspots!}
              clickedHotspots={clickedHotspots}
              onHotspotClick={onHotspotClick}
              fontScale={fontScale}
            />
          ) : (
            text
          )}
          {isStreaming && <span className="cursor-blink">_</span>}
        </pre>
      </div>
    );
  }

  if (block.important) {
    return (
      <div
        className="flex gap-3 items-start leading-[1.8] pl-3 py-2 transition-opacity duration-300"
        style={{
          fontSize: textSize,
          color: "var(--color-signal)",
          opacity: dimmed ? 0.4 : 1,
          borderLeft: "2px solid var(--color-alert)",
          background: "rgba(255,159,28,.04)",
        }}
      >
        <span
          className="shrink-0 text-[10px] font-[family-name:var(--font-display)] font-bold tracking-[1px] mt-0.5 px-1.5 py-px"
          style={{
            color: "var(--color-alert)",
            border: "1px solid rgba(255,159,28,.25)",
            background: "rgba(255,159,28,.08)",
          }}
        >
          KEY
        </span>
        <span style={{ color: "var(--color-foreground)" }}>
          {text}
          {isStreaming && <span className="cursor-blink" style={{ color: "var(--color-signal)" }}>_</span>}
        </span>
      </div>
    );
  }

  return (
    <p
      className="leading-[1.8] transition-opacity duration-300"
      style={{
        fontSize: textSize,
        color: "var(--color-foreground)",
        opacity: dimmed ? 0.4 : 1,
      }}
    >
      {text}
      {isStreaming && <span className="cursor-blink" style={{ color: "var(--color-signal)" }}>_</span>}
    </p>
  );
}

// ── Code with Hotspots ──

function CodeWithHotspots({
  code,
  hotspots,
  clickedHotspots,
  onHotspotClick,
  fontScale,
}: {
  code: string;
  hotspots: Hotspot[];
  clickedHotspots: Set<string>;
  onHotspotClick: (hotspotText: string) => void;
  fontScale: number;
}) {
  const [activeTip, setActiveTip] = useState<{ text: string; tip: string } | null>(null);
  const [xpFlash, setXpFlash] = useState(false);

  const handleClick = (hs: Hotspot, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTip?.text === hs.text) {
      setActiveTip(null);
      return;
    }
    setActiveTip(hs);

    // Award XP on first click
    if (!clickedHotspots.has(hs.text)) {
      onHotspotClick(hs.text);
      setXpFlash(true);
      setTimeout(() => setXpFlash(false), 600);
    }
  };

  const handleContainerClick = () => {
    if (activeTip) setActiveTip(null);
  };

  const segments = buildSegments(code, hotspots);

  return (
    <span onClick={handleContainerClick}>
      {segments.map((seg, i) =>
        seg.hotspot ? (
          <span
            key={i}
            onClick={(e) => handleClick(seg.hotspot!, e)}
            className="cursor-pointer transition-colors duration-150"
            style={{
              borderBottom: "1px dashed var(--color-info)",
              color: activeTip?.text === seg.hotspot.text ? "var(--color-info)" : "var(--color-signal)",
              background: activeTip?.text === seg.hotspot.text ? "rgba(0,212,255,.1)" : "transparent",
              opacity: clickedHotspots.has(seg.hotspot.text) && activeTip?.text !== seg.hotspot.text ? 0.6 : 1,
            }}
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}

      {/* Full-width tooltip below the code */}
      {activeTip && (
        <span
          className="block mt-3 px-4 py-3"
          style={{
            background: "var(--color-panel)",
            border: "1px solid var(--color-info)",
            borderLeft: "3px solid var(--color-info)",
            whiteSpace: "normal",
          }}
        >
          <span className="flex items-center justify-between mb-1.5">
            <span
              className="text-[7px] tracking-[3px]"
              style={{ color: "var(--color-info)" }}
            >
              ▸ EXPLAIN
            </span>
            {xpFlash && (
              <span
                className="text-[9px] tracking-[2px] font-[family-name:var(--font-display)] xp-burst"
                style={{ color: "var(--color-signal)" }}
              >
                +{HOTSPOT_XP} XP
              </span>
            )}
          </span>
          <span
            className="block leading-[1.8]"
            style={{
              fontSize: `${Math.round(12 * fontScale)}px`,
              color: "var(--color-foreground)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {activeTip.tip}
          </span>
        </span>
      )}
    </span>
  );
}

// ── Segment builder ──

interface Segment {
  text: string;
  hotspot: Hotspot | null;
}

function buildSegments(code: string, hotspots: Hotspot[]): Segment[] {
  const matches: { start: number; end: number; hotspot: Hotspot }[] = [];
  for (const hs of hotspots) {
    const idx = code.indexOf(hs.text);
    if (idx !== -1) {
      matches.push({ start: idx, end: idx + hs.text.length, hotspot: hs });
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const filtered: typeof matches = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const m of filtered) {
    if (m.start > cursor) {
      segments.push({ text: code.slice(cursor, m.start), hotspot: null });
    }
    segments.push({ text: code.slice(m.start, m.end), hotspot: m.hotspot });
    cursor = m.end;
  }
  if (cursor < code.length) {
    segments.push({ text: code.slice(cursor), hotspot: null });
  }

  return segments;
}
