"use client";

import { useState } from "react";
import type { AISuggestion } from "@/lib/game/ai-tokens";

interface AISuggestPanelProps {
  suggestions: AISuggestion[];
  tokens: number;
  onUseSuggestion: (suggestion: AISuggestion) => void;
  onClose: () => void;
}

export function AISuggestPanel({
  suggestions,
  tokens,
  onUseSuggestion,
  onClose,
}: AISuggestPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = suggestions.find((s) => s.id === selectedId);

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col"
      style={{
        background: "rgba(2,6,10,.95)",
        border: "1px solid rgba(110,255,160,.12)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid rgba(110,255,160,.08)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="font-[family-name:var(--font-display)] text-[9px] tracking-[2px]"
            style={{
              color: "var(--color-info)",
              textShadow: "0 0 8px rgba(122,184,216,.4)",
            }}
          >
            AI ASSIST
          </span>
          <span
            className="text-[8px] px-1.5 py-0.5"
            style={{
              color: tokens > 0 ? "var(--color-signal)" : "var(--color-danger)",
              border: `1px solid ${tokens > 0 ? "rgba(110,255,160,.2)" : "rgba(255,64,64,.2)"}`,
            }}
          >
            {tokens} TOKEN{tokens !== 1 ? "S" : ""}
          </span>
        </div>
        <button
          onClick={onClose}
          className="bg-transparent text-[var(--color-dim)] text-[9px] cursor-pointer px-2 py-1 transition-colors"
          style={{ border: "1px solid rgba(255,255,255,.06)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--color-foreground)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--color-dim)";
          }}
        >
          ESC
        </button>
      </div>

      {/* Suggestions list */}
      <div className="flex-1 overflow-y-auto">
        {suggestions.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
            className="w-full bg-transparent text-left px-3 py-2 cursor-pointer transition-colors block"
            style={{
              borderBottom: "1px solid rgba(255,255,255,.03)",
              background: s.id === selectedId ? "rgba(110,255,160,.04)" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (s.id !== selectedId) {
                e.currentTarget.style.background = "rgba(110,255,160,.02)";
              }
            }}
            onMouseLeave={(e) => {
              if (s.id !== selectedId) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px]"
                style={{ color: "var(--color-info)" }}
              >
                ▸
              </span>
              <span
                className="text-[10px] font-[family-name:var(--font-display)]"
                style={{ color: "var(--color-foreground)" }}
              >
                {s.label}
              </span>
              <span className="text-[7px]" style={{ color: "var(--color-dim)" }}>
                -1 TOKEN
              </span>
            </div>
            <div className="text-[8px] ml-4" style={{ color: "var(--color-dim)" }}>
              {s.description}
            </div>
          </button>
        ))}
      </div>

      {/* Preview + action */}
      {selected && (
        <div
          className="shrink-0 px-3 py-2"
          style={{
            borderTop: "1px solid rgba(110,255,160,.1)",
            background: "rgba(4,12,8,.8)",
          }}
        >
          <pre
            className="text-[10px] font-[family-name:var(--font-mono)] mb-2 overflow-x-auto"
            style={{
              color: "var(--color-signal)",
              lineHeight: 1.5,
            }}
          >
            {selected.code}
          </pre>
          <button
            onClick={() => {
              if (tokens > 0) onUseSuggestion(selected);
            }}
            disabled={tokens <= 0}
            className="bg-transparent text-[8px] tracking-[2px] px-3 py-1.5 cursor-pointer font-[family-name:var(--font-display)] transition-colors"
            style={{
              border: tokens > 0
                ? "1px solid var(--color-info)"
                : "1px solid rgba(255,255,255,.1)",
              color: tokens > 0 ? "var(--color-info)" : "var(--color-dim)",
              opacity: tokens > 0 ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (tokens > 0) {
                e.currentTarget.style.background = "rgba(122,184,216,.08)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            INSERT SNIPPET
          </button>
        </div>
      )}
    </div>
  );
}
