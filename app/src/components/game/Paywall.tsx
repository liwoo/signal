"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Code2,
  GraduationCap,
  MessageCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  trackPurchaseCtaClick,
  trackConsentModalView,
  trackConsentAccepted,
  trackConsentDismissed,
  trackPurchaseStart,
} from "@/lib/analytics";
import { numberWord, type LandingCurriculum } from "@/data/landing";
import { PAYMENT_PROVIDER, PRICE_SINGLE, REFUND_WINDOW_DAYS, SUPPORT_EMAIL } from "@/lib/site";
import styles from "./Paywall.module.css";

const PromoLoop = dynamic(
  () => import("@/components/promo/PromoLoop").then((mod) => mod.PromoLoop),
  {
    ssr: false,
    loading: () => (
      <div className={styles.previewLoading}>Loading game preview…</div>
    ),
  }
);

interface PaywallProps {
  /** The game's roadmap, built on the server from src/data/curriculum.ts. */
  curriculum: LandingCurriculum;
  playerXP?: number;
  playerLevel?: number;
}

// Only the individual license is sold today; team and school plans come later.
const PLAN = "single";

const LANGUAGES = [
  {
    id: "go",
    name: "Go",
    mark: "Go",
    href: "/why-go",
    detail:
      "Start with the fundamentals, then explore structs, concurrency, and more.",
  },
  {
    id: "python",
    name: "Python",
    mark: "Py",
    href: "/why-python",
    detail:
      "Practice readable syntax, loops, and functions in a language used across disciplines.",
  },
  {
    id: "javascript",
    name: "JavaScript",
    mark: "JS",
    href: "/why-javascript",
    detail:
      "Build a foundation in the language of the web, right in your browser.",
  },
] as const;

// Illustrative class. "Chapters" counts what the real dashboard counts: the
// chapters playable today in the student's language.
function sampleRoster(playable: LandingCurriculum["playableByLanguage"]) {
  return [
    { name: "Diego R.", initials: "DR", language: "Go", progress: `2 of ${playable.go}`, status: "Needs help", kind: "help" },
    { name: "Amara O.", initials: "AO", language: "Go", progress: `4 of ${playable.go}`, status: "Learning", kind: "active" },
    { name: "Priya N.", initials: "PN", language: "Python", progress: `${playable.python} of ${playable.python}`, status: "Completed", kind: "done" },
    { name: "Kwame A.", initials: "KA", language: "JavaScript", progress: `2 of ${playable.javascript}`, status: "Learning", kind: "active" },
  ];
}

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Paywall({ curriculum, playerXP, playerLevel }: PaywallProps) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState<boolean | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    getReducedMotion,
    () => true
  );
  const playing = previewPlaying ?? !reducedMotion;
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const consentRef = useRef<HTMLDialogElement>(null);
  const activePrice = PRICE_SINGLE;
  const actsWord = numberWord(curriculum.actCount);
  const roster = sampleRoster(curriculum.playableByLanguage);

  useEffect(() => {
    if (showConsent) consentRef.current?.showModal();
    else consentRef.current?.close();
  }, [showConsent]);

  const handlePurchaseClick = useCallback(() => {
    trackPurchaseCtaClick(PLAN, activePrice);
    setConsentChecked(false);
    setShowConsent(true);
    trackConsentModalView(PLAN, activePrice);
  }, [activePrice]);

  const handleConsentProceed = useCallback(() => {
    trackConsentAccepted(PLAN, activePrice);
    trackPurchaseStart(PLAN, activePrice);
    setShowConsent(false);
    // TODO: trigger Google OAuth + Creem checkout (existing purchase integration).
  }, [activePrice]);

  const handleConsentDismiss = useCallback(() => {
    trackConsentDismissed(PLAN, activePrice);
    setShowConsent(false);
  }, [activePrice]);

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.nav}`}>
          <Link href="/" className={styles.wordmark} aria-label="Signal home">
            <span aria-hidden="true">▥</span> SIGNAL
          </Link>
          <nav aria-label="Main navigation" className={styles.navLinks}>
            <a className={styles.desktopLink} href="#how-it-works">
              How it works
            </a>
            <a className={styles.desktopLink} href="#classrooms">
              For teachers
            </a>
            <a className={styles.desktopLink} href="#pricing">
              Pricing
            </a>
            <Link href="/join">Join a class</Link>
            <Link
              href="/play"
              className={`${styles.button} ${styles.smallButton}`}
            >
              Start free <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroInner}>
            <h1 id="hero-heading">SIGNAL</h1>
            <p className={styles.heroTagline}>
              learn to code by escaping.
              <span className={styles.heroCursor} aria-hidden="true">
                _
              </span>
            </p>
            <div className={styles.heroLanguages}>
              <p>ONE ESCAPE · THREE LANGUAGES</p>
              <div>
                <span>GO</span>
                <span aria-hidden="true">/</span>
                <span>PYTHON</span>
                <span aria-hidden="true">/</span>
                <span>JAVASCRIPT</span>
              </div>
            </div>
            <div className={styles.heroActions}>
              <Link href="/play" className={styles.heroPrimary}>
                PLAY FREE <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/teach" className={styles.heroSecondary}>
                <GraduationCap size={20} aria-hidden="true" /> TEACHER? SET UP A
                CLASS
              </Link>
            </div>
            <p className={styles.heroReassurance}>
              act I free · google sign-in · no credit card
            </p>
            <div className={styles.heroVisual}>
              <div
                className={styles.preview}
                aria-label="SIGNAL gameplay preview"
              >
                {playing ? (
                  <PromoLoop soundEnabled={soundEnabled} />
                ) : (
                  <div className={styles.previewPaused}>
                    <p>THE ESCAPE IS WAITING.</p>
                    <button onClick={() => setPreviewPlaying(true)}>
                      <Play size={18} aria-hidden="true" /> PLAY PREVIEW
                    </button>
                  </div>
                )}
              </div>
              {playing && (
                <div className={styles.previewControls}>
                  <button
                    onClick={() => {
                      setPreviewPlaying(false);
                      setSoundEnabled(false);
                    }}
                    aria-label="Stop preview"
                  >
                    <Pause size={15} aria-hidden="true" /> PAUSE
                  </button>
                  <button
                    onClick={() => setSoundEnabled((value) => !value)}
                    aria-label={
                      soundEnabled ? "Mute preview" : "Unmute preview"
                    }
                    aria-pressed={soundEnabled}
                  >
                    {soundEnabled ? (
                      <Volume2 size={15} aria-hidden="true" />
                    ) : (
                      <VolumeX size={15} aria-hidden="true" />
                    )}
                    {soundEnabled ? "SOUND ON" : "SOUND OFF"}
                  </button>
                </div>
              )}
            </div>
            <div className={styles.heroLinks}>
              <a href="#classrooms">
                EXPLORE CLASSROOM TOOLS <span aria-hidden="true">▸</span>
              </a>
              <Link href="/join">
                HAVE A CLASS CODE? <span aria-hidden="true">▸</span>
              </Link>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className={`${styles.section} ${styles.container}`}
          aria-labelledby="how-heading"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Learn by doing</p>
            <h2 id="how-heading">Less watching. More writing code.</h2>
            <p>
              Build understanding through practice, with a clear next step and
              support along the way.
            </p>
          </div>
          <div className={styles.threeColumns}>
            {[
              {
                icon: Code2,
                title: "Write code that actually runs",
                text: "Work with real syntax and see real output. Every challenge gives you a reason to put a new concept into practice.",
              },
              {
                icon: MessageCircle,
                title: "Get help when you’re stuck",
                text: "Use step-by-step hints and a built-in tutor to understand mistakes and work toward a solution.",
              },
              {
                icon: Check,
                title: "Build skills at your pace",
                text: "Start with the basics, practice as you go, and sign in with Google to save your progress across devices.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <article className={styles.feature} key={title}>
                <span className={styles.featureIcon}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="classrooms"
          className={styles.teacherSection}
          aria-labelledby="teacher-heading"
        >
          <div className={`${styles.container} ${styles.teacherGrid}`}>
            <div>
              <p className={styles.eyebrow}>For teachers</p>
              <h2 id="teacher-heading">
                More time teaching.
                <br />
                Less time guessing.
              </h2>
              <p className={styles.sectionDescription}>
                Give students a reason to keep practicing. See how everyone is
                progressing, and know who needs your help.
              </p>
              <ol className={styles.teacherSteps}>
                <li>
                  <span>1</span>
                  <div>
                    <h3>Create your class</h3>
                    <p>Set up a class for each group or period.</p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <h3>Share a simple join code</h3>
                    <p>Students join and choose Go, Python, or JavaScript.</p>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    <h3>See where to step in</h3>
                    <p>
                      Follow progress, repeated attempts, and completed
                      chapters.
                    </p>
                  </div>
                </li>
              </ol>
              <Link href="/teach" className={styles.button}>
                Set up your class <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <p className={styles.teacherFootnote}>
                Already have a class code?{" "}
                <Link href="/join">Join your class</Link>
              </p>
            </div>
            <div className={styles.dashboardPreview}>
              <div className={styles.dashboardHeader}>
                <span className={styles.featureIcon}>
                  <GraduationCap size={22} aria-hidden="true" />
                </span>
                <div>
                  <h3>Intro to Computer Science</h3>
                  <p>Period 3 · Class overview</p>
                </div>
                <span className={styles.exampleBadge}>Example</span>
              </div>
              <div className={styles.dashboardStats}>
                <div>
                  <strong>4</strong>
                  <span>Students</span>
                </div>
                <div>
                  <strong>2</strong>
                  <span>Learning</span>
                </div>
                <div>
                  <strong>1</strong>
                  <span>Needs help</span>
                </div>
              </div>
              <table className={styles.roster}>
                <caption className={styles.visuallyHidden}>
                  Illustrative class progress, not real student data
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Chapters done</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((row) => (
                    <tr key={row.name}>
                      <td>
                        <div className={styles.student}>
                          <span className={styles.avatar} aria-hidden="true">
                            {row.initials}
                          </span>
                          <div>
                            <strong>{row.name}</strong>
                            <span>{row.language}</span>
                          </div>
                        </div>
                      </td>
                      <td>{row.progress}</td>
                      <td>
                        <span className={styles.status} data-status={row.kind}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.teacherInsight}>
                <MessageCircle size={18} aria-hidden="true" />
                <p>
                  <strong>A little help can go a long way.</strong>
                  <br />
                  Diego has tried the same step 7 times.
                </p>
              </div>
              <p className={styles.dashboardNote}>
                Illustrative dashboard · Chapters count what’s playable today in
                each language · Students’ code and chats stay private.
              </p>
            </div>
          </div>
        </section>

        <section
          id="curriculum"
          className={`${styles.section} ${styles.container}`}
          aria-labelledby="curriculum-heading"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>What you’ll learn</p>
            <h2 id="curriculum-heading">
              Your first line is just the beginning.
            </h2>
            <p>
              Choose a language and practice the fundamentals: variables, loops,
              functions, and debugging.
            </p>
          </div>
          <div className={styles.threeColumns}>
            {LANGUAGES.map((language) => (
              <article className={styles.languageCard} key={language.name}>
                <span className={styles.languageMark} aria-hidden="true">
                  {language.mark}
                </span>
                <h3>{language.name}</h3>
                <p>{language.detail}</p>
                <p className={styles.languageNote}>
                  {language.id === "go"
                    ? `Act I free · Full course: ${curriculum.actCount} acts`
                    : "Act I free, more coming"}
                </p>
                <Link className={styles.textLink} href={language.href}>
                  Why learn {language.name}?{" "}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
          <details className={styles.curriculum}>
            <summary>
              Explore the full Go curriculum <span aria-hidden="true">+</span>
            </summary>
            <div className={styles.curriculumContent}>
              <p>
                {curriculum.actCount} acts and {curriculum.chapterCount} chapters,
                each act ending in a boss fight. Act I is free in Go, Python,
                and JavaScript. Chapters marked “Coming soon” are still being
                built.
              </p>
              {curriculum.acts.map((act) => (
                <section key={act.act} className={styles.curriculumAct}>
                  <h3>
                    Act {act.act}: {act.name}
                    {act.act === "I" && <span>Free</span>}
                  </h3>
                  <ul>
                    {act.chapters.map((chapter) => (
                      <li key={chapter.title}>
                        <strong>
                          {chapter.isBoss ? `Boss: ${chapter.title}` : chapter.title}
                        </strong>
                        <span>
                          {chapter.isBoss
                            ? "Everything from the act, under fire"
                            : chapter.concepts.join(" · ")}
                          {!chapter.playable && (
                            <em className={styles.soon}> · Coming soon</em>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </details>
        </section>

        <section
          id="pricing"
          className={styles.pricingSection}
          aria-labelledby="pricing-heading"
        >
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Simple pricing</p>
              <h2 id="pricing-heading">
                Start free. Keep going when you’re ready.
              </h2>
              <p>
                Try the first act before you buy. Full access is a one-time
                payment, with no subscription.
              </p>
            </div>
            <div className={styles.pricingGrid}>
              <article className={styles.freePlan}>
                <span className={styles.planLabel}>Try it out</span>
                <h3>Learn the basics</h3>
                <div className={styles.price}>Free</div>
                <p>Get started in Go, Python, or JavaScript.</p>
                <ul className={styles.checkList}>
                  <li>
                    <Check size={18} aria-hidden="true" /> Act I in Go, Python,
                    and JavaScript
                  </li>
                  <li>
                    <Check size={18} aria-hidden="true" /> Python and
                    JavaScript: Act I free, more coming
                  </li>
                  <li>
                    <Check size={18} aria-hidden="true" /> Built-in hints and
                    tutoring
                  </li>
                  <li>
                    <Check size={18} aria-hidden="true" /> Save progress with
                    Google sign-in
                  </li>
                </ul>
                <Link
                  href="/play"
                  className={`${styles.button} ${styles.outlineButton}`}
                >
                  Start learning free{" "}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <span className={styles.planNote}>No credit card required</span>
              </article>
              <article className={styles.paidPlan}>
                <span className={styles.planLabel}>Go further</span>
                <h3>The full Go curriculum</h3>
                <div className={styles.price}>
                  ${activePrice}
                  <span>USD / one-time</span>
                </div>
                <p>A complete learning path, from basics to advanced Go.</p>
                <ul className={styles.checkList}>
                  <li>
                    <Check size={18} aria-hidden="true" /> All {actsWord} acts of
                    the Go curriculum, as each one ships
                  </li>
                  <li>
                    <Check size={18} aria-hidden="true" /> Concurrency, web
                    servers, databases, and more
                  </li>
                  <li>
                    <Check size={18} aria-hidden="true" /> Lifetime access, no
                    recurring fees
                  </li>
                </ul>
                <button onClick={handlePurchaseClick} className={styles.button}>
                  Get full access — ${activePrice}{" "}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
                <span className={styles.planNote}>
                  Payments by {PAYMENT_PROVIDER} · {REFUND_WINDOW_DAYS}-day
                  refunds
                </span>
              </article>
            </div>
            {playerXP != null && playerLevel != null && (
              <p className={styles.playerStats}>
                Your progress: {playerXP.toLocaleString()} XP · Level{" "}
                {playerLevel}
              </p>
            )}
          </div>
        </section>

        <section
          className={`${styles.section} ${styles.container} ${styles.faqSection}`}
          aria-labelledby="faq-heading"
        >
          <div>
            <p className={styles.eyebrow}>A few useful answers</p>
            <h2 id="faq-heading">Before you begin.</h2>
            <Link className={styles.textLink} href="/faq">
              More questions? Read the FAQ{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.faqList}>
            <details>
              <summary>Do I need coding experience?</summary>
              <p>
                No. The introductory challenges start with your first program
                and build up to loops and functions. Hints and tutoring are
                available along the way.
              </p>
            </details>
            <details>
              <summary>Do I need to install anything?</summary>
              <p>
                No. SIGNAL runs in your browser. Go code runs on the Go
                Playground; Python and JavaScript run in the browser.
              </p>
            </details>
            <details>
              <summary>What’s included for free?</summary>
              <p>
                The first act is free in Go, Python, and JavaScript. Sign in
                with Google to start and save progress across devices. No credit
                card required.
              </p>
            </details>
            <details>
              <summary>How do I use SIGNAL with a class?</summary>
              <p>
                Open the teacher console, create a class, and share its join
                code. Students sign in with Google, and you can follow their
                progress from your dashboard.
              </p>
            </details>
          </div>
        </section>
        <section className={styles.finalCta}>
          <div className={styles.container}>
            <h2>A new skill starts with one line.</h2>
            <p>Try your first coding challenge today.</p>
            <div className={styles.finalActions}>
              <Link href="/play" className={styles.button}>
                Start learning free <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                href="/teach"
                className={`${styles.button} ${styles.outlineButton}`}
              >
                Set up a class <GraduationCap size={19} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <div className={styles.footerBrand}>
            <span className={styles.wordmark}>SIGNAL</span>
            <span>© 2026 NxtGen Labs</span>
          </div>
          <nav aria-label="Footer navigation">
            <Link href="/faq">FAQ</Link>
            <Link href="/why-go">Why Go?</Link>
            <Link href="/why-python">Why Python?</Link>
            <Link href="/why-javascript">Why JavaScript?</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/teach">For teachers</Link>
            <Link href="/join">Join a class</Link>
          </nav>
        </div>
      </footer>

      <dialog
        ref={consentRef}
        className={styles.consent}
        aria-labelledby="consent-heading"
        onCancel={(event) => {
          event.preventDefault();
          handleConsentDismiss();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) handleConsentDismiss();
        }}
      >
        <div className={styles.consentContent}>
          <div className={styles.consentHeading}>
            <h2 id="consent-heading">Confirm your purchase</h2>
            <button
              className={styles.closeButton}
              onClick={handleConsentDismiss}
              aria-label="Close purchase dialog"
            >
              <X size={22} />
            </button>
          </div>
          <div className={styles.orderSummary}>
            <strong>Full Go license</strong>
            <strong>${activePrice} USD</strong>
            <span>One-time payment · Lifetime access</span>
          </div>
          <p>
            Your payment of ${activePrice} USD is processed by {PAYMENT_PROVIDER},
            our merchant of record, which charges your payment method and emails
            your receipt. Access to every Go act starts right away, including
            acts released later. You can ask for a refund within{" "}
            {REFUND_WINDOW_DAYS} days of purchase at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
          <label className={styles.consentLabel}>
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(event) => setConsentChecked(event.target.checked)}
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </Link>
              , authorize the charge above, and agree that access starts
              immediately.
            </span>
          </label>
          <button
            onClick={handleConsentProceed}
            disabled={!consentChecked}
            className={styles.button}
          >
            Sign in &amp; pay ${activePrice}
          </button>
          <button
            onClick={handleConsentDismiss}
            className={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
      </dialog>
    </div>
  );
}
