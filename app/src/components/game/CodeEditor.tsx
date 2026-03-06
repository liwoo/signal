"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { tokenize, type Token } from "@/lib/go/tokenizer";
import { useVim, type VimMode } from "@/hooks/useVim";
import { getCompletions, getKnownPackages, type Completion } from "@/lib/go/completions";

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  onSubmit: () => void;
  busy: boolean;
  attempts: number;
  inRush: boolean;
  baseXP: number;
  rushBonus: number;
  camFeed?: React.ReactNode;
}

const TOKEN_COLORS: Record<string, string> = {
  keyword: "var(--color-syn-keyword)",
  builtin: "var(--color-syn-builtin)",
  type: "var(--color-syn-type)",
  string: "var(--color-syn-string)",
  number: "var(--color-syn-number)",
  comment: "var(--color-syn-comment)",
  operator: "var(--color-foreground)",
  punctuation: "var(--color-dim)",
  identifier: "var(--color-syn-ident)",
  whitespace: "transparent",
  unknown: "var(--color-foreground)",
};

function highlightCode(source: string): React.ReactNode[] {
  const tokens = tokenize(source);
  const nodes: React.ReactNode[] = [];
  let lastEnd = 0;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    // Render any gap (whitespace between tokens)
    if (tok.start > lastEnd) {
      nodes.push(source.slice(lastEnd, tok.start));
    }
    nodes.push(
      <span key={i} style={{ color: TOKEN_COLORS[tok.type] }}>
        {tok.value}
      </span>
    );
    lastEnd = tok.end;
  }
  // Trailing whitespace/newlines
  if (lastEnd < source.length) {
    nodes.push(source.slice(lastEnd));
  }

  return nodes;
}

function vimModeLabel(mode: VimMode): string {
  switch (mode) {
    case "normal":
      return "NORMAL";
    case "insert":
      return "INSERT";
    case "visual":
      return "VISUAL";
  }
}

const KNOWN_PKGS = getKnownPackages();

function detectAutocomplete(code: string, pos: number): { pkg: string; partial: string; start: number } | null {
  // Look backwards from cursor to find pkg.partial pattern
  const before = code.slice(0, pos);
  const match = before.match(/(\w+)\.(\w*)$/);
  if (!match) return null;
  const pkg = match[1];
  if (!KNOWN_PKGS.includes(pkg)) return null;
  return { pkg, partial: match[2], start: pos - match[2].length };
}

export function CodeEditor({
  code,
  onCodeChange,
  onSubmit,
  busy,
  attempts,
  inRush,
  baseXP,
  rushBonus,
  camFeed,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [vim, vimActions] = useVim();
  const [cursorPos, setCursorPos] = useState(0);

  // Autocomplete state
  const [acItems, setAcItems] = useState<Completion[]>([]);
  const [acIndex, setAcIndex] = useState(0);
  const [acStart, setAcStart] = useState(0);
  const [acVisible, setAcVisible] = useState(false);
  const [acPos, setAcPos] = useState({ x: 0, y: 0 });

  const isBlockCursor = vim.enabled && vim.mode === "normal";
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(navigator.platform?.startsWith("Mac") || navigator.userAgent.includes("Mac"));
  }, []);

  // Update autocomplete on code/cursor change
  const updateAutocomplete = useCallback((newCode: string, pos: number) => {
    const ctx = detectAutocomplete(newCode, pos);
    if (!ctx) {
      setAcVisible(false);
      return;
    }
    const all = getCompletions(ctx.pkg);
    const filtered = ctx.partial
      ? all.filter((c) => c.label.toLowerCase().startsWith(ctx.partial.toLowerCase()))
      : all;
    if (filtered.length === 0) {
      setAcVisible(false);
      return;
    }
    setAcItems(filtered);
    setAcIndex(0);
    setAcStart(ctx.start);
    setAcVisible(true);

    // Position the popup near the cursor
    if (textareaRef.current && highlightRef.current) {
      const ta = textareaRef.current;
      const measure = document.createElement("span");
      measure.style.cssText = `
        position: absolute; visibility: hidden; white-space: pre-wrap; word-break: break-all;
        font-family: var(--font-mono); font-size: 11.5px; line-height: 16px; tab-size: 4;
        padding: 12px; width: ${highlightRef.current.clientWidth}px; box-sizing: border-box;
      `;
      measure.textContent = newCode.slice(0, pos);
      const marker = document.createElement("span");
      marker.textContent = "|";
      measure.appendChild(marker);
      document.body.appendChild(measure);
      const markerRect = marker.getBoundingClientRect();
      const measureRect = measure.getBoundingClientRect();
      document.body.removeChild(measure);
      setAcPos({
        x: markerRect.left - measureRect.left,
        y: markerRect.top - measureRect.top + 16 - ta.scrollTop,
      });
    }
  }, []);

  const acceptCompletion = useCallback((item: Completion) => {
    const before = code.slice(0, acStart);
    const after = code.slice(cursorPos);
    const newCode = before + item.label + after;
    onCodeChange(newCode);
    setAcVisible(false);
    const newPos = acStart + item.label.length;
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos;
        setCursorPos(newPos);
      }
    });
  }, [code, acStart, cursorPos, onCodeChange]);

  // Update block cursor position
  const updateCursorOverlay = useCallback(() => {
    if (!isBlockCursor || !cursorRef.current || !textareaRef.current || !highlightRef.current) return;
    const ta = textareaRef.current;
    const pos = ta.selectionStart;
    setCursorPos(pos);

    // Measure character position using a hidden span
    const measure = document.createElement("span");
    measure.style.cssText = `
      position: absolute; visibility: hidden; white-space: pre-wrap; word-break: break-all;
      font-family: var(--font-mono); font-size: 11.5px; line-height: 16px; tab-size: 4;
      padding: 12px; width: ${highlightRef.current.clientWidth}px; box-sizing: border-box;
    `;
    const textBefore = code.slice(0, pos);
    measure.textContent = textBefore;
    const marker = document.createElement("span");
    marker.textContent = code[pos] || " ";
    measure.appendChild(marker);
    document.body.appendChild(measure);

    const markerRect = marker.getBoundingClientRect();
    const measureRect = measure.getBoundingClientRect();
    const x = markerRect.left - measureRect.left;
    const y = markerRect.top - measureRect.top;
    const w = markerRect.width;

    document.body.removeChild(measure);

    const cursor = cursorRef.current;
    cursor.style.transform = `translate(${x}px, ${y - ta.scrollTop}px)`;
    cursor.style.width = `${Math.max(w, 7)}px`;
  }, [isBlockCursor, code]);

  useEffect(() => {
    updateCursorOverlay();
  }, [updateCursorOverlay, cursorPos, code]);

  // Sync scroll between textarea and highlight overlay
  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const pre = highlightRef.current;
    const ln = lineNumRef.current;
    if (ta && pre) {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    }
    if (ta && ln) {
      ln.scrollTop = ta.scrollTop;
    }
  }, []);

  const trackCursor = useCallback(() => {
    if (textareaRef.current) {
      const pos = textareaRef.current.selectionStart;
      setCursorPos(pos);
      updateAutocomplete(code, pos);
    }
  }, [code, updateAutocomplete]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Autocomplete navigation
      if (acVisible) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setAcIndex((i) => Math.min(i + 1, acItems.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setAcIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Tab" || e.key === "Enter") {
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            acceptCompletion(acItems[acIndex]);
            return;
          }
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setAcVisible(false);
          return;
        }
      }

      // Cmd+Enter (Mac) / Ctrl+Enter (other) → submit
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!busy && code.trim()) onSubmit();
        return;
      }

      // Let vim handle first
      if (vimActions.handleKeyDown(e, code, onCodeChange)) {
        requestAnimationFrame(trackCursor);
        return;
      }

      // Tab handling
      if (e.key === "Tab") {
        e.preventDefault();
        const target = e.target as HTMLTextAreaElement;
        const s = target.selectionStart;
        const end = target.selectionEnd;
        const next = code.slice(0, s) + "    " + code.slice(end);
        onCodeChange(next);
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = s + 4;
          trackCursor();
        });
      } else {
        requestAnimationFrame(trackCursor);
      }
    },
    [code, onCodeChange, onSubmit, busy, vimActions, trackCursor, acVisible, acItems, acIndex, acceptCompletion]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    onCodeChange(newCode);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = textareaRef.current.selectionStart;
        setCursorPos(pos);
        updateAutocomplete(newCode, pos);
      }
    });
  }, [onCodeChange, updateAutocomplete]);

  const lineCount = code.split("\n").length;

  return (
    <div className="flex flex-col h-full">
      {/* Editor area */}
      <div className="flex-1 flex overflow-hidden bg-[var(--color-code-bg)] relative">
        {/* Line numbers */}
        <div
          ref={lineNumRef}
          className="py-3 px-2 text-[9.5px] leading-4 text-right select-none overflow-hidden shrink-0 min-w-[30px]"
          style={{
            background: "rgba(0,0,0,.5)",
            borderRight: "1px solid #0a1820",
            color: "#0a3040",
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Highlight + textarea stack */}
        <div className="flex-1 relative min-w-0 overflow-hidden">
          {/* Syntax-highlighted overlay */}
          <pre
            ref={highlightRef}
            aria-hidden="true"
            className="absolute inset-0 p-3 m-0 text-[11.5px] leading-4 overflow-hidden pointer-events-none whitespace-pre-wrap break-words"
            style={{
              fontFamily: "var(--font-mono)",
              background: "transparent",
              tabSize: 4,
            }}
          >
            {highlightCode(code)}
            {/* Ensure trailing newline renders */}
            {"\n"}
          </pre>

          {/* Block cursor for vim normal mode */}
          {isBlockCursor && (
            <div
              ref={cursorRef}
              className="absolute pointer-events-none"
              style={{
                top: 0,
                left: 0,
                height: 16,
                background: "var(--color-signal)",
                opacity: 0.7,
                animation: "blink 1s step-end infinite",
              }}
            />
          )}

          {/* Autocomplete popup */}
          {acVisible && acItems.length > 0 && (
            <div
              className="absolute z-50 overflow-y-auto"
              style={{
                left: acPos.x,
                top: acPos.y,
                maxHeight: 160,
                minWidth: 200,
                maxWidth: 320,
                background: "#060e14",
                border: "1px solid #0a2030",
              }}
            >
              {acItems.map((item, i) => (
                <div
                  key={item.label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    acceptCompletion(item);
                  }}
                  className="px-2 py-0.5 cursor-pointer flex items-baseline gap-2"
                  style={{
                    background: i === acIndex ? "rgba(110,255,160,.1)" : "transparent",
                    borderLeft: i === acIndex ? "2px solid var(--color-signal)" : "2px solid transparent",
                  }}
                >
                  <span
                    className="text-[11px] font-[family-name:var(--font-mono)]"
                    style={{ color: "var(--color-signal)" }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="text-[8px] truncate"
                    style={{ color: "#0a4040" }}
                  >
                    {item.detail}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Invisible textarea for input */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onKeyUp={trackCursor}
            onClick={trackCursor}
            onScroll={syncScroll}
            spellCheck={false}
            className="absolute inset-0 w-full h-full bg-transparent border-0 text-transparent
                       text-[11.5px] leading-4 p-3 resize-none focus:outline-none"
            style={{
              tabSize: 4,
              caretColor: isBlockCursor ? "transparent" : "var(--color-signal)",
              fontFamily: "var(--font-mono)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          />
        </div>
      </div>

      {/* Cam feed slot (above submit) */}
      {camFeed && (
        <div
          className="shrink-0 flex justify-end px-2 py-1"
          style={{
            borderTop: "1px solid #0a1820",
            background: "#04090f",
          }}
        >
          {camFeed}
        </div>
      )}

      {/* Bottom bar */}
      <div
        className="shrink-0 px-3 py-1.5 flex justify-between items-center"
        style={{
          borderTop: "1px solid #0a1820",
          background: "#04090f",
        }}
      >
        <div className="flex gap-2.5 text-[8px] items-center">
          {/* Vim toggle + mode */}
          <button
            onClick={vimActions.toggle}
            className="bg-transparent border px-1.5 py-0.5 text-[7px] tracking-[1px] cursor-pointer transition-colors"
            style={{
              borderColor: vim.enabled ? "var(--color-signal)" : "#0a2030",
              color: vim.enabled ? "var(--color-signal)" : "#0a3040",
            }}
          >
            VIM
          </button>
          {vim.enabled && (
            <span
              className="text-[7px] tracking-[2px] font-[family-name:var(--font-display)]"
              style={{
                color:
                  vim.mode === "normal"
                    ? "var(--color-info)"
                    : vim.mode === "insert"
                      ? "var(--color-signal)"
                      : "var(--color-alert)",
              }}
            >
              {vimModeLabel(vim.mode)}
            </span>
          )}

          <span className="text-[#0a3a2a]">{lineCount}L</span>
          {attempts === 0 && !inRush && (
            <span className="text-[#1a5a3a]">
              +{Math.floor(baseXP * 0.5)} first try
            </span>
          )}
          {inRush && rushBonus > 0 && (
            <span
              className="text-[var(--color-alert)]"
              style={{ animation: "blink .7s step-end infinite" }}
            >
              +{rushBonus} speed bonus
            </span>
          )}
          {attempts > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-[#1a4a3a]">TRIES</span>
              <span
                className="font-[family-name:var(--font-display)] text-[10px]"
                style={{
                  color: attempts >= 3 ? "var(--color-danger)" : "var(--color-alert)",
                }}
              >
                {attempts}
              </span>
            </span>
          )}
        </div>
        <button
          onClick={onSubmit}
          disabled={busy || !code.trim()}
          className="py-1.5 px-5 text-[9px] tracking-[2px] cursor-pointer
                     transition-colors disabled:opacity-35 disabled:cursor-not-allowed flex items-center gap-2"
          style={{
            background: inRush ? "rgba(255,80,20,.1)" : "rgba(110,255,160,.06)",
            border: `1px solid ${inRush ? "#ff6a2a" : "var(--color-signal)"}`,
            color: inRush ? "var(--color-alert)" : "var(--color-signal)",
          }}
        >
          {busy
            ? "TRANSMITTING..."
            : inRush
              ? `▸ HURRY · +${baseXP} XP`
              : `▸ SUBMIT · +${baseXP} XP`}
          {!busy && (
            <span
              className="text-[7px] tracking-[1px] opacity-40"
            >
              {isMac ? "⌘" : "Ctrl"}⏎
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
