import Link from "next/link";
import type { ReactNode } from "react";
import { CookieSettingsButton } from "@/components/CookieConsent";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { COMPANY, PAYMENT_PROVIDER, SUPPORT_EMAIL, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Privacy Policy — SIGNAL",
  description:
    "What SIGNAL collects, why, and who it's shared with: Google sign-in, saved progress, analytics cookies, payments through Creem, and how schools and parents give consent for children under 13.",
  path: "/privacy",
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
    id: "collect",
    title: "What we collect",
    body: (
      <>
        <p>
          You need a Google account to play SIGNAL, including the free Act I. When you sign in, Google shares your name,
          email address and profile picture with us. We never see or store a password: there is no SIGNAL password to
          create, reset or lose.
        </p>
        <p>We then collect what SIGNAL needs to run:</p>
        <ul className="list-disc pl-5">
          <li>your game progress: chapters and steps completed, XP, hearts, your zen library and settings;</li>
          <li>
            your activity in the game: code you submit for checking, messages you type to Maya and her replies, hints
            you open, and game overs;
          </li>
          <li>usage analytics, if you allow them (see Cookies and analytics);</li>
          <li>if you buy the full game, a confirmation of the purchase and the email on the receipt.</li>
        </ul>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use it",
    body: (
      <p>
        We use your Google account to sign you in and to send purchase receipts and support replies. We save your
        progress so it follows you to any device. We review submitted code and Maya conversations, in aggregate, to find
        the steps where players get stuck and improve the hints and notes. We don&apos;t sell your data and we don&apos;t
        use it for advertising.
      </p>
    ),
  },
  {
    id: "maya",
    title: "Maya, the tutor",
    body: (
      <p>
        Maya&apos;s replies come from SIGNAL&apos;s own built-in tutor, which checks your code and answers from hints
        written for each step. Your messages to Maya are not sent to a third-party AI service. If we ever connect Maya to
        an outside AI model, such as Anthropic&apos;s Claude, we will name the provider here and update this policy
        before it is switched on.
      </p>
    ),
  },
  {
    id: "code",
    title: "Running your code",
    body: (
      <>
        <p>
          <strong>Go:</strong> to compile and run Go, your code is sent through our server to the official Go Playground
          (go.dev), which Google operates under its own terms.
        </p>
        <p>
          <strong>Python and JavaScript:</strong> your code runs entirely in your browser. Python runs on Pyodide, which
          your browser downloads from the jsDelivr CDN; neither Pyodide nor jsDelivr receives your code.
        </p>
        <p>
          Separately from running it, each piece of code you submit for checking is saved with your account (see What we
          collect) so we can improve the game.
        </p>
      </>
    ),
  },
  {
    id: "classes",
    title: "Classes",
    body: (
      <p>
        If you join a teacher&apos;s class with a join code, that teacher can see your name, email, avatar, chapter
        progress, XP, zen library and in-game activity: code submissions passed or failed, hints opened, game overs, and
        when you last played. They cannot see the code you write or your chats with Maya, and they cannot change your
        progress. You can leave a class at any time from <A href="/join">/join</A>, and the teacher immediately loses
        access. Teachers see only the students in their own classes.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children under 13 and schools",
    body: (
      <>
        <p>
          SIGNAL is built for learners of all ages. Children under 13 may only use SIGNAL with consent from a parent or
          guardian, or through a school, as set out below.
        </p>
        <p>
          <strong>Through a school.</strong> When a teacher creates a teacher account, they confirm that their school
          or organization has authorized SIGNAL for classroom use. For students under 13, the school gives consent on
          the parents&apos; behalf, for educational use only. We use those students&apos; data only to provide SIGNAL to
          the class. Parents can ask the school, or us, to review or delete their child&apos;s data at any time.
        </p>
        <p>
          <strong>At home.</strong> A child under 13 who isn&apos;t playing through a school needs a parent or guardian to
          agree first. The parent can sign in with their own Google account and let the child play there, or email us
          at {email} to give consent for the child&apos;s account. We&apos;ll confirm by reply before treating the
          account as consented.
        </p>
        <p>
          If we learn that a child under 13 is using SIGNAL without that consent, we will delete the account and its
          data. A parent can review, export or delete their child&apos;s data, or withdraw consent, by emailing {email}.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and analytics",
    body: (
      <>
        <p>
          <strong>Essential storage.</strong> SIGNAL keeps your sign-in session and a copy of your game state in your
          browser&apos;s local storage and IndexedDB. These are needed for the game to work and are never used for
          tracking.
        </p>
        <p>
          <strong>Firebase Analytics</strong> (Google) uses cookies to record events such as level completions and boss
          fight outcomes, so we can see where players struggle. In the EU, EEA and UK it stays off until you choose
          &ldquo;Allow analytics&rdquo; on the cookie banner. Everywhere, you can turn it off at any time: <CookieSettingsButton />.
        </p>
        <p>
          <strong>Vercel Web Analytics</strong> counts page views without cookies and without identifying you.
        </p>
        <p>We don&apos;t use advertising cookies, tracking pixels or marketing tools.</p>
      </>
    ),
  },
  {
    id: "payments",
    title: "Payments",
    body: (
      <p>
        Purchases are processed by {PAYMENT_PROVIDER} (Armitage Labs OÜ), which acts as the merchant of record. {PAYMENT_PROVIDER}{" "}
        collects your payment details, charges your card, issues your receipt and handles sales tax. We never see or
        store your full card number. We receive a confirmation of payment, the email on the receipt and what you bought.
        See <A href="https://www.creem.io/privacy">Creem&apos;s privacy policy</A>.
      </p>
    ),
  },
  {
    id: "third-parties",
    title: "Services we use",
    body: (
      <>
        <p>We share only the minimum data each service needs:</p>
        <ul className="list-disc pl-5">
          <li>Google: sign-in, and Firebase Analytics if you allow it;</li>
          <li>Supabase: our database for accounts, saved progress, classes and game activity;</li>
          <li>Go Playground (go.dev, operated by Google): compiling and running Go code;</li>
          <li>jsDelivr: delivering Pyodide, the in-browser Python runtime (it doesn&apos;t receive your code);</li>
          <li>{PAYMENT_PROVIDER}: payments;</li>
          <li>Vercel: hosting and cookie-free page analytics.</li>
        </ul>
        <p>Each service has its own privacy policy.</p>
      </>
    ),
  },
  {
    id: "retention",
    title: "Data retention",
    body: (
      <p>
        We keep account data while your account is active. If you ask us to delete your account, we permanently remove
        it and its associated data within 30 days. Analytics data is kept only in aggregate form.
      </p>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <p>
        You can ask for a copy of the data we hold about you, ask us to correct or delete it, or object to how we use it.
        Email {email} and we&apos;ll respond within 14 days. If you&apos;re in the EU, EEA or UK, you can also complain to
        your local data protection authority.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    body: (
      <p>
        We&apos;ll update this policy as SIGNAL changes and revise the date at the top. We&apos;ll email registered users
        about significant changes. The current version is always on this page.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="PRIVACY POLICY"
      intro={
        <p>
          SIGNAL is operated by {COMPANY}. This policy explains what we collect when you play SIGNAL or use it with a
          class, why we collect it and who it&apos;s shared with. It applies alongside our{" "}
          <A href="/terms">Terms of Service</A>.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
