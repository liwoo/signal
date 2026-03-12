export default function WhyGoPage() {
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
            WHY GO?
          </div>
          <div
            className="text-[11px]"
            style={{ color: "var(--color-foreground)", opacity: 0.6 }}
          >
            why we chose Go as the language for SIGNAL
          </div>
        </div>

        {/* Intro */}
        <div
          className="px-4 py-4 mb-6"
          style={{
            border: "1px solid rgba(110,255,160,.1)",
            borderLeft: "3px solid var(--color-signal)",
            background: "rgba(110,255,160,.02)",
          }}
        >
          <p
            className="text-[12px] leading-[1.9]"
            style={{ color: "var(--color-foreground)", opacity: 0.8 }}
          >
            Go is the fastest-growing backend language in the world. designed at
            Google, it powers infrastructure at every major tech company — Docker,
            Kubernetes, Terraform, and thousands of production APIs. it&apos;s also
            one of the best first languages to learn.
          </p>
        </div>

        {/* Reasons */}
        <div className="flex flex-col gap-4">
          {[
            {
              title: "SIMPLE BY DESIGN",
              text: "Go has 25 keywords. no classes, no inheritance, no generics complexity (until you need them). the language spec fits in your head. this means you spend time solving problems, not fighting the language.",
              stat: "25",
              statLabel: "KEYWORDS",
            },
            {
              title: "REAL COMPILER FEEDBACK",
              text: "Go's compiler catches errors before your code runs — unused variables, type mismatches, missing imports. this makes it an incredible teaching language. every error message is a lesson.",
              stat: "0",
              statLabel: "RUNTIME SURPRISES",
            },
            {
              title: "INDUSTRY DEMAND",
              text: "Go developers are among the highest-paid in the industry. the language is used by Google, Uber, Twitch, Dropbox, Cloudflare, and thousands of startups. learning Go is a direct career investment.",
              stat: "#4",
              statLabel: "MOST WANTED (STACK OVERFLOW)",
            },
            {
              title: "CONCURRENCY BUILT IN",
              text: "Goroutines and channels make concurrent programming intuitive. while other languages bolt on async/await, Go was designed for it from day one. you'll learn real concurrency in Act III.",
              stat: "1M+",
              statLabel: "GOROUTINES PER PROCESS",
            },
            {
              title: "FAST COMPILATION",
              text: "Go compiles in seconds, not minutes. in SIGNAL, your code is compiled and executed on the Go Playground in real time. no waiting, no configuration, no build tools.",
              stat: "<1s",
              statLabel: "COMPILE TIME",
            },
            {
              title: "BATTERIES INCLUDED",
              text: "Go's standard library includes HTTP servers, JSON parsing, crypto, testing, and more. you can build production software without any dependencies. Acts II-IV teach the full standard library.",
              stat: "150+",
              statLabel: "STD LIB PACKAGES",
            },
          ].map((reason) => (
            <div
              key={reason.title}
              className="px-4 py-4"
              style={{
                border: "1px solid rgba(255,255,255,.04)",
                background: "rgba(4,8,16,.4)",
              }}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div
                  className="font-[family-name:var(--font-display)] text-[11px] tracking-[2px] font-bold"
                  style={{ color: "var(--color-foreground)" }}
                >
                  {reason.title}
                </div>
                <div className="text-right shrink-0">
                  <div
                    className="font-[family-name:var(--font-display)] text-[16px] font-black"
                    style={{ color: "var(--color-signal)" }}
                  >
                    {reason.stat}
                  </div>
                  <div
                    className="text-[6px] tracking-[1px]"
                    style={{ color: "var(--color-dim)" }}
                  >
                    {reason.statLabel}
                  </div>
                </div>
              </div>
              <p
                className="text-[11px] leading-[1.8]"
                style={{ color: "var(--color-foreground)", opacity: 0.65 }}
              >
                {reason.text}
              </p>
            </div>
          ))}
        </div>

        {/* Who uses Go */}
        <div className="mt-8 mb-6">
          <div
            className="text-[9px] tracking-[3px] text-center mb-4"
            style={{ color: "var(--color-dim)" }}
          >
            COMPANIES USING GO IN PRODUCTION
          </div>
          <div
            className="flex flex-wrap justify-center gap-3"
          >
            {[
              "Google", "Uber", "Twitch", "Dropbox", "Cloudflare",
              "Docker", "Kubernetes", "Terraform", "Stripe", "Netflix",
              "PayPal", "American Express", "Meta", "Salesforce",
            ].map((name) => (
              <span
                key={name}
                className="text-[9px] tracking-[1px] px-2.5 py-1"
                style={{
                  border: "1px solid rgba(110,255,160,.08)",
                  color: "var(--color-foreground)",
                  opacity: 0.6,
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
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
            START LEARNING GO
          </a>
        </div>
      </div>
    </div>
  );
}
