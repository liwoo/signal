"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  processKey,
  keyFromEvent,
  clampNormal,
  isVisualMode,
  visualRange,
  type VimMode,
  type VimOutput,
} from "@/lib/vim/engine";

export type { VimMode } from "@/lib/vim/engine";

interface VimState {
  mode: VimMode;
  enabled: boolean;
  /** Keys typed so far for an unfinished command (`d2`, `ci`), shown in the status bar. */
  pending: string;
  /** Normal/visual-mode cursor offset; -1 until vim has placed it. */
  cursor: number;
}

interface VimActions {
  /** Flip vim on/off. Pass the textarea so the cursor lands where the caret was. */
  toggle: (ta?: HTMLTextAreaElement | null, code?: string) => void;
  handleKeyDown: (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    code: string,
    onCodeChange: (code: string) => void
  ) => boolean;
  /**
   * Call from a layout effect keyed on the code: once React has committed a vim
   * edit, put the cursor/selection where vim says — before the browser paints,
   * so it never flashes at the end of the buffer.
   */
  syncAfterRender: (ta: HTMLTextAreaElement | null) => void;
  /** The player moved the caret with the mouse/touch — adopt it (a drag becomes a visual selection). */
  syncFromDom: (ta: HTMLTextAreaElement | null, code: string) => void;
}

function freshState(code: string, pos: number, mode: VimMode): VimOutput {
  const p = mode === "insert" ? pos : clampNormal(code, pos);
  return {
    code, pos: p, mode, pending: "", yank: "", yankLinewise: false, undoStack: [], redoStack: [],
    anchor: p, wantCol: null, lastFind: null, lastChange: null, insertSession: null,
    handled: true, codeChanged: false,
  };
}

/** The textarea selection that represents a vim state. */
function selectionFor(s: VimOutput): { start: number; end: number; dir: "forward" | "backward" } {
  if (isVisualMode(s.mode)) {
    const r = visualRange(s.code, s.anchor, s.pos, s.mode);
    return { start: r.start, end: r.end, dir: s.pos < s.anchor ? "backward" : "forward" };
  }
  return { start: s.pos, end: s.pos, dir: "forward" };
}

export function useVim(initialEnabled = false): [VimState, VimActions] {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [ui, setUi] = useState<{ mode: VimMode; pending: string; cursor: number }>({
    mode: initialEnabled ? "normal" : "insert",
    pending: "",
    cursor: -1,
  });

  // The engine state is the source of truth for the cursor — never re-read it
  // from a textarea that may not have caught up with the last keystroke yet.
  const stateRef = useRef<VimOutput | null>(null);
  // The selection we last put on the textarea; anything else came from the player.
  const appliedRef = useRef<{ start: number; end: number } | null>(null);
  // A vim edit waiting for React to commit the new code before the cursor moves.
  const pendingSelRef = useRef<string | null>(null);
  // Mirrors `enabled` for event handlers; only ever written by setVimEnabled.
  const enabledRef = useRef(initialEnabled);

  const publish = useCallback((s: VimOutput) => {
    stateRef.current = s;
    setUi((prev) =>
      prev.mode === s.mode && prev.pending === s.pending && prev.cursor === s.pos
        ? prev
        : { mode: s.mode, pending: s.pending, cursor: s.pos }
    );
  }, []);

  const apply = useCallback((ta: HTMLTextAreaElement, s: VimOutput) => {
    const sel = selectionFor(s);
    if (ta.selectionStart !== sel.start || ta.selectionEnd !== sel.end) {
      ta.setSelectionRange(sel.start, sel.end, sel.dir);
    }
    appliedRef.current = { start: sel.start, end: sel.end };
  }, []);

  const setVimEnabled = useCallback(
    (next: boolean, ta?: HTMLTextAreaElement | null, code?: string) => {
      enabledRef.current = next;
      setEnabled(next);
      pendingSelRef.current = null;
      if (!next) {
        stateRef.current = null;
        appliedRef.current = null;
        setUi({ mode: "insert", pending: "", cursor: -1 });
        if (ta) ta.setSelectionRange(ta.selectionStart, ta.selectionStart);
        return;
      }
      if (ta && code !== undefined) {
        const s = freshState(code, ta.selectionStart, "normal");
        publish(s);
        apply(ta, s);
      } else {
        stateRef.current = null;
        setUi({ mode: "normal", pending: "", cursor: -1 });
      }
    },
    [apply, publish]
  );

  const toggle = useCallback(
    (ta?: HTMLTextAreaElement | null, code?: string) => setVimEnabled(!enabledRef.current, ta, code),
    [setVimEnabled]
  );

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLTextAreaElement>,
      code: string,
      onCodeChange: (code: string) => void
    ): boolean => {
      if (!enabledRef.current || e.nativeEvent.isComposing) return false;
      const ta = e.currentTarget;
      const prev = stateRef.current ?? freshState(code, ta.selectionStart, ui.mode);

      const key = keyFromEvent(e, prev.mode, prev.pending);
      if (key === null) return false;
      if (key === "") {
        if (e.key === "Tab") e.preventDefault();
        return true;
      }

      // Where is the cursor? Vim's own record, unless the player moved it
      // (mouse, typing in insert mode) since vim last placed it.
      const applied = appliedRef.current;
      const domMoved = !applied || ta.selectionStart !== applied.start || ta.selectionEnd !== applied.end;
      let pos = prev.pos;
      if (prev.mode === "insert" || domMoved) {
        pos = prev.mode === "insert" ? ta.selectionStart : clampNormal(code, ta.selectionStart);
      }

      const result = processKey({ ...prev, code, pos, key });
      if (!result.handled) return false;
      e.preventDefault();
      publish(result);

      if (result.codeChanged && result.code !== code) {
        pendingSelRef.current = result.code;
        onCodeChange(result.code);
      } else {
        apply(ta, result);
      }
      return true;
    },
    [apply, publish, ui.mode]
  );

  const syncAfterRender = useCallback(
    (ta: HTMLTextAreaElement | null) => {
      const s = stateRef.current;
      if (!ta || !s || !enabledRef.current) return;
      if (pendingSelRef.current !== null) {
        if (ta.value !== pendingSelRef.current) return; // parent hasn't committed our edit yet
        pendingSelRef.current = null;
        apply(ta, s);
        return;
      }
      // The code changed from outside (format, undo, step change): keep the
      // vim cursor where it was rather than letting it jump to the end.
      if (s.mode === "insert" || s.code === ta.value) return;
      const next = { ...s, code: ta.value, pos: clampNormal(ta.value, s.pos), anchor: clampNormal(ta.value, s.anchor) };
      publish(next);
      apply(ta, next);
    },
    [apply, publish]
  );

  const syncFromDom = useCallback(
    (ta: HTMLTextAreaElement | null, code: string) => {
      const s = stateRef.current;
      if (!ta || !enabledRef.current) return;
      const applied = appliedRef.current;
      if (applied && ta.selectionStart === applied.start && ta.selectionEnd === applied.end) return;
      const base = s ?? freshState(code, ta.selectionStart, ui.mode);
      if (base.mode === "insert") return;

      let next: VimOutput;
      if (ta.selectionStart !== ta.selectionEnd) {
        // a mouse drag in normal mode is a visual selection
        const backward = ta.selectionDirection === "backward";
        const anchor = backward ? ta.selectionEnd - 1 : ta.selectionStart;
        const head = backward ? ta.selectionStart : ta.selectionEnd - 1;
        next = { ...base, code, mode: "visual", anchor, pos: head, pending: "", wantCol: null };
      } else {
        const pos = clampNormal(code, ta.selectionStart);
        next = { ...base, code, mode: "normal", pos, anchor: pos, pending: "", wantCol: null };
      }
      publish(next);
      apply(ta, next);
    },
    [apply, publish, ui.mode]
  );

  const actions = useMemo(
    () => ({ toggle, handleKeyDown, syncAfterRender, syncFromDom }),
    [toggle, handleKeyDown, syncAfterRender, syncFromDom]
  );

  return [{ mode: ui.mode, enabled, pending: ui.pending, cursor: ui.cursor }, actions];
}
