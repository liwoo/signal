"use client";

import { useState, useEffect, useCallback } from "react";
import { trackMobileEmailCapture } from "@/lib/analytics";

const MIN_WIDTH = 768;

type FormState = "idle" | "submitting" | "sent" | "error";

export function MobileGate({ children }: { children: React.ReactNode }) {
  const [tooSmall, setTooSmall] = useState(false);
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    function check() {
      setTooSmall(window.innerWidth < MIN_WIDTH);
      setChecked(true);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setValidationError("");

      const trimmed = email.trim();
      if (!trimmed) {
        setValidationError("email address required.");
        return;
      }
      // Basic RFC-ish check — good enough for a capture form
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setValidationError("that doesn't look like a valid email.");
        return;
      }

      setFormState("submitting");

      try {
        // TODO: send email — POST to /api/waitlist or a transactional email provider
        trackMobileEmailCapture(trimmed);
        setFormState("sent");
      } catch {
        setFormState("error");
      }
    },
    [email]
  );

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

        <div className="max-w-[340px] w-full text-center">
          {/* Logo */}
          <div
            className="font-[family-name:var(--font-display)] font-black tracking-[6px] leading-none glow-pulse mb-6"
            style={{
              color: "var(--color-signal)",
              fontSize: "clamp(36px, 10vw, 52px)",
            }}
          >
            SIGNAL
          </div>

          {/* Status label */}
          <div
            className="text-[9px] tracking-[4px] mb-5"
            style={{ color: "var(--color-dim)" }}
          >
            ▸ DEVICE CHECK FAILED
          </div>

          {/* Headline */}
          <h1
            className="font-[family-name:var(--font-display)] font-bold tracking-[2px] mb-3"
            style={{
              color: "var(--color-foreground)",
              fontSize: "clamp(13px, 4vw, 16px)",
            }}
          >
            SIGNAL REQUIRES A KEYBOARD
          </h1>

          {/* Subtext */}
          <p
            className="text-[12px] leading-[1.8] mb-8"
            style={{ color: "var(--color-dim)" }}
          >
            enter your email and we'll send you a link to play on your laptop.
          </p>

          {/* Email capture form / confirmation */}
          {formState === "sent" ? (
            <div
              className="border p-5 mb-6"
              style={{
                borderColor: "rgba(110,255,160,.2)",
                background: "rgba(110,255,160,.03)",
              }}
            >
              <div
                className="text-[8px] tracking-[3px] mb-2"
                style={{ color: "var(--color-signal)" }}
              >
                ▸ TRANSMISSION QUEUED
              </div>
              <p
                className="text-[12px] leading-[1.8]"
                style={{ color: "var(--color-foreground)" }}
              >
                link sent. check your inbox.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mb-6">
              {/* Email field — bottom border only, terminal aesthetic */}
              <div className="mb-4 text-left">
                <label
                  htmlFor="mobile-email"
                  className="text-[8px] tracking-[3px] block mb-2"
                  style={{ color: "var(--color-dim)" }}
                >
                  ▸ EMAIL ADDRESS
                </label>
                <input
                  id="mobile-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setValidationError("");
                    if (formState === "error") setFormState("idle");
                  }}
                  placeholder="you@example.com"
                  className="w-full bg-transparent outline-none text-[13px] py-2 px-0 border-b"
                  style={{
                    color: "var(--color-signal)",
                    borderColor: validationError
                      ? "var(--color-danger)"
                      : "rgba(110,255,160,.3)",
                    caretColor: "var(--color-signal)",
                    fontFamily: "var(--font-mono)",
                  }}
                  aria-describedby={
                    validationError ? "email-error" : undefined
                  }
                  disabled={formState === "submitting"}
                />
                {validationError && (
                  <p
                    id="email-error"
                    className="text-[10px] mt-2"
                    style={{ color: "var(--color-danger)" }}
                    role="alert"
                  >
                    {validationError}
                  </p>
                )}
                {formState === "error" && (
                  <p
                    className="text-[10px] mt-2"
                    style={{ color: "var(--color-danger)" }}
                    role="alert"
                  >
                    something went wrong. try again.
                  </p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={formState === "submitting"}
                className="w-full border py-3 px-6 font-[family-name:var(--font-display)] font-bold tracking-[3px] text-[11px] transition-colors"
                style={{
                  borderColor:
                    formState === "submitting"
                      ? "rgba(110,255,160,.2)"
                      : "var(--color-signal)",
                  color:
                    formState === "submitting"
                      ? "rgba(110,255,160,.4)"
                      : "var(--color-signal)",
                  background: "transparent",
                  cursor:
                    formState === "submitting" ? "not-allowed" : "pointer",
                }}
              >
                {formState === "submitting" ? "SENDING..." : "SEND LINK"}
              </button>
            </form>
          )}

          {/* Fallback bookmark link */}
          <p
            className="text-[10px] leading-[1.7]"
            style={{ color: "rgba(110,255,160,.25)" }}
          >
            or{" "}
            <span
              className="underline underline-offset-2 cursor-pointer"
              style={{ color: "rgba(110,255,160,.4)" }}
              onClick={() => {
                if (typeof window !== "undefined") {
                  // Prompt the user's browser bookmark affordance isn't scriptable;
                  // copying the URL is the best we can do programmatically.
                  navigator.clipboard
                    ?.writeText(window.location.href)
                    .catch(() => undefined);
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") e.currentTarget.click();
              }}
            >
              bookmark this page
            </span>{" "}
            and open on desktop
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
