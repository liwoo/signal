"use client";

import { useState, useCallback, useRef } from "react";

export type VimMode = "normal" | "insert" | "visual";

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
  ) => boolean; // returns true if event was handled
}

export function useVim(): [VimState, VimActions] {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<VimMode>("normal");
  const pendingRef = useRef("");

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
      const key = e.key;

      if (mode === "normal") {
        e.preventDefault();

        const pending = pendingRef.current + key;

        // Insert mode transitions
        if (pending === "i") {
          setMode("insert");
          pendingRef.current = "";
          return true;
        }
        if (pending === "a") {
          setMode("insert");
          const next = Math.min(pos + 1, code.length);
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = next;
          });
          pendingRef.current = "";
          return true;
        }
        if (pending === "A") {
          setMode("insert");
          const lineEnd = code.indexOf("\n", pos);
          const next = lineEnd === -1 ? code.length : lineEnd;
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = next;
          });
          pendingRef.current = "";
          return true;
        }
        if (pending === "I") {
          setMode("insert");
          const lineStart = code.lastIndexOf("\n", pos - 1) + 1;
          const firstNonSpace = code.slice(lineStart).search(/\S/);
          const next = lineStart + (firstNonSpace === -1 ? 0 : firstNonSpace);
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = next;
          });
          pendingRef.current = "";
          return true;
        }
        if (pending === "o") {
          setMode("insert");
          const lineEnd = code.indexOf("\n", pos);
          const insertAt = lineEnd === -1 ? code.length : lineEnd;
          const next = code.slice(0, insertAt) + "\n" + code.slice(insertAt);
          onCodeChange(next);
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = insertAt + 1;
          });
          pendingRef.current = "";
          return true;
        }
        if (pending === "O") {
          setMode("insert");
          const lineStart = code.lastIndexOf("\n", pos - 1) + 1;
          const next = code.slice(0, lineStart) + "\n" + code.slice(lineStart);
          onCodeChange(next);
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = lineStart;
          });
          pendingRef.current = "";
          return true;
        }

        // Motion
        if (pending === "h") {
          const next = Math.max(0, pos - 1);
          ta.selectionStart = ta.selectionEnd = next;
          pendingRef.current = "";
          return true;
        }
        if (pending === "l") {
          const next = Math.min(code.length, pos + 1);
          ta.selectionStart = ta.selectionEnd = next;
          pendingRef.current = "";
          return true;
        }
        if (pending === "j") {
          const lineStart = code.lastIndexOf("\n", pos - 1) + 1;
          const col = pos - lineStart;
          const lineEnd = code.indexOf("\n", pos);
          if (lineEnd !== -1) {
            const nextLineEnd = code.indexOf("\n", lineEnd + 1);
            const nextLineLen = (nextLineEnd === -1 ? code.length : nextLineEnd) - (lineEnd + 1);
            const next = lineEnd + 1 + Math.min(col, nextLineLen);
            ta.selectionStart = ta.selectionEnd = next;
          }
          pendingRef.current = "";
          return true;
        }
        if (pending === "k") {
          const lineStart = code.lastIndexOf("\n", pos - 1) + 1;
          if (lineStart > 0) {
            const col = pos - lineStart;
            const prevLineStart = code.lastIndexOf("\n", lineStart - 2) + 1;
            const prevLineLen = lineStart - 1 - prevLineStart;
            const next = prevLineStart + Math.min(col, prevLineLen);
            ta.selectionStart = ta.selectionEnd = next;
          }
          pendingRef.current = "";
          return true;
        }
        if (pending === "0") {
          const lineStart = code.lastIndexOf("\n", pos - 1) + 1;
          ta.selectionStart = ta.selectionEnd = lineStart;
          pendingRef.current = "";
          return true;
        }
        if (pending === "$") {
          const lineEnd = code.indexOf("\n", pos);
          const next = lineEnd === -1 ? code.length : lineEnd;
          ta.selectionStart = ta.selectionEnd = next;
          pendingRef.current = "";
          return true;
        }
        if (pending === "w") {
          const rest = code.slice(pos);
          const m = rest.match(/^\w*\s*\S/) || rest.match(/^\W*\w/);
          if (m) {
            ta.selectionStart = ta.selectionEnd = pos + m[0].length - 1;
          }
          pendingRef.current = "";
          return true;
        }
        if (pending === "b") {
          const before = code.slice(0, pos);
          const m = before.match(/\S\s*\w*$/);
          if (m) {
            ta.selectionStart = ta.selectionEnd = pos - m[0].length + 1;
          }
          pendingRef.current = "";
          return true;
        }
        if (pending === "G") {
          ta.selectionStart = ta.selectionEnd = code.length;
          pendingRef.current = "";
          return true;
        }

        // gg
        if (pending === "g") {
          pendingRef.current = "g";
          return true;
        }
        if (pending === "gg") {
          ta.selectionStart = ta.selectionEnd = 0;
          pendingRef.current = "";
          return true;
        }

        // Delete
        if (pending === "x") {
          if (pos < code.length) {
            onCodeChange(code.slice(0, pos) + code.slice(pos + 1));
            requestAnimationFrame(() => {
              ta.selectionStart = ta.selectionEnd = pos;
            });
          }
          pendingRef.current = "";
          return true;
        }

        // dd
        if (pending === "d") {
          pendingRef.current = "d";
          return true;
        }
        if (pending === "dd") {
          const lineStart = code.lastIndexOf("\n", pos - 1) + 1;
          const lineEnd = code.indexOf("\n", pos);
          const delEnd = lineEnd === -1 ? code.length : lineEnd + 1;
          onCodeChange(code.slice(0, lineStart) + code.slice(delEnd));
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = lineStart;
          });
          pendingRef.current = "";
          return true;
        }

        // Clear pending for unrecognized
        pendingRef.current = "";
        return true;
      }

      // Insert mode: Escape returns to normal
      if (mode === "insert" && key === "Escape") {
        e.preventDefault();
        setMode("normal");
        // Move cursor back one like vim
        const next = Math.max(0, pos - 1);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = next;
        });
        return true;
      }

      return false;
    },
    [enabled, mode]
  );

  return [
    { mode, enabled },
    { toggle, setMode, handleKeyDown },
  ];
}
