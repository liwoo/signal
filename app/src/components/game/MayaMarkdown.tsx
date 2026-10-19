"use client";

import { Fragment } from "react";
import type { Token } from "@/lib/lang/types";
import { useLanguageService } from "./LanguageContext";

// Parses Maya's messages into styled segments:
// - ```code``` → fenced code block, highlighted in the language being taught
// - `code` → inline code
// - [ZEN +10 XP] → styled XP badge
// - plain text → normal prose

interface Segment {
  type: "text" | "code" | "codeblock" | "zen";
  content: string;
}

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  // First split on fenced code blocks, then parse inline within text parts
  const fencedPattern = /```(?:\w*\n)?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = fencedPattern.exec(text)) !== null) {
    // Parse inline segments from text before the fenced block
    if (match.index > lastIndex) {
      segments.push(...parseInlineSegments(text.slice(lastIndex, match.index)));
    }
    segments.push({ type: "codeblock", content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  // Parse remaining text after last fenced block
  if (lastIndex < text.length) {
    segments.push(...parseInlineSegments(text.slice(lastIndex)));
  }

  return segments;
}

function parseInlineSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  // ``a `b` c`` spans (CommonMark) let inline code contain backticks — JS
  // template literals need them.
  const pattern = /``\s?(.+?)\s?``|`([^`]+)`|\[ZEN\s*\+(\d+)\s*XP\]/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }

    const code = match[1] ?? match[2];
    if (code !== undefined) {
      segments.push({ type: "code", content: code });
    } else if (match[3] !== undefined) {
      segments.push({ type: "zen", content: `+${match[3]} XP` });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightCode(code: string, tokenize: (src: string) => Token[]): string {
  try {
    const tokens: Token[] = tokenize(code);
    let result = "";
    let lastEnd = 0;

    for (const t of tokens) {
      // Fill gap (whitespace between tokens)
      if (t.start > lastEnd) {
        result += escapeHtml(code.slice(lastEnd, t.start));
      }
      const escaped = escapeHtml(t.value);
      const color = TOKEN_COLORS[t.type];
      result += color ? `<span style="color:${color}">${escaped}</span>` : escaped;
      lastEnd = t.end;
    }
    // Trailing whitespace
    if (lastEnd < code.length) {
      result += escapeHtml(code.slice(lastEnd));
    }
    return result;
  } catch {
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}

interface MayaMarkdownProps {
  text: string;
  color?: string;
}

export function MayaMarkdown({ text, color = "var(--color-signal)" }: MayaMarkdownProps) {
  const { tokenize } = useLanguageService();
  const segments = parseSegments(text);

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === "codeblock") {
          return (
            <pre
              key={i}
              className="my-1.5 px-3 py-2 text-[13px] leading-[1.6] overflow-x-auto"
              style={{
                background: "rgba(110,255,160,.06)",
                border: "1px solid rgba(110,255,160,.12)",
                fontFamily: "var(--font-mono)",
                color: "var(--color-text)",
              }}
              dangerouslySetInnerHTML={{ __html: highlightCode(seg.content, tokenize) }}
            />
          );
        }

        if (seg.type === "code") {
          return (
            <code
              key={i}
              className="text-[13px] px-1.5 py-0.5 mx-px"
              style={{
                background: "rgba(110,255,160,.08)",
                border: "1px solid rgba(110,255,160,.12)",
                color: "var(--color-signal)",
                fontFamily: "var(--font-mono)",
              }}
              dangerouslySetInnerHTML={{ __html: highlightCode(seg.content, tokenize) }}
            />
          );
        }

        if (seg.type === "zen") {
          return (
            <span
              key={i}
              className="inline-block text-[9px] tracking-[2px] px-1.5 py-px mx-0.5 font-[family-name:var(--font-display)] font-bold"
              style={{
                background: "rgba(110,255,160,.1)",
                border: "1px solid rgba(110,255,160,.2)",
                color: "var(--color-signal)",
              }}
            >
              ZEN {seg.content}
            </span>
          );
        }

        return (
          <Fragment key={i}>
            {seg.content}
          </Fragment>
        );
      })}
    </span>
  );
}
