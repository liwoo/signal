"use client";

import { useEffect, useRef } from "react";
import type { BossMessage } from "@/hooks/useBossFight";

interface BossCommsProps {
  messages: BossMessage[];
  onNewMessage?: () => void;
}

export function BossComms({ messages, onNewMessage }: BossCommsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;

    // Fire callback when a new message arrives
    if (messages.length > prevCountRef.current) {
      onNewMessage?.();
    }
    prevCountRef.current = messages.length;
  }, [messages.length, onNewMessage]);

  if (messages.length === 0) return null;

  const visible = messages.slice(-8);
  const fadeStart = Math.max(0, visible.length - 3);

  return (
    <div
      ref={scrollRef}
      className="px-3 py-2.5 overflow-y-auto"
      style={{
        maxHeight: 180,
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
            className="flex gap-2.5 py-1 msg-enter"
            style={{ opacity }}
          >
            <span
              className="text-[9px] tracking-[2px] shrink-0 mt-0.5 font-[family-name:var(--font-display)]"
              style={{ color: isSys ? "#ff6e6e" : "var(--color-signal)" }}
            >
              {isSys ? "SYS" : "MAYA"}
            </span>
            <span
              className="text-[13px] leading-[1.5]"
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
