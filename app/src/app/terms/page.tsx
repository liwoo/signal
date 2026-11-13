import Link from "next/link";
import type { ReactNode } from "react";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { COMPANY, PAYMENT_PROVIDER, REFUND_WINDOW_DAYS, SUPPORT_EMAIL, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Terms of Service — SIGNAL",
  description:
    "The terms for playing SIGNAL: free Act I, the one-time full Go license, payments through Creem, the 14-day refund policy, classes and acceptable use.",
  path: "/terms",
});

function A({ href, children }: { href: string; children: ReactNode }) {
  const style = { color: "var(--color-signal)", textDecoration: "underline" };
  return href.startsWith("/") ? (
    <Link href={href} style={style}>
      {children}
    </Link>
  ) : (
    <a href={href} style={style} rel="noopener noreferrer">
      {children}
    </a>
  );
}

const email = <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>;

const SECTIONS: LegalSection[] = [
  {
    id: "accounts",
    title: "Accounts",
    body: (
      <>
        <p>
          You sign in to SIGNAL with a Google account. Keep that account secure: you&apos;re responsible for what
          happens under it. One person per account; please don&apos;t share an account or a license.
        </p>
        <p>
          If you&apos;re under 13, you may use SIGNAL only with a parent&apos;s or guardian&apos;s consent, or through a
          school that has authorized it. Our <A href="/privacy#children">privacy policy</A> explains how that consent
          works.
        </p>
      </>
    ),
  },
  {
    id: "free-and-paid",
    title: "What's free and what's paid",
    body: (
      <>
        <p>Act I is free in Go, Python, JavaScript and Rust. You only need to sign in.</p>
        <p>
          The full Go license is a one-time payment that unlocks every act of the Go curriculum on your account,
          including acts we release later. SIGNAL is in active development: some acts are still being built, and their
          content may change before release. Your license lasts as long as we operate SIGNAL. It&apos;s personal and
          can&apos;t be transferred or resold.
        </p>
      </>
    ),
  },
  {
    id: "payments",
    title: "Payments",
    body: (
      <p>
        Payments are processed by {PAYMENT_PROVIDER} (Armitage Labs OÜ), which sells the license to you as merchant of
        record and handles your payment details, receipt and any sales tax. Prices are in US dollars, and taxes may be
        added at checkout depending on where you live. {PAYMENT_PROVIDER}&apos;s{" "}
        <A href="https://www.creem.io/buyer-terms">buyer terms</A> also apply to your purchase.
      </p>
    ),
  },
  {
    id: "refunds",
    title: "Refunds",
    body: (
      <>
        <p>
          If SIGNAL isn&apos;t right for you, ask for a refund within {REFUND_WINDOW_DAYS} days of purchase. Email {email}{" "}
          from the address on your receipt and include your order number. You don&apos;t need to give a reason. We
          approve refunds requested within that window, and {PAYMENT_PROVIDER} returns the money to your original
          payment method, usually within 5 to 10 business days. A refund removes the paid content from your account.
        </p>
        <p>
          After {REFUND_WINDOW_DAYS} days, we may still refund in exceptional cases, such as a duplicate charge or paid
          content you couldn&apos;t access because of a fault on our side.
        </p>
        <p>
          The license is digital content that&apos;s available as soon as you pay. At checkout, you agree that delivery
          starts immediately. Under EU and UK consumer law, that means the statutory 14-day right of withdrawal no
          longer applies. Our {REFUND_WINDOW_DAYS}-day refund policy above still does.
        </p>
        <p>
          If we can&apos;t resolve a refund request, you can contact {PAYMENT_PROVIDER} directly through its customer
          portal, as its buyer terms describe. Please contact us before opening a chargeback with your bank.
        </p>
      </>
    ),
  },
  {
    id: "classes",
    title: "Teachers and classes",
    body: (
      <p>
        Teacher accounts are for educators. Invite only students you teach. When you create a teacher account, you
        confirm that your school or organization has authorized SIGNAL for classroom use. For students under 13, you
        also confirm that the school consents on their parents&apos; behalf, for educational use only. Treat what you
        see about your students as confidential school records.
      </p>
    ),
  },
  {
    id: "use",
    title: "Acceptable use",
    body: (
      <p>
        Don&apos;t use SIGNAL to break the law, harass anyone, or submit code meant to attack, overload or misuse
        SIGNAL, the Go Playground or anyone else&apos;s systems. Don&apos;t try to get around the paywall, scrape the
        game&apos;s content or interfere with other players. We may suspend accounts that do.
      </p>
    ),
  },
  {
    id: "content",
    title: "Your code and our content",
    body: (
      <p>
        The code you write is yours. You let us store and run it to provide the game and to improve the hints, as our
        privacy policy explains. The story, characters, challenges, art, audio and software of SIGNAL belong to {COMPANY}{" "}
        and are licensed to you for personal learning, or classroom use for teachers, while you use SIGNAL.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability and liability",
    body: (
      <p>
        We work to keep SIGNAL running, but it&apos;s provided as is and may sometimes be unavailable. Third-party
        services such as the Go Playground can also go down. To the extent the law allows, {COMPANY} isn&apos;t liable
        for indirect or consequential losses. Our total liability to you is limited to what you paid us in the 12
        months before the claim. Nothing in these terms limits rights you have under consumer law that can&apos;t be
        waived.
      </p>
    ),
  },
  {
    id: "ending",
    title: "Ending your account",
    body: (
      <p>
        You can stop using SIGNAL at any time and ask us to delete your account by emailing {email}. We may suspend or
        close accounts that break these terms. If we ever shut SIGNAL down, we&apos;ll give at least 60 days&apos;
        notice by email.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    body: (
      <p>
        We may update these terms as SIGNAL changes. We&apos;ll revise the date at the top and email registered users
        about significant changes. If you keep using SIGNAL after a change takes effect, the new terms apply.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="TERMS OF SERVICE"
      intro={
        <p>
          These terms are an agreement between you and {COMPANY}, which operates SIGNAL. By signing in or buying a
          license, you agree to them and to our <A href="/privacy">privacy policy</A>.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
