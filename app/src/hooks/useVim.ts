"use client";

import { useState, useCallback, useRef } from "react";
import { processKey, type VimMode } from "@/lib/vim/engine";

export type { VimMode } from "@/lib/vim/engine";

interface VimState {
  mode: VimMode;
  enabled: boolean;
}

interface VimActions {
  toggle: () => void;
  setMode: (mode: VimMode) => void;
  handleKeyDown: (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    code: string,
    onCodeChange: (code: string) => void
  ) => boolean;
}

export function useVim(initialEnabled = false): [VimState, VimActions] {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [mode, setMode] = useState<VimMode>(initialEnabled ? "normal" : "insert");
  const pendingRef = useRef("");
  const yankRef = useRef("");
  const yankLinewiseRef = useRef(false);
  const undoRef = useRef<string[]>([]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      if (!prev) setMode("normal");
      return !prev;
    });
  }, []);

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLTextAreaElement>,
      code: string,
      onCodeChange: (code: string) => void
    ): boolean => {
      if (!enabled) return false;

      const ta = e.target as HTMLTextAreaElement;
      const pos = ta.selectionStart;

      const result = processKey({
        code,
        pos,
        mode,
        pending: pendingRef.current,
        yank: yankRef.current,
        yankLinewise: yankLinewiseRef.current,
        undoStack: undoRef.current,
        key: e.key,
      });

      if (!result.handled) return false;

      e.preventDefault();

      // Update refs
      pendingRef.current = result.pending;
      yankRef.current = result.yank;
      yankLinewiseRef.current = result.yankLinewise;
      undoRef.current = result.undoStack;

      // Update mode if changed
      if (result.mode !== mode) {
        setMode(result.mode);
      }

      // Update code if changed
      if (result.codeChanged) {
        onCodeChange(result.code);
      }

      // Set cursor position
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = result.pos;
      });

      return true;
    },
    [enabled, mode]
  );

  return [
    { mode, enabled },
    { toggle, setMode, handleKeyDown },
  ];
}
