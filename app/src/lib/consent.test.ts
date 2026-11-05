import { describe, expect, it } from "vitest";
import { analyticsAllowed, requiresAnalyticsConsent, shouldShowConsentBanner } from "./consent";

describe("requiresAnalyticsConsent", () => {
  it("covers EU, EEA and UK time zones", () => {
    for (const tz of ["Europe/London", "Europe/Berlin", "Europe/Dublin", "Atlantic/Canary", "Atlantic/Reykjavik"]) {
      expect(requiresAnalyticsConsent(tz)).toBe(true);
    }
  });

  it("skips visitors elsewhere, and unknown zones", () => {
    for (const tz of ["America/New_York", "Africa/Blantyre", "Asia/Tokyo", undefined]) {
      expect(requiresAnalyticsConsent(tz)).toBe(false);
    }
  });
});

describe("analyticsAllowed", () => {
  it("waits for opt-in in consent regions", () => {
    expect(analyticsAllowed(null, "Europe/Paris")).toBe(false);
    expect(analyticsAllowed("granted", "Europe/Paris")).toBe(true);
  });

  it("defaults on elsewhere, but an explicit refusal always wins", () => {
    expect(analyticsAllowed(null, "America/Chicago")).toBe(true);
    expect(analyticsAllowed("denied", "America/Chicago")).toBe(false);
  });
});

describe("shouldShowConsentBanner", () => {
  it("shows once, only in consent regions", () => {
    expect(shouldShowConsentBanner(null, "Europe/London")).toBe(true);
    expect(shouldShowConsentBanner("denied", "Europe/London")).toBe(false);
    expect(shouldShowConsentBanner(null, "America/Chicago")).toBe(false);
  });
});
