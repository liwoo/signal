import Link from "next/link";
import type { ReactNode } from "react";
import { COMPANY, LEGAL_LAST_UPDATED, SUPPORT_EMAIL } from "@/lib/site";

export interface LegalSection {
  /** Anchor id, e.g. "cookies" → /privacy#cookies. */
  id: string;
  title: string;
  body: ReactNode;
}

/** Shared shell for /privacy and /terms — server-rendered, readable without JS. */
export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-dvh" style={{ background: "var(--color-background)" }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(var(--signal-rgb),.015) 2px, rgba(var(--signal-rgb),.015) 4px)",
        }}
      />

      <main className="relative max-w-[680px] mx-auto px-4 py-10">
        <Link
          href="/"
          className="text-[12px] tracking-[2px]"
          style={{ color: "var(--color-foreground)", opacity: 0.8, textDecoration: "none" }}
        >
          ◂ BACK
        </Link>

        <header className="text-center mt-8 mb-10">
          <h1
            className="font-[family-name:var(--font-display)] font-black tracking-[4px] mb-2"
            style={{ fontSize: "22px", color: "var(--color-signal)" }}
          >
            {title}
          </h1>
          <p className="text-[13px]" style={{ color: "var(--color-foreground)", opacity: 0.8 }}>
            Last updated: {LEGAL_LAST_UPDATED}
          </p>
        </header>

        <div className="text-[14px] leading-[1.8] mb-8" style={{ color: "var(--color-foreground)", opacity: 0.9 }}>
          {intro}
        </div>

        <nav aria-label="Sections" className="mb-8">
          <ol className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} style={{ color: "var(--color-signal)" }}>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-7">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-6">
              <h2
                className="font-[family-name:var(--font-display)] text-[12px] tracking-[2px] font-bold mb-2"
                style={{ color: "var(--color-foreground)" }}
              >
                {section.title.toUpperCase()}
              </h2>
              <div
                className="legal-body text-[14px] leading-[1.85] pl-3 flex flex-col gap-3"
                style={{
                  color: "var(--color-foreground)",
                  opacity: 0.85,
                  borderLeft: "2px solid rgba(var(--signal-rgb),.15)",
                }}
              >
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <aside
          className="mt-10 px-4 py-4 text-center"
          style={{ border: "1px solid rgba(var(--signal-rgb),.15)", background: "rgba(var(--signal-rgb),.03)" }}
        >
          <p className="text-[12px] tracking-[1px] mb-1" style={{ color: "var(--color-foreground)", opacity: 0.85 }}>
            QUESTIONS? CONTACT {COMPANY.toUpperCase()}
          </p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[14px]" style={{ color: "var(--color-signal)" }}>
            {SUPPORT_EMAIL}
          </a>
        </aside>

        <nav aria-label="Legal" className="flex justify-center gap-6 mt-8 text-[12px] tracking-[2px]">
          <Link href="/privacy" style={{ color: "var(--color-signal)" }}>
            PRIVACY
          </Link>
          <Link href="/terms" style={{ color: "var(--color-signal)" }}>
            TERMS
          </Link>
          <Link href="/play" style={{ color: "var(--color-signal)" }}>
            PLAY
          </Link>
        </nav>
      </main>
    </div>
  );
}
