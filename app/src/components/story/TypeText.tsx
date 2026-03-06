"use client";

import { useState, useEffect, useRef } from "react";

interface TypeTextProps {
  text: string;
  speed?: number;
  className?: string;
  onDone?: () => void;
  onStart?: () => void;
}

export function TypeText({ text, speed = 22, className, onDone, onStart }: TypeTextProps) {
  const [shown, setShown] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    let i = 0;
    setShown("");
    startedRef.current = false;

    const iv = setInterval(() => {
      if (!startedRef.current) {
        startedRef.current = true;
        onStart?.();
      }
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(iv);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, onDone, onStart]);

  return (
    <span className={`whitespace-pre-wrap ${className ?? ""}`}>
      {shown}
      <span
        className="cursor-blink"
        style={{ opacity: shown.length < text.length ? 1 : 0 }}
      >
        ▋
      </span>
    </span>
  );
}
