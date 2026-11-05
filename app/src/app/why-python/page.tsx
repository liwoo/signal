import { WhyLanguagePage, type WhyLink, type WhyReason } from "@/components/why/WhyLanguagePage";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Why learn Python? — SIGNAL",
  description:
    "Why learn Python with SIGNAL: readable code, quick feedback, and one language for data, science, automation and the web. It runs right in your browser, and Act I is free.",
  path: "/why-python",
});

const reasons: WhyReason[] = [
  {
    title: "READS LIKE ENGLISH",
    text: "Python was designed to be read. Indentation shows the structure, there are no semicolons or braces, and a line like for door in doors: means what it says. Beginners spend their energy on ideas, not punctuation.",
    stat: "35",
    statLabel: "KEYWORDS",
  },
  {
    title: "QUICK FEEDBACK",
    text: "Python runs your code line by line, so you see results as soon as you press Run. When something breaks, the traceback points to the exact line, and SIGNAL's hints help you read it.",
  },
  {
    title: "ONE LANGUAGE, MANY FIELDS",
    text: "Scientists, analysts, artists, and engineers all use Python. It's used for data analysis, machine learning, automation scripts, and web backends. Whatever you study next, Python skills come with you.",
  },
  {
    title: "BATTERIES INCLUDED",
    text: "Python's standard library handles files, dates, math, text, JSON, and more without installing anything. Its package ecosystem covers almost everything else.",
  },
  {
    title: "RUNS IN YOUR BROWSER",
    text: "In SIGNAL, Python runs on Pyodide, a full Python interpreter compiled for the web. There's nothing to install and no setup. Your code runs on your own device.",
    statLabel: "NOTHING TO INSTALL",
  },
];

const usedBy: WhyLink[] = [
  { title: "Python.org", url: "https://www.python.org/" },
  { title: "Success stories", url: "https://www.python.org/success-stories/" },
  { title: "Python docs", url: "https://docs.python.org/3/tutorial/" },
  { title: "Pyodide", url: "https://pyodide.org/" },
];

export default function WhyPythonPage() {
  return (
    <WhyLanguagePage
      language="python"
      name="Python"
      subtitle="why learn Python with SIGNAL"
      intro={
        <p>
          Python is one of the most widely taught first languages: clear to read, quick to try, and used everywhere from
          labs to startups. In SIGNAL, you write real Python to get Maya out of the facility. Act I is free, and more
          is coming.
        </p>
      }
      reasons={reasons}
      usedBy={usedBy}
      usedByLabel="LEARN MORE ABOUT PYTHON"
    />
  );
}
