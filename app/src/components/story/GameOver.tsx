"use client";

import { useState, useEffect } from "react";

interface GameOverProps {
  onRetry: () => void;
  onBuyHeart: () => void;
  hearts: number;
  canBuyHeart: boolean;
  heartCostXP: number;
}

const MAYA_LAST_WORDS = [
  "...",
  "they found me.",
  "i can hear them at the door.",
  "i'm sorry. i thought we had more time.",
  "don't forget what i told you.",
];

export function GameOver({ onRetry, onBuyHeart, hearts, canBuyHeart: canBuy, heartCostXP }: GameOverProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    if (lineIndex < MAYA_LAST_WORDS.length) {
      const delay = lineIndex === 0 ? 1500 : 2000;
      const timer = setTimeout(() => setLineIndex((i) => i + 1), delay);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShowRetry(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [lineIndex]);

  return (
    <div
      className="fixed inset-0 z-[900] flex flex-col items-center justify-center"
      style={{ background: "#020406" }}
    >
      {/* Maya's last words */}
      <div className="max-w-[400px] w-full px-6">
        {MAYA_LAST_WORDS.slice(0, lineIndex).map((line, i) => (
          <div
            key={i}
            className="text-[11px] leading-[2] opacity-0"
            style={{
              color:
                i === MAYA_LAST_WORDS.length - 1
                  ? "var(--color-signal)"
                  : "#2a4a3a",
              animation: "msg-in 600ms ease forwards",
            }}
          >
            {line}
          </div>
        ))}
      </div>

      {/* CAPTURED label */}
      {lineIndex >= MAYA_LAST_WORDS.length && (
        <div
          className="mt-10 opacity-0"
          style={{ animation: "intro-in .8s ease .3s forwards" }}
        >
          <div
            className="font-[family-name:var(--font-display)] font-black tracking-[8px] text-center"
            style={{
              fontSize: "clamp(24px, 6vw, 40px)",
              color: "var(--color-danger)",
              textShadow: "0 0 20px rgba(255,64,64,.3)",
            }}
          >
            CAPTURED
          </div>
          <div className="text-[8px] tracking-[4px] text-center mt-2" style={{ color: "#4a2020" }}>
            SIGNAL LOST
          </div>
        </div>
      )}

      {/* Retry section */}
      {showRetry && (
        <div
          className="mt-8 opacity-0 flex flex-col items-center"
          style={{ animation: "intro-in .5s ease forwards" }}
        >
          {/* Hearts display */}
          <div className="flex items-center gap-1.5 mb-4">
            <span className="text-[8px] tracking-[2px]" style={{ color: "#4a2020" }}>
              LIVES
            </span>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="text-[14px]"
                  style={{
                    color: i < hearts ? "var(--color-danger)" : "#1a0a0a",
                    textShadow: i < hearts ? "0 0 6px rgba(255,64,64,.4)" : "none",
                  }}
                >
                  ♥
                </span>
              ))}
            </div>
          </div>

          {hearts > 0 ? (
            <>
              <button
                onClick={onRetry}
                className="py-2.5 px-8 bg-transparent border cursor-pointer
                           text-[9px] tracking-[4px] transition-colors
                           hover:bg-[rgba(255,64,64,.15)] hover:border-[var(--color-danger)]"
                style={{
                  borderColor: "#4a1a1a",
                  color: "var(--color-danger)",
                }}
              >
                RETRY FROM CHECKPOINT
              </button>
              <div className="text-center mt-2 text-[7px] tracking-[2px]" style={{ color: "#3a1a1a" }}>
                -1 HEART · SPEED BONUS UNAVAILABLE · ENERGY 30%
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] tracking-[2px] mb-3" style={{ color: "#6a2020" }}>
                NO LIVES REMAINING
              </div>
              {canBuy ? (
                <button
                  onClick={onBuyHeart}
                  className="py-2.5 px-8 bg-transparent border cursor-pointer
                             text-[9px] tracking-[4px] transition-colors
                             hover:bg-[rgba(255,159,28,.1)] hover:border-[var(--color-alert)]"
                  style={{
                    borderColor: "#3a2a0a",
                    color: "var(--color-alert)",
                  }}
                >
                  BUY HEART · {heartCostXP} XP
                </button>
              ) : (
                <div className="text-[8px] tracking-[2px]" style={{ color: "#3a1a1a" }}>
                  NOT ENOUGH XP · {heartCostXP} XP NEEDED
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
