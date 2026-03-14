"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  trackWarmupStart,
  trackWarmupComplete,
  trackWarmupExercise,
  trackWarmupError,
  trackWarmupSkipExercise,
  trackWarmupFontScale,
} from "@/lib/analytics";

// ── Types ──

interface WarmupProps {
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
  onComplete: () => void;
}

type ExerciseState = "idle" | "success" | "advancing";

const TOTAL_EXERCISES = 4;
type ExerciseNum = 1 | 2 | 3 | 4;

const FONT_SCALE_MIN = 1;
const FONT_SCALE_MAX = 3;
const FONT_SCALE_STEP = 0.5;

// ── Exercise config ──

interface ExerciseConfig {
  title: string;
  maya: string;
  xp: number;
  successLabel: string;
  placeholder: string;
  multiline: boolean;
}

const EXERCISES: Record<ExerciseNum, ExerciseConfig> = {
  1: {
    title: "ECHO TEST",
    maya: 'type the code below exactly as you see it. this prints "hello" to the terminal.',
    xp: 10,
    successLabel: "✓ SIGNAL RECEIVED",
    placeholder: 'fmt.Println("hello")',
    multiline: false,
  },
  2: {
    title: "FIRST VARIABLE",
    maya: "store a name in a variable, then print it. use := to declare.",
    xp: 15,
    successLabel: "✓ VARIABLE STORED",
    placeholder: 'name := "maya"\nfmt.Println(name)',
    multiline: true,
  },
  3: {
    title: "QUICK MATH",
    maya: "add two numbers and print the result. go can do math inside Println.",
    xp: 15,
    successLabel: "✓ CALCULATION CORRECT",
    placeholder: "fmt.Println(3 + 7)",
    multiline: false,
  },
  4: {
    title: "STORE & COMPUTE",
    maya: "declare two variables, then print their sum. same := syntax as before.",
    xp: 25,
    successLabel: "✓ SYSTEM ONLINE",
    placeholder: "a := 10\nb := 20\nfmt.Println(a + b)",
    multiline: true,
  },
};

// ── Syntax helpers ──

interface SnippetProps {
  fontSize: string;
}

function SnippetEcho({ fontSize }: SnippetProps) {
  return (
    <span className="font-[family-name:var(--font-mono)]" style={{ fontSize }}>
      <span style={{ color: "var(--color-syn-builtin)" }}>fmt</span>
      <span style={{ color: "var(--color-foreground)" }}>.</span>
      <span style={{ color: "var(--color-syn-ident)" }}>Println</span>
      <span style={{ color: "var(--color-foreground)" }}>(</span>
      <span style={{ color: "var(--color-syn-string)" }}>&quot;hello&quot;</span>
      <span style={{ color: "var(--color-foreground)" }}>)</span>
    </span>
  );
}

function SnippetVariable({ fontSize }: SnippetProps) {
  return (
    <div className="font-[family-name:var(--font-mono)] space-y-1" style={{ fontSize }}>
      <div>
        <span style={{ color: "var(--color-syn-ident)" }}>name</span>
        <span style={{ color: "var(--color-foreground)" }}> := </span>
        <span style={{ color: "var(--color-syn-string)" }}>&quot;maya&quot;</span>
      </div>
      <div>
        <span style={{ color: "var(--color-syn-builtin)" }}>fmt</span>
        <span style={{ color: "var(--color-foreground)" }}>.</span>
        <span style={{ color: "var(--color-syn-ident)" }}>Println</span>
        <span style={{ color: "var(--color-foreground)" }}>(</span>
        <span style={{ color: "var(--color-syn-ident)" }}>name</span>
        <span style={{ color: "var(--color-foreground)" }}>)</span>
      </div>
    </div>
  );
}

function SnippetQuickMath({ fontSize }: SnippetProps) {
  return (
    <span className="font-[family-name:var(--font-mono)]" style={{ fontSize }}>
      <span style={{ color: "var(--color-syn-builtin)" }}>fmt</span>
      <span style={{ color: "var(--color-foreground)" }}>.</span>
      <span style={{ color: "var(--color-syn-ident)" }}>Println</span>
      <span style={{ color: "var(--color-foreground)" }}>(</span>
      <span style={{ color: "var(--color-syn-number)" }}>3</span>
      <span style={{ color: "var(--color-foreground)" }}> + </span>
      <span style={{ color: "var(--color-syn-number)" }}>7</span>
      <span style={{ color: "var(--color-foreground)" }}>)</span>
    </span>
  );
}

function SnippetStoreCompute({ fontSize }: SnippetProps) {
  return (
    <div className="font-[family-name:var(--font-mono)] space-y-1" style={{ fontSize }}>
      <div>
        <span style={{ color: "var(--color-syn-ident)" }}>a</span>
        <span style={{ color: "var(--color-foreground)" }}> := </span>
        <span style={{ color: "var(--color-syn-number)" }}>10</span>
      </div>
      <div>
        <span style={{ color: "var(--color-syn-ident)" }}>b</span>
        <span style={{ color: "var(--color-foreground)" }}> := </span>
        <span style={{ color: "var(--color-syn-number)" }}>20</span>
      </div>
      <div>
        <span style={{ color: "var(--color-syn-builtin)" }}>fmt</span>
        <span style={{ color: "var(--color-foreground)" }}>.</span>
        <span style={{ color: "var(--color-syn-ident)" }}>Println</span>
        <span style={{ color: "var(--color-foreground)" }}>(</span>
        <span style={{ color: "var(--color-syn-ident)" }}>a</span>
        <span style={{ color: "var(--color-foreground)" }}> + </span>
        <span style={{ color: "var(--color-syn-ident)" }}>b</span>
        <span style={{ color: "var(--color-foreground)" }}>)</span>
      </div>
    </div>
  );
}

const SNIPPETS: Record<ExerciseNum, (props: SnippetProps) => React.JSX.Element> = {
  1: SnippetEcho,
  2: SnippetVariable,
  3: SnippetQuickMath,
  4: SnippetStoreCompute,
};

// ── XP float ──

interface XPFloatProps {
  amount: number;
  large?: boolean;
  onDone: () => void;
}

function XPFloat({ amount, large, onDone }: XPFloatProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed left-1/2 pointer-events-none z-[9999] font-[family-name:var(--font-display)] font-black xp-burst -translate-x-1/2"
      style={{
        top: large ? "42%" : "45%",
        fontSize: large ? "48px" : "32px",
        color: "var(--color-signal)",
        textShadow: "0 0 20px #6effa0, 0 0 60px rgba(110,255,160,.5)",
      }}
    >
      +{amount} XP
    </div>
  );
}

// ── Success flash overlay ──

interface SuccessFlashProps {
  label: string;
  large?: boolean;
}

function SuccessFlash({ label, large }: SuccessFlashProps) {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9990] flex items-center justify-center"
      style={{ animation: "cinematic-fade-in 80ms ease forwards" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: large
            ? "radial-gradient(ellipse at center, rgba(110,255,160,.12) 0%, transparent 70%)"
            : "radial-gradient(ellipse at center, rgba(110,255,160,.07) 0%, transparent 65%)",
          animation: "pulse-dim-kf 600ms ease-in-out 1",
        }}
      />
      <div
        className="font-[family-name:var(--font-display)] tracking-[6px] font-black xp-burst"
        style={{
          fontSize: large ? "28px" : "18px",
          color: "var(--color-signal)",
          textShadow: "0 0 14px #6effa0, 0 0 40px rgba(110,255,160,.4)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ── Validators ──

const VALIDATORS: Record<ExerciseNum, (value: string) => boolean> = {
  1: (v) => v.trim().includes('fmt.Println("hello")'),
  2: (v) => v.includes("name :=") && v.includes("fmt.Println(name)"),
  3: (v) => {
    const t = v.trim();
    // Accept fmt.Println(3 + 7) or fmt.Println(3+7) or fmt.Println(10)
    return (
      t.includes("fmt.Println") &&
      (t.includes("3 + 7") || t.includes("3+7") || t.includes("(10)"))
    );
  },
  4: (v) => {
    return (
      v.includes("a :=") &&
      v.includes("b :=") &&
      v.includes("fmt.Println(a + b)")
    );
  },
};

// ── Main component ──

export function Warmup({ fontScale, onFontScaleChange, onComplete }: WarmupProps) {
  const [exercise, setExercise] = useState<ExerciseNum>(1);
  const [exState, setExState] = useState<ExerciseState>("idle");
  const [showXP, setShowXP] = useState(false);

  const attemptsRef = useRef<Record<ExerciseNum, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });

  const [inputs, setInputs] = useState<Record<ExerciseNum, string>>({
    1: "",
    2: "",
    3: "",
    4: "",
  });

  const [shake, setShake] = useState(false);
  const exerciseStartRef = useRef(Date.now());

  useEffect(() => {
    trackWarmupStart();
  }, []);

  // Reset timer when exercise changes
  useEffect(() => {
    exerciseStartRef.current = Date.now();
  }, [exercise]);

  const setInput = useCallback((ex: ExerciseNum, value: string) => {
    setInputs((prev) => ({ ...prev, [ex]: value }));
  }, []);

  // ── Generic submit ──

  const handleSubmit = useCallback(() => {
    if (exState !== "idle") return;
    attemptsRef.current[exercise] += 1;

    if (!VALIDATORS[exercise](inputs[exercise])) {
      trackWarmupError(exercise, inputs[exercise]);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    const timeMs = Date.now() - exerciseStartRef.current;
    trackWarmupExercise(exercise, attemptsRef.current[exercise], timeMs);
    setExState("success");
    setShowXP(true);

    const isLast = exercise === TOTAL_EXERCISES;
    const delay = isLast ? 1200 : 800;

    setTimeout(() => {
      if (isLast) {
        trackWarmupComplete(false);
        onComplete();
      } else {
        setExState("advancing");
        setShowXP(false);
        setExercise((exercise + 1) as ExerciseNum);
        setExState("idle");
      }
    }, delay);
  }, [exState, exercise, inputs, onComplete]);

  // ── Key handlers ──

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const config = EXERCISES[exercise];
      if (config.multiline) {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          handleSubmit();
        }
      } else {
        if (e.key === "Enter") handleSubmit();
      }
    },
    [exercise, handleSubmit]
  );

  const handleSkip = useCallback(() => {
    trackWarmupSkipExercise(exercise);
    trackWarmupComplete(true);
    onComplete();
  }, [exercise, onComplete]);

  // ── Render ──

  const config = EXERCISES[exercise];
  const isSuccess = exState === "success";
  const isLast = exercise === TOTAL_EXERCISES;
  const isLastSuccess = isSuccess && isLast;
  const SnippetComponent = SNIPPETS[exercise];
  const textSize = `${Math.round(12 * fontScale)}px`;
  const codeSize = `${Math.round(12 * fontScale)}px`;

  return (
    <>
      {showXP && (
        <XPFloat
          amount={config.xp}
          large={isLast}
          onDone={() => setShowXP(false)}
        />
      )}

      {isSuccess && (
        <SuccessFlash
          label={config.successLabel}
          large={isLastSuccess}
        />
      )}

      {/* Scanline */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <div
          className="absolute w-full h-px"
          style={{
            background:
              "linear-gradient(transparent, rgba(110,255,160,.07), transparent)",
            animation: "scanline 7s linear infinite",
          }}
        />
      </div>

      {/* Screen */}
      <div
        className="min-h-dvh flex flex-col items-center justify-center px-5"
        style={{
          background: "var(--color-background)",
          backgroundImage: isLastSuccess
            ? "radial-gradient(ellipse at 50% 50%, rgba(110,255,160,.06) 0%, transparent 60%)"
            : "radial-gradient(ellipse at 50% 110%, rgba(0,60,20,.15) 0%, transparent 60%)",
          transition: "background-image 600ms ease",
        }}
      >
        {/* Grid overlay */}
        <div
          className="fixed inset-0 opacity-[.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,255,80,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,80,.3) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative w-full max-w-[860px]">
          {/* Step indicator + font controls */}
          <div className="absolute top-0 right-0 -translate-y-10 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => { const s = Math.max(FONT_SCALE_MIN, fontScale - FONT_SCALE_STEP); onFontScaleChange(s); trackWarmupFontScale(s); }}
                disabled={fontScale <= FONT_SCALE_MIN}
                className="bg-transparent text-[10px] px-1.5 py-0.5 cursor-pointer transition-colors
                           hover:bg-[rgba(110,255,160,.05)] disabled:opacity-20 disabled:cursor-default"
                style={{
                  color: "var(--color-dim)",
                  border: "1px solid rgba(110,255,160,.1)",
                }}
              >
                A−
              </button>
              <button
                onClick={() => { const s = Math.min(FONT_SCALE_MAX, fontScale + FONT_SCALE_STEP); onFontScaleChange(s); trackWarmupFontScale(s); }}
                disabled={fontScale >= FONT_SCALE_MAX}
                className="bg-transparent text-[10px] px-1.5 py-0.5 cursor-pointer transition-colors
                           hover:bg-[rgba(110,255,160,.05)] disabled:opacity-20 disabled:cursor-default"
                style={{
                  color: "var(--color-dim)",
                  border: "1px solid rgba(110,255,160,.1)",
                }}
              >
                A+
              </button>
            </div>
            <div
              className="text-[8px] tracking-[3px]"
              style={{ color: "var(--color-dim)" }}
            >
              {exercise}/{TOTAL_EXERCISES}
            </div>
          </div>

          {/* Header */}
          <div
            className="mb-8"
            style={{ animation: "intro-in .6s ease forwards" }}
          >
            <div
              className="text-[8px] tracking-[5px] mb-2"
              style={{ color: "var(--color-dim)" }}
            >
              ▸ SIGNAL WARMUP
            </div>
            <div
              className="font-[family-name:var(--font-display)] font-black tracking-[4px] leading-none"
              style={{
                fontSize: "clamp(22px, 5vw, 36px)",
                color: "var(--color-signal)",
                textShadow:
                  "0 0 16px rgba(110,255,160,.3), 0 0 40px rgba(110,255,160,.1)",
              }}
            >
              {config.title}
            </div>
          </div>

          {/* Maya message */}
          <div
            className="mb-6 msg-enter"
            key={`maya-${exercise}`}
          >
            <div
              className="text-[8px] tracking-[3px] mb-2"
              style={{ color: "var(--color-dim)" }}
            >
              MAYA //
            </div>
            <p
              className="leading-[1.7]"
              style={{ fontSize: textSize, color: "var(--color-dim)", transition: "font-size 150ms ease" }}
            >
              {config.maya}
            </p>
          </div>

          {/* Code snippet to reproduce */}
          <div
            className="mb-6 p-4 border"
            style={{
              background: "var(--color-code-bg)",
              borderColor: "var(--color-border)",
              borderLeft: "3px solid var(--color-dim)",
            }}
          >
            <div
              className="text-[7px] tracking-[3px] mb-3"
              style={{ color: "var(--color-dim)" }}
            >
              TARGET
            </div>
            <SnippetComponent fontSize={codeSize} />
          </div>

          {/* Input area */}
          <div
            className="mb-6"
            style={shake ? { animation: "boss-shake 300ms ease" } : {}}
          >
            <div
              className="text-[7px] tracking-[3px] mb-2"
              style={{ color: "var(--color-dim)" }}
            >
              YOUR CODE
            </div>

            {config.multiline ? (
              <textarea
                rows={3}
                value={inputs[exercise]}
                onChange={(e) => setInput(exercise, e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={(e) => e.preventDefault()}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                placeholder={config.placeholder}
                className="w-full bg-transparent outline-none resize-none font-[family-name:var(--font-mono)] leading-relaxed placeholder:opacity-20"
                style={{
                  fontSize: codeSize,
                  color: "var(--color-signal)",
                  borderBottom: `2px solid ${
                    isSuccess ? "var(--color-signal)" : "rgba(110,255,160,.4)"
                  }`,
                  caretColor: "var(--color-signal)",
                  transition: "border-color 200ms ease, font-size 150ms ease",
                }}
              />
            ) : (
              <input
                type="text"
                value={inputs[exercise]}
                onChange={(e) => setInput(exercise, e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={(e) => e.preventDefault()}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                placeholder={config.placeholder}
                className="w-full bg-transparent outline-none font-[family-name:var(--font-mono)] placeholder:opacity-20"
                style={{
                  fontSize: codeSize,
                  color: "var(--color-signal)",
                  borderBottom: `2px solid ${
                    isSuccess ? "var(--color-signal)" : "rgba(110,255,160,.4)"
                  }`,
                  caretColor: "var(--color-signal)",
                  paddingBottom: "6px",
                  transition: "border-color 200ms ease, font-size 150ms ease",
                }}
              />
            )}
          </div>

          {/* Submit button */}
          <div className="mb-6">
            <button
              onClick={handleSubmit}
              disabled={exState !== "idle"}
              className="border py-2 px-6 font-[family-name:var(--font-display)] font-bold tracking-[3px] text-[10px] transition-colors"
              style={{
                borderColor:
                  exState !== "idle"
                    ? "rgba(110,255,160,.2)"
                    : "var(--color-signal)",
                color:
                  exState !== "idle"
                    ? "rgba(110,255,160,.4)"
                    : "var(--color-signal)",
                background: "transparent",
                cursor: exState !== "idle" ? "not-allowed" : "pointer",
              }}
            >
              RUN
            </button>
            <span
              className="text-[8px] tracking-[2px] ml-3"
              style={{ color: "var(--color-dim)" }}
            >
              {config.multiline ? "or ⌘+ENTER" : "or ENTER"}
            </span>
          </div>

          {/* Status line */}
          <div className="h-5 mb-4">
            {isSuccess ? (
              <div
                className="text-[9px] tracking-[3px] msg-enter"
                style={{
                  color: "var(--color-signal)",
                  textShadow: "0 0 8px rgba(110,255,160,.5)",
                }}
              >
                {config.successLabel}&nbsp;&nbsp;
                <span style={{ color: "var(--color-dim)" }}>
                  +{config.xp} XP
                </span>
              </div>
            ) : (
              <div
                className="text-[8px] tracking-[2px] cursor-blink"
                style={{ color: "rgba(26,90,74,.5)" }}
              >
                █
              </div>
            )}
          </div>

          {/* Progress dots */}
          <div className="flex gap-2 mb-8">
            {Array.from({ length: TOTAL_EXERCISES }, (_, i) => i + 1).map((n) => (
              <div
                key={n}
                className="h-px flex-1"
                style={{
                  background:
                    n < exercise
                      ? "var(--color-signal)"
                      : n === exercise
                        ? "rgba(110,255,160,.5)"
                        : "var(--color-border)",
                  transition: "background 400ms ease",
                }}
              />
            ))}
          </div>

          {/* Skip link */}
          <div className="flex justify-end">
            <button
              onClick={handleSkip}
              className="bg-transparent border-0 cursor-pointer text-[8px] tracking-[2px]"
              style={{ color: "var(--color-dim)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--color-foreground)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--color-dim)";
              }}
            >
              skip warmup ▸
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
