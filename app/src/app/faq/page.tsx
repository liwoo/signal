"use client";

import { useState } from "react";

interface FAQItem {
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    q: "What is SIGNAL?",
    a: "SIGNAL is a narrative coding game that teaches Go programming through an escape thriller. you write real Go code to help maya chen escape a research facility. every chapter introduces new language concepts through puzzles, timed challenges, and boss fights.",
  },
  {
    q: "Do I need any coding experience?",
    a: "No. act I starts from absolute zero — your first program is a single fmt.Println call. the game introduces concepts one at a time, with beginner mode available for extra guidance before each level.",
  },
  {
    q: "Is the code I write real Go?",
    a: "Yes. your code is compiled and executed on the official Go Playground backend. you get real compiler errors, real output, and learn real Go syntax — not a simplified subset.",
  },
  {
    q: "How much is free?",
    a: "Act I (4 chapters + 1 boss fight) is completely free with no account required. this covers variables, loops, conditionals, functions, slices, and multi-return values.",
  },
  {
    q: "What does the full game include?",
    a: "4 acts, 24 chapters, and 4 boss fights covering the full Go language — from hello world to goroutines, channels, HTTP servers, generics, and production architecture. lifetime access, no subscription.",
  },
  {
    q: "How long does the full game take?",
    a: "Most players complete act I in 1-2 hours. the full curriculum (acts I-IV) covers everything you need to be a productive Go developer, typically 20-40 hours depending on your pace.",
  },
  {
    q: "What are boss fights?",
    a: "Boss fights are timed multi-file debugging challenges where you fix corrupted weapon code while a boss AI attacks maya. they test everything you've learned in the act under pressure — real compiler errors, real time limits.",
  },
  {
    q: "Can I use vim keybindings?",
    a: "Yes. vim mode is available in settings (off by default). it supports normal/insert modes, motion commands (h/j/k/l/w/b/e), editing (d/c/y/p), and visual feedback.",
  },
  {
    q: "What is the zen system?",
    a: "Zen analyzes your code for idiomatic Go patterns after each submission. writing clean, idiomatic code earns bonus XP and builds your zen library — a personal reference of Go best practices.",
  },
  {
    q: "Does it work on mobile?",
    a: "SIGNAL requires a keyboard for the coding experience. it's designed for desktop/laptop browsers. a mobile companion for reviewing your zen library and progress is planned.",
  },
  {
    q: "What browser do I need?",
    a: "Any modern browser — Chrome, Firefox, Safari, or Edge. SIGNAL uses Canvas 2D for all visuals (no WebGL required) and the Web Audio API for sound.",
  },
  {
    q: "How do teams work?",
    a: "Team licenses include a dashboard for tracking progress across all members. each seat gets full access to all content. ideal for bootcamps, university courses, or engineering teams learning Go.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div
      className="min-h-dvh"
      style={{ background: "var(--color-background)" }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(110,255,160,.015) 2px, rgba(110,255,160,.015) 4px)",
        }}
      />

      <div className="relative max-w-[640px] mx-auto px-4 py-10">
        <a
          href="/"
          className="text-[10px] tracking-[2px] transition-colors"
          style={{
            color: "var(--color-dim)",
            textDecoration: "none",
          }}
        >
          ◂ BACK
        </a>

        <div className="text-center mt-8 mb-10">
          <div
            className="font-[family-name:var(--font-display)] font-black tracking-[4px] mb-2"
            style={{ fontSize: "22px", color: "var(--color-signal)" }}
          >
            FAQ
          </div>
          <div
            className="text-[11px]"
            style={{ color: "var(--color-foreground)", opacity: 0.6 }}
          >
            frequently asked questions about SIGNAL
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full bg-transparent text-left cursor-pointer px-4 py-3 transition-colors"
                  style={{
                    border: "1px solid",
                    borderColor: isOpen
                      ? "rgba(110,255,160,.15)"
                      : "rgba(255,255,255,.04)",
                    background: isOpen
                      ? "rgba(110,255,160,.03)"
                      : "rgba(4,8,16,.4)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="text-[11px] leading-[1.6]"
                      style={{
                        color: isOpen
                          ? "var(--color-signal)"
                          : "var(--color-foreground)",
                      }}
                    >
                      {faq.q}
                    </span>
                    <span
                      className="text-[10px] shrink-0 transition-transform"
                      style={{
                        color: "var(--color-dim)",
                        transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    >
                      ▸
                    </span>
                  </div>
                </button>
                {isOpen && (
                  <div
                    className="px-4 py-3"
                    style={{
                      borderLeft: "1px solid rgba(110,255,160,.1)",
                      borderRight: "1px solid rgba(110,255,160,.1)",
                      borderBottom: "1px solid rgba(110,255,160,.1)",
                      background: "rgba(110,255,160,.015)",
                    }}
                  >
                    <p
                      className="text-[11px] leading-[1.8]"
                      style={{
                        color: "var(--color-foreground)",
                        opacity: 0.75,
                      }}
                    >
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <a
            href="/"
            className="inline-block bg-transparent py-3 px-8 font-[family-name:var(--font-display)] text-[12px] tracking-[3px] transition-colors"
            style={{
              border: "2px solid var(--color-signal)",
              color: "var(--color-signal)",
              textDecoration: "none",
            }}
          >
            GET STARTED
          </a>
        </div>
      </div>
    </div>
  );
}
