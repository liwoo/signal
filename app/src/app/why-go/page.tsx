import { WhyLanguagePage, type WhyLink, type WhyReason } from "@/components/why/WhyLanguagePage";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Why learn Go? — SIGNAL",
  description:
    "Why SIGNAL teaches Go: a small language you can hold in your head, a compiler that catches errors before your code runs, built-in concurrency, and a standard library you can build real software with.",
  path: "/why-go",
});

const reasons: WhyReason[] = [
  {
    title: "SIMPLE BY DESIGN",
    text: "Go has 25 keywords. There are no classes and no inheritance, and the language spec fits in your head. You spend your time solving problems, not fighting the language.",
    stat: "25",
    statLabel: "KEYWORDS",
  },
  {
    title: "REAL COMPILER FEEDBACK",
    text: "Go's compiler catches errors before your code runs: unused variables, type mismatches, missing imports. That makes it a great teaching language, because every error message is a lesson.",
    statLabel: "ERRORS CAUGHT BEFORE IT RUNS",
  },
  {
    title: "USED IN PRODUCTION",
    text: "Go runs critical infrastructure at companies like Google, Uber, Twitch, Dropbox, and Cloudflare. Docker, Kubernetes, and Terraform are written in it. Learning Go means learning the language behind much of the modern cloud.",
  },
  {
    title: "CONCURRENCY BUILT IN",
    text: "Goroutines and channels make concurrent programming approachable. Go was designed for concurrency from day one, rather than adding it later. You'll write real concurrent code in Act III.",
    stat: "2 KB",
    statLabel: "STARTING STACK PER GOROUTINE",
  },
  {
    title: "FAST COMPILATION",
    text: "Go compiles in seconds, not minutes. In SIGNAL, your code is compiled and run on the official Go Playground, with no setup, no configuration, and no build tools.",
  },
  {
    title: "BATTERIES INCLUDED",
    text: "Go's standard library includes HTTP servers, JSON parsing, cryptography, testing, and more. You can build production software without a single dependency, and SIGNAL's later acts put that library to work.",
    stat: "150+",
    statLabel: "STANDARD LIBRARY PACKAGES",
  },
];

const companies: WhyLink[] = [
  { title: "Google", url: "https://go.dev/solutions/google/" },
  { title: "Uber", url: "https://go.dev/solutions/uber" },
  { title: "Twitch", url: "https://go.dev/solutions/twitch" },
  { title: "Dropbox", url: "https://go.dev/solutions/dropbox" },
  { title: "Cloudflare", url: "https://go.dev/solutions/cloudflare" },
  { title: "Docker", url: "https://github.com/moby/moby" },
  { title: "Kubernetes", url: "https://github.com/kubernetes/kubernetes" },
  { title: "Terraform", url: "https://github.com/hashicorp/terraform" },
];

export default function WhyGoPage() {
  return (
    <WhyLanguagePage
      language="go"
      name="Go"
      subtitle="why SIGNAL teaches Go"
      intro={
        <p>
          Designed at Google, Go powers infrastructure at major tech companies. Docker, Kubernetes, and Terraform are
          written in it, along with countless production APIs. It&apos;s also one of the best first languages to learn.
        </p>
      }
      reasons={reasons}
      usedBy={companies}
      usedByLabel="GO IN PRODUCTION"
    />
  );
}
