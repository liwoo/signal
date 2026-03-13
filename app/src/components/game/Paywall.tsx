"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PromoLoop } from "@/components/promo/PromoLoop";
import {
  trackPurchaseCtaClick,
  trackConsentModalView,
  trackConsentAccepted,
  trackConsentDismissed,
  trackPurchaseStart,
} from "@/lib/analytics";

interface PaywallProps {
  playerXP?: number;
  playerLevel?: number;
}

const PRICE_SINGLE = process.env.NEXT_PUBLIC_PRICE_SINGLE || "9.99";
const PRICE_TEAM = process.env.NEXT_PUBLIC_PRICE_TEAM || "69.99";
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
        description: "crack a keypad sequence by classifying numbers 1\u201310",
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
        name: "GUARD ROSTER",
        description: "decode patrol schedules using maps and the bool-set pattern",
        concepts: ["map[K]V", "composite literals", "range", "Sprintf"],
      },
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
        name: "JSON & I/O",
        description: "parse and forge security credentials in structured data",
        concepts: ["encoding/json", "struct tags", "Marshal/Unmarshal", "file I/O"],
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
        name: "MODULES",
        description: "structure the full escape toolkit as a production Go project",
        concepts: ["go.mod", "semantic versioning", "dependencies", "workspaces"],
      },
      {
        name: "FINAL SIGNAL",
        description: "broadcast the signal \u2014 everything you've learned in one final mission",
        concepts: ["the full language", "production architecture", "real-world Go"],
        boss: true,
      },
    ],
  },
];

// ── Feature highlights ──

interface Feature {
  label: string;
  detail: string;
  color: string;
}

const FEATURES: Feature[] = [
  {
    label: "REAL GO COMPILER",
    detail: "your code compiles on the official Go Playground. real errors, real output, real learning.",
    color: "var(--color-signal)",
  },
  {
    label: "AI TUTOR",
    detail: "maya adapts to your mistakes. she doesn't solve it for you \u2014 she pushes you in the right direction.",
    color: "var(--color-info)",
  },
  {
    label: "BOSS FIGHTS",
    detail: "multi-file debugging challenges under fire. fix corrupted code while the clock ticks down.",
    color: "var(--color-danger)",
  },
  {
    label: "ZEN SYSTEM",
    detail: "write idiomatic Go and earn bonus XP. build a personal library of Go best practices.",
    color: "var(--color-alert)",
  },
];

// ── What you'll learn checkpoints ──

interface Checkpoint {
  act: string;
  label: string;
  detail: string;
}

const CHECKPOINTS: Checkpoint[] = [
  { act: "I", label: "Write your first Go program", detail: "variables, loops, functions, slices" },
  { act: "II", label: "Build with structs and interfaces", detail: "maps, pointers, error handling" },
  { act: "III", label: "Go concurrent and networked", detail: "goroutines, channels, HTTP, JSON, testing" },
  { act: "IV", label: "Ship production Go", detail: "generics, context, databases, CLI tools, modules" },
];

// ── Typing effect for the tagline ──

function useTypingEffect(text: string, speed = 40, delay = 800) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    let timeout: NodeJS.Timeout;

    const startTyping = () => {
      timeout = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(timeout);
          setDone(true);
        }
      }, speed);
    };

    const delayTimeout = setTimeout(startTyping, delay);
    return () => {
      clearTimeout(delayTimeout);
      clearInterval(timeout);
    };
  }, [text, speed, delay]);

  return { displayed, done };
}

// ══════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════

export function Paywall({ playerXP, playerLevel }: PaywallProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [showCurriculum, setShowCurriculum] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"single" | "team">("single");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const activePrice = selectedPlan === "single" ? PRICE_SINGLE : PRICE_TEAM;

  const tagline = useTypingEffect("learn go by escaping.", 50, 600);

  const handleGoogleClick = useCallback(() => {
    trackPurchaseCtaClick(selectedPlan, activePrice);
    setConsentChecked(false);
    setShowConsent(true);
    trackConsentModalView(selectedPlan, activePrice);
  }, [selectedPlan, activePrice]);

  const handleConsentProceed = useCallback(() => {
    trackConsentAccepted(selectedPlan, activePrice);
    trackPurchaseStart(selectedPlan, activePrice);
    setShowConsent(false);
    // TODO: trigger Google OAuth + Stripe checkout
  }, [selectedPlan, activePrice]);

  const handleConsentDismiss = useCallback(() => {
    trackConsentDismissed(selectedPlan, activePrice);
    setShowConsent(false);
  }, [selectedPlan, activePrice]);

  // ── Curriculum page ──
  if (showCurriculum) {
    return (
      <div
        className="fixed inset-0 z-[950] overflow-y-auto"
        style={{ background: "rgba(2,4,6,.98)" }}
      >
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(110,255,160,.015) 2px, rgba(110,255,160,.015) 4px)",
          }}
        />

        <div className="relative max-w-[640px] mx-auto px-4 py-10">
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
            &#9666; BACK
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
              4 acts &middot; 22 chapters &middot; 4 boss fights
            </div>
            <div
              className="text-[11px]"
              style={{ color: "var(--color-foreground)", opacity: 0.5 }}
            >
              from &quot;hello world&quot; to production Go
            </div>
          </div>

          {CURRICULUM.map((act) => {
            const diff = DIFFICULTY_STYLES[act.difficulty];
            return (
              <div key={act.act} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="font-[family-name:var(--font-display)] text-[12px] tracking-[3px] font-bold"
                    style={{
                      color: act.status === "complete" ? "var(--color-signal)" : "var(--color-foreground)",
                      opacity: act.status === "complete" ? 1 : 0.9,
                    }}
                  >
                    ACT {act.act} &mdash; {act.title}
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
                      FREE
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
                          <span className="text-[10px]" style={{ color: "var(--color-signal)" }}>
                            &#10003;
                          </span>
                        ) : (
                          <span className="text-[10px]" style={{ color: "var(--color-foreground)", opacity: 0.4 }}>
                            &#9656;
                          </span>
                        )}
                        <span
                          className="font-[family-name:var(--font-display)] text-[11px] tracking-[2px] font-bold"
                          style={{
                            color: ch.boss
                              ? (act.status === "complete" ? "var(--color-signal)" : "#ff6e6e")
                              : "var(--color-foreground)",
                          }}
                        >
                          {ch.name}
                        </span>
                      </div>
                      <div
                        className="text-[10px] leading-[1.6] mb-2 pl-5"
                        style={{
                          color: "var(--color-foreground)",
                          opacity: act.status === "complete" ? 0.7 : 0.6,
                        }}
                      >
                        {ch.description}
                      </div>
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

  // ── Main landing page ──
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

      <div className="relative">
        {/* ═══════════ HERO ═══════════ */}
        <section className="min-h-dvh flex flex-col items-center justify-center px-4 sm:px-6 relative">
          {/* Title */}
          <div
            className="font-[family-name:var(--font-display)] font-black tracking-[8px] mb-3"
            style={{
              fontSize: "clamp(36px, 8vw, 64px)",
              color: "var(--color-signal)",
              textShadow: "0 0 60px rgba(110,255,160,.25), 0 0 120px rgba(110,255,160,.1)",
              animation: "cinematic-fade-in 1s ease forwards",
            }}
          >
            SIGNAL
          </div>

          {/* Typing tagline */}
          <div className="h-[24px] mb-6">
            <span
              className="text-[14px] sm:text-[16px] tracking-[1px]"
              style={{ color: "var(--color-dim)" }}
            >
              {tagline.displayed}
              {!tagline.done && (
                <span className="cursor-blink" style={{ color: "var(--color-signal)" }}>_</span>
              )}
            </span>
          </div>

          {/* Promo video */}
          <div className="w-full max-w-[720px] mb-8 relative" style={{ aspectRatio: "16 / 9" }}>
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
              {soundEnabled ? "\u266A ON" : "\u266A OFF"}
            </button>
          </div>

          {/* Primary CTA */}
          <a
            href="/play"
            className="py-3.5 px-10 font-[family-name:var(--font-display)] text-[13px] tracking-[3px] transition-all"
            style={{
              border: "2px solid var(--color-signal)",
              color: hovered === "hero-play" ? "var(--color-background)" : "var(--color-signal)",
              background: hovered === "hero-play" ? "var(--color-signal)" : "transparent",
              textDecoration: "none",
              textShadow: hovered === "hero-play" ? "none" : "0 0 12px rgba(110,255,160,.3)",
            }}
            onMouseEnter={() => setHovered("hero-play")}
            onMouseLeave={() => setHovered(null)}
          >
            PLAY FREE
          </a>
          <div
            className="text-[9px] tracking-[1px] mt-3"
            style={{ color: "var(--color-foreground)", opacity: 0.4 }}
          >
            act I &middot; no account required
          </div>

          {/* Scroll indicator */}
          <div
            className="absolute bottom-8 text-[10px] tracking-[2px]"
            style={{ color: "var(--color-dim)", animation: "glow-pulse 3s ease-in-out infinite" }}
          >
            &#9660;
          </div>
        </section>

        {/* ═══════════ THE PITCH ═══════════ */}
        <section className="max-w-[640px] mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div
            className="text-[13px] sm:text-[14px] leading-[2] mb-12"
            style={{ color: "var(--color-foreground)", opacity: 0.8 }}
          >
            maya chen is a cryptography researcher trapped in a locked-down facility.
            the only way out is through the terminal. you write real Go code to open
            doors, decode schedules, hijack comm relays, and fight your way past
            security systems. every chapter teaches new Go concepts. every line you write
            compiles on the real Go Playground. by the end, you know Go.
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-16">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="px-4 py-4"
                style={{
                  border: "1px solid rgba(255,255,255,.04)",
                  background: "rgba(4,8,16,.6)",
                }}
              >
                <div
                  className="font-[family-name:var(--font-display)] text-[9px] tracking-[2px] font-bold mb-2"
                  style={{ color: f.color }}
                >
                  {f.label}
                </div>
                <div
                  className="text-[11px] leading-[1.8]"
                  style={{ color: "var(--color-foreground)", opacity: 0.65 }}
                >
                  {f.detail}
                </div>
              </div>
            ))}
          </div>

          {/* What you'll learn */}
          <div className="mb-16">
            <div
              className="font-[family-name:var(--font-display)] text-[10px] tracking-[3px] font-bold mb-6"
              style={{ color: "var(--color-signal)" }}
            >
              WHAT YOU&apos;LL LEARN
            </div>
            <div className="flex flex-col gap-4">
              {CHECKPOINTS.map((cp) => (
                <div key={cp.act} className="flex gap-4">
                  <div className="shrink-0 w-[28px]">
                    <div
                      className="font-[family-name:var(--font-display)] text-[11px] font-bold text-center"
                      style={{ color: "var(--color-dim)" }}
                    >
                      {cp.act}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-[12px] mb-0.5"
                      style={{ color: "var(--color-foreground)" }}
                    >
                      {cp.label}
                    </div>
                    <div
                      className="text-[10px]"
                      style={{ color: "var(--color-foreground)", opacity: 0.5 }}
                    >
                      {cp.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social proof placeholder */}
          <div
            className="px-5 py-5 mb-16"
            style={{
              borderLeft: "2px solid var(--color-signal)",
              background: "rgba(110,255,160,.02)",
            }}
          >
            <div
              className="text-[12px] leading-[1.9] mb-3"
              style={{ color: "var(--color-foreground)", opacity: 0.8 }}
            >
              &quot;i tried three Go tutorials before this. SIGNAL is the first one where I
              actually looked forward to the next lesson.&quot;
            </div>
            <div
              className="text-[10px]"
              style={{ color: "var(--color-dim)" }}
            >
              &mdash; early access player
            </div>
          </div>
        </section>

        {/* ═══════════ PRICING ═══════════ */}
        <section
          className="py-16 sm:py-24"
          style={{ borderTop: "1px solid rgba(110,255,160,.06)" }}
        >
          <div className="max-w-[540px] mx-auto px-4 sm:px-6">
            <div className="text-center mb-3">
              <div
                className="font-[family-name:var(--font-display)] font-black tracking-[4px] mb-2"
                style={{ fontSize: "20px", color: "var(--color-signal)" }}
              >
                UNLOCK THE FULL GAME
              </div>
              <div
                className="text-[11px] leading-[1.8]"
                style={{ color: "var(--color-foreground)", opacity: 0.5 }}
              >
                act I is free. unlock acts II\u2013IV for the complete Go curriculum.
              </div>
            </div>

            {/* Free tier callout */}
            <div
              className="px-4 py-3 mb-5 flex items-center justify-between"
              style={{
                border: "1px solid rgba(110,255,160,.15)",
                background: "rgba(110,255,160,.03)",
              }}
            >
              <div>
                <div
                  className="font-[family-name:var(--font-display)] text-[10px] tracking-[2px] font-bold mb-0.5"
                  style={{ color: "var(--color-signal)" }}
                >
                  ACT I &mdash; FREE
                </div>
                <div
                  className="text-[9px]"
                  style={{ color: "var(--color-foreground)", opacity: 0.5 }}
                >
                  4 chapters + 1 boss fight &middot; no account needed
                </div>
              </div>
              <a
                href="/play"
                className="text-[9px] tracking-[1px] px-3 py-1.5 font-[family-name:var(--font-display)] transition-colors"
                style={{
                  border: "1px solid rgba(110,255,160,.3)",
                  color: "var(--color-signal)",
                  textDecoration: "none",
                  background: hovered === "free-cta" ? "rgba(110,255,160,.08)" : "transparent",
                }}
                onMouseEnter={() => setHovered("free-cta")}
                onMouseLeave={() => setHovered(null)}
              >
                PLAY
              </a>
            </div>

            {/* Pricing cards */}
            <div className="flex gap-2 mb-5">
              {/* Individual */}
              <button
                onClick={() => setSelectedPlan("single")}
                className="flex-1 bg-transparent p-3 text-left cursor-pointer transition-all"
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
                  className="text-[7px] tracking-[2px] mb-2"
                  style={{ color: "var(--color-foreground)", opacity: 0.7 }}
                >
                  INDIVIDUAL
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span
                    className="font-[family-name:var(--font-display)] font-black text-[24px]"
                    style={{ color: selectedPlan === "single" ? "var(--color-signal)" : "var(--color-foreground)" }}
                  >
                    ${PRICE_SINGLE}
                  </span>
                </div>
                <div
                  className="text-[8px] leading-[1.6]"
                  style={{ color: "var(--color-foreground)", opacity: 0.55 }}
                >
                  one-time &middot; lifetime access
                </div>
              </button>

              {/* Team */}
              <button
                onClick={() => setSelectedPlan("team")}
                className="flex-1 bg-transparent p-3 text-left cursor-pointer transition-all relative"
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
                  className="text-[7px] tracking-[2px] mb-2"
                  style={{ color: "var(--color-foreground)", opacity: 0.7 }}
                >
                  TEAM &middot; {TEAM_SEATS} SEATS
                </div>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <span
                    className="font-[family-name:var(--font-display)] font-black text-[24px]"
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

            {/* What's included */}
            <div
              className="px-4 py-3 mb-5"
              style={{
                background: "rgba(4,8,16,.6)",
                border: "1px solid rgba(255,255,255,.04)",
              }}
            >
              <div
                className="text-[8px] tracking-[2px] mb-2"
                style={{ color: "var(--color-foreground)", opacity: 0.5 }}
              >
                INCLUDES
              </div>
              {[
                "22 chapters + 4 boss fights across 4 acts",
                "full Go curriculum: basics through production",
                "real compiler \u2014 code runs on Go Playground",
                "AI tutor adapts to your mistakes",
                "zen library of idiomatic Go patterns",
                "lifetime access \u2014 no subscription",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 mb-1.5">
                  <span className="text-[9px] shrink-0 mt-px" style={{ color: "var(--color-signal)" }}>&#10003;</span>
                  <span
                    className="text-[10px] leading-[1.6]"
                    style={{ color: "var(--color-foreground)", opacity: 0.7 }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* Purchase CTA */}
            <button
              onClick={handleGoogleClick}
              className="w-full py-3.5 cursor-pointer text-[12px] tracking-[2px] transition-all flex items-center justify-center gap-3 font-[family-name:var(--font-display)]"
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
              <span>UNLOCK ALL ACTS &mdash; ${activePrice}</span>
            </button>

            <div className="text-center mt-3 mb-2">
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
                view full curriculum
              </button>
            </div>

            {/* Returning player stats */}
            {playerXP != null && playerLevel != null && (
              <div
                className="flex justify-center gap-5 mt-8 pt-5"
                style={{ borderTop: "1px solid rgba(110,255,160,.06)" }}
              >
                <div className="text-center">
                  <div className="text-[7px] tracking-[2px] mb-1" style={{ color: "var(--color-foreground)", opacity: 0.6 }}>YOUR XP</div>
                  <div className="font-[family-name:var(--font-display)] text-[16px] font-bold" style={{ color: "var(--color-signal)" }}>
                    {playerXP.toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[7px] tracking-[2px] mb-1" style={{ color: "var(--color-foreground)", opacity: 0.6 }}>LEVEL</div>
                  <div className="font-[family-name:var(--font-display)] text-[16px] font-bold" style={{ color: "var(--color-signal)" }}>
                    {playerLevel}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════ FOOTER ═══════════ */}
        <footer
          className="py-8"
          style={{ borderTop: "1px solid rgba(110,255,160,.04)" }}
        >
          <div className="flex items-center justify-center gap-5 mb-4">
            {([
              { label: "faq", href: "/faq" },
              { label: "why go", href: "/why-go" },
              { label: "privacy", href: "/privacy" },
            ] as const).map((link, i) => (
              <span key={link.label} className="flex items-center gap-5">
                {i > 0 && (
                  <span className="text-[9px]" style={{ color: "var(--color-foreground)", opacity: 0.25 }}>|</span>
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
          <div
            className="text-center text-[8px] tracking-[1px]"
            style={{ color: "var(--color-foreground)", opacity: 0.25 }}
          >
            CHIENDA LTD &middot; 2026
          </div>
        </footer>
      </div>

      {/* ═══════════ CONSENT MODAL ═══════════ */}
      {showConsent && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center"
          style={{ background: "rgba(2,4,6,.92)" }}
          onClick={handleConsentDismiss}
        >
          <div
            className="relative w-full max-w-[420px] mx-4"
            style={{
              background: "#060a10",
              border: "1px solid rgba(110,255,160,.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(110,255,160,.08)" }}
            >
              <span
                className="font-[family-name:var(--font-display)] text-[10px] tracking-[2px] font-bold"
                style={{ color: "var(--color-signal)" }}
              >
                CONFIRM PURCHASE
              </span>
              <button
                onClick={handleConsentDismiss}
                className="bg-transparent border-0 cursor-pointer text-[14px]"
                style={{ color: "var(--color-dim)" }}
              >
                &#10005;
              </button>
            </div>

            <div className="px-5 py-5">
              <div
                className="px-4 py-3 mb-5"
                style={{
                  background: "rgba(110,255,160,.03)",
                  border: "1px solid rgba(110,255,160,.08)",
                }}
              >
                <div className="flex justify-between items-baseline">
                  <span
                    className="text-[9px] tracking-[2px]"
                    style={{ color: "var(--color-foreground)", opacity: 0.7 }}
                  >
                    {selectedPlan === "single" ? "INDIVIDUAL LICENSE" : `TEAM LICENSE \u00B7 ${TEAM_SEATS} SEATS`}
                  </span>
                  <span
                    className="font-[family-name:var(--font-display)] font-bold text-[18px]"
                    style={{ color: "var(--color-signal)" }}
                  >
                    ${activePrice}
                  </span>
                </div>
                <div
                  className="text-[9px] mt-1"
                  style={{ color: "var(--color-foreground)", opacity: 0.5 }}
                >
                  one-time payment &middot; lifetime access &middot; all 22 chapters
                </div>
              </div>

              <p
                className="text-[10px] leading-[1.8] mb-5"
                style={{ color: "var(--color-foreground)", opacity: 0.6 }}
              >
                By proceeding, you authorize Chienda Ltd to charge ${activePrice} USD
                to your payment method via Stripe. Your purchase grants lifetime access
                to all SIGNAL content. Refund requests may be submitted within 14 days
                of purchase to{" "}
                <a
                  href="mailto:jeremiah@chienda.com"
                  style={{ color: "var(--color-signal)", textDecoration: "none" }}
                >
                  jeremiah@chienda.com
                </a>.
              </p>

              <label
                className="flex items-start gap-3 cursor-pointer mb-6"
                style={{ userSelect: "none" }}
              >
                <div
                  className="shrink-0 mt-0.5 w-[18px] h-[18px] flex items-center justify-center cursor-pointer"
                  style={{
                    border: `1px solid ${consentChecked ? "var(--color-signal)" : "rgba(110,255,160,.2)"}`,
                    background: consentChecked ? "rgba(110,255,160,.1)" : "transparent",
                    transition: "all 150ms",
                  }}
                >
                  {consentChecked && (
                    <span className="text-[12px]" style={{ color: "var(--color-signal)" }}>&#10003;</span>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="sr-only"
                />
                <span
                  className="text-[10px] leading-[1.7]"
                  style={{ color: "var(--color-foreground)", opacity: 0.8 }}
                >
                  I have read and agree to the{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--color-signal)", textDecoration: "underline", textUnderlineOffset: "3px" }}
                  >
                    Privacy Policy
                  </a>{" "}
                  and authorize the charge described above.
                </span>
              </label>

              <button
                onClick={handleConsentProceed}
                disabled={!consentChecked}
                className="w-full py-3 cursor-pointer text-[11px] tracking-[2px] transition-all flex items-center justify-center gap-3 font-[family-name:var(--font-display)] disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  border: `2px solid ${consentChecked ? "var(--color-signal)" : "rgba(110,255,160,.15)"}`,
                  color: consentChecked ? "var(--color-signal)" : "var(--color-dim)",
                  background: "transparent",
                }}
              >
                <GoogleIcon size={16} />
                <span>SIGN IN &amp; PAY ${activePrice}</span>
              </button>

              <button
                onClick={handleConsentDismiss}
                className="w-full mt-2 py-2 bg-transparent cursor-pointer text-[9px] tracking-[1px] transition-colors"
                style={{ border: "none", color: "var(--color-foreground)", opacity: 0.5 }}
              >
                cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
