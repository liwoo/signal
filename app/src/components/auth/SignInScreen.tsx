"use client";

/**
 * The gate before play. Google sign-in is required to start — progress is tied
 * to the signed-in agent so it follows them across devices.
 */

import { useState } from "react";
import { useAuth } from "./AuthProvider";

export function SignInScreen() {
  const { signInWithGoogle, authAvailable } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGoogle() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      // On success the browser redirects to Google, so this frame unloads.
    } catch {
      setError("signal lost. try again.");
      setBusy(false);
    }
  }

  return (
    <div
      className="h-dvh flex items-center justify-center p-6"
      style={{ background: "var(--color-background)" }}
    >
      <div className="w-full max-w-[420px]">
        {/* Title */}
        <div
          className="text-center mb-6 opacity-0"
          style={{ animation: "intro-in .6s ease forwards" }}
        >
          <div
            className="font-[family-name:var(--font-display)] font-bold text-[var(--color-signal)] leading-none"
            style={{ fontSize: "clamp(32px, 9vw, 60px)" }}
          >
            SIGNAL
          </div>
          <div className="text-[#1a6a3a] text-[9px] tracking-[5px] mt-1.5">
            IDENTIFY TO PROCEED
          </div>
        </div>

        {/* Framing */}
        <div
          className="border border-[#0a2a1a] border-l-[3px] border-l-[#2a8a5a] p-3.5 mb-4 opacity-0"
          style={{
            background: "rgba(0,255,80,.015)",
            animation: "intro-in .6s ease .15s forwards",
          }}
        >
          <div className="text-[#1a6a4a] text-[8px] tracking-[3px] mb-2">
            ▸ SECURE CHANNEL REQUIRED
          </div>
          <p className="text-[#3a7a5a] text-xs leading-[1.8]">
            maya&apos;s escape data needs a secure backup.
          </p>
          <p className="text-[var(--color-signal)] text-xs leading-[1.8] mt-1.5">
            sign in to save your progress to the cloud and pick up on any device.
          </p>
        </div>

        {/* CTA */}
        <div className="opacity-0" style={{ animation: "intro-in .6s ease .3s forwards" }}>
          <button
            type="button"
            onClick={onGoogle}
            disabled={busy || !authAvailable}
            className="w-full py-3.5 bg-transparent border-2 border-[var(--color-signal)]
                       text-[var(--color-signal)] font-[family-name:var(--font-display)]
                       text-xs tracking-[4px] cursor-pointer
                       hover:bg-[var(--color-signal)] hover:text-[var(--color-background)]
                       transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? "CONNECTING…" : "CONTINUE WITH GOOGLE"}
          </button>

          {!authAvailable && (
            <div className="text-center mt-3 text-[var(--color-alert)] text-[9px] tracking-[2px] leading-[1.7]">
              CLOUD BACKUP OFFLINE — AUTH NOT CONFIGURED
            </div>
          )}
          {error && (
            <div className="text-center mt-3 text-[var(--color-alert)] text-[9px] tracking-[2px]">
              {error.toUpperCase()}
            </div>
          )}

          <div className="text-center mt-3 text-[#0a3a2a] text-[8px] tracking-[2px]">
            PROGRESS SYNCS TO YOUR AGENT ID{" "}
            <span className="cursor-blink">█</span>
          </div>
        </div>
      </div>
    </div>
  );
}
