"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState, useEffect } from "react";
import { useVim, type VimMode } from "@/hooks/useVim";
import { getLanguageService } from "@/lib/lang/registry";
import { smartEnter } from "@/lib/editor/smart-enter";
import type { Completion, ExtraPackage, LanguageService, Token } from "@/lib/lang/types";
import { trackCodeFormat, trackAutocomplete } from "@/lib/analytics";
import type { CheckStatus, DiffLine, LanguageId, SubmissionFeedback } from "@/types/game";
import { firstFailure, passedCount } from "@/lib/game/checks";

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  /** TRANSMIT TO MAYA — the attempt that counts. */
  onSubmit: () => void;
  /** TEST — run the mission checks locally (free, not sent to Maya). */
  onTest?: () => void;
  /** A TEST run is in flight. */
  testing?: boolean;
  busy: boolean;
  attempts: number;
  inRush: boolean;
  baseXP: number;
  rushBonus: number;
  camFeed?: React.ReactNode;
  vimEnabled?: boolean;
  onVimToggle?: (enabled: boolean) => void;
  disabled?: boolean;
  /** True when it's the player's turn — lights up the terminal + thick cursor. */
  awaitingInput?: boolean;
  aiButton?: React.ReactNode;
  fontSize?: number;
  onFontSizeChange?: (size: number) => void;
  isMobile?: boolean;
  submissionFeedback?: SubmissionFeedback | null;
  onDismissSubmissionFeedback?: () => void;
  /** Non-stdlib packages the current step ships, so their members autocomplete. */
  extraPackages?: ExtraPackage[];
  /** The language being written — drives highlighting, autocomplete, and formatting. */
  language?: LanguageId;
}

export const TOKEN_COLORS: Record<string, string> = {
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

/** Where to draw the block cursor inside the highlighted code, if anywhere. */
interface InlineCursor {
  pos: number;
  /** Cursor fill colour (vim mode colour, or the signal colour for the "ready" cursor). */
  color: string;
}

/**
 * Render the source as coloured token spans. The block cursor is drawn here,
 * inline, around the character it sits on — so it can never drift from the
 * text the way a separately measured overlay can (wrapping, scrollbars, font
 * metrics all match by construction).
 */
function highlightCode(
  source: string,
  tokens: Token[],
  cursor: InlineCursor | null,
  cursorRef: React.Ref<HTMLSpanElement>
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const at = cursor ? Math.max(0, Math.min(cursor.pos, source.length)) : -1;
  let key = 0;

  const cursorSpan = (ch: string, color: string | undefined) => (
    <span
      key={`cursor-${key++}`}
      ref={cursorRef}
      data-editor-cursor=""
      className="term-cursor"
      style={{ ["--tok" as string]: color, ["--cursor-bg" as string]: cursor!.color }}
    >
      {ch}
    </span>
  );

  const push = (start: number, end: number, color: string | undefined) => {
    if (end <= start) return;
    const text = source.slice(start, end);
    const wrap = (t: string) =>
      color ? <span key={key++} style={{ color }}>{t}</span> : <span key={key++}>{t}</span>;
    if (at < start || at >= end) {
      nodes.push(color ? wrap(text) : text);
      return;
    }
    const i = at - start;
    if (i > 0) nodes.push(wrap(text.slice(0, i)));
    if (text[i] === "\n") {
      // cursor on a line end: a blank cell, then the newline itself
      nodes.push(cursorSpan(" ", color), "\n");
    } else {
      nodes.push(cursorSpan(text[i], color));
    }
    if (i + 1 < text.length) nodes.push(wrap(text.slice(i + 1)));
  };

  let lastEnd = 0;
  for (const tok of tokens) {
    if (tok.start > lastEnd) push(lastEnd, tok.start, undefined);
    push(tok.start, tok.end, TOKEN_COLORS[tok.type]);
    lastEnd = tok.end;
  }
  if (lastEnd < source.length) push(lastEnd, source.length, undefined);
  if (at === source.length) nodes.push(cursorSpan(" ", undefined));
  return nodes;
}

const VIM_MODE_COLOR: Record<VimMode, string> = {
  normal: "var(--color-info)",
  insert: "var(--color-signal)",
  visual: "var(--color-alert)",
  "visual-line": "var(--color-alert)",
};

function vimModeLabel(mode: VimMode): string {
  switch (mode) {
    case "normal":
      return "NORMAL";
    case "insert":
      return "INSERT";
    case "visual":
      return "VISUAL";
    case "visual-line":
      return "V-LINE";
  }
}

// The one language-specific operator on the mobile accessory row.
const ACCESSORY_OPERATOR: Record<LanguageId, { label: string; insert: string }> = {
  go: { label: ":=", insert: " := " },
  javascript: { label: "=>", insert: " => " },
  python: { label: ":", insert: ":" },
  rust: { label: "::", insert: "::" },
};

// Stable default so the useCallback deps don't churn when no extra packages exist.
const EMPTY_EXTRA_PACKAGES: ExtraPackage[] = [];

type AcContext =
  | { type: "pkg"; pkg: string; partial: string; start: number }
  | { type: "symbol"; partial: string; start: number };

function detectAutocomplete(code: string, pos: number, extra: ExtraPackage[], lang: LanguageService): AcContext | null {
  const before = code.slice(0, pos);

  // No completions inside string literals
  if (lang.isInsideString(code, pos)) return null;

  // Check for pkg.partial (or Rust's path::partial) first — only if the package is actually imported
  const pkgMatch = before.match(/(\w+)(?:\.|::)(\w*)$/);
  if (pkgMatch && lang.getKnownPackages(extra).includes(pkgMatch[1]) && lang.isPackageImported(code, pkgMatch[1], extra)) {
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
  onTest,
  testing = false,
  busy,
  attempts,
  inRush,
  baseXP,
  rushBonus,
  camFeed,
  vimEnabled,
  onVimToggle,
  disabled,
  awaitingInput = false,
  aiButton,
  fontSize: fontSizeProp,
  onFontSizeChange,
  isMobile = false,
  submissionFeedback,
  onDismissSubmissionFeedback,
  extraPackages = EMPTY_EXTRA_PACKAGES,
  language = "go",
}: CodeEditorProps) {
  const lang = getLanguageService(language);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const cursorSpanRef = useRef<HTMLSpanElement>(null);
  const [vim, vimActions] = useVim(vimEnabled);
  /** Vim is driving the cursor (normal / visual) — the native caret is hidden. */
  const vimCommandMode = vim.enabled && vim.mode !== "insert";
  const [cursorPos, setCursorPos] = useState(0);
  /** Mobile: the second row of accessory keys (format, cursor, redo) is open. */
  const [moreKeys, setMoreKeys] = useState(false);

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

  // Re-tokenizing the whole buffer on every render is the dominant per-keystroke
  // cost (it grows with the file). The output only depends on the text and the
  // language, so memoize it — a parent re-render (timers, chat) no longer
  // re-highlights, and a keystroke highlights exactly once.
  const tokens = useMemo(() => lang.tokenize(code), [code, lang]);

  // Format
  const [formatting, setFormatting] = useState(false);
  const handleFormat = useCallback(async () => {
    if (formatting || disabled || busy || !lang.format) return;
    setFormatting(true);
    try {
      const result = await lang.format(code);
      trackCodeFormat(result.success);
      if (result.success && result.body !== code) {
        onCodeChange(result.body);
      }
    } finally {
      setFormatting(false);
    }
  }, [code, onCodeChange, formatting, disabled, busy, lang]);

  // Block cursor: vim normal/visual, or a thick "ready for input" terminal
  // cursor when the terminal is on and awaiting the player.
  const readyCursor = awaitingInput && !disabled && !vim.enabled;
  const showBlockCursor = vimCommandMode || readyCursor;
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(navigator.platform?.startsWith("Mac") || navigator.userAgent.includes("Mac"));
  }, []);

  // Update autocomplete on code/cursor change
  const updateAutocomplete = useCallback((newCode: string, pos: number) => {
    const ctx = detectAutocomplete(newCode, pos, extraPackages, lang);
    if (!ctx) {
      setAcVisible(false);
      return;
    }
    let filtered: Completion[];
    if (ctx.type === "pkg") {
      const all = lang.getCompletions(ctx.pkg, extraPackages);
      filtered = ctx.partial
        ? all.filter((c) => c.label.toLowerCase().startsWith(ctx.partial.toLowerCase()))
        : all;
    } else {
      filtered = lang.getSymbolCompletions(newCode, ctx.start, ctx.partial, extraPackages);
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
  }, [extraPackages, lang]);

  const acceptCompletion = useCallback((item: Completion) => {
    trackAutocomplete(item.label);
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

  const blockCursorPos = vimCommandMode && vim.cursor >= 0 ? vim.cursor : cursorPos;
  const inlineCursor = useMemo<InlineCursor | null>(
    () =>
      showBlockCursor
        ? { pos: blockCursorPos, color: vim.enabled ? VIM_MODE_COLOR[vim.mode] : "var(--color-signal)" }
        : null,
    [showBlockCursor, blockCursorPos, vim.enabled, vim.mode]
  );
  // Re-tokenizing is memoized on the code; splicing the cursor in is a cheap
  // linear pass over the tokens.
  const highlightedNodes = useMemo(
    () => highlightCode(code, tokens, inlineCursor, cursorSpanRef),
    [code, tokens, inlineCursor]
  );

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

  // A vim edit changes the code first; once React has committed it, put the
  // cursor where vim says — before paint, so it never flashes elsewhere.
  useLayoutEffect(() => {
    vimActions.syncAfterRender(textareaRef.current);
  }, [code, vimActions]);

  // Keep vim's cursor on screen: the textarea doesn't scroll for a cursor it
  // isn't drawing, so follow the inline cursor ourselves.
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    const span = cursorSpanRef.current;
    if (!vimCommandMode || !ta || !span) return;
    const top = span.offsetTop;
    const bottom = top + (span.offsetHeight || lineHeight);
    const margin = lineHeight;
    if (top - margin < ta.scrollTop) ta.scrollTop = Math.max(0, top - margin);
    else if (bottom + margin > ta.scrollTop + ta.clientHeight) ta.scrollTop = bottom + margin - ta.clientHeight;
    syncScroll();
  }, [vimCommandMode, blockCursorPos, code, lineHeight, syncScroll]);

  /** Mouse/touch moved the caret: vim adopts it, the "ready" cursor follows it. */
  const handleSelect = useCallback(() => {
    vimActions.syncFromDom(textareaRef.current, code);
    trackCursor();
  }, [vimActions, code, trackCursor]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Block all input when disabled (Maya typing / game paused)
      if (disabled) {
        e.preventDefault();
        return;
      }

      // Autocomplete navigation
      if (acVisible) {
        const isDown = e.key === "ArrowDown";
        const isUp = e.key === "ArrowUp";
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
          setAcVisible(false);
          // In vim insert mode one Escape closes the popup AND leaves insert —
          // otherwise the popup (which shows while typing) eats every Escape.
          if (!vim.enabled) {
            e.preventDefault();
            return;
          }
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

      // Cmd+S (Mac) / Ctrl+S (Win) → go fmt
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleFormat();
        return;
      }

      // Cmd/Ctrl+Enter → TEST (free); add Shift → TRANSMIT TO MAYA. The
      // everyday shortcut is the one that can't cost an attempt.
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (busy || testing || !code.trim()) return;
        if (e.shiftKey || !onTest) onSubmit();
        else onTest();
        return;
      }

      // Let vim handle first
      if (vimActions.handleKeyDown(e, code, codeChangeWithUndo)) {
        setAcVisible(false);
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

      // Enter: keep the line's indent, and split a bracket pair so the closer
      // gets its own line (`{|}` → block). Vim normal mode handled Enter above.
      if (
        e.key === "Enter" &&
        !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey &&
        !e.nativeEvent.isComposing
      ) {
        e.preventDefault();
        const result = smartEnter(code, s, end);
        codeChangeWithUndo(result.code);
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = result.cursor;
          setCursorPos(result.cursor);
          updateAutocomplete(result.code, result.cursor);
        });
        return;
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
    [code, codeChangeWithUndo, onSubmit, onTest, testing, busy, disabled, vim, vimActions, trackCursor, acVisible, acItems, acIndex, acceptCompletion, updateAutocomplete, undo, redo, handleFormat]
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

  const restoreSelection = useCallback((position: number, nextCode: string) => {
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus({ preventScroll: true });
      textarea.selectionStart = textarea.selectionEnd = position;
      setCursorPos(position);
      updateAutocomplete(nextCode, position);
    });
  }, [updateAutocomplete]);

  const insertSnippet = useCallback((before: string, after = "") => {
    if (disabled || busy) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = code.slice(start, end);
    const next = code.slice(0, start) + before + selected + after + code.slice(end);
    codeChangeWithUndo(next);
    const position = selected
      ? start + before.length + selected.length + after.length
      : start + before.length;
    restoreSelection(position, next);
  }, [busy, code, codeChangeWithUndo, disabled, restoreSelection]);

  const moveCursor = useCallback((delta: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const position = Math.max(0, Math.min(code.length, textarea.selectionStart + delta));
    textarea.focus({ preventScroll: true });
    textarea.selectionStart = textarea.selectionEnd = position;
    setCursorPos(position);
  }, [code.length]);

  const lineCount = code.split("\n").length;

  return (
    <div className="flex flex-col h-full">
      {/* Editor area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[var(--color-code-bg)] relative">
        {/* Terminal power state — lit + pulsing when awaiting input, dimmed (standby) while Maya narrates */}
        {awaitingInput ? (
          <div
            className="absolute inset-0 z-30 pointer-events-none"
            style={{
              border: "1px solid var(--color-signal)",
              background: "radial-gradient(ellipse at 50% 100%, rgba(110,255,160,.07), transparent 62%)",
              animation: "terminal-ready 1.8s ease-in-out infinite",
            }}
          />
        ) : busy || disabled ? (
          <div
            className="absolute inset-0 z-30 pointer-events-none"
            style={{ background: "rgba(4,8,16,.5)" }}
          />
        ) : null}
        {/* Editor header — the status label and toolbar get their own strip so
            they never sit on top of line 1 of the player's code. */}
        <div
          className={`relative z-40 shrink-0 flex items-center justify-between gap-2 pl-3 pr-2.5 ${isMobile ? "h-7" : "h-9"}`}
          style={{ background: "rgba(0,0,0,.35)", borderBottom: "1px solid var(--color-border)" }}
        >
          <div
            className="text-[10px] tracking-[3px] font-[family-name:var(--font-display)] whitespace-nowrap"
            style={{ color: awaitingInput ? "var(--color-signal)" : "var(--color-dim)" }}
          >
            {awaitingInput ? "▮ READY" : busy || disabled ? "▯ STANDBY" : ""}
          </div>
        {/* Toolbar: format + zoom */}
        {!isMobile ? <div
          className="flex items-center gap-2"
        >
          <VimSwitch
            enabled={vim.enabled}
            mode={vim.mode}
            pending={vim.pending}
            onToggle={() => {
              const ta = textareaRef.current;
              vimActions.toggle(ta, code);
              onVimToggle?.(!vim.enabled);
              ta?.focus({ preventScroll: true });
            }}
          />
          {lang.format ? <button
            type="button"
            onClick={handleFormat}
            disabled={formatting || disabled || busy}
            className={`bg-transparent border-0 cursor-pointer flex items-center justify-center gap-1 transition-opacity ${isMobile ? "min-h-11 min-w-11 px-2" : "px-1.5 py-0.5"}`}
            style={{
              background: "rgba(4,8,16,.85)",
              border: "1px solid var(--color-border)",
              color: formatting ? "var(--color-dim)" : "var(--color-signal)",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "1px",
              opacity: formatting || disabled ? 0.4 : 1,
            }}
            data-tour="fmt-btn"
            title="Format code (gofmt)"
          >
            {formatting ? "FMT..." : "FMT"}
          </button> : null}
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
              className="text-[10px] tracking-[1px] tabular-nums min-w-[28px] text-center font-[family-name:var(--font-display)]"
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
        </div> : null}
        </div>

        <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Line numbers */}
        <div
          ref={lineNumRef}
          className={`py-3 px-2 text-right select-none overflow-hidden shrink-0 min-w-[30px] ${isMobile ? "max-[374px]:hidden" : ""}`}
          style={{
            fontSize: `${Math.max(fontSize - 2, 8)}px`,
            lineHeight: `${lineHeight}px`,
            background: "rgba(0,0,0,.5)",
            borderRight: "1px solid #0a1820",
            color: "var(--color-dim)",
            opacity: 0.7,
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Highlight + textarea stack — a mode-coloured edge while vim is on */}
        <div
          className="flex-1 relative min-w-0 overflow-hidden"
          style={vim.enabled ? { borderLeft: `2px solid ${VIM_MODE_COLOR[vim.mode]}` } : undefined}
        >
          {vim.enabled && !isMobile ? (
            <div
              className="absolute bottom-1.5 right-3 z-20 pointer-events-none flex items-center gap-2 font-[family-name:var(--font-display)] text-[10px] tracking-[2px]"
              style={{ color: VIM_MODE_COLOR[vim.mode], opacity: 0.85 }}
              aria-hidden="true"
            >
              {vim.pending ? (
                <span className="font-[family-name:var(--font-mono)] tracking-[1px]" style={{ color: "var(--color-foreground)" }}>
                  {vim.pending}
                </span>
              ) : null}
              <span>-- {vimModeLabel(vim.mode)} --</span>
            </div>
          ) : null}
          {/* Syntax-highlighted overlay */}
          <pre
            ref={highlightRef}
            aria-hidden="true"
            className={`absolute inset-0 p-3 m-0 overflow-hidden pointer-events-none ${isMobile ? "whitespace-pre" : "whitespace-pre-wrap"}`}
            style={{
              // must wrap exactly like the textarea above it
              wordBreak: isMobile ? "normal" : "break-all",
              fontFamily: "var(--font-mono)",
              fontSize: `${fontSize}px`,
              lineHeight: `${lineHeight}px`,
              background: "transparent",
              tabSize: 4,
            }}
          >
            {highlightedNodes}
            {/* Ensure trailing newline renders */}
            {"\n"}
          </pre>

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
                <button
                  type="button"
                  key={item.label}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    acceptCompletion(item);
                  }}
                  className={`w-full bg-transparent px-2 cursor-pointer flex items-baseline gap-2 text-left ${isMobile ? "min-h-11 py-2" : "py-0.5"}`}
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
                    className="text-[10px] truncate"
                    style={{ color: "var(--color-dim)" }}
                  >
                    {item.detail}
                  </span>
                </button>
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
            onKeyUp={vimCommandMode ? undefined : trackCursor}
            onSelect={handleSelect}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            data-form-type="other"
            onClick={() => {
              handleSelect();
              if (textareaRef.current && !vimCommandMode) {
                updateAutocomplete(code, textareaRef.current.selectionStart);
              }
            }}
            onPaste={isMobile ? undefined : (e) => e.preventDefault()}
            onScroll={syncScroll}
            spellCheck={false}
            aria-label={vim.enabled ? `Code editor, vim ${vimModeLabel(vim.mode).toLowerCase()} mode` : "Code editor"}
            className={`code-input${vim.enabled && (vim.mode === "visual" || vim.mode === "visual-line") ? " vim-visual" : ""} absolute inset-0 w-full h-full bg-transparent border-0 text-transparent
                       p-3 resize-none focus:outline-none`}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: `${lineHeight}px`,
              tabSize: 4,
              caretColor: disabled || showBlockCursor ? "transparent" : "var(--color-signal)",
              fontFamily: "var(--font-mono)",
              whiteSpace: isMobile ? "pre" : "pre-wrap",
              wordBreak: isMobile ? "normal" : "break-all",
              opacity: disabled ? 0.5 : 1,
            }}
          />
        </div>
        </div>
      </div>

      {submissionFeedback ? (
        <SubmissionFeedbackPanel
          key={`${submissionFeedback.source ?? "transmit"}:${submissionFeedback.line ?? "mission"}:${submissionFeedback.message}`}
          feedback={submissionFeedback}
          stale={submissionFeedback.code !== undefined && submissionFeedback.code !== code}
          onDismiss={onDismissSubmissionFeedback}
        />
      ) : null}

      {isMobile ? (
        // One row of the keys a phone keyboard buries; the occasional ones
        // (format, cursor nudges, redo) sit behind ⋯ so the editor keeps its
        // height with the software keyboard open.
        <div
          className="shrink-0 px-1.5 py-1"
          style={{
            background: "#04090f",
            borderTop: "1px solid var(--color-border)",
          }}
          role="toolbar"
          aria-label="Code keyboard shortcuts"
        >
          <div className="grid grid-cols-7 gap-1">
            <EditorAccessoryKey label="TAB" onPress={() => insertSnippet("    ")} />
            <EditorAccessoryKey label={ACCESSORY_OPERATOR[language].label} onPress={() => insertSnippet(ACCESSORY_OPERATOR[language].insert)} />
            <EditorAccessoryKey label="{ }" onPress={() => insertSnippet("{", "}")} />
            <EditorAccessoryKey label="( )" onPress={() => insertSnippet("(", ")")} />
            <EditorAccessoryKey label={'" "'} onPress={() => insertSnippet('"', '"')} />
            <EditorAccessoryKey label="UNDO" onPress={undo} />
            <EditorAccessoryKey
              label="⋯"
              ariaLabel={moreKeys ? "Fewer keys" : "More keys"}
              expanded={moreKeys}
              onPress={() => setMoreKeys((open) => !open)}
            />
          </div>
          {moreKeys ? (
            <div className="mt-1 grid grid-cols-7 gap-1">
              {lang.format ? (
                <span className="col-span-2 grid">
                  <EditorAccessoryKey label={formatting ? "FMT…" : "FMT"} ariaLabel="Format code" onPress={handleFormat} />
                </span>
              ) : null}
              <EditorAccessoryKey label="←" ariaLabel="Move cursor left" onPress={() => moveCursor(-1)} />
              <EditorAccessoryKey label="→" ariaLabel="Move cursor right" onPress={() => moveCursor(1)} />
              <EditorAccessoryKey label="REDO" onPress={redo} />
            </div>
          ) : null}
          {aiButton ? <div className="mt-1 grid">{aiButton}</div> : null}
        </div>
      ) : null}

      {/* Cam feed slot (above submit) */}
      {camFeed && !isMobile && (
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
        className={`shrink-0 flex justify-between items-center ${isMobile ? "min-h-12 gap-2 px-2 py-1" : "px-3 py-1.5"}`}
        style={{
          borderTop: "1px solid #0a1820",
          background: "#04090f",
        }}
      >
        <div className={`gap-2.5 text-[10px] items-center ${isMobile ? "hidden" : "flex"}`}>
          {aiButton}
          <span className="text-[var(--color-dim)]">{lineCount}L</span>
          {attempts === 0 && !inRush && (
            <span className="text-[var(--color-dim)]">
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
              <span className="text-[var(--color-dim)]">TRIES</span>
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
        {(() => {
          // A passing TEST makes TRANSMIT the obvious next move.
          const readyToSend =
            submissionFeedback?.source === "test" &&
            submissionFeedback.report?.passed === true &&
            submissionFeedback.code === code;
          const mod = isMac ? "⌘" : "Ctrl";
          const accent = inRush ? "var(--color-alert)" : "var(--color-signal)";
          return (
            <div className={`flex items-center gap-1.5 ${isMobile ? "flex-1" : ""}`}>
              {onTest ? (
                <button
                  type="button"
                  data-tour="test-btn"
                  onClick={onTest}
                  disabled={busy || testing || disabled || !code.trim()}
                  className={`${isMobile ? "min-h-12 shrink-0 flex-col justify-center gap-0.5 px-3.5 py-1 text-[12px] tracking-[1.5px]" : "items-center gap-2 py-1.5 px-3.5 text-[10px] tracking-[2px]"} bg-transparent cursor-pointer
                             transition-colors disabled:opacity-35 disabled:cursor-not-allowed flex`}
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                  title="Run the mission checks here. Free — not sent to Maya, not an attempt."
                >
                  <span className="whitespace-nowrap">{testing ? "TESTING…" : "▷ TEST"}</span>
                  {!testing && !isMobile && <span className="text-[10px] tracking-[1px] opacity-60">{mod}⏎</span>}
                  {isMobile && <span className="text-[10px] tracking-[1px] opacity-60">FREE</span>}
                </button>
              ) : null}
              <button
                data-tour="transmit-btn"
                onClick={onSubmit}
                disabled={busy || testing || disabled || !code.trim()}
                className={`${isMobile ? "min-h-12 min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-1 text-[12px] tracking-[1.5px]" : "items-center gap-2 py-1.5 px-5 text-[10px] tracking-[2px]"} cursor-pointer
                           transition-colors disabled:opacity-35 disabled:cursor-not-allowed flex`}
                style={{
                  background: readyToSend ? accent : inRush ? "rgba(255,80,20,.1)" : "rgba(110,255,160,.06)",
                  border: `1px solid ${inRush ? "#ff6a2a" : "var(--color-signal)"}`,
                  color: readyToSend ? "var(--color-background)" : accent,
                }}
                title="Send it to Maya. This is the attempt that counts."
              >
                <span className="whitespace-nowrap">{busy ? "TRANSMITTING…" : "TRANSMIT TO MAYA ▸"}</span>
                {isMobile && <span className="text-[10px] tracking-[1px] opacity-70">COUNTS AS A TRY</span>}
                {!busy && !isMobile && onTest && (
                  <span className="text-[10px] tracking-[1px] opacity-70">⇧{mod}⏎</span>
                )}
                {!busy && !isMobile && !onTest && (
                  <span className="text-[10px] tracking-[1px] opacity-70">{mod}⏎</span>
                )}
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

const CHECK_ICON: Record<CheckStatus, string> = { pass: "✓", fail: "✗", pending: "–" };
const CHECK_COLOR: Record<CheckStatus, string> = {
  pass: "var(--color-signal)",
  fail: "var(--color-danger)",
  pending: "var(--color-dim)",
};

/** A label with `backticked` code rendered as code. */
function CodeLabel({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} style={{ color: "var(--color-syn-ident)" }}>{part}</code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** One side of the expected/actual comparison, with the difference lit. */
function DiffRow({ label, line, tone }: { label: string; line: DiffLine | null; tone: "expected" | "actual" }) {
  const color = tone === "expected" ? "var(--color-signal)" : "var(--color-danger)";
  return (
    <div className="flex items-baseline gap-3 text-[12px] leading-[1.6]">
      <span className="shrink-0 w-[68px] text-[10px] tracking-[2px]" style={{ color: "var(--color-dim)" }}>{label}</span>
      {line ? (
        <span className="min-w-0 whitespace-pre-wrap break-all" style={{ color: "var(--color-foreground)" }}>
          {line.before}
          {line.mid ? (
            <span style={{ background: `color-mix(in srgb, ${color} 22%, transparent)`, color, outline: `1px solid color-mix(in srgb, ${color} 45%, transparent)` }}>
              {line.mid}
            </span>
          ) : (
            // Something is missing here: mark the gap.
            <span aria-label="missing" style={{ borderLeft: `2px solid ${color}`, marginLeft: 1, marginRight: 1 }} />
          )}
          {line.after}
        </span>
      ) : (
        <span className="text-[11px]" style={{ color: "var(--color-danger)" }}>(no line)</span>
      )}
    </div>
  );
}

/**
 * The result of a TEST or a rejected TRANSMIT: the three checks in a row, then
 * the ONE thing to fix next — the expected-vs-actual difference when output is
 * off, the error when it doesn't run, the missing code when it hardcodes.
 */
function SubmissionFeedbackPanel({
  feedback,
  stale,
  onDismiss,
}: {
  feedback: SubmissionFeedback;
  /** The code has been edited since this run. */
  stale: boolean;
  onDismiss?: () => void;
}) {
  const [lessonOpen, setLessonOpen] = useState(false);
  const report = feedback.report;
  const isTest = feedback.source === "test";
  const passed = report?.passed === true;
  const failure = report ? firstFailure(report) : undefined;
  const tone = passed ? "var(--color-signal)" : isTest ? "var(--color-alert)" : "var(--color-danger)";

  const title = report?.offline
    ? "COMPILER UNREACHABLE"
    : isTest
      ? passed ? "TEST · ALL CHECKS PASS" : `TEST · ${report ? passedCount(report) : "0"} CHECKS PASS`
      : report ? `REJECTED · ${passedCount(report)} CHECKS PASS` : "TRANSMISSION REJECTED";

  return (
    <div
      className="shrink-0 px-3 py-2 transition-opacity"
      style={{
        borderTop: `1px solid color-mix(in srgb, ${tone} 40%, transparent)`,
        background: `color-mix(in srgb, ${tone} 5%, transparent)`,
        opacity: stale ? 0.55 : 1,
      }}
      role="status"
    >
      {/* Header: what kind of run, how many checks passed */}
      <div className="flex items-center gap-2">
        <span className="font-[family-name:var(--font-display)] text-[10px] tracking-[2px]" style={{ color: tone }}>
          {title}
        </span>
        {!report && feedback.line ? (
          <span className="text-[10px] tracking-[1px]" style={{ color: "var(--color-alert)" }}>LINE {feedback.line}</span>
        ) : null}
        <span className="ml-auto text-right text-[10px] tracking-[1px]" style={{ color: "var(--color-dim)" }}>
          {stale ? "EDITED SINCE THIS RUN" : isTest ? <>LOCAL<span className="hidden sm:inline"> · NOT SENT TO MAYA</span></> : ""}
        </span>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="bg-transparent px-1 text-[11px] cursor-pointer"
            style={{ color: "var(--color-dim)", border: "none" }}
            aria-label="Dismiss result"
          >
            ×
          </button>
        ) : null}
      </div>

      {/* The checks — what "correct" means, each judged on its own */}
      {report && !report.offline ? (
        <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px]" aria-label="Mission checks">
          {report.checks.map((check) => (
            <li key={check.id} className="flex items-baseline gap-1.5" style={{ color: check.status === "pending" ? "var(--color-dim)" : "var(--color-foreground)" }}>
              <span aria-hidden="true" style={{ color: CHECK_COLOR[check.status] }}>{CHECK_ICON[check.status]}</span>
              <span className="sr-only">{check.status}:</span>
              <span><CodeLabel text={check.label} /></span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* The one thing to do next */}
      <div className="mt-1.5">
        {report?.offline ? (
          <p className="text-[11px] leading-[1.5]" style={{ color: "var(--color-foreground)" }}>
            couldn&apos;t reach the compiler, so nothing ran. {isTest ? "transmit and maya will check it her way." : feedback.message}
          </p>
        ) : passed ? (
          <p className="text-[11px] leading-[1.5]" style={{ color: "var(--color-foreground)" }}>
            {isTest ? "every check passes. transmit it to maya to clear the step." : feedback.message}
          </p>
        ) : report?.diff && failure?.id === "output" ? (
          <div>
            <DiffRow label="EXPECTED" line={report.diff.expected} tone="expected" />
            <DiffRow label="ACTUAL" line={report.diff.actual} tone="actual" />
            <p className="mt-0.5 text-[11px] leading-[1.5]" style={{ color: tone }}>
              <CodeLabel text={report.diff.note} />
            </p>
          </div>
        ) : failure?.detail ? (
          <>
            <p className="text-[11px] leading-[1.5] whitespace-pre-line" style={{ color: "var(--color-foreground)" }}>
              <CodeLabel text={failure.id === "uses" ? `${failure.detail} — the answer has to be worked out by your code, not typed in by hand.` : failure.detail} />
            </p>
            {failure.id === "output" && report?.actual?.trim() ? (
              <div className="mt-1 flex items-baseline gap-3 text-[11px]">
                <span className="shrink-0 w-[68px] text-[10px] tracking-[2px]" style={{ color: "var(--color-dim)" }}>PRINTED</span>
                <span className="min-w-0 whitespace-pre-wrap break-all" style={{ color: "var(--color-foreground)" }}>
                  {report.actual.trim().split("\n").slice(0, 3).join("\n")}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-[11px] leading-[1.45]" style={{ color: "var(--color-foreground)" }}>
            {feedback.message}
          </p>
        )}
      </div>

      {feedback.lesson && !passed ? (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => setLessonOpen((open) => !open)}
            className="bg-transparent p-0 text-[10px] tracking-[1px] cursor-pointer"
            style={{ color: "var(--color-info)", border: "none" }}
            aria-expanded={lessonOpen}
          >
            {lessonOpen ? "HIDE QUICK LESSON ▴" : "WHY THIS FAILED · QUICK LESSON ▾"}
          </button>
          {lessonOpen ? (
            <p className="mt-1 text-[10px] leading-[1.45]" style={{ color: "var(--color-info)" }}>
              {feedback.lesson}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EditorAccessoryKey({
  label,
  ariaLabel,
  expanded,
  onPress,
}: {
  label: string;
  ariaLabel?: string;
  /** Set on a key that opens more keys. */
  expanded?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      aria-expanded={expanded}
      // pointerdown + preventDefault keeps the textarea focused, so the
      // software keyboard stays up while the player taps symbols.
      onPointerDown={(event) => {
        event.preventDefault();
        onPress();
      }}
      // Keyboard / switch-access users still activate it with a click.
      onClick={(event) => {
        if (event.detail === 0) onPress();
      }}
      className="min-h-11 min-w-0 bg-transparent px-1 text-[12px] font-bold whitespace-nowrap"
      style={{
        color: "var(--color-signal)",
        border: `1px solid ${expanded ? "var(--color-signal)" : "var(--color-border)"}`,
        background: expanded ? "rgba(var(--signal-rgb),.08)" : "transparent",
      }}
    >
      {label}
    </button>
  );
}

/** The vim on/off switch + live mode badge, in the editor header. */
function VimSwitch({
  enabled,
  mode,
  pending,
  onToggle,
}: {
  enabled: boolean;
  mode: VimMode;
  pending: string;
  onToggle: () => void;
}) {
  const color = VIM_MODE_COLOR[mode];
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        title={enabled ? "Vim keys on — click to turn off" : "Turn on vim keys (normal / insert / visual modes)"}
        className={`cursor-pointer flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] tracking-[1px]${enabled ? "" : " vim-flicker"}`}
        style={{
          background: enabled ? "color-mix(in srgb, var(--color-signal) 12%, transparent)" : "rgba(4,8,16,.85)",
          border: `1px solid ${enabled ? "var(--color-signal)" : "var(--color-border)"}`,
          color: enabled ? "var(--color-signal)" : "var(--color-dim)",
          fontFamily: "var(--font-mono)",
        }}
      >
        VIM
        {/* switch track */}
        <span
          aria-hidden="true"
          className="relative inline-block"
          style={{ width: 20, height: 10, border: `1px solid ${enabled ? "var(--color-signal)" : "var(--color-dim)"}` }}
        >
          <span
            className="absolute top-[1px] transition-[left] duration-150"
            style={{ left: enabled ? 11 : 1, width: 6, height: 6, background: enabled ? "var(--color-signal)" : "var(--color-dim)" }}
          />
        </span>
        <span className="min-w-[22px] text-left">{enabled ? "ON" : "OFF"}</span>
      </button>
      {enabled ? (
        <span
          aria-live="polite"
          className="px-1.5 py-0.5 text-[10px] tracking-[2px] font-[family-name:var(--font-display)] min-w-[64px] text-center"
          style={{ background: color, color: "var(--color-code-bg)" }}
        >
          {vimModeLabel(mode)}
        </span>
      ) : null}
      {enabled && pending ? (
        <span className="text-[10px] font-[family-name:var(--font-mono)]" style={{ color: "var(--color-foreground)" }}>
          {pending}
        </span>
      ) : null}
    </div>
  );
}
