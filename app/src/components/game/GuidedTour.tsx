"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { trackTourStart, trackTourStep, trackTourSkip, trackTourComplete } from "@/lib/analytics";

interface TourStep {
  target: string;       // data-tour attribute value to find the element
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
}

const STEPS: TourStep[] = [
  {
    target: "chat-panel",
    title: "MAYA'S TERMINAL",
    description: "maya talks to you here. she'll guide you through each challenge, react to your code, and warn you when things go wrong. type messages back to ask for hints.",
    position: "right",
  },
  {
    target: "code-editor",
    title: "CODE EDITOR",
    description: "write your Go code here. maya's survival depends on what you type. when you're ready, hit TRANSMIT to compile and run it.",
    position: "left",
  },
  {
    target: "fmt-btn",
    title: "FORMAT",
    description: "cleans up your code with gofmt before you submit. fixes spacing, indentation, and style so you can focus on logic, not formatting.",
    position: "top",
  },
  {
    target: "transmit-btn",
    title: "TRANSMIT",
    description: "sends your code to the Go compiler. if it compiles and passes the challenge, maya moves forward. if not, she'll tell you what went wrong.",
    position: "top",
  },
  {
    target: "tab-bar",
    title: "MISSION / LIBRARY / NOTES",
    description: "switch between your code, the mission brief, your zen library, and notes. the mission tab shows what maya needs you to build. hit NOTES any time to review what you learned in the tutorial.",
    position: "bottom",
  },
  {
    target: "top-bar",
    title: "STATUS",
    description: "your XP, level, hearts, and the countdown timer. lose all hearts and maya gets captured. move fast — the clock is ticking.",
    position: "bottom",
  },
];

interface GuidedTourProps {
  onComplete: () => void;
}

export function GuidedTour({ onComplete }: GuidedTourProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef(0);

  const current = STEPS[step];

  const hasFiredStart = useRef(false);

  // Find and track the target element position
  const updateRect = useCallback(() => {
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (el) {
      setRect(el.getBoundingClientRect());
      if (!visible) {
        setVisible(true);
        if (!hasFiredStart.current) {
          hasFiredStart.current = true;
          trackTourStart();
        }
      }
    }
  }, [current.target, visible]);

  useEffect(() => {
    // Small delay to let layout settle
    const timer = setTimeout(updateRect, 100);
    // Track on resize
    window.addEventListener("resize", updateRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateRect);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updateRect]);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      const nextStep = step + 1;
      trackTourStep(nextStep, STEPS[nextStep].target);
      setVisible(false);
      setRect(null);
      setStep(nextStep);
    } else {
      trackTourComplete();
      onComplete();
    }
  }, [step, onComplete]);

  const skip = useCallback(() => {
    trackTourSkip(step);
    onComplete();
  }, [step, onComplete]);

  if (!rect || !visible) return null;

  // Tooltip positioning
  const PAD = 12;
  const TOOLTIP_W = 320;
  const pos = current.position;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const MARGIN = 12; // min distance from viewport edge

  let tooltipStyle: React.CSSProperties = { width: TOOLTIP_W };

  if (pos === "right") {
    const idealLeft = rect.right + PAD;
    // If it overflows right, flip to left
    if (idealLeft + TOOLTIP_W > vw - MARGIN) {
      tooltipStyle.right = vw - rect.left + PAD;
    } else {
      tooltipStyle.left = idealLeft;
    }
    tooltipStyle.top = Math.max(MARGIN, Math.min(rect.top + rect.height / 2, vh - MARGIN));
    tooltipStyle.transform = "translateY(-50%)";
  } else if (pos === "left") {
    tooltipStyle.right = vw - rect.left + PAD;
    tooltipStyle.top = Math.max(MARGIN, Math.min(rect.top + rect.height / 2, vh - MARGIN));
    tooltipStyle.transform = "translateY(-50%)";
  } else if (pos === "bottom") {
    // Center on target, but clamp to viewport
    const idealLeft = rect.left + rect.width / 2 - TOOLTIP_W / 2;
    tooltipStyle.left = Math.max(MARGIN, Math.min(idealLeft, vw - TOOLTIP_W - MARGIN));
    tooltipStyle.top = rect.bottom + PAD;
  } else {
    // "top" — center on target, clamp to viewport
    const idealLeft = rect.left + rect.width / 2 - TOOLTIP_W / 2;
    tooltipStyle.left = Math.max(MARGIN, Math.min(idealLeft, vw - TOOLTIP_W - MARGIN));
    tooltipStyle.bottom = vh - rect.top + PAD;
  }

  // Spotlight cutout dimensions
  const SP = 6; // spotlight padding
  const cutX = rect.left - SP;
  const cutY = rect.top - SP;
  const cutW = rect.width + SP * 2;
  const cutH = rect.height + SP * 2;

  return (
    <div className="fixed inset-0 z-[900]" style={{ pointerEvents: "auto" }}>
      {/* Dark overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={cutX}
              y={cutY}
              width={cutW}
              height={cutH}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(2,4,6,0.82)"
          mask="url(#tour-mask)"
        />
        {/* Spotlight border */}
        <rect
          x={cutX}
          y={cutY}
          width={cutW}
          height={cutH}
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth="1.5"
          strokeDasharray="6 3"
          opacity="0.5"
        />
      </svg>

      {/* Tooltip */}
      <div
        className="absolute"
        style={{
          ...tooltipStyle,
          animation: "cinematic-fade-in 0.3s ease-out forwards",
        }}
      >
        <div
          style={{
            background: "#060a10",
            border: "1px solid rgba(110,255,160,.2)",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-2.5 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(110,255,160,.08)" }}
          >
            <span
              className="font-[family-name:var(--font-display)] text-[9px] tracking-[2px] font-bold"
              style={{ color: "var(--color-signal)" }}
            >
              {current.title}
            </span>
            <span
              className="text-[8px] tracking-[1px]"
              style={{ color: "var(--color-dim)" }}
            >
              {step + 1}/{STEPS.length}
            </span>
          </div>

          {/* Body */}
          <div className="px-4 py-3">
            <p
              className="text-[11px] leading-[1.8]"
              style={{ color: "var(--color-foreground)", opacity: 0.8 }}
            >
              {current.description}
            </p>
          </div>

          {/* Actions */}
          <div
            className="px-4 py-2.5 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(110,255,160,.08)" }}
          >
            <button
              onClick={skip}
              className="bg-transparent cursor-pointer text-[8px] tracking-[1px] transition-opacity hover:opacity-100"
              style={{
                color: "var(--color-dim)",
                border: "none",
                opacity: 0.6,
              }}
            >
              skip tour
            </button>
            <button
              onClick={next}
              className="bg-transparent cursor-pointer font-[family-name:var(--font-display)] text-[9px] tracking-[2px] px-4 py-1.5 transition-colors"
              style={{
                color: "var(--color-signal)",
                border: "1px solid rgba(110,255,160,.3)",
                background: "rgba(110,255,160,.05)",
              }}
            >
              {step < STEPS.length - 1 ? "NEXT" : "START MISSION"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
