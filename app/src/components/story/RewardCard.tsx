"use client";

import { useEffect, useState } from "react";
import type { Reward } from "@/lib/game/reward";
import { useAudio } from "@/hooks/useAudio";

interface RewardCardProps {
  reward: Reward;
  soundEnabled?: boolean;
  onDone: () => void;
}

const HOLD_MS = 2600;
const COUNT_MS = 900;

/**
 * The payoff moment. A full-screen, non-blocking card: green flash, the
 * title slams in, XP counts up, bonus badges pop in one by one, then it
 * clears itself so play continues. Sound: confirmation sting, and a
 * second cheer for a chapter clear.
 */
export function RewardCard({ reward, soundEnabled = true, onDone }: RewardCardProps) {
  const audio = useAudio(soundEnabled);
  const [shown, setShown] = useState(0);
  const total = reward.breakdown.total;

  // XP count-up.
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(total * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [total]);

  // Sound + auto-dismiss.
  useEffect(() => {
    audio.playSfx("handshake-confirm", 0.5);
    const cheer = setTimeout(() => audio.playSfx(reward.chapterClear ? "we-did-it" : "next-one", 0.45), 350);
    const done = setTimeout(onDone, HOLD_MS);
    return () => {
      clearTimeout(cheer);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per reward
  }, [reward]);

  const accent = reward.chapterClear ? "var(--color-win)" : "var(--color-signal)";

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center" aria-live="polite">
      {/* Edge flash */}
      <div
        className="absolute inset-0 reward-flash"
        style={{ background: `radial-gradient(ellipse at center, transparent 40%, color-mix(in srgb, ${accent} 28%, transparent) 100%)` }}
      />
      {/* Sweep line */}
      <div className="absolute inset-x-0 h-px reward-sweep" style={{ background: accent, boxShadow: `0 0 18px ${accent}` }} />

      <div className="relative flex flex-col items-center text-center px-6 reward-card">
        <div
          className="text-[10px] tracking-[0.5em] mb-2"
          style={{ color: "var(--color-foreground)", opacity: 0.85 }}
        >
          {reward.subtitle}
        </div>
        <div
          className="font-[family-name:var(--font-display)] font-black leading-none reward-title"
          style={{
            fontSize: "clamp(30px, 7vw, 72px)",
            letterSpacing: "0.22em",
            color: accent,
            textShadow: `0 0 18px ${accent}, 0 0 60px color-mix(in srgb, ${accent} 45%, transparent)`,
          }}
        >
          {reward.title}
        </div>
        <div
          className="font-[family-name:var(--font-display)] font-black mt-4 leading-none"
          style={{ fontSize: "clamp(34px, 7.5vw, 76px)", color: "var(--color-signal)", textShadow: "0 0 24px rgba(110,255,160,.6)" }}
        >
          +{shown} XP
        </div>
        {reward.badges.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {reward.badges.map((badge, i) => (
              <span
                key={badge}
                className="reward-badge px-3 py-1 text-[11px] tracking-[2px] font-[family-name:var(--font-display)]"
                style={{
                  animationDelay: `${450 + i * 180}ms`,
                  color: badge.startsWith("ZEN") ? "var(--color-info)" : badge.startsWith("SPEED") ? "var(--color-alert)" : "var(--color-win)",
                  border: `1px solid currentColor`,
                  background: "rgba(4,8,16,.75)",
                }}
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
