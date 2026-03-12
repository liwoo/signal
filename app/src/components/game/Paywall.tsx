"use client";

import { useState } from "react";
import { PromoLoop } from "@/components/promo/PromoLoop";

interface PaywallProps {
  playerXP?: number;
  playerLevel?: number;
}

const PRICE_SINGLE = process.env.NEXT_PUBLIC_PRICE_SINGLE || "19.99";
const PRICE_TEAM = process.env.NEXT_PUBLIC_PRICE_TEAM || "149.99";
const TEAM_SEATS = process.env.NEXT_PUBLIC_TEAM_SEATS || "10";

// ── Curriculum data ──

type Difficulty = "beginner" | "intermediate" | "advanced";

interface Chapter {
  name: string;
  description: string;
  concepts: string[];
  boss?: boolean;
}

interface Act {
  act: string;
  title: string;
  difficulty: Difficulty;
  status: "complete" | "locked";
  chapters: Chapter[];
}

const DIFFICULTY_STYLES: Record<Difficulty, { color: string; bg: string; label: string }> = {
  beginner:     { color: "var(--color-signal)", bg: "rgba(110,255,160,.1)",  label: "BEGINNER" },
  intermediate: { color: "var(--color-info)",   bg: "rgba(0,212,255,.1)",    label: "INTERMEDIATE" },
  advanced:     { color: "var(--color-alert)",  bg: "rgba(255,159,28,.1)",   label: "ADVANCED" },
};

const CURRICULUM: Act[] = [
  {
    act: "I",
    title: "THE ESCAPE",
    difficulty: "beginner",
    status: "complete",
    chapters: [
      {
        name: "HANDSHAKE",
        description: "establish a terminal connection using your first Go program",
        concepts: ["package main", "import", "fmt.Println", "string literals"],
      },
      {
        name: "DOOR CODE",
        description: "crack a keypad sequence by classifying numbers 1–10",
        concepts: ["for loops", "if/else", "switch", "modulo operator"],
      },
      {
        name: "SHAFT CODES",
        description: "compute junction codes with functions that return multiple values",
        concepts: ["functions", "multiple returns", "slices", "variadic params"],
      },
      {
        name: "LOCKMASTER",
        description: "debug corrupted weapon code across multiple files under fire",
        concepts: ["const groups", "packages", "debugging", "strings.Join"],
        boss: true,
      },
    ],
  },
  {
    act: "II",
    title: "THE FACILITY",
    difficulty: "beginner",
    status: "locked",
    chapters: [
      {
        name: "STRUCTS",
        description: "model security clearance badges as structured data",
        concepts: ["struct types", "field access", "methods", "value receivers"],
      },
      {
        name: "POINTERS",
        description: "modify guard patrol routes through shared memory references",
        concepts: ["& and *", "pointer receivers", "nil safety", "mutation"],
      },
      {
        name: "INTERFACES",
        description: "build a polymorphic access control system for different door types",
        concepts: ["interface types", "implicit implementation", "type assertions", "empty interface"],
      },
      {
        name: "ERROR HANDLING",
        description: "handle cascading system failures without crashing",
        concepts: ["error type", "fmt.Errorf", "error wrapping", "sentinel errors"],
      },
      {
        name: "MAPS",
        description: "decode a facility directory mapping room codes to locations",
        concepts: ["map[K]V", "make()", "comma-ok pattern", "range over maps"],
      },
      {
        name: "FILE I/O",
        description: "extract guard rotation schedules from encrypted log files",
        concepts: ["os.Open", "bufio.Scanner", "defer", "os.ReadFile"],
      },
      {
        name: "GATEKEEPER",
        description: "combine structs, interfaces, and error handling to breach the gate",
        concepts: ["all Act II concepts", "multi-file coordination"],
        boss: true,
      },
    ],
  },
  {
    act: "III",
    title: "THE NETWORK",
    difficulty: "intermediate",
    status: "locked",
    chapters: [
      {
        name: "GOROUTINES",
        description: "run concurrent surveillance sweeps across facility cameras",
        concepts: ["go keyword", "sync.WaitGroup", "race conditions", "concurrent patterns"],
      },
      {
        name: "CHANNELS",
        description: "coordinate a multi-agent extraction through message passing",
        concepts: ["chan T", "send/receive", "buffered channels", "select"],
      },
      {
        name: "HTTP CLIENT",
        description: "tap into the facility's internal API to pull floor plans",
        concepts: ["net/http", "GET/POST requests", "JSON decoding", "timeouts"],
      },
      {
        name: "HTTP SERVER",
        description: "hijack a guard comm relay and serve fake status reports",
        concepts: ["http.HandleFunc", "request handlers", "middleware", "routing"],
      },
      {
        name: "JSON",
        description: "parse and forge security credentials in structured data",
        concepts: ["encoding/json", "struct tags", "Marshal/Unmarshal", "streaming decode"],
      },
      {
        name: "TESTING",
        description: "verify exploit payloads won't crash before deploying them",
        concepts: ["testing.T", "table-driven tests", "test helpers", "benchmarks"],
      },
      {
        name: "ARCHITECT",
        description: "orchestrate a full network takeover using goroutines and HTTP",
        concepts: ["concurrency + networking", "system design under pressure"],
        boss: true,
      },
    ],
  },
  {
    act: "IV",
    title: "THE SIGNAL",
    difficulty: "advanced",
    status: "locked",
    chapters: [
      {
        name: "GENERICS",
        description: "build type-safe utilities that work across any data type",
        concepts: ["type parameters", "constraints", "type sets", "generic functions"],
      },
      {
        name: "CONTEXT",
        description: "manage cascading timeouts across distributed facility systems",
        concepts: ["context.Context", "cancellation", "timeouts", "context.WithValue"],
      },
      {
        name: "DATABASE",
        description: "query and modify the facility's central database to erase records",
        concepts: ["database/sql", "parameterized queries", "transactions", "migrations"],
      },
      {
        name: "CLI TOOLS",
        description: "build command-line tools to automate the final extraction",
        concepts: ["os.Args", "flag package", "cobra patterns", "stdin/stdout pipes"],
      },
      {
        name: "REFLECTION",
        description: "dynamically inspect and modify unknown facility protocol types",
        concepts: ["reflect package", "type inspection", "dynamic dispatch", "struct tags"],
      },
      {
        name: "MODULES",
        description: "structure the full escape toolkit as a production Go project",
        concepts: ["go.mod", "semantic versioning", "dependencies", "workspaces"],
      },
      {
        name: "FINAL SIGNAL",
        description: "broadcast the signal — everything you've learned in one final mission",
        concepts: ["the full language", "production architecture", "real-world Go"],
        boss: true,
      },
    ],
  },
];

export function Paywall({ playerXP, playerLevel }: PaywallProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [showCurriculum, setShowCurriculum] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"single" | "team">("single");

  if (showCurriculum) {
    return (
      <div
        className="fixed inset-0 z-[950] overflow-y-auto"
        style={{ background: "rgba(2,4,6,.98)" }}
      >
        {/* Scan lines */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(110,255,160,.015) 2px, rgba(110,255,160,.015) 4px)",
          }}
        />

        <div className="relative max-w-[640px] mx-auto px-4 py-10">
          {/* Back button */}
          <button
            onClick={() => setShowCurriculum(false)}
            className="bg-transparent cursor-pointer text-[10px] tracking-[2px] mb-8 transition-colors"
            style={{
              color: hovered === "back" ? "var(--color-signal)" : "var(--color-foreground)",
              opacity: hovered === "back" ? 1 : 0.5,
              border: "none",
            }}
            onMouseEnter={() => setHovered("back")}
            onMouseLeave={() => setHovered(null)}
          >
            ◂ BACK
          </button>

          <div className="text-center mb-10">
            <div
              className="font-[family-name:var(--font-display)] font-black tracking-[4px] mb-3"
              style={{ fontSize: "24px", color: "var(--color-signal)" }}
            >
              FULL CURRICULUM
            </div>
            <div
              className="text-[12px] mb-2"
              style={{ color: "var(--color-foreground)", opacity: 0.7 }}
            >
              4 acts · 24 chapters · 4 boss fights
            </div>
            <div
              className="text-[11px]"
              style={{ color: "var(--color-foreground)", opacity: 0.6 }}
            >
              from &quot;hello world&quot; to production Go
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-10">
            <div className="flex justify-between mb-2">
              <span className="text-[9px] tracking-[1px]" style={{ color: "var(--color-signal)" }}>
                YOUR PROGRESS
              </span>
              <span className="text-[9px] tracking-[1px]" style={{ color: "var(--color-foreground)", opacity: 0.7 }}>
                4 / 24 CHAPTERS
              </span>
            </div>
            <div className="w-full h-[3px]" style={{ background: "rgba(110,255,160,.08)" }}>
              <div
                className="h-full"
                style={{
                  width: `${(4 / 24) * 100}%`,
                  background: "var(--color-signal)",
                  boxShadow: "0 0 8px rgba(110,255,160,.3)",
                }}
              />
            </div>
          </div>

          {CURRICULUM.map((act) => {
            const diff = DIFFICULTY_STYLES[act.difficulty];
            return (
              <div key={act.act} className="mb-10">
                {/* Act header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="font-[family-name:var(--font-display)] text-[12px] tracking-[3px] font-bold"
                    style={{
                      color: act.status === "complete" ? "var(--color-signal)" : "var(--color-foreground)",
                      opacity: act.status === "complete" ? 1 : 0.9,
                    }}
                  >
                    ACT {act.act} — {act.title}
                  </div>
                  <span
                    className="text-[7px] tracking-[1px] px-2 py-0.5 font-[family-name:var(--font-display)]"
                    style={{ background: diff.bg, color: diff.color }}
                  >
                    {diff.label}
                  </span>
                  {act.status === "complete" && (
                    <span
                      className="text-[7px] tracking-[1px] px-2 py-0.5"
                      style={{ background: "rgba(110,255,160,.15)", color: "var(--color-signal)" }}
                    >
                      CLEARED
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {act.chapters.map((ch) => (
                    <div
                      key={ch.name}
                      className="px-4 py-3"
                      style={{
                        border: "1px solid",
                        borderColor: act.status === "complete"
                          ? "rgba(110,255,160,.12)"
                          : "rgba(255,255,255,.05)",
                        background: act.status === "complete"
                          ? "rgba(110,255,160,.03)"
                          : "rgba(4,8,16,.4)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {ch.boss ? (
                          <span
                            className="text-[7px] tracking-[1px] px-1.5 py-0.5 font-[family-name:var(--font-display)] font-bold"
                            style={{ background: "rgba(255,64,64,.15)", color: "#ff6e6e" }}
                          >
                            BOSS
                          </span>
                        ) : act.status === "complete" ? (
                          <span
                            className="text-[10px]"
                            style={{ color: "var(--color-signal)" }}
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            className="text-[10px]"
                            style={{ color: "var(--color-foreground)", opacity: 0.4 }}
                          >
                            ▸
                          </span>
                        )}
                        <span
                          className="font-[family-name:var(--font-display)] text-[11px] tracking-[2px] font-bold"
                          style={{
                            color: ch.boss
                              ? (act.status === "complete" ? "var(--color-signal)" : "#ff6e6e")
                              : "var(--color-foreground)",
                            opacity: 1,
                          }}
                        >
                          {ch.name}
                        </span>
                      </div>

                      {/* Description */}
                      <div
                        className="text-[10px] leading-[1.6] mb-2 pl-5"
                        style={{
                          color: "var(--color-foreground)",
                          opacity: act.status === "complete" ? 0.7 : 0.6,
                        }}
                      >
                        {ch.description}
                      </div>

                      {/* Concept tags */}
                      <div className="flex flex-wrap gap-1.5 pl-5">
                        {ch.concepts.map((c) => (
                          <span
                            key={c}
                            className="text-[8px] tracking-[0.5px] px-1.5 py-0.5"
                            style={{
                              color: act.status === "complete" ? "var(--color-signal)" : "var(--color-foreground)",
                              opacity: act.status === "complete" ? 0.7 : 0.55,
                              background: act.status === "complete"
                                ? "rgba(110,255,160,.06)"
                                : "rgba(255,255,255,.03)",
                            }}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Bottom CTA */}
          <div className="text-center mt-4 mb-10">
            <button
              onClick={() => setShowCurriculum(false)}
              className="bg-transparent py-3 px-8 cursor-pointer font-[family-name:var(--font-display)] text-[12px] tracking-[3px] transition-all"
              style={{
                border: "2px solid var(--color-signal)",
                color: hovered === "back-cta" ? "var(--color-background)" : "var(--color-signal)",
                background: hovered === "back-cta" ? "var(--color-signal)" : "transparent",
              }}
              onMouseEnter={() => setHovered("back-cta")}
              onMouseLeave={() => setHovered(null)}
            >
              UNLOCK ALL CHAPTERS
            </button>
          </div>
        </div>
      </div>
    );
  }

  const [soundEnabled, setSoundEnabled] = useState(true);

  return (
    <div
      className="fixed inset-0 z-[950] overflow-y-auto"
      style={{ background: "rgba(2,4,6,.98)" }}
    >
      {/* Scan lines */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(110,255,160,.015) 2px, rgba(110,255,160,.015) 4px)",
        }}
      />

      {/* Side-by-side layout */}
      <div className="relative min-h-dvh flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="flex gap-6 max-w-[1200px] w-full items-center">

            {/* Left: Promo video — takes more space */}
            <div className="flex-[3] min-w-0">
              <div className="relative" style={{ aspectRatio: "16 / 9" }}>
                <PromoLoop soundEnabled={soundEnabled} />
                <button
                  onClick={() => setSoundEnabled((s) => !s)}
                  className="absolute bottom-3 right-3 bg-transparent cursor-pointer text-[9px] tracking-[1px] px-2 py-1 transition-colors"
                  style={{
                    color: soundEnabled ? "var(--color-signal)" : "var(--color-foreground)",
                    opacity: soundEnabled ? 1 : 0.5,
                    border: "1px solid",
                    borderColor: soundEnabled ? "rgba(110,255,160,.3)" : "rgba(255,255,255,.1)",
                    background: soundEnabled ? "rgba(110,255,160,.08)" : "rgba(0,0,0,.6)",
                  }}
                >
                  {soundEnabled ? "♪ ON" : "♪ OFF"}
                </button>
              </div>
            </div>

            {/* Right: Details — compact */}
            <div className="w-[340px] shrink-0">
              {/* Header */}
              <div className="mb-5">
                <div
                  className="font-[family-name:var(--font-display)] font-black tracking-[5px] mb-2"
                  style={{
                    fontSize: "28px",
                    color: "var(--color-signal)",
                    textShadow: "0 0 40px rgba(110,255,160,.2)",
                  }}
                >
                  SIGNAL
                </div>
                <div
                  className="text-[11px] leading-[1.8] mb-3"
                  style={{ color: "var(--color-foreground)", opacity: 0.8 }}
                >
                  complete this game and become a professional software engineer. guaranteed!
                </div>
                <div
                  className="text-[10px] leading-[1.8]"
                  style={{ color: "var(--color-foreground)", opacity: 0.55 }}
                >
                  4 acts · 24 chapters · 4 boss fights · full Go curriculum
                </div>
              </div>

              {/* Pricing toggle */}
              <div className="flex gap-2 mb-4">
                {/* Individual */}
                <button
                  onClick={() => setSelectedPlan("single")}
                  className="flex-1 bg-transparent p-2.5 text-left cursor-pointer transition-all"
                  style={{
                    border: selectedPlan === "single"
                      ? "2px solid var(--color-signal)"
                      : "1px solid rgba(110,255,160,.1)",
                    background: selectedPlan === "single"
                      ? "rgba(110,255,160,.04)"
                      : "rgba(4,8,16,.4)",
                  }}
                >
                  <div
                    className="text-[7px] tracking-[2px] mb-1"
                    style={{ color: "var(--color-foreground)", opacity: 0.7 }}
                  >
                    INDIVIDUAL
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span
                      className="font-[family-name:var(--font-display)] font-black text-[22px]"
                      style={{ color: selectedPlan === "single" ? "var(--color-signal)" : "var(--color-foreground)" }}
                    >
                      ${PRICE_SINGLE}
                    </span>
                  </div>
                  <div
                    className="text-[8px] leading-[1.6]"
                    style={{ color: "var(--color-foreground)", opacity: 0.65 }}
                  >
                    lifetime access
                  </div>
                </button>

                {/* Team */}
                <button
                  onClick={() => setSelectedPlan("team")}
                  className="flex-1 bg-transparent p-2.5 text-left cursor-pointer transition-all relative"
                  style={{
                    border: selectedPlan === "team"
                      ? "2px solid var(--color-signal)"
                      : "1px solid rgba(110,255,160,.1)",
                    background: selectedPlan === "team"
                      ? "rgba(110,255,160,.04)"
                      : "rgba(4,8,16,.4)",
                  }}
                >
                  <div
                    className="absolute top-0 right-0 px-1.5 py-0.5 text-[6px] tracking-[1px] font-[family-name:var(--font-display)] font-bold"
                    style={{ background: "var(--color-signal)", color: "var(--color-background)" }}
                  >
                    SAVE {Math.round((1 - (parseFloat(PRICE_TEAM) / parseInt(TEAM_SEATS)) / parseFloat(PRICE_SINGLE)) * 100)}%
                  </div>
                  <div
                    className="text-[7px] tracking-[2px] mb-1"
                    style={{ color: "var(--color-foreground)", opacity: 0.7 }}
                  >
                    TEAM · {TEAM_SEATS} SEATS
                  </div>
                  <div className="flex items-baseline gap-1 mb-0.5">
                    <span
                      className="font-[family-name:var(--font-display)] font-black text-[22px]"
                      style={{ color: selectedPlan === "team" ? "var(--color-signal)" : "var(--color-foreground)" }}
                    >
                      ${PRICE_TEAM}
                    </span>
                  </div>
                  <div
                    className="text-[8px] mb-0.5"
                    style={{ color: "var(--color-signal)", opacity: 0.7 }}
                  >
                    ${(parseFloat(PRICE_TEAM) / parseInt(TEAM_SEATS)).toFixed(2)}/seat
                  </div>
                </button>
              </div>

              {/* Continue with Google — primary CTA */}
              <button
                className="w-full py-3 cursor-pointer text-[11px] tracking-[2px] transition-all flex items-center justify-center gap-3 font-[family-name:var(--font-display)]"
                style={{
                  border: "2px solid var(--color-signal)",
                  color: hovered === "google" ? "var(--color-background)" : "var(--color-signal)",
                  background: hovered === "google" ? "var(--color-signal)" : "transparent",
                  textShadow: hovered === "google" ? "none" : "0 0 12px rgba(110,255,160,.2)",
                }}
                onMouseEnter={() => setHovered("google")}
                onMouseLeave={() => setHovered(null)}
              >
                <GoogleIcon size={16} />
                <span>CONTINUE WITH GOOGLE</span>
              </button>

              {/* Play Act I Free — prominent secondary CTA */}
              <a
                href="/play"
                className="w-full mt-2.5 py-2.5 flex items-center justify-center text-[10px] tracking-[2px] transition-all font-[family-name:var(--font-display)]"
                style={{
                  border: "1px solid rgba(110,255,160,.2)",
                  color: hovered === "play-free" ? "var(--color-signal)" : "var(--color-foreground)",
                  background: hovered === "play-free" ? "rgba(110,255,160,.06)" : "transparent",
                  textDecoration: "none",
                  display: "flex",
                }}
                onMouseEnter={() => setHovered("play-free")}
                onMouseLeave={() => setHovered(null)}
              >
                ▸ PLAY ACT I FREE
              </a>

              {/* View curriculum link */}
              <div className="text-center mt-3">
                <button
                  onClick={() => setShowCurriculum(true)}
                  className="bg-transparent cursor-pointer text-[9px] tracking-[1px] transition-colors"
                  style={{
                    color: hovered === "curriculum" ? "var(--color-signal)" : "var(--color-foreground)",
                    opacity: hovered === "curriculum" ? 1 : 0.5,
                    border: "none",
                    borderBottom: "1px solid",
                    borderColor: hovered === "curriculum" ? "var(--color-signal)" : "rgba(110,255,160,.2)",
                    paddingBottom: "2px",
                  }}
                  onMouseEnter={() => setHovered("curriculum")}
                  onMouseLeave={() => setHovered(null)}
                >
                  view full curriculum — 4 acts, 24 chapters
                </button>
              </div>

              {/* Player stats footer — only shown for returning players */}
              {playerXP != null && playerLevel != null && (
                <div className="flex justify-center gap-5 mt-5">
                  <div className="text-center">
                    <div
                      className="text-[7px] tracking-[2px] mb-1"
                      style={{ color: "var(--color-foreground)", opacity: 0.6 }}
                    >
                      YOUR XP
                    </div>
                    <div
                      className="font-[family-name:var(--font-display)] text-[16px] font-bold"
                      style={{ color: "var(--color-signal)" }}
                    >
                      {playerXP.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      className="text-[7px] tracking-[2px] mb-1"
                      style={{ color: "var(--color-foreground)", opacity: 0.6 }}
                    >
                      LEVEL
                    </div>
                    <div
                      className="font-[family-name:var(--font-display)] text-[16px] font-bold"
                      style={{ color: "var(--color-signal)" }}
                    >
                      {playerLevel}
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      className="text-[7px] tracking-[2px] mb-1"
                      style={{ color: "var(--color-foreground)", opacity: 0.6 }}
                    >
                      CHAPTERS
                    </div>
                    <div
                      className="font-[family-name:var(--font-display)] text-[16px] font-bold"
                      style={{ color: "var(--color-signal)" }}
                    >
                      4/24
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer links */}
        <div className="relative flex items-center justify-center gap-5 pb-6">
          {([
            { label: "faq", href: "/faq" },
            { label: "why go", href: "/why-go" },
            { label: "privacy", href: "/privacy" },
          ] as const).map((link, i) => (
            <span key={link.label} className="flex items-center gap-5">
              {i > 0 && (
                <span
                  className="text-[9px]"
                  style={{ color: "var(--color-foreground)", opacity: 0.25 }}
                >
                  |
                </span>
              )}
              <a
                href={link.href}
                className="text-[10px] tracking-[1.5px] transition-colors"
                style={{
                  color: hovered === link.label ? "var(--color-signal)" : "var(--color-foreground)",
                  opacity: hovered === link.label ? 1 : 0.6,
                  textDecoration: "none",
                }}
                onMouseEnter={() => setHovered(link.label)}
                onMouseLeave={() => setHovered(null)}
              >
                {link.label}
              </a>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
