"use client";

import { Fragment } from "react";

// Parses Maya's messages into styled segments:
// - `code` → inline code
// - [ZEN +10 XP] → styled XP badge
// - plain text → normal prose

interface Segment {
  type: "text" | "code" | "zen";
  content: string;
}

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  // Match inline code `...` or zen tags [ZEN +N XP]
  const pattern = /`([^`]+)`|\[ZEN\s*\+(\d+)\s*XP\]/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Push preceding text
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      // Inline code
      segments.push({ type: "code", content: match[1] });
    } else if (match[2] !== undefined) {
      // Zen XP tag
      segments.push({ type: "zen", content: `+${match[2]} XP` });
    }

    lastIndex = match.index + match[0].length;
  }

  // Trailing text
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

interface MayaMarkdownProps {
  text: string;
  color?: string;
}

export function MayaMarkdown({ text, color = "var(--color-signal)" }: MayaMarkdownProps) {
  const segments = parseSegments(text);

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === "code") {
          return (
            <code
              key={i}
              className="text-[10.5px] px-1 py-px mx-px"
              style={{
                background: "rgba(110,255,160,.08)",
                border: "1px solid rgba(110,255,160,.12)",
                color: "var(--color-signal)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {seg.content}
            </code>
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
