/**
 * The first thing /play shows — server-rendered, so it's on screen with the
 * HTML, before any game JavaScript arrives. Playtest (2 Nov 2026): the game
 * opened on 3–4s of near-black ("AUTHENTICATING..." in 9px dim type) while the
 * bundle, the session check and the save loaded. This is the title, the stake
 * in one line, and honest progress through the boot steps instead.
 *
 * Pure markup + CSS: no state, no effects, safe to render anywhere (including
 * as a `next/dynamic` loading fallback).
 */

export const BOOT_STEPS = ["SECURE CHANNEL", "SAVE DATA", "CAMERA FEED"] as const;

interface BootScreenProps {
  /** Index into BOOT_STEPS of the step in progress (earlier steps show as done). */
  step: number;
  /** What's happening right now, e.g. "ESTABLISHING SECURE CHANNEL". */
  label: string;
}

export function BootScreen({ step, label }: BootScreenProps) {
  // Honest-ish fill: each finished step is a third, the running one is half done.
  const pct = Math.round(((step + 0.5) / BOOT_STEPS.length) * 100);
  return (
    <div
      className="relative flex h-dvh items-center justify-center overflow-hidden px-6"
      style={{
        background: "var(--color-background)",
        backgroundImage:
          "radial-gradient(ellipse at 50% 60%, color-mix(in srgb, var(--color-signal) 9%, transparent) 0%, transparent 62%)",
      }}
      role="status"
      aria-live="polite"
      aria-label={`Loading SIGNAL — ${label.toLowerCase()}`}
    >
      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--color-signal) 25%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-signal) 25%, transparent) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      {/* Scanline */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute h-0.5 w-full"
          style={{
            background: "linear-gradient(transparent, color-mix(in srgb, var(--color-signal) 14%, transparent), transparent)",
            animation: "scanline 5s linear infinite",
          }}
        />
      </div>

      <div className="relative w-full max-w-[440px] text-center">
        <div className="mb-3 text-[9px] tracking-[6px]" style={{ color: "var(--color-dim)" }}>
          ▸ SIGNAL INTERCEPTED · SUBLEVEL 3
        </div>
        <div
          className="glow-pulse font-[family-name:var(--font-display)] font-black leading-none tracking-[6px]"
          style={{ fontSize: "clamp(40px, 11vw, 76px)", color: "var(--color-signal)" }}
        >
          SIGNAL
        </div>
        <p className="mx-auto mt-4 max-w-[340px] text-[11px] leading-[1.7]" style={{ color: "var(--color-foreground)" }}>
          maya chen has been missing for 72 hours. her terminal just woke up.
        </p>

        {/* Progress */}
        <div className="mt-8">
          <div
            className="relative h-1.5 w-full overflow-hidden border"
            style={{ borderColor: "color-mix(in srgb, var(--color-signal) 35%, transparent)" }}
          >
            <div
              className="h-full transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%`, background: "var(--color-signal)" }}
            />
            <div
              className="boot-sweep absolute inset-y-0 w-1/4"
              aria-hidden="true"
              style={{ background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-signal) 55%, transparent), transparent)" }}
            />
          </div>
          <div className="mt-2 flex items-baseline justify-between text-[9px] tracking-[3px]">
            <span style={{ color: "var(--color-signal)" }}>
              {label}
              <span className="cursor-blink">_</span>
            </span>
            <span style={{ color: "var(--color-dim)" }}>{pct}%</span>
          </div>
          <ol className="mt-4 flex justify-center gap-4 text-[8px] tracking-[2px]">
            {BOOT_STEPS.map((name, i) => (
              <li
                key={name}
                style={{
                  color: i < step ? "var(--color-signal)" : i === step ? "var(--color-foreground)" : "color-mix(in srgb, var(--color-dim) 60%, transparent)",
                }}
              >
                {i < step ? "◆" : i === step ? "◈" : "◇"} {name}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
