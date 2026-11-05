"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { browserTimeZone, shouldShowConsentBanner } from "@/lib/consent";
import { applyAnalyticsConsent } from "@/lib/firebase";
import { loadAnalyticsConsent, saveAnalyticsConsent, type AnalyticsConsent } from "@/lib/storage/local";

// A tiny store so the banner, and the "cookie settings" button on /privacy,
// see the same choice without a provider.
const listeners = new Set<() => void>();
let reopened = false;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function notify() {
  listeners.forEach((fn) => fn());
}

function bannerVisible(): boolean {
  return reopened || shouldShowConsentBanner(loadAnalyticsConsent(), browserTimeZone());
}

function choose(consent: AnalyticsConsent) {
  saveAnalyticsConsent(consent);
  applyAnalyticsConsent(consent === "granted");
  reopened = false;
  notify();
}

/** Reopen the banner so anyone can change their analytics choice. */
export function openCookieSettings() {
  reopened = true;
  notify();
}

/**
 * Analytics cookie banner. Shown to EU/EEA/UK visitors (by time zone) until
 * they choose; Firebase Analytics stays off until they accept. Everyone else
 * can still opt out from /privacy.
 */
export function CookieConsent() {
  const visible = useSyncExternalStore(subscribe, bannerVisible, () => false);
  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[1000] p-3 sm:p-4"
    >
      <div
        className="mx-auto flex max-w-[760px] flex-col gap-3 border p-4 sm:flex-row sm:items-center"
        style={{
          background: "var(--color-background)",
          borderColor: "rgba(var(--signal-rgb),.35)",
          color: "var(--color-foreground)",
        }}
      >
        <p className="flex-1 text-[13px] leading-[1.7]">
          SIGNAL uses Firebase Analytics cookies to see which levels players get stuck on. They&apos;re off unless you
          allow them. Sign-in and saving progress work either way.{" "}
          <Link href="/privacy#cookies" className="underline" style={{ color: "var(--color-signal)" }}>
            Privacy policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="cursor-pointer border px-4 py-2 text-[12px] tracking-[1px]"
            style={{ borderColor: "rgba(var(--signal-rgb),.35)", color: "var(--color-foreground)", background: "transparent" }}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="cursor-pointer border px-4 py-2 text-[12px] tracking-[1px]"
            style={{ borderColor: "var(--color-signal)", color: "var(--color-background)", background: "var(--color-signal)" }}
          >
            Allow analytics
          </button>
        </div>
      </div>
    </div>
  );
}

/** "Cookie settings" link for /privacy — reopens the banner for anyone. */
export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="cursor-pointer underline"
      style={{ color: "var(--color-signal)", background: "transparent" }}
    >
      Change cookie settings
    </button>
  );
}
