import type { AnalyticsConsent } from "@/lib/storage/local";

/**
 * Atlantic zones that belong to the EU/EEA (Canaries, Madeira, Azores,
 * Faroe, Iceland). Every `Europe/*` zone also counts — that over-includes a
 * few non-EU countries, which only means they see the banner too.
 */
const EUROPEAN_ATLANTIC_ZONES = new Set([
  "Atlantic/Canary",
  "Atlantic/Madeira",
  "Atlantic/Azores",
  "Atlantic/Faroe",
  "Atlantic/Reykjavik",
]);

/**
 * Visitors in the EU, EEA and UK must opt in before analytics cookies are set.
 * The browser's time zone stands in for location: no network lookup, no IP
 * stored, and it resolves before the first paint.
 */
export function requiresAnalyticsConsent(timeZone: string | undefined): boolean {
  if (!timeZone) return false;
  return timeZone.startsWith("Europe/") || EUROPEAN_ATLANTIC_ZONES.has(timeZone);
}

/**
 * Whether Firebase Analytics may run. An explicit choice always wins;
 * otherwise only visitors outside consent regions are opted in by default.
 */
export function analyticsAllowed(
  consent: AnalyticsConsent | null,
  timeZone: string | undefined,
): boolean {
  if (consent) return consent === "granted";
  return !requiresAnalyticsConsent(timeZone);
}

/** Show the banner when the visitor is in a consent region and hasn't chosen yet. */
export function shouldShowConsentBanner(
  consent: AnalyticsConsent | null,
  timeZone: string | undefined,
): boolean {
  return consent === null && requiresAnalyticsConsent(timeZone);
}

/** The browser's IANA time zone, or undefined on the server / if unavailable. */
export function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}
