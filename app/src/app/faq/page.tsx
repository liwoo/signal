import Link from "next/link";
import { landingCurriculum } from "@/data/landing";
import { PRICE_SINGLE, SUPPORT_EMAIL, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "FAQ — SIGNAL",
  description:
    "Answers about SIGNAL: what's free, what the full Go course costs, how Python, JavaScript and Rust work, boss fights, mobile play, and using SIGNAL with a class.",
  path: "/faq",
});

interface FAQItem {
  q: string;
  a: string;
}

function faqs(): FAQItem[] {
  const { actCount, chapterCount } = landingCurriculum();
  return [
    {
      q: "What is SIGNAL?",
      a: "SIGNAL is a narrative coding game. You write real Go, Python, JavaScript, or Rust to help Maya Chen escape a research facility. Every chapter introduces new language concepts through puzzles, timed challenges, and boss fights.",
    },
    {
      q: "Do I need any coding experience?",
      a: "No. Act I starts from zero: your first program prints a single line. The game introduces one concept at a time, and Maya's hints and the field manual are there whenever you're stuck.",
    },
    {
      q: "Is the code I write real?",
      a: "Yes. Go and Rust are compiled and run on their official Playgrounds, so you get real compiler errors and real output. Python and JavaScript run in your browser. Either way, you're learning the real language, not a simplified subset.",
    },
    {
      q: "How much is free?",
      a: "Act I (three chapters and the Lockmaster boss fight) is free in Go, Python, JavaScript, and Rust. You sign in with Google so your progress saves and follows you to any device. No credit card required.",
    },
    {
      q: "What does the full game cost?",
      a: `$${PRICE_SINGLE}, one time, for the full Go curriculum: ${actCount} acts and ${chapterCount} chapters, each act ending in a boss fight. Acts are still being released, and your license includes each one as it ships. No subscription.`,
    },
    {
      q: "What does the full Go curriculum cover?",
      a: "From your first program to structs, interfaces, error handling, goroutines and channels, HTTP clients and servers, databases, middleware, and a full web app, plus an in-game tutor and a zen library of idiomatic Go patterns.",
    },
    {
      q: "Do Python, JavaScript and Rust go beyond Act I?",
      a: "Python and JavaScript already continue into Acts II and III, with more chapters arriving. Rust is our newest route: Act I is playable now, and later acts are on the way. Act I is free in all of them.",
    },
    {
      q: "How long does it take?",
      a: "Most players finish Act I in one to two hours.",
    },
    {
      q: "What are boss fights?",
      a: "Each act ends with a boss fight that tests everything the act taught. You dodge and duck into cover, then write code to arm Maya before the boss closes in.",
    },
    {
      q: "Can I use vim keybindings?",
      a: "Yes. Vim mode is in settings (off by default). It supports normal and insert modes, motions (h/j/k/l/w/b/e), editing (d/c/y/p), and undo.",
    },
    {
      q: "What is the zen system?",
      a: "After each submission, zen checks your code for idiomatic patterns. Writing clean, idiomatic code earns bonus XP and builds your zen library, a personal reference of best practices.",
    },
    {
      q: "Does it work on mobile?",
      a: "Yes. SIGNAL has a touch-first mobile layout with a coding keyboard and saved drafts. A hardware keyboard is optional, and desktop and laptop browsers are fully supported.",
    },
    {
      q: "What browser do I need?",
      a: "Any modern browser: Chrome, Firefox, Safari, or Edge. The 3D story scenes use WebGL where it's available and fall back to 2D where it isn't.",
    },
    {
      q: "Can I use SIGNAL with my class?",
      a: "Yes. Sign in at /teach and create a teacher account with your name and school. Then create a class for each period or group. Each class gets its own 6-letter join code and invite link. Students open the link or enter the code at /join, sign in with their own Google account, and appear on your roster.",
    },
    {
      q: "What can teachers see?",
      a: "For each student: chapters cleared, the step they're on, when they last played, XP, and a timeline of passed and failed tries, hints, and game overs. Students who fail the same step 5 or more times are flagged as stuck, and you can export the roster as a CSV. Teachers can't see students' code or their chats with Maya, and can't change anyone's progress. Students can leave a class at any time.",
    },
    {
      q: "Do teachers and students need separate accounts?",
      a: "Yes. A teacher account can't join a class as a student, and a Google account that's already in a class as a student can't become a teacher. Use your school account to teach.",
    },
    {
      q: "Can students under 13 play?",
      a: "Yes, with consent. In a class, the school gives consent for educational use when the teacher sets up their account. At home, a parent or guardian needs to agree first. The privacy policy explains how.",
    },
    {
      q: "Is there team or school pricing?",
      a: `Team and school plans are coming. Act I is free for every student in the meantime. For a classroom, school, or district, email ${SUPPORT_EMAIL}.`,
    },
  ];
}

export default function FAQPage() {
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
            className="font-[family-name:var(--font-display)] font-black tracking-[4px] mb-2"
            style={{ fontSize: "22px", color: "var(--color-signal)" }}
          >
            FAQ
          </h1>
          <p className="text-[13px]" style={{ color: "var(--color-foreground)", opacity: 0.8 }}>
            frequently asked questions about SIGNAL
          </p>
        </header>

        {/* Native <details>: answers are in the HTML, so they read (and index) without JavaScript. */}
        <div className="flex flex-col gap-1">
          {faqs().map((faq) => (
            <details
              key={faq.q}
              className="group"
              style={{ border: "1px solid rgba(var(--signal-rgb),.12)", background: "rgba(4,8,16,.4)" }}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <h2
                  className="text-[13px] leading-[1.6] font-normal group-open:text-[var(--color-signal)]"
                  style={{ color: "var(--color-foreground)" }}
                >
                  {faq.q}
                </h2>
                <span
                  aria-hidden="true"
                  className="text-[12px] shrink-0 transition-transform group-open:rotate-90"
                  style={{ color: "var(--color-foreground)", opacity: 0.7 }}
                >
                  ▸
                </span>
              </summary>
              <p
                className="px-4 pb-4 text-[13px] leading-[1.8]"
                style={{ color: "var(--color-foreground)", opacity: 0.85 }}
              >
                {faq.a}
              </p>
            </details>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/play"
            className="inline-block bg-transparent py-3 px-8 font-[family-name:var(--font-display)] text-[14px] tracking-[3px]"
            style={{
              border: "2px solid var(--color-signal)",
              color: "var(--color-signal)",
              textDecoration: "none",
            }}
          >
            GET STARTED
          </Link>
        </div>
      </main>
    </div>
  );
}
