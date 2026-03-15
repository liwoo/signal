"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { tokenize, type Token } from "@/lib/go/tokenizer";
import { useVim, type VimMode } from "@/hooks/useVim";
import { getCompletions, getKnownPackages, getSymbolCompletions, isPackageImported, type Completion } from "@/lib/go/completions";
import { formatGo } from "@/lib/go/playground";

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
  vimEnabled?: boolean;
  onVimToggle?: (enabled: boolean) => void;
  disabled?: boolean;
  aiButton?: React.ReactNode;
  fontSize?: number;
  onFontSizeChange?: (size: number) => void;
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

type AcContext =
  | { type: "pkg"; pkg: string; partial: string; start: number }
  | { type: "symbol"; partial: string; start: number };

function isInsideString(code: string, pos: number): boolean {
  let inDouble = false;
  let inBack = false;
  for (let i = 0; i < pos; i++) {
    const ch = code[i];
    if (ch === "\\" && (inDouble || inBack)) { i++; continue; }
    if (ch === '"' && !inBack) inDouble = !inDouble;
    else if (ch === "`" && !inDouble) inBack = !inBack;
  }
  return inDouble || inBack;
}

function detectAutocomplete(code: string, pos: number): AcContext | null {
  const before = code.slice(0, pos);

  // No completions inside string literals
  if (isInsideString(code, pos)) return null;

  // Check for pkg.partial pattern first — only if the package is actually imported
  const pkgMatch = before.match(/(\w+)\.(\w*)$/);
  if (pkgMatch && KNOWN_PKGS.includes(pkgMatch[1]) && isPackageImported(code, pkgMatch[1])) {
    return { type: "pkg", pkg: pkgMatch[1], partial: pkgMatch[2], start: pos - pkgMatch[2].length };
  }

  // Check for bare identifier (min 2 chars to avoid noise)
  const symMatch = before.match(/(?:^|[^.\w])(\w{2,})$/);
  if (symMatch) {
    return { type: "symbol", partial: symMatch[1], start: pos - symMatch[1].length };
  }

  return null;
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
  vimEnabled,
  onVimToggle,
  disabled,
  aiButton,
  fontSize: fontSizeProp,
  onFontSizeChange,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [vim, vimActions] = useVim(vimEnabled);
  const [cursorPos, setCursorPos] = useState(0);

  // Autocomplete state
  const [acItems, setAcItems] = useState<Completion[]>([]);
  const [acIndex, setAcIndex] = useState(0);
  const [acStart, setAcStart] = useState(0);
  const [acVisible, setAcVisible] = useState(false);
  const [acPos, setAcPos] = useState({ x: 0, y: 0 });

  // Undo/redo history
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const lastPushRef = useRef(code);

  const codeChangeWithUndo = useCallback((newCode: string) => {
    if (newCode === lastPushRef.current) return;
    const stack = undoStackRef.current;
    if (stack.length === 0 || stack[stack.length - 1] !== lastPushRef.current) {
      stack.push(lastPushRef.current);
      if (stack.length > 200) stack.shift();
    }
    redoStackRef.current = [];
    lastPushRef.current = newCode;
    onCodeChange(newCode);
  }, [onCodeChange]);

  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    redoStackRef.current.push(code);
    const prev = stack.pop()!;
    lastPushRef.current = prev;

    onCodeChange(prev);
  }, [code, onCodeChange]);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    undoStackRef.current.push(code);
    const next = stack.pop()!;
    lastPushRef.current = next;

    onCodeChange(next);
  }, [code, onCodeChange]);

  // Font size / zoom
  const [fontSizeLocal, setFontSizeLocal] = useState(fontSizeProp ?? 15);
  const fontSize = fontSizeProp ?? fontSizeLocal;
  const setFontSize = useCallback((updater: (prev: number) => number) => {
    const next = updater(fontSize);
    setFontSizeLocal(next);
    onFontSizeChange?.(next);
  }, [fontSize, onFontSizeChange]);
  const lineHeight = Math.round(fontSize * 1.4);

  // Format
  const [formatting, setFormatting] = useState(false);
  const handleFormat = useCallback(async () => {
    if (formatting || disabled || busy) return;
    setFormatting(true);
    try {
      const result = await formatGo(code);
      if (result.success && result.body !== code) {
        onCodeChange(result.body);
      }
    } finally {
      setFormatting(false);
    }
  }, [code, onCodeChange, formatting, disabled, busy]);

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
    let filtered: Completion[];
    if (ctx.type === "pkg") {
      const all = getCompletions(ctx.pkg);
      filtered = ctx.partial
        ? all.filter((c) => c.label.toLowerCase().startsWith(ctx.partial.toLowerCase()))
        : all;
    } else {
      filtered = getSymbolCompletions(newCode, ctx.start, ctx.partial);
      // Don't show if the only match is exactly what's typed
      if (filtered.length === 1 && filtered[0].label === ctx.partial) {
        setAcVisible(false);
        return;
      }
    }
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
      const fs = textareaRef.current.style.fontSize || "11.5px";
      const lh = textareaRef.current.style.lineHeight || "16px";
      measure.style.cssText = `
        position: absolute; visibility: hidden; white-space: pre-wrap; word-break: break-all;
        font-family: var(--font-mono); font-size: ${fs}; line-height: ${lh}; tab-size: 4;
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
        y: markerRect.top - measureRect.top + parseInt(lh) - ta.scrollTop,
      });
    }
  }, []);

  const acceptCompletion = useCallback((item: Completion) => {
    const before = code.slice(0, acStart);
    const after = code.slice(cursorPos);
    const newCode = before + item.label + after;
    codeChangeWithUndo(newCode);
    setAcVisible(false);
    const newPos = acStart + item.label.length;
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos;
        setCursorPos(newPos);
      }
    });
  }, [code, acStart, cursorPos, codeChangeWithUndo]);

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
      font-family: var(--font-mono); font-size: ${fontSize}px; line-height: ${lineHeight}px; tab-size: 4;
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
  }, [isBlockCursor, code, fontSize, lineHeight]);

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
      setCursorPos(textareaRef.current.selectionStart);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Block all input when disabled (Maya typing / game paused)
      if (disabled) {
        e.preventDefault();
        return;
      }

      // Autocomplete navigation
      if (acVisible) {
        const isDown = e.key === "ArrowDown" || (vim.enabled && vim.mode === "normal" && e.key === "j");
        const isUp = e.key === "ArrowUp" || (vim.enabled && vim.mode === "normal" && e.key === "k");
        if (isDown) {
          e.preventDefault();
          setAcIndex((i) => Math.min(i + 1, acItems.length - 1));
          return;
        }
        if (isUp) {
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

      // Cmd+Z / Ctrl+Z → undo, Cmd+Shift+Z / Ctrl+Shift+Z → redo
      if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Cmd+Y / Ctrl+Y → redo (Windows convention)
      if (e.key === "y" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        redo();
        return;
      }

      // Cmd+Enter (Mac) / Ctrl+Enter (other) → submit
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!busy && code.trim()) onSubmit();
        return;
      }

      // Let vim handle first
      if (vimActions.handleKeyDown(e, code, codeChangeWithUndo)) {
        requestAnimationFrame(trackCursor);
        return;
      }

      // Auto-close pairs (works when vim is off or in insert mode)
      const PAIRS: Record<string, string> = { "{": "}", "(": ")", "[": "]", '"': '"', "'": "'", "`": "`" };
      const CLOSING = new Set(["}", ")", "]", '"', "'", "`"]);
      const target = e.target as HTMLTextAreaElement;
      const s = target.selectionStart;
      const end = target.selectionEnd;

      if (e.key in PAIRS && !e.metaKey && !e.ctrlKey) {
        // For quotes, skip if next char is the same quote (already paired)
        const isQuote = e.key === '"' || e.key === "'" || e.key === "`";
        if (isQuote && code[s] === e.key) {
          e.preventDefault();
          requestAnimationFrame(() => {
            target.selectionStart = target.selectionEnd = s + 1;
            trackCursor();
          });
          return;
        }
        e.preventDefault();
        const open = e.key;
        const close = PAIRS[open];
        // If there's a selection, wrap it
        if (s !== end) {
          const selected = code.slice(s, end);
          const next = code.slice(0, s) + open + selected + close + code.slice(end);
          codeChangeWithUndo(next);
          requestAnimationFrame(() => {
            target.selectionStart = s + 1;
            target.selectionEnd = end + 1;
            trackCursor();
          });
        } else {
          const next = code.slice(0, s) + open + close + code.slice(s);
          codeChangeWithUndo(next);
          requestAnimationFrame(() => {
            target.selectionStart = target.selectionEnd = s + 1;
            setCursorPos(s + 1);
            updateAutocomplete(next, s + 1);
          });
        }
        return;
      }

      // Skip over closing char if already present
      if (CLOSING.has(e.key) && code[s] === e.key && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = s + 1;
          trackCursor();
        });
        return;
      }

      // Backspace between empty pair → delete both
      if (e.key === "Backspace" && s === end && s > 0) {
        const before = code[s - 1];
        const after = code[s];
        if (before in PAIRS && PAIRS[before] === after) {
          e.preventDefault();
          const next = code.slice(0, s - 1) + code.slice(s + 1);
          codeChangeWithUndo(next);
          requestAnimationFrame(() => {
            target.selectionStart = target.selectionEnd = s - 1;
            setCursorPos(s - 1);
            updateAutocomplete(next, s - 1);
          });
          return;
        }
      }

      // Tab handling
      if (e.key === "Tab") {
        e.preventDefault();
        const next = code.slice(0, s) + "    " + code.slice(end);
        codeChangeWithUndo(next);
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = s + 4;
          trackCursor();
        });
      } else {
        requestAnimationFrame(trackCursor);
      }
    },
    [code, onCodeChange, codeChangeWithUndo, onSubmit, busy, disabled, vim, vimActions, trackCursor, acVisible, acItems, acIndex, acceptCompletion, updateAutocomplete, undo, redo]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    codeChangeWithUndo(newCode);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = textareaRef.current.selectionStart;
        setCursorPos(pos);
        updateAutocomplete(newCode, pos);
      }
    });
  }, [codeChangeWithUndo, updateAutocomplete]);

  const lineCount = code.split("\n").length;

  return (
    <div className="flex flex-col h-full">
      {/* Editor area */}
      <div className="flex-1 flex overflow-hidden bg-[var(--color-code-bg)] relative">
        {/* Toolbar: format + zoom */}
        <div
          className="absolute top-1.5 right-2.5 z-40 flex items-center gap-2"
        >
          <button
            onClick={handleFormat}
            disabled={formatting || disabled || busy}
            className="bg-transparent border-0 cursor-pointer flex items-center gap-1 px-1.5 py-0.5 transition-opacity"
            style={{
              background: "rgba(4,8,16,.85)",
              border: "1px solid var(--color-border)",
              color: formatting ? "var(--color-dim)" : "var(--color-signal)",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "1px",
              opacity: formatting || disabled ? 0.4 : 0.7,
            }}
            data-tour="fmt-btn"
            title="Format code (gofmt)"
          >
            {formatting ? "FMT..." : "FMT"}
          </button>
          <div
            className="flex items-center gap-1"
            style={{
              background: "rgba(4,8,16,.85)",
              border: "1px solid var(--color-border)",
              padding: "2px 4px",
            }}
          >
            <button
              onClick={() => setFontSize((s) => Math.max(8, s - 1))}
              className="bg-transparent border-0 cursor-pointer w-6 h-6 flex items-center justify-center text-[14px] font-bold transition-colors"
              style={{ color: "var(--color-signal)" }}
              title="Zoom out"
            >
              −
            </button>
            <span
              className="text-[9px] tracking-[1px] tabular-nums min-w-[28px] text-center font-[family-name:var(--font-display)]"
              style={{ color: "var(--color-dim)" }}
            >
              {fontSize}
            </span>
            <button
              onClick={() => setFontSize((s) => Math.min(24, s + 1))}
              className="bg-transparent border-0 cursor-pointer w-6 h-6 flex items-center justify-center text-[14px] font-bold transition-colors"
              style={{ color: "var(--color-signal)" }}
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>
        {/* Line numbers */}
        <div
          ref={lineNumRef}
          className="py-3 px-2 text-right select-none overflow-hidden shrink-0 min-w-[30px]"
          style={{
            fontSize: `${Math.max(fontSize - 2, 8)}px`,
            lineHeight: `${lineHeight}px`,
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
            className="absolute inset-0 p-3 m-0 overflow-hidden pointer-events-none whitespace-pre-wrap break-words"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: `${fontSize}px`,
              lineHeight: `${lineHeight}px`,
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
                height: lineHeight,
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
            readOnly={disabled}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onKeyUp={trackCursor}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            data-form-type="other"
            onClick={() => {
              trackCursor();
              if (textareaRef.current) {
                updateAutocomplete(code, textareaRef.current.selectionStart);
              }
            }}
            onPaste={(e) => e.preventDefault()}
            onScroll={syncScroll}
            spellCheck={false}
            className="absolute inset-0 w-full h-full bg-transparent border-0 text-transparent
                       p-3 resize-none focus:outline-none"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: `${lineHeight}px`,
              tabSize: 4,
              caretColor: disabled ? "transparent" : isBlockCursor ? "transparent" : "var(--color-signal)",
              fontFamily: "var(--font-mono)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              opacity: disabled ? 0.5 : 1,
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
            onClick={() => {
              vimActions.toggle();
              onVimToggle?.(!vim.enabled);
            }}
            className={`bg-transparent border px-1.5 py-0.5 text-[7px] tracking-[1px] cursor-pointer transition-colors${!vim.enabled ? " vim-flicker" : ""}`}
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

          {aiButton}
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
          data-tour="transmit-btn"
          onClick={onSubmit}
          disabled={busy || disabled || !code.trim()}
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
