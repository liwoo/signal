import { WhyLanguagePage, type WhyLink, type WhyReason } from "@/components/why/WhyLanguagePage";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Why learn JavaScript? — SIGNAL",
  description:
    "Why learn JavaScript with SIGNAL: it's the language of the web, it runs in every browser, and it powers servers and apps too. Write real JavaScript to escape, and Act I is free.",
  path: "/why-javascript",
});

const reasons: WhyReason[] = [
  {
    title: "THE LANGUAGE OF THE WEB",
    text: "Every major web browser runs JavaScript. Any page or web app you've used relies on it. Learning it shows you how the web you use every day actually works.",
    statLabel: "RUNS IN EVERY BROWSER",
  },
  {
    title: "NOTHING TO INSTALL",
    text: "You already have a JavaScript engine: your browser. In SIGNAL, your code runs right there on your device, with no setup, no installs, and instant results.",
  },
  {
    title: "ONE LANGUAGE, EVERYWHERE",
    text: "The same language runs web pages, servers with Node.js, mobile apps, and desktop apps. What you learn in Act I carries straight into whatever you build next.",
  },
  {
    title: "SEE IT WORK",
    text: "JavaScript is made for things you can see and click. Once the basics click (values, loops, functions), you can make pages that respond to people right away.",
  },
  {
    title: "A HUGE COMMUNITY",
    text: "Tutorials, libraries, and answers for almost any JavaScript question are a search away. MDN's free documentation is one of the best references in programming.",
  },
];

const usedBy: WhyLink[] = [
  { title: "MDN guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" },
  { title: "Node.js", url: "https://nodejs.org/" },
  { title: "ECMAScript spec", url: "https://tc39.es/ecma262/" },
];

export default function WhyJavaScriptPage() {
  return (
    <WhyLanguagePage
      language="javascript"
      name="JavaScript"
      subtitle="why learn JavaScript with SIGNAL"
      intro={
        <p>
          JavaScript is the language of the web, and you can run it anywhere you have a browser. In SIGNAL, you write
          real JavaScript to get Maya out of the facility. Act I is free, and more is coming.
        </p>
      }
      reasons={reasons}
      usedBy={usedBy}
      usedByLabel="LEARN MORE ABOUT JAVASCRIPT"
    />
  );
}
