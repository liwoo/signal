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
  playerXP?: number;
  playerLevel?: number;
}

const PRICE_SINGLE = process.env.NEXT_PUBLIC_PRICE_SINGLE || "9.99";
const PRICE_TEAM = process.env.NEXT_PUBLIC_PRICE_TEAM || "69.99";
const TEAM_SEATS = process.env.NEXT_PUBLIC_TEAM_SEATS || "10";

type Difficulty = "beginner" | "intermediate" | "advanced";

interface Chapter {
  name: string;
  description: string;
  concepts: string[];
  boss?: boolean;
}

interface Act {
  act: string;
  title: string;
  difficulty: Difficulty;
  status: "complete" | "locked";
  chapters: Chapter[];
}

const CURRICULUM: Act[] = [
  {
    act: "I",
    title: "THE ESCAPE",
    difficulty: "beginner",
    status: "complete",
    chapters: [
      {
        name: "HANDSHAKE",
        description:
          "establish a terminal connection using your first Go program",
        concepts: ["package main", "import", "fmt.Println", "string literals"],
      },
      {
        name: "DOOR CODE",
        description: "crack a keypad sequence by classifying numbers 1\u201310",
        concepts: ["for loops", "if/else", "switch", "modulo operator"],
      },
      {
        name: "SHAFT CODES",
        description:
          "compute junction codes with functions that return multiple values",
        concepts: [
          "functions",
          "multiple returns",
          "slices",
          "variadic params",
        ],
      },
      {
        name: "LOCKMASTER",
        description:
          "debug corrupted weapon code across multiple files under fire",
        concepts: ["const groups", "packages", "debugging", "strings.Join"],
        boss: true,
      },
    ],
  },
  {
    act: "II",
    title: "THE FACILITY",
    difficulty: "beginner",
    status: "locked",
    chapters: [
      {
        name: "GUARD ROSTER",
        description:
          "decode patrol schedules using maps and the bool-set pattern",
        concepts: ["map[K]V", "composite literals", "range", "Sprintf"],
      },
      {
        name: "STRUCTS",
        description: "model security clearance badges as structured data",
        concepts: [
          "struct types",
          "field access",
          "methods",
          "value receivers",
        ],
      },
      {
        name: "POINTERS",
        description:
          "modify guard patrol routes through shared memory references",
        concepts: ["& and *", "pointer receivers", "nil safety", "mutation"],
      },
      {
        name: "INTERFACES",
        description:
          "build a polymorphic access control system for different door types",
        concepts: [
          "interface types",
          "implicit implementation",
          "type assertions",
          "empty interface",
        ],
      },
      {
        name: "ERROR HANDLING",
        description: "handle cascading system failures without crashing",
        concepts: [
          "error type",
          "fmt.Errorf",
          "error wrapping",
          "sentinel errors",
        ],
      },
      {
        name: "GATEKEEPER",
        description:
          "combine structs, interfaces, and error handling to breach the gate",
        concepts: ["all Act II concepts", "multi-file coordination"],
        boss: true,
      },
    ],
  },
  {
    act: "III",
    title: "THE NETWORK",
    difficulty: "intermediate",
    status: "locked",
    chapters: [
      {
        name: "GOROUTINES",
        description:
          "run concurrent surveillance sweeps across facility cameras",
        concepts: [
          "go keyword",
          "sync.WaitGroup",
          "race conditions",
          "concurrent patterns",
        ],
      },
      {
        name: "CHANNELS",
        description:
          "coordinate a multi-agent extraction through message passing",
        concepts: ["chan T", "send/receive", "buffered channels", "select"],
      },
      {
        name: "HTTP CLIENT",
        description: "tap into the facility's internal API to pull floor plans",
        concepts: [
          "net/http",
          "GET/POST requests",
          "JSON decoding",
          "timeouts",
        ],
      },
      {
        name: "HTTP SERVER",
        description: "hijack a guard comm relay and serve fake status reports",
        concepts: [
          "http.HandleFunc",
          "request handlers",
          "middleware",
          "routing",
        ],
      },
      {
        name: "JSON & I/O",
        description: "parse and forge security credentials in structured data",
        concepts: [
          "encoding/json",
          "struct tags",
          "Marshal/Unmarshal",
          "file I/O",
        ],
      },
      {
        name: "TESTING",
        description:
          "verify exploit payloads won't crash before deploying them",
        concepts: [
          "testing.T",
          "table-driven tests",
          "test helpers",
          "benchmarks",
        ],
      },
      {
        name: "ARCHITECT",
        description:
          "orchestrate a full network takeover using goroutines and HTTP",
        concepts: ["concurrency + networking", "system design under pressure"],
        boss: true,
      },
    ],
  },
  {
    act: "IV",
    title: "THE SIGNAL",
    difficulty: "advanced",
    status: "locked",
    chapters: [
      {
        name: "GENERICS",
        description: "build type-safe utilities that work across any data type",
        concepts: [
          "type parameters",
          "constraints",
          "type sets",
          "generic functions",
        ],
      },
      {
        name: "CONTEXT",
        description:
          "manage cascading timeouts across distributed facility systems",
        concepts: [
          "context.Context",
          "cancellation",
          "timeouts",
          "context.WithValue",
        ],
      },
      {
        name: "DATABASE",
        description:
          "query and modify the facility's central database to erase records",
        concepts: [
          "database/sql",
          "parameterized queries",
          "transactions",
          "migrations",
        ],
      },
      {
        name: "CLI TOOLS",
        description:
          "build command-line tools to automate the final extraction",
        concepts: [
          "os.Args",
          "flag package",
          "cobra patterns",
          "stdin/stdout pipes",
        ],
      },
      {
        name: "MODULES",
        description:
          "structure the full escape toolkit as a production Go project",
        concepts: [
          "go.mod",
          "semantic versioning",
          "dependencies",
          "workspaces",
        ],
      },
      {
        name: "FINAL SIGNAL",
        description:
          "broadcast the signal \u2014 everything you've learned in one final mission",
        concepts: [
          "the full language",
          "production architecture",
          "real-world Go",
        ],
        boss: true,
      },
    ],
  },
];

const LANGUAGES = [
  {
    name: "Go",
    mark: "Go",
    detail:
      "Start with the fundamentals, then explore structs, concurrency, and more.",
    note: "Free introductory chapters · Full curriculum available",
  },
  {
    name: "Python",
    mark: "Py",
    detail:
      "Practice readable syntax, loops, and functions in a language used across disciplines.",
    note: "Free introductory chapters",
  },
  {
    name: "JavaScript",
    mark: "JS",
    detail:
      "Build a foundation in the language of the web, right in your browser.",
    note: "Free introductory chapters",
  },
];

const ROSTER = [
  {
    name: "Diego R.",
    initials: "DR",
    language: "Go",
    progress: "2 of 6",
    status: "Needs help",
    kind: "help",
  },
  {
    name: "Amara O.",
    initials: "AO",
    language: "Go",
    progress: "4 of 6",
    status: "Learning",
    kind: "active",
  },
  {
    name: "Priya N.",
    initials: "PN",
    language: "Python",
    progress: "4 of 4",
    status: "Completed",
    kind: "done",
  },
  {
    name: "Kwame A.",
    initials: "KA",
    language: "JavaScript",
    progress: "2 of 4",
    status: "Learning",
    kind: "active",
  },
];

function sentenceCase(text: string) {
  return text.charAt(0) + text.slice(1).toLowerCase();
}

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Paywall({ playerXP, playerLevel }: PaywallProps) {
  const [selectedPlan, setSelectedPlan] = useState<"single" | "team">("single");
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
  const activePrice = selectedPlan === "single" ? PRICE_SINGLE : PRICE_TEAM;

  useEffect(() => {
    if (showConsent) consentRef.current?.showModal();
    else consentRef.current?.close();
  }, [showConsent]);

  const handlePurchaseClick = useCallback(() => {
    trackPurchaseCtaClick(selectedPlan, activePrice);
    setConsentChecked(false);
    setShowConsent(true);
    trackConsentModalView(selectedPlan, activePrice);
  }, [selectedPlan, activePrice]);

  const handleConsentProceed = useCallback(() => {
    trackConsentAccepted(selectedPlan, activePrice);
    trackPurchaseStart(selectedPlan, activePrice);
    setShowConsent(false);
    // TODO: trigger Google OAuth + Stripe checkout (existing purchase integration).
  }, [selectedPlan, activePrice]);

  const handleConsentDismiss = useCallback(() => {
    trackConsentDismissed(selectedPlan, activePrice);
    setShowConsent(false);
  }, [selectedPlan, activePrice]);

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
                    <th scope="col">Chapters</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ROSTER.map((row) => (
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
                Illustrative dashboard · Students’ code and chats stay private.
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
                <p className={styles.languageNote}>{language.note}</p>
              </article>
            ))}
          </div>
          <details className={styles.curriculum}>
            <summary>
              Explore the full Go curriculum <span aria-hidden="true">+</span>
            </summary>
            <div className={styles.curriculumContent}>
              <p>
                Go continues beyond the introductory chapters. Python and
                JavaScript currently cover the first act.
              </p>
              {CURRICULUM.map((act) => (
                <section key={act.act} className={styles.curriculumAct}>
                  <h3>
                    Part {act.act}: {sentenceCase(act.title)}{" "}
                    <span>
                      {sentenceCase(act.difficulty)}
                      {act.status === "complete" ? " · Free" : ""}
                    </span>
                  </h3>
                  <ul>
                    {act.chapters.map((chapter) => (
                      <li key={chapter.name}>
                        <strong>{sentenceCase(chapter.name)}</strong>
                        <span>{chapter.concepts.join(" · ")}</span>
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
                    <Check size={18} aria-hidden="true" /> All first-act
                    challenges
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
                <div
                  className={styles.planPicker}
                  role="group"
                  aria-label="License type"
                >
                  <button
                    aria-pressed={selectedPlan === "single"}
                    onClick={() => setSelectedPlan("single")}
                  >
                    Individual
                  </button>
                  <button
                    aria-pressed={selectedPlan === "team"}
                    onClick={() => setSelectedPlan("team")}
                  >
                    Team · {TEAM_SEATS} seats
                  </button>
                </div>
                <div className={styles.price}>
                  ${activePrice}
                  <span>USD / one-time</span>
                </div>
                <p>
                  {selectedPlan === "single"
                    ? "A complete learning path, from basics to advanced Go."
                    : `Full access for ${TEAM_SEATS} learners. $${(
                        Number(PRICE_TEAM) / Number(TEAM_SEATS)
                      ).toFixed(2)} per seat.`}
                </p>
                <ul className={styles.checkList}>
                  <li>
                    <Check size={18} aria-hidden="true" /> All four acts of the
                    Go curriculum
                  </li>
                  <li>
                    <Check size={18} aria-hidden="true" /> Concurrency, HTTP,
                    testing, and more
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
                  Review your purchase before continuing
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
            <span>© 2026 Chienda Ltd</span>
          </div>
          <nav aria-label="Footer navigation">
            <Link href="/faq">FAQ</Link>
            <Link href="/why-go">Why Go?</Link>
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
            <strong>
              {selectedPlan === "single"
                ? "Individual license"
                : `Team license · ${TEAM_SEATS} seats`}
            </strong>
            <strong>${activePrice} USD</strong>
            <span>One-time payment · Lifetime access</span>
          </div>
          <p>
            By proceeding, you authorize Chienda Ltd to charge ${activePrice}{" "}
            USD to your payment method via Stripe. Your purchase grants lifetime
            access to all SIGNAL content. Refund requests may be submitted
            within 14 days of purchase to{" "}
            <a href="mailto:jeremiah@chienda.com">jeremiah@chienda.com</a>.
          </p>
          <label className={styles.consentLabel}>
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(event) => setConsentChecked(event.target.checked)}
            />
            <span>
              I have read and agree to the{" "}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </Link>{" "}
              and authorize the charge described above.
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
