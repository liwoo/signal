"use client";

import { useEffect, useRef } from "react";
import type { BossMessage } from "@/hooks/useBossFight";

interface BossCommsProps {
  messages: BossMessage[];
}

export function BossComms({ messages }: BossCommsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  if (messages.length === 0) return null;

  const visible = messages.slice(-8);
  const fadeStart = Math.max(0, visible.length - 3);

  return (
    <div
      ref={scrollRef}
      className="px-3 py-2 overflow-y-auto"
      style={{
        maxHeight: 120,
        background: "rgba(8,4,8,0.82)",
        borderRight: "1px solid rgba(32,16,16,0.5)",
        backdropFilter: "blur(4px)",
      }}
    >
      {visible.map((msg, i) => {
        const opacity = i < fadeStart ? 0.25 + (i / fadeStart) * 0.35 : 1;
        const isSys = msg.from === "SYS";

        return (
          <div
            key={msg.id}
            className="flex gap-2 py-0.5 msg-enter"
            style={{ opacity }}
          >
            <span
              className="text-[6px] tracking-[2px] shrink-0 mt-0.5"
              style={{ color: isSys ? "#ff6e6e" : "var(--color-signal)" }}
            >
              {isSys ? "SYS" : "MAYA"}
            </span>
            <span
              className="text-[9px] leading-[1.5]"
              style={{ color: isSys ? "#ff6e6e" : "var(--color-foreground)" }}
            >
              {msg.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}
