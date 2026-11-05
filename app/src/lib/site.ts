import type { Metadata } from "next";

/** The company that operates SIGNAL — named in the footer, terms and privacy policy. */
export const COMPANY = "NxtGen Labs";

/** Where players, parents and teachers reach us (support, refunds, data requests). */
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@nxtgenlabs.com";

/** Creem is SIGNAL's payment processor and merchant of record. */
export const PAYMENT_PROVIDER = "Creem";

/** Price of the full Go license, in USD. */
export const PRICE_SINGLE = process.env.NEXT_PUBLIC_PRICE_SINGLE || "9.99";

/** Days after purchase in which a refund can be requested (see /terms). */
export const REFUND_WINDOW_DAYS = 14;

/** Shown on /privacy and /terms. Bump whenever either document changes. */
export const LEGAL_LAST_UPDATED = "November 5, 2026";

const OG_IMAGE = {
  url: "/og.jpg",
  width: 1200,
  height: 630,
  alt: 'Dr. Maya Chen pixel art avatar with speech bubble: fmt.Println("Help Me!")',
};

/**
 * Per-page title + share description. Next merges `openGraph`/`twitter`
 * shallowly, so each page re-declares the image instead of inheriting it.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "SIGNAL",
      type: "website",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
