import Link from "next/link";
import type { ReactNode } from "react";

export interface WhyReason {
  title: string;
  text: string;
  /** Big figure shown on the right. Omit for reasons without a checkable number. */
  stat?: string;
  statLabel?: string;
}

export interface WhyLink {
  title: string;
  url: string;
}

const OTHER_LANGUAGES = [
  { id: "go", name: "Go", href: "/why-go" },
  { id: "python", name: "Python", href: "/why-python" },
  { id: "javascript", name: "JavaScript", href: "/why-javascript" },
] as const;

/** Shared layout for /why-go, /why-python and /why-javascript. */
export function WhyLanguagePage({
  language,
  name,
  subtitle,
  intro,
  reasons,
  usedBy,
  usedByLabel,
}: {
  language: (typeof OTHER_LANGUAGES)[number]["id"];
  name: string;
  subtitle: string;
  intro: ReactNode;
  reasons: WhyReason[];
  usedBy: WhyLink[];
  usedByLabel: string;
}) {
  const others = OTHER_LANGUAGES.filter((l) => l.id !== language);

  return (
    <div className="min-h-dvh" style={{ background: "var(--color-background)" }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(var(--signal-rgb),.015) 2px, rgba(var(--signal-rgb),.015) 4px)",
        }}
      />

      <main className="relative max-w-[640px] mx-auto px-4 py-10">
        <Link
          href="/"
          className="text-[12px] tracking-[2px]"
          style={{ color: "var(--color-foreground)", opacity: 0.8, textDecoration: "none" }}
        >
          ◂ BACK
        </Link>

        <header className="text-center mt-8 mb-10">
          <h1
            className="font-[family-name:var(--font-display)] font-black tracking-[4px] mb-2 uppercase"
            style={{ fontSize: "22px", color: "var(--color-signal)" }}
          >
            Why {name}
          </h1>
          <p className="text-[13px]" style={{ color: "var(--color-foreground)", opacity: 0.8 }}>
            {subtitle}
          </p>
        </header>

        <div
          className="px-4 py-4 mb-6 text-[14px] leading-[1.9]"
          style={{
            border: "1px solid rgba(var(--signal-rgb),.1)",
            borderLeft: "3px solid var(--color-signal)",
            background: "rgba(var(--signal-rgb),.02)",
            color: "var(--color-foreground)",
          }}
        >
          {intro}
        </div>

        <div className="flex flex-col gap-4">
          {reasons.map(({ title, stat, statLabel, text }) => (
            <section
              key={title}
              className="px-4 py-4"
              style={{ border: "1px solid rgba(var(--signal-rgb),.1)", background: "rgba(4,8,16,.4)" }}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h2
                  className="font-[family-name:var(--font-display)] text-[13px] tracking-[2px] font-bold"
                  style={{ color: "var(--color-foreground)" }}
                >
                  {title}
                </h2>
                {(stat || statLabel) && (
                  <div className="text-right shrink-0 max-w-[45%]">
                    {stat && (
                      <div
                        className="font-[family-name:var(--font-display)] text-[16px] font-black"
                        style={{ color: "var(--color-signal)" }}
                      >
                        {stat}
                      </div>
                    )}
                    {statLabel && (
                      <div
                        className="text-[11px] tracking-[1px]"
                        style={{ color: stat ? "var(--color-foreground)" : "var(--color-signal)", opacity: stat ? 0.75 : 1 }}
                      >
                        {statLabel}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[13px] leading-[1.8]" style={{ color: "var(--color-foreground)", opacity: 0.85 }}>
                {text}
              </p>
            </section>
          ))}
        </div>

        <section className="mt-8 mb-6">
          <h2
            className="text-[11px] tracking-[3px] text-center mb-4 font-normal"
            style={{ color: "var(--color-foreground)", opacity: 0.75 }}
          >
            {usedByLabel}
          </h2>
          <ul className="flex flex-wrap justify-center gap-3">
            {usedBy.map(({ title, url }) => (
              <li key={title}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[12px] tracking-[1px] px-2.5 py-1 transition-colors hover:text-[var(--color-signal)]"
                  style={{ border: "1px solid rgba(var(--signal-rgb),.15)", color: "var(--color-foreground)" }}
                >
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <div className="text-center mt-10">
          <Link
            href="/play"
            className="inline-block bg-transparent py-3 px-8 font-[family-name:var(--font-display)] text-[14px] tracking-[3px] uppercase"
            style={{ border: "2px solid var(--color-signal)", color: "var(--color-signal)", textDecoration: "none" }}
          >
            Start learning {name}
          </Link>
          <p className="mt-5 text-[13px]" style={{ color: "var(--color-foreground)", opacity: 0.85 }}>
            Prefer {others[0].name} or {others[1].name}? Act I is free in both.{" "}
            <Link href={others[0].href} style={{ color: "var(--color-signal)" }}>
              Why {others[0].name}
            </Link>
            {" · "}
            <Link href={others[1].href} style={{ color: "var(--color-signal)" }}>
              Why {others[1].name}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
