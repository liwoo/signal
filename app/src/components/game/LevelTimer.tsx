"use client";

import { useState, useEffect, useRef } from "react";
import { useAudio } from "@/hooks/useAudio";

/** Urgency tier of the level clock, driven purely by seconds remaining. */
export type TimerUrgency = "none" | "warn" | "crit";

/** The final countdown: a tick lands on each of these last seconds. */
const TICK_FROM_SECONDS = 10;

interface LevelTimerProps {
  startTimeMs: number;
  timeLimitSeconds: number;
  bonusSeconds: number;
  gameOverOnExpiry: boolean;
  onExpire: () => void;
  stopped: boolean;
  compact?: boolean;
  /**
   * Fires when the urgency tier changes (none → warn → crit and back). The page
   * uses this to shake the screen while the clock is critical. Called with the
   * new tier; also fired with "none" on unmount/stop so the shake can't stick.
   */
  onUrgencyChange?: (urgency: TimerUrgency) => void;
  /** Gates the final-seconds countdown tick (reuses the global sound setting). */
  soundEnabled?: boolean;
}

function pad(n: number): string {
  return String(Math.floor(n)).padStart(2, "0");
}

function urgencyOf(remaining: number): TimerUrgency {
  if (remaining <= 15) return "crit";
  if (remaining <= 30) return "warn";
  return "none";
}

/** Short haptic pulse, guarded for browsers / reduced-motion preference. */
function buzz(pattern: number | number[]) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  try {
    navigator.vibrate(pattern);
  } catch {
    /* some browsers throw if not triggered from a gesture — ignore */
  }
}

export function LevelTimer({
  startTimeMs,
  timeLimitSeconds,
  bonusSeconds,
  onExpire,
  stopped,
  compact = false,
  onUrgencyChange,
  soundEnabled = true,
}: LevelTimerProps) {
  const [remaining, setRemaining] = useState(timeLimitSeconds + bonusSeconds);
  const expiredRef = useRef(false);
  const urgencyRef = useRef<TimerUrgency>("none");
  const lastWholeSecRef = useRef(Math.ceil(timeLimitSeconds + bonusSeconds));
  const onUrgencyChangeRef = useRef(onUrgencyChange);
  useEffect(() => {
    onUrgencyChangeRef.current = onUrgencyChange;
  }, [onUrgencyChange]);

  // The countdown tick rides the same per-second beat as the haptic buzz below.
  // Held in a ref so the ticking interval never re-subscribes on audio identity.
  const audio = useAudio(soundEnabled);
  const playTickRef = useRef(audio.playSfx);
  useEffect(() => {
    playTickRef.current = audio.playSfx;
  }, [audio.playSfx]);

  // Reset expired guard when bonus time is added (e.g. rush cleared while timer was at 0)
  useEffect(() => {
    if (expiredRef.current) {
      const elapsed = (Date.now() - startTimeMs) / 1000;
      const left = timeLimitSeconds + bonusSeconds - elapsed;
      if (left > 0) {
        expiredRef.current = false;
      }
    }
  }, [bonusSeconds, startTimeMs, timeLimitSeconds]);

  useEffect(() => {
    if (stopped) {
      // Drop any lingering urgency so the screen never keeps shaking once the
      // clock is paused / the step is handed off.
      if (urgencyRef.current !== "none") {
        urgencyRef.current = "none";
        onUrgencyChangeRef.current?.("none");
      }
      return;
    }

    const step = () => {
      const elapsed = (Date.now() - startTimeMs) / 1000;
      const left = Math.max(0, timeLimitSeconds + bonusSeconds - elapsed);
      setRemaining(left);

      // Urgency transitions: notify the page (screen shake) + haptic buzz.
      const tier = urgencyOf(left);
      if (tier !== urgencyRef.current) {
        const prev = urgencyRef.current;
        urgencyRef.current = tier;
        onUrgencyChangeRef.current?.(tier);
        if (tier === "warn" && prev === "none") buzz(60);
        if (tier === "crit") buzz([40, 50, 40]);
      }

      // Each whole second as the clock counts down: a haptic buzz while
      // critical, and — for the final ten seconds — an audible countdown tick
      // that quickens in volume over the last five. Together with the red blink
      // and screen shake this makes "running out" impossible to miss even when
      // the player's eyes are on the editor.
      const whole = Math.ceil(left);
      if (whole !== lastWholeSecRef.current) {
        if (whole < lastWholeSecRef.current && whole > 0) {
          if (tier === "crit") buzz(30);
          if (whole <= TICK_FROM_SECONDS) {
            playTickRef.current?.("countdown-tick", whole <= 5 ? 0.6 : 0.4);
          }
        }
        lastWholeSecRef.current = whole;
      }

      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        if (urgencyRef.current !== "none") {
          urgencyRef.current = "none";
          onUrgencyChangeRef.current?.("none");
        }
        clearInterval(iv);
        onExpire();
      }
    };

    const iv = setInterval(step, 250);
    step();

    return () => clearInterval(iv);
  }, [startTimeMs, timeLimitSeconds, bonusSeconds, stopped, onExpire]);

  // Make sure the shake is released if the timer unmounts mid-crit.
  useEffect(() => {
    return () => {
      if (urgencyRef.current !== "none") onUrgencyChangeRef.current?.("none");
    };
  }, []);

  const pct = remaining / (timeLimitSeconds + bonusSeconds);
  const crit = remaining <= 15;
  const warn = remaining <= 30;

  const color = crit
    ? "var(--color-danger)"
    : warn
      ? "var(--color-alert)"
      : "var(--color-signal)";

  const glow = crit
    ? "0 0 14px rgba(255,64,64,.85), 0 0 34px rgba(255,64,64,.4)"
    : warn
      ? "0 0 12px rgba(255,159,28,.6), 0 0 26px rgba(255,159,28,.25)"
      : "0 0 10px rgba(var(--signal-rgb),.5), 0 0 22px rgba(var(--signal-rgb),.2)";

  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);

  return (
    <div className="flex items-center gap-2">
      {/* Label — a clock the player can't miss. Turns into the live status. */}
      <span
        className={`font-[family-name:var(--font-display)] tracking-[2px] ${compact ? "text-[8px]" : "text-[9px]"}`}
        style={{
          color: crit ? "var(--color-danger)" : warn ? "var(--color-alert)" : "var(--color-dim)",
          animation: crit ? "blink .5s step-end infinite" : "none",
        }}
      >
        {crit ? "⏱ HURRY" : "⏱ TIME"}
      </span>
      <span
        className={`font-[family-name:var(--font-display)] font-black tabular-nums text-right ${compact ? "min-w-[46px] text-[16px]" : "min-w-[58px] text-[22px]"}`}
        style={{
          color,
          textShadow: glow,
          animation: crit ? "blink .5s step-end infinite" : "none",
          lineHeight: 1,
        }}
      >
        {pad(mins)}:{pad(secs)}
      </span>
      {/* Bar */}
      {!compact ? (
        <div
          className="w-20 h-[6px] relative overflow-hidden"
          style={{ background: "rgba(255,255,255,.06)" }}
        >
          <div
            className="absolute inset-y-0 left-0 transition-[width] duration-250 ease-linear"
            style={{
              width: `${pct * 100}%`,
              background: color,
              boxShadow: glow,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
