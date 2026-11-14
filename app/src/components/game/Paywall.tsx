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
  GraduationCap,
  LifeBuoy,
  MessageCircle,
  Play,
  Pause,
  ShieldCheck,
  Sparkles,
  Target,
  Terminal,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  trackLandingCta,
  trackPurchaseCtaClick,
  trackConsentModalView,
  trackConsentAccepted,
  trackConsentDismissed,
  trackPurchaseStart,
} from "@/lib/analytics";
import type { LandingCurriculum, LandingPitch } from "@/data/landing";
import type { LanguageId } from "@/types/game";
import { PAYMENT_PROVIDER, PRICE_SINGLE, REFUND_WINDOW_DAYS, SUPPORT_EMAIL } from "@/lib/site";
import { LanguageMascot } from "@/components/ui/LanguageMascot";
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
  /** Curriculum, outcomes, demo mission and price math — built on the server from game data. */
  pitch: LandingPitch;
  playerXP?: number;
  playerLevel?: number;
}

// Only the individual license is sold today; team and school plans come later.
const PLAN = "single";

const LANGUAGES: { id: LanguageId; name: string; href: string }[] = [
  { id: "go", name: "Go", href: "/why-go" },
  { id: "python", name: "Python", href: "/why-python" },
  { id: "javascript", name: "JavaScript", href: "/why-javascript" },
  { id: "rust", name: "Rust", href: "/why-rust" },
];

// Why the method works — each one is something the game actually does.
const PILLARS = [
  {
    icon: Target,
    title: "Every line has a reason",
    text: "Each task opens with what it does for Maya, so you learn why code exists, not just how to type it.",
  },
  {
    icon: Terminal,
    title: "Feedback the moment you run",
    text: "Test as often as you like. See what your program printed next to what it should have printed.",
  },
  {
    icon: Sparkles,
    title: "Working code, then good code",
    text: "Zen notes reward clean, idiomatic code, the way a senior engineer would in a code review.",
  },
  {
    icon: LifeBuoy,
    title: "Stuck? Not for long",
    text: "Tap the question already in your head and get a hint that moves you forward, not the answer.",
  },
];

const OUTCOME_LABEL = {
  free: "Free",
  playable: "Playable now",
  soon: "Coming soon",
} as const;

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

export function Paywall({ pitch, playerXP, playerLevel }: PaywallProps) {
  const { curriculum, outcomes, demo, actsWord, perChapter } = pitch;
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState<boolean | null>(null);
  const [demoLanguage, setDemoLanguage] = useState<LanguageId>("go");
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
  const roster = sampleRoster(curriculum.playableByLanguage);
  const playableToday = curriculum.playableByLanguage.go;
  const actOneChapters = curriculum.acts[0]?.chapters.filter((c) => !c.isBoss).length ?? 0;

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
            <a className={styles.desktopLink} href="#curriculum">
              Curriculum
            </a>
            <a className={styles.desktopLink} href="#pricing">
              Pricing
            </a>
            <a className={styles.desktopLink} href="#classrooms">
              For teachers
            </a>
            <Link
              href="/play"
              className={`${styles.button} ${styles.smallButton}`}
              onClick={() => trackLandingCta("play", "header")}
            >
              Play free <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroInner}>
            <p className={styles.heroBrand} aria-hidden="true">
              SIGNAL
            </p>
            <h1 id="hero-heading">
              Learn to code by breaking someone out.
            </h1>
            <p className={styles.heroPitch}>
              Maya Chen is trapped in a locked-down research facility, and your
              code is her only way out. Write real Go, Python, JavaScript, or
              Rust.
              Every program that runs opens another door.
            </p>
            <div className={styles.heroActions}>
              <Link
                href="/play"
                className={styles.heroPrimary}
                onClick={() => trackLandingCta("play", "hero")}
              >
                START THE ESCAPE · FREE <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <p className={styles.heroReassurance}>
              act I free · nothing to install · no credit card
            </p>
            <div className={styles.heroLanguages}>
              <p>PLAY IN</p>
              <ul>
                {LANGUAGES.map((language) => (
                  <li key={language.id} data-lang={language.id}>
                    <LanguageMascot language={language.id} size={32} />
                    <span>{language.name.toUpperCase()}</span>
                  </li>
                ))}
              </ul>
            </div>
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
                      <Play size={18} aria-hidden="true" /> WATCH THE TRAILER
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
              <Link
                href="/teach"
                onClick={() => trackLandingCta("teach", "hero")}
              >
                TEACHER? SET UP A CLASS <span aria-hidden="true">▸</span>
              </Link>
              <Link
                href="/join"
                onClick={() => trackLandingCta("join", "hero")}
              >
                HAVE A CLASS CODE? <span aria-hidden="true">▸</span>
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.proofStrip} aria-label="SIGNAL at a glance">
          <dl className={`${styles.container} ${styles.proofGrid}`}>
            <div>
              <dt>Real code</dt>
              <dd>Run by a real compiler, not a quiz</dd>
            </div>
            <div>
              <dt>{playableToday} chapters</dt>
              <dd>Playable today, {curriculum.chapterCount} on the roadmap</dd>
            </div>
            <div>
              <dt>{LANGUAGES.length} languages</dt>
              <dd>One story in Go, Python, JavaScript, or Rust</dd>
            </div>
            <div>
              <dt>0 installs</dt>
              <dd>Runs in your browser, saves to your account</dd>
            </div>
          </dl>
        </section>

        <section
          id="how-it-works"
          className={`${styles.section} ${styles.container}`}
          aria-labelledby="how-heading"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Why it sticks</p>
            <h2 id="how-heading">
              Tutorials let you watch. SIGNAL makes you write.
            </h2>
            <p>
              You don’t remember the videos you watched. You remember the
              problem you solved when something was on the line.
            </p>
          </div>
          <div className={styles.fourColumns}>
            {PILLARS.map(({ icon: Icon, title, text }) => (
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
          className={styles.demoSection}
          aria-labelledby="demo-heading"
        >
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>A real mission</p>
              <h2 id="demo-heading">This is what you’ll actually do.</h2>
              <p>
                No slides. A problem, an editor, and Maya on the other end of
                the line. Here’s one from early in Act I.
              </p>
            </div>
            <div className={styles.demo}>
              <div className={styles.demoBar}>
                <span>{demo.chapter.toUpperCase()}</span>
                <div
                  className={styles.demoTabs}
                  role="group"
                  aria-label="Show the code in"
                >
                  {LANGUAGES.map((language) => (
                    <button
                      key={language.id}
                      data-lang={language.id}
                      aria-pressed={demoLanguage === language.id}
                      onClick={() => setDemoLanguage(language.id)}
                    >
                      {language.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.demoBody}>
                <div className={styles.demoBrief}>
                  <p className={styles.demoLabel}>WHY</p>
                  <p className={styles.demoStake}>{demo.stake}</p>
                  <p className={styles.demoLabel}>YOUR TASK</p>
                  <p>{demo.task}</p>
                </div>
                <div className={styles.demoCode}>
                  <p className={styles.demoLabel}>YOUR CODE</p>
                  <pre>
                    <code>{demo.code[demoLanguage]}</code>
                  </pre>
                </div>
                <div className={styles.demoResult}>
                  <p className={styles.demoLabel}>
                    OUTPUT <span className={styles.demoPass}>✓ MATCHES</span>
                  </p>
                  <pre>{demo.output}</pre>
                  <p className={styles.demoLabel}>MAYA</p>
                  <p className={styles.demoReply}>{demo.reply}</p>
                </div>
              </div>
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
              From your first line to a full web app.
            </h2>
            <p>
              {curriculum.actCount} acts and {curriculum.chapterCount} chapters,
              each act ending in a boss fight that tests everything at once.
              Every chapter you finish leaves you with the pattern you wrote, in
              your own code.
            </p>
          </div>
          <ol className={styles.outcomes}>
            {outcomes.map((outcome) => (
              <li key={outcome.act} data-status={outcome.status}>
                <span className={styles.outcomeAct}>Act {outcome.act}</span>
                <div>
                  <h3>{outcome.name}</h3>
                  <p>{outcome.concepts.join(" · ")}</p>
                </div>
                <span className={styles.outcomeStatus}>
                  {OUTCOME_LABEL[outcome.status]}
                </span>
              </li>
            ))}
          </ol>
          <p className={styles.languageLinks}>
            Every chapter built so far plays in Go, Python, and JavaScript;
            Rust has Act I, with more on the way. Not sure which to pick?{" "}
            {LANGUAGES.map((language, index) => (
              <span key={language.id}>
                {index > 0 && " · "}
                <Link href={language.href}>Why {language.name}?</Link>
              </span>
            ))}
          </p>
        </section>

        <section
          id="pricing"
          className={styles.pricingSection}
          aria-labelledby="pricing-heading"
        >
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Pricing</p>
              <h2 id="pricing-heading">
                Play Act I free. Unlock the rest once.
              </h2>
              <p>
                Full access is ${activePrice}, one time. That’s about $
                {perChapter} a chapter, with every future act included and no
                subscription.
              </p>
            </div>
            <div className={styles.pricingGrid}>
              <article className={styles.freePlan}>
                <span className={styles.planLabel}>Start here</span>
                <h3>Act I</h3>
                <div className={styles.price}>Free</div>
                <p>Find out if it clicks before you pay a cent.</p>
                <ul className={styles.checkList}>
                  <li>
                    <Check size={18} aria-hidden="true" /> {actOneChapters}{" "}
                    chapters and a boss fight
                  </li>
                  <li>
                    <Check size={18} aria-hidden="true" /> In Go, Python,
                    JavaScript, or Rust
                  </li>
                  <li>
                    <Check size={18} aria-hidden="true" /> Hints, code feedback,
                    and Zen notes
                  </li>
                  <li>
                    <Check size={18} aria-hidden="true" /> Progress saved with
                    Google sign-in
                  </li>
                </ul>
                <Link
                  href="/play"
                  className={`${styles.button} ${styles.outlineButton}`}
                  onClick={() => trackLandingCta("play", "pricing")}
                >
                  Play Act I free <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <span className={styles.planNote}>No credit card required</span>
              </article>
              <article className={styles.paidPlan}>
                <span className={styles.planBadge}>Full access</span>
                <h3>The whole Go curriculum</h3>
                <div className={styles.price}>
                  ${activePrice}
                  <span>USD · one time</span>
                </div>
                <p>
                  From your first program to concurrency, web servers, and
                  databases.
                </p>
                <ul className={styles.checkList}>
                  <li>
                    <Check size={18} aria-hidden="true" /> All {actsWord} acts
                    and {curriculum.chapterCount} chapters, as each one ships
                  </li>
                  <li>
                    <Check size={18} aria-hidden="true" /> {playableToday}{" "}
                    chapters playable today
                  </li>
                  <li>
                    <Check size={18} aria-hidden="true" /> Every boss fight and
                    story branch
                  </li>
                  <li>
                    <Check size={18} aria-hidden="true" /> Lifetime access, no
                    recurring fees
                  </li>
                </ul>
                <button onClick={handlePurchaseClick} className={styles.button}>
                  Get full access · ${activePrice}{" "}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
                <span className={styles.planNote}>
                  Secure checkout by {PAYMENT_PROVIDER}
                </span>
              </article>
            </div>
            <p className={styles.guarantee}>
              <ShieldCheck size={22} aria-hidden="true" />
              <span>
                <strong>{REFUND_WINDOW_DAYS}-day refund.</strong> If SIGNAL isn’t
                right for you, email us within {REFUND_WINDOW_DAYS} days of
                purchase and get your money back.
              </span>
            </p>
            {playerXP != null && playerLevel != null && (
              <p className={styles.playerStats}>
                Your progress: {playerXP.toLocaleString()} XP · Level{" "}
                {playerLevel}
              </p>
            )}
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
                Students who want to do the homework.
              </h2>
              <p className={styles.sectionDescription}>
                A story gives students a reason to keep going. Your dashboard
                shows who’s moving and who needs you, before they give up.
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
                    <p>Students join and choose Go, Python, JavaScript, or Rust.</p>
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
              <Link
                href="/teach"
                className={styles.button}
                onClick={() => trackLandingCta("teach", "teachers")}
              >
                Set up your class <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <p className={styles.teacherFootnote}>
                Already have a class code?{" "}
                <Link
                  href="/join"
                  onClick={() => trackLandingCta("join", "teachers")}
                >
                  Join your class
                </Link>
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
          className={`${styles.section} ${styles.container} ${styles.faqSection}`}
          aria-labelledby="faq-heading"
        >
          <div>
            <p className={styles.eyebrow}>Good questions</p>
            <h2 id="faq-heading">Before you begin.</h2>
            <Link className={styles.textLink} href="/faq">
              More questions? Read the FAQ{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.faqList}>
            <details>
              <summary>Is it a real course, or just a game?</summary>
              <p>
                Both. You write real Go, Python, JavaScript, or Rust, the same
                languages used at work, and a real compiler or interpreter runs
                it. The story is there so every program has a reason to exist.
              </p>
            </details>
            <details>
              <summary>I’ve never coded. Is it for me?</summary>
              <p>
                Yes. You start by printing one line and build up to loops and
                functions. Every task says why it matters before it asks you
                for code. If you already code, you’ll move fast and pick up a
                new language’s idioms along the way.
              </p>
            </details>
            <details>
              <summary>What if I get stuck?</summary>
              <p>
                Tap the hint button and pick the question in your head. You get
                a hint that moves you forward, not a pasted answer. You can test
                your code as often as you like before sending it.
              </p>
            </details>
            <details>
              <summary>Do I need to install anything?</summary>
              <p>
                No. SIGNAL runs in your browser. Go and Rust compile on their
                official Playgrounds; Python and JavaScript run in the browser.
              </p>
            </details>
            <details>
              <summary>What if I pay and it’s not for me?</summary>
              <p>
                Email{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> within{" "}
                {REFUND_WINDOW_DAYS} days of purchase for a refund. And since
                Act I is free, you’ll know whether it clicks before you pay.
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
        <section className={styles.finalCta} aria-labelledby="final-heading">
          <div className={styles.container}>
            <p className={styles.finalLine} aria-hidden="true">
              &gt; is anyone there?<span className={styles.heroCursor}>_</span>
            </p>
            <h2 id="final-heading">Maya’s waiting on your first line.</h2>
            <p>Act I is free. No install, no credit card.</p>
            <div className={styles.finalActions}>
              <Link
                href="/play"
                className={styles.heroPrimary}
                onClick={() => trackLandingCta("play", "final")}
              >
                START THE ESCAPE · FREE{" "}
                <ArrowRight size={18} aria-hidden="true" />
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
            <Link href="/why-rust">Why Rust?</Link>
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
