"use client";

import { useState, useEffect } from "react";

const MIN_WIDTH = 768;

export function MobileGate({ children }: { children: React.ReactNode }) {
  const [tooSmall, setTooSmall] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    function check() {
      setTooSmall(window.innerWidth < MIN_WIDTH);
      setChecked(true);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Don't flash anything before the first check
  if (!checked) return null;

  if (tooSmall) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center px-6"
        style={{
          background: "var(--color-background)",
          backgroundImage:
            "radial-gradient(ellipse at 50% 110%, rgba(0,60,20,.15) 0%, transparent 65%)",
        }}
      >
        {/* Grid overlay */}
        <div
          className="fixed inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,255,80,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,80,.25) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="max-w-[340px] text-center">
          <div
            className="font-[family-name:var(--font-display)] font-black tracking-[6px] leading-none glow-pulse mb-6"
            style={{
              color: "var(--color-signal)",
              fontSize: "clamp(36px, 10vw, 52px)",
            }}
          >
            SIGNAL
          </div>

          <div
            className="text-[9px] tracking-[4px] mb-5"
            style={{ color: "var(--color-dim)" }}
          >
            ▸ DEVICE CHECK FAILED
          </div>

          <div
            className="border border-l-[3px] p-4 mb-5"
            style={{
              borderColor: "rgba(255,159,28,.2)",
              borderLeftColor: "var(--color-alert)",
              background: "rgba(255,159,28,.03)",
            }}
          >
            <div
              className="text-[8px] tracking-[3px] mb-2"
              style={{ color: "var(--color-alert)" }}
            >
              ▸ TERMINAL TOO NARROW
            </div>
            <p
              className="text-[12px] leading-[1.8]"
              style={{ color: "var(--color-foreground)" }}
            >
              signal requires a code editor and chat panel side by side.
              your screen is too narrow to run the terminal.
            </p>
          </div>

          <p
            className="text-[11px] leading-[1.8] mb-6"
            style={{ color: "var(--color-dim)" }}
          >
            switch to a tablet (landscape), laptop, or desktop to connect with maya.
          </p>

          <div
            className="flex items-center justify-center gap-4 text-[8px] tracking-[2px]"
            style={{ color: "rgba(110,255,160,.2)" }}
          >
            <span>TABLET</span>
            <span style={{ color: "rgba(110,255,160,.1)" }}>·</span>
            <span>LAPTOP</span>
            <span style={{ color: "rgba(110,255,160,.1)" }}>·</span>
            <span>DESKTOP</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
