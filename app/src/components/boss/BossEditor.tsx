"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { BossTab } from "@/types/game";
import { tokenize, type Token } from "@/lib/go/tokenizer";
import { useVim, type VimMode } from "@/hooks/useVim";

interface BossEditorProps {
  tabs: BossTab[];
  activeTab: string;
  tabCode: Record<string, string>;
  onTabCodeChange: (tabId: string, code: string) => void;
  onExecute: () => void;
  busy: boolean;
  vimEnabled?: boolean;
}

function vimModeLabel(mode: VimMode): string {
  if (mode === "normal") return "NOR";
  if (mode === "insert") return "INS";
  return "VIS";
}

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

export function BossEditor({
  tabs,
  activeTab,
  tabCode,
  onTabCodeChange,
  onExecute,
  busy,
  vimEnabled = false,
}: BossEditorProps) {
  const [selectedTab, setSelectedTab] = useState(activeTab);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [vim, vimActions] = useVim(vimEnabled);
  const isBlockCursor = vim.enabled && vim.mode === "normal";

  // Auto-switch to active tab when turn changes
  useEffect(() => {
    setSelectedTab(activeTab);
  }, [activeTab]);

  // Auto-focus textarea when tab changes or component mounts
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      requestAnimationFrame(() => ta.focus());
    }
  }, [selectedTab, activeTab]);

  const currentCode = tabCode[selectedTab] ?? "";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onTabCodeChange(selectedTab, e.target.value);
    },
    [selectedTab, onTabCodeChange]
  );

  const handleCodeChange = useCallback(
    (newCode: string) => onTabCodeChange(selectedTab, newCode),
    [selectedTab, onTabCodeChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl/Cmd + Enter to execute
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!busy) onExecute();
        return;
      }

      // Let vim handle first
      if (vimActions.handleKeyDown(e, currentCode, handleCodeChange)) {
        return;
      }

      // Tab key for indentation (works when vim is off or in insert mode)
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newCode = currentCode.slice(0, start) + "\t" + currentCode.slice(end);
        onTabCodeChange(selectedTab, newCode);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 1;
        });
      }
    },
    [busy, onExecute, currentCode, selectedTab, onTabCodeChange, vimActions, handleCodeChange]
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Tab bar + RUN */}
      <div
        className="flex items-center shrink-0"
        style={{
          background: "#0a0408",
          borderBottom: "1px solid #201010",
        }}
      >
        {/* Weapon tabs */}
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className="bg-transparent text-[8px] tracking-[2px] px-3.5 py-2 cursor-pointer transition-colors"
            style={{
              color:
                selectedTab === tab.id
                  ? tab.id === activeTab
                    ? "#ffaa00"
                    : "#ff6e6e"
                  : "var(--color-dim)",
              borderBottom:
                selectedTab === tab.id
                  ? `2px solid ${tab.id === activeTab ? "#ffaa00" : "#ff6e6e"}`
                  : "2px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}

        <div className="flex-1" />

        {/* RUN button */}
        <button
          onClick={onExecute}
          disabled={busy}
          className="bg-transparent text-[9px] tracking-[3px] px-4 py-2 cursor-pointer font-[family-name:var(--font-display)] transition-colors mr-2"
          style={{
            color: busy ? "#301818" : "#ff6e6e",
            border: `1px solid ${busy ? "#201010" : "rgba(255,64,64,.3)"}`,
            textShadow: busy ? "none" : "0 0 6px rgba(255,64,64,.3)",
          }}
          onMouseEnter={(e) => {
            if (!busy) {
              e.currentTarget.style.background = "rgba(255,64,64,.1)";
              e.currentTarget.style.borderColor = "rgba(255,64,64,.6)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = busy ? "#201010" : "rgba(255,64,64,.3)";
          }}
        >
          ▸ RUN
        </button>
      </div>

      {/* Editor area — transparent textarea overlay */}
      <div className="relative flex-1 min-h-0 overflow-auto" style={{ background: "#080408" }}>
        {/* Syntax highlight layer */}
        <pre
          className="absolute inset-0 p-3 text-[11px] leading-[1.6] font-[family-name:var(--font-mono)] pointer-events-none whitespace-pre-wrap break-words"
          style={{ tabSize: 4, color: "var(--color-foreground)" }}
          dangerouslySetInnerHTML={{ __html: highlightGo(currentCode) }}
        />
        {/* Input layer — NEVER disabled, always typeable */}
        <textarea
          ref={textareaRef}
          value={currentCode}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={(e) => e.preventDefault()}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="absolute inset-0 w-full h-full p-3 text-[11px] leading-[1.6] font-[family-name:var(--font-mono)] resize-none outline-none whitespace-pre-wrap break-words"
          style={{
            background: "transparent",
            color: "transparent",
            caretColor: isBlockCursor ? "transparent" : "#ff6e6e",
            tabSize: 4,
          }}
        />
      </div>

      {/* Function signature + vim indicator */}
      <div
        className="px-3 py-1.5 shrink-0 flex items-center justify-between"
        style={{
          background: "#060304",
          borderTop: "1px solid #201010",
        }}
      >
        <code
          className="text-[8px] font-[family-name:var(--font-mono)]"
          style={{ color: "var(--color-dim)" }}
        >
          {tabs.find((t) => t.id === selectedTab)?.functionSignature ?? ""}
        </code>
        {vim.enabled && (
          <span
            className="text-[7px] tracking-[2px] font-[family-name:var(--font-display)]"
            style={{
              color: vim.mode === "normal" ? "var(--color-signal)" : vim.mode === "insert" ? "#ffaa00" : "#ff6e6e",
            }}
          >
            {vimModeLabel(vim.mode)}
          </span>
        )}
      </div>
    </div>
  );
}

function highlightGo(code: string): string {
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
