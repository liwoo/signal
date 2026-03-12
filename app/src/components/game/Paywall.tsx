"use client";

import { useState } from "react";

interface PaywallProps {
  playerXP: number;
  playerLevel: number;
}

const PRICE_SINGLE = process.env.NEXT_PUBLIC_PRICE_SINGLE || "19.99";
const PRICE_TEAM = process.env.NEXT_PUBLIC_PRICE_TEAM || "149.99";
const TEAM_SEATS = process.env.NEXT_PUBLIC_TEAM_SEATS || "10";

export function Paywall({ playerXP, playerLevel }: PaywallProps) {
  const [selected, setSelected] = useState<"single" | "team">("single");
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-[950] flex items-center justify-center"
      style={{ background: "rgba(2,4,6,.96)" }}
    >
      {/* Scan lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(110,255,160,.015) 2px, rgba(110,255,160,.015) 4px)",
        }}
      />

      <div className="relative w-full max-w-[520px] px-4">
        {/* Signal wire accent */}
        <div
          className="absolute left-0 right-0 h-px"
          style={{
            top: "-24px",
            background: "linear-gradient(90deg, transparent, var(--color-signal), transparent)",
            opacity: 0.3,
          }}
        />

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="text-[8px] tracking-[4px] mb-3"
            style={{ color: "var(--color-dim)" }}
          >
            ▸ ACT I COMPLETE
          </div>
          <div
            className="font-[family-name:var(--font-display)] font-black tracking-[4px] mb-2"
            style={{
              fontSize: "clamp(20px, 4vw, 28px)",
              color: "var(--color-signal)",
              textShadow: "0 0 30px rgba(110,255,160,.15)",
            }}
          >
            SIGNAL
          </div>
          <div
            className="text-[10px] leading-[1.8] mb-1"
            style={{ color: "var(--color-foreground)" }}
          >
            maya&apos;s out of sublevel 3. but the facility has 12 more floors.
          </div>
          <div
            className="text-[9px]"
            style={{ color: "var(--color-dim)" }}
          >
            acts II–IV · 40+ chapters · 8 boss fights · full Go curriculum
          </div>
        </div>

        {/* Pricing cards */}
        <div className="flex gap-3 mb-6">
          {/* Single seat */}
          <button
            onClick={() => setSelected("single")}
            onMouseEnter={() => setHovered("single")}
            onMouseLeave={() => setHovered(null)}
            className="flex-1 bg-transparent p-4 text-left cursor-pointer transition-all"
            style={{
              border: selected === "single"
                ? "1px solid var(--color-signal)"
                : "1px solid var(--color-border)",
              background: selected === "single"
                ? "rgba(110,255,160,.03)"
                : "rgba(4,8,16,.6)",
            }}
          >
            <div
              className="text-[7px] tracking-[2px] mb-2"
              style={{ color: "var(--color-dim)" }}
            >
              INDIVIDUAL
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span
                className="font-[family-name:var(--font-display)] font-black text-[24px]"
                style={{ color: selected === "single" ? "var(--color-signal)" : "var(--color-foreground)" }}
              >
                ${PRICE_SINGLE}
              </span>
              <span
                className="text-[8px]"
                style={{ color: "var(--color-dim)" }}
              >
                / seat
              </span>
            </div>
            <div
              className="text-[8px] leading-[1.6]"
              style={{ color: "var(--color-dim)" }}
            >
              lifetime access · all acts · all bosses
            </div>
          </button>

          {/* Team */}
          <button
            onClick={() => setSelected("team")}
            onMouseEnter={() => setHovered("team")}
            onMouseLeave={() => setHovered(null)}
            className="flex-1 bg-transparent p-4 text-left cursor-pointer transition-all relative"
            style={{
              border: selected === "team"
                ? "1px solid var(--color-signal)"
                : "1px solid var(--color-border)",
              background: selected === "team"
                ? "rgba(110,255,160,.03)"
                : "rgba(4,8,16,.6)",
            }}
          >
            {/* Best value badge */}
            <div
              className="absolute top-0 right-0 px-2 py-0.5 text-[6px] tracking-[1px] font-[family-name:var(--font-display)]"
              style={{
                background: "var(--color-signal)",
                color: "var(--color-background)",
              }}
            >
              BEST VALUE
            </div>
            <div
              className="text-[7px] tracking-[2px] mb-2"
              style={{ color: "var(--color-dim)" }}
            >
              TEAM · {TEAM_SEATS} SEATS
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span
                className="font-[family-name:var(--font-display)] font-black text-[24px]"
                style={{ color: selected === "team" ? "var(--color-signal)" : "var(--color-foreground)" }}
              >
                ${PRICE_TEAM}
              </span>
            </div>
            <div
              className="text-[8px] mb-1"
              style={{ color: "var(--color-signal)", opacity: 0.7 }}
            >
              ${(parseFloat(PRICE_TEAM) / parseInt(TEAM_SEATS)).toFixed(2)}/seat
            </div>
            <div
              className="text-[8px] leading-[1.6]"
              style={{ color: "var(--color-dim)" }}
            >
              team dashboard · progress tracking
            </div>
          </button>
        </div>

        {/* CTA */}
        <button
          className="w-full bg-transparent py-3 cursor-pointer font-[family-name:var(--font-display)] text-[11px] tracking-[3px] transition-all"
          style={{
            border: "2px solid var(--color-signal)",
            color: hovered === "buy" ? "var(--color-background)" : "var(--color-signal)",
            background: hovered === "buy" ? "var(--color-signal)" : "transparent",
            textShadow: hovered === "buy" ? "none" : "0 0 12px rgba(110,255,160,.2)",
          }}
          onMouseEnter={() => setHovered("buy")}
          onMouseLeave={() => setHovered(null)}
        >
          {selected === "team"
            ? `GET ${TEAM_SEATS} SEATS — $${PRICE_TEAM}`
            : `UNLOCK FULL GAME — $${PRICE_SINGLE}`}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
          <span className="text-[7px] tracking-[2px]" style={{ color: "var(--color-dim)" }}>
            OR
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
        </div>

        {/* Continue with Google */}
        <button
          className="w-full bg-transparent py-2.5 cursor-pointer text-[10px] tracking-[1px] transition-all flex items-center justify-center gap-2"
          style={{
            border: "1px solid var(--color-border)",
            color: hovered === "google" ? "var(--color-foreground)" : "var(--color-dim)",
            background: hovered === "google" ? "rgba(110,255,160,.02)" : "transparent",
          }}
          onMouseEnter={() => setHovered("google")}
          onMouseLeave={() => setHovered(null)}
        >
          <GoogleIcon />
          <span>Continue with Google</span>
        </button>

        {/* Player stats footer */}
        <div className="flex justify-center gap-4 mt-6">
          <div className="text-center">
            <div className="text-[6px] tracking-[2px]" style={{ color: "var(--color-dim)" }}>
              YOUR XP
            </div>
            <div
              className="font-[family-name:var(--font-display)] text-[14px] font-bold"
              style={{ color: "var(--color-signal)" }}
            >
              {playerXP.toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[6px] tracking-[2px]" style={{ color: "var(--color-dim)" }}>
              LEVEL
            </div>
            <div
              className="font-[family-name:var(--font-display)] text-[14px] font-bold"
              style={{ color: "var(--color-signal)" }}
            >
              {playerLevel}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[6px] tracking-[2px]" style={{ color: "var(--color-dim)" }}>
              CHAPTERS
            </div>
            <div
              className="font-[family-name:var(--font-display)] text-[14px] font-bold"
              style={{ color: "var(--color-signal)" }}
            >
              4/44
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
