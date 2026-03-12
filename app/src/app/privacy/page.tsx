export default function PrivacyPage() {
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
            PRIVACY POLICY
          </div>
          <div
            className="text-[11px]"
            style={{ color: "var(--color-foreground)", opacity: 0.6 }}
          >
            last updated: March 2026
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {[
            {
              title: "WHAT WE COLLECT",
              content:
                "we collect the minimum data needed to run SIGNAL: your email address (for account login), game progress (chapters completed, XP earned, zen library), and basic usage analytics (page views, feature usage). if you play Act I without an account, we collect no personal data at all.",
            },
            {
              title: "HOW WE USE YOUR DATA",
              content:
                "your email is used solely for authentication and transactional messages (purchase receipts, password resets). game progress is stored to sync across devices. usage analytics help us improve the game — we track which levels players struggle with so we can improve hints and beginner notes.",
            },
            {
              title: "ANALYTICS",
              content:
                "we use Firebase Analytics to understand how players interact with SIGNAL. this includes anonymous events like level completions, boss fight outcomes, and feature usage. analytics data is aggregated and never sold to third parties. you can disable analytics by blocking third-party scripts in your browser.",
            },
            {
              title: "CODE YOU WRITE",
              content:
                "Go code you write in SIGNAL is sent to the official Go Playground (go.dev) for compilation and execution. we do not store your code on our servers. the Go Playground is operated by Google and subject to their terms of service.",
            },
            {
              title: "LOCAL STORAGE",
              content:
                "game state (progress, settings, zen library) is stored locally in your browser using IndexedDB. this data never leaves your device unless you create an account to enable cloud sync. you can clear this data at any time through your browser settings.",
            },
            {
              title: "PAYMENTS",
              content:
                "payments are processed by Stripe. we never see or store your full card number. Stripe handles all payment data under their PCI-compliant infrastructure. we receive only a confirmation of payment and your email for receipt delivery.",
            },
            {
              title: "COOKIES",
              content:
                "SIGNAL uses only essential cookies for authentication (session tokens). we do not use advertising cookies, tracking pixels, or third-party marketing tools. no cookie consent banner needed — we simply don't track you that way.",
            },
            {
              title: "THIRD-PARTY SERVICES",
              content:
                "SIGNAL integrates with: Google (authentication via Firebase Auth), Go Playground (code compilation), Stripe (payments), and Firebase Analytics (usage metrics). each service has its own privacy policy. we share only the minimum data required for each integration.",
            },
            {
              title: "DATA RETENTION",
              content:
                "account data is retained as long as your account is active. if you delete your account, all associated data is permanently removed within 30 days. anonymous analytics data is retained in aggregate form indefinitely.",
            },
            {
              title: "YOUR RIGHTS",
              content:
                "you can request a copy of all data we hold about you, request deletion of your account and data, or opt out of analytics. contact us at jeremiah@chienda.com for any data requests. we respond within 14 days.",
            },
            {
              title: "CHILDREN",
              content:
                "SIGNAL is designed for learners of all ages. we do not knowingly collect personal data from children under 13 without parental consent. if you believe a child under 13 has created an account, contact us and we will promptly delete it.",
            },
            {
              title: "CHANGES",
              content:
                "we may update this policy as SIGNAL evolves. significant changes will be communicated via email to registered users. the latest version is always available at this page.",
            },
          ].map((section) => (
            <div key={section.title}>
              <div
                className="font-[family-name:var(--font-display)] text-[10px] tracking-[2px] font-bold mb-2"
                style={{ color: "var(--color-foreground)" }}
              >
                {section.title}
              </div>
              <p
                className="text-[11px] leading-[1.9] pl-3"
                style={{
                  color: "var(--color-foreground)",
                  opacity: 0.7,
                  borderLeft: "2px solid rgba(110,255,160,.1)",
                }}
              >
                {section.content}
              </p>
            </div>
          ))}
        </div>

        <div
          className="mt-10 px-4 py-4 text-center"
          style={{
            border: "1px solid rgba(110,255,160,.08)",
            background: "rgba(110,255,160,.02)",
          }}
        >
          <div
            className="text-[10px] tracking-[1px] mb-1"
            style={{ color: "var(--color-foreground)", opacity: 0.6 }}
          >
            QUESTIONS ABOUT YOUR DATA?
          </div>
          <div
            className="text-[11px]"
            style={{ color: "var(--color-signal)" }}
          >
            jeremiah@chienda.com
          </div>
        </div>

        <div className="text-center mt-8">
          <a
            href="/"
            className="inline-block bg-transparent py-3 px-8 font-[family-name:var(--font-display)] text-[12px] tracking-[3px] transition-colors"
            style={{
              border: "2px solid var(--color-signal)",
              color: "var(--color-signal)",
              textDecoration: "none",
            }}
          >
            BACK TO SIGNAL
          </a>
        </div>
      </div>
    </div>
  );
}
