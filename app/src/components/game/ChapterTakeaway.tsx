"use client";

// The end-of-chapter takeaway, one idea per screen:
//   1. A PATTERN YOU CAN REUSE — lifted from the player's own solution, where
//      it shows up outside the game, and the project to take home.
//   2. (optional) DOES IT TRANSFER? — one changed-input question. Answering it
//      moves "used in a new situation" from NOT CHECKED to SHOWN.
// CONTINUE THE ESCAPE stays the loudest thing on both.

import { useMemo, useState } from "react";
import type { CompileModule, LanguageId } from "@/types/game";
import type { ChapterTakeaway as Takeaway } from "@/data/takeaways";
import { extractSnippet } from "@/lib/game/takeaway";
import { createZip } from "@/lib/export/zip";
import { projectFiles, projectName } from "@/lib/export/project";
import { getLanguageService } from "@/lib/lang/registry";
import { TOKEN_COLORS } from "./CodeEditor";

interface ChapterTakeawayProps {
  chapterId: string;
  /** e.g. "CHAPTER 1 COMPLETE" */
  title: string;
  /** e.g. "HANDSHAKE ESTABLISHED" */
  subtitle: string;
  takeaway: Takeaway;
  language: LanguageId;
  /** The player's final, passing code. */
  code: string;
  /** The package the final step shipped, bundled into the download. */
  module?: CompileModule;
  xp: number;
  level: number;
  onContinue: () => void;
  onRetry: () => void;
  /** e.g. why there's no next chapter yet in this language. */
  note?: string;
}

function Snippet({ source, language }: { source: string; language: LanguageId }) {
  // Tokenizers may skip whitespace, so paint tokens over the source and keep
  // whatever lies between them as plain text.
  const parts = useMemo(() => {
    const out: { text: string; color?: string }[] = [];
    let at = 0;
    for (const t of getLanguageService(language).tokenize(source)) {
      if (t.start < at) continue;
      if (t.start > at) out.push({ text: source.slice(at, t.start) });
      out.push({ text: source.slice(t.start, t.end), color: TOKEN_COLORS[t.type] });
      at = t.end;
    }
    if (at < source.length) out.push({ text: source.slice(at) });
    return out;
  }, [source, language]);
  return (
    <pre className="text-[13px] leading-[1.6] whitespace-pre-wrap break-words" style={{ color: "var(--color-foreground)" }}>
      {parts.map((p, i) => (
        <span key={i} style={p.color ? { color: p.color } : undefined}>{p.text}</span>
      ))}
    </pre>
  );
}

function ContinueButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      autoFocus
      className="px-6 py-3 cursor-pointer font-[family-name:var(--font-display)] text-[11px] tracking-[3px] transition-colors"
      style={{ background: "var(--color-signal)", color: "var(--color-background)", border: "2px solid var(--color-signal)" }}
    >
      CONTINUE THE ESCAPE ▸
    </button>
  );
}

export function ChapterTakeaway({
  chapterId, title, subtitle, takeaway, language, code, module, xp, level, onContinue, onRetry, note,
}: ChapterTakeawayProps) {
  const [screen, setScreen] = useState<"pattern" | "transfer">("pattern");
  const [answer, setAnswer] = useState<number | null>(null);

  const fromSolution = useMemo(() => {
    const rule = takeaway.snippet[language];
    return rule ? extractSnippet(code, rule, language === "python") : null;
  }, [code, takeaway, language]);
  const snippet = fromSolution ?? takeaway.fallback[language] ?? takeaway.fallback.go;
  const transferred = answer !== null && takeaway.transfer.options[answer]?.correct === true;

  const download = () => {
    const zip = createZip(projectFiles({ chapterId, chapterTitle: subtitle, language, code, module }));
    const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: "application/zip" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName(chapterId)}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center p-4" style={{ background: "rgba(2,4,6,.94)" }}>
      <div
        className="relative flex flex-col w-full overflow-y-auto"
        style={{ maxWidth: 640, maxHeight: "94dvh", border: "1px solid var(--color-border)", background: "var(--color-background)" }}
      >
        {/* The moment: chapter cleared */}
        <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <span className="font-[family-name:var(--font-display)] text-[11px] tracking-[3px]" style={{ color: "var(--color-win)" }}>
            ✓ {title}
          </span>
          <span className="text-[10px] tracking-[2px]" style={{ color: "var(--color-dim)" }}>
            {subtitle} · {xp} XP · LV {level}
          </span>
        </div>

        {screen === "pattern" ? (
          <div className="px-5 py-5">
            <h1 className="text-[20px] sm:text-[22px] font-bold leading-[1.3]" style={{ color: "var(--color-foreground)" }}>
              {takeaway.headline}
            </h1>

            {/* The pattern, in their own code */}
            <div className="mt-4" style={{ border: "1px solid var(--color-border)", background: "var(--color-code-bg)" }}>
              <div className="px-4 pt-3 text-[10px] tracking-[2px]" style={{ color: "var(--color-info)" }}>
                {fromSolution ? "FROM YOUR SOLUTION" : "THE PATTERN"} · {takeaway.pattern}
              </div>
              <div className="px-4 py-3">
                <Snippet source={snippet} language={language} />
              </div>
              <div className="px-4 py-3 text-[12px] leading-[1.6]" style={{ borderTop: "1px solid var(--color-border)" }}>
                <p style={{ color: "var(--color-foreground)" }}>{takeaway.why}</p>
                <p className="mt-1" style={{ color: "var(--color-info)" }}>you&apos;ll see it in {takeaway.useIt}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={download}
                className="bg-transparent px-3.5 py-2 text-[10px] tracking-[2px] cursor-pointer"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                title="Your code + any game package, ready to run on your own machine"
              >
                ↓ DOWNLOAD PROJECT
              </button>
              <button
                type="button"
                onClick={() => setScreen("transfer")}
                className="bg-transparent px-3.5 py-2 text-[10px] tracking-[2px] cursor-pointer"
                style={{ border: "1px solid color-mix(in srgb, var(--color-info) 45%, transparent)", color: "var(--color-info)" }}
              >
                QUICK CHECK · OPTIONAL ›
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-5">
            <button
              type="button"
              onClick={() => setScreen("pattern")}
              className="bg-transparent p-0 mb-3 text-[10px] tracking-[2px] cursor-pointer"
              style={{ color: "var(--color-dim)", border: "none" }}
            >
              ‹ BACK
            </button>
            <div className="text-[10px] tracking-[2px] mb-2" style={{ color: "var(--color-info)" }}>
              QUICK CHECK · SAME IDEA, NEW SITUATION
            </div>
            <h1 className="text-[18px] font-bold leading-[1.35]" style={{ color: "var(--color-foreground)" }}>
              {takeaway.transfer.question}
            </h1>

            <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Your answer">
              {takeaway.transfer.options.map((opt, i) => {
                const picked = answer === i;
                const tone = picked ? (opt.correct ? "var(--color-signal)" : "var(--color-danger)") : "var(--color-border)";
                return (
                  <button
                    key={opt.label}
                    type="button"
                    role="radio"
                    aria-checked={picked}
                    disabled={transferred}
                    onClick={() => setAnswer(i)}
                    className="w-full text-left px-4 py-3 text-[13px] cursor-pointer bg-transparent disabled:cursor-default"
                    style={{ border: `1px solid ${tone}`, color: "var(--color-foreground)" }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {answer !== null ? (
              <p
                className="mt-3 text-[12px] leading-[1.6]"
                style={{ color: transferred ? "var(--color-signal)" : "var(--color-alert)" }}
                aria-live="polite"
              >
                {takeaway.transfer.options[answer].reply}
                {transferred ? "" : " try the other one."}
              </p>
            ) : null}

            {/* What this chapter has shown — applying isn't the same as reusing */}
            <ul className="mt-5 text-[12px]" aria-label="What you've shown" style={{ borderTop: "1px solid var(--color-border)" }}>
              <li className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <span style={{ color: "var(--color-foreground)" }}>applied it in the mission</span>
                <span className="text-[10px] tracking-[2px]" style={{ color: "var(--color-signal)" }}>✓ APPLIED</span>
              </li>
              <li className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <span style={{ color: "var(--color-foreground)" }}>used it in a new situation</span>
                <span className="text-[10px] tracking-[2px]" style={{ color: transferred ? "var(--color-signal)" : "var(--color-alert)" }}>
                  {transferred ? "✓ SHOWN" : "NOT CHECKED YET"}
                </span>
              </li>
            </ul>
          </div>
        )}

        {note ? (
          <div className="px-5 py-2.5 text-[11px] leading-[1.6]" style={{ color: "var(--color-info)", borderTop: "1px solid var(--color-border)" }}>
            {note}
          </div>
        ) : null}

        {/* Continue stays the loudest thing on every screen */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5" style={{ borderTop: "1px solid var(--color-border)", background: "#04090f" }}>
          <button
            type="button"
            onClick={onRetry}
            className="bg-transparent p-0 text-[10px] tracking-[2px] cursor-pointer"
            style={{ color: "var(--color-dim)", border: "none" }}
          >
            REPLAY CHAPTER
          </button>
          <ContinueButton onClick={onContinue} />
        </div>
      </div>
    </div>
  );
}
